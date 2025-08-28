// src/components/ai/AIAssistant.tsx
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Bot as BotIcon, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// =========================
// Types
// =========================
type Sender = "user" | "bot";


interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

interface DBScheduleItem {
  id: string;
  user_id: string;
  schedule_date: string; // YYYY-MM-DD
  interval_time: string; // "HH:mm - HH:mm"
  task_description: string;
  task_id: string | null;
  is_auto_scheduled: boolean | null;
}

interface DBTask {
  id: string;
  user_id: string;
  title: string;
  estimated_time: number | null; // minutes
  deadline: string | null; // ISO
  completed: boolean | null;
}

interface TimeSlot {
  start: number; // minutes from 00:00
  end: number;   // minutes from 00:00
}

// =========================
// Utilities
// =========================

/** Convert "HH:mm" to minutes from midnight */
const hmToMinutes = (hm: string): number => {
  const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? h : 0;
  const min = Number.isFinite(m) ? m : 0;
  return Math.max(0, Math.min(23 * 60 + 59, hour * 60 + min));
};

/** Convert minutes from midnight to "HH:mm" */
const minutesToHM = (mins: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(mins)));
  const h = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const m = (clamped % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

/** Parse "HH:mm - HH:mm" → TimeSlot (in minutes) */
const parseTimeRange = (range: string): TimeSlot | null => {
  try {
    const [startStr, endStr] = range.split(" - ").map((s) => s.trim());
    if (!startStr || !endStr) return null;
    const start = hmToMinutes(startStr);
    const end = hmToMinutes(endStr);
    if (end <= start) return null;
    return { start, end };
  } catch {
    return null;
  }
};

/** Format a time slot given start (minutes) and duration (minutes) into "HH:mm - HH:mm" */
const formatInterval = (startMin: number, durationMin: number): string => {
  const start = minutesToHM(startMin);
  const end = minutesToHM(startMin + durationMin);
  return `${start} - ${end}`;
};

/** Returns ISO date YYYY-MM-DD for a Date (local) */
const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Add days to a date (returns new Date) */
const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/** Strip time part */
const startOfDay = (d: Date) => {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

/** Case-insensitive contains */
const containsCI = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase());

/** Parse intents and parameters from user message */
const parseIntent = (msg: string) => {
  const text = msg.trim().toLowerCase();

  // What should I do now / next
  if (
    text.includes("what should i do now") ||
    text.includes("what should i be doing") ||
    (text.includes("what") && text.includes("do") && text.includes("now"))
  ) {
    return { intent: "what_now" as const };
  }
  if (text.includes("what's next") || text.includes("whats next") || text.includes("next task")) {
    return { intent: "what_next" as const };
  }

  // Move / reschedule
  if (text.startsWith("move ") || text.startsWith("reschedule ")) {
    return { intent: "move" as const };
  }

  // Add task (optional — can be extended)
  if (text.startsWith("add task")) {
    return { intent: "add_task" as const };
  }

  return { intent: "chat" as const };
};

/** Extract title or interval/date from "move ..." message */
const parseMoveCommand = (raw: string): {
  titleOrInterval?: string;
  targetDate?: Date;
  targetTimeMinutes?: number; // desired start time, optional
} => {
  const text = raw.trim();

  // Remove keywords
  const body = text.replace(/^move\s+|^reschedule\s+/i, "").trim();

  // Find " to " separator
  const toIdx = body.toLowerCase().lastIndexOf(" to ");
  let identifier = body;
  let tail = "";

  if (toIdx >= 0) {
    identifier = body.slice(0, toIdx).trim();
    tail = body.slice(toIdx + 4).trim(); // after " to "
  }

  // Normalize interval by ensuring " - "
  let titleOrInterval = identifier.replace(/-/g, " - ").replace(/\s{2,}/g, " ");

  // Parse tail into date and/or time
  let targetDate: Date | undefined;
  let targetTimeMinutes: number | undefined;

  const now = new Date();

  if (tail) {
    // Detect "today" / "tomorrow"
    if (/\btoday\b/i.test(tail)) {
      targetDate = startOfDay(now);
    } else if (/\btomorrow\b/i.test(tail)) {
      targetDate = startOfDay(addDays(now, 1));
    }

    // Detect explicit date YYYY-MM-DD
    const isoDateMatch = tail.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      const d = new Date(isoDateMatch[1]);
      if (!isNaN(d.getTime())) targetDate = startOfDay(d);
    }

    // Detect explicit date DD-MM-YYYY
    const dmYMatch = tail.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
    if (dmYMatch) {
      const [_, dd, mm, yyyy] = dmYMatch;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d.getTime())) targetDate = startOfDay(d);
    }

    // Detect time HH:mm
    const timeMatch = tail.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (timeMatch) {
      targetTimeMinutes = hmToMinutes(`${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`);
    }
  }

  // Default date: today
  if (!targetDate) targetDate = startOfDay(now);

  return { titleOrInterval, targetDate, targetTimeMinutes };
};

