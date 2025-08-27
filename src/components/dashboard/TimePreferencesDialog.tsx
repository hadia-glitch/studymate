import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TimePreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: { available: string[] }) => void;
}

export const TimePreferencesDialog = ({ isOpen, onClose, onSave }: TimePreferencesDialogProps) => {
  const [timeRanges, setTimeRanges] = useState<{ start: string; end: string }[]>([
    { start: "09:00", end: "12:00" },
  ]);

  const addRange = () => setTimeRanges([...timeRanges, { start: "09:00", end: "12:00" }]);

  const updateRange = (index: number, field: "start" | "end", value: string) => {
    // allow partial typing, just trim spaces
    const updated = [...timeRanges];
    updated[index][field] = value.replace(/\s+/g, "");
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

  const handleSave = () => {
    // ✅ save in strict "HH:mm-HH:mm" format (no spaces)
    const formatted = timeRanges.map(r => `${normalizeTime(r.start)}-${normalizeTime(r.end)}`);
    onSave({ available: formatted });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Available Times</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {timeRanges.map((range, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={range.start}
                onChange={(e) => updateRange(idx, "start", e.target.value)}
                placeholder="HH:mm"
                className="w-[100px] text-center"
                maxLength={5}
              />

              <span>-</span>

              <Input
                value={range.end}
                onChange={(e) => updateRange(idx, "end", e.target.value)}
                placeholder="HH:mm"
                className="w-[100px] text-center"
                maxLength={5}
              />
            </div>
          ))}

          <Button variant="outline" onClick={addRange}>
            + Add Range
          </Button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
