import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, Save, X } from "lucide-react";

interface TimePreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: { available: string[] }) => void;
  currentPreferences?: { available: string[] };
}

export const TimePreferencesDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentPreferences 
}: TimePreferencesDialogProps) => {
  const [timeRanges, setTimeRanges] = useState<{ start: string; end: string; id: string }[]>([]);

  // Initialize with current preferences or default
  useEffect(() => {
    if (isOpen) {
      if (currentPreferences?.available && currentPreferences.available.length > 0) {
        // Parse existing preferences
        const parsedRanges = currentPreferences.available.map((range, index) => {
          // Handle both "HH:mm-HH:mm" and "HH:mm - HH:mm" formats
          const cleanRange = range.replace(/\s+/g, ''); // Remove all spaces
          const [start, end] = cleanRange.split('-');
          return {
            start: start || "09:00",
            end: end || "12:00",
            id: `range-${index}-${Date.now()}`
          };
        });
        setTimeRanges(parsedRanges);
      } else {
        // Default range
        setTimeRanges([
          { start: "09:00", end: "12:00", id: `range-0-${Date.now()}` }
        ]);
      }
    }
  }, [isOpen, currentPreferences]);

  const addRange = () => {
    const newRange = {
      start: "09:00", 
      end: "12:00", 
      id: `range-${timeRanges.length}-${Date.now()}`
    };
    setTimeRanges([...timeRanges, newRange]);
  };

  const removeRange = (id: string) => {
    if (timeRanges.length > 1) {
      setTimeRanges(timeRanges.filter(range => range.id !== id));
    }
  };

  const updateRange = (id: string, field: "start" | "end", value: string) => {
    // Allow partial typing, just trim spaces
    const updated = timeRanges.map(range => 
      range.id === id 
        ? { ...range, [field]: value.replace(/\s+/g, "") }
        : range
    );
    setTimeRanges(updated);
  };

  const normalizeTime = (val: string): string => {
    let [h, m] = val.split(":");
    if (!h) h = "00";
    if (!m) m = "00";

    let hour = parseInt(h, 10);
    let minute = parseInt(m, 10);

    if (isNaN(hour)) hour = 0;
    if (isNaN(minute)) minute = 0;

    if (hour > 23) hour = 23;
    if (minute > 59) minute = 59;

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  const validateTimeRange = (start: string, end: string): boolean => {
    try {
      const startTime = new Date(`2000-01-01 ${normalizeTime(start)}`);
      const endTime = new Date(`2000-01-01 ${normalizeTime(end)}`);
      return endTime > startTime;
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    // Validate all ranges
    const validRanges = timeRanges.filter(range => {
      const isValid = validateTimeRange(range.start, range.end);
      return isValid && range.start.trim() && range.end.trim();
    });

    if (validRanges.length === 0) {
      alert("Please add at least one valid time range.");
      return;
    }

    // Format in strict "HH:mm-HH:mm" format (no spaces)
    const formatted = validRanges.map(r => `${normalizeTime(r.start)}-${normalizeTime(r.end)}`);
    onSave({ available: formatted });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const getTotalHours = () => {
    return timeRanges.reduce((total, range) => {
      if (validateTimeRange(range.start, range.end)) {
        const startTime = new Date(`2000-01-01 ${normalizeTime(range.start)}`);
        const endTime = new Date(`2000-01-01 ${normalizeTime(range.end)}`);
        const diffMs = endTime.getTime() - startTime.getTime();
        const hours = diffMs / (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Set Available Times
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Summary */}
          {currentPreferences?.available && currentPreferences.available.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <h4 className="font-medium text-blue-700 mb-2">Current Time Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {currentPreferences.available.map((range, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {range.replace('-', ' - ')}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Time Range Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-700">Configure Time Ranges</h4>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Total: {getTotalHours().toFixed(1)} hours
              </Badge>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {timeRanges.map((range, idx) => {
                const isValid = validateTimeRange(range.start, range.end);
                
                return (
                  <div key={range.id} className={`flex gap-3 items-center p-3 rounded-lg border transition-all ${
                    isValid 
                      ? "border-green-200 bg-green-50" 
                      : "border-red-200 bg-red-50"
                  }`}>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Input
                          value={range.start}
                          onChange={(e) => updateRange(range.id, "start", e.target.value)}
                          placeholder="HH:MM"
                          className={`w-20 text-center text-sm ${
                            isValid ? "border-green-300" : "border-red-300"
                          }`}
                          maxLength={5}
                        />
                        <span className="text-gray-500 font-medium">to</span>
                        <Input
                          value={range.end}
                          onChange={(e) => updateRange(range.id, "end", e.target.value)}
                          placeholder="HH:MM"
                          className={`w-20 text-center text-sm ${
                            isValid ? "border-green-300" : "border-red-300"
                          }`}
                          maxLength={5}
                        />
                      </div>

                      {isValid && (
                        <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-300">
                          {(() => {
                            const startTime = new Date(`2000-01-01 ${normalizeTime(range.start)}`);
                            const endTime = new Date(`2000-01-01 ${normalizeTime(range.end)}`);
                            const diffMs = endTime.getTime() - startTime.getTime();
                            const hours = diffMs / (1000 * 60 * 60);
                            return `${hours.toFixed(1)}h`;
                          })()}
                        </Badge>
                      )}

                      {!isValid && range.start && range.end && (
                        <span className="text-red-500 text-xs">Invalid range</span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRange(range.id)}
                      disabled={timeRanges.length <= 1}
                      className={`h-8 w-8 p-0 ${
                        timeRanges.length <= 1 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      }`}
                      title="Remove range"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button 
              variant="outline" 
              onClick={addRange} 
              className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-700 border-blue-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Time Range
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Quick Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeRanges([
                  { start: "09:00", end: "12:00", id: `preset-1-${Date.now()}` },
                  { start: "14:00", end: "17:00", id: `preset-2-${Date.now()}` }
                ])}
                className="text-sm hover:bg-blue-50"
              >
                Standard Work Day
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeRanges([
                  { start: "08:00", end: "12:00", id: `preset-3-${Date.now()}` },
                  { start: "13:00", end: "17:00", id: `preset-4-${Date.now()}` },
                  { start: "19:00", end: "21:00", id: `preset-5-${Date.now()}` }
                ])}
                className="text-sm hover:bg-green-50"
              >
                Extended Study
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeRanges([
                  { start: "10:00", end: "14:00", id: `preset-6-${Date.now()}` }
                ])}
                className="text-sm hover:bg-yellow-50"
              >
                Morning Focus
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimeRanges([
                  { start: "18:00", end: "22:00", id: `preset-7-${Date.now()}` }
                ])}
                className="text-sm hover:bg-purple-50"
              >
                Evening Study
              </Button>
            </div>
          </div>

          {/* Tips */}
          <Card className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>💡 Tips:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Use 24-hour format (e.g., 14:30 for 2:30 PM)</li>
                <li>Ensure end time is after start time</li>
                <li>Add multiple ranges for breaks in your schedule</li>
                <li>Consider your peak productivity hours</li>
              </ul>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {timeRanges.filter(r => validateTimeRange(r.start, r.end)).length} valid ranges configured
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
              disabled={timeRanges.filter(r => validateTimeRange(r.start, r.end)).length === 0}
            >
              <Save className="h-4 w-4" />
              Save Preferences
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};