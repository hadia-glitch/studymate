import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface TimePreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: {
    filled: string[];
    unfilled: string[];
  }) => void;
}

export const TimePreferencesDialog = ({ isOpen, onClose, onSave }: TimePreferencesDialogProps) => {
  const [timeType, setTimeType] = useState<"filled" | "unfilled">("unfilled");
  const [timeInput, setTimeInput] = useState("");
  const [savedPreferences, setSavedPreferences] = useState<{
    filled: string[];
    unfilled: string[];
  }>({
    filled: [],
    unfilled: []
  });

  const handleAddTime = () => {
    if (!timeInput.trim()) return;

    setSavedPreferences(prev => ({
      ...prev,
      [timeType]: [...prev[timeType], timeInput.trim()]
    }));
    
    setTimeInput("");
  };

  const handleRemoveTime = (type: "filled" | "unfilled", index: number) => {
    setSavedPreferences(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(savedPreferences);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTime();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Time Intervals</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Time Interval Type</Label>
            <RadioGroup value={timeType} onValueChange={(value: "filled" | "unfilled") => setTimeType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unfilled" id="unfilled" />
                <Label htmlFor="unfilled" className="text-sm">
                  <span className="font-medium">Unfilled/Busy Time</span>
                  <p className="text-xs text-muted-foreground">Times when you're unavailable (e.g., meals, gym)</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filled" id="filled" />
                <Label htmlFor="filled" className="text-sm">
                  <span className="font-medium">Available Time</span>
                  <p className="text-xs text-muted-foreground">Times when you can work on tasks</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label htmlFor="time-input" className="text-sm font-medium">
              Add Time Interval
            </Label>
            <div className="flex gap-2">
              <Input
                id="time-input"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 9:00 AM - 1:00 PM"
                className="flex-1"
              />
              <Button onClick={handleAddTime} size="sm">
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter time ranges like "9 AM - 12 PM" or "14:00 - 18:00"
            </p>
          </div>

          {(savedPreferences.filled.length > 0 || savedPreferences.unfilled.length > 0) && (
            <>
              <Separator />
              <div className="space-y-4">
                {savedPreferences.unfilled.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-warning">Busy/Unavailable Times</Label>
                    <div className="space-y-1">
                      {savedPreferences.unfilled.map((time, index) => (
                        <div key={index} className="flex items-center justify-between bg-warning/10 p-2 rounded text-sm">
                          <span>{time}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTime("unfilled", index)}
                            className="h-6 w-6 p-0 text-warning hover:text-warning-dark"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {savedPreferences.filled.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-success">Available Times</Label>
                    <div className="space-y-1">
                      {savedPreferences.filled.map((time, index) => (
                        <div key={index} className="flex items-center justify-between bg-success/10 p-2 rounded text-sm">
                          <span>{time}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTime("filled", index)}
                            className="h-6 w-6 p-0 text-success hover:text-success-dark"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Preferences
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};