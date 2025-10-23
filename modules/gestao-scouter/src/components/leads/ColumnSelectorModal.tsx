import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ALL_LEAD_FIELDS, CATEGORY_LABELS } from '@/config/leadFields';
import { useLeadColumnConfig } from '@/hooks/useLeadColumnConfig';
import { Search, RotateCcw, GripVertical, X } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ColumnSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SortableColumnItem({ 
  field, 
  onRemove,
  index 
}: { 
  field: typeof ALL_LEAD_FIELDS[0], 
  onRemove: () => void,
  index: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2"
    >
      <span className="text-xs text-muted-foreground w-6 text-right">
        {index + 1}.
      </span>
      <div className="flex-1 flex items-center gap-2 p-2 bg-background border rounded-lg">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="flex-1 text-sm">{field.label}</span>
        {field.key !== 'nome' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        {field.key === 'nome' && (
          <Badge variant="secondary" className="text-xs">
            Obrigatório
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ColumnSelectorModal({ open, onOpenChange }: ColumnSelectorModalProps) {
  const [search, setSearch] = useState('');
  const {
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
    selectAll,
    clearAll,
    canToggle,
    minColumns,
    maxColumns
  } = useLeadColumnConfig();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = visibleColumns.indexOf(active.id as string);
      const newIndex = visibleColumns.indexOf(over.id as string);
      reorderColumns(oldIndex, newIndex);
    }
  };

  const categories = Array.from(new Set(ALL_LEAD_FIELDS.map(f => f.category)));

  const filteredFields = ALL_LEAD_FIELDS.filter(field =>
    field.label.toLowerCase().includes(search.toLowerCase()) ||
    field.key.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFields = categories.reduce((acc, category) => {
    acc[category] = filteredFields.filter(f => f.category === category);
    return acc;
  }, {} as Record<string, typeof ALL_LEAD_FIELDS>);

  const selectedFields = ALL_LEAD_FIELDS.filter(f => 
    visibleColumns.includes(f.key)
  ).sort((a, b) => 
    visibleColumns.indexOf(a.key) - visibleColumns.indexOf(b.key)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Configurar Colunas da Lista de Leads</DialogTitle>
          <DialogDescription>
            Selecione quais campos deseja exibir e arraste para definir a ordem. Mínimo de {minColumns} e máximo de {maxColumns} colunas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {visibleColumns.length} de {ALL_LEAD_FIELDS.length} campos selecionados
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={visibleColumns.length <= minColumns}
              >
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={visibleColumns.length >= maxColumns}
              >
                Máximo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Padrão
              </Button>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-6 h-[450px]">
            {/* Left: Checkboxes */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold sticky top-0 bg-background pb-2">
                Campos Disponíveis
              </h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {categories.map(category => {
                    const fields = groupedFields[category];
                    if (!fields || fields.length === 0) return null;

                    return (
                      <div key={category} className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">
                          {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {fields.map(field => {
                            const isChecked = visibleColumns.includes(field.key);
                            const canToggleField = canToggle(field.key);

                            return (
                              <div
                                key={field.key}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent/50"
                              >
                                <Checkbox
                                  id={field.key}
                                  checked={isChecked}
                                  onCheckedChange={() => toggleColumn(field.key)}
                                  disabled={!canToggleField}
                                />
                                <label
                                  htmlFor={field.key}
                                  className="text-sm flex-1 cursor-pointer"
                                >
                                  {field.label}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Sortable list */}
            <div className="space-y-2 border-l pl-6">
              <h3 className="text-sm font-semibold sticky top-0 bg-background pb-2">
                Colunas Selecionadas ({visibleColumns.length}/{maxColumns})
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Arraste para reordenar ↕
              </p>
              <ScrollArea className="h-[400px] pr-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleColumns}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedFields.map((field, index) => (
                        <SortableColumnItem
                          key={field.key}
                          field={field}
                          index={index}
                          onRemove={() => toggleColumn(field.key)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Aplicar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
