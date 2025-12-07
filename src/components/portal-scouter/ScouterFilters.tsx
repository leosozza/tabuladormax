import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Building } from 'lucide-react';
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
}
export const ScouterFilters = ({
  datePreset,
  onDatePresetChange,
  projectId,
  onProjectChange,
  projects
}: ScouterFiltersProps) => {
  const presetLabels: Record<DateRangePreset, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    week: 'Esta Semana',
    month: 'Este Mês'
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Filtro de Período */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={datePreset} onValueChange={v => onDatePresetChange(v as DateRangePreset)}>
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