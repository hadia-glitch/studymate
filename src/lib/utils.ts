

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";


// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
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

// Schedule Item interface
export interface ScheduleItem {
  id: string;
  interval: string;
  task: string;
  date: string; // e.g. "2025-08-19"
  taskId?: string; // Reference to original task
  isAutoScheduled?: boolean; // Track if this was auto-scheduled
}

// Time Preferences interface
export interface TimePreferences {
  filled: string[]; // Available time slots
  unfilled: string[]; // Unavailable time slots
}

// Convert time string to minutes for sorting
export function convertToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let totalMinutes = (hours % 12) * 60 + (minutes || 0);
  if (period === "PM" && hours !== 12) totalMinutes += 12 * 60;
  if (period === "AM" && hours === 12) totalMinutes = minutes || 0;
  return totalMinutes;
}

// Get week dates starting from Monday
export function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
  start.setDate(diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

// Calculate task priority score for scheduling
export function calculateTaskPriorityScore(task: Task): number {
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const priorityScore = priorityWeight[task.priority];
  
  // Calculate urgency (days until deadline)
  const now = new Date();
  const urgency = (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  // Combine priority and urgency
  return priorityScore * 10 + (10 - Math.max(0, urgency));
}

// Generate available time slots based on preferences
export function getAvailableTimeSlots(timePreferences: TimePreferences): string[] {
  const defaultSlots = [
    "9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
    "2:00 PM - 3:00 PM", "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM"
  ];
  
  const availableSlots = timePreferences.filled.length > 0 
    ? timePreferences.filled 
    : defaultSlots;
    
  const unavailableSlots = timePreferences.unfilled || [];
  return availableSlots.filter(slot => !unavailableSlots.includes(slot));
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Format date for display
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Format time for display
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

// Calculate days until deadline
export function getDaysUntilDeadline(deadline: Date): number {
  return Math.ceil(
    (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
}

// Check if task is overdue
export function isTaskOverdue(task: Task): boolean {
  return task.deadline < new Date() && !task.completed;
}

// Check if task is due soon (within 24 hours)
export function isTaskDueSoon(task: Task): boolean {
  const timeDiff = task.deadline.getTime() - new Date().getTime();
  return timeDiff < 24 * 60 * 60 * 1000 && timeDiff > 0;
}

// Sort tasks by priority and deadline
export function sortTasksByPriorityAndDeadline(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    const aScore = calculateTaskPriorityScore(a);
    const bScore = calculateTaskPriorityScore(b);
    return bScore - aScore;
  });
}

// Generate smart schedule for tasks
export function generateSmartSchedule(
  tasks: Task[],
  timePreferences: TimePreferences,
  existingScheduleItems: ScheduleItem[]
): ScheduleItem[] {
  const availableSlots = getAvailableTimeSlots(timePreferences);
  const existingSlots = existingScheduleItems.map(item => `${item.date}|${item.interval}`);
  const newScheduleItems: ScheduleItem[] = [];
  const today = new Date();
  
  const sortedTasks = sortTasksByPriorityAndDeadline(tasks.filter(task => !task.completed));
  
  sortedTasks.forEach(task => {
    const sessionsNeeded = Math.ceil((task.estimatedTime || 60) / 60);
    let sessionsScheduled = 0;
    
    // Ensure completion 2 days before deadline
    const maxDate = new Date(task.deadline.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    for (let dayOffset = 0; dayOffset <= 14 && sessionsScheduled < sessionsNeeded; dayOffset++) {
      const currentDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      
      if (currentDate > maxDate) break;
      
      const dateStr = currentDate.toISOString().split("T")[0];
      
      availableSlots.forEach(slot => {
        if (sessionsScheduled >= sessionsNeeded) return;
        
        const slotKey = `${dateStr}|${slot}`;
        if (existingSlots.includes(slotKey)) return;
        
        const sessionTitle = sessionsNeeded > 1 
          ? `${task.title} (Session ${sessionsScheduled + 1}/${sessionsNeeded})`
          : task.title;
          
        newScheduleItems.push({
          id: `auto-${Date.now()}-${sessionsScheduled}-${Math.random()}`,
          interval: slot,
          task: sessionTitle,
          date: dateStr,
          taskId: task.id,
          isAutoScheduled: true
        });
        
        existingSlots.push(slotKey);
        sessionsScheduled++;
      });
    }
  });
  
  return newScheduleItems;
}

// Get today's date string
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Sort schedule items chronologically
export function sortScheduleItemsChronologically(items: ScheduleItem[]): ScheduleItem[] {
  return items.sort((a, b) => {
    // First sort by date
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) return dateComparison;
    
    // Then sort by time
    const timeA = convertToMinutes(a.interval.split(" - ")[0]);
    const timeB = convertToMinutes(b.interval.split(" - ")[0]);
    return timeA - timeB;
  });
}
