import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle, Rocket, Code, Clock, Archive } from 'lucide-react';
import { RoadmapFeature } from '@/hooks/useRoadmapFeatures';
import { statusConfig, FeatureStatus } from '@/types/roadmap';

interface RoadmapStatusBadgeProps {
  feature: RoadmapFeature;
  canManage?: boolean;
  onStatusChange?: (id: string, status: RoadmapFeature['status']) => Promise<void>;
}

const statusIcons = {
  active: CheckCircle,
  beta: Rocket,
  'in-progress': Code,
  planned: Clock,
  archived: Archive,
};

export function RoadmapStatusBadge({ feature, canManage, onStatusChange }: RoadmapStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[feature.status as FeatureStatus];
  const StatusIcon = statusIcons[feature.status as keyof typeof statusIcons] || Clock;

  const handleDoubleClick = () => {
    if (canManage && onStatusChange) {
      setIsOpen(true);
    }
  };

  if (canManage && onStatusChange) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Badge 
            className={`${status.bgColor} ${status.color} text-xs cursor-pointer hover:opacity-80 transition-opacity`}
            onDoubleClick={handleDoubleClick}
            title="Clique duas vezes para alterar"
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover">
          {(Object.keys(statusConfig) as FeatureStatus[]).map((statusKey) => {
            const config = statusConfig[statusKey];
            const Icon = statusIcons[statusKey];
            return (
              <DropdownMenuItem
                key={statusKey}
                onClick={() => {
                  onStatusChange(feature.id, statusKey);
                  setIsOpen(false);
                }}
                className={feature.status === statusKey ? 'bg-accent' : ''}
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

  return (
    <Badge className={`${status.bgColor} ${status.color} text-xs`}>
      <StatusIcon className="h-3 w-3 mr-1" />
      {status.label}
    </Badge>
  );
}
