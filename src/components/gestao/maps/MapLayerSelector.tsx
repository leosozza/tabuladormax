import React from "react";
import { Layers, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

export function MapLayerSelector({ 
  selectedLayerId, 
  onLayerChange
}: MapLayerSelectorProps) {
  const selectedLayer = MAP_LAYERS.find(l => l.id === selectedLayerId) || MAP_LAYERS[0];

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 cursor-pointer text-xs sm:text-sm hover:text-foreground transition-colors">
            <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
            <span className="hidden xs:inline">{selectedLayer.name}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 z-[1000]">
          {MAP_LAYERS.map((layer) => (
            <DropdownMenuItem
              key={layer.id}
              onClick={() => onLayerChange(layer)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                selectedLayerId === layer.id && "bg-primary/10 text-primary"
              )}
            >
              <div className="w-8 h-6 rounded overflow-hidden border border-border flex-shrink-0">
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
              <span className="text-sm">{layer.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
