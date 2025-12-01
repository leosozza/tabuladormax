import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Flame, TrendingUp, Radio } from "lucide-react";
import { useRealtimeLeads } from "@/hooks/useRealtimeLeads";

// Ícones do Leaflet
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface FichaLocation {
  lat: number;
  lng: number;
  value: number; // Para heatmap weight
  name: string;
  scouter: string;
  confirmed: boolean;
  presenca_confirmada: boolean;
}

interface HeatmapFichasMapProps {
  center?: [number, number];
  zoom?: number;
  projectId?: string | null;
  scouterId?: string | null;
  dateRange: { startDate: Date; endDate: Date };
}

export default function HeatmapFichasMap({
  center = [-15.7801, -47.9292],
  zoom = 12,
  projectId,
  scouterId,
  dateRange,
}: HeatmapFichasMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Use real-time updates hook
  const { updates, clearUpdates, isConnected } = useRealtimeLeads({
    enabled: true,
    projectId,
    scouterId,
  });

  // Buscar fichas confirmadas
  const { data: fichasData, isLoading } = useQuery({
    queryKey: ["fichas-heatmap", projectId, scouterId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, address, scouter, ficha_confirmada, presenca_confirmada, data_confirmacao_ficha")
        .eq("ficha_confirmada", true)
        .not("address", "is", null)
        .gte("data_confirmacao_ficha", dateRange.startDate.toISOString())
        .lte("data_confirmacao_ficha", dateRange.endDate.toISOString());

      if (projectId) {
        query = query.eq("commercial_project_id", projectId);
      }

      if (scouterId) {
        query = query.eq("scouter", scouterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Simular geocodificação (em produção usar API real)
      const locations: FichaLocation[] = [];
      const baseCoords = { lat: -15.7801, lng: -47.9292 };
      const offset = 0.03;

      data?.forEach((ficha) => {
        locations.push({
          lat: baseCoords.lat + (Math.random() - 0.5) * offset,
          lng: baseCoords.lng + (Math.random() - 0.5) * offset,
          value: ficha.presenca_confirmada ? 2 : 1, // Peso maior para quem compareceu
          name: ficha.name || "Sem nome",
          scouter: ficha.scouter || "Sem scouter",
          confirmed: ficha.ficha_confirmada,
          presenca_confirmada: ficha.presenca_confirmada || false,
        });
      });

      return locations;
    },
  });

  // Merge real-time updates with existing data
  const mergedFichasData = useMemo(() => {
    if (!fichasData) return [];
    
    // Create a map of existing fichas
    const fichasMap = new Map(fichasData.map(f => [f.name, f]));
    
    // Process updates
    updates.forEach(update => {
      if (update.event === 'DELETE') {
        fichasMap.delete(update.name);
      } else {
        // For INSERT and UPDATE, add/update the ficha
        // Note: In production, you'd want to check if this is a confirmed ficha
        fichasMap.set(update.name, {
          lat: update.lat,
          lng: update.lng,
          value: 1,
          name: update.name,
          scouter: update.scouter || "Sem scouter",
          confirmed: true,
          presenca_confirmada: false,
        });
      }
    });
    
    return Array.from(fichasMap.values());
  }, [fichasData, updates]);

  // Debounce heatmap updates to avoid too frequent recalculations
  const updateHeatmap = useCallback(() => {
    if (updates.length > 0) {
      setIsUpdating(true);
      // Clear updates after processing
      setTimeout(() => {
        clearUpdates();
        setIsUpdating(false);
      }, 500);
    }
  }, [updates, clearUpdates]);

  useEffect(() => {
    if (updates.length > 0) {
      updateHeatmap();
    }
  }, [updates, updateHeatmap]);

  // Estatísticas - use merged data
  const totalFichas = mergedFichasData?.length || 0;
  const fichasCompareceram = mergedFichasData?.filter((f) => f.presenca_confirmada).length || 0;
  const taxaComparecimento = totalFichas > 0 ? (fichasCompareceram / totalFichas) * 100 : 0;

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    heatLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Criar heatmap manual (círculos com opacidade) - use merged data
  useEffect(() => {
    if (!mapRef.current || !heatLayerRef.current || !mergedFichasData) return;

    // Limpar layer anterior
    heatLayerRef.current.clearLayers();

    // Agrupar fichas próximas para criar "calor"
    const gridSize = 0.005; // Tamanho da célula do grid
    const heatGrid = new Map<string, { count: number; lat: number; lng: number; fichas: FichaLocation[] }>();

    mergedFichasData.forEach((ficha) => {
      const gridX = Math.floor(ficha.lat / gridSize);
      const gridY = Math.floor(ficha.lng / gridSize);
      const key = `${gridX},${gridY}`;

      if (!heatGrid.has(key)) {
        heatGrid.set(key, {
          count: 0,
          lat: gridX * gridSize + gridSize / 2,
          lng: gridY * gridSize + gridSize / 2,
          fichas: [],
        });
      }

      const cell = heatGrid.get(key)!;
      cell.count += ficha.value;
      cell.fichas.push(ficha);
    });

    // Criar círculos de calor
    const maxCount = Math.max(...Array.from(heatGrid.values()).map((c) => c.count));

    heatGrid.forEach((cell) => {
      const intensity = cell.count / maxCount;
      const radius = 200 + intensity * 300; // Raio baseado na intensidade
      
      // Cor: azul (frio) -> amarelo -> vermelho (quente)
      let color;
      if (intensity < 0.33) {
        color = `rgba(59, 130, 246, ${0.3 + intensity * 0.4})`; // Azul
      } else if (intensity < 0.66) {
        color = `rgba(251, 191, 36, ${0.4 + intensity * 0.4})`; // Amarelo
      } else {
        color = `rgba(239, 68, 68, ${0.5 + intensity * 0.4})`; // Vermelho
      }

      const circle = L.circle([cell.lat, cell.lng], {
        radius,
        fillColor: color,
        color: 'transparent',
        fillOpacity: 0.6,
        weight: 0,
      });

      // Popup com informações da área
      const popupContent = `
        <div class="p-3 min-w-[220px]">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-full ${
              intensity > 0.66 ? 'bg-red-500' : intensity > 0.33 ? 'bg-yellow-500' : 'bg-blue-500'
            } flex items-center justify-center">
              <span class="text-white font-bold text-sm">${cell.count}</span>
            </div>
            <div>
              <p class="font-bold text-sm">Zona de Alta Densidade</p>
              <p class="text-xs text-gray-500">
                Intensidade: ${(intensity * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-gray-600">Total de fichas:</span>
              <span class="font-semibold">${cell.fichas.length}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-600">Compareceram:</span>
              <span class="font-semibold text-green-600">
                ${cell.fichas.filter(f => f.presenca_confirmada).length}
              </span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-600">Scouters únicos:</span>
              <span class="font-semibold">
                ${new Set(cell.fichas.map(f => f.scouter)).size}
              </span>
            </div>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      circle.addTo(heatLayerRef.current!);
    });

    // Adicionar marcadores individuais para fichas confirmadas
    mergedFichasData.forEach((ficha) => {
      const icon = L.divIcon({
        html: `
          <div class="w-3 h-3 rounded-full ${
            ficha.presenca_confirmada ? 'bg-green-500' : 'bg-blue-500'
          } border-2 border-white shadow-lg"></div>
        `,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([ficha.lat, ficha.lng], { icon });

      marker.bindPopup(`
        <div class="p-2 min-w-[180px]">
          <p class="font-bold text-sm mb-1">${ficha.name}</p>
          <p class="text-xs text-gray-600 mb-1">Scouter: ${ficha.scouter}</p>
          <div class="flex gap-1 mt-2">
            <span class="px-2 py-0.5 text-[10px] rounded ${
              ficha.confirmed ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }">
              ${ficha.confirmed ? 'Confirmada' : 'Pendente'}
            </span>
            ${
              ficha.presenca_confirmada
                ? '<span class="px-2 py-0.5 text-[10px] rounded bg-green-100 text-green-800">Compareceu</span>'
                : '<span class="px-2 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600">Não compareceu</span>'
            }
          </div>
        </div>
      `);

      marker.addTo(heatLayerRef.current!);
    });

    // Ajustar bounds
    if (mergedFichasData.length > 0) {
      const bounds = L.latLngBounds(mergedFichasData.map((f) => [f.lat, f.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mergedFichasData]);

  return (
    <div className="relative">
      {/* Real-time connection indicator */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Badge 
          variant={isConnected ? "default" : "secondary"} 
          className={`shadow-lg gap-2 ${isConnected ? 'bg-green-600' : ''}`}
        >
          <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse' : ''}`} />
          {isConnected ? 'Tempo Real Ativo' : 'Conectando...'}
        </Badge>
        {isUpdating && (
          <Badge variant="secondary" className="mt-2 shadow-lg">
            Atualizando mapa...
          </Badge>
        )}
      </div>

      {/* Estatísticas superiores */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <Card className="p-3 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Fichas Confirmadas</div>
              <div className="text-2xl font-bold text-blue-600">{totalFichas}</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Taxa Comparecimento</div>
              <div className="text-2xl font-bold text-green-600">
                {taxaComparecimento.toFixed(0)}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Legenda do mapa de calor */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Card className="p-4 bg-white/95 backdrop-blur shadow-lg max-w-xs">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Mapa de Calor - Densidade
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            As cores indicam a concentração de fichas confirmadas na região
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0"></div>
              <div className="text-xs">
                <div className="font-medium">Baixa densidade</div>
                <div className="text-muted-foreground">1-33% da concentração máxima</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex-shrink-0"></div>
              <div className="text-xs">
                <div className="font-medium">Média densidade</div>
                <div className="text-muted-foreground">34-66% da concentração máxima</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0"></div>
              <div className="text-xs">
                <div className="font-medium">Alta densidade</div>
                <div className="text-muted-foreground">67-100% da concentração máxima</div>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t">
              <p className="text-xs font-medium mb-2">Marcadores individuais:</p>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white flex-shrink-0"></div>
                <span className="text-xs">Ficha confirmada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white flex-shrink-0"></div>
                <span className="text-xs">Cliente compareceu</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Mapa */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: "600px" }}
      />

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-[1001]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Gerando mapa de calor...</p>
          </div>
        </div>
      )}

      {!isLoading && totalFichas === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-8">
            <FileCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma ficha confirmada</h3>
            <p className="text-sm text-muted-foreground">
              Não há fichas confirmadas no período selecionado
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
