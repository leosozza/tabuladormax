import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";
import { CATEGORY_LABELS } from "@/config/leadFields";
import { useLeadColumnConfig } from "@/hooks/useLeadColumnConfig";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";

export function LeadColumnSelector() {
  const { visibleColumns, toggleColumn, resetToDefault, canToggle } = useLeadColumnConfig();
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-2" />
          Colunas ({visibleColumns.length})
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

        {/* Colunas Ativas */}
        <DropdownMenuLabel className="text-xs font-semibold text-primary">
          ✓ Colunas Ativas (visíveis na tabela)
        </DropdownMenuLabel>

        {Object.entries(activeByCategory).map(([category, fields]) => (
          <div key={`active-${category}`}>
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
                  {field.key === 'name' && (
                    <span className="ml-2 text-xs text-muted-foreground">(obrigatório)</span>
                  )}
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        ))}

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
          Mínimo: 3 colunas | Máximo: 15 colunas
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
