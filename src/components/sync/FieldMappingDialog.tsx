import { useState } from "react";
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
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, DragOverEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

// Gestão Scouter fields - the destination fields
const GESTAO_SCOUTER_FIELDS = [
  { id: "name", label: "Nome" },
  { id: "responsible", label: "Responsável" },
  { id: "age", label: "Idade" },
  { id: "address", label: "Endereço" },
  { id: "scouter", label: "Scouter" },
  { id: "celular", label: "Celular" },
  { id: "telefone_trabalho", label: "Telefone Trabalho" },
  { id: "telefone_casa", label: "Telefone Casa" },
  { id: "etapa", label: "Etapa" },
  { id: "fonte", label: "Fonte" },
  { id: "nome_modelo", label: "Nome Modelo" },
  { id: "local_abordagem", label: "Local Abordagem" },
  { id: "ficha_confirmada", label: "Ficha Confirmada" },
  { id: "presenca_confirmada", label: "Presença Confirmada" },
  { id: "compareceu", label: "Compareceu" },
  { id: "valor_ficha", label: "Valor Ficha" },
  { id: "horario_agendamento", label: "Horário Agendamento" },
  { id: "data_agendamento", label: "Data Agendamento" },
  { id: "gerenciamento_funil", label: "Gerenciamento Funil" },
  { id: "status_fluxo", label: "Status Fluxo" },
  { id: "etapa_funil", label: "Etapa Funil" },
  { id: "etapa_fluxo", label: "Etapa Fluxo" },
  { id: "funil_fichas", label: "Funil Fichas" },
  { id: "status_tabulacao", label: "Status Tabulação" },
];

// Tabuladormax fields - the source fields that can be dragged
const TABULADORMAX_FIELDS = [
  { id: "tab_name", label: "Nome (Tabuladormax)" },
  { id: "tab_responsible", label: "Responsável (Tabuladormax)" },
  { id: "tab_age", label: "Idade (Tabuladormax)" },
  { id: "tab_address", label: "Endereço (Tabuladormax)" },
  { id: "tab_scouter", label: "Scouter (Tabuladormax)" },
  { id: "tab_celular", label: "Celular (Tabuladormax)" },
  { id: "tab_telefone_trabalho", label: "Telefone Trabalho (Tabuladormax)" },
  { id: "tab_telefone_casa", label: "Telefone Casa (Tabuladormax)" },
  { id: "tab_etapa", label: "Etapa (Tabuladormax)" },
  { id: "tab_fonte", label: "Fonte (Tabuladormax)" },
  { id: "tab_nome_modelo", label: "Nome Modelo (Tabuladormax)" },
  { id: "tab_local_abordagem", label: "Local Abordagem (Tabuladormax)" },
  { id: "tab_ficha_confirmada", label: "Ficha Confirmada (Tabuladormax)" },
  { id: "tab_presenca_confirmada", label: "Presença Confirmada (Tabuladormax)" },
  { id: "tab_compareceu", label: "Compareceu (Tabuladormax)" },
  { id: "tab_valor_ficha", label: "Valor Ficha (Tabuladormax)" },
  { id: "tab_horario_agendamento", label: "Horário Agendamento (Tabuladormax)" },
  { id: "tab_data_agendamento", label: "Data Agendamento (Tabuladormax)" },
  { id: "tab_gerenciamento_funil", label: "Gerenciamento Funil (Tabuladormax)" },
  { id: "tab_status_fluxo", label: "Status Fluxo (Tabuladormax)" },
  { id: "tab_etapa_funil", label: "Etapa Funil (Tabuladormax)" },
  { id: "tab_etapa_fluxo", label: "Etapa Fluxo (Tabuladormax)" },
  { id: "tab_funil_fichas", label: "Funil Fichas (Tabuladormax)" },
  { id: "tab_status_tabulacao", label: "Status Tabulação (Tabuladormax)" },
];

interface FieldMapping {
  gestaoScouterField: string;
  tabuladormaxField: string | null;
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mappings: FieldMapping[]) => void;
  initialMappings?: FieldMapping[];
}

interface DraggableFieldProps {
  field: { id: string; label: string };
  isAssigned: boolean;
}

