import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles/leaflet-fixes.css";

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
  const polylineRef = useRef<L.Polyline | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const sortedLocations = [...locations].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  // Initialize map with delay to wait for Dialog animation
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

    // Wait for Dialog animation to complete
    const timeoutId = setTimeout(() => {
      if (!mapContainerRef.current) return;
      
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([-23.5505, -46.6333], 12);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
      
      // Force size recalculation after initialization and signal ready
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          setMapReady(true); // Signal that map is ready
        }
      }, 200);
    }, 500); // Wait for Dialog animation

    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [open]);

  // Update markers and polyline when map is ready
  useEffect(() => {
    // Only add markers when map is ready
    if (!mapReady || !mapRef.current || sortedLocations.length === 0) return;
    
    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

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
            <div class="flex items-start gap-2">
              <Clock class="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span class="text-foreground">${new Date(location.recorded_at).toLocaleString('pt-BR')}</span>
            </div>
            <div class="flex items-start gap-2">
              <MapPin class="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span class="text-foreground">${location.address}</span>
            </div>
            <div class="text-xs text-muted-foreground mt-2">
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

    // Draw polyline connecting all points (reverse order for chronological path)
    if (points.length > 1) {
      const reversedPoints = [...points].reverse();
      const polyline = L.polyline(reversedPoints, {
        color: '#ef4444',
        weight: 3,
        opacity: 0.7,
      }).addTo(mapRef.current);

      polylineRef.current = polyline;

      // Fit bounds to show all markers
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (points.length === 1) {
      mapRef.current.setView(points[0], 15);
    }
    
    // Force size update
    mapRef.current.invalidateSize();
  }, [mapReady, locations]);

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
      <DialogContent className="max-w-6xl h-[80vh] p-0 gap-0 z-[1100] overflow-hidden">
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

        <div className="flex h-[calc(100%-60px)] overflow-hidden">
          {/* Map Section */}
          <div className="flex-1 relative min-h-0">
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0" 
              style={{ width: '100%', height: '100%', zIndex: 1 }} 
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
