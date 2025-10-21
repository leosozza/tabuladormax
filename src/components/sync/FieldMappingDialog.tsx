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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, DragOverEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Wand2, Search, ChevronDown, AlertTriangle } from "lucide-react";

// Todas as 45 colunas da tabela leads organizadas por categoria
const FIELD_CATEGORIES = {
  "Dados Pessoais": [
    { id: "id", label: "ID", required: true },
    { id: "name", label: "Nome", required: true },
    { id: "age", label: "Idade" },
    { id: "address", label: "Endereço" },
    { id: "photo_url", label: "URL da Foto" },
    { id: "celular", label: "Celular" },
    { id: "telefone_trabalho", label: "Telefone Trabalho" },
    { id: "telefone_casa", label: "Telefone Casa" },
  ],
  "Responsabilidade e Projeto": [
    { id: "responsible", label: "Responsável" },
    { id: "responsible_user_id", label: "ID Usuário Responsável" },
    { id: "scouter", label: "Scouter" },
    { id: "commercial_project_id", label: "ID Projeto Comercial" },
    { id: "bitrix_telemarketing_id", label: "ID Telemarketing Bitrix" },
    { id: "op_telemarketing", label: "OP Telemarketing" },
  ],
  "Etapas e Status": [
    { id: "etapa", label: "Etapa" },
    { id: "etapa_funil", label: "Etapa Funil" },
    { id: "etapa_fluxo", label: "Etapa Fluxo" },
    { id: "status_fluxo", label: "Status Fluxo" },
    { id: "status_tabulacao", label: "Status Tabulação" },
    { id: "gerenciamento_funil", label: "Gerenciamento Funil" },
    { id: "funil_fichas", label: "Funil Fichas" },
  ],
  "Ficha e Confirmação": [
    { id: "ficha_confirmada", label: "Ficha Confirmada" },
    { id: "presenca_confirmada", label: "Presença Confirmada" },
    { id: "compareceu", label: "Compareceu" },
    { id: "cadastro_existe_foto", label: "Cadastro Existe Foto" },
    { id: "valor_ficha", label: "Valor Ficha" },
    { id: "data_criacao_ficha", label: "Data Criação Ficha" },
    { id: "data_confirmacao_ficha", label: "Data Confirmação Ficha" },
  ],
  "Agendamento": [
    { id: "data_agendamento", label: "Data Agendamento" },
    { id: "horario_agendamento", label: "Horário Agendamento" },
    { id: "data_criacao_agendamento", label: "Data Criação Agendamento" },
    { id: "data_retorno_ligacao", label: "Data Retorno Ligação" },
  ],
  "Metadados": [
    { id: "fonte", label: "Fonte" },
    { id: "nome_modelo", label: "Nome Modelo" },
    { id: "local_abordagem", label: "Local Abordagem" },
    { id: "criado", label: "Criado" },
    { id: "date_modify", label: "Data Modificação" },
    { id: "updated_at", label: "Atualizado Em", required: true },
    { id: "maxsystem_id_ficha", label: "ID Ficha MaxSystem" },
    { id: "gestao_scouter", label: "Gestão Scouter" },
    { id: "raw", label: "Dados Brutos (JSON)" },
  ],
  "Sincronização": [
    { id: "sync_status", label: "Status Sincronização" },
    { id: "sync_error", label: "Erro de Sincronização" },
    { id: "sync_source", label: "Fonte Sincronização" },
    { id: "last_sync_at", label: "Última Sincronização" },
  ],
};

// Flatten all fields
const GESTAO_SCOUTER_FIELDS = Object.values(FIELD_CATEGORIES).flat();

