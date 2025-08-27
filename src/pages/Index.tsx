import { useState } from "react";
import "../App.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  parseTimeRange,
 fetchScheduleItems,
  findEarliestAvailableSlot,
  scheduleMultipleTasks
} from "@/utils/scheduleUtils";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Sparkles, User, BookOpen, Brain, CheckCircle, AlertCircle,Bot,MessageCircle } from "lucide-react";
import { TaskFormDialog } from "@/components/dashboard/TaskFormDialog";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { StickyNote } from "@/components/dashboard/StickyNote";
import { ScheduleOptimizer } from "@/components/ai/ScheduleOptimizer";
import { CandleTimer } from "@/components/study/CandleTimer";
import { PomodoroTimer } from "@/components/dashboard/PomodoroTimer";
import { TimePreferencesDialog } from "@/components/dashboard/TimePreferencesDialog";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { useTasks } from "@/hooks/useTasks";
import { useSchedule } from "@/hooks/useSchedule";
import { useStickyNotes } from "@/hooks/useStickyNotes";
import { useTimePreferences } from "@/hooks/useTimePreferences";

import { Plus, Calendar, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DndContext, DragEndEvent } from '@dnd-kit/core';
// Type imports
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  deadline: Date;
  completed: boolean;
  category?: string;
  estimatedTime?: number;
}

interface StickyNoteData {
  id: string;
  content: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple";
  position: { x: number; y: number };
}

