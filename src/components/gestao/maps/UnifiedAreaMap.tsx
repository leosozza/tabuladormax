import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet.heat";
import "@/styles/leaflet-zindex.css";
import * as turf from "@turf/turf";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2, Save, Square, FileDown, FileSpreadsheet, Eye, EyeOff, Radio, Clock, Route, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { filterItemsInPolygons, leafletToTurfPolygon } from "@/utils/polygonUtils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRealtimeLeads } from "@/hooks/useRealtimeLeads";
import { ScouterTimelineModal, LocationPoint } from "./ScouterTimelineModal";
import { useToast } from "@/hooks/use-toast";
import { useTrafficLayer } from "@/hooks/useTrafficLayer";
import { useWeatherLayer } from "@/hooks/useWeatherLayer";
import { TrafficLegend } from "./TrafficLegend";
import { WeatherLegend } from "./WeatherLegend";

// Ícones padrão do Leaflet
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export interface LeadMapLocation {
  id: number;
  name: string;
  nomeModelo?: string;
  lat: number;
  lng: number;
  status?: string;
  scouter?: string;
  address?: string;
  responsible?: string;
  hasPhoto?: boolean;
  projectName?: string;
  fichaConfirmada?: boolean;
  dataFicha?: string;
}

export interface DrawnArea {
  id: string;
  name: string;
  bounds: L.LatLng[];
  leadCount: number;
  selected?: boolean;
  color?: string;
  polygon?: L.Polygon;
}

interface ScouterLocation {
  scouterBitrixId: number;
  scouterName: string;
  latitude: number;
  longitude: number;
  address: string;
  recordedAt: string;
  photoUrl?: string;
}

interface FichaLocation {
  lat: number;
  lng: number;
  value: number;
  name: string;
  scouter: string;
  confirmed: boolean;
  presenca_confirmada: boolean;
}

interface UnifiedAreaMapProps {
  center?: [number, number];
  zoom?: number;
  projectId?: string | null;
  scouterId?: string | null;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  showScouters: boolean;
  showHeatmap: boolean;
  showLeads: boolean;
  showTraffic?: boolean;
  showWeather?: boolean;
  isDrawing: boolean;
  onDrawingChange: (isDrawing: boolean) => void;
  onAreaCreated?: (area: DrawnArea) => void;
  onAreaDeleted?: (areaId: string) => void;
  onAreasSelectionChanged?: (selectedAreas: DrawnArea[], filteredLeads: LeadMapLocation[]) => void;
  // Props expostas para controle externo do desenho
  drawMode?: 'polygon' | 'rectangle';
  onDrawModeChange?: (mode: 'polygon' | 'rectangle') => void;
  onFinishDrawing?: () => void;
  onCancelDrawing?: () => void;
  drawingPointsCount?: number;
  onDrawingPointsCountChange?: (count: number) => void;
  isFullscreen?: boolean;
  onMapCenterChange?: (lat: number, lng: number) => void;
  onMapReady?: (map: L.Map | null) => void;
}

