import { FeatureModule, FeatureStatus, moduleConfig, statusConfig } from '@/types/roadmap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid, List, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RoadmapFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedModule: FeatureModule | 'all';
  onModuleChange: (module: FeatureModule | 'all') => void;
  selectedStatus: FeatureStatus | 'all';
  onStatusChange: (status: FeatureStatus | 'all') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function RoadmapFilters({
  search,
  onSearchChange,
  selectedModule,
  onModuleChange,
  selectedStatus,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: RoadmapFiltersProps) {
  const modules: (FeatureModule | 'all')[] = ['all', ...Object.keys(moduleConfig) as FeatureModule[]];
  const statuses: (FeatureStatus | 'all')[] = ['all', 'active', 'in-progress', 'planned'];

  const hasFilters = search || selectedModule !== 'all' || selectedStatus !== 'all';

  const clearFilters = () => {
    onSearchChange('');
    onModuleChange('all');
    onStatusChange('all');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionalidade..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Módulo:</span>
        {modules.map((module) => (
          <Button
            key={module}
            variant={selectedModule === module ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModuleChange(module)}
            className="h-7 text-xs"
          >
            {module === 'all' ? 'Todos' : moduleConfig[module].label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Status:</span>
        {statuses.map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange(status)}
            className="h-7 text-xs"
          >
            {status === 'all' ? 'Todos' : statusConfig[status].label}
          </Button>
        ))}
        
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs text-muted-foreground ml-2"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
