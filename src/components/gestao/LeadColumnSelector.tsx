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
import { ALL_LEAD_FIELDS, CATEGORY_LABELS } from "@/config/leadFields";
import { useLeadColumnConfig } from "@/hooks/useLeadColumnConfig";

export function LeadColumnSelector() {
  const { visibleColumns, toggleColumn, resetToDefault, canToggle } = useLeadColumnConfig();

  // Group fields by category
  const fieldsByCategory = ALL_LEAD_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof ALL_LEAD_FIELDS>);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-2" />
          Colunas ({visibleColumns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[500px] overflow-y-auto">
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
        
        {Object.entries(fieldsByCategory).map(([category, fields]) => (
          <div key={category}>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
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
                  className="text-sm"
                >
                  {field.label}
                  {field.key === 'name' && (
                    <span className="ml-2 text-xs text-muted-foreground">(obrigatório)</span>
                  )}
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
          </div>
        ))}
        
        <div className="p-2 text-xs text-muted-foreground text-center">
          Mínimo: 3 colunas | Máximo: 15 colunas
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