export default function UnifiedAreaMap({
  center = [-15.7801, -47.9292],
  zoom = 12,
  projectId,
  scouterId,
  dateRange,
  showScouters,
  showHeatmap,
  showLeads,
  showTraffic = false,
  showWeather = false,
  isDrawing,
  onDrawingChange,
  onAreaCreated,
  onAreaDeleted,
  onAreasSelectionChanged,
  drawMode: externalDrawMode,
  onDrawModeChange,
  onFinishDrawing,
  onCancelDrawing,
  onDrawingPointsCountChange,
  isFullscreen = false,
  onMapCenterChange,
  onMapReady,
}: UnifiedAreaMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
  // Layer groups para cada tipo
  const scoutersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatmapLayerRef = useRef<any>(null);
  const leadsLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const areasLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Estado de desenho - usa props externas se disponíveis
  const [internalDrawMode, setInternalDrawMode] = useState<'polygon' | 'rectangle'>('polygon');
  const drawMode = externalDrawMode ?? internalDrawMode;
  const setDrawMode = (mode: 'polygon' | 'rectangle') => {
    setInternalDrawMode(mode);
    onDrawModeChange?.(mode);
  };
  const [drawingPoints, setDrawingPointsInternal] = useState<L.LatLng[]>([]);
  const setDrawingPoints = (points: L.LatLng[] | ((prev: L.LatLng[]) => L.LatLng[])) => {
    setDrawingPointsInternal(prev => {
      const newPoints = typeof points === 'function' ? points(prev) : points;
      onDrawingPointsCountChange?.(newPoints.length);
      return newPoints;
    });
  };
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const currentPolygonRef = useRef<L.Polyline | L.Rectangle | null>(null);
  const polygonRefsRef = useRef<Map<string, L.Polygon>>(new Map());
  const rectangleStartRef = useRef<L.LatLng | null>(null);
  
  // Refs para expor funções
  const finishDrawingRef = useRef<() => void>(() => {});
  const cancelDrawingRef = useRef<() => void>(() => {});
  
  // Timeline modal state
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [selectedScouterForTimeline, setSelectedScouterForTimeline] = useState<{
    bitrixId: number;
    name: string;
    photoUrl?: string;
  } | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [isScouterListExpanded, setIsScouterListExpanded] = useState(true);
  
  const { toast } = useToast();
  
  // Real-time updates
  const { updates: realtimeUpdates, clearUpdates, isConnected } = useRealtimeLeads({
    enabled: showHeatmap,
    projectId,
    scouterId,
  });

  // Traffic layer - use mapInstance state to trigger re-render when map is ready
  const { isTomTomMapActive } = useTrafficLayer({ map: mapInstance, enabled: showTraffic });

  // Weather radar layer
  const { isLoading: isWeatherLoading, lastUpdate: weatherLastUpdate } = useWeatherLayer({ 
    map: mapInstance, 
    enabled: showWeather 
  });

  const polygonColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Handler para abrir timeline de um scouter
  const handleOpenTimeline = async (bitrixId: number, name: string, photoUrl?: string) => {
    setSelectedScouterForTimeline({ bitrixId, name, photoUrl });
    
    try {
      // 1. Buscar histórico de localizações
      const { data: history, error } = await supabase
        .from('scouter_location_history')
        .select('latitude, longitude, address, recorded_at')
        .eq('scouter_bitrix_id', bitrixId)
        .gte('recorded_at', dateRange.startDate.toISOString())
        .lte('recorded_at', dateRange.endDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      // 2. Buscar leads do scouter no período
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, nome_modelo, criado')
        .eq('scouter', name)
        .gte('criado', dateRange.startDate.toISOString())
        .lte('criado', dateRange.endDate.toISOString())
        .order('criado', { ascending: false })
        .limit(100);

      // 3. Associar leads aos pontos por proximidade de tempo (±2 minutos)
      const formattedHistory = (history || []).map(loc => {
        const locTime = new Date(loc.recorded_at).getTime();
        const matchingLead = leads?.find(lead => {
          if (!lead.criado) return false;
          const leadTime = new Date(lead.criado).getTime();
          const timeDiff = Math.abs(locTime - leadTime);
          return timeDiff <= 2 * 60 * 1000; // 2 minutos
        });
        
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address || 'Endereço não disponível',
          recorded_at: loc.recorded_at,
          lead_id: matchingLead?.id,
          lead_name: matchingLead?.name || undefined,
          nome_modelo: matchingLead?.nome_modelo || undefined
        };
      });

      setLocationHistory(formattedHistory);
      setTimelineModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de localizações",
        variant: "destructive",
      });
    }
  };

  // Escutar evento de abrir timeline do popup
  useEffect(() => {
    const handleViewTimeline = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { scouterBitrixId, scouterName, photoUrl } = customEvent.detail;
      handleOpenTimeline(scouterBitrixId, scouterName, photoUrl);
    };
    window.addEventListener('view-scouter-timeline', handleViewTimeline);
    return () => window.removeEventListener('view-scouter-timeline', handleViewTimeline);
  }, []);

  // Buscar leads para marcadores
  const { data: leadsData } = useQuery({
    queryKey: ["unified-map-leads", projectId, scouterId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, nome_modelo, address, latitude, longitude, scouter, etapa, responsible, photo_url, cadastro_existe_foto, projeto_comercial, ficha_confirmada, criado")
        .gte("criado", dateRange.startDate.toISOString())
        .lte("criado", dateRange.endDate.toISOString())
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (projectId) query = query.eq("commercial_project_id", projectId);
      if (scouterId) query = query.eq("scouter", scouterId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(lead => ({
        id: lead.id,
        name: lead.name || "Sem nome",
        nomeModelo: lead.nome_modelo,
        lat: Number(lead.latitude),
        lng: Number(lead.longitude),
        status: lead.etapa,
        scouter: lead.scouter,
        address: lead.address,
        responsible: lead.responsible,
        hasPhoto: lead.cadastro_existe_foto || !!lead.photo_url,
        projectName: lead.projeto_comercial,
        fichaConfirmada: lead.ficha_confirmada,
        dataFicha: lead.criado,
      }));
    },
    enabled: showLeads,
  });

  // Buscar scouters em tempo real
  const { data: scouterLocations } = useQuery({
    queryKey: ["unified-map-scouters", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scouter_location_history')
        .select('scouter_bitrix_id, scouter_name, latitude, longitude, address, recorded_at')
        .gte('recorded_at', dateRange.startDate.toISOString())
        .lte('recorded_at', dateRange.endDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      const { data: spaEntities } = await supabase
        .from('bitrix_spa_entities')
        .select('bitrix_item_id, photo_url')
        .eq('entity_type_id', 1096);

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

      return Array.from(latestLocations.values());
    },
    enabled: showScouters,
    refetchInterval: 30000,
  });

  // Buscar fichas para heatmap
  const { data: fichasData } = useQuery({
    queryKey: ["unified-map-fichas", projectId, scouterId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, address, latitude, longitude, scouter, ficha_confirmada, presenca_confirmada")
        .gte("data_criacao_ficha", dateRange.startDate.toISOString())
        .lte("data_criacao_ficha", dateRange.endDate.toISOString())
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (projectId) query = query.eq("commercial_project_id", projectId);
      if (scouterId) query = query.eq("scouter", scouterId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(ficha => ({
        lat: Number(ficha.latitude),
        lng: Number(ficha.longitude),
        value: ficha.presenca_confirmada ? 2 : 1,
        name: ficha.name || "Sem nome",
        scouter: ficha.scouter || "Sem scouter",
        confirmed: ficha.ficha_confirmada,
        presenca_confirmada: ficha.presenca_confirmada || false,
      }));
    },
    enabled: showHeatmap,
  });

  // Filtered leads based on selected areas
  const filteredLeads = useMemo(() => {
    if (!leadsData || selectedAreaIds.size === 0) return leadsData || [];
    
    const selectedAreas = drawnAreas.filter(area => selectedAreaIds.has(area.id));
    const selectedPolygons = selectedAreas.map(area => leafletToTurfPolygon(area.bounds));
    
    return filterItemsInPolygons(leadsData, selectedPolygons);
  }, [leadsData, drawnAreas, selectedAreaIds]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onAreasSelectionChanged && leadsData) {
      const selectedAreas = drawnAreas.filter(area => selectedAreaIds.has(area.id));
      onAreasSelectionChanged(selectedAreas, filteredLeads);
    }
  }, [selectedAreaIds, drawnAreas, filteredLeads, onAreasSelectionChanged, leadsData]);

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    // Criar layer groups
    areasLayerRef.current = L.layerGroup().addTo(mapRef.current);
    heatmapLayerRef.current = L.layerGroup();
    
    scoutersLayerRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      disableClusteringAtZoom: 14,
    });
    
    leadsLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 80,
    });

    // Set map instance state to trigger hooks that depend on it
    setMapInstance(mapRef.current);
    onMapReady?.(mapRef.current);

    // Emit initial center
    onMapCenterChange?.(center[0], center[1]);

    // Listen to map move for weather updates
    mapRef.current.on('moveend', () => {
      const mapCenter = mapRef.current?.getCenter();
      if (mapCenter) {
        onMapCenterChange?.(mapCenter.lat, mapCenter.lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapInstance(null);
        onMapReady?.(null);
      }
    };
  }, []);

  // Atualizar tamanho do mapa quando fullscreen muda
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [isFullscreen]);

  // Funções de desenho
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!isDrawing || !mapRef.current) return;

    const newPoint = e.latlng;

    if (drawMode === 'rectangle') {
      if (!rectangleStartRef.current) {
        rectangleStartRef.current = newPoint;
        setDrawingPoints([newPoint]);
      } else {
        const bounds = L.latLngBounds(rectangleStartRef.current, newPoint);
        const rectanglePoints = [
          bounds.getSouthWest(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthEast(),
        ];
        setDrawingPoints(rectanglePoints);
        finishDrawingRectangle(rectanglePoints);
        rectangleStartRef.current = null;
      }
    } else {
      setDrawingPoints(prev => [...prev, newPoint]);

      if (currentPolygonRef.current) {
        mapRef.current.removeLayer(currentPolygonRef.current);
      }

      const allPoints = [...drawingPoints, newPoint];
      currentPolygonRef.current = L.polyline(allPoints, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 5'
      }).addTo(mapRef.current);
    }
  };

  // Adicionar/remover event listener do mapa baseado no estado de desenho
  useEffect(() => {
    if (!mapRef.current) return;

    if (isDrawing) {
      mapRef.current.on('click', handleMapClick);
    } else {
      mapRef.current.off('click', handleMapClick);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [isDrawing, drawMode, drawingPoints]);

  // Atualizar layer de scouters
  useEffect(() => {
    if (!mapRef.current || !scoutersLayerRef.current) return;

    // Remover do mapa se não deve mostrar
    if (!showScouters) {
      mapRef.current.removeLayer(scoutersLayerRef.current);
      return;
    }

    // Adicionar ao mapa
    if (!mapRef.current.hasLayer(scoutersLayerRef.current)) {
      mapRef.current.addLayer(scoutersLayerRef.current);
    }

    // Limpar e recriar marcadores
    scoutersLayerRef.current.clearLayers();

    scouterLocations?.forEach(location => {
      const scouterIcon = L.divIcon({
        html: location.photoUrl 
          ? `
            <div class="relative">
              <div class="w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-white">
                <img src="${location.photoUrl}" class="w-full h-full object-cover" alt="${location.scouterName}" />
              </div>
              <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          `
          : `
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
                <span class="text-white font-bold text-sm">${location.scouterName[0].toUpperCase()}</span>
              </div>
              <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          `,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const marker = L.marker([location.latitude, location.longitude], { icon: scouterIcon });
      
      // Contar fichas do scouter baseado nos dados carregados
      const scouterLeadCount = fichasData?.filter(f => 
        f.scouter?.toLowerCase() === location.scouterName.toLowerCase()
      ).length || 0;
      
      const popupContent = `
        <div class="p-2 w-[180px] max-w-[calc(100vw-60px)]">
          <div class="flex items-center gap-2 mb-2">
            ${location.photoUrl ? `<img src="${location.photoUrl}" class="w-8 h-8 rounded-full object-cover" />` : ''}
            <div class="min-w-0">
              <p class="font-bold text-xs truncate">${location.scouterName}</p>
              <p class="text-[10px] text-gray-500">Scouter Ativo</p>
            </div>
          </div>
          <div class="text-[10px] text-gray-600 mt-1 space-y-0.5">
            <p class="truncate">📍 ${location.address}</p>
            <p>🕐 ${formatDistanceToNow(new Date(location.recordedAt), { locale: ptBR, addSuffix: true })}</p>
            ${scouterLeadCount > 0 ? `<p class="font-semibold text-green-600">📋 ${scouterLeadCount} ficha${scouterLeadCount !== 1 ? 's' : ''}</p>` : ''}
          </div>
          <button 
            class="w-full mt-2 px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
            onclick="window.dispatchEvent(new CustomEvent('view-scouter-timeline', { detail: { scouterBitrixId: ${location.scouterBitrixId}, scouterName: '${location.scouterName.replace(/'/g, "\\'")}', photoUrl: '${location.photoUrl || ''}' } }))"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Histórico
          </button>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      scoutersLayerRef.current!.addLayer(marker);
    });
  }, [showScouters, scouterLocations, fichasData]);

  // Atualizar layer de heatmap com gradientes reais (estilo trânsito)
  useEffect(() => {
    if (!mapRef.current) return;

    // Remover heatmap anterior se existir
    if (heatmapLayerRef.current) {
      mapRef.current.removeLayer(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }

    if (!showHeatmap || !fichasData || fichasData.length === 0) {
      return;
    }

    // Preparar dados para heatmap real
    // Formato: [lat, lng, intensidade]
    const heatPoints: [number, number, number][] = fichasData.map(ficha => [
      ficha.lat,
      ficha.lng,
      ficha.value || 1
    ]);

    // Criar heatmap real com gradientes contínuos
    // @ts-ignore - leaflet.heat extends L
    heatmapLayerRef.current = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
      gradient: {
        0.0: '#3b82f6',  // Azul
        0.25: '#06b6d4', // Ciano
        0.5: '#84cc16',  // Lima
        0.75: '#eab308', // Amarelo
        1.0: '#ef4444'   // Vermelho
      }
    }).addTo(mapRef.current);

  }, [showHeatmap, fichasData]);

  // Atualizar layer de leads
  useEffect(() => {
    if (!mapRef.current || !leadsLayerRef.current) return;

    if (!showLeads) {
      mapRef.current.removeLayer(leadsLayerRef.current);
      return;
    }

    if (!mapRef.current.hasLayer(leadsLayerRef.current)) {
      mapRef.current.addLayer(leadsLayerRef.current);
    }

    leadsLayerRef.current.clearLayers();

    const leadsToShow = selectedAreaIds.size > 0 ? filteredLeads : (leadsData || []);
    
    leadsToShow.forEach(lead => {
      // Cor do marcador baseado em ficha confirmada (verde=confirmada, cinza=não)
      const markerColor = lead.fichaConfirmada ? '#22c55e' : '#9ca3af';
      
      const leadIcon = L.divIcon({
        html: `
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background-color: ${markerColor};
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      
      const marker = L.marker([lead.lat, lead.lng], { icon: leadIcon });
      
      // Indicadores visuais
      const photoIndicator = lead.hasPhoto 
        ? '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6" title="Com foto"></span>'
        : '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#d1d5db" title="Sem foto"></span>';
        
      const fichaIndicator = lead.fichaConfirmada
        ? '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e" title="Ficha confirmada"></span>'
        : '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#d1d5db" title="Ficha não confirmada"></span>';
      
      // Formatar data/hora
      const dataFormatada = lead.dataFicha 
        ? new Date(lead.dataFicha).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : null;

      const popupContent = `
        <div style="padding:12px;min-width:250px;font-family:system-ui,-apple-system,sans-serif">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px">ID: ${lead.id}</p>
          <p style="font-weight:700;font-size:18px;margin:0 0 2px;color:#111827">${lead.nomeModelo || lead.name}</p>
          ${(lead.nomeModelo && lead.name) || lead.responsible 
            ? `<p style="font-size:13px;color:#6b7280;margin:0 0 8px">${lead.responsible || lead.name}</p>` 
            : ''}
          ${lead.projectName ? `<p style="font-size:12px;color:#374151;margin:0 0 4px"><span style="font-weight:500">Projeto:</span> ${lead.projectName}</p>` : ''}
          ${lead.scouter ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px"><span style="font-weight:500">Scouter:</span> ${lead.scouter}</p>` : ''}
          ${dataFormatada 
            ? `<p style="font-size:12px;color:#374151;margin:0 0 8px"><span style="font-weight:500">📅 Data:</span> ${dataFormatada}</p>` 
            : ''}
          <div style="display:flex;align-items:center;gap:16px;padding-top:8px;border-top:1px solid #e5e7eb">
            <div style="display:flex;align-items:center;gap:4px">
              ${photoIndicator}
              <span style="font-size:11px;color:#6b7280">Foto</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              ${fichaIndicator}
              <span style="font-size:11px;color:#6b7280">Ficha Confirmada</span>
            </div>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      leadsLayerRef.current!.addLayer(marker);
    });

    if (leadsToShow.length > 0) {
      const bounds = L.latLngBounds(leadsToShow.map(l => [l.lat, l.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [showLeads, leadsData, filteredLeads, selectedAreaIds]);

  const finishDrawingRectangle = (rectanglePoints: L.LatLng[]) => {
    if (!mapRef.current || !areasLayerRef.current || !leadsData) return;

    const areaId = `area-${Date.now()}`;
    const color = polygonColors[drawnAreas.length % polygonColors.length];

    const polygon = L.polygon(rectanglePoints, {
      color: color,
      weight: 2,
      fillOpacity: 0.2
    });

    const polygonCoords = rectanglePoints.map(p => [p.lng, p.lat]);
    polygonCoords.push(polygonCoords[0]);
    const turfPolygon = turf.polygon([polygonCoords]);

    const leadsInArea = leadsData.filter(lead => {
      const point = turf.point([lead.lng, lead.lat]);
      return turf.booleanPointInPolygon(point, turfPolygon);
    });

    const newArea: DrawnArea = {
      id: areaId,
      name: `Área ${drawnAreas.length + 1}`,
      bounds: rectanglePoints,
      leadCount: leadsInArea.length,
      selected: true,
      color: color,
      polygon: polygon
    };

    polygon.bindPopup(`
      <div class="p-2">
        <p class="font-bold">${newArea.name}</p>
        <p class="text-sm">${newArea.leadCount} leads nesta área</p>
      </div>
    `);

    polygon.on('click', () => toggleAreaSelection(areaId));
    polygon.addTo(areasLayerRef.current);
    polygonRefsRef.current.set(areaId, polygon);
    
    setDrawnAreas(prev => [...prev, newArea]);
    setSelectedAreaIds(prev => new Set([...prev, areaId]));
    
    if (onAreaCreated) onAreaCreated(newArea);
    
    onDrawingChange(false);
    setDrawingPoints([]);
    rectangleStartRef.current = null;
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3 || !mapRef.current || !areasLayerRef.current || !leadsData) {
      cancelDrawing();
      return;
    }

    const areaId = `area-${Date.now()}`;
    const color = polygonColors[drawnAreas.length % polygonColors.length];

    const polygon = L.polygon(drawingPoints, {
      color: color,
      weight: 2,
      fillOpacity: 0.2
    });

    const polygonCoords = drawingPoints.map(p => [p.lng, p.lat]);
    polygonCoords.push(polygonCoords[0]);
    const turfPolygon = turf.polygon([polygonCoords]);

    const leadsInArea = leadsData.filter(lead => {
      const point = turf.point([lead.lng, lead.lat]);
      return turf.booleanPointInPolygon(point, turfPolygon);
    });

    const newArea: DrawnArea = {
      id: areaId,
      name: `Área ${drawnAreas.length + 1}`,
      bounds: drawingPoints,
      leadCount: leadsInArea.length,
      selected: true,
      color: color,
      polygon: polygon
    };

    polygon.bindPopup(`
      <div class="p-2">
        <p class="font-bold">${newArea.name}</p>
        <p class="text-sm">${newArea.leadCount} leads nesta área</p>
      </div>
    `);

    polygon.on('click', () => toggleAreaSelection(areaId));
    polygon.addTo(areasLayerRef.current);
    polygonRefsRef.current.set(areaId, polygon);
    
    setDrawnAreas(prev => [...prev, newArea]);
    setSelectedAreaIds(prev => new Set([...prev, areaId]));
    
    if (onAreaCreated) onAreaCreated(newArea);
    
    if (currentPolygonRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
    
    onDrawingChange(false);
    setDrawingPoints([]);
  };

  const cancelDrawing = () => {
    onDrawingChange(false);
    setDrawingPoints([]);
    rectangleStartRef.current = null;
    if (currentPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  // Registrar funções via window para controle externo
  useEffect(() => {
    (window as any).__mapFinishDrawing = finishDrawing;
    (window as any).__mapCancelDrawing = cancelDrawing;
    return () => {
      delete (window as any).__mapFinishDrawing;
      delete (window as any).__mapCancelDrawing;
    };
  });

  const toggleAreaSelection = (areaId: string) => {
    setSelectedAreaIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });

    const polygon = polygonRefsRef.current.get(areaId);
    if (polygon) {
      const isSelected = !selectedAreaIds.has(areaId);
      polygon.setStyle({
        fillOpacity: isSelected ? 0.3 : 0.1,
        weight: isSelected ? 3 : 2,
        dashArray: isSelected ? undefined : '5, 5'
      });
    }
  };

  const deleteArea = (areaId: string) => {
    const polygon = polygonRefsRef.current.get(areaId);
    if (polygon && mapRef.current) {
      mapRef.current.removeLayer(polygon);
      polygonRefsRef.current.delete(areaId);
    }

    setDrawnAreas(prev => prev.filter(a => a.id !== areaId));
    setSelectedAreaIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(areaId);
      return newSet;
    });

    if (onAreaDeleted) onAreaDeleted(areaId);
  };

  return (
    <div className={`relative ${isFullscreen ? 'h-full' : ''}`}>
      {/* Traffic Legend */}
      <TrafficLegend isVisible={showTraffic && isTomTomMapActive} />

      {/* Weather Radar Legend */}
      <WeatherLegend 
        isVisible={showWeather} 
        lastUpdate={weatherLastUpdate}
        isLoading={isWeatherLoading}
      />

      {/* Timeline Modal */}
      <ScouterTimelineModal
        open={timelineModalOpen}
        onOpenChange={setTimelineModalOpen}
        scouterName={selectedScouterForTimeline?.name || "Scouter"}
        scouterPhotoUrl={selectedScouterForTimeline?.photoUrl}
        locations={locationHistory}
      />

      {/* Indicadores superiores */}
      <div className="absolute top-4 right-4 z-[450] flex gap-2">
        {showScouters && scouterLocations && (
          <Badge variant="secondary" className="bg-white/95 backdrop-blur shadow-lg gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {scouterLocations.length} Scouters em campo
          </Badge>
        )}
        {showHeatmap && fichasData && (
          <Badge variant="default" className="bg-green-600 shadow-lg gap-2">
            <Radio className="w-3 h-3 animate-pulse" />
            {fichasData.length} Fichas
          </Badge>
        )}
      </div>

      {/* Áreas desenhadas */}
      {drawnAreas.length > 0 && (
        <Card className="absolute bottom-4 left-4 z-[450] p-4 bg-white/95 backdrop-blur shadow-lg max-w-xs max-h-96 overflow-y-auto">
          <h3 className="font-bold text-sm mb-3">Áreas Desenhadas ({drawnAreas.length})</h3>
          <div className="space-y-2">
            {drawnAreas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between p-2 rounded border"
                style={{ borderColor: area.color }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: area.color }}
                  />
                  <div>
                    <p className="text-xs font-medium">{area.name}</p>
                    <p className="text-xs text-muted-foreground">{area.leadCount} leads</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleAreaSelection(area.id)}
                  >
                    {selectedAreaIds.has(area.id) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteArea(area.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lista de Scouters em Campo */}
      {showScouters && scouterLocations && scouterLocations.length > 0 && (
        <Card className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-[450] p-2 sm:p-4 bg-white/95 backdrop-blur shadow-lg w-44 sm:w-72 max-h-[50vh] overflow-hidden flex flex-col-reverse">
          <h3 
            className="font-bold text-xs sm:text-sm mt-2 sm:mt-3 flex items-center justify-between cursor-pointer"
            onClick={() => setIsScouterListExpanded(!isScouterListExpanded)}
          >
            <span className="flex items-center gap-1 sm:gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span className="truncate">Scouters ({scouterLocations.length})</span>
            </span>
            {isScouterListExpanded ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
          </h3>
          
          {isScouterListExpanded && (
            <div className="space-y-1 sm:space-y-2 max-h-[calc(50vh-4rem)] overflow-y-auto">
              {scouterLocations.map(location => (
                <div 
                  key={location.scouterBitrixId} 
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setView([location.latitude, location.longitude], 16, { animate: true });
                    }
                  }}
                >
                  {/* Avatar */}
                  {location.photoUrl ? (
                    <img 
                      src={location.photoUrl} 
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-green-500" 
                      alt={location.scouterName}
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-500 flex items-center justify-center border-2 border-green-600">
                      <span className="text-white text-[10px] sm:text-xs font-bold">{location.scouterName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium truncate">{location.scouterName}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(location.recordedAt), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  
                  {/* Botão Ver Rota */}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTimeline(location.scouterBitrixId, location.scouterName, location.photoUrl);
                    }}
                    title="Ver Rota"
                  >
                    <Route className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}


      {/* Mapa */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: isFullscreen ? "100%" : "600px", height: isFullscreen ? "100%" : undefined }}
      />
    </div>
  );
}
