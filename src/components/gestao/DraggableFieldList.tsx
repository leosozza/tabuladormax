import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableFieldProps {
  id: string;
  label: string;
  onRemove?: () => void;
  canRemove: boolean;
}

function SortableField({ id, label, onRemove, canRemove }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent transition-colors",
        isDragging && "opacity-50 z-50 shadow-lg"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <Badge variant="outline" className="flex-1">{label}</Badge>
      {canRemove && onRemove && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

interface DraggableFieldListProps {
  fields: Array<{ key: string; label: string }>;
  onReorder: (fields: string[]) => void;
  onRemove?: (key: string) => void;
  onAdd?: () => void;
  canRemove?: boolean;
  canAdd?: boolean;
  title: string;
  maxFields?: number;
}

export function DraggableFieldList({
  fields,
  onReorder,
  onRemove,
  onAdd,
  canRemove = true,
  canAdd = true,
  title,
  maxFields,
}: DraggableFieldListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.key === active.id);
      const newIndex = fields.findIndex((f) => f.key === over.id);
      const reordered = arrayMove(fields, oldIndex, newIndex);
      onReorder(reordered.map(f => f.key));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        {maxFields && (
          <span className="text-xs text-muted-foreground">
            {fields.length}/{maxFields}
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={fields.map(f => f.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field) => (
              <SortableField
                key={field.key}
                id={field.key}
                label={field.label}
                onRemove={onRemove ? () => onRemove(field.key) : undefined}
                canRemove={canRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {canAdd && onAdd && (!maxFields || fields.length < maxFields) && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Campo
        </Button>
      )}
    </div>
  );
}
