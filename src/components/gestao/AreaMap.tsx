import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Save } from "lucide-react";

// Corrigir ícones padrão do Leaflet
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
}

interface AreaMapProps {
  leads: LeadMapLocation[];
  center?: [number, number];
  zoom?: number;
  onAreaCreated?: (area: DrawnArea) => void;
  onAreaDeleted?: (areaId: string) => void;
}

export default function AreaMap({ 
  leads, 
  center = [-15.7801, -47.9292],
  zoom = 12,
  onAreaCreated,
  onAreaDeleted
}: AreaMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const currentPolygonRef = useRef<L.Polyline | null>(null);
  const areasLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inicializar mapa apenas uma vez
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);

      // Criar layer group para áreas
      areasLayerRef.current = L.layerGroup().addTo(mapRef.current);

      // Event handlers para desenho
      mapRef.current.on('click', handleMapClick);
    }

    return () => {
      mapRef.current?.off('click', handleMapClick);
    };
  }, []);

  // Atualizar marcadores
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpar cluster anterior
    if (markerClusterRef.current) {
      mapRef.current.removeLayer(markerClusterRef.current);
    }

    // Criar novo cluster group
    markerClusterRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 20) size = 'large';
        else if (count > 10) size = 'medium';
        
        return L.divIcon({
          html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40)
        });
      }
    });

    // Adicionar marcadores
    leads.forEach(lead => {
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
      markerClusterRef.current!.addLayer(marker);
    });

    mapRef.current.addLayer(markerClusterRef.current);

    // Ajustar bounds se houver leads
    if (leads.length > 0) {
      const bounds = L.latLngBounds(leads.map(l => [l.lat, l.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [leads]);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!isDrawing || !mapRef.current) return;

    const newPoint = e.latlng;
    setDrawingPoints(prev => [...prev, newPoint]);

    // Desenhar linha temporária
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
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    if (currentPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    if (currentPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3 || !mapRef.current || !areasLayerRef.current) {
      cancelDrawing();
      return;
    }

    // Criar polígono permanente
    const polygon = L.polygon(drawingPoints, {
      color: '#10b981',
      weight: 2,
      fillOpacity: 0.2
    });

    // Contar leads dentro do polígono usando point-in-polygon
    const leadsInArea = leads.filter(lead => {
      const point = L.latLng(lead.lat, lead.lng);
      // Usar o método interno do Leaflet para verificar se o ponto está dentro do polígono
      const bounds = polygon.getBounds();
      if (!bounds.contains(point)) return false;
      
      // Verificação adicional: ponto dentro do polígono
      let inside = false;
      const x = lead.lng;
      const y = lead.lat;
      const vs = drawingPoints.map(p => [p.lng, p.lat]);
      
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      
      return inside;
    });

    const areaId = `area-${Date.now()}`;
    const newArea: DrawnArea = {
      id: areaId,
      name: `Área ${drawnAreas.length + 1}`,
      bounds: drawingPoints,
      leadCount: leadsInArea.length
    };

    // Adicionar popup ao polígono
    polygon.bindPopup(`
      <div class="p-2">
        <p class="font-bold">${newArea.name}</p>
        <p class="text-sm">${newArea.leadCount} leads nesta área</p>
        <button 
          class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          onclick="window.deleteArea('${areaId}')"
        >
          Deletar Área
        </button>
      </div>
    `);

    polygon.addTo(areasLayerRef.current);
    
    setDrawnAreas(prev => [...prev, newArea]);
    
    // Limpar desenho temporário
    if (currentPolygonRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
    
    setIsDrawing(false);
    setDrawingPoints([]);

    if (onAreaCreated) {
      onAreaCreated(newArea);
    }
  };

  // Expor função de deletar para o window
  useEffect(() => {
    (window as any).deleteArea = (areaId: string) => {
      setDrawnAreas(prev => prev.filter(a => a.id !== areaId));
      if (onAreaDeleted) {
        onAreaDeleted(areaId);
      }
      // Recriar layers (simplificado - em produção, manter referências)
    };
  }, [onAreaDeleted]);

  return (
    <div className="relative">
      {/* Controles de desenho */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {!isDrawing ? (
          <Button onClick={startDrawing} size="sm" className="shadow-lg">
            <Pencil className="w-4 h-4 mr-2" />
            Desenhar Área
          </Button>
        ) : (
          <div className="flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg">
            <Badge variant="secondary" className="justify-center">
              {drawingPoints.length} pontos
            </Badge>
            <Button onClick={finishDrawing} size="sm" disabled={drawingPoints.length < 3}>
              <Save className="w-4 h-4 mr-2" />
              Finalizar
            </Button>
            <Button onClick={cancelDrawing} size="sm" variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Legenda de áreas */}
      {drawnAreas.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg max-w-xs">
          <h3 className="font-bold text-sm mb-2">Áreas Desenhadas</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {drawnAreas.map(area => (
              <div key={area.id} className="flex justify-between text-xs border-b pb-1">
                <span>{area.name}</span>
                <span className="font-semibold">{area.leadCount} leads</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mapa */}
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: "600px", cursor: isDrawing ? 'crosshair' : 'grab' }}
      />

      {/* Estilos CSS para clusters */}
      <style>{`
        .custom-cluster-icon {
          background: transparent;
        }
        .cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: bold;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .cluster-small {
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
          width: 35px;
          height: 35px;
          font-size: 14px;
        }
        .cluster-medium {
          background: linear-gradient(135deg, #34d399, #10b981);
          width: 40px;
          height: 40px;
          font-size: 15px;
        }
        .cluster-large {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          width: 50px;
          height: 50px;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
