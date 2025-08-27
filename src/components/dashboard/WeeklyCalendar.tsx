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
  Trash,
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

  // Generate schedule function (moved from parent component)
  const generateAutoSchedule = async () => {
    if (tasks.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter tasks that need scheduling
      const tasksToSchedule = tasks.filter(task =>
        !task.completed &&
        new Date(task.deadline) > today &&
        !scheduleItems.some(item => item.taskId === task.id)
      );

      if (tasksToSchedule.length === 0) {
        alert("No tasks available for scheduling");
        return;
      }

      // Sort by priority then deadline
      const sortedTasks = tasksToSchedule.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

      const availableTimeSlots = [
        "8:00 AM - 9:00 AM",
        "9:00 AM - 10:00 AM",
        "10:00 AM - 11:00 AM",
        "11:00 AM - 12:00 PM",
        "1:00 PM - 2:00 PM",
        "2:00 PM - 3:00 PM",
        "3:00 PM - 4:00 PM",
        "4:00 PM - 5:00 PM",
        "5:00 PM - 6:00 PM",
        "7:00 PM - 8:00 PM",
        "8:00 PM - 9:00 PM",
      ];

      const newScheduleItems: any[] = [];

      sortedTasks.forEach(task => {
        const completionDeadline = new Date(task.deadline);
        completionDeadline.setDate(completionDeadline.getDate() - 2);

        const sessionsNeeded = Math.ceil((task.estimatedTime || 60) / 60);
        let sessionsScheduled = 0;

        for (let dayOffset = 0; dayOffset < 14 && sessionsScheduled < sessionsNeeded; dayOffset++) {
          const currentScheduleDate = new Date(today);
          currentScheduleDate.setDate(today.getDate() + dayOffset);

          if (currentScheduleDate > completionDeadline) break;
          if (currentScheduleDate.getDay() === 0 || currentScheduleDate.getDay() === 6) continue;

          const dateString = currentScheduleDate.toISOString().split("T")[0];

          for (const timeSlot of availableTimeSlots) {
            if (sessionsScheduled >= sessionsNeeded) break;

            const isSlotOccupied = scheduleItems.some(item =>
              item.date === dateString && item.interval === timeSlot
            );

            const isSlotUnavailable = !localTimePreferences.available.includes(timeSlot);

            if (!isSlotOccupied && !isSlotUnavailable) {
              const sessionTitle = sessionsNeeded > 1
                ? `${task.title} (Session ${sessionsScheduled + 1}/${sessionsNeeded})`
                : task.title;

              newScheduleItems.push({
                user_id: user.id,
                interval_time: timeSlot,
                task_description: sessionTitle,
                schedule_date: dateString,
                task_id: task.id,
                is_auto_scheduled: true,
              });

              sessionsScheduled++;
              break;
            }
          }
        }
      });

      if (newScheduleItems.length === 0) {
        alert("No available time slots found for scheduling");
        return;
      }

      // Insert new schedule items into database
      const { data, error } = await supabase
        .from("schedule_items")
        .insert(newScheduleItems)
        .select();

      if (error) {
        console.error("Error inserting schedule items:", error);
        alert("Error generating schedule. Please try again.");
        return;
      }

      // Convert database response to ScheduleItem format and add to local state
      const formattedNewItems: ScheduleItem[] = (data || []).map(item => ({
        id: item.id,
        interval: item.interval_time,
        task: item.task_description,
        date: item.schedule_date,
        taskId: item.task_id,
        isAutoScheduled: item.is_auto_scheduled,
      }));

      setScheduleItems(prev => [...prev, ...formattedNewItems]);
      alert(`Successfully scheduled ${formattedNewItems.length} task sessions`);

    } catch (error) {
      console.error("Error generating schedule:", error);
      alert("Error generating schedule. Please try again.");
    }
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
            <div className="flex justify-between items-center">
           
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTimePreferences(true)}
                  >
                    {timePreferences.available.length > 0 ? "Edit" : "Set"} Times
                  </Button>
                </div>
           
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
        className={`relative flex-1 mx-1 py-3 px-2 min-h-[90px] flex flex-col items-center space-y-0.5 rounded-lg ${
          isToday ? "ring-2 ring-primary" : ""
        }`}
      >
        {/* Badge on top */}
        {dayTaskCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5"
          >
            {dayTaskCount}
          </Badge>
        )}

        <span
          className={`font-semibold text-base ${
            isSelected ? "text-white" : ""
          }`}
        >
          {dayNames[idx].slice(0, 3)}
        </span>
        <span
          className={`text-sm ${
            isSelected ? "text-white/90" : "text-muted-foreground"
          }`}
        >
          {date.getDate()}/{date.getMonth() + 1}
        </span>
        {isToday && (
          <span
            className={`text-xs font-bold ${
              isSelected ? "text-white/90" : "text-primary"
            }`}
          >
            Today
          </span>
        )}
      </Button>
    );
  })}
</div>{/* Schedule Table */}
<div className="border border-green-300 rounded-lg overflow-hidden">
  {/* Header */}
  <div className="bg-green-100 border-b border-green-300">
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="font-semibold text-green-700">Time Interval</div>
      <div className="font-semibold text-green-700">Task</div>
      <div className="font-semibold text-center text-green-700">Actions</div>
    </div>
  </div>

  {/* Rows */}
  <div className="divide-y divide-green-300">
    {filteredSchedule.length > 0 ? (
      filteredSchedule
        .sort((a, b) => {
          const timeA = a.interval.split(" - ")[0];
          const timeB = b.interval.split(" - ")[0];
          return timeA.localeCompare(timeB);
        })
        .map((item, idx) => (
          <div
            key={item.id}
            className={`grid grid-cols-3 gap-4 p-4 transition-colors
              ${idx % 2 === 0 ? "bg-white" : "bg-green-50"}
              hover:bg-green-100`}
          >
            {/* Interval */}
            <div className="flex items-center">
              {editingItem === item.id ? (
                <Input
                  value={editValues.interval}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, interval: e.target.value }))
                  }
                  className="h-8"
                  placeholder="e.g., 9:00 AM - 10:30 AM"
                  autoFocus
                />
              ) : (
                <span className="text-sm font-medium text-green-700">{item.interval}</span>
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
                  className="h-8"
                  placeholder="Task description"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSave(item.id);
                    else if (e.key === "Escape") handleCancel();
                  }}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-700">{item.task}</span>
                  {item.isAutoScheduled && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-100 text-green-700 border-green-300"
                    >
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
                    className="h-7 w-7 p-0"
                    disabled={!editValues.interval.trim() || !editValues.task.trim()}
                    title="Save changes"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="h-7 w-7 p-0"
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
                    className="h-7 w-7 p-0"
                    title="Edit task"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    title="Delete task"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))
    ) : (
      <div className="p-6 text-center text-muted-foreground text-sm">
        No tasks scheduled for {dayNames[selectedDayIndex]}.
        <br />
        Click "Add Task" below to schedule something.
      </div>
    )}
  </div>

  {/* Footer Row */}
  <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-t border-green-300">
    {/* Center Add Task button */}
    <div className="flex-1 flex justify-center">
      <Button
        onClick={handleAddTask}
        variant="outline"
        size="sm"
        className="px-6 py-2"
      >
        + Add Task
      </Button>
    </div>

    {/* Right task count */}
    <div className="flex-1 flex justify-end">
      {filteredSchedule.length > 0 && (
        <span className="text-xs text-green-700">
          {filteredSchedule.length} task(s) scheduled for {dayNames[selectedDayIndex]}
        </span>
      )}
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