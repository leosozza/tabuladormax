/**
 * DraggableGridLayout - Grid com suporte a drag & drop para reorganizar widgets
 * Usa @dnd-kit para arrastar e soltar widgets
 */

import { useState } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

export interface DraggableWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  size?: {
    cols: number;
    rows: number;
  };
}

interface DraggableGridLayoutProps {
  widgets: DraggableWidget[];
  onReorder?: (widgets: DraggableWidget[]) => void;
  gap?: number;
  className?: string;
  editable?: boolean;
}

function SortableWidget({ 
  widget, 
  editable 
}: { 
  widget: DraggableWidget; 
  editable?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl transition-all",
        `col-span-12 md:col-span-${widget.size?.cols || 6}`,
        isDragging && 'z-50'
      )}
    >
      <Card className="h-full rounded-2xl border-border/50 relative group">
        {editable && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 p-2 bg-background/80 rounded-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {widget.component}
      </Card>
    </div>
  );
}

export function DraggableGridLayout({
  widgets,
  onReorder,
  gap = 4,
  className,
  editable = true,
}: DraggableGridLayoutProps) {
  const [items, setItems] = useState(widgets);
  
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
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      
      if (onReorder) {
        onReorder(newItems);
      }
    }
  };

  // Atualizar items quando widgets mudar
  useState(() => {
    if (widgets !== items) {
      setItems(widgets);
    }
  });

  if (!editable) {
    // Modo não editável - sem drag and drop
    return (
      <div 
        className={cn(
          "grid grid-cols-12 auto-rows-min",
          `gap-${gap}`,
          className
        )}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(
              "rounded-2xl transition-all",
              `col-span-12 md:col-span-${widget.size?.cols || 6}`
            )}
            style={{ minHeight: `${(widget.size?.rows || 4) * 80}px` }}
          >
            <Card className="h-full rounded-2xl border-border/50">
              {widget.component}
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(w => w.id)} strategy={rectSortingStrategy}>
        <div 
          className={cn(
            "grid grid-cols-12 auto-rows-min",
            `gap-${gap}`,
            className
          )}
        >
          {items.map((widget) => (
            <SortableWidget
              key={widget.id}
              widget={widget}
              editable={editable}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
