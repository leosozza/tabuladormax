import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, CheckCircle, Rocket, Code, Clock, Archive } from 'lucide-react';
import { RoadmapFeature } from '@/hooks/useRoadmapFeatures';
import { statusConfig } from '@/types/roadmap';

interface RoadmapStatusChangerProps {
  feature: RoadmapFeature;
  onStatusChange: (id: string, status: RoadmapFeature['status']) => Promise<void>;
  disabled?: boolean;
}

const statusIcons = {
  active: CheckCircle,
  beta: Rocket,
  'in-progress': Code,
  planned: Clock,
  archived: Archive,
};

export function RoadmapStatusChanger({ feature, onStatusChange, disabled }: RoadmapStatusChangerProps) {
  const currentConfig = statusConfig[feature.status];
  const CurrentIcon = statusIcons[feature.status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" disabled={disabled}>
          <CurrentIcon className="h-3 w-3" />
          {currentConfig.label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(statusConfig) as RoadmapFeature['status'][]).map((status) => {
          const config = statusConfig[status];
          const Icon = statusIcons[status];
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => onStatusChange(feature.id, status)}
              className={feature.status === status ? 'bg-accent' : ''}
            >
              <Icon className="h-4 w-4 mr-2" />
              {config.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
