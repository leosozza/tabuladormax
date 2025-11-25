import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MapPin, Clock, Navigation, Route } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useChartPerformance } from "@/lib/monitoring";
import { ScouterTimelineModal } from "./ScouterTimelineModal";
import { useToast } from "@/hooks/use-toast";

// Ícones personalizados para scouters
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});
interface ScouterLocation {
  scouterBitrixId: number;
  scouterName: string;
  latitude: number;
  longitude: number;
  address: string;
  recordedAt: string;
  photoUrl?: string;
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
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}
export default function ScouterLocationMap({
  center = [-15.7801, -47.9292],
  zoom = 12,
  projectId,
  scouterId,
  dateRange
}: ScouterLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [selectedScouterForTimeline, setSelectedScouterForTimeline] = useState<{
    bitrixId: number;
    name: string;
    photoUrl?: string;
  } | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationHistory[]>([]);
  const {
    toast
  } = useToast();

  // Buscar localizações mais recentes dos scouters diretamente do histórico
  const {
    data: scouterLocations,
    isLoading
  } = useQuery({
    queryKey: ["scouter-realtime-locations"],
    queryFn: async () => {
      console.log('🔄 Fetching latest scouter locations from history...');

      // Buscar a localização mais recente de cada scouter
      const {
        data,
        error
      } = await supabase.from('scouter_location_history').select('scouter_bitrix_id, scouter_name, latitude, longitude, address, recorded_at').order('recorded_at', {
        ascending: false
      });
      if (error) {
        console.error('❌ Error fetching locations:', error);
        throw error;
      }

      // Buscar fotos dos scouters
      const {
        data: spaEntities
      } = await supabase.from('bitrix_spa_entities').select('bitrix_item_id, photo_url').eq('entity_type_id', 1096);

      // Agrupar por scouter_bitrix_id e pegar apenas o mais recente
      const latestLocations = new Map<number, ScouterLocation>();
      data?.forEach(location => {
        if (!latestLocations.has(location.scouter_bitrix_id)) {
          const photoUrl = spaEntities?.find(e => e.bitrix_item_id === location.scouter_bitrix_id)?.photo_url;
          latestLocations.set(location.scouter_bitrix_id, {
            scouterBitrixId: location.scouter_bitrix_id,
            scouterName: location.scouter_name,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            recordedAt: location.recorded_at,
            photoUrl: photoUrl || undefined
          });
        }
      });
      const locations = Array.from(latestLocations.values());
      console.log('✅ Found latest locations for', locations.length, 'scouters');
      return locations;
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Buscar histórico quando modal abre
  useEffect(() => {
    if (!selectedScouterForTimeline) {
      setLocationHistory([]);
      return;
    }
    const fetchHistory = async () => {
      const {
        data,
        error
      } = await supabase.from('scouter_location_history').select('latitude, longitude, address, recorded_at').eq('scouter_bitrix_id', selectedScouterForTimeline.bitrixId).order('recorded_at', {
        ascending: false
      }).limit(20);
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
  }, [selectedScouterForTimeline]);

  // Monitor map performance
  const dataPoints = scouterLocations?.length || 0;
  useChartPerformance('leaflet', dataPoints, [scouterLocations]);

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
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

    // Limpar marcadores antigos
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

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
      iconAnchor: [20, 40]
    });

    // Adicionar marcadores
    scouterLocations.forEach(location => {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: scouterIcon
      });
      const popupContent = `
        <div class="p-3 min-w-[250px]">
          <div class="flex items-center gap-2 mb-2">
            ${location.photoUrl ? `<img src="${location.photoUrl}" class="w-10 h-10 rounded-full object-cover border-2 border-green-500" alt="${location.scouterName}" />` : `<div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span class="text-white font-bold">${location.scouterName[0].toUpperCase()}</span>
                </div>`}
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
            <button 
              class="w-full mt-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-xs font-medium flex items-center justify-center gap-2"
              onclick="window.dispatchEvent(new CustomEvent('view-scouter-timeline', { detail: { scouterBitrixId: ${location.scouterBitrixId}, scouterName: '${location.scouterName}', photoUrl: '${location.photoUrl || ''}' } }))"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Ver Rota
            </button>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);
      marker.addTo(mapRef.current!);
      markersRef.current.set(String(location.scouterBitrixId), marker);
    });

    // Ajustar bounds
    if (scouterLocations.length > 0) {
      const bounds = L.latLngBounds(scouterLocations.map(l => [l.latitude, l.longitude]));
      mapRef.current.fitBounds(bounds, {
        padding: [50, 50]
      });
    }
  }, [scouterLocations]);

  // Escutar evento de abrir timeline do popup
  useEffect(() => {
    const handleViewTimeline = (event: Event) => {
      const customEvent = event as CustomEvent;
      const {
        scouterBitrixId,
        scouterName,
        photoUrl
      } = customEvent.detail;
      setSelectedScouterForTimeline({
        bitrixId: scouterBitrixId,
        name: scouterName,
        photoUrl
      });
      setTimelineModalOpen(true);
    };
    window.addEventListener('view-scouter-timeline', handleViewTimeline);
    return () => window.removeEventListener('view-scouter-timeline', handleViewTimeline);
  }, []);
  const activeScouters = scouterLocations?.length || 0;
  return <div className="relative">
      {/* Timeline Modal */}
      <ScouterTimelineModal open={timelineModalOpen} onOpenChange={setTimelineModalOpen} scouterName={selectedScouterForTimeline?.name || "Scouter"} scouterPhotoUrl={selectedScouterForTimeline?.photoUrl} locations={locationHistory} />

      {/* Estatísticas superiores */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
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
      </div>

      {/* Indicador de atualização */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Badge variant="secondary" className="bg-white/95 backdrop-blur shadow-lg gap-2">
          <Clock className="w-3 h-3 animate-pulse" />
          Atualização automática
        </Badge>
      </div>

      {/* Lista de scouters */}
      {scouterLocations && scouterLocations.length > 0 && <div className="absolute bottom-4 right-4 z-[1000] max-w-xs max-h-96 overflow-y-auto">
          <Card className="p-4 bg-white/95 backdrop-blur shadow-lg">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Scouters em Campo
            </h3>
            <div className="space-y-2">
              {scouterLocations.map(location => <div key={location.scouterBitrixId} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => {
            // Apenas zoom no marcador
            const marker = markersRef.current.get(String(location.scouterBitrixId));
            if (marker && mapRef.current) {
              mapRef.current.setView([location.latitude, location.longitude], 15);
              marker.openPopup();
            }
          }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        {location.photoUrl ? <img src={location.photoUrl} alt={location.scouterName} className="w-8 h-8 rounded-full object-cover border-2 border-green-500" /> : <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                              {location.scouterName[0].toUpperCase()}
                            </span>
                          </div>}
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
                  addSuffix: true
                })}
                    </div>
                  </div>

                  <Button variant="outline" size="icon" className="mt-2" onClick={e => {
              e.stopPropagation();
              setSelectedScouterForTimeline({
                bitrixId: location.scouterBitrixId,
                name: location.scouterName,
                photoUrl: location.photoUrl
              });
              setTimelineModalOpen(true);
            }}>
                    <Route className="w-[13px] h-[13px]" />
                  </Button>
                </div>)}
            </div>
          </Card>
        </div>}

      {/* Mapa */}
      <div ref={containerRef} className="w-full h-full rounded-lg" style={{
      minHeight: "600px"
    }} />

      {isLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-[1001]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Carregando localizações...</p>
          </div>
        </div>}

      {!isLoading && activeScouters === 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-8">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum scouter ativo</h3>
            <p className="text-sm text-muted-foreground">
              Não há scouters com atividade recente no período selecionado
            </p>
          </div>
        </div>}
    </div>;
}