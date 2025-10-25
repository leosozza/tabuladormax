import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useChartPerformance } from "@/lib/monitoring";

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
  scouter: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  leadCount: number;
  address?: string;
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
  const [selectedScouter, setSelectedScouter] = useState<string | null>(null);

  // Buscar localizações dos scouters
  const { data: scouterLocations, isLoading } = useQuery({
    queryKey: ["scouter-locations", projectId, scouterId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("scouter, address, local_abordagem, criado, updated_at")
        .not("scouter", "is", null)
        .not("address", "is", null)
        .gte("criado", dateRange.startDate.toISOString())
        .lte("criado", dateRange.endDate.toISOString())
        .order("updated_at", { ascending: false });

      if (projectId) {
        query = query.eq("commercial_project_id", projectId);
      }

      if (scouterId) {
        query = query.eq("scouter", scouterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por scouter e pegar localização mais recente
      const scouterMap = new Map<string, any>();
      
      data?.forEach((lead) => {
        const scouter = lead.scouter!;
        if (!scouterMap.has(scouter) || 
            new Date(lead.updated_at!) > new Date(scouterMap.get(scouter).lastUpdate)) {
          scouterMap.set(scouter, {
            scouter,
            address: lead.address,
            localAbordagem: lead.local_abordagem,
            lastUpdate: lead.updated_at || lead.criado,
            leadCount: 0,
          });
        }
        const entry = scouterMap.get(scouter);
        entry.leadCount++;
      });

      // Geocodificar endereços (simulação - em produção usar API real)
      const locations: ScouterLocation[] = [];
      const baseCoords = { lat: -15.7801, lng: -47.9292 };
      
      Array.from(scouterMap.values()).forEach((entry, index) => {
        // Simular coordenadas diferentes para cada scouter
        const offset = 0.02;
        locations.push({
          scouter: entry.scouter,
          lat: baseCoords.lat + (Math.random() - 0.5) * offset,
          lng: baseCoords.lng + (Math.random() - 0.5) * offset,
          lastUpdate: entry.lastUpdate,
          leadCount: entry.leadCount,
          address: entry.localAbordagem || entry.address,
        });
      });

      return locations;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

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

  // Atualizar marcadores
  useEffect(() => {
    if (!mapRef.current || !scouterLocations) return;

    // Limpar marcadores antigos
    markersRef.current.forEach((marker) => marker.remove());
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
      iconAnchor: [20, 40],
    });

    // Adicionar marcadores
    scouterLocations.forEach((location) => {
      const marker = L.marker([location.lat, location.lng], { icon: scouterIcon });

      const popupContent = `
        <div class="p-3 min-w-[250px]">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <span class="text-white font-bold text-sm">${location.scouter[0].toUpperCase()}</span>
            </div>
            <div>
              <p class="font-bold text-sm">${location.scouter}</p>
              <p class="text-xs text-gray-500">Scouter Ativo</p>
            </div>
          </div>
          <div class="space-y-1 text-xs text-gray-600 mt-3">
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
              ${location.address || 'Localização não especificada'}
            </div>
            <div class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
              Última atualização: ${formatDistanceToNow(new Date(location.lastUpdate), { 
                locale: ptBR,
                addSuffix: true 
              })}
            </div>
            <div class="flex items-center gap-1 mt-2 pt-2 border-t">
              <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              <span class="font-semibold text-blue-600">${location.leadCount} leads capturados</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedScouter(location.scouter));
      marker.addTo(mapRef.current!);
      markersRef.current.set(location.scouter, marker);
    });

    // Ajustar bounds
    if (scouterLocations.length > 0) {
      const bounds = L.latLngBounds(scouterLocations.map(l => [l.lat, l.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [scouterLocations]);

  const activeScouters = scouterLocations?.length || 0;
  const totalLeads = scouterLocations?.reduce((sum, s) => sum + s.leadCount, 0) || 0;

  return (
    <div className="relative">
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

        <Card className="p-3 bg-white/95 backdrop-blur shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Leads Capturados</div>
              <div className="text-2xl font-bold text-blue-600">{totalLeads}</div>
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
                  key={location.scouter}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedScouter === location.scouter
                      ? 'border-green-500 bg-green-50'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedScouter(location.scouter);
                    const marker = markersRef.current.get(location.scouter);
                    if (marker && mapRef.current) {
                      mapRef.current.setView([location.lat, location.lng], 15);
                      marker.openPopup();
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center relative">
                        <span className="text-white font-bold text-xs">
                          {location.scouter[0].toUpperCase()}
                        </span>
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{location.scouter}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {location.leadCount} leads
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(location.lastUpdate), {
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
