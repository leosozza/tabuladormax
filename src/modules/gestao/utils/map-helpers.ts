/**
 * Map Helper Utilities
 * Lock/unlock map interactions and bbox filtering
 */
import L from 'leaflet';
import * as turf from '@turf/turf';

interface BBoxFilterable {
  lat: number;
  lng: number;
}

/**
 * Lock map interactions during drawing
 */
export function lockMap(map: L.Map): void {
  map.dragging?.disable();
  map.scrollWheelZoom?.disable();
  map.doubleClickZoom?.disable();
  map.boxZoom?.disable();
  map.keyboard?.disable();
  document.body.classList.add('body--drawing');
}

/**
 * Unlock map interactions after drawing
 */
export function unlockMap(map: L.Map): void {
  map.dragging?.enable();
  map.scrollWheelZoom?.enable();
  map.doubleClickZoom?.enable();
  map.boxZoom?.enable();
  map.keyboard?.enable();
  document.body.classList.remove('body--drawing');
}

/**
 * Pre-filter points using bounding box (fast spatial index)
 * @param points - Array of points with lat/lng
 * @param bounds - Leaflet bounds object
 * @returns Filtered points within bounds
 */
export function bboxFilter<T extends BBoxFilterable>(
  points: T[],
  bounds: L.LatLngBounds
): T[] {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  
  return points.filter(p => 
    p.lat >= sw.lat && 
    p.lat <= ne.lat && 
    p.lng >= sw.lng && 
    p.lng <= ne.lng
  );
}

/**
 * Filter points inside polygon using Turf.js
 * @param points - Array of points with lat/lng
 * @param polygon - Turf polygon (any type from turf)
 * @returns Points inside polygon
 */
export function pointsInPolygon<T extends BBoxFilterable>(
  points: T[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  polygon: any
): T[] {
  return points.filter(p => {
    const point = turf.point([p.lng, p.lat]);
    return turf.booleanPointInPolygon(point, polygon);
  });
}
