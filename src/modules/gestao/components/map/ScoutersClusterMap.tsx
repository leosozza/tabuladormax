/**
 * Mapa de Scouters com Clustering
 * Mostra clusters em zoom baixo e markers individuais com nomes em zoom alto
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useScoutersLastLocations } from '@/hooks/useScoutersLastLocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Navigation, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTileServerConfig, DEFAULT_TILE_SERVER } from '@/config/tileServers';

// Cores por tier
const TIER_COLORS: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Prata': '#C0C0C0',
  'Ouro': '#FFD700',
  'default': '#3B82F6',
};

// Criar ícone customizado para scouters
function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

interface ScoutersClusterMapProps {
  scouter?: string | null;
}

export function ScoutersClusterMap({ scouter }: ScoutersClusterMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const { locations, isLoading, error } = useScoutersLastLocations();
  const [activeScouters, setActiveScouters] = useState(0);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11); // São Paulo center

    // Get tile server configuration (from env var or default)
    const tileConfig = getTileServerConfig(DEFAULT_TILE_SERVER);
    
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    // Create marker cluster group
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      // Custom cluster icon
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 10) size = 'large';
        else if (count >= 5) size = 'medium';
        
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);
    mapRef.current = map;

    // Listen to zoom changes to update tooltip permanence
    map.on('zoomend', () => {
      const zoom = map.getZoom();
      clusterGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const tooltip = layer.getTooltip();
          if (tooltip) {
            // Make tooltips permanent when zoomed in (>= 13)
            if (zoom >= 13) {
              tooltip.options.permanent = true;
              layer.openTooltip();
            } else {
              tooltip.options.permanent = false;
              layer.closeTooltip();
            }
          }
        }
      });
    });

    return () => {
      if (clusterGroup) {
        clusterGroup.clearLayers();
        map.removeLayer(clusterGroup);
      }
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current || !locations || locations.length === 0) return;

    const clusterGroup = clusterGroupRef.current;
    
    // Clear existing markers
    clusterGroup.clearLayers();

    // Filter by scouter if specified
    const filteredLocations = scouter 
      ? locations.filter(loc => loc.scouter === scouter)
      : locations;

    // Count active scouters (last update within 10 minutes)
    const now = new Date();
    let activeCount = 0;

    // Add new markers
    filteredLocations.forEach(location => {
      const tierColor = TIER_COLORS[location.tier || 'default'] || TIER_COLORS.default;
      const icon = createMarkerIcon(tierColor);
      
      const marker = L.marker([location.lat, location.lng], { icon });

      const lastUpdate = new Date(location.at);
      const minutesAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
      
      if (minutesAgo <= 10) {
        activeCount++;
      }

      // Popup with details
      const popupContent = `
        <div style="font-family: system-ui; padding: 4px;">
          <strong>${location.scouter}</strong><br/>
          Tier: ${location.tier || 'N/A'}<br/>
          <small>Última atualização: ${formatDistanceToNow(lastUpdate, { locale: ptBR, addSuffix: true })}</small>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      // Tooltip with scouter name (shows on hover, permanent when zoom >= 13)
      const currentZoom = mapRef.current?.getZoom() || 11;
      marker.bindTooltip(location.scouter, {
        permanent: currentZoom >= 13, // Show always when zoomed in
        direction: 'top',
        offset: [0, -20],
        className: 'scouter-name-tooltip',
        opacity: 0.9,
      });

      clusterGroup.addLayer(marker);
    });

    setActiveScouters(activeCount);

    // Auto fit bounds if there are markers
    if (filteredLocations.length > 0 && mapRef.current) {
      // Small delay to ensure cluster group is ready
      setTimeout(() => {
        if (clusterGroupRef.current && mapRef.current) {
          const bounds = clusterGroupRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      }, 100);
    }
  }, [locations, scouter]);

  // Center map on all markers
  const handleCenterMap = () => {
    if (!mapRef.current || !clusterGroupRef.current) return;

    const bounds = clusterGroupRef.current.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Mapa de Scouters (Cluster)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeScouters} ativos (≤10min)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCenterMap}
              disabled={!locations || locations.length === 0}
            >
              <Navigation className="h-4 w-4 mr-1" />
              Centralizar
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Clusters amarelos mostram agrupamentos. Aproxime para ver scouters individuais com nomes.
        </p>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <p className="text-sm text-destructive">Erro ao carregar localizações</p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
      </CardContent>
    </Card>
  );
}
