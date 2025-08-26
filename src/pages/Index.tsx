import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Timer, CheckSquare, StickyNote, BarChart3, Flame, Bot, Sparkles } from "lucide-react";
import { StickyNote as StickyNoteComponent, StickyNoteData } from "@/components/dashboard/StickyNote";
import { TaskCard, Task } from "@/components/dashboard/TaskCard";
import { PomodoroTimer } from "@/components/dashboard/PomodoroTimer";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { ChatBot } from "@/components/chat/ChatBot";
import { CandleTimer } from "@/components/study/CandleTimer";
import { TaskFormDialog } from "@/components/dashboard/TaskFormDialog";

import { AIAssistant } from "@/components/ai/AIAssistant";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

interface ScheduleItem {
  id: string;
  interval: string;
  task: string;
  date: string;
  taskId?: string;
  isAutoScheduled?: boolean;
}

interface TimePreferences {
  filled: string[];
  unfilled: string[];
}

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [timePreferences, setTimePreferences] = useState<TimePreferences>({
    filled: [],
    unfilled: []
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to check if a time slot is available
  const isTimeSlotAvailable = (date: string, timeSlot: string): boolean => {
    // Check if slot is already occupied in schedule
    const isOccupied = scheduleItems.some(item =>
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
    if (tasks.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter tasks that need scheduling (not completed and deadline is in the future)
    const tasksToSchedule = tasks.filter(task =>
      !task.completed &&
      task.deadline > today &&
      !scheduleItems.some(item => item.taskId === task.id) // Don't reschedule already scheduled tasks
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

    // Add new schedule items to existing ones
    setScheduleItems(prev => [...prev, ...newScheduleItems]);
  };

  const addStickyNote = useCallback(() => {
    const colors: Array<"yellow" | "pink" | "blue" | "green" | "purple"> = ["yellow", "pink", "blue", "green", "purple"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Find a good position for the new note - ensure it's visible
    const containerWidth = 800;
    const containerHeight = 400;
    const noteWidth = 224; // w-56 = 14rem = 224px
    const noteHeight = 224; // h-56 = 14rem = 224px

    // Position new notes in a grid-like pattern, avoiding overlap
    const existingPositions = stickyNotes.map(note => note.position);
    let newX = 20;
    let newY = 20;

    // Try to find a non-overlapping position
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const testX = 20 + col * (noteWidth + 20);
        const testY = 20 + row * (noteHeight + 20);

        const overlaps = existingPositions.some(pos =>
          Math.abs(pos.x - testX) < noteWidth && Math.abs(pos.y - testY) < noteHeight
        );

        if (!overlaps && testX + noteWidth <= containerWidth && testY + noteHeight <= containerHeight) {
          newX = testX;
          newY = testY;
          break;
        }
      }
      if (newX !== 20 || newY !== 20) break;
    }

    const newNote: StickyNoteData = {
      id: Date.now().toString(),
      content: "",
      color: randomColor,
      position: { x: newX, y: newY }
    };
    setStickyNotes(prev => [...prev, newNote]);
  }, [stickyNotes]);

  const addTask = (taskData: Omit<Task, "id">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString()
    };
    setTasks(prev => [...prev, newTask]);
  };

  const addTaskFromChat = (taskData: Omit<Task, "id">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString()
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleScheduleUpdate = (newSchedule: ScheduleItem[]) => {
    setScheduleItems(newSchedule);
  };

  const handleSlotEdit = (slotId: string, task?: Task) => {
    // Handle editing of schedule slots
    console.log("Edit slot:", slotId, task);
  };

  const handleClearSlot = (date: Date, time: string) => {
    // Handle clearing schedule slots
    console.log("Clear slot:", date, time);
  };

  const updateStickyNote = useCallback((updatedNote: StickyNoteData) => {
    setStickyNotes(prev => prev.map(note =>
      note.id === updatedNote.id ? updatedNote : note
    ));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    if (!delta) return;

    const noteId = active.id as string;
    setStickyNotes(prev => prev.map(note => {
      if (note.id === noteId) {
        const newX = Math.max(0, Math.min(note.position.x + delta.x, 800 - 224));
        const newY = Math.max(0, Math.min(note.position.y + delta.y, 400 - 224));
        return {
          ...note,
          position: { x: newX, y: newY }
        };
      }
      return note;
    }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const deleteStickyNote = (id: string) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
  };

  const toggleTaskComplete = (id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  const highPriorityTasks = pendingTasks.filter(task => task.priority === "high");

  // Filter today's completed tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCompletedTasks = completedTasks.filter(task => {
    const completedDate = new Date(task.deadline);
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() === today.getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">StudyMate</h1>
                <p className="text-sm text-muted-foreground">Your AI-powered study companion</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                {todayCompletedTasks.length} completed today
              </Badge>
              <Button variant="default" onClick={() => setIsAIAssistantOpen(true)}>
                <Bot className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center justify-center mb-2">
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-warning">{highPriorityTasks.length}</h3>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </Card>

          <Card className="p-6 text-center bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-success">{todayCompletedTasks.length}</h3>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>

          <Card className="p-6 text-center bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
            <div className="flex items-center justify-center mb-2">
              <Timer className="h-8 w-8 text-secondary-dark" />
            </div>
            <h3 className="text-2xl font-bold text-secondary-dark">2h 30m</h3>
            <p className="text-sm text-muted-foreground">Study Time Today</p>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Tasks & Calendar */}
          <div className="xl:col-span-2 space-y-8">
            {/* Task List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  To Do List
                </h2>
                <Button variant="outline" size="sm" onClick={() => setShowTaskForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-3">
                {pendingTasks.length > 0 ? (
                  pendingTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={toggleTaskComplete}
                    />
                  ))
                ) : (
                  <Card className="p-6 text-center text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tasks yet. Click "Add Task" to get started!</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Weekly Schedule */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Weekly Schedule
                </h2>
              </div>

              <WeeklyCalendar
                tasks={tasks}
                scheduleItems={scheduleItems}
                setScheduleItems={setScheduleItems}
                timePreferences={timePreferences}
                onGenerateSchedule={generateSchedule}
              />
            </div>
          </div>

          {/* Right Column - Timer & Sticky Notes */}
          <div className="space-y-8">
            {/* Timers */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Focus Timers
              </h2>

              <div className="grid gap-4">
                <PomodoroTimer />
                <CandleTimer
                  duration={25}
                  onComplete={() => console.log("Candle session complete!")}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Quick Overview
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <Badge variant="outline">12 tasks completed</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Focus</span>
                  <Badge className="bg-success/10 text-success">87%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Streak</span>
                  <Badge className="bg-primary/10 text-primary">5 days</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Interactive Sticky Notes Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              Quick Reminders
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                Drag to reorganize
              </Badge>
              <Button variant="outline" size="sm" onClick={addStickyNote}>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </div>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <Card className="relative min-h-[400px] overflow-visible bg-gradient-to-br from-muted/30 to-muted/10 border-dashed border-2 p-4 sticky-notes-container">
              {stickyNotes.map(note => (
                <StickyNoteComponent
                  key={note.id}
                  note={note}
                  onUpdate={updateStickyNote}
                  onDelete={deleteStickyNote}
                />
              ))}
              {stickyNotes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">Click "Add Note" to create your first reminder</p>
                    <p className="text-sm opacity-75">Drag and drop notes to reorganize them</p>
                  </div>
                </div>
              )}
            </Card>
          </DndContext>
        </div>

        {/* Task Form Dialog */}
        <TaskFormDialog
          isOpen={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          onAddTask={addTask}
        />

        {/* AI Assistant */}
        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          tasks={tasks}
          onAddTask={addTaskFromChat}
          onAddStickyNote={addStickyNote}
          onClearSlot={handleClearSlot}

          onScheduleUpdate={handleScheduleUpdate}
        />
      </div>
    </div>
  );
};

export default Index;
