import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Edit3, Save, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraggable } from '@dnd-kit/core';

export interface StickyNoteData {
  id: string;
  content: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple";
  position: { x: number; y: number };
}

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (note: StickyNoteData) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

export const StickyNote = ({ note, onUpdate, onDelete, isDragging }: StickyNoteProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: isDraggingLocal
  } = useDraggable({
    id: note.id,
  });

  const colorClasses = {
    yellow: "bg-sticky-yellow text-amber-800 border-amber-300",
    pink: "bg-sticky-pink text-pink-800 border-pink-300",
    blue: "bg-sticky-blue text-blue-800 border-blue-300",
    green: "bg-sticky-green text-green-800 border-green-300",
    purple: "bg-sticky-purple text-purple-800 border-purple-300",
  };

  const handleSave = () => {
    onUpdate({ ...note, content: editContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const currentlyDragging = isDragging || isDraggingLocal;

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "absolute w-56 h-56 p-4 border-2 shadow-sticky transition-all duration-200",
        colorClasses[note.color],
        currentlyDragging ? "rotate-6 scale-105 shadow-float z-50" : "hover:rotate-1 hover:shadow-float z-10",
        "animate-slide-up",
        !isEditing && "cursor-grab active:cursor-grabbing"
      )}
      style={{
        left: note.position.x,
        top: note.position.y,
        transform: currentlyDragging ? 'rotate(6deg) scale(1.05)' : undefined,
        zIndex: currentlyDragging ? 50 : 10
      }}
      {...attributes}
      {...(!isEditing ? listeners : {})}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-1">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0 hover:bg-white/50"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <div className="h-6 w-6 flex items-center justify-center opacity-60">
                <GripVertical className="h-3 w-3" />
              </div>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(note.id)}
          className="h-6 w-6 p-0 hover:bg-red-500/20"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-32 p-2 bg-white/50 border-none resize-none rounded text-sm focus:outline-none focus:bg-white/70"
            placeholder="Write your reminder..."
            autoFocus
          />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-6 px-2 hover:bg-white/50"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 px-2 hover:bg-white/50"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-40 overflow-hidden">
          <p className="text-sm font-medium leading-relaxed break-words">
            {note.content || "Click edit to add a reminder..."}
          </p>
        </div>
      )}
    </Card>
  );
};