const Index = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showScheduleOptimizer, setShowScheduleOptimizer] = useState(false);
  const [showTimePreferences, setShowTimePreferences] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask } = useTasks();
  const { 
    scheduleItems, 
    loading: scheduleLoading, 
    addScheduleItem, 
    updateScheduleItem, 
    deleteScheduleItem,
    bulkUpdateScheduleItems 
  } = useSchedule();
  const { stickyNotes, loading: notesLoading, addStickyNote, updateStickyNote, deleteStickyNote } = useStickyNotes();
  const { timePreferences, loading: preferencesLoading, updateTimePreferences } = useTimePreferences();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Safe arrays to prevent undefined errors
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeScheduleItems = Array.isArray(scheduleItems) ? scheduleItems : [];
  const safeStickyNotes = Array.isArray(stickyNotes) ? stickyNotes : [];

  const handleTaskSubmit = async (taskData: Omit<Task, "id">) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        toast({
          title: "Task updated",
          description: "Your task has been updated successfully.",
        });
      } else {
        await addTask(taskData);
        toast({
          title: "Task created",
          description: "Your task has been created successfully.",
        });
      }
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = safeTasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await updateTask(taskId, { completed: !task.completed });
      toast({
        title: task.completed ? "Task reopened" : "Task completed",
        description: task.completed 
          ? "Task has been marked as incomplete." 
          : "Great job! Task marked as completed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTaskSelect = (taskId: string, isSelected: boolean) => {
    const isScheduled = safeScheduleItems.some(item => item.taskId === taskId);
    if (isScheduled) return; 
  
    setSelectedTasks(prev => 
      isSelected 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await deleteTask(taskId);
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };
  // inside Index.tsx

const generateSchedule = async () => {
  if (!user) return;

  try {
    

    // ✅ 1. Only schedule tasks without existing interval
    const tasksToSchedule = tasks.filter(
      (task) => !scheduleItems.some((item) => item.taskId === task.id)
    );

    if (tasksToSchedule.length === 0) {
      toast({
        title: "No Tasks",
        description: "All tasks are already scheduled.",
      });
      return;
    }

    // ✅ 2. Call new scheduler
    const newScheduleItems = scheduleMultipleTasks(
      tasksToSchedule,
      timePreferences.available || [], // ["09:00-12:00","15:00-17:00"]
      scheduleItems.map((item) => ({
        date: item.date,
        interval_time: item.interval, // DB schema
      }))
    );

    if (newScheduleItems.length === 0) {
      toast({
        title: "No Slots Available",
        description: "Could not find available slots for selected tasks.",
        variant: "destructive",
      });
      return;
    }

    // ✅ 3. Save schedule to DB
    for (const item of newScheduleItems) {
      await addScheduleItem({
        interval: item.interval, // "HH:MM-HH:MM"
        task: item.task,
        date: item.date,
        taskId: item.taskId,
        isAutoScheduled: true,
      });
    }

    // ✅ 4. Refresh
    await fetchScheduleItems(user.id);

    toast({
      title: "Schedule Generated",
      description: `${newScheduleItems.length} task(s) scheduled.`,
    });
  } catch (error) {
    console.error("Error generating schedule:", error);
    toast({
      title: "Error",
      description: "Failed to generate schedule.",
      variant: "destructive",
    });
  } finally {
    
  }
};


  const handleAddStickyNote = async () => {
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
    
    try {
      await addStickyNote(newNote);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!delta) return;

    const noteId = active.id as string;
    const note = safeStickyNotes.find(n => n.id === noteId);
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

  if (tasksLoading || scheduleLoading || notesLoading || preferencesLoading) {
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
          
          <div className="flex items-center gap-4">
            {/* AI Assistant Button */}
            <Button
              onClick={() => setShowAIAssistant(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Bot className="h-5 w-5" />
              
              AI Assistant
            </Button>
            <h1 className="text-3xl font-bold text-foreground">StudyMate Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString("en-US", { 
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
                {completedTasks.length}/{safeTasks.length} tasks completed
              </span>
              <Badge variant="outline" className="px-3 py-1">
                {Math.round((completedTasks.length / safeTasks.length) * 100) || 0}% Complete
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
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
            <h3 className="text-2xl font-bold text-success">{completedTasks.length}</h3>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>

          <Card className="p-6 text-center bg-gradient-to-br from-warning/10 to-warning/5">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warning" />
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
                <div className="flex gap-2">
                  
                 {selectedTasks.length > 0 && (
                  <Button
                    onClick={generateSchedule}
                    className="relative overflow-hidden gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Schedule ({selectedTasks.length})
                
                    {/* Glare effect */}
                    <span className="absolute inset-0 w-[50%] translate-x-[-100%] bg-gradient-to-r from-transparent via-green-200/30 to-transparent animate-glare" />
                  </Button>
                )}
                
                  
                  <Button onClick={() => setShowTaskForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    isSelected={selectedTasks.includes(task.id)}
                    onSelect={handleTaskSelect}
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
              setScheduleItems={bulkUpdateScheduleItems}
              addScheduleItem={addScheduleItem}
              updateScheduleItem={updateScheduleItem}
              deleteScheduleItem={deleteScheduleItem}
              timePreferences={timePreferences}
              //onGenerateSchedule={generateSchedule}
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
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available Times</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTimePreferences(true)}
                  >
                    {timePreferences.available.length > 0 ? "Edit" : "Set"} Times
                  </Button>
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
              {safeStickyNotes.map(note => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onUpdate={(updatedNote) => updateStickyNote(updatedNote.id, updatedNote)}
                  onDelete={deleteStickyNote}
                />
              ))}
              {safeStickyNotes.length === 0 && (
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

     
     {/* AI Assistant Dialog */}
<AIAssistant
  isOpen={showAIAssistant}
  onClose={() => setShowAIAssistant(false)}
  tasks={safeTasks}
  scheduleItems={safeScheduleItems}
  onAddTask={addTask}
  onAddStickyNote={handleAddStickyNote}
  onUpdateScheduleItem={updateScheduleItem}
  onDeleteScheduleItem={deleteScheduleItem}
  onAddScheduleItem={addScheduleItem}
  timePreferences={timePreferences}
  user={user}  // ✅ NEW
  fetchScheduleItems={fetchScheduleItems} // ✅ NEW
  generateSchedule={generateSchedule} // ✅ NEW
  toast={toast} // ✅ NEW
/>



    

      <TaskFormDialog
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
        }}
        onSave={handleTaskSubmit}
        editingTask={editingTask}
      />
    </div>
  );
};

export default Index;