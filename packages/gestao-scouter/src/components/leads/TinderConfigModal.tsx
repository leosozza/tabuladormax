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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_LEAD_FIELDS, CATEGORY_LABELS } from '@/config/leadFields';
import { useTinderCardConfig } from '@/hooks/useTinderCardConfig';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { Search, X, Image as ImageIcon, User, FileText, Tag, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TinderConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DraggableField({ field }: { field: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const fieldConfig = ALL_LEAD_FIELDS.find(f => f.key === field);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-sm cursor-move hover:bg-primary/20 transition-colors"
    >
      {fieldConfig?.label || field}
    </div>
  );
}

function DroppableZone({ 
  id, 
  children, 
  title, 
  icon: Icon,
  isEmpty 
}: { 
  id: string; 
  children: React.ReactNode; 
  title: string; 
  icon: any;
  isEmpty?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
      } ${isEmpty ? 'min-h-[80px]' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {isEmpty ? (
          <p className="text-xs text-muted-foreground italic">Arraste campos aqui</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function TinderConfigModal({ open, onOpenChange }: TinderConfigModalProps) {
  const [search, setSearch] = useState('');
  const {
    config,
    setPhotoField,
    addMainField,
    removeMainField,
    addDetailField,
    removeDetailField,
    addBadgeField,
    removeBadgeField,
    resetToDefault,
    canAddMainField,
    canRemoveMainField,
    canAddDetailField,
    canAddBadgeField,
    validation
  } = useTinderCardConfig();

  const categories = Array.from(new Set(ALL_LEAD_FIELDS.map(f => f.category)));

  const filteredFields = ALL_LEAD_FIELDS.filter(field =>
    field.label.toLowerCase().includes(search.toLowerCase()) ||
    field.key.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFields = categories.reduce((acc, category) => {
    acc[category] = filteredFields.filter(f => f.category === category);
    return acc;
  }, {} as Record<string, typeof ALL_LEAD_FIELDS>);

  const photoFields = ALL_LEAD_FIELDS.filter(f => 
    f.key.includes('foto') || f.key === 'foto'
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const field = active.id as string;
    const zone = over.id as string;

    if (zone === 'main' && canAddMainField()) {
      addMainField(field);
    } else if (zone === 'details' && canAddDetailField()) {
      addDetailField(field);
    } else if (zone === 'badges' && canAddBadgeField()) {
      addBadgeField(field);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurar Card de Análise Tinder</DialogTitle>
          <DialogDescription>
            Personalize quais campos aparecem no card de análise. Arraste os campos para as zonas desejadas.
          </DialogDescription>
        </DialogHeader>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Preview - 40% */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold">Preview do Card</h3>
              
              {/* Card Preview */}
              <div className="bg-card border rounded-xl p-6 space-y-4 shadow-lg">
                {/* Photo Zone */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Foto</span>
                  </div>
                  <Select value={config.photoField} onValueChange={setPhotoField}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecionar campo de foto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {photoFields.map(field => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Main Fields Zone */}
                <DroppableZone 
                  id="main" 
                  title={`Campos Principais (${config.mainFields.length}/${validation.mainFields.max})`}
                  icon={User}
                  isEmpty={config.mainFields.length === 0}
                >
                  {config.mainFields.map(field => (
                    <div key={field} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                      {ALL_LEAD_FIELDS.find(f => f.key === field)?.label || field}
                      {canRemoveMainField() && (
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeMainField(field)}
                        />
                      )}
                    </div>
                  ))}
                </DroppableZone>

                {/* Detail Fields Zone */}
                <DroppableZone 
                  id="details" 
                  title={`Detalhes (${config.detailFields.length}/${validation.detailFields.max})`}
                  icon={FileText}
                  isEmpty={config.detailFields.length === 0}
                >
                  {config.detailFields.map(field => (
                    <div key={field} className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                      {ALL_LEAD_FIELDS.find(f => f.key === field)?.label || field}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeDetailField(field)}
                      />
                    </div>
                  ))}
                </DroppableZone>

                {/* Badge Fields Zone */}
                <DroppableZone 
                  id="badges" 
                  title={`Badges (${config.badgeFields.length}/${validation.badgeFields.max})`}
                  icon={Tag}
                  isEmpty={config.badgeFields.length === 0}
                >
                  {config.badgeFields.map(field => (
                    <Badge key={field} variant="outline" className="flex items-center gap-1">
                      {ALL_LEAD_FIELDS.find(f => f.key === field)?.label || field}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeBadgeField(field)}
                      />
                    </Badge>
                  ))}
                </DroppableZone>
              </div>
            </div>

            {/* Available Fields - 60% */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Campos Disponíveis</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar Padrão
                </Button>
              </div>

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

              {/* Field list */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {categories.map(category => {
                    const fields = groupedFields[category];
                    if (!fields || fields.length === 0) return null;

                    return (
                      <div key={category} className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">
                          {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {fields.map(field => (
                            <DraggableField key={field.key} field={field.key} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DndContext>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
