import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRangePreset } from './ScouterDashboard';

interface Project {
  project_id: string;
  project_name: string;
  project_code: string;
  lead_count: number;
}

interface ScouterFiltersProps {
  datePreset: DateRangePreset;
  onDatePresetChange: (preset: DateRangePreset) => void;
  customDateRange: { start: Date | null; end: Date | null };
  onCustomDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  projectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  projects: Project[];
}

export const ScouterFilters = ({
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
  projectId,
  onProjectChange,
  projects
}: ScouterFiltersProps) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const presetLabels: Record<DateRangePreset, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    week: 'Esta Semana',
    last7days: 'Últimos 7 dias',
    month: 'Este Mês',
    custom: 'Intervalo'
  };

  const handlePresetChange = (value: string) => {
    onDatePresetChange(value as DateRangePreset);
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Filtro de Período */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(presetLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seletores de data customizada */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Data início */}
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[130px] justify-start text-left font-normal",
                  !customDateRange.start && "text-muted-foreground"
                )}
              >
                {customDateRange.start ? (
                  format(customDateRange.start, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>De</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.start || undefined}
                onSelect={(date) => {
                  onCustomDateRangeChange({ ...customDateRange, start: date || null });
                  setStartOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">até</span>

          {/* Data fim */}
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[130px] justify-start text-left font-normal",
                  !customDateRange.end && "text-muted-foreground"
                )}
              >
                {customDateRange.end ? (
                  format(customDateRange.end, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Até</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.end || undefined}
                onSelect={(date) => {
                  onCustomDateRangeChange({ ...customDateRange, end: date || null });
                  setEndOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Filtro de Projeto */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={projectId || 'all'} onValueChange={v => onProjectChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Projetos</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.project_id} value={project.project_id}>
                {project.project_name} ({project.lead_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
