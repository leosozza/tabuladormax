import * as turf from "@turf/turf";
import L from "leaflet";

type TurfFeature = ReturnType<typeof turf.polygon>;
type TurfPolygon = TurfFeature['geometry'];

/**
 * Convert Leaflet LatLng array to Turf polygon
 */
export function leafletToTurfPolygon(bounds: L.LatLng[]): TurfFeature {
  const coords = bounds.map(b => [b.lng, b.lat]);
  // Close the polygon if not already closed
  if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
    coords.push(coords[0]);
  }
  return turf.polygon([coords]);
}

/**
 * Union multiple polygons into a single multipolygon or polygon
 */
export function unionPolygons(polygons: TurfFeature[]): ReturnType<typeof turf.union> | null {
  if (polygons.length === 0) return null;
  if (polygons.length === 1) return polygons[0];
  
  try {
    // In Turf v7, union accepts a FeatureCollection
    const featureCollection = turf.featureCollection(polygons);
    const result = turf.union(featureCollection);
    return result;
  } catch (error) {
    console.error("Error unioning polygons:", error);
    return null;
  }
}

/**
 * Check if a point is within any of the given polygons
 */
export function isPointInAnyPolygon(
  point: { lat: number; lng: number },
  polygons: TurfFeature[]
): boolean {
  if (polygons.length === 0) return false;
  
  const turfPoint = turf.point([point.lng, point.lat]);
  
  // Check each polygon individually for better performance
  for (const polygon of polygons) {
    if (turf.booleanPointInPolygon(turfPoint, polygon)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a point is within a combined polygon (union of multiple polygons)
 */
export function isPointInUnionedPolygon(
  point: { lat: number; lng: number },
  unionedPolygon: ReturnType<typeof turf.union>
): boolean {
  const turfPoint = turf.point([point.lng, point.lat]);
  return turf.booleanPointInPolygon(turfPoint, unionedPolygon);
}

/**
 * Filter items that are within any of the selected polygons
 */
export function filterItemsInPolygons<T extends { lat: number; lng: number }>(
  items: T[],
  polygons: TurfFeature[]
): T[] {
  if (polygons.length === 0) return items;
  
  return items.filter(item => isPointInAnyPolygon(item, polygons));
}

/**
 * Get bounding box for multiple polygons
 */
export function getPolygonsBounds(polygons: TurfFeature[]): L.LatLngBounds | null {
  if (polygons.length === 0) return null;
  
  const allCoords: L.LatLng[] = [];
  
  polygons.forEach(polygon => {
    if (polygon.geometry.type === 'Polygon') {
      const coords = polygon.geometry.coordinates[0];
      coords.forEach(([lng, lat]) => {
        allCoords.push(L.latLng(lat, lng));
      });
    }
  });
  
  return L.latLngBounds(allCoords);
}

/**
 * Calculate area of a polygon in square meters
 */
export function calculatePolygonArea(polygon: TurfFeature): number {
  return turf.area(polygon);
}

/**
 * Calculate total area of multiple polygons (with union to avoid overlap)
 */
export function calculateTotalArea(polygons: TurfFeature[]): number {
  if (polygons.length === 0) return 0;
  
  const unioned = unionPolygons(polygons);
  if (!unioned) return 0;
  
  return turf.area(unioned);
}
