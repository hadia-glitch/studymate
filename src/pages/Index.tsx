import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Timer, CheckSquare, StickyNote, BarChart3, Flame, Bot } from "lucide-react";
import { StickyNote as StickyNoteComponent, StickyNoteData } from "@/components/dashboard/StickyNote";
import { TaskCard, Task } from "@/components/dashboard/TaskCard";
import { PomodoroTimer } from "@/components/dashboard/PomodoroTimer";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { ChatBot } from "@/components/chat/ChatBot";
import { CandleTimer } from "@/components/study/CandleTimer";
import { ScheduleOptimizer } from "@/components/ai/ScheduleOptimizer";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

const Index = () => {
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([
    {
      id: "1",
      content: "Review Chapter 5 for tomorrow's quiz",
      color: "yellow",
      position: { x: 50, y: 50 }
    },
    {
      id: "2", 
      content: "Team meeting at 3 PM - Project presentation prep",
      color: "blue",
      position: { x: 320, y: 120 }
    }
  ]);

  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Complete React Assignment",
      description: "Build a todo app with TypeScript and shadcn/ui components",
      priority: "high",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      completed: false,
      category: "Programming",
      estimatedTime: 180
    },
    {
      id: "2",
      title: "Study for Biology Exam",
      description: "Review chapters 8-12, focus on cellular respiration",
      priority: "high",
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      completed: false,
      category: "Biology",
      estimatedTime: 120
    },
    {
      id: "3",
      title: "Group Project Meeting",
      description: "Discuss final presentation and divide remaining tasks",
      priority: "medium",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      completed: false,
      category: "Teamwork",
      estimatedTime: 60
    }
  ]);

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

  const addTaskFromChat = (taskData: Omit<Task, "id">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString()
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleScheduleUpdate = (schedule: any[]) => {
    // Handle the optimized schedule update
    console.log("Schedule updated:", schedule);
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
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                {completedTasks.length} completed today
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
            <h3 className="text-2xl font-bold text-primary">{pendingTasks.length}</h3>
            <p className="text-sm text-muted-foreground">Active Tasks</p>
          </Card>
          
          <Card className="p-6 text-center bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-warning">{highPriorityTasks.length}</h3>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </Card>
          
          <Card className="p-6 text-center bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-success">{completedTasks.length}</h3>
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
                  Today's Tasks
                </h2>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
              
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={toggleTaskComplete}
                  />
                ))}
              </div>
            </div>

            {/* Weekly Calendar */}
            <WeeklyCalendar tasks={tasks} />
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

        {/* AI Schedule Optimizer */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              AI Schedule Optimizer
            </h2>
            <Button variant="outline" size="sm" onClick={() => setTasks(prev => [...prev, {
              id: Date.now().toString(),
              title: "New Task",
              description: "Task description",
              priority: "medium",
              deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
              completed: false,
              category: "General",
              estimatedTime: 60
            }])}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          <ScheduleOptimizer 
            tasks={tasks}
            onScheduleUpdate={handleScheduleUpdate}
            onSlotEdit={handleSlotEdit}
          />
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
        
        {/* AI Assistant */}
        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          tasks={tasks}
          onAddTask={addTaskFromChat}
          onAddStickyNote={addStickyNote}
          onClearSlot={handleClearSlot}
        />
      </div>
    </div>
  );
};

export default Index;