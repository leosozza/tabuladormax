import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ name, color, size = 'sm', onRemove, className }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  // Determine text color based on background luminance
  const getTextColor = (hexColor: string) => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  return (
    <span
      className={cn(
        'rounded font-medium inline-flex items-center gap-1',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: color,
        color: getTextColor(color),
      }}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
