import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLeadColumnConfig } from '@/hooks/useLeadColumnConfig';
import { useGestaoFieldMappings } from '@/hooks/useGestaoFieldMappings';

interface SortableColumnItemProps {
  id: string;
  label: string;
}

function SortableColumnItem({ id, label }: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-move hover:bg-accent/50 transition-colors"
    >
      <div {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  );
}

interface LeadColumnReorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadColumnReorder({ open, onOpenChange }: LeadColumnReorderProps) {
  const { visibleColumns, reorderColumns } = useLeadColumnConfig();
  const { data: allFields } = useGestaoFieldMappings();

  const visibleFieldsData = allFields?.filter(f => visibleColumns.includes(f.key)) || [];
  
  // Ordenar pelos visibleColumns para manter a ordem atual
  const orderedFields = visibleColumns
    .map(key => visibleFieldsData.find(f => f.key === key))
    .filter(Boolean);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = visibleColumns.indexOf(active.id as string);
    const newIndex = visibleColumns.indexOf(over.id as string);
    
    reorderColumns(oldIndex, newIndex);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reorganizar Colunas</DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-4">
          Arraste as colunas para reorganizá-las na ordem desejada
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleColumns} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {orderedFields.map((field) => (
                <SortableColumnItem
                  key={field.key}
                  id={field.key}
                  label={field.label}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}
