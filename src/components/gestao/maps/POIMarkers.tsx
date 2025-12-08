import { useEffect, useRef } from "react";
import L from "leaflet";
import { POI, getPOICategoryConfig } from "@/hooks/usePOIs";

interface POIMarkersProps {
  map: L.Map | null;
  pois: POI[];
  visible: boolean;
}

export function POIMarkers({ map, pois, visible }: POIMarkersProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Remove existing layer
    if (layerRef.current && map) {
      try {
        map.removeLayer(layerRef.current);
      } catch (e) {
        // Layer might already be removed
      }
      layerRef.current = null;
    }

    if (!map || !visible || pois.length === 0) {
      return;
    }

    // Create new layer group
    const layerGroup = L.layerGroup();

    pois.forEach((poi) => {
      const config = getPOICategoryConfig(poi.category);
      
      // Create custom icon
      const icon = L.divIcon({
        className: 'poi-marker',
        html: `
          <div style="
            background-color: ${config.color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${config.icon}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([poi.lat, poi.lon], { icon });
      
      // Add popup
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${config.icon} ${poi.name}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            ${config.label}
          </div>
          <div style="font-size: 11px; color: #888;">
            ${poi.address}
          </div>
          ${poi.distance ? `
            <div style="font-size: 11px; color: #888; margin-top: 4px;">
              📍 ${(poi.distance / 1000).toFixed(1)} km
            </div>
          ` : ''}
          ${poi.phone ? `
            <div style="font-size: 11px; margin-top: 4px;">
              📞 ${poi.phone}
            </div>
          ` : ''}
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    layerGroup.addTo(map);
    layerRef.current = layerGroup;

    return () => {
      if (layerRef.current && map) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          // Map might be destroyed
        }
        layerRef.current = null;
      }
    };
  }, [map, pois, visible]);

  return null;
}
