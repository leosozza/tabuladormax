import { Card } from "@/components/ui/card";

interface TrafficLegendProps {
  isVisible: boolean;
}

export function TrafficLegend({ isVisible }: TrafficLegendProps) {
  if (!isVisible) return null;

  const legendItems = [
    { color: '#00ff00', label: 'Livre', description: '>80% velocidade' },
    { color: '#ffff00', label: 'Moderado', description: '50-80%' },
    { color: '#ff0000', label: 'Lento', description: '<50%' },
    { color: '#000000', label: 'Parado', description: 'Congestionado' },
  ];

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm p-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">Trânsito</p>
      <div className="flex gap-3">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div 
              className="w-4 h-1 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
