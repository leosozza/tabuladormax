import { Card } from "@/components/ui/card";
import { CloudRain, Clock } from "lucide-react";

interface WeatherLegendProps {
  isVisible: boolean;
  lastUpdate: Date | null;
  isLoading?: boolean;
}

export function WeatherLegend({ isVisible, lastUpdate, isLoading }: WeatherLegendProps) {
  if (!isVisible) return null;

  const legendItems = [
    { color: '#88D0F7', label: 'Leve' },
    { color: '#52A9EB', label: 'Moderada' },
    { color: '#3178C6', label: 'Forte' },
    { color: '#F7D45E', label: 'Muito forte' },
    { color: '#E35D52', label: 'Intensa' },
    { color: '#A02F5C', label: 'Extrema' },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="absolute bottom-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <CloudRain className="h-4 w-4 text-blue-500" />
        <p className="text-xs font-medium text-muted-foreground">Radar de Chuva</p>
        {isLoading && (
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
      </div>
      
      <div className="flex gap-1 mb-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <div 
              className="w-5 h-2 rounded-sm" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[9px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {lastUpdate && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-1">
          <Clock className="h-3 w-3" />
          <span>Atualizado: {formatTime(lastUpdate)}</span>
        </div>
      )}
    </Card>
  );
}
