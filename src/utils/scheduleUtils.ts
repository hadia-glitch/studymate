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

export interface TimeSlot {
  start: string;
  end: string;
}

export const parseTimeRange = (timeRange: string): TimeSlot | null => {
  try {
    // Handle formats like "9 AM - 1 PM", "14:00 - 18:00", "9:30 AM - 12:30 PM"
    const timeRangeRegex = /^(\d{1,2}(?::\d{2})?)\s*(?:(AM|PM|am|pm))?\s*-\s*(\d{1,2}(?::\d{2})?)\s*(?:(AM|PM|am|pm))?$/i;
    const match = timeRange.trim().match(timeRangeRegex);
    
    if (!match) return null;

    const [, startTime, startPeriod, endTime, endPeriod] = match;
    
    const parseTime = (time: string, period?: string): string => {
      const [hours, minutes = "00"] = time.split(":");
      let hour = parseInt(hours);
      
      if (period) {
        const isAM = period.toLowerCase() === "am";
        const isPM = period.toLowerCase() === "pm";
        
        if (isPM && hour !== 12) hour += 12;
        if (isAM && hour === 12) hour = 0;
      }
      
      return `${hour.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    };
    
    return {
      start: parseTime(startTime, startPeriod),
      end: parseTime(endTime, endPeriod)
    };
  } catch (error) {
    console.error("Error parsing time range:", timeRange, error);
    return null;
  }
};

export const isTimeInRange = (time: string, timeRange: string): boolean => {
  const slot = parseTimeRange(timeRange);
  if (!slot) return false;
  
  return time >= slot.start && time < slot.end;
};

export const isTimeSlotAvailable = (
  timeSlot: string,
  date: string,
  availableTimeRanges: string[],
  existingScheduleItems: Array<{ interval: string; date: string }>
): boolean => {
  // Check if time slot is already taken
  const isSlotTaken = existingScheduleItems.some(
    item => item.date === date && item.interval === timeSlot
  );
  
  if (isSlotTaken) return false;
  
  // Check if time slot falls within available time ranges
  const [startTime] = timeSlot.split(" - ");
  
  return availableTimeRanges.some(range => 
    isTimeInRange(startTime, range)
  );
};

export const generateTimeSlots = (startHour: number = 8, endHour: number = 22): string[] => {
  const slots = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
    
    // Convert to 12-hour format for display
    const formatTime = (time: string) => {
      const [h, m] = time.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${m} ${ampm}`;
    };
    
    slots.push(`${formatTime(startTime)} - ${formatTime(endTime)}`);
  }
  
  return slots;
};

export const findEarliestAvailableSlot = (
  task: Task,
  availableTimeRanges: string[],
  existingScheduleItems: Array<{ interval: string; date: string }>,
  startDate: Date = new Date()
): { date: string; timeSlot: string } | null => {
  const timeSlots = generateTimeSlots();
  const deadline = new Date(task.deadline);
  
  // Start from current date or next day if current time is late
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  // Search for up to 30 days or until deadline
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const searchDate = new Date(currentDate);
    searchDate.setDate(currentDate.getDate() + dayOffset);
    
    // Don't schedule past deadline
    if (searchDate >= deadline) break;
    
    // Skip past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (searchDate < today) continue;
    
    const dateStr = searchDate.toISOString().split("T")[0];
    
    // Try each time slot for this date
    for (const timeSlot of timeSlots) {
      if (isTimeSlotAvailable(timeSlot, dateStr, availableTimeRanges, existingScheduleItems)) {
        return { date: dateStr, timeSlot };
      }
    }
  }
  
  return null;
};