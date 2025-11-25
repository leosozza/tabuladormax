import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User, MapPin, Clock, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useChartPerformance } from "@/lib/monitoring";
import ScouterTimeline from "./ScouterTimeline";
import { useToast } from "@/hooks/use-toast";

// Ícones personalizados para scouters
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface ScouterLocation {
  scouterBitrixId: number;
  scouterName: string;
  latitude: number;
  longitude: number;
  address: string;
  recordedAt: string;
}

interface LocationHistory {
  latitude: number;
  longitude: number;
  address: string;
  recorded_at: string;
}

interface ScouterLocationMapProps {
  center?: [number, number];
  zoom?: number;
  projectId?: string | null;
  scouterId?: string | null;
  dateRange: { startDate: Date; endDate: Date };
}

export default function ScouterLocationMap({
  center = [-15.7801, -47.9292],
  zoom = 12,
  projectId,
  scouterId,
  dateRange,
}: ScouterLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<number, L.Polyline>>(new Map());
  const [selectedScouter, setSelectedScouter] = useState<number | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);
  const { toast } = useToast();

  // Buscar localizações mais recentes dos scouters diretamente do histórico
  const { data: scouterLocations, isLoading } = useQuery({
    queryKey: ["scouter-realtime-locations"],
    queryFn: async () => {
      console.log('🔄 Fetching latest scouter locations from history...');
      
      // Buscar a localização mais recente de cada scouter
      const { data, error } = await supabase
        .from('scouter_location_history')
        .select('scouter_bitrix_id, scouter_name, latitude, longitude, address, recorded_at')
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching locations:', error);
        throw error;
      }

      // Agrupar por scouter_bitrix_id e pegar apenas o mais recente
      const latestLocations = new Map<number, ScouterLocation>();
      
      data?.forEach((location) => {
        if (!latestLocations.has(location.scouter_bitrix_id)) {
          latestLocations.set(location.scouter_bitrix_id, {
            scouterBitrixId: location.scouter_bitrix_id,
            scouterName: location.scouter_name,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            recordedAt: location.recorded_at,
          });
        }
      });

      const locations = Array.from(latestLocations.values());
      console.log('✅ Found latest locations for', locations.length, 'scouters');
      return locations;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar histórico de localização do scouter selecionado
  useEffect(() => {
    if (!selectedScouter) {
      setLocationHistory([]);
      return;
    }

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('scouter_location_history')
        .select('latitude, longitude, address, recorded_at')
        .eq('scouter_bitrix_id', selectedScouter)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching location history:', error);
        toast({
          title: "Erro ao carregar histórico",
          description: "Não foi possível carregar o histórico de localizações",
          variant: "destructive"
        });
        return;
      }

      setLocationHistory(data || []);
    };

    fetchHistory();
  }, [selectedScouter]);

  // Monitor map performance
  const dataPoints = scouterLocations?.length || 0;
  useChartPerformance('leaflet', dataPoints, [scouterLocations]);

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Atualizar marcadores e rotas
  useEffect(() => {
    if (!mapRef.current || !scouterLocations) return;

    // Limpar marcadores e polylines antigos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    polylinesRef.current.forEach((polyline) => polyline.remove());
    polylinesRef.current.clear();

    // Criar ícone personalizado para scouter ativo
    const scouterIcon = L.divIcon({
      html: `
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    // Adicionar marcadores
    scouterLocations.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude], { icon: scouterIcon });

      const popupContent = `
        <div class="p-3 min-w-[250px]">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <span class="text-white font-bold text-sm">${location.scouterName[0].toUpperCase()}</span>
            </div>
            <div>
              <p class="font-bold text-sm">${location.scouterName}</p>
              <p class="text-xs text-gray-500">Scouter Ativo</p>
            </div>
          </div>
          <div class="space-y-1 text-xs text-gray-600 mt-3">
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
              ${location.address}
            </div>
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
              Última atualização: ${formatDistanceToNow(new Date(location.recordedAt), { 
                locale: ptBR,
                addSuffix: true 
              })}
            </div>
            <div class="flex items-center gap-1 mt-2 pt-2 border-t">
              <svg class="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.05 3.636l1.06-1.06 7.07 7.07-7.07 7.07-1.06-1.06L11.122 9.5z"/>
              </svg>
              <span class="font-semibold text-primary cursor-pointer hover:underline" onclick="window.dispatchEvent(new CustomEvent('show-timeline', { detail: ${location.scouterBitrixId} }))">Ver linha do tempo</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedScouter(location.scouterBitrixId));
      marker.addTo(mapRef.current!);
      markersRef.current.set(String(location.scouterBitrixId), marker);
    });

    // Ajustar bounds
    if (scouterLocations.length > 0) {
      const bounds = L.latLngBounds(scouterLocations.map(l => [l.latitude, l.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [scouterLocations]);

  // Desenhar linha do tempo quando scouter selecionado
  useEffect(() => {
    if (!mapRef.current || !selectedScouter || locationHistory.length === 0) {
      polylinesRef.current.forEach(polyline => polyline.remove());
      polylinesRef.current.clear();
      return;
    }

    // Criar polyline conectando os pontos
    const coordinates = locationHistory.map(loc => [loc.latitude, loc.longitude] as [number, number]);
    
    const polyline = L.polyline(coordinates, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 5',
      smoothFactor: 1
    }).addTo(mapRef.current);

    polylinesRef.current.set(selectedScouter, polyline);

    // Adicionar marcadores para histórico
    locationHistory.forEach((loc, index) => {
      const isFirst = index === 0;
      const isLast = index === locationHistory.length - 1;

      const historyIcon = L.divIcon({
        html: `
          <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white ${
            isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-blue-500'
          }">
            <span class="text-white text-xs font-bold">${index + 1}</span>
          </div>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: historyIcon })
        .bindPopup(`
          <div class="text-xs p-2">
            <p class="font-bold">${isFirst ? '📍 Posição Atual' : isLast ? '🔴 Início' : `Ponto ${index + 1}`}</p>
            <p class="text-gray-600 mt-1">${loc.address}</p>
            <p class="text-gray-500 mt-1">${formatDistanceToNow(new Date(loc.recorded_at), { locale: ptBR, addSuffix: true })}</p>
          </div>
        `)
        .addTo(mapRef.current!);
    });

    // Zoom para a rota
    mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });

  }, [selectedScouter, locationHistory]);

  const activeScouters = scouterLocations?.length || 0;
  const selectedScouterData = scouterLocations?.find(s => s.scouterBitrixId === selectedScouter);

  return (
    <div className="relative">
      {/* Timeline Sidebar */}
      {selectedScouter && selectedScouterData && (
        <ScouterTimeline
          scouterName={selectedScouterData.scouterName}
          locations={locationHistory}
          onClose={() => {
            setSelectedScouter(null);
            setLocationHistory([]);
          }}
        />
      )}

      {/* Estatísticas superiores */}
      <div className={`absolute top-4 z-[1000] flex gap-2 transition-all ${selectedScouter ? 'left-[340px]' : 'left-4'}`}>
        <Card className="p-3 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Scouters Ativos</div>
              <div className="text-2xl font-bold text-green-600">{activeScouters}</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Via Bitrix SPA</div>
              <div className="text-sm font-bold text-primary">Tempo Real</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Indicador de atualização */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Badge variant="secondary" className="bg-white/95 backdrop-blur shadow-lg gap-2">
          <Clock className="w-3 h-3 animate-pulse" />
          Atualização automática
        </Badge>
      </div>

      {/* Lista de scouters */}
      {scouterLocations && scouterLocations.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] max-w-xs max-h-96 overflow-y-auto">
          <Card className="p-4 bg-white/95 backdrop-blur shadow-lg">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Scouters em Campo
            </h3>
            <div className="space-y-2">
              {scouterLocations.map((location) => (
                <div
                  key={location.scouterBitrixId}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedScouter === location.scouterBitrixId
                      ? 'border-green-500 bg-green-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedScouter(location.scouterBitrixId);
                    const marker = markersRef.current.get(String(location.scouterBitrixId));
                    if (marker && mapRef.current) {
                      mapRef.current.setView([location.latitude, location.longitude], 15);
                      marker.openPopup();
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center relative">
                        <span className="text-white font-bold text-xs">
                          {location.scouterName[0].toUpperCase()}
                        </span>
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{location.scouterName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          ID: {location.scouterBitrixId}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(location.recordedAt), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

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
            <p className="text-sm text-muted-foreground">Carregando localizações...</p>
          </div>
        </div>
      )}

      {!isLoading && activeScouters === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-8">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum scouter ativo</h3>
            <p className="text-sm text-muted-foreground">
              Não há scouters com atividade recente no período selecionado
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
