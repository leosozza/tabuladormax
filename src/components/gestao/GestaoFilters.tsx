import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { GestaoFilters } from "@/types/filters";
import { createDateFilter, formatDateForDisplay } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { stripTagFromName } from "@/utils/formatters";
import { AdditionalFilters } from "./AdditionalFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { getFilterableField, resolveJoinFieldValue } from "@/lib/fieldFilterUtils";
import { useGestaoFieldMappings } from "@/hooks/useGestaoFieldMappings";

interface GestaoFiltersProps {
  filters: GestaoFilters;
  onChange: (filters: GestaoFilters) => void;
  showDateFilter?: boolean;
  searchTerm?: string;
}

export function GestaoFiltersComponent({ filters, onChange, showDateFilter = true, searchTerm = "" }: GestaoFiltersProps) {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(filters.dateFilter.startDate);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(filters.dateFilter.endDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { data: allFields } = useGestaoFieldMappings();

  // Buscar projetos comerciais que têm leads no período selecionado
  const { data: projects } = useQuery({
    queryKey: ["commercial-projects-filtered", filters.dateFilter, filters.scouterId, filters.fonte, filters.additionalFilters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("commercial_project_id")
        .not("commercial_project_id", "is", null);

      if (filters.dateFilter.preset !== 'all') {
        query = query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString());
      }

      if (filters.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }

      if (filters.fonte) {
        query = query.eq("fonte_normalizada", filters.fonte);
      }

      if (searchTerm) {
        const isNumeric = /^\d+$/.test(searchTerm);
        if (isNumeric) {
          query = query.or(`name.ilike.%${searchTerm}%,id.eq.${searchTerm},nome_modelo.ilike.%${searchTerm}%`);
        } else {
          query = query.or(`name.ilike.%${searchTerm}%,nome_modelo.ilike.%${searchTerm}%`);
        }
      }

      if (filters.additionalFilters && filters.additionalFilters.length > 0) {
        for (const additionalFilter of filters.additionalFilters) {
          const { field, value, operator = 'eq' } = additionalFilter;
          const actualField = getFilterableField(field);
          if (!actualField || !value) continue;
          
          const fieldMapping = allFields?.find(f => f.key === field);
          const qb = query as any;
          
          if (fieldMapping?.type === 'boolean') {
            const normalized = String(value).toLowerCase();
            const boolValue = normalized === 'true' || normalized === 'sim' || normalized === '1';
            qb.eq(actualField, boolValue);
            continue;
          }
          
          if (actualField === 'commercial_project_id' && field.startsWith('commercial_projects.')) {
            const resolvedValue = await resolveJoinFieldValue(field, value);
            if (resolvedValue) {
              qb.eq('commercial_project_id', resolvedValue);
            }
            continue;
          }
          
          switch (operator) {
            case 'eq': qb.eq(actualField, value); break;
            case 'contains': qb.ilike(actualField, `%${value}%`); break;
            case 'gt': qb.gt(actualField, value); break;
            case 'lt': qb.lt(actualField, value); break;
            case 'gte': qb.gte(actualField, value); break;
            case 'lte': qb.lte(actualField, value); break;
          }
        }
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

  // Buscar scouters únicos que têm leads no período selecionado e no projeto selecionado
  const { data: scouters } = useQuery({
    queryKey: ["scouters-list-filtered", filters.dateFilter, filters.projectId, filters.fonte, filters.additionalFilters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("scouter")
        .not("scouter", "is", null);

      if (filters.dateFilter.preset !== 'all') {
        query = query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString());
      }

      if (filters.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      if (filters.fonte) {
        query = query.eq("fonte_normalizada", filters.fonte);
      }

      if (searchTerm) {
        const isNumeric = /^\d+$/.test(searchTerm);
        if (isNumeric) {
          query = query.or(`name.ilike.%${searchTerm}%,id.eq.${searchTerm},nome_modelo.ilike.%${searchTerm}%`);
        } else {
          query = query.or(`name.ilike.%${searchTerm}%,nome_modelo.ilike.%${searchTerm}%`);
        }
      }

      if (filters.additionalFilters && filters.additionalFilters.length > 0) {
        for (const additionalFilter of filters.additionalFilters) {
          const { field, value, operator = 'eq' } = additionalFilter;
          const actualField = getFilterableField(field);
          if (!actualField || !value) continue;
          
          const fieldMapping = allFields?.find(f => f.key === field);
          const qb = query as any;
          
          if (fieldMapping?.type === 'boolean') {
            const normalized = String(value).toLowerCase();
            const boolValue = normalized === 'true' || normalized === 'sim' || normalized === '1';
            qb.eq(actualField, boolValue);
            continue;
          }
          
          if (actualField === 'commercial_project_id' && field.startsWith('commercial_projects.')) {
            const resolvedValue = await resolveJoinFieldValue(field, value);
            if (resolvedValue) {
              qb.eq('commercial_project_id', resolvedValue);
            }
            continue;
          }
          
          switch (operator) {
            case 'eq': qb.eq(actualField, value); break;
            case 'contains': qb.ilike(actualField, `%${value}%`); break;
            case 'gt': qb.gt(actualField, value); break;
            case 'lt': qb.lt(actualField, value); break;
            case 'gte': qb.gte(actualField, value); break;
            case 'lte': qb.lte(actualField, value); break;
          }
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Extrair scouters únicos e ordenar
      const uniqueScouters = [...new Set(data.map(l => l.scouter).filter(Boolean))];
      return uniqueScouters.sort();
    },
  });

  // Buscar fontes únicas normalizadas que têm leads no período selecionado
  const { data: fontes } = useQuery({
    queryKey: ["fontes-list-filtered", filters.dateFilter, filters.projectId, filters.scouterId, filters.additionalFilters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("fonte_normalizada")
        .not("fonte_normalizada", "is", null);

      if (filters.dateFilter.preset !== 'all') {
        query = query
          .gte("criado", filters.dateFilter.startDate.toISOString())
          .lte("criado", filters.dateFilter.endDate.toISOString());
      }

      if (filters.projectId) {
        query = query.eq("commercial_project_id", filters.projectId);
      }

      if (filters.scouterId) {
        query = query.eq("scouter", filters.scouterId);
      }

      if (searchTerm) {
        const isNumeric = /^\d+$/.test(searchTerm);
        if (isNumeric) {
          query = query.or(`name.ilike.%${searchTerm}%,id.eq.${searchTerm},nome_modelo.ilike.%${searchTerm}%`);
        } else {
          query = query.or(`name.ilike.%${searchTerm}%,nome_modelo.ilike.%${searchTerm}%`);
        }
      }

      if (filters.additionalFilters && filters.additionalFilters.length > 0) {
        for (const additionalFilter of filters.additionalFilters) {
          const { field, value, operator = 'eq' } = additionalFilter;
          const actualField = getFilterableField(field);
          if (!actualField || !value) continue;
          
          const fieldMapping = allFields?.find(f => f.key === field);
          const qb = query as any;
          
          if (fieldMapping?.type === 'boolean') {
            const normalized = String(value).toLowerCase();
            const boolValue = normalized === 'true' || normalized === 'sim' || normalized === '1';
            qb.eq(actualField, boolValue);
            continue;
          }
          
          if (actualField === 'commercial_project_id' && field.startsWith('commercial_projects.')) {
            const resolvedValue = await resolveJoinFieldValue(field, value);
            if (resolvedValue) {
              qb.eq('commercial_project_id', resolvedValue);
            }
            continue;
          }
          
          switch (operator) {
            case 'eq': qb.eq(actualField, value); break;
            case 'contains': qb.ilike(actualField, `%${value}%`); break;
            case 'gt': qb.gt(actualField, value); break;
            case 'lt': qb.lt(actualField, value); break;
            case 'gte': qb.gte(actualField, value); break;
            case 'lte': qb.lte(actualField, value); break;
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return [...new Set(data.map(l => l.fonte_normalizada))].sort();
    },
  });

  // Reset scouterId se o scouter selecionado não estiver mais na lista
  useEffect(() => {
    if (filters.scouterId && scouters && !scouters.includes(filters.scouterId)) {
      onChange({ ...filters, scouterId: null });
    }
  }, [scouters, filters.scouterId]);

  // Reset fonte se a fonte selecionada não estiver mais na lista
  useEffect(() => {
    if (filters.fonte && fontes && !fontes.includes(filters.fonte)) {
      onChange({ ...filters, fonte: null });
    }
  }, [fontes, filters.fonte]);

  const handlePresetChange = (preset: string) => {
    if (preset !== 'custom') {
      const newFilter = createDateFilter(preset as any);
      onChange({ ...filters, dateFilter: newFilter });
    } else {
      const currentFilter = filters.dateFilter || createDateFilter('all');
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
    (filters.fonte ? 1 : 0) +
    (showDateFilter && filters.dateFilter.preset !== 'month' ? 1 : 0) +
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
              {showDateFilter && (
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
              )}

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
                    {scouters?.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum scouter encontrado
                      </SelectItem>
                    ) : (
                      scouters?.map((scouter) => (
                        <SelectItem key={scouter} value={scouter!}>
                          {stripTagFromName(scouter)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

      {/* Filtro de Fonte */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fonte:</label>
                <Select
                  value={filters.fonte || "all"}
                  onValueChange={(value) => 
                    onChange({ ...filters, fonte: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    {fontes?.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhuma fonte encontrada
                      </SelectItem>
                    ) : (
                      fontes?.map((fonte) => (
                        <SelectItem key={fonte} value={fonte}>
                          {fonte}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Fotos */}
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium">Com Foto:</label>
                <Switch
                  checked={filters.photoFilter}
                  onCheckedChange={(checked) => 
                    onChange({ ...filters, photoFilter: checked })
                  }
                />
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
                    dateFilter: createDateFilter('all'),
                    projectId: null,
                    scouterId: null,
                    fonte: null,
                    photoFilter: false,
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
      {showDateFilter && (
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
      )}

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
            {scouters?.length === 0 ? (
              <SelectItem value="none" disabled>
                Nenhum scouter encontrado
              </SelectItem>
            ) : (
              scouters?.map((scouter) => (
                <SelectItem key={scouter} value={scouter!}>
                  {stripTagFromName(scouter)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Fonte */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Fonte:</label>
        <Select
          value={filters.fonte || "all"}
          onValueChange={(value) => 
            onChange({ ...filters, fonte: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as fontes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {fontes?.length === 0 ? (
              <SelectItem value="none" disabled>
                Nenhuma fonte encontrada
              </SelectItem>
            ) : (
              fontes?.map((fonte) => (
                <SelectItem key={fonte} value={fonte}>
                  {fonte}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Fotos */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Com Foto:</label>
        <Switch
          checked={filters.photoFilter}
          onCheckedChange={(checked) => 
            onChange({ ...filters, photoFilter: checked })
          }
        />
      </div>

      {/* Filtros Adicionais */}
      <AdditionalFilters
        filters={filters.additionalFilters || []}
        onChange={(additionalFilters) => onChange({ ...filters, additionalFilters })}
      />

      {/* Botão Limpar Filtros */}
      {(filters.projectId || filters.scouterId || filters.fonte || filters.photoFilter || (showDateFilter && filters.dateFilter.preset !== 'all') || (filters.additionalFilters && filters.additionalFilters.length > 0)) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                  onClick={() => onChange({
                    dateFilter: createDateFilter('all'),
                    projectId: null,
                    scouterId: null,
                    fonte: null,
                    photoFilter: false,
                    additionalFilters: []
                  })}
        >
          Limpar Filtros
        </Button>
      )}
    </div>
  );
}
