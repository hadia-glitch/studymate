import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Calendar, Clock, Zap, AlertTriangle } from "lucide-react";
import { Task } from "@/components/dashboard/TaskCard";

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  task?: Task;
  type: "work" | "break" | "free";
  day: Date;
}

interface ScheduleOptimizerProps {
  tasks: Task[];
  onScheduleUpdate: (schedule: TimeSlot[]) => void;
  onSlotEdit: (slotId: string, newTask?: Task) => void;
}

export const ScheduleOptimizer = ({ tasks, onScheduleUpdate, onSlotEdit }: ScheduleOptimizerProps) => {
  const [optimizedSchedule, setOptimizedSchedule] = useState<TimeSlot[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date());

  const generateOptimizedSchedule = async () => {
    setIsOptimizing(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const workingHours = {
      start: 8, // 8 AM
      end: 22,  // 10 PM
    };

    const schedule: TimeSlot[] = [];
    const pendingTasks = tasks.filter(task => !task.completed);
    
    // Sort tasks by priority and deadline
    const sortedTasks = [...pendingTasks].sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    let currentTime = workingHours.start;
    const today = new Date();
    
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() + day);
      currentTime = workingHours.start;
      
      // Morning focus block
      if (sortedTasks.length > 0 && currentTime < workingHours.end) {
        const task = sortedTasks.shift()!;
        const duration = Math.min(task.estimatedTime / 60, 3); // Max 3 hours
        
        schedule.push({
          id: `${day}-${currentTime}`,
          start: `${Math.floor(currentTime).toString().padStart(2, '0')}:${((currentTime % 1) * 60).toString().padStart(2, '0')}`,
          end: `${Math.floor(currentTime + duration).toString().padStart(2, '0')}:${(((currentTime + duration) % 1) * 60).toString().padStart(2, '0')}`,
          task,
          type: "work",
          day: currentDay
        });
        
        currentTime += duration;
        
        // Add break
        if (currentTime < workingHours.end - 0.5) {
          schedule.push({
            id: `${day}-${currentTime}-break`,
            start: `${Math.floor(currentTime).toString().padStart(2, '0')}:${((currentTime % 1) * 60).toString().padStart(2, '0')}`,
            end: `${Math.floor(currentTime + 0.5).toString().padStart(2, '0')}:${(((currentTime + 0.5) % 1) * 60).toString().padStart(2, '0')}`,
            type: "break",
            day: currentDay
          });
          currentTime += 0.5;
        }
      }
      
      // Afternoon session
      if (sortedTasks.length > 0 && currentTime < workingHours.end - 2) {
        const task = sortedTasks.shift()!;
        const duration = Math.min(task.estimatedTime / 60, 2.5);
        
        schedule.push({
          id: `${day}-${currentTime}`,
          start: `${Math.floor(currentTime).toString().padStart(2, '0')}:${((currentTime % 1) * 60).toString().padStart(2, '0')}`,
          end: `${Math.floor(currentTime + duration).toString().padStart(2, '0')}:${(((currentTime + duration) % 1) * 60).toString().padStart(2, '0')}`,
          task,
          type: "work",
          day: currentDay
        });
      }
    }
    
    setOptimizedSchedule(schedule);
    onScheduleUpdate(schedule);
    setIsOptimizing(false);
  };

  const getTodaySchedule = () => {
    return optimizedSchedule.filter(slot => 
      slot.day.toDateString() === selectedDay.toDateString()
    );
  };

  const getScheduleStats = () => {
    const todaySlots = getTodaySchedule();
    const workSlots = todaySlots.filter(slot => slot.type === "work");
    const totalWorkTime = workSlots.reduce((acc, slot) => {
      const start = parseFloat(slot.start.replace(':', '.'));
      const end = parseFloat(slot.end.replace(':', '.'));
      return acc + (end - start);
    }, 0);
    
    return {
      totalTasks: workSlots.length,
      totalHours: totalWorkTime.toFixed(1),
      highPriorityTasks: workSlots.filter(slot => slot.task?.priority === "high").length
    };
  };

  const handleSlotClick = (slot: TimeSlot) => {
    // Allow editing of the slot
    onSlotEdit(slot.id, slot.task);
  };

  const stats = getScheduleStats();

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Schedule Optimizer</h3>
        </div>
        <Button 
          onClick={generateOptimizedSchedule} 
          disabled={isOptimizing}
          className="gap-2"
        >
          {isOptimizing ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Optimize Schedule
            </>
          )}
        </Button>
      </div>

      {optimizedSchedule.length > 0 && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalTasks}</div>
              <div className="text-sm text-muted-foreground">Tasks Today</div>
            </div>
            <div className="text-center p-3 bg-success/5 rounded-lg">
              <div className="text-2xl font-bold text-success">{stats.totalHours}h</div>
              <div className="text-sm text-muted-foreground">Study Time</div>
            </div>
            <div className="text-center p-3 bg-warning/5 rounded-lg">
              <div className="text-2xl font-bold text-warning">{stats.highPriorityTasks}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
          </div>

          {/* Day Navigation */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              const isSelected = date.toDateString() === selectedDay.toDateString();
              
              return (
                <Button
                  key={i}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(date)}
                  className="flex-1"
                >
                  <div className="text-center">
                    <div className="text-xs">{date.toLocaleDateString('en', { weekday: 'short' })}</div>
                    <div className="text-sm font-semibold">{date.getDate()}</div>
                  </div>
                </Button>
              );
            })}
          </div>

          <Separator />

          {/* Schedule for Selected Day */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h4 className="font-medium">
                {selectedDay.toLocaleDateString('en', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
            </div>
            
            {getTodaySchedule().map(slot => (
              <div
                key={slot.id}
                onClick={() => handleSlotClick(slot)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  slot.type === "work" 
                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                    : slot.type === "break"
                    ? "bg-secondary/5 border-secondary/20"
                    : "bg-muted/30 border-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm font-mono">
                      <Clock className="h-3 w-3" />
                      {slot.start} - {slot.end}
                    </div>
                    {slot.task && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{slot.task.title}</span>
                        <Badge variant={
                          slot.task.priority === "high" ? "destructive" :
                          slot.task.priority === "medium" ? "default" : "secondary"
                        }>
                          {slot.task.priority}
                        </Badge>
                      </div>
                    )}
                    {slot.type === "break" && (
                      <span className="text-sm text-muted-foreground">Break Time</span>
                    )}
                  </div>
                  
                  {slot.task?.deadline && new Date(slot.task.deadline) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
                
                {slot.task?.description && (
                  <p className="text-sm text-muted-foreground mt-1 ml-6">
                    {slot.task.description}
                  </p>
                )}
              </div>
            ))}
            
            {getTodaySchedule().length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled tasks for this day</p>
                <p className="text-sm">Click "Optimize Schedule" to generate an AI plan</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};