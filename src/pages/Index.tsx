import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Target, Plus, Sparkles, User } from "lucide-react";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { PomodoroTimer } from "@/components/dashboard/PomodoroTimer";
import { CandleTimer } from "@/components/study/CandleTimer";
import { StickyNote } from "@/components/dashboard/StickyNote";
import { TaskFormDialog } from "@/components/dashboard/TaskFormDialog";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useNavigate } from "react-router-dom";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useSchedule, type ScheduleItem } from "@/hooks/useSchedule";
import { useStickyNotes, type StickyNoteData } from "@/hooks/useStickyNotes";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TimePreferences {
  filled: string[];
  unfilled: string[];
}

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [timePreferences, setTimePreferences] = useState<TimePreferences>({
    filled: [],
    unfilled: []
  });
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, addTask, toggleComplete } = useTasks();
  const { scheduleItems, addScheduleItem, updateScheduleItem, deleteScheduleItem, bulkUpdateScheduleItems } = useSchedule();

  const { stickyNotes, addStickyNote, updateStickyNote, deleteStickyNote } = useStickyNotes();

  // Ensure scheduleItems is always an array
  const safeScheduleItems = Array.isArray(scheduleItems) ? scheduleItems : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Helper function to check if a time slot is available
  const isTimeSlotAvailable = (date: string, timeSlot: string): boolean => {
    // Check if slot is already occupied in schedule
    const isOccupied = safeScheduleItems.some(item =>
      item.date === date && item.interval === timeSlot
    );

    // Check if slot is in unavailable times
    const isUnavailable = timePreferences.unfilled.includes(timeSlot);

    return !isOccupied && !isUnavailable;
  };

  // Helper function to convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + (minutes || 0);
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes || 0;
    return totalMinutes;
  };

  // Generate available time slots for scheduling
  const generateAvailableTimeSlots = (): string[] => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      const startTime = hour <= 12
        ? `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`
        : `${hour - 12}:00 PM`;
      const endTime = (hour + 1) <= 12
        ? `${hour + 1}:00 ${(hour + 1) === 12 ? 'PM' : 'AM'}`
        : `${(hour + 1) - 12}:00 PM`;

      if (hour === 11) {
        slots.push(`11:00 AM - 12:00 PM`);
      } else if (hour === 12) {
        slots.push(`12:00 PM - 1:00 PM`);
      } else {
        slots.push(`${startTime} - ${endTime}`);
      }
    }
    return slots;
  };

  const generateSchedule = () => {
    if (safeTasks.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter tasks that need scheduling (not completed and deadline is in the future)
    const tasksToSchedule = safeTasks.filter(task =>
      !task.completed &&
      task.deadline > today &&
      !safeScheduleItems.some(item => item.taskId === task.id) // Don't reschedule already scheduled tasks
    );

    if (tasksToSchedule.length === 0) return;

    // Sort by priority (high first) then by deadline
    const sortedTasks = tasksToSchedule.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    const newScheduleItems: ScheduleItem[] = [];
    const availableTimeSlots = generateAvailableTimeSlots();

    sortedTasks.forEach(task => {
      // Calculate completion deadline (2 days before actual deadline)
      const completionDeadline = new Date(task.deadline);
      completionDeadline.setDate(completionDeadline.getDate() - 2);

      // Calculate number of sessions needed based on estimated time
      const sessionsNeeded = Math.ceil((task.estimatedTime || 60) / 60); // 1-hour sessions
      let sessionsScheduled = 0;

      // Try to schedule sessions from today up to completion deadline
      for (let dayOffset = 0; dayOffset < 7 && sessionsScheduled < sessionsNeeded; dayOffset++) {
        const currentScheduleDate = new Date(today);
        currentScheduleDate.setDate(today.getDate() + dayOffset);

        // Skip if past completion deadline
        if (currentScheduleDate > completionDeadline) break;

        // Skip weekends (optional - can be removed if needed)
        if (currentScheduleDate.getDay() === 0 || currentScheduleDate.getDay() === 6) continue;

        const dateString = currentScheduleDate.toISOString().split("T")[0];

        // Try each available time slot for this day
        for (const timeSlot of availableTimeSlots) {
          if (sessionsScheduled >= sessionsNeeded) break;

          if (isTimeSlotAvailable(dateString, timeSlot)) {
            const sessionTitle = sessionsNeeded > 1
              ? `${task.title} (Session ${sessionsScheduled + 1}/${sessionsNeeded})`
              : task.title;

            newScheduleItems.push({
              id: `auto-${task.id}-${sessionsScheduled}`,
              interval: timeSlot,
              task: sessionTitle,
              date: dateString,
              taskId: task.id,
              isAutoScheduled: true
            });

            sessionsScheduled++;
            break; // Move to next day after scheduling one session
          }
        }
      }
    });

    // Add new schedule items to existing ones (with safety check)
    bulkUpdateScheduleItems([...safeScheduleItems, ...newScheduleItems]);
  };

  const handleAddTask = (newTask: Omit<Task, "id">) => {
    addTask(newTask);
  };

  const handleAddStickyNote = () => {
    const colors: StickyNoteData["color"][] = ["yellow", "pink", "blue", "green", "purple"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newNote: Omit<StickyNoteData, "id"> = {
      content: "New note",
      color: randomColor,
      position: { 
        x: Math.random() * 300 + 50, 
        y: Math.random() * 200 + 50 
      }
    };
    
    addStickyNote(newNote);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!delta) return;

    const noteId = active.id as string;
    const note = stickyNotes.find(n => n.id === noteId);
    if (!note) return;

    const newX = Math.max(0, Math.min(note.position.x + delta.x, 800 - 224));
    const newY = Math.max(0, Math.min(note.position.y + delta.y, 400 - 224));
    
    updateStickyNote(noteId, {
      position: { x: newX, y: newY }
    });
  };

  const pendingTasks = safeTasks.filter(task => !task.completed);
  const completedTasks = safeTasks.filter(task => task.completed);
  const highPriorityTasks = pendingTasks.filter(task => task.priority === "high");

  if (tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">StudyMate Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {currentDate.toLocaleDateString("en-US", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {safeTasks.filter(t => t.completed).length}/{safeTasks.length} tasks completed
              </span>
              <Badge variant="outline" className="px-3 py-1">
                {Math.round((safeTasks.filter(t => t.completed).length / safeTasks.length) * 100) || 0}% Complete
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src="" alt="Profile" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              Profile
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="text-2xl font-bold">{pendingTasks.length}</h3>
            <p className="text-sm text-muted-foreground">Pending Tasks</p>
          </Card>

          <Card className="p-6 text-center bg-gradient-to-br from-success/10 to-success/5">
            <Target className="h-8 w-8 mx-auto mb-2 text-success" />
            <h3 className="text-2xl font-bold text-success">{completedTasks.length}</h3>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>

          <Card className="p-6 text-center bg-gradient-to-br from-warning/10 to-warning/5">
            <Clock className="h-8 w-8 mx-auto mb-2 text-warning" />
            <h3 className="text-2xl font-bold text-warning">{highPriorityTasks.length}</h3>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </Card>

          <Card className="p-6 text-center bg-gradient-to-br from-secondary/10 to-secondary/5">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <h3 className="text-2xl font-bold">{safeScheduleItems.length}</h3>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Tasks */}
          <div className="xl:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Task Management</h2>
                <Button onClick={() => setShowTaskForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={toggleComplete}
                  />
                ))}
                {pendingTasks.length === 0 && (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending tasks. Great job staying on top of your work!</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Weekly Calendar */}
            <WeeklyCalendar 
               tasks={safeTasks}
               scheduleItems={safeScheduleItems}
               setScheduleItems={bulkUpdateScheduleItems}  // This should handle bulk updates
               addScheduleItem={addScheduleItem}
               updateScheduleItem={updateScheduleItem}
               deleteScheduleItem={deleteScheduleItem}
               timePreferences={timePreferences}
               onGenerateSchedule={generateSchedule}
            />
          </div>

          {/* Right Column - Timers & Stats */}
          <div className="space-y-8">
            {/* Focus Timers */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Focus Sessions</h2>
              <div className="space-y-4">
                <PomodoroTimer />
                <CandleTimer
                  duration={25}
                  onComplete={() => console.log("Focus session completed!")}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <Badge variant="outline">{completedTasks.length} completed</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">High Priority</span>
                  <Badge variant={highPriorityTasks.length > 0 ? "destructive" : "outline"}>
                    {highPriorityTasks.length} remaining
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Sticky Notes Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Quick Reminders</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddStickyNote}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            <Card className="relative min-h-[400px] overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 border-dashed border-2">
              {stickyNotes.map(note => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onUpdate={(updatedNote) => updateStickyNote(updatedNote.id, updatedNote)}
                  onDelete={deleteStickyNote}
                />
              ))}
              {stickyNotes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Add Note" to create your first reminder</p>
                  </div>
                </div>
              )}
            </Card>
          </DndContext>
        </div>
      </div>

      {/* Task Form Dialog */}
      <TaskFormDialog
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onAddTask={handleAddTask}
      />

      {/* AI Assistant */}
      <AIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        tasks={safeTasks}
        onAddTask={handleAddTask}
        onAddStickyNote={handleAddStickyNote}
        onClearSlot={() => {}}
      />
    </div>
  );
};

export default Index;