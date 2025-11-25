import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
  recorded_at: string;
}

interface ScouterTimelineProps {
  scouterName: string;
  locations: LocationPoint[];
  onClose: () => void;
}

export default function ScouterTimeline({ 
  scouterName, 
  locations,
  onClose 
}: ScouterTimelineProps) {
  const sortedLocations = [...locations].sort((a, b) => 
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  return (
    <Card className="absolute top-4 left-4 z-[1001] w-80 max-h-[600px] bg-white/95 backdrop-blur shadow-xl">
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              Linha do Tempo
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{scouterName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <ScrollArea className="h-[520px]">
        <div className="p-4">
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

            {sortedLocations.map((location, index) => {
              const isFirst = index === 0;
              const isLast = index === sortedLocations.length - 1;

              return (
                <div key={index} className="relative mb-6 last:mb-0">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center z-10 ${
                    isFirst 
                      ? 'bg-green-500 animate-pulse' 
                      : isLast 
                        ? 'bg-red-500'
                        : 'bg-primary'
                  }`}>
                    {isFirst ? (
                      <MapPin className="w-5 h-5 text-white" />
                    ) : isLast ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16z"/>
                      </svg>
                    ) : (
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Content card */}
                  <div className="ml-14">
                    <Card className={`p-3 ${
                      isFirst 
                        ? 'border-green-500 border-2 shadow-lg' 
                        : 'border-border'
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge 
                          variant={isFirst ? "default" : "secondary"}
                          className={isFirst ? "bg-green-500" : ""}
                        >
                          {isFirst ? "Atual" : isLast ? "Início" : `Ponto ${index + 1}`}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(location.recorded_at), "HH:mm", { locale: ptBR })}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-foreground leading-relaxed">
                            {location.address}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            {format(new Date(location.recorded_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground font-mono">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedLocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma localização registrada</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}