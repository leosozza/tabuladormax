import React, { useState } from "react";
import { Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MapLayerOption {
  id: string;
  name: string;
  url: string;
  attribution: string;
  preview?: string;
}

export const MAP_LAYERS: MapLayerOption[] = [
  {
    id: "osm-standard",
    name: "Padrão",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: "cyclosm",
    name: "CyclOSM",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.cyclosm.org">CyclOSM</a> | © OpenStreetMap',
  },
  {
    id: "humanitarian",
    name: "Humanitário",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '© OpenStreetMap contributors, Tiles: Humanitarian OSM Team',
  },
  {
    id: "topo",
    name: "Topográfico",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '© OpenTopoMap (CC-BY-SA)',
  },
  {
    id: "carto-light",
    name: "Claro",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '© CARTO',
  },
  {
    id: "carto-dark",
    name: "Escuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '© CARTO',
  },
  {
    id: "carto-voyager",
    name: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '© CARTO',
  },
  {
    id: "esri-satellite",
    name: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '© Esri, Maxar, Earthstar Geographics',
  },
];

interface MapLayerSelectorProps {
  selectedLayerId: string;
  onLayerChange: (layer: MapLayerOption) => void;
  className?: string;
}

export function MapLayerSelector({ 
  selectedLayerId, 
  onLayerChange, 
  className 
}: MapLayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLayer = MAP_LAYERS.find(l => l.id === selectedLayerId) || MAP_LAYERS[0];

  return (
    <div className={cn("absolute z-[1000]", className)}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-background/95 backdrop-blur-sm shadow-lg border-border hover:bg-accent"
      >
        <Layers className="w-4 h-4 mr-2" />
        Camadas
      </Button>

      {/* Layer Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-semibold text-sm">Camadas do mapa</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-2 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {MAP_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => {
                    onLayerChange(layer);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-start p-2 rounded-md border transition-all text-left",
                    selectedLayerId === layer.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:border-muted-foreground/50 hover:bg-accent"
                  )}
                >
                  <div className="w-full h-12 rounded bg-muted mb-1 overflow-hidden">
                    <img
                      src={layer.url
                        .replace("{s}", "a")
                        .replace("{z}", "12")
                        .replace("{x}", "1511")
                        .replace("{y}", "2401")
                        .replace("{r}", "")}
                      alt={layer.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs font-medium truncate w-full">
                    {layer.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
