import { useState, useEffect, useRef } from "react";
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
import { Sparkles, User, BookOpen, Brain, CheckCircle, AlertCircle,Bot,MessageCircle, Calendar as CalendarIcon, Clock, Target, Menu, Home } from "lucide-react";
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

import { Plus, Calendar, Target as TargetIcon, StickyNote as StickyNoteIcon } from "lucide-react";
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

// Scroll Animation Hook
const useScrollAnimation = () => {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const elements = document.querySelectorAll('[data-scroll-animate]');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return visibleElements;
};

const ScrollAnimatedDiv = ({ 
  id, 
  children, 
  className = "", 
  delay = 0 
}: { 
  id: string; 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) => {
  const visibleElements = useScrollAnimation();
  const isVisible = visibleElements.has(id);

  return (
    <div
      id={id}
      data-scroll-animate
      className={`transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
};

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
    bulkUpdateScheduleItems,
    fetchScheduleItems: refreshSchedule
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

  // Scroll to section functionality
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const generateSchedule = async () => {
    if (!user) return;

    try {
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

      const newScheduleItems = scheduleMultipleTasks(
        tasksToSchedule,
        timePreferences.available || [],
        scheduleItems.map((item) => ({
          date: item.date,
          interval_time: item.interval,
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

      for (const item of newScheduleItems) {
        await addScheduleItem({
          interval: item.interval,
          task: item.task,
          date: item.date,
          taskId: item.taskId,
          isAutoScheduled: true,
        });
      }

      await refreshSchedule();

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
    className="profile-background min-h-screen p-4 bg-fixed bg-cover bg-center"
    style={{ backgroundImage: "url('../public/2.png')" }}
  >
    <div className="max-w-4xl mx-auto"></div>
     
     {/* Header */}
<div className="sticky top-0 z-50 bg-gradient-to-r from-teal-700 via-teal-600 via-teal-400  via-teal-600 to-teal-700 shadow-lg backdrop-blur-sm">
  <div className="container mx-auto px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <BookOpen className="h-8 w-8 text-white drop-shadow-lg" />
        <h1 className="text-2xl font-bold text-white drop-shadow-md">StudyMate Dashboard</h1>
        <Badge variant="outline" className="bg-white/20 text-white border-white/30">
          {completedTasks.length}/{safeTasks.length} Complete
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={() => setShowAIAssistant(true)}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 hover:text-white  text-white border-white/30 backdrop-blur-sm"
          variant="outline"
        >
          <Bot className="h-5 w-5" />
          AI Assistant
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 hover:text-white text-white border-white/30"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src="" alt="Profile" />
            <AvatarFallback className="bg-white/30 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          Profile
        </Button>
      </div>
    </div>
  </div>
</div>

{/* Navigation Bar */}
<div className="sticky top-[72px] z-40 bg-white/90 backdrop-blur-sm border border-teal-400 shadow-sm">

  <div className="container mx-auto px-6">
    <nav className="flex items-center justify-center space-x-8 py-3">
      <Button
        variant="ghost"
        onClick={() => scrollToSection('overview')}
        className="flex items-center gap-2  text-blue-900 hover:text-purple-600 hover:bg-blue-50 transition-colors"
      >
        <Home className="h-4 w-4" />
        Overview
      </Button>
      <Button
        variant="ghost"
        onClick={() => scrollToSection('tasks')}
        className="flex items-center gap-2 text-blue-900  hover:text-purple-600 hover:bg-blue-50 transition-colors"
      >
        <TargetIcon className="h-4 w-4" />
        Tasks
      </Button>
      <Button
        variant="ghost"
        onClick={() => scrollToSection('schedule')}
        className="flex items-center gap-2 text-blue-900  hover:text-purple-600 hover:bg-blue-50 transition-colors"
      >
        <CalendarIcon className="h-4 w-4" />
        Schedule
      </Button>
      <Button
        variant="ghost"
        onClick={() => scrollToSection('focus')}
        className="flex items-center gap-2 text-blue-900 hover:text-purple-600 hover:bg-blue-50 transition-colors"
      >
        <Clock className="h-4 w-4" />
        Focus Sessions
      </Button>
      <Button
        variant="ghost"
        onClick={() => scrollToSection('notes')}
        className="flex items-center gap-2 text-blue-900   hover:text-purple-600 hover:bg-blue-50 transition-colors"
      >
        <StickyNoteIcon className="h-4 w-4" />
        Notes
      </Button>
    </nav>
  </div>
</div>

<div className="container mx-auto px-6 py-8">

        {/* Date Display */}
        <ScrollAnimatedDiv id="date-section" className="text-center mb-8">
        <div className="inline-block bg-white/50 backdrop-blur-sm rounded-full px-6 py-3">
          <p className="text-lg text-grey-900">
            {new Date().toLocaleDateString("en-US", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </p>
          </div>
        </ScrollAnimatedDiv>

 {/* Stats Overview + Task Management in the same ScrollAnimatedDiv */}
<ScrollAnimatedDiv id="overview" className="space-y-12">
  {/* Stats Overview */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <Card className="p-6 text-center bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-200 hover:shadow-lg transition-all duration-300">
      <TargetIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
      <h3 className="text-2xl font-bold text-blue-700">{pendingTasks.length}</h3>
      <p className="text-sm text-blue-600/80">Pending Tasks</p>
    </Card>

    <Card className="p-6 text-center bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-200 hover:shadow-lg transition-all duration-300">
      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
      <h3 className="text-2xl font-bold text-green-700">{completedTasks.length}</h3>
      <p className="text-sm text-green-600/80">Completed</p>
    </Card>

    <Card className="p-6 text-center bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-200 hover:shadow-lg transition-all duration-300">
      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
      <h3 className="text-2xl font-bold text-orange-700">{highPriorityTasks.length}</h3>
      <p className="text-sm text-orange-600/80">High Priority</p>
    </Card>

    <Card className="p-6 text-center bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-200 hover:shadow-lg transition-all duration-300">
      <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-600" />
      <h3 className="text-2xl font-bold text-purple-700">{safeScheduleItems.length}</h3>
      <p className="text-sm text-purple-600/80">Scheduled</p>
    </Card>
  </div>

  {/* Task Management Section */}
  <div className="bg-gradient-to-r from-purple-200 to-purple-200 rounded-lg p-1">
    <div className="bg-white rounded-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Task Management
        </h2>
        <div className="flex gap-2">
          {selectedTasks.length > 0 && (
            <Button
              onClick={generateSchedule}
              className="relative overflow-hidden gap-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white hover:from-purple-700 hover:to-indigo-800"
            >
              <Sparkles className="h-4 w-4" />
              Generate Schedule ({selectedTasks.length})
            </Button>
          )}
          
          <Button
            onClick={() => setShowTaskForm(true)}
            className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {pendingTasks.map((task, index) => (
          
            <TaskCard
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={handleTaskSelect}
            />
         
        ))}
        {pendingTasks.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground bg-gradient-to-br from-purple-50 to-indigo-50">
            <TargetIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-purple-600" />
            <p>No pending tasks. Great job staying on top of your work!</p>
          </Card>
        )}
      </div>
    </div>
  </div>
</ScrollAnimatedDiv>


      
            {/* Weekly Calendar */}
            <ScrollAnimatedDiv id="schedule" delay={10}>
              <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-lg p-1">
                <div className="bg-white rounded-md">
                  <WeeklyCalendar 
                    tasks={safeTasks}
                    scheduleItems={safeScheduleItems}
                    setScheduleItems={bulkUpdateScheduleItems}
                    addScheduleItem={addScheduleItem}
                    updateScheduleItem={updateScheduleItem}
                    deleteScheduleItem={deleteScheduleItem}
                    timePreferences={timePreferences}
                  />
                </div>
              </div>
            </ScrollAnimatedDiv>
          </div>

          {/* Right Column - Timers & Stats */}
          <div className="space-y-8">
           {/* Focus Timers */}
<ScrollAnimatedDiv id="focus" delay={50}>
  <div className="bg-gradient-to-r from-purple-200 to-purple-200 rounded-lg p-1">
    <div className="bg-white rounded-md p-6">
    <div className="space-y-4">
      <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
        Focus Sessions
      </h2>
     
      
        <PomodoroTimer />
        <CandleTimer
          duration={25}
          onComplete={() => console.log("Focus session completed!")}
        />
      </div>
    </div>
  </div>
</ScrollAnimatedDiv>

{/* Quick Stats */}
<ScrollAnimatedDiv id="stats" delay={50}>
  <div className="bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-lg p-1">
    <div className="bg-white rounded-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
          Quick Overview
        </h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">This Week</span>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {completedTasks.length} completed
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">High Priority</span>
          <Badge
            variant={highPriorityTasks.length > 0 ? "destructive" : "outline"}
            className={
              highPriorityTasks.length === 0
                ? "bg-green-50 text-green-700 border-green-200"
                : ""
            }
          >
            {highPriorityTasks.length} remaining
          </Badge>
        </div>
       
      </div>
    </div>
  </div>
</ScrollAnimatedDiv>

        
        
     {/* Sticky Notes Section */}
<ScrollAnimatedDiv id="notes" className="mt-12" delay={50}>
<div className="bg-gradient-to-r from-purple-200 to-purple-200 rounded-lg p-1">
    <div className="bg-white rounded-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Quick Reminders
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddStickyNote}
            
             className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <Card className="relative min-h-[400px] overflow-hidden bg-white border-dashed border-2 border-purple-200">
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
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50 text-purple-600" />
                <p>Click "Add Note" to create your first reminder</p>
              </div>
            </div>
          )}
        </Card>
      </DndContext>
    </div>
  </div>
</ScrollAnimatedDiv>


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
        user={user}
        fetchScheduleItems={fetchScheduleItems}
        generateSchedule={generateSchedule}
        toast={toast}
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

      <TimePreferencesDialog
        isOpen={showTimePreferences}
        onClose={() => setShowTimePreferences(false)}
        onSave={updateTimePreferences}
      />
    </div>
    </div>
   
  );
};

export default Index;