import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
  recorded_at: string;
}

interface ScouterTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scouterName: string;
  scouterPhotoUrl?: string;
  locations: LocationPoint[];
}

export function ScouterTimelineModal({
  open,
  onOpenChange,
  scouterName,
  scouterPhotoUrl,
  locations,
}: ScouterTimelineModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Capture locations only when modal opens - static snapshot
  const [staticLocations, setStaticLocations] = useState<LocationPoint[]>([]);
  
  // Capture locations when modal opens
  useEffect(() => {
    if (open && locations.length > 0) {
      // Only set locations when modal first opens (staticLocations is empty)
      setStaticLocations(prev => prev.length === 0 ? [...locations] : prev);
    }
    if (!open) {
      // Reset when modal closes so next open gets fresh data
      setStaticLocations([]);
    }
  }, [open, locations]);

  const sortedLocations = [...staticLocations].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  // Initialize map using ResizeObserver for reliable rendering
  useEffect(() => {
    if (!open || !mapContainerRef.current) {
      setMapReady(false);
      return;
    }
    
    // Clear previous map if exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    setMapReady(false);

    const container = mapContainerRef.current;
    let mapInitialized = false;

    const initMap = () => {
      if (mapInitialized || !container) return;
      
      // Only init if container has valid dimensions
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      
      mapInitialized = true;
      
      const map = L.map(container, {
        zoomControl: true,
      }).setView([-23.5505, -46.6333], 12);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
      
      // Multiple invalidateSize calls to ensure proper rendering
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 500);
      setTimeout(() => map.invalidateSize(), 1000);
    };

    // Use ResizeObserver to detect when container has size
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (!mapRef.current) {
            initMap();
          } else {
            mapRef.current.invalidateSize();
          }
        }
      }
    });

    resizeObserver.observe(container);
    
    // Also try to init after a delay (fallback)
    const fallbackTimeout = setTimeout(initMap, 600);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(fallbackTimeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [open, scouterName]);

  // Update markers when map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || sortedLocations.length === 0) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create numbered markers
    const points: [number, number][] = [];
    sortedLocations.forEach((location, index) => {
      const position: [number, number] = [location.latitude, location.longitude];
      points.push(position);

      // Create custom numbered icon
      const numberIcon = L.divIcon({
        className: 'custom-numbered-marker',
        html: `<div class="flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-full border-2 border-white shadow-lg font-bold text-sm">
          ${sortedLocations.length - index}
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(position, { icon: numberIcon }).addTo(mapRef.current!);

      // Popup content
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg font-bold text-red-500">#${sortedLocations.length - index}</span>
          </div>
          <div class="space-y-1 text-sm">
            <div>${new Date(location.recorded_at).toLocaleString('pt-BR')}</div>
            <div>${location.address}</div>
            <div class="text-xs text-gray-500 mt-2">
              ${location.latitude?.toFixed(6) ?? 'N/A'}, ${location.longitude?.toFixed(6) ?? 'N/A'}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      marker.on('click', () => {
        setSelectedIndex(index);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers (no polyline)
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (points.length === 1) {
      mapRef.current.setView(points[0], 15);
    }
    
    // Force size update
    mapRef.current.invalidateSize();
  }, [mapReady, staticLocations]);

  // Reset selectedIndex when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedIndex(null);
    }
  }, [open]);

  // Handle timeline item click
  const handleTimelineClick = (index: number) => {
    setSelectedIndex(index);
    const location = sortedLocations[index];
    if (mapRef.current && markersRef.current[index]) {
      mapRef.current.setView([location.latitude, location.longitude], 16);
      markersRef.current[index].openPopup();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] p-0 gap-0 overflow-hidden z-[9999]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            {scouterPhotoUrl ? (
              <img 
                src={scouterPhotoUrl} 
                alt={scouterName}
                className="w-10 h-10 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold">
                  {scouterName[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Histórico de Rota</span>
              </div>
              <span className="text-sm text-muted-foreground block mt-0.5">{scouterName}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(100%-80px)] overflow-hidden">
          {/* Map Section */}
          <div className="flex-1 relative bg-gray-100">
            {/* Loading indicator */}
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div 
              key={`${scouterName}-${staticLocations.length}`}
              ref={mapContainerRef} 
              className="absolute inset-0"
              style={{ width: '100%', height: '100%' }} 
            />
          </div>

          {/* Timeline Section */}
          <div className="w-96 border-l bg-muted/30 overflow-y-auto">
            {sortedLocations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum histórico disponível
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {sortedLocations.map((location, index) => {
                  const isFirst = index === 0;
                  const isLast = index === sortedLocations.length - 1;
                  const isSelected = selectedIndex === index;

                  return (
                    <Card
                      key={index}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : ''
                      }`}
                      onClick={() => handleTimelineClick(index)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Number Badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-primary'
                        }`}>
                          {sortedLocations.length - index}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium">
                              {new Date(location.recorded_at).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(location.recorded_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground break-words">
                              {location.address}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground font-mono">
                            {location.latitude?.toFixed(6) ?? 'N/A'}, {location.longitude?.toFixed(6) ?? 'N/A'}
                          </div>

                          {isFirst && (
                            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              Localização Atual
                            </div>
                          )}
                          {isLast && (
                            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                              Ponto Inicial
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