/** Fetch current user */
const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
};

/** Fetch time preferences (array of "HH:mm - HH:mm") */
const fetchAvailableTimes = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("time_preferences")
    .select("available_times")
    .eq("user_id", userId)
    .single();
  if (error || !data?.available_times) return [];
  // Ensure they are strings with " - "
  return (data.available_times as string[]).map((s) => s.replace(/-/g, " - ").replace(/\s{2,}/g, " "));
};

/** Fetch schedule items for a specific date */
const fetchScheduleByDate = async (userId: string, dateISO: string): Promise<DBScheduleItem[]> => {
  const { data, error } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("user_id", userId)
    .eq("schedule_date", dateISO)
    .order("interval_time", { ascending: true });
  if (error || !data) return [];
  return data as DBScheduleItem[];
};

/** Fetch schedule items for a date range (inclusive) */
const fetchScheduleRange = async (userId: string, fromISO: string, toISO: string): Promise<DBScheduleItem[]> => {
  const { data, error } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("user_id", userId)
    .gte("schedule_date", fromISO)
    .lte("schedule_date", toISO)
    .order("schedule_date", { ascending: true })
    .order("interval_time", { ascending: true });
  if (error || !data) return [];
  return data as DBScheduleItem[];
};

/** Fetch task by ID */
const fetchTaskById = async (taskId: string): Promise<DBTask | null> => {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
  if (error || !data) return null;
  return data as DBTask;
};

/** Check if interval conflicts with existing items on same date */
const hasConflict = (interval: string, existing: DBScheduleItem[]) => {
  const slot = parseTimeRange(interval);
  if (!slot) return true;
  for (const item of existing) {
    const other = parseTimeRange(item.interval_time);
    if (!other) continue;
    // overlap if not (end <= other.start || start >= other.end)
    if (!(slot.end <= other.start || slot.start >= other.end)) return true;
  }
  return false;
};

/** Find earliest available slot on a given date respecting availability + conflicts + earliestStartMin */
const findEarliestAvailableSlotOnDate = (
  date: Date,
  availableWindows: string[],
  existing: DBScheduleItem[],
  durationMin: number,
  earliestStartMin?: number // minutes (e.g., now+60 if today)
): string | null => {
  const windows = availableWindows
    .map(parseTimeRange)
    .filter(Boolean) as TimeSlot[];

  // Sort windows by start
  windows.sort((a, b) => a.start - b.start);

  for (const w of windows) {
    // Step in 30-min increments inside each window
    const step = 30;
    let start = Math.max(w.start, earliestStartMin ?? 0);
    // align to next 30-min boundary
    start = Math.ceil(start / step) * step;

    while (start + durationMin <= w.end) {
      const candidate = formatInterval(start, durationMin);
      if (!hasConflict(candidate, existing)) {
        return candidate;
      }
      start += step;
    }
  }

  return null;
};

