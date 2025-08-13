import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  deadline: Date;
  completed: boolean;
  category?: string;
  estimatedTime?: number; // in minutes
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit?: (task: Task) => void;
}

export const TaskCard = ({ task, onToggleComplete, onEdit }: TaskCardProps) => {
  const priorityColors = {
    high: "bg-priority-high text-white",
    medium: "bg-priority-medium text-white", 
    low: "bg-priority-low text-white",
  };

  const isOverdue = task.deadline < new Date() && !task.completed;
  const isDueSoon = task.deadline.getTime() - new Date().getTime() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <Card className={cn(
      "p-4 hover:shadow-card transition-all duration-200 cursor-pointer animate-slide-up",
      task.completed && "opacity-60 bg-muted/50",
      isOverdue && !task.completed && "border-l-4 border-l-priority-high"
    )}
    onClick={() => onEdit?.(task)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id);
            }}
            className={cn(
              "h-6 w-6 p-0 rounded-full border-2",
              task.completed 
                ? "bg-success text-white border-success" 
                : "border-muted-foreground hover:border-primary"
            )}
          >
            {task.completed && <Check className="h-3 w-3" />}
          </Button>
          <h3 className={cn(
            "font-semibold text-sm",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h3>
        </div>
        <Badge className={cn("text-xs", priorityColors[task.priority])}>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1",
            isOverdue && !task.completed && "text-priority-high",
            isDueSoon && !task.completed && !isOverdue && "text-warning"
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              {task.deadline.toLocaleDateString()}
            </span>
            {isOverdue && !task.completed && <AlertCircle className="h-3 w-3" />}
          </div>
          
          {task.estimatedTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedTime}m</span>
            </div>
          )}
        </div>

        {task.category && (
          <Badge variant="outline" className="text-xs">
            {task.category}
          </Badge>
        )}
      </div>
    </Card>
  );
};