import { useWeather, getWeatherInfo, isRainyWeatherCode } from "@/hooks/useWeather";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface WeatherForecastProps {
  lat: number | null;
  lng: number | null;
  className?: string;
  hours?: number;
}

export function WeatherForecast({ lat, lng, className, hours = 8 }: WeatherForecastProps) {
  const { data: weather, isLoading, error } = useWeather(lat, lng);

  if (!lat || !lng) return null;

  if (isLoading) {
    return (
      <div className={cn(
        "bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border flex items-center justify-center",
        className
      )}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !weather) return null;

  const forecast = weather.hourly.slice(0, hours);
  const now = new Date();

  // Find best time (lowest precipitation, highest temp)
  const bestHour = forecast.reduce((best, hour) => {
    if (hour.precipitationProbability < best.precipitationProbability) {
      return hour;
    }
    if (
      hour.precipitationProbability === best.precipitationProbability &&
      hour.temperature > best.temperature
    ) {
      return hour;
    }
    return best;
  }, forecast[0]);

  const bestHourFormatted = new Date(bestHour.time).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn(
      "bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Próximas horas</span>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          ✨ Melhor: {bestHourFormatted}
        </span>
      </div>

      {/* Forecast timeline */}
      <ScrollArea className="w-full">
        <div className="flex p-2 gap-1">
          {forecast.map((hour, index) => {
            const hourDate = new Date(hour.time);
            const isNow = index === 0;
            const isRainy = isRainyWeatherCode(hour.weatherCode) || hour.precipitationProbability > 50;
            const isBest = hour.time === bestHour.time;
            const weatherInfo = getWeatherInfo(hour.weatherCode);

            return (
              <div
                key={hour.time}
                className={cn(
                  "flex flex-col items-center min-w-[52px] px-2 py-1.5 rounded-lg transition-colors",
                  isNow && "bg-primary/10",
                  isRainy && !isNow && "bg-amber-500/10",
                  isBest && !isNow && !isRainy && "bg-emerald-500/10",
                )}
              >
                <span className={cn(
                  "text-[10px] font-medium",
                  isNow ? "text-primary" : "text-muted-foreground"
                )}>
                  {isNow ? "Agora" : hourDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                
                <span className="text-lg my-0.5">{weatherInfo.icon}</span>
                
                <span className="text-xs font-medium">{hour.temperature}°</span>
                
                {hour.precipitationProbability > 0 && (
                  <span className={cn(
                    "text-[10px]",
                    hour.precipitationProbability > 50 ? "text-amber-500 font-medium" : "text-blue-500"
                  )}>
                    💧{hour.precipitationProbability}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Rain alert */}
      {weather.willRainSoon && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/20 text-center">
          <span className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Chuva prevista às {weather.rainAlertHour} - considere antecipar
          </span>
        </div>
      )}
    </div>
  );
}