// Create Tabuladormax fields with tab_ prefix
const TABULADORMAX_FIELDS = GESTAO_SCOUTER_FIELDS.map((field) => ({
  id: `tab_${field.id}`,
  label: `${field.label} (Tabuladormax)`,
}));

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
  const fullField = GESTAO_SCOUTER_FIELDS.find((f) => f.id === gestaoField.id);
  const isRequired = fullField && 'required' in fullField && fullField.required;

  return (
    <div 
      ref={setNodeRef}
      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
        isOver ? "bg-blue-100 border-blue-400" : "bg-gray-50"
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-700">{gestaoField.label}</div>
          {isRequired && (
            <Badge variant="destructive" className="text-xs h-5">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Obrigatório
            </Badge>
          )}
        </div>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.keys(FIELD_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  // Auto-mapping on first open
  useEffect(() => {
    if (open && initialMappings.length === 0) {
      applyAutoMapping();
    }
  }, [open]);

  const applyAutoMapping = () => {
    const autoMapped = GESTAO_SCOUTER_FIELDS.map((gestaoField) => {
      const directMatch = TABULADORMAX_FIELDS.find(
        (tabField) => tabField.id === `tab_${gestaoField.id}`
      );
      
      if (directMatch) {
        return {
          gestaoScouterField: gestaoField.id,
          tabuladormaxField: directMatch.id,
        };
      }
      
      return {
        gestaoScouterField: gestaoField.id,
        tabuladormaxField: null,
      };
    });
    
    setMappings(autoMapped);
  };

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
    // Validate required fields
    const requiredFields = GESTAO_SCOUTER_FIELDS.filter((f) => 'required' in f && f.required);
    const missingRequired = requiredFields.filter((field) => {
      const mapping = mappings.find((m) => m.gestaoScouterField === field.id);
      return !mapping?.tabuladormaxField;
    });

    if (missingRequired.length > 0) {
      alert(`Campos obrigatórios não mapeados: ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }

    const validMappings = mappings.filter((m) => m.tabuladormaxField !== null);
    onSave(validMappings);
    onOpenChange(false);
  };

  const assignedFields = new Set(
    mappings.filter((m) => m.tabuladormaxField).map((m) => m.tabuladormaxField)
  );

  const activeField = TABULADORMAX_FIELDS.find((f) => f.id === activeId);

  // Filter fields based on search
  const filteredCategories = Object.entries(FIELD_CATEGORIES).reduce((acc, [category, fields]) => {
    const filtered = fields.filter((field) =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof FIELD_CATEGORIES);

  const filteredTabFields = TABULADORMAX_FIELDS.filter((field) =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMapped = mappings.filter((m) => m.tabuladormaxField).length;
  const categoryStats = Object.entries(FIELD_CATEGORIES).map(([category, fields]) => {
    const mapped = fields.filter((field) => {
      const mapping = mappings.find((m) => m.gestaoScouterField === field.id);
      return mapping?.tabuladormaxField;
    }).length;
    return { category, mapped, total: fields.length };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Mapeamento de Campos</DialogTitle>
              <DialogDescription>
                Arraste os campos do Tabuladormax (direita) para os campos correspondentes do Gestão Scouter (esquerda)
              </DialogDescription>
            </div>
            <Button onClick={applyAutoMapping} variant="outline" size="sm">
              <Wand2 className="mr-2 h-4 w-4" />
              Auto-Mapear
            </Button>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Left Column - Gestão Scouter Fields with Categories */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Campos Gestão Scouter ({totalMapped}/45)
              </Label>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                <div className="space-y-3">
                  {Object.entries(filteredCategories).map(([category, fields]) => {
                    const stats = categoryStats.find((s) => s.category === category);
                    return (
                      <Collapsible
                        key={category}
                        open={openCategories[category]}
                        onOpenChange={(open) =>
                          setOpenCategories({ ...openCategories, [category]: open })
                        }
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                openCategories[category] ? "" : "-rotate-90"
                              }`}
                            />
                            <span className="font-medium text-sm">{category}</span>
                            <Badge variant="secondary" className="text-xs">
                              {stats?.mapped}/{stats?.total}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {fields.map((field) => {
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
                        </CollapsibleContent>
                      </Collapsible>
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
                  items={filteredTabFields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredTabFields.map((field) => (
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
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {totalMapped}/45 campo(s) mapeado(s)
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
              {categoryStats.map(({ category, mapped, total }) => (
                <span key={category}>
                  {category}: {mapped}/{total}
                </span>
              ))}
            </div>
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
