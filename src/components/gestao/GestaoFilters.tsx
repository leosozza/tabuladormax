import { useState } from "react";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter, formatDateForDisplay } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { stripTagFromName } from "@/utils/formatters";
import { AdditionalFilters } from "./AdditionalFilters";
import { useIsMobile } from "@/hooks/use-mobile";

interface GestaoFiltersProps {
  filters: GestaoFilters;
  onChange: (filters: GestaoFilters) => void;
}

export function GestaoFiltersComponent({ filters, onChange }: GestaoFiltersProps) {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(filters.dateFilter.startDate);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(filters.dateFilter.endDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Buscar projetos comerciais que têm leads no período selecionado
  const { data: projects } = useQuery({
    queryKey: ["commercial-projects-filtered", filters.dateFilter],
    queryFn: async () => {
      // Buscar IDs de projetos que existem nos leads do período
      let query = supabase
        .from("leads")
        .select("commercial_project_id")
        .not("commercial_project_id", "is", null);

      // Aplicar filtro de data se não for "todo período"
      if (filters.dateFilter.preset !== 'all') {
        query = query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString());
      }

      const { data: leadProjects, error: leadsError } = await query;
      if (leadsError) throw leadsError;

      // Extrair IDs únicos
      const projectIds = [...new Set(leadProjects.map(l => l.commercial_project_id).filter(Boolean))];

      if (projectIds.length === 0) return [];

      // Buscar dados dos projetos
      const { data, error } = await supabase
        .from("commercial_projects")
        .select("id, name, code")
        .in("id", projectIds)
        .eq("active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar scouters únicos que têm leads no período selecionado
  const { data: scouters } = useQuery({
    queryKey: ["scouters-list-filtered", filters.dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("scouter")
        .not("scouter", "is", null);

      // Aplicar filtro de data se não for "todo período"
      if (filters.dateFilter.preset !== 'all') {
        query = query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Extrair scouters únicos e ordenar
      const uniqueScouters = [...new Set(data.map(l => l.scouter).filter(Boolean))];
      return uniqueScouters.sort();
    },
  });

  const handlePresetChange = (preset: string) => {
    if (preset !== 'custom') {
      const newFilter = createDateFilter(preset as any);
      onChange({ ...filters, dateFilter: newFilter });
    } else {
      const currentFilter = filters.dateFilter || createDateFilter('month');
      onChange({ ...filters, dateFilter: { ...currentFilter, preset: 'custom' } });
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
      case 'all':
        return 'Todo Período';
      default:
        return 'Selecione';
    }
  };

  // Contar filtros ativos
  const activeFiltersCount = 
    (filters.projectId ? 1 : 0) + 
    (filters.scouterId ? 1 : 0) + 
    (filters.dateFilter.preset !== 'month' ? 1 : 0) +
    (filters.additionalFilters?.length || 0);

  if (isMobile) {
    return (
      <div className="mb-4">
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2 relative">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 pt-6">
              {/* Filtro de Data */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Período:</label>
                <Select 
                  value={filters.dateFilter.preset} 
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="all">Todo Período</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>

                {filters.dateFilter.preset === 'custom' && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
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
                      Aplicar Datas
                    </Button>
                  </div>
                )}
              </div>

              {/* Filtro de Projeto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Projeto:</label>
                <Select
                  value={filters.projectId || "all"}
                  onValueChange={(value) => 
                    onChange({ ...filters, projectId: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger className="w-full">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Scouter:</label>
                <Select
                  value={filters.scouterId || "all"}
                  onValueChange={(value) => 
                    onChange({ ...filters, scouterId: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os scouters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os scouters</SelectItem>
                    {scouters?.map((scouter) => (
                      <SelectItem key={scouter} value={scouter!}>
                        {stripTagFromName(scouter)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtros Adicionais */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtros Avançados:</label>
                <AdditionalFilters
                  filters={filters.additionalFilters || []}
                  onChange={(additionalFilters) => onChange({ ...filters, additionalFilters })}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    onChange({
                      dateFilter: createDateFilter('month'),
                      projectId: null,
                      scouterId: null,
                      additionalFilters: []
                    });
                  }}
                  className="flex-1"
                >
                  Limpar
                </Button>
                <Button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop: Filtros inline (layout original)
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
            <SelectItem value="all">Todo Período</SelectItem>
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
                {stripTagFromName(scouter)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtros Adicionais */}
      <AdditionalFilters
        filters={filters.additionalFilters || []}
        onChange={(additionalFilters) => onChange({ ...filters, additionalFilters })}
      />

      {/* Botão Limpar Filtros */}
      {(filters.projectId || filters.scouterId || filters.dateFilter.preset !== 'month' || (filters.additionalFilters && filters.additionalFilters.length > 0)) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({
            dateFilter: createDateFilter('month'),
            projectId: null,
            scouterId: null,
            additionalFilters: []
          })}
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
