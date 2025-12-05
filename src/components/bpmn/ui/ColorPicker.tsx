import { memo } from 'react';
import { cn } from '@/lib/utils';
import { NodeColor, NODE_COLORS } from '../edges/types';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  value?: NodeColor;
  onChange: (color: NodeColor) => void;
  className?: string;
}

const COLORS: NodeColor[] = ['blue', 'yellow', 'orange', 'purple', 'green', 'red', 'pink', 'teal', 'gray'];

const COLOR_CLASSES: Record<NodeColor, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  gray: 'bg-slate-500',
};

export const ColorPicker = memo(function ColorPicker({
  value = 'blue',
  onChange,
  className,
}: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={cn(
            "w-6 h-6 rounded-full transition-all duration-150 flex items-center justify-center",
            "ring-2 ring-offset-2 ring-offset-background",
            COLOR_CLASSES[color],
            value === color 
              ? "ring-primary scale-110" 
              : "ring-transparent hover:ring-muted-foreground/50 hover:scale-105"
          )}
          title={color}
        >
          {value === color && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
});

export default ColorPicker;