/** Get current or next task for a given date (assumes items sorted) */
const getCurrentOrNext = (dateItems: DBScheduleItem[], now: Date) => {
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const item of dateItems) {
    const slot = parseTimeRange(item.interval_time);
    if (!slot) continue;
    if (nowMin >= slot.start && nowMin <= slot.end) {
      return { type: "current" as const, item };
    }
    if (nowMin < slot.start) {
      return { type: "next" as const, item };
    }
  }
  return null;
};

/** Try to find scheduled item by title or by exact interval on a date */
const findScheduledItemByIdentifier = (
  items: DBScheduleItem[],
  identifier: string
): DBScheduleItem | null => {
  const normalizedInterval = identifier.replace(/-/g, " - ").replace(/\s{2,}/g, " ");
  // if identifier looks like interval
  const intervalLike = /^\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/.test(normalizedInterval);

  if (intervalLike) {
    const exact = items.find((it) => it.interval_time.trim() === normalizedInterval.trim());
    if (exact) return exact;
  }

  // otherwise, match by task_description
  const byTitle = items.find((it) => containsCI(it.task_description || "", identifier));
  return byTitle || null;
};

/** Delete a scheduled item by id */
const deleteScheduleItemById = async (id: string) => {
  await supabase.from("schedule_items").delete().eq("id", id);
};

/** Insert a schedule item */
const insertScheduleItem = async (payload: {
  user_id: string;
  schedule_date: string;
  interval_time: string;
  task_description: string;
  task_id?: string | null;
  is_auto_scheduled?: boolean;
}) => {
  await supabase.from("schedule_items").insert(payload);
};

// =========================
// Component
// =========================
import {  ScheduleItem } from "@/hooks/useSchedule";
import { toast } from "@/components/ui/use-toast";
import { Task } from "@/components/dashboard/TaskCard";
interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  onAddTask: (taskData: Omit<Task, "id">) => Promise<void>;
  onAddStickyNote: () => Promise<void>;
  onUpdateScheduleItem: (itemId: string, updates: Partial<ScheduleItem>) => Promise<void>;

  onDeleteScheduleItem: (id: string) => Promise<void>;
  onAddScheduleItem: (item: Omit<ScheduleItem, "id">) => Promise<void>;
  timePreferences: { available: string[] };
  user: any;
  fetchScheduleItems: (userId: string) => Promise<Omit<ScheduleItem, "id">[]>;


  generateSchedule: () => Promise<void>;
  toast: typeof toast;
}

