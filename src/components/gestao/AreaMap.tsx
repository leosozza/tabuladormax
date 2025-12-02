import { useEffect, useRef, useState, useMemo } from "react";
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
import { Pencil, Trash2, Save, Square, FileDown, FileSpreadsheet, Layers, Eye, EyeOff } from "lucide-react";
import { filterItemsInPolygons, leafletToTurfPolygon, unionPolygons, calculateTotalArea } from "@/utils/polygonUtils";

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
  projectName?: string;
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

interface AreaMapProps {
  leads: LeadMapLocation[];
  center?: [number, number];
  zoom?: number;
  onAreaCreated?: (area: DrawnArea) => void;
  onAreaDeleted?: (areaId: string) => void;
  onAreasSelectionChanged?: (selectedAreas: DrawnArea[], filteredLeads: LeadMapLocation[]) => void;
}

export default function AreaMap({ 
  leads, 
  center = [-15.7801, -47.9292],
  zoom = 12,
  onAreaCreated,
  onAreaDeleted,
  onAreasSelectionChanged
}: AreaMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'polygon' | 'rectangle'>('polygon');
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);
  const [drawnAreas, setDrawnAreas] = useState<DrawnArea[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());
  const currentPolygonRef = useRef<L.Polyline | L.Rectangle | null>(null);
  const areasLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonRefsRef = useRef<Map<string, L.Polygon>>(new Map());
  const rectangleStartRef = useRef<L.LatLng | null>(null);

  // Available colors for polygons
  const polygonColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Memoized filtered leads based on selected areas
  const filteredLeads = useMemo(() => {
    if (selectedAreaIds.size === 0) {
      return leads;
    }

    const selectedAreas = drawnAreas.filter(area => selectedAreaIds.has(area.id));
    const selectedPolygons = selectedAreas.map(area => leafletToTurfPolygon(area.bounds));
    
    return filterItemsInPolygons(leads, selectedPolygons);
  }, [leads, drawnAreas, selectedAreaIds]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onAreasSelectionChanged) {
      const selectedAreas = drawnAreas.filter(area => selectedAreaIds.has(area.id));
      onAreasSelectionChanged(selectedAreas, filteredLeads);
    }
  }, [selectedAreaIds, drawnAreas, filteredLeads, onAreasSelectionChanged]);

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

    // Adicionar marcadores - usar filteredLeads em vez de leads
    const leadsToShow = selectedAreaIds.size > 0 ? filteredLeads : leads;
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
      markerClusterRef.current!.addLayer(marker);
    });

    mapRef.current.addLayer(markerClusterRef.current);

    // Ajustar bounds se houver leads
    if (leadsToShow.length > 0) {
      const bounds = L.latLngBounds(leadsToShow.map(l => [l.lat, l.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [leads, filteredLeads, selectedAreaIds]);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!isDrawing || !mapRef.current) return;

    const newPoint = e.latlng;

    if (drawMode === 'rectangle') {
      // Para retângulo, usar dois cliques
      if (!rectangleStartRef.current) {
        rectangleStartRef.current = newPoint;
        setDrawingPoints([newPoint]);
      } else {
        // Segundo clique - finalizar retângulo
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
      // Modo polígono - adicionar pontos sequencialmente
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
    }
  };

  const startDrawing = (mode: 'polygon' | 'rectangle' = 'polygon') => {
    setIsDrawing(true);
    setDrawMode(mode);
    setDrawingPoints([]);
    rectangleStartRef.current = null;
    if (currentPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    rectangleStartRef.current = null;
    if (currentPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
  };

  const finishDrawingRectangle = (rectanglePoints: L.LatLng[]) => {
    if (!mapRef.current || !areasLayerRef.current) return;

    const areaId = `area-${Date.now()}`;
    const color = polygonColors[drawnAreas.length % polygonColors.length];

    // Criar polígono permanente
    const polygon = L.polygon(rectanglePoints, {
      color: color,
      weight: 2,
      fillOpacity: 0.2
    });

    // Contar leads usando Turf.js
    const polygonCoords = rectanglePoints.map(p => [p.lng, p.lat]);
    polygonCoords.push(polygonCoords[0]);
    const turfPolygon = turf.polygon([polygonCoords]);

    const leadsInArea = leads.filter(lead => {
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

    // Adicionar popup ao polígono
    polygon.bindPopup(`
      <div class="p-2">
        <p class="font-bold">${newArea.name}</p>
        <p class="text-sm">${newArea.leadCount} leads nesta área</p>
      </div>
    `);

    // Add click handler to toggle selection
    polygon.on('click', () => {
      toggleAreaSelection(areaId);
    });

    polygon.addTo(areasLayerRef.current);
    polygonRefsRef.current.set(areaId, polygon);
    
    setDrawnAreas(prev => [...prev, newArea]);
    setSelectedAreaIds(prev => new Set([...prev, areaId]));
    
    if (onAreaCreated) {
      onAreaCreated(newArea);
    }
    
    setIsDrawing(false);
    setDrawingPoints([]);
    rectangleStartRef.current = null;
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3 || !mapRef.current || !areasLayerRef.current) {
      cancelDrawing();
      return;
    }

    const areaId = `area-${Date.now()}`;
    const color = polygonColors[drawnAreas.length % polygonColors.length];

    // Criar polígono permanente
    const polygon = L.polygon(drawingPoints, {
      color: color,
      weight: 2,
      fillOpacity: 0.2
    });

    // Contar leads dentro do polígono usando Turf.js
    // Converter o polígono Leaflet para formato GeoJSON para o Turf
    const polygonCoords = drawingPoints.map(p => [p.lng, p.lat]);
    polygonCoords.push(polygonCoords[0]); // Fechar o polígono
    const turfPolygon = turf.polygon([polygonCoords]);

    const leadsInArea = leads.filter(lead => {
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

    // Adicionar popup ao polígono
    polygon.bindPopup(`
      <div class="p-2">
        <p class="font-bold">${newArea.name}</p>
        <p class="text-sm">${newArea.leadCount} leads nesta área</p>
      </div>
    `);

    // Add click handler to toggle selection
    polygon.on('click', () => {
      toggleAreaSelection(areaId);
    });

    polygon.addTo(areasLayerRef.current);
    polygonRefsRef.current.set(areaId, polygon);
    
    setDrawnAreas(prev => [...prev, newArea]);
    setSelectedAreaIds(prev => new Set([...prev, areaId]));
    
    if (onAreaCreated) {
      onAreaCreated(newArea);
    }
    
    // Limpar desenho temporário
    if (currentPolygonRef.current) {
      mapRef.current.removeLayer(currentPolygonRef.current);
      currentPolygonRef.current = null;
    }
    
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  // Toggle area selection
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

    // Update polygon style
    const polygon = polygonRefsRef.current.get(areaId);
    const area = drawnAreas.find(a => a.id === areaId);
    if (polygon && area) {
      const isSelected = !selectedAreaIds.has(areaId);
      polygon.setStyle({
        fillOpacity: isSelected ? 0.3 : 0.1,
        weight: isSelected ? 3 : 2,
        dashArray: isSelected ? undefined : '5, 5'
      });
    }
  };

  // Delete area
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

    if (onAreaDeleted) {
      onAreaDeleted(areaId);
    }
  };

  // Select/deselect all areas
  const toggleAllAreas = () => {
    if (selectedAreaIds.size === drawnAreas.length) {
      // Deselect all
      setSelectedAreaIds(new Set());
      drawnAreas.forEach(area => {
        const polygon = polygonRefsRef.current.get(area.id);
        if (polygon) {
          polygon.setStyle({
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
          });
        }
      });
    } else {
      // Select all
      const allIds = drawnAreas.map(a => a.id);
      setSelectedAreaIds(new Set(allIds));
      drawnAreas.forEach(area => {
        const polygon = polygonRefsRef.current.get(area.id);
        if (polygon) {
          polygon.setStyle({
            fillOpacity: 0.3,
            weight: 3,
            dashArray: undefined
          });
        }
      });
    }
  };

  // Exportar áreas para PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Áreas de Abordagem', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Total de Áreas: ${drawnAreas.length}`, 14, 32);
    doc.text(`Total de Leads: ${leads.length}`, 14, 38);
    
    const tableData = drawnAreas.map((area, idx) => [
      idx + 1,
      area.name,
      area.leadCount,
      `${area.bounds.length} pontos`
    ]);
    
    // Use autoTable directly on the doc
    autoTable(doc, {
      head: [['#', 'Nome da Área', 'Leads', 'Pontos']],
      body: tableData,
      startY: 45,
    });
    
    doc.save('areas-abordagem.pdf');
  };

  // Exportar áreas para CSV
  const exportToCSV = () => {
    const headers = ['Área', 'Quantidade de Leads', 'Coordenadas'];
    const rows = drawnAreas.map(area => [
      area.name,
      area.leadCount,
      area.bounds.map(b => `${b.lat},${b.lng}`).join(';')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'areas-abordagem.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Store area deletion handler to avoid window pollution
  const deleteAreaRef = useRef<Map<string, () => void>>(new Map());

  // Update area deletion handlers
  useEffect(() => {
    drawnAreas.forEach(area => {
      deleteAreaRef.current.set(area.id, () => {
        deleteArea(area.id);
      });
    });
  }, [drawnAreas]);

  // Calculate stats for selected areas
  const selectedAreas = drawnAreas.filter(area => selectedAreaIds.has(area.id));
  const totalSelectedLeads = filteredLeads.length;
  const totalArea = useMemo(() => {
    if (selectedAreas.length === 0) return 0;
    const polygons = selectedAreas.map(area => leafletToTurfPolygon(area.bounds));
    return calculateTotalArea(polygons) / 1000000; // Convert to km²
  }, [selectedAreas]);

  return (
    <div className="relative">
      {/* Controles de desenho */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {!isDrawing ? (
          <div className="flex flex-col gap-2">
            <Button onClick={() => startDrawing('polygon')} size="sm" className="shadow-lg">
              <Pencil className="w-4 h-4 mr-2" />
              Desenhar Polígono
            </Button>
            <Button onClick={() => startDrawing('rectangle')} size="sm" className="shadow-lg" variant="outline">
              <Square className="w-4 h-4 mr-2" />
              Desenhar Retângulo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg">
            <Badge variant="secondary" className="justify-center">
              {drawMode === 'rectangle' 
                ? (rectangleStartRef.current ? '2° canto' : '1° canto')
                : `${drawingPoints.length} pontos`}
            </Badge>
            {drawMode === 'polygon' && (
              <Button onClick={finishDrawing} size="sm" disabled={drawingPoints.length < 3}>
                <Save className="w-4 h-4 mr-2" />
                Finalizar
              </Button>
            )}
            <Button onClick={cancelDrawing} size="sm" variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Legenda de áreas com seleção múltipla */}
      {drawnAreas.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Áreas Desenhadas ({selectedAreaIds.size}/{drawnAreas.length})
            </h3>
            <Button onClick={toggleAllAreas} size="sm" variant="ghost" className="h-6 px-2">
              {selectedAreaIds.size === drawnAreas.length ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </Button>
          </div>

          {selectedAreaIds.size > 0 && (
            <div className="mb-2 p-2 bg-blue-50 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leads filtrados:</span>
                <span className="font-semibold text-blue-600">{totalSelectedLeads}</span>
              </div>
              {totalArea > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Área total:</span>
                  <span className="font-semibold text-blue-600">{totalArea.toFixed(2)} km²</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
            {drawnAreas.map(area => {
              const isSelected = selectedAreaIds.has(area.id);
              return (
                <div 
                  key={area.id} 
                  className={`flex items-center justify-between text-xs border-b pb-1 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => toggleAreaSelection(area.id)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded border-2"
                      style={{ 
                        backgroundColor: isSelected ? area.color : 'transparent',
                        borderColor: area.color,
                        opacity: isSelected ? 1 : 0.5
                      }}
                    />
                    <span className={isSelected ? 'font-semibold' : ''}>{area.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${isSelected ? 'font-semibold text-blue-600' : ''}`}>
                      {area.leadCount} leads
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteArea(area.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={exportToPDF} size="sm" variant="outline" className="flex-1">
              <FileDown className="w-3 h-3 mr-1" />
              PDF
            </Button>
            <Button onClick={exportToCSV} size="sm" variant="outline" className="flex-1">
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              CSV
            </Button>
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
