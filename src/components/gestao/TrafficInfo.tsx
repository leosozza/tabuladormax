import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Car } from "lucide-react";
import { useTrafficFlow, getCongestionConfig } from "@/hooks/useTrafficFlow";

interface TrafficInfoProps {
  lat: number;
  lon: number;
  enabled?: boolean;
}

export function TrafficInfo({ lat, lon, enabled = true }: TrafficInfoProps) {
  const { trafficData, isLoading, fetchTrafficFlow } = useTrafficFlow();
  const [lastFetch, setLastFetch] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!enabled || !lat || !lon) return;
    
    // Only fetch if location changed significantly (> 500m)
    if (lastFetch) {
      const distance = Math.sqrt(
        Math.pow(lat - lastFetch.lat, 2) + Math.pow(lon - lastFetch.lon, 2)
      ) * 111000; // Convert to meters approx
      
      if (distance < 500) return;
    }

    fetchTrafficFlow(lat, lon);
    setLastFetch({ lat, lon });
  }, [lat, lon, enabled, fetchTrafficFlow, lastFetch]);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Trânsito...</span>
      </Badge>
    );
  }

  if (!trafficData || trafficData.currentSpeed === null) {
    return null;
  }

  const config = getCongestionConfig(trafficData.congestionLevel);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="gap-1 cursor-help bg-background/80 backdrop-blur-sm"
            style={{ borderColor: config.color }}
          >
            <Car className="h-3 w-3" style={{ color: config.color }} />
            <span>{Math.round(trafficData.currentSpeed)} km/h</span>
            <span style={{ color: config.color }}>({config.label})</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-sm">
            <div className="font-medium flex items-center gap-2">
              {config.icon} Trânsito: {config.label}
            </div>
            <div className="text-muted-foreground">
              Velocidade atual: {Math.round(trafficData.currentSpeed)} km/h
            </div>
            <div className="text-muted-foreground">
              Velocidade livre: {Math.round(trafficData.freeFlowSpeed || 0)} km/h
            </div>
            <div className="text-muted-foreground">
              Fluidez: {trafficData.speedRatio}%
            </div>
            {trafficData.confidence > 0 && (
              <div className="text-muted-foreground text-xs">
                Confiança: {Math.round(trafficData.confidence * 100)}%
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