export const AIAssistant = ({
  isOpen,
  onClose,
  tasks,
  scheduleItems,
  onAddTask,
  onAddStickyNote,
  onUpdateScheduleItem,
  onDeleteScheduleItem,
  onAddScheduleItem,
  timePreferences,
  user,
  fetchScheduleItems,
  generateSchedule,
  toast,
}: AIAssistantProps) => {
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      text:
        "Hi! I’m your StudyMate AI assistant. Ask me:\n• “What should I do now?”\n• “What’s my next task?”\n• “Move algebra to tomorrow 14:30”\n• “Reschedule 09:00 - 10:00 to today 15:00”",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const pushMessage = (text: string, sender: Sender) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text,
        sender,
        timestamp: new Date(),
      },
    ]);
  };

  // ============== Intent handlers ==============

  const handleWhatNow = async () => {
    const user = await getUser();
    if (!user) return pushMessage("Please sign in to access your schedule.", "bot");

    const today = startOfDay(new Date());
    const todayISO = toISODate(today);
    const items = await fetchScheduleByDate(user.id, todayISO);

    if (items.length === 0) {
      return pushMessage("You have nothing scheduled today 🎉", "bot");
    }

    const now = new Date();
    const status = getCurrentOrNext(items, now);
    if (!status) {
      return pushMessage("You’ve finished all tasks for today. Nice work! 🎉", "bot");
    }

    if (status.type === "current") {
      return pushMessage(
        `Right now: “${status.item.task_description}” (${status.item.interval_time}).`,
        "bot"
      );
    }

    return pushMessage(
      `Next up: “${status.item.task_description}” at ${status.item.interval_time}.`,
      "bot"
    );
  };

  const handleWhatNext = async () => {
    const user = await getUser();
    if (!user) return pushMessage("Please sign in to access your schedule.", "bot");

    // Look across today and tomorrow for the very next item
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(today, 1));
    const items = await fetchScheduleRange(user.id, toISODate(today), toISODate(tomorrow));

    if (items.length === 0) {
      return pushMessage("No upcoming tasks scheduled in the next day.", "bot");
    }

    const now = new Date();
    const todayItems = items.filter((i) => i.schedule_date === toISODate(today));
    const statusToday = getCurrentOrNext(todayItems, now);

    if (statusToday && statusToday.type !== "current") {
      return pushMessage(
        `Next today: “${statusToday.item.task_description}” at ${statusToday.item.interval_time}.`,
        "bot"
      );
    }

    // otherwise pick the earliest item after today
    const tomorrowItems = items.filter((i) => i.schedule_date === toISODate(tomorrow));
    if (tomorrowItems.length) {
      const first = tomorrowItems[0];
      return pushMessage(
        `Next is tomorrow: “${first.task_description}” at ${first.interval_time}.`,
        "bot"
      );
    }

    return pushMessage("No upcoming tasks scheduled soon.", "bot");
  };

  const handleMove = async (raw: string) => {
    const user = await getUser();
    if (!user) return pushMessage("Please sign in to modify your schedule.", "bot");

    const { titleOrInterval, targetDate, targetTimeMinutes } = parseMoveCommand(raw);

    if (!titleOrInterval) {
      return pushMessage(
        `Please tell me which task to move (e.g., “move algebra to tomorrow 14:30” or “reschedule 09:00 - 10:00 to today 15:00”).`,
        "bot"
      );
    }

    const dateISO = toISODate(targetDate!);

    // Load items for that date (to search by interval/title) and also today if date omitted
    const itemsThatDay = await fetchScheduleByDate(user.id, dateISO);

    // If user didn’t specify a date in the command but meant the *current* scheduled item,
    // try checking today’s date first (already handled by defaulting targetDate to today).

    // If not found for that date, also search the next 6 days (be forgiving).
    let targetItem = findScheduledItemByIdentifier(itemsThatDay, titleOrInterval);
    let searchDateISO = dateISO;

    if (!targetItem) {
      for (let i = -3; i <= 7 && !targetItem; i++) {
        const d = toISODate(addDays(targetDate!, i));
        const altItems = await fetchScheduleByDate(user.id, d);
        const match = findScheduledItemByIdentifier(altItems, titleOrInterval);
        if (match) {
          targetItem = match;
          searchDateISO = d;
          break;
        }
      }
    }

    if (!targetItem) {
      return pushMessage(
        `I couldn’t find a scheduled item matching “${titleOrInterval}”. Please provide the exact interval (“HH:mm - HH:mm”) or a unique part of the title.`,
        "bot"
      );
    }

    // Get the original task’s estimated time if available
    let durationMin = 60;
    if (targetItem.task_id) {
      const t = await fetchTaskById(targetItem.task_id);
      if (t?.estimated_time && t.estimated_time > 0) durationMin = t.estimated_time;
    }

    // Figure out the target date we’re moving *to*
    const moveToDateISO = toISODate(targetDate!);

    // Load availability + existing items for the target date
    const availableTimes = await fetchAvailableTimes(user.id);
    if (!availableTimes.length) {
      return pushMessage(
        "You haven’t set your available times yet. Please set them in Time Preferences first.",
        "bot"
      );
    }

    const targetDayItems = await fetchScheduleByDate(user.id, moveToDateISO);

    // If the date is today, ensure we start at least 60 min from now
    let earliestStartMin: number | undefined = undefined;
    const now = new Date();
    const isToday = toISODate(startOfDay(now)) === moveToDateISO;
    if (isToday) {
      const minStart = now.getHours() * 60 + now.getMinutes() + 60; // now + 60 minutes
      earliestStartMin = minStart;
    }

    // If the user provided a specific time, prefer that (if free/valid). Otherwise, find earliest slot.
    let newInterval: string | null = null;

    if (typeof targetTimeMinutes === "number") {
      const candidate = formatInterval(
        Math.max(earliestStartMin ?? 0, targetTimeMinutes),
        durationMin
      );
      if (!hasConflict(candidate, targetDayItems) && parseTimeRange(candidate)) {
        newInterval = candidate;
      } else {
        // fall back to earliest available slot after this time
        const after = Math.max(earliestStartMin ?? 0, targetTimeMinutes);
        newInterval = findEarliestAvailableSlotOnDate(
          new Date(moveToDateISO),
          availableTimes,
          targetDayItems,
          durationMin,
          after
        );
      }
    } else {
      // No explicit time → find earliest available (respect earliestStartMin if today)
      newInterval = findEarliestAvailableSlotOnDate(
        new Date(moveToDateISO),
        availableTimes,
        targetDayItems,
        durationMin,
        earliestStartMin
      );
    }

    if (!newInterval) {
      return pushMessage(
        `No free slots available on ${moveToDateISO} for a ${durationMin}-minute session.`,
        "bot"
      );
    }

    // Apply change: delete old → insert new
    await deleteScheduleItemById(targetItem.id);

    await insertScheduleItem({
      user_id: user.id,
      schedule_date: moveToDateISO,
      interval_time: newInterval,
      task_description: targetItem.task_description,
      task_id: targetItem.task_id,
      is_auto_scheduled: true,
    });
    

    return pushMessage(
      `Rescheduled “${targetItem.task_description}” to ${moveToDateISO} at ${newInterval}.`,
      "bot"
    );
  };

  // Generic small talk fallback
  const handleChat = async () => {
    const variants = [
      "I’m here to help you plan. Try “What should I do now?”",
      "Need a hand rescheduling? Say “Move algebra to tomorrow 14:30”.",
      "Ask me “What’s my next task?”",
    ];
    pushMessage(variants[Math.floor(Math.random() * variants.length)], "bot");
  };

  // ============== Send ==============

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt) return;

    pushMessage(txt, "user");
    setInput("");

    const { intent } = parseIntent(txt);

    if (intent === "what_now") {
      await handleWhatNow();
      return;
    }
    if (intent === "what_next") {
      await handleWhatNext();
      return;
    }
    if (intent === "move") {
      await handleMove(txt);
      return;
    }
    // (optional) extend with "add_task" intent to write into tasks table

    await handleChat();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  // =========================
  // UI
  // =========================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[400px] h-[520px] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-100 to-purple-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-50  flex items-center justify-center">
              <BotIcon className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">StudyMate AI</h3>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          
        </div>
  
        {/* Messages */}
<ScrollArea className="flex-1 p-4" ref={scrollRef}>
  <div className="space-y-3">
    {messages.map((m) => (
      <div
        key={m.id}
        className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
      >
        {m.sender === "bot" && (
          <div className="h-6 w-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-1">
            <BotIcon className="h-3 w-3 text-black" /> {/* bot icon black */}
          </div>
        )}
        <div
          className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-line ${
            m.sender === "user" ? "bg-teal-50 text-black" : "bg-teal-100 text-black"
          }`}
        >
          <p>{m.text}</p>
          <p className="text-[10px] opacity-70 mt-1">
            {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        {m.sender === "user" && (
          <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
            <UserIcon className="h-3 w-3 text-black" /> {/* user icon black */}
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
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder='e.g., "What should I do now?" or "Move algebra to tomorrow 14:30"'
      className="flex-1 bg-purple-50 text-black" // input background purple-50, text black
    />
    <Button onClick={handleSend} size="icon" className="bg-purple-100" >
      <Send className="h-4 w-4 text-black bg-purple-100" /> {/* icon black */}
     
    </Button>
  </div>
</div>
      </DialogContent>
    </Dialog>
  );
}  

export default AIAssistant;
