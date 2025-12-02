import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
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
import { ScouterTimelineModal } from "./ScouterTimelineModal";
import { useToast } from "@/hooks/use-toast";

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
  lat: number;
  lng: number;
  status?: string;
  scouter?: string;
  address?: string;
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
  isDrawing: boolean;
  onDrawingChange: (isDrawing: boolean) => void;
  onAreaCreated?: (area: DrawnArea) => void;
  onAreaDeleted?: (areaId: string) => void;
  onAreasSelectionChanged?: (selectedAreas: DrawnArea[], filteredLeads: LeadMapLocation[]) => void;
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
  isDrawing,
  onDrawingChange,
  onAreaCreated,
  onAreaDeleted,
  onAreasSelectionChanged,
}: UnifiedAreaMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Layer groups para cada tipo
  const scoutersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const leadsLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const areasLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Estado de desenho
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle'>('polygon');
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const currentPolygonRef = useRef<L.Polyline | L.Rectangle | null>(null);
  const polygonRefsRef = useRef<Map<string, L.Polygon>>(new Map());
  const rectangleStartRef = useRef<L.LatLng | null>(null);
  
  // Timeline modal state
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [selectedScouterForTimeline, setSelectedScouterForTimeline] = useState<{
    bitrixId: number;
    name: string;
    photoUrl?: string;
  } | null>(null);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [isScouterListExpanded, setIsScouterListExpanded] = useState(true);
  
  const { toast } = useToast();
  
  // Real-time updates
  const { updates: realtimeUpdates, clearUpdates, isConnected } = useRealtimeLeads({
    enabled: showHeatmap,
    projectId,
    scouterId,
  });

  const polygonColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Handler para abrir timeline de um scouter
  const handleOpenTimeline = async (bitrixId: number, name: string, photoUrl?: string) => {
    setSelectedScouterForTimeline({ bitrixId, name, photoUrl });
    
    try {
      const { data: history, error } = await supabase
        .from('scouter_location_history')
        .select('latitude, longitude, address, recorded_at')
        .eq('scouter_bitrix_id', bitrixId)
        .gte('recorded_at', dateRange.startDate.toISOString())
        .lte('recorded_at', dateRange.endDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      const formattedHistory = (history || []).map(loc => ({
        lat: loc.latitude,
        lng: loc.longitude,
        address: loc.address || 'Endereço não disponível',
        recorded_at: loc.recorded_at,
      }));

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

  // Buscar leads para marcadores
  const { data: leadsData } = useQuery({
    queryKey: ["unified-map-leads", projectId, scouterId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, address, latitude, longitude, scouter, etapa")
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
        lat: Number(lead.latitude),
        lng: Number(lead.longitude),
        status: lead.etapa,
        scouter: lead.scouter,
        address: lead.address,
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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
      
      const popupContent = `
        <div class="p-3 min-w-[250px]">
          <div class="flex items-center gap-2 mb-2">
            ${location.photoUrl ? `<img src="${location.photoUrl}" class="w-10 h-10 rounded-full object-cover" />` : ''}
            <div>
              <p class="font-bold text-sm">${location.scouterName}</p>
              <p class="text-xs text-gray-500">Scouter Ativo</p>
            </div>
          </div>
          <div class="text-xs text-gray-600 mt-2">
            <p>📍 ${location.address}</p>
            <p>🕐 ${formatDistanceToNow(new Date(location.recordedAt), { locale: ptBR, addSuffix: true })}</p>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      scoutersLayerRef.current!.addLayer(marker);
    });
  }, [showScouters, scouterLocations]);

  // Atualizar layer de heatmap
  useEffect(() => {
    if (!mapRef.current || !heatmapLayerRef.current) return;

    if (!showHeatmap) {
      mapRef.current.removeLayer(heatmapLayerRef.current);
      return;
    }

    if (!mapRef.current.hasLayer(heatmapLayerRef.current)) {
      mapRef.current.addLayer(heatmapLayerRef.current);
    }

    heatmapLayerRef.current.clearLayers();

    if (!fichasData) return;

    // Criar grid de calor
    const gridSize = 0.005;
    const heatGrid = new Map<string, { count: number; lat: number; lng: number; fichas: FichaLocation[] }>();

    fichasData.forEach((ficha) => {
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

    const maxCount = Math.max(...Array.from(heatGrid.values()).map((c) => c.count));

    heatGrid.forEach((cell) => {
      const intensity = cell.count / maxCount;
      const radius = 200 + intensity * 300;
      
      let color;
      if (intensity < 0.33) {
        color = `rgba(59, 130, 246, ${0.3 + intensity * 0.4})`;
      } else if (intensity < 0.66) {
        color = `rgba(251, 191, 36, ${0.4 + intensity * 0.4})`;
      } else {
        color = `rgba(239, 68, 68, ${0.5 + intensity * 0.4})`;
      }

      const circle = L.circle([cell.lat, cell.lng], {
        radius,
        fillColor: color,
        color: 'transparent',
        fillOpacity: 0.6,
        weight: 0,
      });

      const popupContent = `
        <div class="p-2">
          <p class="font-bold text-sm">Zona de Alta Densidade</p>
          <p class="text-xs">Intensidade: ${(intensity * 100).toFixed(0)}%</p>
          <p class="text-xs">Fichas: ${cell.fichas.length}</p>
        </div>
      `;

      circle.bindPopup(popupContent);
      circle.addTo(heatmapLayerRef.current!);
    });
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
      const marker = L.marker([lead.lat, lead.lng]);
      
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <p class="font-bold mb-1">${lead.name}</p>
          ${lead.scouter ? `<p class="text-sm text-gray-600 mb-1">Scouter: ${lead.scouter}</p>` : ''}
          ${lead.address ? `<p class="text-xs text-gray-500 mb-1">${lead.address}</p>` : ''}
          ${lead.status ? `<span class="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">${lead.status}</span>` : ''}
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
    <div className="relative">
      {/* Timeline Modal */}
      <ScouterTimelineModal
        open={timelineModalOpen}
        onOpenChange={setTimelineModalOpen}
        scouterName={selectedScouterForTimeline?.name || "Scouter"}
        scouterPhotoUrl={selectedScouterForTimeline?.photoUrl}
        locations={locationHistory}
      />

      {/* Indicadores superiores */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
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
        <Card className="absolute bottom-4 left-4 z-[1000] p-4 bg-white/95 backdrop-blur shadow-lg max-w-xs max-h-96 overflow-y-auto">
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
        <Card className="absolute bottom-4 right-4 z-[1000] p-4 bg-white/95 backdrop-blur shadow-lg max-w-xs max-h-96 overflow-hidden">
          <h3 
            className="font-bold text-sm mb-3 flex items-center justify-between cursor-pointer"
            onClick={() => setIsScouterListExpanded(!isScouterListExpanded)}
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Scouters em Campo ({scouterLocations.length})
            </span>
            {isScouterListExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </h3>
          
          {isScouterListExpanded && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {scouterLocations.map(location => (
                <div 
                  key={location.scouterBitrixId} 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                >
                  {/* Avatar */}
                  {location.photoUrl ? (
                    <img 
                      src={location.photoUrl} 
                      className="w-8 h-8 rounded-full object-cover border-2 border-green-500" 
                      alt={location.scouterName}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-2 border-green-600">
                      <span className="text-white text-xs font-bold">{location.scouterName[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{location.scouterName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(location.recordedAt), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  
                  {/* Botão Ver Rota */}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => handleOpenTimeline(location.scouterBitrixId, location.scouterName, location.photoUrl)}
                    title="Ver Rota"
                  >
                    <Route className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Controles de desenho quando ativo */}
      {isDrawing && (
        <Card className="absolute top-20 right-4 z-[1000] p-4 bg-white/95 backdrop-blur shadow-lg">
          <p className="text-sm font-medium mb-3">Modo de Desenho Ativo</p>
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              variant={drawMode === 'polygon' ? 'default' : 'outline'}
              onClick={() => setDrawMode('polygon')}
            >
              <Pencil className="w-4 h-4" />
              Polígono
            </Button>
            <Button
              size="sm"
              variant={drawMode === 'rectangle' ? 'default' : 'outline'}
              onClick={() => setDrawMode('rectangle')}
            >
              <Square className="w-4 h-4" />
              Retângulo
            </Button>
          </div>
          {drawMode === 'polygon' && drawingPoints.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{drawingPoints.length} pontos</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={finishDrawing} disabled={drawingPoints.length < 3}>
                  <Save className="w-4 h-4 mr-1" />
                  Finalizar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelDrawing}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Mapa */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: "600px" }}
      />
    </div>
  );
}
