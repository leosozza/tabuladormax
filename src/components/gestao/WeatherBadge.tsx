import { useWeather, getWeatherInfo } from "@/hooks/useWeather";
import { Cloud, CloudRain, Droplets, Wind, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WeatherBadgeProps {
  lat: number | null;
  lng: number | null;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function WeatherBadge({ lat, lng, className, compact = false, onClick }: WeatherBadgeProps) {
  const { data: weather, isLoading, error } = useWeather(lat, lng);

  if (!lat || !lng) return null;

  if (isLoading) {
    return (
      <div className={cn(
        "bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border flex items-center gap-2",
        className
      )}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Carregando clima...</span>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  const weatherInfo = getWeatherInfo(weather.current.weatherCode);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              onClick={onClick}
              className={cn(
                "bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border flex items-center gap-1.5",
                onClick && "cursor-pointer hover:bg-accent/50 transition-colors",
                !onClick && "cursor-default",
                weather.willRainSoon && "border-amber-500/50 bg-amber-500/10",
                className
              )}
            >
              <span className="text-lg">{weatherInfo.icon}</span>
              <span className="text-sm font-medium">{weather.current.temperature}°</span>
              {weather.willRainSoon && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <div className="space-y-1">
              <p className="font-medium">{weatherInfo.description}</p>
              <p className="text-xs text-muted-foreground">
                💧 {weather.current.precipitationProbability}% chuva • 💨 {weather.current.windSpeed} km/h
              </p>
              {weather.willRainSoon && (
                <p className="text-xs text-amber-500 font-medium">
                  ⚠️ Previsão de chuva às {weather.rainAlertHour}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      "bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden",
      weather.willRainSoon && "border-amber-500/50",
      className
    )}>
      {/* Header com temperatura */}
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="text-2xl">{weatherInfo.icon}</span>
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">{weather.current.temperature}°C</span>
          </div>
          <p className="text-xs text-muted-foreground">{weatherInfo.description}</p>
        </div>
      </div>

      {/* Detalhes */}
      <div className="px-3 py-2 bg-muted/50 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5 text-blue-500" />
          <span>{weather.current.precipitationProbability}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="w-3.5 h-3.5 text-slate-500" />
          <span>{weather.current.windSpeed} km/h</span>
        </div>
        <div className="flex items-center gap-1">
          <Cloud className="w-3.5 h-3.5 text-slate-400" />
          <span>{weather.current.humidity}%</span>
        </div>
      </div>

      {/* Alerta de chuva */}
      {weather.willRainSoon && (
        <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Chuva prevista às {weather.rainAlertHour}
          </span>
        </div>
      )}
    </div>
  );
}
