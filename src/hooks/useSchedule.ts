import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ScheduleItem {
  id: string;
  interval: string;
  task: string;
  date: string;
  taskId?: string;
  isAutoScheduled?: boolean;
}

export const useSchedule = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchScheduleItems();
    }
  }, [user]);

  const fetchScheduleItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('user_id', user.id)
        .order('schedule_date', { ascending: true });

      if (error) throw error;

      const formattedItems: ScheduleItem[] = data.map(item => ({
        id: item.id,
        interval: item.interval_time,
        task: item.task_description,
        date: item.schedule_date,
        taskId: item.task_id,
        isAutoScheduled: item.is_auto_scheduled,
      }));

      setScheduleItems(formattedItems);
    } catch (error: any) {
      toast({
        title: "Error fetching schedule",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addScheduleItem = async (item: Omit<ScheduleItem, "id">) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .insert({
          user_id: user.id,
          interval_time: item.interval,
          task_description: item.task,
          schedule_date: item.date,
          task_id: item.taskId,
          is_auto_scheduled: item.isAutoScheduled || false,
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: ScheduleItem = {
        id: data.id,
        interval: data.interval_time,
        task: data.task_description,
        date: data.schedule_date,
        taskId: data.task_id,
        isAutoScheduled: data.is_auto_scheduled,
      };

      setScheduleItems(prev => [...prev, newItem]);
    } catch (error: any) {
      toast({
        title: "Error adding schedule item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateScheduleItem = async (itemId: string, updates: Partial<ScheduleItem>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.interval !== undefined) updateData.interval_time = updates.interval;
      if (updates.task !== undefined) updateData.task_description = updates.task;
      if (updates.date !== undefined) updateData.schedule_date = updates.date;
      if (updates.taskId !== undefined) updateData.task_id = updates.taskId;
      if (updates.isAutoScheduled !== undefined) updateData.is_auto_scheduled = updates.isAutoScheduled;

      const { error } = await supabase
        .from('schedule_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setScheduleItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
    } catch (error: any) {
      toast({
        title: "Error updating schedule item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteScheduleItem = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('schedule_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setScheduleItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error: any) {
      toast({
        title: "Error deleting schedule item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const bulkUpdateScheduleItems = async (items: ScheduleItem[]) => {
    if (!user) return;

    try {
      // Delete existing items for the date range
      const dates = [...new Set(items.map(item => item.date))];
      
      for (const date of dates) {
        await supabase
          .from('schedule_items')
          .delete()
          .eq('user_id', user.id)
          .eq('schedule_date', date);
      }

      // Insert new items
      const insertData = items.map(item => ({
        user_id: user.id,
        interval_time: item.interval,
        task_description: item.task,
        schedule_date: item.date,
        task_id: item.taskId,
        is_auto_scheduled: item.isAutoScheduled || false,
      }));

      const { error } = await supabase
        .from('schedule_items')
        .insert(insertData);

      if (error) throw error;

      await fetchScheduleItems();
    } catch (error: any) {
      toast({
        title: "Error updating schedule",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    scheduleItems,
    loading,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    bulkUpdateScheduleItems,
    refetch: fetchScheduleItems,
  };
};