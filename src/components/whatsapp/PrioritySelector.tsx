import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface PrioritySelectorProps {
  value: number;
  onChange: (value: number) => void;
  showLabel?: boolean;
}

const PRIORITY_CONFIG = {
  0: { label: 'Baixa', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  1: { label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  2: { label: 'Média', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  3: { label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  4: { label: 'Muito Alta', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  5: { label: 'Urgente', color: 'bg-red-600 text-white' },
} as const;

export function PrioritySelector({ value, onChange, showLabel = true }: PrioritySelectorProps) {
  const config = PRIORITY_CONFIG[value as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[0];

  return (
    <div className="space-y-3">
      {showLabel && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Prioridade</Label>
          <span className={cn('text-xs px-2 py-1 rounded', config.color)}>
            {config.label}
          </span>
        </div>
      )}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={5}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Baixa</span>
        <span>Urgente</span>
      </div>
    </div>
  );
}

// Badge for displaying priority in lists
export function PriorityBadge({ priority, size = 'sm' }: { priority: number; size?: 'sm' | 'md' }) {
  if (priority === 0) return null;

  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[0];
  const sizeClasses = {
    sm: 'text-[10px] px-1 py-0.5',
    md: 'text-xs px-1.5 py-0.5',
  };

  return (
    <span className={cn('rounded font-medium', sizeClasses[size], config.color)}>
      P{priority}
    </span>
  );
}
