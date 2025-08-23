import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Settings, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "./TaskCard";
import { TaskFormDialog } from "./TaskFormDialog";
import { TimePreferencesDialog } from "./TimePreferencesDialog";
import { Input } from "@/components/ui/input";

interface ScheduleItem {
  id: string;
  interval: string;
  task: string;
  day: string;
}

interface WeeklyCalendarProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id">) => void;
  schedule?: any[];
  onScheduleUpdate?: (schedule: any[]) => void;
}

export const WeeklyCalendar = ({ tasks, onAddTask, schedule = [], onScheduleUpdate }: WeeklyCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{interval: string, task: string}>({interval: "", task: ""});
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTimePreferences, setShowTimePreferences] = useState(false);
  const [timePreferences, setTimePreferences] = useState<{filled: string[], unfilled: string[]}>({
    filled: [],
    unfilled: []
  });

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Start from Monday
    start.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentWeek);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleEdit = (id: string, interval: string, task: string) => {
    setEditingItem(id);
    setEditValues({interval, task});
  };

  const handleSave = (id: string) => {
    setScheduleItems(prev => prev.map(item => 
      item.id === id 
        ? {...item, interval: editValues.interval, task: editValues.task}
        : item
    ));
    setEditingItem(null);
    setEditValues({interval: "", task: ""});
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditValues({interval: "", task: ""});
  };

  const handleAddScheduleItem = () => {
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      interval: "9:00 AM - 10:00 AM",
      task: "New Task",
      day: "Monday"
    };
    setScheduleItems(prev => [...prev, newItem]);
  };

  const handleSaveAll = () => {
    // Sort all items chronologically
    const sortedItems = [...scheduleItems].sort((a, b) => {
      const timeA = convertToMinutes(a.interval.split(' - ')[0]);
      const timeB = convertToMinutes(b.interval.split(' - ')[0]);
      return timeA - timeB;
    });
    setScheduleItems(sortedItems);
    setIsEditing(false);
    
    // Update parent component with new schedule
    if (onScheduleUpdate) {
      onScheduleUpdate(sortedItems.map(item => ({
        id: item.id,
        date: new Date(),
        interval: item.interval,
        task: item.task,
        day: item.day
      })));
    }
  };

  const convertToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + (minutes || 0);
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes || 0;
    return totalMinutes;
  };

  const handleTimePreferencesSave = (preferences: {filled: string[], unfilled: string[]}) => {
    setTimePreferences(preferences);
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Weekly Schedule</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-4">
              {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {" "}
              {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek("next")}
            >
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
          </div>
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
            {scheduleItems.map((item) => (
              <div key={item.id} className="grid grid-cols-3 gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center">
                  {editingItem === item.id ? (
                    <Input
                      value={editValues.interval}
                      onChange={(e) => setEditValues(prev => ({...prev, interval: e.target.value}))}
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
                      onChange={(e) => setEditValues(prev => ({...prev, task: e.target.value}))}
                      className="h-8"
                      placeholder="Task description"
                    />
                  ) : (
                    <span className="text-sm">{item.task}</span>
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
            ))}
            
            {scheduleItems.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <div className="mb-4">No schedule items yet</div>
                <Button
                  variant="outline"
                  onClick={handleAddScheduleItem}
                  className="mb-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            )}
          </div>
        </div>

        {scheduleItems.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={handleAddScheduleItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            
            <Button
              onClick={handleSaveAll}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Sort Chronologically
            </Button>
          </div>
        )}

        {timePreferences.unfilled.length > 0 && (
          <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <div className="text-sm font-medium text-warning mb-2">Busy/Unavailable Times:</div>
            <div className="flex flex-wrap gap-2">
              {timePreferences.unfilled.map((time, index) => (
                <Badge key={index} variant="outline" className="bg-warning/20 text-warning">
                  {time}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {timePreferences.filled.length > 0 && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="text-sm font-medium text-success mb-2">Available Times:</div>
            <div className="flex flex-wrap gap-2">
              {timePreferences.filled.map((time, index) => (
                <Badge key={index} variant="outline" className="bg-success/20 text-success">
                  {time}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <TaskFormDialog
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onAddTask={onAddTask}
      />
      
      {/* Hidden trigger for task form */}
      <button
        id="task-form-trigger"
        onClick={() => setShowTaskForm(true)}
        style={{ display: 'none' }}
      />

      <TimePreferencesDialog
        isOpen={showTimePreferences}
        onClose={() => setShowTimePreferences(false)}
        onSave={handleTimePreferencesSave}
      />
    </>
  );
};