import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, GripVertical, X } from "lucide-react";
import { CATEGORY_LABELS, type ColumnConfig } from "@/config/leadFields";
import { useLeadColumnConfig } from "@/hooks/useLeadColumnConfig";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableActiveItem({ field, toggleColumn, canToggle }: { field: ColumnConfig; toggleColumn: (key: string) => void; canToggle: (key: string) => boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 pl-6 pr-2 py-1.5 group"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 cursor-move text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      
      <div className="flex-1 text-sm pl-2">
        {field.label}
        {field.key === 'name' && (
          <span className="ml-2 text-xs text-muted-foreground">(obrigatório)</span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleColumn(field.key);
        }}
        disabled={!canToggle(field.key)}
        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity"
        title={canToggle(field.key) ? "Remover coluna" : "Esta coluna é obrigatória"}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export function LeadColumnSelector() {
  const { visibleColumns, toggleColumn, resetToDefault, canToggle, reorderColumns } = useLeadColumnConfig();
  const { data: allFields, isLoading } = useGestaoFieldMappings();

  if (!allFields || isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Settings2 className="w-4 h-4 mr-2" />
        Carregando...
      </Button>
    );
  }

  // Colunas Ativas na ordem em que aparecem na tabela
  const activeFields = visibleColumns
    .map(key => allFields.find(f => f.key === key))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);

  // Colunas Inativas = campos que existem no mapeamento, mas não estão em visibleColumns
  const inactiveFields = allFields.filter(f => !visibleColumns.includes(f.key));

  // Debug: Campos no localStorage mas não no banco
  const missingFields = visibleColumns.filter(key => !allFields.find(f => f.key === key));

  // Debug logging
  console.log('🔍 Debug LeadColumnSelector:');
  console.log('  visibleColumns (localStorage):', visibleColumns);
  console.log('  allFields (banco):', allFields?.map(f => f.key));
  console.log('  activeFields (filtrado):', activeFields.map(f => f.key));
  console.log('  missingFields:', missingFields);

  // Agrupar por categoria
  const groupByCategory = (fields: typeof allFields) => {
    return fields.reduce((acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    }, {} as Record<string, typeof allFields>);
  };

  const activeByCategory = groupByCategory(activeFields);
  const inactiveByCategory = groupByCategory(inactiveFields);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleColumns.indexOf(active.id as string);
    const newIndex = visibleColumns.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderColumns(oldIndex, newIndex);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-2" />
          Colunas ({activeFields.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Configurar Colunas</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
            className="h-auto py-1 px-2 text-xs"
          >
            Restaurar
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Badge de Aviso para campos inválidos */}
        {missingFields.length > 0 && (
          <div className="mx-2 mb-2 text-xs text-amber-600 p-2 bg-amber-50 rounded-md border border-amber-200">
            ⚠️ {missingFields.length} campo(s) não encontrado(s) no banco de dados. 
            <div className="text-[10px] mt-1 text-amber-700">
              {missingFields.join(', ')}
            </div>
          </div>
        )}

        {/* Colunas Ativas */}
        <DropdownMenuLabel className="text-xs font-semibold text-primary">
          ✓ Colunas Ativas (visíveis na tabela)
        </DropdownMenuLabel>

        <div className="text-[11px] text-muted-foreground mb-1 pl-6">
          Arraste para mudar a ordem na tabela
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleColumns} strategy={verticalListSortingStrategy}>
            {Object.entries(activeByCategory).map(([category, fields]) => (
              <div key={`active-${category}`}>
                <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground mt-1 pl-6">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </DropdownMenuLabel>
                {fields.map((field) => (
                  <SortableActiveItem 
                    key={field.key} 
                    field={field} 
                    toggleColumn={toggleColumn}
                    canToggle={canToggle}
                  />
                ))}
              </div>
            ))}
          </SortableContext>
        </DndContext>

        <DropdownMenuSeparator />

        {/* Colunas Inativas */}
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          ○ Colunas Inativas (não aparecem na tabela)
        </DropdownMenuLabel>

        {Object.entries(inactiveByCategory).map(([category, fields]) => (
          <div key={`inactive-${category}`}>
            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground mt-1 pl-6">
              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
            </DropdownMenuLabel>
            {fields.map((field) => {
              const isVisible = visibleColumns.includes(field.key);
              const isDisabled = !canToggle(field.key);

              return (
                <DropdownMenuCheckboxItem
                  key={field.key}
                  checked={isVisible}
                  onCheckedChange={() => toggleColumn(field.key)}
                  disabled={isDisabled}
                  className="text-sm pl-8"
                >
                  {field.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        ))}

        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-muted-foreground text-center">
          Mínimo: 1 coluna | Máximo: 50 colunas
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
