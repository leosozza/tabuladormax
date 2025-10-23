import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter, formatDateForDisplay } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GestaoFiltersProps {
  filters: GestaoFilters;
  onChange: (filters: GestaoFilters) => void;
}

export function GestaoFiltersComponent({ filters, onChange }: GestaoFiltersProps) {
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(filters.dateFilter.startDate);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(filters.dateFilter.endDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Buscar projetos comerciais
  const { data: projects } = useQuery({
    queryKey: ["commercial-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_projects")
        .select("id, name, code")
        .eq("active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar scouters únicos
  const { data: scouters } = useQuery({
    queryKey: ["scouters-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("scouter")
        .not("scouter", "is", null);
      
      if (error) throw error;
      
      // Extrair scouters únicos
      const uniqueScouters = [...new Set(data.map(l => l.scouter).filter(Boolean))];
      return uniqueScouters.sort();
    },
  });

  const handlePresetChange = (preset: string) => {
    if (preset !== 'custom') {
      const newFilter = createDateFilter(preset as any);
      onChange({ ...filters, dateFilter: newFilter });
    } else {
      onChange({ ...filters, dateFilter: { ...filters.dateFilter, preset: 'custom' } });
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      
      onChange({ 
        ...filters, 
        dateFilter: createDateFilter('custom', startDate, endDate) 
      });
      setIsCalendarOpen(false);
    }
  };

  const getDisplayText = () => {
    if (filters.dateFilter.preset === 'custom') {
      return `${formatDateForDisplay(filters.dateFilter.startDate)} - ${formatDateForDisplay(filters.dateFilter.endDate)}`;
    }
    
    switch (filters.dateFilter.preset) {
      case 'today':
        return 'Hoje';
      case 'week':
        return 'Esta Semana';
      case 'month':
        return 'Este Mês';
      default:
        return 'Selecione';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-card rounded-lg border">
      {/* Filtro de Data */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Período:</label>
        <Select 
          value={filters.dateFilter.preset} 
          onValueChange={handlePresetChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {filters.dateFilter.preset === 'custom' && (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDisplayText()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Final</label>
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    disabled={(date) => customStartDate ? date < customStartDate : false}
                  />
                </div>
                <Button 
                  onClick={handleCustomDateApply} 
                  disabled={!customStartDate || !customEndDate}
                  className="w-full"
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Filtro de Projeto */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Projeto:</label>
        <Select
          value={filters.projectId || "all"}
          onValueChange={(value) => 
            onChange({ ...filters, projectId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Scouter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Scouter:</label>
        <Select
          value={filters.scouterId || "all"}
          onValueChange={(value) => 
            onChange({ ...filters, scouterId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os scouters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os scouters</SelectItem>
            {scouters?.map((scouter) => (
              <SelectItem key={scouter} value={scouter!}>
                {scouter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botão Limpar Filtros */}
      {(filters.projectId || filters.scouterId || filters.dateFilter.preset !== 'month') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({
            dateFilter: createDateFilter('month'),
            projectId: null,
            scouterId: null
          })}
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
