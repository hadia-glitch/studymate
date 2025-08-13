import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "./TaskCard";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "task" | "event" | "break";
  priority?: "high" | "medium" | "low";
}

interface WeeklyCalendarProps {
  tasks: Task[];
  onAddEvent?: (date: Date, hour: number) => void;
}

export const WeeklyCalendar = ({ tasks, onAddEvent }: WeeklyCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

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
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => 
      task.deadline.toDateString() === date.toDateString() && !task.completed
    );
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
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
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1 text-sm">
        {/* Header */}
        <div className="p-2"></div>
        {weekDates.map((date, index) => (
          <div
            key={date.toISOString()}
            className={cn(
              "p-2 text-center font-medium",
              isToday(date) && "bg-primary text-primary-foreground rounded-lg"
            )}
          >
            <div className="text-xs text-muted-foreground">{dayNames[index]}</div>
            <div className="text-lg">{date.getDate()}</div>
          </div>
        ))}

        {/* Time slots */}
        {hours.map((hour) => (
          <>
            <div key={`hour-${hour}`} className="p-2 text-xs text-muted-foreground text-right border-r">
              {hour}:00
            </div>
            {weekDates.map((date) => {
              const dayTasks = getTasksForDay(date);
              const isCurrentHour = isToday(date) && new Date().getHours() === hour;
              
              return (
                <div
                  key={`${date.toISOString()}-${hour}`}
                  className={cn(
                    "min-h-16 p-1 border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors",
                    isCurrentHour && "bg-primary/10 border-primary/30"
                  )}
                  onClick={() => onAddEvent?.(date, hour)}
                >
                  {hour === 9 && dayTasks.length > 0 && (
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "text-xs p-1 rounded truncate",
                            task.priority === "high" && "bg-priority-high/20 text-priority-high",
                            task.priority === "medium" && "bg-priority-medium/20 text-priority-medium",
                            task.priority === "low" && "bg-priority-low/20 text-priority-low"
                          )}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                  
                  {hour === 9 && dayTasks.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground/50">
                      <Plus className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </Card>
  );
};