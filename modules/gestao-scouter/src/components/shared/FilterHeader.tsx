import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon, 
  Search,
  RotateCcw,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface ActiveFilter {
  key: string;
  label: string;
  value: any;
  displayValue: string;
}

interface FilterHeaderProps {
  filters: FilterOption[];
  onFiltersChange: (filters: Record<string, any>) => void;
  title?: string;
  defaultExpanded?: boolean;
  showSearch?: boolean;
  onSearch?: (term: string) => void;
}

export function FilterHeader({
  filters,
  onFiltersChange,
  title = "Filtros",
  defaultExpanded = false,
  showSearch = true,
  onSearch
}: FilterHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const applyFilter = (key: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (value === undefined || value === '' || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    onFiltersChange({});
    onSearch?.('');
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onSearch?.(term);
  };

  const getActiveFiltersList = (): ActiveFilter[] => {
    return Object.entries(activeFilters)
      .filter(([_, value]) => value !== undefined && value !== '' && value !== null)
      .map(([key, value]) => {
        const filterConfig = filters.find(f => f.key === key);
        let displayValue = String(value);
        
        if (filterConfig?.type === 'select' && filterConfig.options) {
          const option = filterConfig.options.find(opt => opt.value === value);
          displayValue = option?.label || displayValue;
        } else if (filterConfig?.type === 'date') {
          displayValue = format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
        } else if (filterConfig?.type === 'dateRange' && value.from && value.to) {
          displayValue = `${format(new Date(value.from), 'dd/MM', { locale: ptBR })} - ${format(new Date(value.to), 'dd/MM', { locale: ptBR })}`;
        }
        
        return {
          key,
          label: filterConfig?.label || key,
          value,
          displayValue
        };
      });
  };

  const activeFiltersList = getActiveFiltersList();

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-medium">{title}</h3>
            {activeFiltersList.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersList.length} aplicado{activeFiltersList.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersList.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Active Filters Display */}
        {activeFiltersList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFiltersList.map((filter) => (
              <Badge
                key={filter.key}
                variant="default"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span className="text-xs">
                  {filter.label}: {filter.displayValue}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(filter.key)}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Filter Controls */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <Label htmlFor={filter.key} className="text-sm font-medium">
                  {filter.label}
                </Label>
                
                {filter.type === 'text' && (
                  <Input
                    id={filter.key}
                    placeholder={filter.placeholder}
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => applyFilter(filter.key, e.target.value)}
                  />
                )}

                {filter.type === 'number' && (
                  <Input
                    id={filter.key}
                    type="number"
                    placeholder={filter.placeholder}
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => applyFilter(filter.key, e.target.value)}
                  />
                )}

                {filter.type === 'select' && (
                  <Select
                    value={activeFilters[filter.key] || undefined}
                    onValueChange={(value) => applyFilter(filter.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filter.placeholder || 'Selecionar...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filter.type === 'date' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !activeFilters[filter.key] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {activeFilters[filter.key] ? (
                          format(new Date(activeFilters[filter.key]), 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecionar data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={activeFilters[filter.key] ? new Date(activeFilters[filter.key]) : undefined}
                        onSelect={(date) => applyFilter(filter.key, date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {filter.type === 'dateRange' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !activeFilters[filter.key] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {activeFilters[filter.key]?.from && activeFilters[filter.key]?.to ? (
                          <>
                            {format(new Date(activeFilters[filter.key].from), 'dd/MM', { locale: ptBR })} -{" "}
                            {format(new Date(activeFilters[filter.key].to), 'dd/MM', { locale: ptBR })}
                          </>
                        ) : (
                          <span>Selecionar período</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={activeFilters[filter.key]}
                        onSelect={(range) => applyFilter(filter.key, range)}
                        numberOfMonths={2}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}