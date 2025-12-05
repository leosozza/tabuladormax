import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
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
  projectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  projects: Project[];
  customRange: { from: Date; to: Date } | null;
  onCustomRangeChange: (range: { from: Date; to: Date } | null) => void;
}

export const ScouterFilters = ({
  datePreset,
  onDatePresetChange,
  projectId,
  onProjectChange,
  projects,
  customRange,
  onCustomRangeChange
}: ScouterFiltersProps) => {
  const presetLabels: Record<DateRangePreset, string> = {
    today: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mês',
    '30days': 'Últimos 30 dias',
    all: 'Todo Período',
    custom: 'Personalizado'
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onCustomRangeChange({ from: range.from, to: range.to });
      onDatePresetChange('custom');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro de Período */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DateRangePreset)}>
          <SelectTrigger className="w-[180px]">
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

      {/* Calendário personalizado */}
      {datePreset === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto">
              {customRange ? (
                <>
                  {format(customRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                  {format(customRange.to, 'dd/MM/yy', { locale: ptBR })}
                </>
              ) : (
                'Selecionar datas'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={customRange?.from}
              selected={customRange ? { from: customRange.from, to: customRange.to } : undefined}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Filtro de Projeto */}
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={projectId || 'all'} 
          onValueChange={(v) => onProjectChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Projetos</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.project_id} value={project.project_id}>
                {project.project_name} ({project.lead_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Badge fonte fixa */}
      <div className="ml-auto px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full">
        Fonte: Scouter Fichas
      </div>
    </div>
  );
};
