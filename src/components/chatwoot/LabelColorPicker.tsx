import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f59e0b' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cinza', value: '#6b7280' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Lima', value: '#84cc16' },
];

interface LabelColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export function LabelColorPicker({ selectedColor, onColorChange }: LabelColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Escolha uma cor:</label>
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onColorChange(color.value)}
            className={cn(
              'w-10 h-10 rounded-md border-2 transition-all hover:scale-110',
              selectedColor === color.value
                ? 'border-foreground ring-2 ring-foreground ring-offset-2'
                : 'border-border'
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-sm text-muted-foreground">Preview:</span>
        <div
          className="px-3 py-1 rounded-md text-sm font-medium border-2"
          style={{
            borderColor: selectedColor,
            backgroundColor: `${selectedColor}15`,
            color: selectedColor,
          }}
        >
          Etiqueta de Exemplo
        </div>
      </div>
    </div>
  );
}
