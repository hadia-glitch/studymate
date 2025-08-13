import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Bot, User } from "lucide-react";
import { Task } from "@/components/dashboard/TaskCard";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface ChatBotProps {
  onAddTask: (task: Omit<Task, "id">) => void;
  onClearSlot: (date: Date, time: string) => void;
  tasks: Task[];
}

export const ChatBot = ({ onAddTask, onClearSlot, tasks }: ChatBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your StudyMate AI assistant. I can help you add tasks, manage your schedule, and optimize your study time. Try saying something like 'Add task: study math for tomorrow'!",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const parseTaskFromMessage = (message: string): Omit<Task, "id"> | null => {
    const taskRegex = /add task:?\s*(.+)/i;
    const match = message.match(taskRegex);
    
    if (match) {
      const taskText = match[1].trim();
      
      // Extract priority
      const priorityRegex = /(high|medium|low) priority/i;
      const priorityMatch = taskText.match(priorityRegex);
      const priority = priorityMatch ? priorityMatch[1].toLowerCase() as "high" | "medium" | "low" : "medium";
      
      // Extract deadline
      const deadlineRegex = /(tomorrow|today|by (.+?)(?:\s|$))/i;
      const deadlineMatch = taskText.match(deadlineRegex);
      let deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // default to tomorrow
      
      if (deadlineMatch) {
        if (deadlineMatch[1].toLowerCase() === "today") {
          deadline = new Date();
        } else if (deadlineMatch[1].toLowerCase() === "tomorrow") {
          deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
      }
      
      // Extract time estimate
      const timeRegex = /(\d+)\s*(hours?|hrs?|minutes?|mins?)/i;
      const timeMatch = taskText.match(timeRegex);
      let estimatedTime = 60; // default 1 hour
      
      if (timeMatch) {
        const amount = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        estimatedTime = unit.includes("hour") || unit.includes("hr") ? amount * 60 : amount;
      }
      
      // Clean title
      const title = taskText
        .replace(priorityRegex, "")
        .replace(deadlineRegex, "")
        .replace(timeRegex, "")
        .trim();
      
      return {
        title: title || "New Task",
        description: `Added via AI assistant`,
        priority,
        deadline,
        completed: false,
        category: "General",
        estimatedTime
      };
    }
    
    return null;
  };

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("clear") && lowerMessage.includes("slot")) {
      return "I can help you clear schedule slots! You can edit your schedule directly on the calendar or ask me to reschedule specific tasks.";
    }
    
    if (lowerMessage.includes("schedule") || lowerMessage.includes("plan")) {
      return "I'm analyzing your tasks and optimizing your schedule based on priorities and deadlines. Check your calendar for the AI-generated plan!";
    }
    
    if (lowerMessage.includes("help")) {
      return "I can help you with:\n• Adding tasks ('Add task: study biology')\n• Managing your schedule\n• Clearing time slots\n• Optimizing study sessions\n• Setting priorities and deadlines";
    }
    
    if (parseTaskFromMessage(userMessage)) {
      return "Great! I've added that task to your list. I'll factor it into your optimized schedule.";
    }
    
    const responses = [
      "I understand! Let me help you optimize your study schedule.",
      "That's a great approach to productivity! How else can I assist?",
      "I'm here to help make your studying more efficient. What would you like to work on?",
      "Excellent! Your focus and organization will definitely pay off."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Parse and add task if applicable
    const taskData = parseTaskFromMessage(inputValue);
    if (taskData) {
      onAddTask(taskData);
    }

    // Generate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateBotResponse(inputValue),
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);

    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-float z-40 transition-all duration-300 ${
          isOpen ? "scale-0" : "scale-100 hover:scale-110"
        }`}
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-float z-50 flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">StudyMate AI</h3>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "bot" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.sender === "user" && (
                    <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-secondary-dark" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};