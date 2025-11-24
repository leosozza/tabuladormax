import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FilterX } from "lucide-react";

interface ScouterFiltersProps {
  statusFilter: 'todos' | 'ativo' | 'inativo' | 'standby' | 'blacklist';
  onStatusFilterChange: (status: 'todos' | 'ativo' | 'inativo' | 'standby' | 'blacklist') => void;
  sortBy: 'recent' | 'name' | 'total_leads' | 'leads_30d' | 'no_activity';
  onSortByChange: (sort: 'recent' | 'name' | 'total_leads' | 'leads_30d' | 'no_activity') => void;
  onClearFilters: () => void;
  stats: {
    total: number;
    ativo: number;
    inativo: number;
    standby: number;
    blacklist: number;
  };
}

const STATUS_CONFIG = {
  todos: { label: 'Todos', variant: 'outline' as const },
  ativo: { label: 'Ativo', variant: 'default' as const },
  inativo: { label: 'Inativo', variant: 'secondary' as const },
  standby: { label: 'Standby', variant: 'secondary' as const },
  blacklist: { label: 'Blacklist', variant: 'outline' as const },
};

const SORT_OPTIONS = [
  { value: 'recent', label: '⏱️ Mais Recentes' },
  { value: 'name', label: '🔤 Nome (A-Z)' },
  { value: 'total_leads', label: '📊 Mais Leads (Total)' },
  { value: 'leads_30d', label: '📈 Mais Leads (30d)' },
  { value: 'no_activity', label: '❌ Sem Atividade' },
];

export function ScouterFilters({
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onClearFilters,
  stats,
}: ScouterFiltersProps) {
  const hasActiveFilters = statusFilter !== 'todos' || sortBy !== 'recent';

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats[status as keyof typeof stats];
              const isActive = statusFilter === status;
              
              return (
                <Badge
                  key={status}
                  variant={isActive ? config.variant : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => onStatusFilterChange(status as any)}
                >
                  {config.label} ({count})
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Sort and Clear */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Ordenar por</label>
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="mt-6"
            >
              <FilterX className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
