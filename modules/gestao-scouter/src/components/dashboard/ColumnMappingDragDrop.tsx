import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Search, Trash2, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnMappingWithPriority } from '@/hooks/useColumnMapping';
import { ALL_LEADS_FIELDS } from '@/config/fieldMappings';
import { toast } from 'sonner';

interface DraggableFieldProps {
  field: string;
  isDragging?: boolean;
  isMapped?: boolean;
}

function DraggableField({ field, isDragging, isMapped }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isCurrentDragging } = useSortable({ 
    id: field,
    disabled: isDragging 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md border bg-card cursor-grab active:cursor-grabbing touch-none",
        isDragging && "shadow-lg scale-105 rotate-2 bg-card border-primary",
        isMapped && "border-primary/50 bg-primary/5"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-mono flex-1">{field}</span>
    </div>
  );
}

interface DroppableTargetProps {
  field: { name: string; description?: string };
  mappings: ColumnMappingWithPriority;
  onRemove: (field: string, priority: 'primary' | 'secondary' | 'tertiary') => void;
}

function DroppableTarget({ field, mappings, onRemove }: DroppableTargetProps) {
  const priorities = mappings[field.name];
  const { setNodeRef, isOver } = useSortable({ id: `target-${field.name}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-2 border-dashed rounded-lg p-3 min-h-[80px] transition-colors",
        isOver && "border-primary bg-primary/5",
        !isOver && "border-border"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm">{field.name}</p>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        {priorities && (
          <Badge variant="secondary" className="text-xs">
            {Object.keys(priorities).length} mapeado{Object.keys(priorities).length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {priorities?.primary && (
          <div className="flex items-center gap-2 text-xs bg-primary/10 px-2 py-1 rounded">
            <Badge variant="default" className="h-5">1º</Badge>
            <span className="flex-1 font-mono">{priorities.primary}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => onRemove(field.name, 'primary')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {priorities?.secondary && (
          <div className="flex items-center gap-2 text-xs bg-secondary/50 px-2 py-1 rounded">
            <Badge variant="secondary" className="h-5">2º</Badge>
            <span className="flex-1 font-mono">{priorities.secondary}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => onRemove(field.name, 'secondary')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {priorities?.tertiary && (
          <div className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded">
            <Badge variant="outline" className="h-5">3º</Badge>
            <span className="flex-1 font-mono">{priorities.tertiary}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => onRemove(field.name, 'tertiary')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ColumnMappingDragDropProps {
  csvHeaders: string[];
  mapping: ColumnMappingWithPriority;
  onMappingChange: (mapping: ColumnMappingWithPriority) => void;
  onAutoMap: () => void;
}

export function ColumnMappingDragDrop({
  csvHeaders,
  mapping,
  onMappingChange,
  onAutoMap
}: ColumnMappingDragDropProps) {
  const [searchTarget, setSearchTarget] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredTargetFields = ALL_LEADS_FIELDS.filter(field =>
    field.name.toLowerCase().includes(searchTarget.toLowerCase())
  );

  const mappedCsvColumns = new Set(
    Object.values(mapping).flatMap(priorities => Object.values(priorities))
  );

  const filteredOriginFields = csvHeaders.filter(header => {
    const matchesSearch = header.toLowerCase().includes(searchOrigin.toLowerCase());
    return matchesSearch;
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const csvColumn = active.id as string;
    const targetId = over.id as string;

    if (!targetId.startsWith('target-')) return;

    const targetField = targetId.replace('target-', '');
    const currentPriorities = mapping[targetField] || {};

    // Determinar próxima prioridade disponível
    let priority: 'primary' | 'secondary' | 'tertiary' = 'primary';
    if (currentPriorities.primary) {
      if (currentPriorities.primary === csvColumn) return; // Já mapeado
      priority = 'secondary';
    }
    if (currentPriorities.secondary) {
      if (currentPriorities.secondary === csvColumn) return;
      priority = 'tertiary';
    }
    if (currentPriorities.tertiary && currentPriorities.tertiary === csvColumn) return;

    if (priority === 'tertiary' && currentPriorities.tertiary) {
      toast.warning('Máximo de 3 mapeamentos por campo');
      return;
    }

    // Atualizar mapeamento
    const updatedMapping = {
      ...mapping,
      [targetField]: {
        ...currentPriorities,
        [priority]: csvColumn
      }
    };

    onMappingChange(updatedMapping);
    toast.success(`Mapeado: ${csvColumn} → ${targetField} (${priority === 'primary' ? '1º' : priority === 'secondary' ? '2º' : '3º'})`);
  };

  const handleRemove = (field: string, priority: 'primary' | 'secondary' | 'tertiary') => {
    const updatedMapping = { ...mapping };
    if (updatedMapping[field]) {
      const newPriorities = { ...updatedMapping[field] };
      delete newPriorities[priority];
      
      if (Object.keys(newPriorities).length === 0) {
        delete updatedMapping[field];
      } else {
        updatedMapping[field] = newPriorities;
      }
    }
    onMappingChange(updatedMapping);
  };

  const mappedCount = Object.keys(mapping).length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {mappedCount} campo{mappedCount !== 1 ? 's' : ''} mapeado{mappedCount !== 1 ? 's' : ''}
          </Badge>
          <Button onClick={onAutoMap} variant="outline" size="sm">
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Mapear Campos Similares
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Coluna: Campos Destino (Tabela leads) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Campos Gestão Scouter (Destino)
                <Badge variant="outline">{filteredTargetFields.length}</Badge>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campos destino..."
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <SortableContext
                items={filteredTargetFields.map(f => `target-${f.name}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {filteredTargetFields.map((field) => (
                    <DroppableTarget
                      key={field.name}
                      field={field}
                      mappings={mapping}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </SortableContext>
            </CardContent>
          </Card>

          {/* Coluna: Colunas CSV (Origem) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Colunas CSV (Origem)
                <Badge variant="outline">{filteredOriginFields.length}</Badge>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colunas CSV..."
                  value={searchOrigin}
                  onChange={(e) => setSearchOrigin(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <SortableContext
                items={filteredOriginFields}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {filteredOriginFields.map((header) => (
                    <DraggableField
                      key={header}
                      field={header}
                      isMapped={mappedCsvColumns.has(header)}
                    />
                  ))}
                </div>
              </SortableContext>
            </CardContent>
          </Card>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div className="cursor-grabbing">
            <DraggableField field={activeId} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}