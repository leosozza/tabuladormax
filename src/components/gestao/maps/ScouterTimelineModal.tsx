import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Loader2, FileDown, User, Hash } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
  recorded_at: string;
  // Lead info (optional)
  lead_id?: number;
  lead_name?: string;
  nome_modelo?: string;
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
  const [dialogFullyOpen, setDialogFullyOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Capture locations only when modal opens - static snapshot
  const staticLocationsRef = useRef<LocationPoint[]>([]);
  
  // Capture locations immediately when modal opens
  if (open && staticLocationsRef.current.length === 0 && locations.length > 0) {
    staticLocationsRef.current = [...locations];
  }
  if (!open && staticLocationsRef.current.length > 0) {
    staticLocationsRef.current = [];
  }

  const sortedLocations = [...staticLocationsRef.current].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setDialogFullyOpen(false);
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [open]);

  // Initialize map when dialog is fully open (after animation)
  useEffect(() => {
    if (!dialogFullyOpen || !mapContainerRef.current) return;
    
    // Clear previous map if exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const container = mapContainerRef.current;
    
    // Small safety delay after animation
    const timeout = setTimeout(() => {
      if (!container || container.clientWidth === 0) {
        console.warn('Map container has no dimensions');
        setMapReady(true); // Exit loading state
        return;
      }
      
      try {
        const map = L.map(container, {
          zoomControl: true,
        }).setView([-23.5505, -46.6333], 12);
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        mapRef.current = map;
        map.invalidateSize();
        setMapReady(true);
      } catch (e) {
        console.error('Error initializing map:', e);
        setMapReady(true); // Exit loading state even on error
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [dialogFullyOpen]);

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
      const leadInfo = location.lead_id 
        ? `<div class="font-medium text-blue-600 mb-1">Lead #${location.lead_id}</div>
           ${location.lead_name ? `<div class="font-medium">${location.lead_name}</div>` : ''}
           ${location.nome_modelo ? `<div class="text-xs text-gray-600">Modelo: ${location.nome_modelo}</div>` : ''}`
        : '';
      
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg font-bold text-red-500">#${sortedLocations.length - index}</span>
          </div>
          ${leadInfo}
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
  }, [mapReady, sortedLocations]);

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

  // Export to PDF with map image
  const handleExportPDF = async () => {
    if (sortedLocations.length === 0 || !mapContainerRef.current) return;

    setExporting(true);

    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Rota - Scouter', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Scouter: ${scouterName}`, 20, 35);
      doc.text(`Data de Exportação: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, 42);
      doc.text(`Total de Registros: ${sortedLocations.length}`, 20, 49);

      // Capture map image
      let tableStartY = 58;
      try {
        const mapCanvas = await html2canvas(mapContainerRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          logging: false,
        });
        
        const mapImage = mapCanvas.toDataURL('image/png');
        const imgWidth = 170;
        const imgHeight = (mapCanvas.height * imgWidth) / mapCanvas.width;
        
        // Add map image to PDF
        doc.addImage(mapImage, 'PNG', 20, 58, imgWidth, Math.min(imgHeight, 100));
        tableStartY = 58 + Math.min(imgHeight, 100) + 10;
      } catch (e) {
        console.warn('Não foi possível capturar o mapa:', e);
      }

      // Table data
      const tableData = sortedLocations.map((location, index) => [
        (sortedLocations.length - index).toString(),
        location.lead_id?.toString() || '-',
        location.lead_name || '-',
        location.nome_modelo || '-',
        format(new Date(location.recorded_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        location.address || 'Endereço não disponível'
      ]);

      autoTable(doc, {
        startY: tableStartY,
        head: [['#', 'ID Lead', 'Nome', 'Modelo', 'Data/Hora', 'Endereço']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [66, 139, 202],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 40 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30 },
          5: { cellWidth: 55 }
        }
      });

      const fileName = `Historico_Rota_${scouterName.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`;
      doc.save(fileName);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-6xl h-[90vh] sm:h-[80vh] p-0 gap-0 overflow-hidden z-[9999]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          setDialogFullyOpen(true);
        }}
      >
        <DialogHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-2 sm:gap-3">
              {scouterPhotoUrl ? (
                <img 
                  src={scouterPhotoUrl} 
                  alt={scouterName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm sm:text-base">
                    {scouterName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  <span className="text-sm sm:text-base">Histórico de Rota</span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground block mt-0.5">{scouterName}</span>
              </div>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={sortedLocations.length === 0 || exporting}
              className="mr-8"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-1" />
              )}
              <span className="hidden sm:inline">{exporting ? 'Gerando...' : 'Exportar PDF'}</span>
              <span className="sm:hidden">{exporting ? '...' : 'PDF'}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Layout responsivo: vertical no mobile, horizontal no desktop */}
        <div className="flex flex-col sm:flex-row h-[calc(100%-60px)] sm:h-[calc(100%-80px)] overflow-hidden">
          {/* Map Section - metade da altura no mobile */}
          <div className="h-1/2 sm:h-full sm:flex-1 relative bg-gray-100">
            {/* Loading indicator */}
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
              </div>
            )}
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0"
              style={{ width: '100%', height: '100%' }} 
            />
          </div>

          {/* Timeline Section - metade da altura no mobile, scroll interno */}
          <div className="h-1/2 sm:h-full w-full sm:w-72 lg:w-96 border-t sm:border-t-0 sm:border-l bg-muted/30 overflow-y-auto">
            {sortedLocations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum histórico disponível
              </div>
            ) : (
              <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                {sortedLocations.map((location, index) => {
                  const isFirst = index === 0;
                  const isLast = index === sortedLocations.length - 1;
                  const isSelected = selectedIndex === index;

                  return (
                    <Card
                      key={index}
                      className={`p-2 sm:p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary shadow-md' : ''
                      }`}
                      onClick={() => handleTimelineClick(index)}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {/* Number Badge */}
                        <div className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                          isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-primary'
                        }`}>
                          {sortedLocations.length - index}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Lead Info */}
                          {location.lead_id && (
                            <div className="mb-1 sm:mb-2 p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5">
                                <Hash className="w-3 h-3" />
                                <span className="text-xs font-bold">Lead #{location.lead_id}</span>
                              </div>
                              {location.lead_name && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs font-medium truncate">{location.lead_name}</span>
                                </div>
                              )}
                              {location.nome_modelo && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Modelo: {location.nome_modelo}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">
                              {new Date(location.recorded_at).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(location.recorded_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-start gap-1 sm:gap-2 mb-1 sm:mb-2">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-2">
                              {location.address}
                            </span>
                          </div>

                          <div className="text-[10px] sm:text-xs text-muted-foreground font-mono hidden sm:block">
                            {location.latitude?.toFixed(6) ?? 'N/A'}, {location.longitude?.toFixed(6) ?? 'N/A'}
                          </div>

                          {isFirst && (
                            <div className="mt-1 sm:mt-2 inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-700 text-[10px] sm:text-xs font-medium">
                              Atual
                            </div>
                          )}
                          {isLast && (
                            <div className="mt-1 sm:mt-2 inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-red-100 text-red-700 text-[10px] sm:text-xs font-medium">
                              Início
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
