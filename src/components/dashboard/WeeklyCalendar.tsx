import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Edit,
  Save,
  X,
  Pencil,
  Sparkles,
  Trash,Plus
} from "lucide-react";
import { Task } from "./TaskCard";
import { supabase } from "@/integrations/supabase/client";
import { useTimePreferences } from "@/hooks/useTimePreferences";
import { TimePreferencesDialog } from "./TimePreferencesDialog";

interface ScheduleItem {
  id: string;
  interval: string;
  task: string;
  date: string; // e.g. "2025-08-19"
  taskId?: string; // Reference to original task
  isAutoScheduled?: boolean;
}

interface WeeklyCalendarProps {
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  setScheduleItems: (items: ScheduleItem[]) => Promise<void>;
  addScheduleItem: (item: Omit<ScheduleItem, "id">) => Promise<void>;
  updateScheduleItem: (itemId: string, updates: Partial<ScheduleItem>) => Promise<void>;
  deleteScheduleItem: (itemId: string) => Promise<void>;
  timePreferences: { available: string[] };
  onGenerateSchedule?: () => void;
}

// Generate random colors for stripes
const getRandomStripeColor = () => {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const WeeklyCalendar = ({
  tasks,
  scheduleItems: externalScheduleItems,
  setScheduleItems: setExternalScheduleItems,
  addScheduleItem: externalAddScheduleItem,
  updateScheduleItem: externalUpdateScheduleItem,
  deleteScheduleItem: externalDeleteScheduleItem,
  onGenerateSchedule,
}: WeeklyCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ interval: string; task: string }>({
    interval: "",
    task: "",
  });
  const { timePreferences, loading: preferencesLoading, updateTimePreferences } = useTimePreferences();
  const [showTimePreferences, setShowTimePreferences] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localTimePreferences, setLocalTimePreferences] = useState<{ available: string[] }>(
    timePreferences || { available: [] }
  );

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const today = new Date();

  // Fetch schedule items on component mount and when week changes
  useEffect(() => {
    fetchScheduleItems();
  }, [currentWeek]);

  const fetchScheduleItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const weekStart = getWeekDates(currentWeek)[0];
      const weekEnd = getWeekDates(currentWeek)[6];
      
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('schedule_date', weekStart.toISOString().split('T')[0])
        .lte('schedule_date', weekEnd.toISOString().split('T')[0])
        .order('schedule_date', { ascending: true });

      if (error) throw error;

      const formattedItems: ScheduleItem[] = (data || []).map(item => ({
        id: item.id,
        interval: item.interval_time,
        task: item.task_description,
        date: item.schedule_date,
        taskId: item.task_id,
        isAutoScheduled: item.is_auto_scheduled,
      }));

      setScheduleItems(formattedItems);
    } catch (error) {
      console.error("Error fetching schedule items:", error);
      setScheduleItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentWeek);
  const todayIndex = weekDates.findIndex(
    (date) => date.toDateString() === today.toDateString()
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    todayIndex >= 0 ? todayIndex : 0
  );

  useEffect(() => {
    const newTodayIndex = weekDates.findIndex(
      (date) => date.toDateString() === today.toDateString()
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

  // Generate unique ID for new items
  const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddTask = () => {
    const newId = generateId();
    const newItem: ScheduleItem = {
      id: newId,
      interval: "",
      task: "",
      date: selectedDate,
      isAutoScheduled: false,
    };
    
    setScheduleItems((prev) => [...prev, newItem]);
    setEditingItem(newId);
    setEditValues({ interval: "", task: "" });
  };

  const handleSave = async (id: string) => {
    const updatedInterval = editValues.interval.trim();
    const updatedTask = editValues.task.trim();

    // Validate input
    if (!updatedInterval || !updatedTask) {
      alert("Please fill in both time interval and task description");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("You must be logged in to save tasks");
        return;
      }

      if (id.startsWith("temp-")) {
        // New item - insert into database
        const { data, error } = await supabase
          .from("schedule_items")
          .insert({
            user_id: user.id,
            interval_time: updatedInterval,
            task_description: updatedTask,
            schedule_date: selectedDate,
            is_auto_scheduled: false,
          })
          .select()
          .single();

        if (error) {
          console.error("Error inserting task:", error);
          alert("Error saving task. Please try again.");
          return;
        }

        // Update local state with the new ID from database
        setScheduleItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  id: data.id,
                  interval: updatedInterval,
                  task: updatedTask,
                }
              : item
          )
        );
      } else {
        // Existing item - update in database
        const { error } = await supabase
          .from("schedule_items")
          .update({
            interval_time: updatedInterval,
            task_description: updatedTask,
          })
          .eq("id", id);

        if (error) {
          console.error("Error updating task:", error);
          alert("Error updating task. Please try again.");
          return;
        }

        // Update local state
        setScheduleItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, interval: updatedInterval, task: updatedTask }
              : item
          )
        );
      }

      setEditingItem(null);
      setEditValues({ interval: "", task: "" });
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      if (!id.startsWith("temp-")) {
        // Delete from database
        const { error } = await supabase
          .from("schedule_items")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Error deleting task:", error);
          alert("Error deleting task. Please try again.");
          return;
        }
      }

      // Remove from local state
      setScheduleItems((prev) => prev.filter((item) => item.id !== id));

      // Clear editing state if we're deleting the item being edited
      if (editingItem === id) {
        setEditingItem(null);
        setEditValues({ interval: "", task: "" });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Error deleting task. Please try again.");
    }
  };

  const handleEdit = (id: string, interval: string, task: string) => {
    setEditingItem(id);
    setEditValues({ interval, task });
  };

  const handleCancel = () => {
    // If canceling a temp item, remove it from the list
    if (editingItem && editingItem.startsWith("temp-")) {
      setScheduleItems((prev) => prev.filter((item) => item.id !== editingItem));
    }
    
    setEditingItem(null);
    setEditValues({ interval: "", task: "" });
  };

  const handleTimePreferencesSave = (preferences: { available: string[] }) => {
    setLocalTimePreferences(preferences);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading schedule...</span>
        </div>
      </Card>
    );
  }

  return(
    <>
      <Card className="p-0 bg-transparent shadow-none">
  {/* Gradient border wrapper */}
  <div className="bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-lg p-1">
    <div className="bg-white rounded-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
          Weekly Schedule
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")} className="hover:bg-blue-50 hover:text-blue-700">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-4 text-blue-700">
            {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateWeek("next")} className="hover:bg-blue-50 hover:text-blue-700">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTimePreferences(true)}
            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100  hover:text-blue-700"
          >
            {timePreferences.available.length > 0 ? "Edit" : "Set"} Times
          </Button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex justify-between mb-4">
        {weekDates.map((date, idx) => {
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDayIndex === idx;
          const dayTaskCount = scheduleItems.filter(
            item => item.date === date.toISOString().split("T")[0]
          ).length;

          return (
            <Button
              key={idx}
              variant={isSelected ? "default" : "outline"}
              onClick={() => setSelectedDayIndex(idx)}
              className={`relative flex-1 mx-1 py-3 px-2 min-h-[90px] flex flex-col items-center space-y-0.5 rounded-lg transition-all duration-200 ${
                isSelected 
                  ? "bg-gradient-to-br from-blue-200 to-blue-300 text-blue-900 shadow-md" 
                  : "hover:bg-blue-50"
              } ${isToday ? "ring-2 ring-blue-300" : ""}`}
            >
              {/* Badge on top */}
              {dayTaskCount > 0 && (
                <Badge
                  variant="secondary"
                  className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 ${
                    isSelected ? "bg-white/40 text-blue-900" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {dayTaskCount}
                </Badge>
              )}

              <span className={`font-semibold text-base ${isSelected ? "text-blue-900" : "text-blue-700"}`}>
                {dayNames[idx].slice(0, 3)}
              </span>
              <span className={`text-sm ${isSelected ? "text-blue-800/80" : "text-muted-foreground"}`}>
                {date.getDate()}/{date.getMonth() + 1}
              </span>
              {isToday && (
                <span className={`text-xs font-bold ${isSelected ? "text-blue-800/80" : "text-blue-600"}`}>
                  Today
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Schedule Table */}
      <div className="border border-blue-200 rounded-lg overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <div className="grid grid-cols-3 gap-4 p-4">
            <div className="font-semibold text-blue-700">Time Interval</div>
            <div className="font-semibold text-blue-700">Task</div>
            <div className="font-semibold text-center text-blue-700">Actions</div>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-blue-100">
          {filteredSchedule.length > 0 ? (
            filteredSchedule
              .sort((a, b) => {
                const timeA = a.interval.split(" - ")[0];
                const timeB = b.interval.split(" - ")[0];
                return timeA.localeCompare(timeB);
              })
              .map((item, idx) => {
                const stripeColor = getRandomStripeColor();
                
                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-3 gap-4 p-4 transition-all duration-200 relative bg-white hover:bg-blue-50 group`}
                  >
                    {/* Colorful stripe on the left */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripeColor} opacity-60`}></div>
                    
                    {/* Interval */}
                    <div className="flex items-center pl-3">
                      {editingItem === item.id ? (
                        <Input
                          value={editValues.interval}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, interval: e.target.value }))
                          }
                          className="h-8 border-blue-300 focus:border-blue-500"
                          placeholder="e.g., 9:00 - 10:30"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-blue-700">{item.interval}</span>
                      )}
                    </div>

                    {/* Task + Auto badge */}
                    <div className="flex items-center">
                      {editingItem === item.id ? (
                        <Input
                          value={editValues.task}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, task: e.target.value }))
                          }
                          className="h-8 border-blue-300 focus:border-blue-500"
                          placeholder="Task description"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") handleSave(item.id);
                            else if (e.key === "Escape") handleCancel();
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-700">{item.task}</span>
                          {item.isAutoScheduled && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Auto-scheduled
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-2">
                      {editingItem === item.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(item.id)}
                            className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                            disabled={!editValues.interval.trim() || !editValues.task.trim()}
                            title="Save changes"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            title="Cancel changes"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item.id, item.interval, item.task)}
                            className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit task"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete task"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm ">
              No tasks scheduled for {dayNames[selectedDayIndex]}.
              <br />
              <span className="text-blue-600 font-medium">Click "Add Task" below to schedule something.</span>
            </div>
          )}
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200">
          {/* Center Add Task button */}
          <div className="flex justify-center">
            <Button
              onClick={handleAddTask}
              variant="outline"
              size="sm"
              className="px-6 py-2 bg-white hover:bg-blue-50 text-blue-700 border-blue-300 font-medium"
            >
              <Plus className="h-4 w-4 mr-2 " />
              Add Task
            </Button>
          </div>

          {/* Right task count */}
          <div className="flex-1 flex justify-end">
            {filteredSchedule.length > 0 && (
              <span className="text-xs text-blue-700 font-medium">
                {filteredSchedule.length} task(s) scheduled for {dayNames[selectedDayIndex]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</Card>

<TimePreferencesDialog
  isOpen={showTimePreferences}
  onClose={() => setShowTimePreferences(false)}
  onSave={updateTimePreferences}
/>
</>
  );
};