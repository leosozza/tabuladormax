import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, DragOverEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Wand2, Search, Info, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeadFields } from "@/lib/bitrix";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BitrixFieldMapping {
  id?: string;
  bitrixField: string;
  tabuladormaxField: string;
  priority: number;
  transformFunction?: string | null;
}

interface BitrixFieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

interface DraggableBitrixFieldProps {
  field: { id: string; label: string };
  onHide?: (fieldId: string) => void;
}

function DraggableBitrixField({ field, onHide }: DraggableBitrixFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border rounded-md bg-card hover:bg-accent transition-colors group"
    >
      <div className="flex items-center gap-2 flex-1 cursor-move" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm flex-1">{field.label}</span>
      </div>
      {onHide && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onHide(field.id);
          }}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface MappingRowProps {
  tabuladormaxField: string;
  mappedBitrixFields: Array<{ bitrixField: string; priority: number; id?: string }>;
  onDrop: (bitrixField: string) => void;
  onRemove: (bitrixField: string) => void;
  isOver: boolean;
}

function MappingRow({ tabuladormaxField, mappedBitrixFields, onRemove, isOver }: MappingRowProps) {
  const { setNodeRef } = useDroppable({
    id: `drop-${tabuladormaxField}`,
    data: { tabuladormaxField },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col gap-2 p-3 border rounded-lg transition-colors ${
        isOver ? "bg-primary/10 border-primary" : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{tabuladormaxField}</div>
      </div>
      
      {mappedBitrixFields.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-2">
          Arraste campos do Bitrix aqui
        </div>
      ) : (
        <div className="space-y-1">
          {mappedBitrixFields
            .sort((a, b) => a.priority - b.priority)
            .map((mapping, index) => (
              <div key={mapping.bitrixField} className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                <Badge variant="outline" className="text-xs">
                  {index + 1}º - {mapping.bitrixField}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(mapping.bitrixField)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function BitrixFieldMappingDialog({
  open,
  onOpenChange,
  onSave,
}: BitrixFieldMappingDialogProps) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [searchTabFields, setSearchTabFields] = useState("");
  const [searchBitrixFields, setSearchBitrixFields] = useState("");
  const [hiddenBitrixFields, setHiddenBitrixFields] = useState<Set<string>>(new Set());

  // Buscar campos do Bitrix
  const { data: bitrixFields, isLoading: loadingBitrix } = useQuery({
    queryKey: ['bitrix-fields'],
    queryFn: async () => {
      const fields = await getLeadFields();
      return fields.map(f => ({
        id: f.FIELD_NAME || f.ID,
        label: `${f.TITLE} (${f.FIELD_NAME || f.ID})`,
        name: f.FIELD_NAME || f.ID,
        type: f.TYPE
      }));
    },
    enabled: open,
  });

  // Buscar campos do TabuladorMax (schema da tabela leads)
  const { data: tabuladormaxFields } = useQuery({
    queryKey: ['tabuladormax-lead-fields'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leads_schema');
      if (error) throw error;
      
      // Filtrar campos que não devem ser mapeados
      const excludedFields = ['raw', 'sync_source', 'sync_status', 'sync_error', 'last_sync_at', 'created_at', 'updated_at'];
      
      return data
        .filter((col: any) => !excludedFields.includes(col.column_name))
        .map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES'
        }));
    },
    enabled: open,
  });

  // Buscar mapeamentos existentes
  const { data: existingMappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['bitrix-field-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_field_mappings')
        .select('*')
        .order('tabuladormax_field')
        .order('priority');
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Estado local dos mapeamentos
  const [mappings, setMappings] = useState<Record<string, Array<{ bitrixField: string; priority: number; id?: string }>>>({});

  useEffect(() => {
    if (existingMappings) {
      const grouped = existingMappings.reduce((acc, m) => {
        if (!acc[m.tabuladormax_field]) {
          acc[m.tabuladormax_field] = [];
        }
        acc[m.tabuladormax_field].push({
          bitrixField: m.bitrix_field,
          priority: m.priority,
          id: m.id
        });
        return acc;
      }, {} as Record<string, Array<{ bitrixField: string; priority: number; id?: string }>>);
      setMappings(grouped);
    }
  }, [existingMappings]);

  // Mutation para salvar mapeamentos
  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      // Deletar todos os mapeamentos existentes
      await supabase.from('bitrix_field_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Inserir novos mapeamentos
      const mappingsArray: any[] = [];
      Object.entries(mappings).forEach(([tabuladorField, bitrixMappings]) => {
        bitrixMappings.forEach((mapping) => {
          mappingsArray.push({
            bitrix_field: mapping.bitrixField,
            tabuladormax_field: tabuladorField,
            priority: mapping.priority,
            transform_function: null
          });
        });
      });

      if (mappingsArray.length > 0) {
        const { error } = await supabase
          .from('bitrix_field_mappings')
          .insert(mappingsArray);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bitrix-field-mappings'] });
      toast.success('Mapeamentos salvos com sucesso!');
      onSave?.();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Erro ao salvar mapeamentos:', error);
      toast.error('Erro ao salvar mapeamentos');
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const bitrixFieldId = active.id as string;
    const overIdStr = over.id as string;

    if (!overIdStr.startsWith("drop-")) return;

    const tabuladorField = overIdStr.replace("drop-", "");

    // Adicionar mapeamento
    setMappings((prev) => {
      const existing = prev[tabuladorField] || [];
      const maxPriority = existing.length > 0 ? Math.max(...existing.map(m => m.priority)) : -1;
      
      // Verificar se já existe
      if (existing.some(m => m.bitrixField === bitrixFieldId)) {
        return prev;
      }

      return {
        ...prev,
        [tabuladorField]: [
          ...existing,
          { bitrixField: bitrixFieldId, priority: maxPriority + 1 }
        ]
      };
    });
  };

  const handleRemoveMapping = (tabuladorField: string, bitrixField: string) => {
    setMappings((prev) => {
      const existing = prev[tabuladorField] || [];
      const filtered = existing.filter(m => m.bitrixField !== bitrixField);
      
      // Reordenar prioridades
      const reordered = filtered.map((m, index) => ({ ...m, priority: index }));
      
      if (reordered.length === 0) {
        const { [tabuladorField]: removed, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [tabuladorField]: reordered
      };
    });
  };

  const handleAutoMap = () => {
    if (!bitrixFields || !tabuladormaxFields) return;

    const autoMappings: Record<string, Array<{ bitrixField: string; priority: number }>> = {};
    let mappedCount = 0;

    tabuladormaxFields.forEach((tabField: any) => {
      // Tentar match exato (prioridade 1)
      const exactMatch = bitrixFields.find(bf => 
        bf.name.toLowerCase() === tabField.name.toLowerCase()
      );

      if (exactMatch) {
        autoMappings[tabField.name] = [{ bitrixField: exactMatch.name, priority: 0 }];
        mappedCount++;
        return;
      }

      // Tentar match sem underscores/espaços (prioridade 2)
      const normalizedTabName = tabField.name.toLowerCase().replace(/[_\s]/g, '');
      const normalizedMatch = bitrixFields.find(bf => {
        const normalizedBitrixName = bf.name.toLowerCase().replace(/[_\s]/g, '');
        return normalizedBitrixName === normalizedTabName;
      });

      if (normalizedMatch) {
        autoMappings[tabField.name] = [{ bitrixField: normalizedMatch.name, priority: 0 }];
        mappedCount++;
      }
    });

    setMappings(autoMappings);
    toast.success(`${mappedCount} campo(s) mapeado(s) automaticamente!`);
  };

  const handleClearMappings = () => {
    setMappings({});
    toast.info('Todos os mapeamentos foram removidos');
  };

  const handleHideBitrixField = (fieldId: string) => {
    setHiddenBitrixFields(prev => {
      const newSet = new Set(prev);
      newSet.add(fieldId);
      return newSet;
    });
    toast.info('Campo ocultado da lista');
  };

  const handleShowAllBitrixFields = () => {
    setHiddenBitrixFields(new Set());
    toast.success('Todos os campos foram restaurados');
  };

  const activeField = bitrixFields?.find((f) => f.id === activeId);

  const filteredBitrixFields = bitrixFields?.filter((field) =>
    !hiddenBitrixFields.has(field.id) &&
    field.label.toLowerCase().includes(searchBitrixFields.toLowerCase())
  ) || [];

  const filteredTabFields = tabuladormaxFields?.filter((field: any) =>
    field.name.toLowerCase().includes(searchTabFields.toLowerCase())
  ) || [];

  const totalMapped = Object.keys(mappings).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Mapeamento de Campos - Bitrix → TabuladorMax</DialogTitle>
              <DialogDescription>
                Arraste os campos do Bitrix (direita) para os campos do TabuladorMax (esquerda)
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleClearMappings} 
                variant="outline" 
                size="sm" 
                disabled={loadingBitrix || loadingMappings || Object.keys(mappings).length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar
              </Button>
              <Button onClick={handleAutoMap} variant="outline" size="sm" disabled={loadingBitrix || loadingMappings}>
                <Wand2 className="mr-2 h-4 w-4" />
                Auto-Mapear
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você pode mapear <strong>vários campos do Bitrix</strong> para um mesmo campo do TabuladorMax. 
            O sistema usará o primeiro valor não-vazio, seguindo a ordem de prioridade (1º, 2º, 3º...).
          </AlertDescription>
        </Alert>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Left Column - TabuladorMax Fields (Destino) */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Campos TabuladorMax - Destino ({totalMapped} mapeados)
              </Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campos destino..."
                  value={searchTabFields}
                  onChange={(e) => setSearchTabFields(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                <div className="space-y-3">
                  {filteredTabFields.map((field: any) => {
                    const isOver = overId === `drop-${field.name}`;
                    return (
                      <MappingRow
                        key={field.name}
                        tabuladormaxField={field.name}
                        mappedBitrixFields={mappings[field.name] || []}
                        onDrop={(bitrixField) => {}}
                        onRemove={(bitrixField) => handleRemoveMapping(field.name, bitrixField)}
                        isOver={isOver}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right Column - Bitrix Fields (Origem) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">
                  Campos Bitrix - Origem
                </Label>
                {hiddenBitrixFields.size > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleShowAllBitrixFields}
                    className="h-8"
                  >
                    Mostrar {hiddenBitrixFields.size} oculto(s)
                  </Button>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campos origem..."
                  value={searchBitrixFields}
                  onChange={(e) => setSearchBitrixFields(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                {loadingBitrix ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Carregando campos do Bitrix...
                  </div>
                ) : (
                  <SortableContext
                    items={filteredBitrixFields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {filteredBitrixFields.map((field) => (
                        <DraggableBitrixField
                          key={field.id}
                          field={field}
                          onHide={handleHideBitrixField}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </ScrollArea>
            </div>
          </div>

          <DragOverlay>
            {activeField ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-card shadow-lg">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{activeField.label}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalMapped} campo(s) com mapeamento
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMappingsMutation.mutate()} disabled={saveMappingsMutation.isPending}>
              {saveMappingsMutation.isPending ? 'Salvando...' : 'Salvar Mapeamentos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
