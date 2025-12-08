import { useEffect, useRef } from "react";
import L from "leaflet";
import { OptimizedRoute } from "@/hooks/useRouteOptimization";

interface RoutePolylineProps {
  map: L.Map | null;
  route: OptimizedRoute | null;
  visible: boolean;
}

export function RoutePolyline({ map, route, visible }: RoutePolylineProps) {
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

    if (!map || !visible || !route || route.polyline.length === 0) {
      return;
    }

    // Create new layer group
    const layerGroup = L.layerGroup();

    // Create polyline
    const points = route.polyline.map(p => [p.lat, p.lon] as [number, number]);
    const polyline = L.polyline(points, {
      color: '#3b82f6',
      weight: 5,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    });

    layerGroup.addLayer(polyline);

    // Add numbered markers for each stop
    route.optimizedOrder.forEach((waypoint, index) => {
      const icon = L.divIcon({
        className: 'route-stop-marker',
        html: `
          <div style="
            background-color: #3b82f6;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${index + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([waypoint.lat, waypoint.lon], { icon });
      
      marker.bindPopup(`
        <div style="min-width: 150px;">
          <div style="font-weight: 600; font-size: 14px;">
            Parada ${index + 1}
          </div>
          ${waypoint.name ? `
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              ${waypoint.name}
            </div>
          ` : ''}
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    layerGroup.addTo(map);
    layerRef.current = layerGroup;

    // Fit bounds to show entire route
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

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
  }, [map, route, visible]);

  return null;
}
