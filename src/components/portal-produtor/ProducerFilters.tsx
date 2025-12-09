import { Button } from '@/components/ui/button';
import { DealStatusFilter } from './ProducerDashboard';

interface ProducerFiltersProps {
  statusFilter: DealStatusFilter;
  onStatusFilterChange: (filter: DealStatusFilter) => void;
}

export const ProducerFilters = ({ statusFilter, onStatusFilterChange }: ProducerFiltersProps) => {
  const filters: { value: DealStatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pendentes', label: 'Pendentes' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'concluidos', label: 'Concluídos' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={statusFilter === filter.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};
