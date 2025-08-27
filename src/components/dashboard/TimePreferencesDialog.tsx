import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TimePreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: { available: string[] }) => void;
}

export const TimePreferencesDialog = ({ isOpen, onClose, onSave }: TimePreferencesDialogProps) => {
  const [timeInput, setTimeInput] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      fetchTimePreferences();
    }
  }, [isOpen, user]);

  const fetchTimePreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("time_preferences")
        .select("available_times")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAvailableTimes(data.available_times || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading preferences",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTime = () => {
    const trimmedInput = timeInput.trim();
    if (!trimmedInput) return;

    // Basic validation for time range format
    const timeRangeRegex = /^\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?$/i;
    const time24Regex = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/;
    
    if (!timeRangeRegex.test(trimmedInput) && !time24Regex.test(trimmedInput)) {
      toast({
        title: "Invalid format",
        description: "Please use format like '9 AM - 12 PM' or '14:00 - 18:00'",
        variant: "destructive",
      });
      return;
    }

    if (!availableTimes.includes(trimmedInput)) {
      setAvailableTimes(prev => [...prev, trimmedInput]);
    }
    setTimeInput("");
  };

  const handleRemoveTime = (index: number) => {
    setAvailableTimes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("time_preferences")
        .upsert(
          {
            user_id: user.id,
            available_times: availableTimes,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      onSave({ available: availableTimes });
      toast({
        title: "Preferences saved",
        description: "Your time preferences have been updated successfully.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    }
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
          <DialogTitle>Set Available Time Ranges</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="time-input" className="text-sm font-medium">
              Add Available Time Range
            </Label>
            <div className="flex gap-2">
              <Input
                id="time-input"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., 9 AM - 1 PM or 14:00 - 18:00"
                className="flex-1"
              />
              <Button onClick={handleAddTime} size="sm">
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter time ranges when you're available to work on tasks
            </p>
          </div>

          {availableTimes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-success">Your Available Times</Label>
                <div className="space-y-1">
                  {availableTimes.map((time, index) => (
                    <div key={index} className="flex items-center justify-between bg-success/10 p-2 rounded text-sm">
                      <span>{time}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTime(index)}
                        className="h-6 w-6 p-0 text-success hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
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