import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  size?: 'sm' | 'default';
  className?: string;
}

export function LabelBadge({ name, color, onRemove, size = 'default', className }: LabelBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 px-2 py-0.5 border-2',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
      style={{
        borderColor: color,
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span className="font-medium">{name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-background/20 rounded-full p-0.5 transition-colors"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  );
}
