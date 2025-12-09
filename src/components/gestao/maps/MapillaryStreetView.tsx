import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, ChevronLeft, ChevronRight, MapPin, Calendar, Compass } from "lucide-react";
import { Viewer } from "mapillary-js";
import "mapillary-js/dist/mapillary.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MapillaryImage {
  id: string;
  lat: number;
  lng: number;
  capturedAt: string;
  thumb1024: string;
  thumb2048: string;
  compassAngle: number;
  distance: number;
}

interface MapillaryStreetViewProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  locationName?: string;
}

export function MapillaryStreetView({ isOpen, onClose, lat, lng, locationName }: MapillaryStreetViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<MapillaryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  // Fetch nearby images
  useEffect(() => {
    if (!isOpen) return;

    const fetchImages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("mapillary-search", {
          body: { lat, lng, radius: 100 }
        });

        if (fnError) throw fnError;
        if (data.error) throw new Error(data.error);

        if (!data.images || data.images.length === 0) {
          setError("Nenhuma imagem Street View encontrada nesta área. Tente clicar em outro local.");
          return;
        }

        setImages(data.images);
        setAccessToken(data.accessToken);
        setCurrentIndex(0);
      } catch (err) {
        console.error("Error fetching Mapillary images:", err);
        setError("Erro ao buscar imagens. Verifique se o token do Mapillary está configurado.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [isOpen, lat, lng]);

  // Initialize or update viewer
  useEffect(() => {
    if (!isOpen || !containerRef.current || !accessToken || images.length === 0) return;

    const currentImage = images[currentIndex];
    if (!currentImage) return;

    // If viewer exists, just navigate to new image
    if (viewerRef.current && viewerReady) {
      viewerRef.current.moveTo(currentImage.id).catch(console.error);
      return;
    }

    // Create new viewer
    const initViewer = async () => {
      try {
        if (viewerRef.current) {
          viewerRef.current.remove();
        }

        const viewer = new Viewer({
          accessToken,
          container: containerRef.current!,
          imageId: currentImage.id,
          component: {
            cover: false,
            bearing: true,
            zoom: true,
            sequence: true,
            direction: true,
          }
        });

        viewer.on("load", () => {
          setViewerReady(true);
        });

        viewerRef.current = viewer;
      } catch (err) {
        console.error("Error initializing Mapillary viewer:", err);
        setError("Erro ao inicializar visualizador");
      }
    };

    initViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.remove();
        viewerRef.current = null;
        setViewerReady(false);
      }
    };
  }, [isOpen, accessToken, images, currentIndex, viewerReady]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && viewerRef.current) {
      viewerRef.current.remove();
      viewerRef.current = null;
      setViewerReady(false);
      setImages([]);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, images.length]);

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold text-lg">
                {locationName || "Street View"}
              </h2>
              {currentImage && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(currentImage.capturedAt), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Compass className="h-3 w-3" />
                    {Math.round(currentImage.compassAngle || 0)}°
                  </span>
                  <span>
                    {Math.round(currentImage.distance)}m do ponto
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-black">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Buscando imagens Street View...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center p-6 max-w-md">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={onClose} className="mt-4">
                  Fechar
                </Button>
              </div>
            </div>
          )}

          {/* Mapillary Viewer Container */}
          <div 
            ref={containerRef} 
            className="w-full h-full"
            style={{ display: isLoading || error ? 'none' : 'block' }}
          />

          {/* Navigation Controls */}
          {images.length > 1 && !isLoading && !error && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && !isLoading && !error && (
          <div className="flex gap-2 p-3 bg-muted/50 overflow-x-auto">
            {images.slice(0, 10).map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? 'border-primary ring-2 ring-primary/30' 
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={img.thumb1024}
                  alt={`Vista ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
