import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MapPin, Users } from "lucide-react";

// Data types for the two different map views
interface ScouterLocationData {
  lat: number;
  lon: number;
  scouterName: string;
  leads: number;
  fichas: number; // alias para compatibilidade
  conversao: number;
}

interface FichaLocationData {
  lat: number;
  lon: number;
  leads: number;
  fichas: number; // alias para compatibilidade
  conversao: number;
  endereco?: string;
}

type MapViewMode = "scouters" | "fichas";

interface UnifiedMapChartProps {
  scouterData?: ScouterLocationData[];
  fichaData?: FichaLocationData[];
  isLoading?: boolean;
}

export const UnifiedMapChart = ({ 
  scouterData = [], 
  fichaData = [], 
  isLoading 
}: UnifiedMapChartProps) => {
  const [viewMode, setViewMode] = useState<MapViewMode>("fichas");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Localização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const currentData = viewMode === "scouters" ? scouterData : fichaData;

  // Simulação de mapa - em produção seria integrado com Google Maps ou Mapbox
  const getBubbleSize = (fichas: number) => {
    if (currentData.length === 0) return 16;
    const maxFichas = Math.max(...currentData.map(d => d.fichas));
    return Math.max(8, (fichas / maxFichas) * 32);
  };

  const getBubbleColor = (conversao: number) => {
    if (conversao >= 80) return "hsl(var(--success))";
    if (conversao >= 60) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getScouterColor = (index: number) => {
    const colors = [
      "hsl(var(--primary))",
      "hsl(142, 71%, 45%)",
      "hsl(262, 83%, 58%)",
      "hsl(24, 95%, 53%)",
      "hsl(199, 89%, 48%)",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Localização
          </CardTitle>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as MapViewMode)}>
            <ToggleGroupItem value="fichas" aria-label="Visualizar leads">
              <MapPin className="h-4 w-4 mr-2" />
              Leads
            </ToggleGroupItem>
            <ToggleGroupItem value="scouters" aria-label="Visualizar scouters">
              <Users className="h-4 w-4 mr-2" />
              Scouters
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-64 bg-muted rounded border overflow-hidden">
          {/* Simulação de mapa */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
            {viewMode === "fichas" && fichaData.map((location, index) => (
              <div
                key={`ficha-${index}`}
                className="absolute rounded-full opacity-70 hover:opacity-90 cursor-pointer transition-opacity"
                style={{
                  left: `${20 + (index % 5) * 15}%`,
                  top: `${20 + Math.floor(index / 5) * 20}%`,
                  width: getBubbleSize(location.fichas),
                  height: getBubbleSize(location.fichas),
                  backgroundColor: getBubbleColor(location.conversao),
                }}
                title={`${location.endereco || 'Local'}: ${location.fichas} leads, ${location.conversao.toFixed(1)}% conversão`}
              />
            ))}
            
            {viewMode === "scouters" && scouterData.map((location, index) => (
              <div
                key={`scouter-${index}`}
                className="absolute rounded-full opacity-80 hover:opacity-100 cursor-pointer transition-all hover:scale-110"
                style={{
                  left: `${15 + (index % 6) * 14}%`,
                  top: `${15 + Math.floor(index / 6) * 18}%`,
                  width: getBubbleSize(location.fichas),
                  height: getBubbleSize(location.fichas),
                  backgroundColor: getScouterColor(index),
                  border: "2px solid white",
                }}
                title={`${location.scouterName}: ${location.fichas} leads, ${location.conversao.toFixed(1)}% conversão`}
              />
            ))}
          </div>
          
          {/* Legenda */}
          <div className="absolute bottom-4 left-4 bg-background/90 p-3 rounded-lg border text-xs">
            {viewMode === "fichas" && (
              <div className="space-y-1">
                <div className="font-semibold mb-2">Mapa de Calor - Leads</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span>Alta conversão (≥80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <span>Média conversão (60-79%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                  <span>Baixa conversão (&lt;60%)</span>
                </div>
              </div>
            )}
            {viewMode === "scouters" && (
              <div className="space-y-1">
                <div className="font-semibold mb-2">Localização ao Vivo - Scouters</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }}></div>
                  <span>Scouters ativos</span>
                </div>
                <div className="text-muted-foreground">
                  Tamanho = nº de leads
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Lista de locais */}
        <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
          {viewMode === "fichas" && fichaData.map((location, index) => (
            <div key={`ficha-list-${index}`} className="flex justify-between items-center text-sm">
              <span className="truncate">{location.endereco || `Local ${index + 1}`}</span>
              <div className="flex gap-4 text-muted-foreground">
                <span>{location.fichas} leads</span>
                <span>{location.conversao.toFixed(1)}%</span>
              </div>
            </div>
          ))}
          {viewMode === "scouters" && scouterData.map((location, index) => (
            <div key={`scouter-list-${index}`} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: getScouterColor(index) }}
                />
                <span className="truncate font-medium">{location.scouterName}</span>
              </div>
              <div className="flex gap-4 text-muted-foreground">
                <span>{location.fichas} leads</span>
                <span>{location.conversao.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
