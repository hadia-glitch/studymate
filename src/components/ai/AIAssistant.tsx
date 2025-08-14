import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Send, Maximize2, Minimize2, Plus, Calendar, Clock } from "lucide-react";
import { Task } from "@/components/dashboard/TaskCard";
import { StickyNoteData } from "@/components/dashboard/StickyNote";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id">) => void;
  onAddStickyNote: () => void;
  onClearSlot: (date: Date, time: string) => void;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export const AIAssistant = ({ isOpen, onClose, tasks, onAddTask, onAddStickyNote, onClearSlot }: AIAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI study assistant. I can help you manage your schedule, add tasks, create reminders, and answer questions about your work. Try asking me something like 'What work do I have for today?' or 'Add a new task to study math with deadline tomorrow'.",
      sender: "ai",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const processAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for work/schedule queries
    if (lowerMessage.includes("work") && (lowerMessage.includes("today") || lowerMessage.includes("now"))) {
      const todayTasks = tasks.filter(task => !task.completed);
      if (todayTasks.length === 0) {
        return "You don't have any pending tasks for today. Great job staying on top of your work!";
      }
      const taskList = todayTasks.map(task => `• ${task.title} (${task.priority} priority, due ${task.deadline.toLocaleDateString()})`).join('\n');
      return `Here's your current work for today:\n\n${taskList}\n\nWould you like me to help you prioritize these or add any new tasks?`;
    }

    // Check for task addition requests
    if (lowerMessage.includes("add") && lowerMessage.includes("task")) {
      // Extract task details from the message
      let title = "New Task";
      let priority: "low" | "medium" | "high" = "medium";
      let category = "General";
      let deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow
      
      // Simple parsing for task details
      if (lowerMessage.includes("math")) {
        title = "Study Mathematics";
        category = "Mathematics";
      } else if (lowerMessage.includes("study")) {
        title = "Study Session";
        category = "Study";
      } else if (lowerMessage.includes("assignment")) {
        title = "Complete Assignment";
        category = "Assignment";
      }
      
      if (lowerMessage.includes("high priority") || lowerMessage.includes("urgent")) {
        priority = "high";
      } else if (lowerMessage.includes("low priority")) {
        priority = "low";
      }
      
      if (lowerMessage.includes("tomorrow")) {
        deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (lowerMessage.includes("today")) {
        deadline = new Date();
      } else if (lowerMessage.includes("next week")) {
        deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      const newTask = {
        title,
        description: `Task created via AI assistant: ${userMessage}`,
        priority,
        deadline,
        completed: false,
        category,
        estimatedTime: 60
      };
      
      onAddTask(newTask);
      return `Perfect! I've added "${title}" to your task list with ${priority} priority, due ${deadline.toLocaleDateString()}. The task is now visible in your schedule.`;
    }

    // Check for reminder addition
    if (lowerMessage.includes("add") && (lowerMessage.includes("reminder") || lowerMessage.includes("note"))) {
      onAddStickyNote();
      return "I've created a new sticky note for you! You can find it in the Quick Reminders section below. Click on it to add your reminder text.";
    }

    // Check for schedule clearing requests
    if (lowerMessage.includes("free up") && lowerMessage.includes("slot")) {
      return "I can help you free up time slots! However, I need more specific information. Could you tell me which day and time you'd like to clear? For example, 'Free up tomorrow at 2 PM' or 'Clear my schedule for Friday morning'.";
    }

    // Check for priority queries
    if (lowerMessage.includes("priority") || lowerMessage.includes("important")) {
      const highPriorityTasks = tasks.filter(task => task.priority === "high" && !task.completed);
      if (highPriorityTasks.length === 0) {
        return "You don't have any high-priority tasks right now. Great job managing your workload!";
      }
      const taskList = highPriorityTasks.map(task => `• ${task.title} (due ${task.deadline.toLocaleDateString()})`).join('\n');
      return `Here are your high-priority tasks:\n\n${taskList}\n\nI recommend focusing on these first.`;
    }

    // Check for time/schedule questions
    if (lowerMessage.includes("when") || lowerMessage.includes("schedule")) {
      return "I can see your current schedule! You have several tasks with upcoming deadlines. Would you like me to help you prioritize them or suggest an optimal study schedule?";
    }

    // Default response
    return `I understand you're asking about "${userMessage}". I can help you with:
    
• Adding new tasks and reminders
• Checking your current work and schedule
• Managing task priorities
• Freeing up time slots
• Creating study schedules

Try asking me something specific like "What's my priority work?" or "Add a task to review notes with deadline Friday".`;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate AI processing delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: processAIResponse(inputValue),
        sender: "ai",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 500);

    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isExpanded ? "max-w-4xl h-[80vh]" : "max-w-2xl h-[600px]"} transition-all duration-300`}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">AI Study Assistant</DialogTitle>
              <p className="text-sm text-muted-foreground">Your intelligent task & schedule manager</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setInputValue("What work do I have for today?")}>
              <Calendar className="h-3 w-3 mr-1" />
              Today's Work
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInputValue("Add a new study task")}>
              <Plus className="h-3 w-3 mr-1" />
              Add Task
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInputValue("What are my high priority tasks?")}>
              <Clock className="h-3 w-3 mr-1" />
              Priorities
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 mb-4" ref={scrollAreaRef}>
            <div className="space-y-4 pr-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.sender === "ai" && (
                        <Bot className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />
                      )}
                      <div>
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your tasks, schedule, or tell me to add something..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};