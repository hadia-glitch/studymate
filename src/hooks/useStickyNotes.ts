import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface StickyNoteData {
  id: string;
  content: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple";
  position: { x: number; y: number };
}

export const useStickyNotes = () => {
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchStickyNotes();
    }
  }, [user]);

  const fetchStickyNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedNotes: StickyNoteData[] = data.map(note => ({
        id: note.id,
        content: note.content,
        color: note.color as "yellow" | "pink" | "blue" | "green" | "purple",
        position: { x: note.position_x, y: note.position_y },
      }));

      setStickyNotes(formattedNotes);
    } catch (error: any) {
      toast({
        title: "Error fetching sticky notes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addStickyNote = async (note: Omit<StickyNoteData, "id">) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sticky_notes')
        .insert({
          user_id: user.id,
          content: note.content,
          color: note.color,
          position_x: note.position.x,
          position_y: note.position.y,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: StickyNoteData = {
        id: data.id,
        content: data.content,
        color: data.color as "yellow" | "pink" | "blue" | "green" | "purple",
        position: { x: data.position_x, y: data.position_y },
      };

      setStickyNotes(prev => [...prev, newNote]);
    } catch (error: any) {
      toast({
        title: "Error adding sticky note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateStickyNote = async (noteId: string, updates: Partial<StickyNoteData>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.position !== undefined) {
        updateData.position_x = updates.position.x;
        updateData.position_y = updates.position.y;
      }

      const { error } = await supabase
        .from('sticky_notes')
        .update(updateData)
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;

      setStickyNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, ...updates } : note
      ));
    } catch (error: any) {
      toast({
        title: "Error updating sticky note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteStickyNote = async (noteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sticky_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;

      setStickyNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error: any) {
      toast({
        title: "Error deleting sticky note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    stickyNotes,
    loading,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
    refetch: fetchStickyNotes,
  };
};