import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface TimePreferences {
  available: string[];
}

export const useTimePreferences = () => {
  const [timePreferences, setTimePreferences] = useState<TimePreferences>({
    available: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTimePreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchTimePreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_preferences')
        .select('available_times')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTimePreferences({
          available: data.available_times || []
        });
      }
    } catch (error: any) {
      toast({
        title: "Error fetching time preferences",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTimePreferences = async (preferences: TimePreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('time_preferences')
        .upsert(
          {
            user_id: user.id,
            available_times: preferences.available,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setTimePreferences(preferences);
      toast({
        title: "Preferences updated",
        description: "Your time preferences have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating preferences",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    timePreferences,
    loading,
    updateTimePreferences,
    refetch: fetchTimePreferences,
  };
};