function DraggableField({ field, isAssigned }: DraggableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: field.id,
    disabled: isAssigned,
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
      className={`flex items-center gap-2 p-2 border rounded-md ${
        isAssigned ? "bg-gray-100 opacity-50" : "bg-white hover:bg-gray-50 cursor-move"
      }`}
      {...attributes}
      {...listeners}
    >
      {!isAssigned && <GripVertical className="w-4 h-4 text-gray-400" />}
      <span className="text-sm flex-1">{field.label}</span>
      {isAssigned && <Badge variant="secondary" className="text-xs">Atribuído</Badge>}
    </div>
  );
}

interface MappingRowProps {
  gestaoField: { id: string; label: string };
  mappedTabField: string | null;
  onRemove: () => void;
  isOver: boolean;
}

function MappingRow({ gestaoField, mappedTabField, onRemove, isOver }: MappingRowProps) {
  const { setNodeRef } = useDroppable({
    id: `drop-${gestaoField.id}`,
    data: { gestaoFieldId: gestaoField.id },
  });

  const tabField = TABULADORMAX_FIELDS.find((f) => f.id === mappedTabField);

  return (
    <div 
      ref={setNodeRef}
      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
        isOver ? "bg-blue-100 border-blue-400" : "bg-gray-50"
      }`}
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">{gestaoField.label}</div>
      </div>
      <div className="text-gray-400">→</div>
      <div className="flex-1">
        {tabField ? (
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              {tabField.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">Arraste um campo aqui</div>
        )}
      </div>
    </div>
  );
}

export function FieldMappingDialog({
  open,
  onOpenChange,
  onSave,
  initialMappings = [],
}: FieldMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(() => {
    // Initialize with all Gestão Scouter fields
    return GESTAO_SCOUTER_FIELDS.map((field) => {
      const existing = initialMappings.find((m) => m.gestaoScouterField === field.id);
      return {
        gestaoScouterField: field.id,
        tabuladormaxField: existing?.tabuladormaxField || null,
      };
    });
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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

    const sourceFieldId = active.id as string;
    const overIdStr = over.id as string;

    // Check if dropped on a droppable zone (starts with "drop-")
    if (!overIdStr.startsWith("drop-")) return;

    const targetFieldId = overIdStr.replace("drop-", "");

    // Check if the target is a Gestão Scouter field
    const targetField = GESTAO_SCOUTER_FIELDS.find((f) => f.id === targetFieldId);
    if (!targetField) return;

    // Update the mapping
    setMappings((prev) =>
      prev.map((m) =>
        m.gestaoScouterField === targetFieldId
          ? { ...m, tabuladormaxField: sourceFieldId }
          : m
      )
    );
  };

  const handleRemoveMapping = (gestaoFieldId: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.gestaoScouterField === gestaoFieldId
          ? { ...m, tabuladormaxField: null }
          : m
      )
    );
  };

  const handleSave = () => {
    // Only save mappings that have been assigned
    const validMappings = mappings.filter((m) => m.tabuladormaxField !== null);
    onSave(validMappings);
    onOpenChange(false);
  };

  // Get list of assigned Tabuladormax fields
  const assignedFields = new Set(
    mappings.filter((m) => m.tabuladormaxField).map((m) => m.tabuladormaxField)
  );

  const activeField = TABULADORMAX_FIELDS.find((f) => f.id === activeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Mapeamento de Campos</DialogTitle>
          <DialogDescription>
            Arraste os campos do Tabuladormax (direita) para os campos correspondentes do Gestão Scouter (esquerda)
          </DialogDescription>
        </DialogHeader>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Left Column - Gestão Scouter Fields with Mappings */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Campos Gestão Scouter
              </Label>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                <div className="space-y-2">
                  {GESTAO_SCOUTER_FIELDS.map((field) => {
                    const mapping = mappings.find(
                      (m) => m.gestaoScouterField === field.id
                    );
                    const isOver = overId === `drop-${field.id}`;
                    return (
                      <MappingRow
                        key={field.id}
                        gestaoField={field}
                        mappedTabField={mapping?.tabuladormaxField || null}
                        onRemove={() => handleRemoveMapping(field.id)}
                        isOver={isOver}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right Column - Tabuladormax Fields */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Campos Tabuladormax
              </Label>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                <SortableContext
                  items={TABULADORMAX_FIELDS.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {TABULADORMAX_FIELDS.map((field) => (
                      <DraggableField
                        key={field.id}
                        field={field}
                        isAssigned={assignedFields.has(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </ScrollArea>
            </div>
          </div>

          <DragOverlay>
            {activeField ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-white shadow-lg">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{activeField.label}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {mappings.filter((m) => m.tabuladormaxField).length} campo(s) mapeado(s)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Mapeamento</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
