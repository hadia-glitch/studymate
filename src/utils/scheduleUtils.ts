// utils/schedulingUtils.ts
import { supabase } from '@/integrations/supabase/client';

// ---- Time helpers ----

// convert "HH:MM" → minutes
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// convert minutes → "HH:MM"
export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// parse "HH:MM-HH:MM"
export function parseTimeRange(range: string) {
  const [start, end] = range.split("-");
  return { start: toMinutes(start), end: toMinutes(end) };
}

// check overlap
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

// ---- Slot finder ----

export function findEarliestAvailableSlot(
  ranges: string[],
  occupied: [number, number][],
  duration: number,
  minStart = 0
): [string, string] | null {
  for (const range of ranges) {
    const { start, end } = parseTimeRange(range);
    let t = Math.max(start, minStart);

    while (t + duration <= end) {
      const candidate = [t, t + duration];
      if (!occupied.some(([os, oe]) => overlaps(t, t + duration, os, oe))) {
        return [fromMinutes(candidate[0]), fromMinutes(candidate[1])];
      }
      t += 5; // slide forward by 5 mins if blocked
    }
  }
  return null;
}

// ---- Multi-task scheduler ----

interface Task {
  id: string;
  title: string;
  deadline: Date;
  estimatedTime?: number; // in minutes
}

export interface ScheduleItem {
  id?: string;
  taskId: string;
  task: string;
  date: string; // YYYY-MM-DD
  interval: string; // "HH:MM-HH:MM"
  isAutoScheduled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

export function scheduleMultipleTasks(
  tasks: Task[],
  available_times: string[],
  existing: { date: string; interval_time: string }[]
): ScheduleItem[] {
  const newSchedule: ScheduleItem[] = [];
  const today = new Date();
  const currentDay = new Date(today);

  // occupied intervals by day
  const occupiedByDay: Record<string, [number, number][]> = {};
  for (const item of existing) {
    if (!occupiedByDay[item.date]) occupiedByDay[item.date] = [];
    const { start, end } = parseTimeRange(item.interval_time);
    occupiedByDay[item.date].push([start, end]);
  }

  for (const task of tasks) {
    const duration = task.estimatedTime ?? 60;
    const deadline = new Date(task.deadline);

    let scheduled = false;

    while (currentDay <= deadline && !scheduled) {
      const dateStr = currentDay.toISOString().split("T")[0];
      const occupied = occupiedByDay[dateStr] || [];

      const minStart =
        dateStr === today.toISOString().split("T")[0]
          ? toMinutes(
              `${today.getHours().toString().padStart(2, "0")}:${today
                .getMinutes()
                .toString()
                .padStart(2, "0")}`
            ) + 60 // push 1h from now
          : 0;

      const slot = findEarliestAvailableSlot(
        available_times,
        occupied,
        duration,
        minStart
      );

      if (slot) {
        const [s, e] = slot;
        const interval = `${s}-${e}`;

        const newItem: ScheduleItem = {
          taskId: task.id,
          task: task.title,
          date: dateStr,
          interval,
        };

        newSchedule.push(newItem);

        if (!occupiedByDay[dateStr]) occupiedByDay[dateStr] = [];
        occupiedByDay[dateStr].push([toMinutes(s), toMinutes(e)]);

        scheduled = true;
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  return newSchedule;
}

// ---- Supabase fetch ----

export const fetchScheduleItems = async (
  userId: string
): Promise<ScheduleItem[]> => {
  const { data, error } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching schedule items:", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    taskId: row.task_id,
    task: row.task_description,
    date: row.schedule_date,
    interval: row.interval_time,
    isAutoScheduled: row.is_auto_scheduled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }));
};
