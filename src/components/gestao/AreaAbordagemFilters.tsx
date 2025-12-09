import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDateFilter } from "@/lib/dateUtils";
import type { DateFilter } from "@/types/filters";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export interface AreaAbordagemFilters {
  dateFilter: DateFilter;
  projectId: string | null;
}

interface AreaAbordagemFiltersProps {
  filters: AreaAbordagemFilters;
  onChange: (filters: AreaAbordagemFilters) => void;
}

type DatePreset = 'today' | 'yesterday' | 'custom';
type DateMode = 'exact' | 'range';

export function AreaAbordagemFilters({ filters, onChange }: AreaAbordagemFiltersProps) {
  const [dateMode, setDateMode] = useState<DateMode>('exact');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: filters.dateFilter.startDate,
    to: filters.dateFilter.endDate
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["commercial-projects-area"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_projects")
        .select("id, name, code")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const getDatePreset = (): DatePreset => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const filterStart = new Date(filters.dateFilter.startDate);
    filterStart.setHours(0, 0, 0, 0);
    
    if (filterStart.getTime() === today.getTime() && filters.dateFilter.preset === 'today') {
      return 'today';
    }
    if (filterStart.getTime() === yesterday.getTime() && 
        filters.dateFilter.endDate.getDate() === yesterday.getDate()) {
      return 'yesterday';
    }
    return 'custom';
  };

  const currentPreset = getDatePreset();

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'today') {
      onChange({ ...filters, dateFilter: createDateFilter('today') });
    } else if (preset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      
      onChange({
        ...filters,
        dateFilter: {
          preset: 'custom',
          startDate: yesterday,
          endDate: yesterdayEnd,
        },
      });
    }
  };

  const handleExactDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    onChange({
      ...filters,
      dateFilter: {
        preset: 'custom',
        startDate,
        endDate,
      },
    });
    setIsCalendarOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      const startDate = new Date(range.from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(range.to);
      endDate.setHours(23, 59, 59, 999);
      
      onChange({
        ...filters,
        dateFilter: {
          preset: 'custom',
          startDate,
          endDate,
        },
      });
      setIsCalendarOpen(false);
    }
  };

  const getDateButtonLabel = () => {
    if (currentPreset !== 'custom') return "Escolher";
    
    if (dateMode === 'range') {
      const start = format(filters.dateFilter.startDate, "dd/MM", { locale: ptBR });
      const end = format(filters.dateFilter.endDate, "dd/MM", { locale: ptBR });
      return `${start} - ${end}`;
    }
    return format(filters.dateFilter.startDate, "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-card rounded-lg border">
      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          📅 Data:
        </span>
        <div className="flex gap-1">
          <Button
            variant={currentPreset === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('today')}
          >
            Hoje
          </Button>
          <Button
            variant={currentPreset === 'yesterday' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('yesterday')}
          >
            Ontem
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={currentPreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn("gap-2")}
              >
                <CalendarIcon className="h-4 w-4" />
                {getDateButtonLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[110]" align="start">
              <div className="p-3 border-b">
                <div className="flex gap-1">
                  <Button
                    variant={dateMode === 'exact' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateMode('exact')}
                    className="flex-1"
                  >
                    Data Exata
                  </Button>
                  <Button
                    variant={dateMode === 'range' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateMode('range')}
                    className="flex-1"
                  >
                    Período
                  </Button>
                </div>
              </div>
              {dateMode === 'exact' ? (
                <Calendar
                  mode="single"
                  selected={filters.dateFilter.startDate}
                  onSelect={handleExactDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              ) : (
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleRangeSelect}
                  numberOfMonths={1}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          🏢 Projeto:
        </span>
        <Select
          value={filters.projectId || "all"}
          onValueChange={(value) => 
            onChange({ ...filters, projectId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.code} - {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}