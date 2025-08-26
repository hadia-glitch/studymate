import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Settings, Edit, Save, X, Sparkles } from "lucide-react";
import { Task } from "./TaskCard";

interface ScheduleItem {
  id: string;
  interval: string;
  task: string;
  date: string; // e.g. "2025-08-19"
  taskId?: string; // Reference to original task
  isAutoScheduled?: boolean; // Track if this was auto-scheduled
}

interface TimePreferences {
  filled: string[]; // Available time slots
  unfilled: string[]; // Unavailable time slots
}

interface WeeklyCalendarProps {
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  setScheduleItems: (items: ScheduleItem[] | ((prev: ScheduleItem[]) => ScheduleItem[])) => void;
  timePreferences: TimePreferences;
  onGenerateSchedule?: () => void;
}

// Time Preferences Dialog Component
const TimePreferencesDialog = ({ isOpen, onClose, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: TimePreferences) => void;
}) => {
  const [preferences, setPreferences] = useState<TimePreferences>({ filled: [], unfilled: [] });
  
  const timeSlots = [
    "6:00 AM - 7:00 AM", "7:00 AM - 8:00 AM", "8:00 AM - 9:00 AM",
    "9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
    "12:00 PM - 1:00 PM", "1:00 PM - 2:00 PM", "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM",
    "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM", "8:00 PM - 9:00 PM",
    "9:00 PM - 10:00 PM", "10:00 PM - 11:00 PM"
  ];

  const handleTimeToggle = (time: string, type: 'available' | 'unavailable') => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      if (type === 'available') {
        if (newPrefs.filled.includes(time)) {
          newPrefs.filled = newPrefs.filled.filter(t => t !== time);
        } else {
          newPrefs.filled = [...newPrefs.filled, time];
          newPrefs.unfilled = newPrefs.unfilled.filter(t => t !== time);
        }
      } else {
        if (newPrefs.unfilled.includes(time)) {
          newPrefs.unfilled = newPrefs.unfilled.filter(t => t !== time);
        } else {
          newPrefs.unfilled = [...newPrefs.unfilled, time];
          newPrefs.filled = newPrefs.filled.filter(t => t !== time);
        }
      }
      return newPrefs;
    });
  };

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Set Time Preferences</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-green-700 mb-3">Available Times</h3>
              <div className="space-y-2">
                {timeSlots.map(time => (
                  <div key={time} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.filled.includes(time)}
                      onCheckedChange={() => handleTimeToggle(time, 'available')}
                    />
                    <label className="text-sm">{time}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-red-700 mb-3">Unavailable Times</h3>
              <div className="space-y-2">
                {timeSlots.map(time => (
                  <div key={time} className="flex items-center space-x-2">
                    <Checkbox
                      checked={preferences.unfilled.includes(time)}
                      onCheckedChange={() => handleTimeToggle(time, 'unavailable')}
                    />
                    <label className="text-sm">{time}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Preferences</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const WeeklyCalendar = ({ tasks, scheduleItems, setScheduleItems, timePreferences, onGenerateSchedule }: WeeklyCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ interval: string; task: string }>({
    interval: "",
    task: ""
  });
  const [showTimePreferences, setShowTimePreferences] = useState(false);
  const [localTimePreferences, setLocalTimePreferences] = useState<TimePreferences>(timePreferences || { filled: [], unfilled: [] });

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Get current date and set it as default selected day
  const today = new Date();
  
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
    start.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentWeek);
  
  // Find today's index in the current week
  const todayIndex = weekDates.findIndex(date => 
    date.toDateString() === today.toDateString()
  );
  
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0);

  // Update selected day when week changes
  useEffect(() => {
    const newTodayIndex = weekDates.findIndex(date => 
      date.toDateString() === today.toDateString()
    );
    if (newTodayIndex >= 0) {
      setSelectedDayIndex(newTodayIndex);
    }
  }, [currentWeek]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const selectedDate = weekDates[selectedDayIndex].toISOString().split("T")[0];
  const filteredSchedule = scheduleItems.filter((item) => item.date === selectedDate);

  


  const handleAddFirstTask = () => {
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      interval: "9:00 AM - 10:00 AM",
      task: "New Task",
      date: selectedDate,
      isAutoScheduled: false
    };
    setScheduleItems((prev) => [...prev, newItem]);
  };

  const handleEdit = (id: string, interval: string, task: string) => {
    setEditingItem(id);
    setEditValues({ interval, task });
  };

  const handleSave = (id: string) => {
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, interval: editValues.interval, task: editValues.task } : item
      )
    );
    setEditingItem(null);
    setEditValues({ interval: "", task: "" });
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditValues({ interval: "", task: "" });
  };

  const handleSaveAll = () => {
    const sortedItems = [...scheduleItems].sort((a, b) => {
      if (a.date !== b.date) return 0;
      const timeA = convertToMinutes(a.interval.split(" - ")[0]);
      const timeB = convertToMinutes(b.interval.split(" - ")[0]);
      return timeA - timeB;
    });
    setScheduleItems(sortedItems);
  };

  const convertToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalMinutes = (hours % 12) * 60 + (minutes || 0);
    if (period === "PM" && hours !== 12) totalMinutes += 12 * 60;
    if (period === "AM" && hours === 12) totalMinutes = minutes || 0;
    return totalMinutes;
  };

  const handleTimePreferencesSave = (preferences: TimePreferences) => {
    setLocalTimePreferences(preferences);
  };

  return (
    <>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Weekly Schedule</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-4">
              {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
              {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimePreferences(true)}
              title="Customize time preferences"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {onGenerateSchedule && tasks.length > 0 && (
              <Button onClick={onGenerateSchedule} className="bg-primary hover:bg-primary/90">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Schedule
              </Button>
            )}
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex justify-between mb-4">
          {weekDates.map((date, idx) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <Button
                key={idx}
                variant={selectedDayIndex === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-1 mx-1 ${isToday ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex flex-col items-center">
                  <span className="font-semibold">{dayNames[idx].slice(0, 3)}</span>
                  <span className="text-xs text-muted-foreground">
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                  {isToday && <span className="text-xs text-primary font-bold">Today</span>}
                </div>
              </Button>
            );
          })}
        </div>

       {/* Schedule Table */}
<div className="border rounded-lg overflow-hidden">
  <div className="bg-muted/50 border-b">
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="font-semibold">Time Interval</div>
      <div className="font-semibold">Task</div>
      <div className="font-semibold text-center">Actions</div>
    </div>
  </div>

  <div className="divide-y">
    {filteredSchedule.length > 0 ? (
      filteredSchedule.map((item) => (
        <div
          key={item.id}
          className={`grid grid-cols-3 gap-4 p-4 hover:bg-muted/30 transition-colors ${
            item.isAutoScheduled ? "bg-primary/10 border-l-4 border-l-primary" : ""
          }`}
        >
          <div className="flex items-center">
            {editingItem === item.id ? (
              <Input
                value={editValues.interval}
                onChange={(e) =>
                  setEditValues((prev) => ({ ...prev, interval: e.target.value }))
                }
                className="h-8"
                placeholder="e.g., 9:00 AM - 10:30 AM"
              />
            ) : (
              <span className="text-sm font-medium">{item.interval}</span>
            )}
          </div>

          <div className="flex items-center">
            {editingItem === item.id ? (
              <Input
                value={editValues.task}
                onChange={(e) =>
                  setEditValues((prev) => ({ ...prev, task: e.target.value }))
                }
                className="h-8"
                placeholder="Task description"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.task}</span>
                {item.isAutoScheduled && (
                  <Badge variant="outline" className="text-xs bg-primary/20 text-primary">
                    Auto-scheduled
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            {editingItem === item.id ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave(item.id)}
                  className="h-7 w-7 p-0"
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(item.id, item.interval, item.task)}
                className="h-7 w-7 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))
    ) : (
      <div className="p-8 text-center text-muted-foreground">
        <div className="mb-4">No schedule items for this day</div>

        {tasks.length === 0 ? (
          <>
            <p className="text-sm opacity-75 mb-2">
              Add tasks to your to-do list, then generate your schedule!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddFirstTask()} // <-- New function for adding first task
            >
              Add First Task
            </Button>
          </>
        ) : (
          <p className="text-sm opacity-75">
            Click "Generate Schedule" to automatically schedule your tasks
          </p>
        )}
      </div>
    )}
  </div>
</div>


        {/* Save All button */}
        {filteredSchedule.length > 0 && (
          <div className="flex justify-end items-center mt-4">
            <Button onClick={handleSaveAll} className="bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              Save & Sort Chronologically
            </Button>
          </div>
        )}

        {/* Preferences display */}
        {localTimePreferences.unfilled.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-sm font-medium text-destructive mb-2">Busy/Unavailable Times:</div>
            <div className="flex flex-wrap gap-2">
              {localTimePreferences.unfilled.map((time, index) => (
                <Badge key={index} variant="outline" className="bg-destructive/20 text-destructive">
                  {time}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {localTimePreferences.filled.length > 0 && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="text-sm font-medium text-success mb-2">Available Times:</div>
            <div className="flex flex-wrap gap-2">
              {localTimePreferences.filled.map((time, index) => (
                <Badge key={index} variant="outline" className="bg-success/20 text-success">
                  {time}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <TimePreferencesDialog
        isOpen={showTimePreferences}
        onClose={() => setShowTimePreferences(false)}
        onSave={handleTimePreferencesSave}
      />
    </>
  );
};