import { describe, it, expect } from 'vitest';
import * as turf from '@turf/turf';
import L from 'leaflet';
import {
  leafletToTurfPolygon,
  unionPolygons,
  isPointInAnyPolygon,
  isPointInUnionedPolygon,
  filterItemsInPolygons,
  getPolygonsBounds,
  calculatePolygonArea,
  calculateTotalArea,
} from '../polygonUtils';

describe('polygonUtils', () => {
  describe('leafletToTurfPolygon', () => {
    it('should convert Leaflet LatLng array to Turf polygon', () => {
      const bounds: L.LatLng[] = [
        L.latLng(-15.78, -47.93),
        L.latLng(-15.79, -47.93),
        L.latLng(-15.79, -47.92),
        L.latLng(-15.78, -47.92),
      ];

      const polygon = leafletToTurfPolygon(bounds);

      expect(polygon.type).toBe('Feature');
      expect(polygon.geometry.type).toBe('Polygon');
      expect(polygon.geometry.coordinates[0]).toHaveLength(5); // Should be closed
      expect(polygon.geometry.coordinates[0][0]).toEqual(polygon.geometry.coordinates[0][4]);
    });

    it('should close polygon if not already closed', () => {
      const bounds: L.LatLng[] = [
        L.latLng(-15.78, -47.93),
        L.latLng(-15.79, -47.93),
        L.latLng(-15.79, -47.92),
      ];

      const polygon = leafletToTurfPolygon(bounds);

      expect(polygon.geometry.coordinates[0]).toHaveLength(4); // 3 points + 1 closing point
      expect(polygon.geometry.coordinates[0][0]).toEqual(polygon.geometry.coordinates[0][3]);
    });
  });

  describe('unionPolygons', () => {
    it('should return null for empty array', () => {
      const result = unionPolygons([]);
      expect(result).toBeNull();
    });

    it('should return single polygon unchanged', () => {
      const polygon = turf.polygon([[
        [-47.93, -15.78],
        [-47.93, -15.79],
        [-47.92, -15.79],
        [-47.92, -15.78],
        [-47.93, -15.78],
      ]]);

      const result = unionPolygons([polygon]);
      expect(result).toEqual(polygon);
    });

    it('should union multiple overlapping polygons', () => {
      const polygon1 = turf.polygon([[
        [-47.93, -15.78],
        [-47.93, -15.79],
        [-47.92, -15.79],
        [-47.92, -15.78],
        [-47.93, -15.78],
      ]]);

      const polygon2 = turf.polygon([[
        [-47.925, -15.785],
        [-47.925, -15.795],
        [-47.915, -15.795],
        [-47.915, -15.785],
        [-47.925, -15.785],
      ]]);

      const result = unionPolygons([polygon1, polygon2]);
      expect(result).not.toBeNull();
      expect(result?.geometry.type).toMatch(/Polygon|MultiPolygon/);
    });
  });

  describe('isPointInAnyPolygon', () => {
    const polygon1 = turf.polygon([[
      [-47.93, -15.78],
      [-47.93, -15.79],
      [-47.92, -15.79],
      [-47.92, -15.78],
      [-47.93, -15.78],
    ]]);

    const polygon2 = turf.polygon([[
      [-47.91, -15.78],
      [-47.91, -15.79],
      [-47.90, -15.79],
      [-47.90, -15.78],
      [-47.91, -15.78],
    ]]);

    it('should return true if point is in first polygon', () => {
      const point = { lat: -15.785, lng: -47.925 };
      const result = isPointInAnyPolygon(point, [polygon1, polygon2]);
      expect(result).toBe(true);
    });

    it('should return true if point is in second polygon', () => {
      const point = { lat: -15.785, lng: -47.905 };
      const result = isPointInAnyPolygon(point, [polygon1, polygon2]);
      expect(result).toBe(true);
    });

    it('should return false if point is not in any polygon', () => {
      const point = { lat: -15.77, lng: -47.89 };
      const result = isPointInAnyPolygon(point, [polygon1, polygon2]);
      expect(result).toBe(false);
    });

    it('should return false for empty polygon array', () => {
      const point = { lat: -15.785, lng: -47.925 };
      const result = isPointInAnyPolygon(point, []);
      expect(result).toBe(false);
    });
  });

  describe('filterItemsInPolygons', () => {
    const polygon = turf.polygon([[
      [-47.93, -15.78],
      [-47.93, -15.79],
      [-47.92, -15.79],
      [-47.92, -15.78],
      [-47.93, -15.78],
    ]]);

    it('should filter items inside polygon', () => {
      const items = [
        { id: 1, lat: -15.785, lng: -47.925, name: 'Inside' },
        { id: 2, lat: -15.77, lng: -47.89, name: 'Outside' },
        { id: 3, lat: -15.788, lng: -47.928, name: 'Also Inside' },
      ];

      const result = filterItemsInPolygons(items, [polygon]);
      expect(result).toHaveLength(2);
      expect(result.map(item => item.id)).toEqual([1, 3]);
    });

    it('should return all items when no polygons provided', () => {
      const items = [
        { id: 1, lat: -15.785, lng: -47.925, name: 'Item 1' },
        { id: 2, lat: -15.77, lng: -47.89, name: 'Item 2' },
      ];

      const result = filterItemsInPolygons(items, []);
      expect(result).toHaveLength(2);
      expect(result).toEqual(items);
    });
  });

  describe('calculatePolygonArea', () => {
    it('should calculate area of a polygon', () => {
      const polygon = turf.polygon([[
        [-47.93, -15.78],
        [-47.93, -15.79],
        [-47.92, -15.79],
        [-47.92, -15.78],
        [-47.93, -15.78],
      ]]);

      const area = calculatePolygonArea(polygon);
      expect(area).toBeGreaterThan(0);
      // Approximate area should be around 1.2 km²
      expect(area).toBeGreaterThan(1000000); // Greater than 1 million m²
      expect(area).toBeLessThan(2000000); // Less than 2 million m²
    });
  });

  describe('calculateTotalArea', () => {
    it('should return 0 for empty array', () => {
      const result = calculateTotalArea([]);
      expect(result).toBe(0);
    });

    it('should calculate total area with union', () => {
      const polygon1 = turf.polygon([[
        [-47.93, -15.78],
        [-47.93, -15.79],
        [-47.92, -15.79],
        [-47.92, -15.78],
        [-47.93, -15.78],
      ]]);

      const polygon2 = turf.polygon([[
        [-47.91, -15.78],
        [-47.91, -15.79],
        [-47.90, -15.79],
        [-47.90, -15.78],
        [-47.91, -15.78],
      ]]);

      const totalArea = calculateTotalArea([polygon1, polygon2]);
      const area1 = calculatePolygonArea(polygon1);
      const area2 = calculatePolygonArea(polygon2);

      // Total area should be approximately sum of individual areas (no overlap in this case)
      expect(totalArea).toBeGreaterThan(0);
      expect(totalArea).toBeCloseTo(area1 + area2, -4); // Within 10000 m²
    });
  });

  describe('getPolygonsBounds', () => {
    it('should return null for empty array', () => {
      const result = getPolygonsBounds([]);
      expect(result).toBeNull();
    });

    it('should return bounds for multiple polygons', () => {
      const polygon1 = turf.polygon([[
        [-47.93, -15.78],
        [-47.93, -15.79],
        [-47.92, -15.79],
        [-47.92, -15.78],
        [-47.93, -15.78],
      ]]);

      const polygon2 = turf.polygon([[
        [-47.91, -15.77],
        [-47.91, -15.78],
        [-47.90, -15.78],
        [-47.90, -15.77],
        [-47.91, -15.77],
      ]]);

      const bounds = getPolygonsBounds([polygon1, polygon2]);
      expect(bounds).not.toBeNull();
      
      const sw = bounds!.getSouthWest();
      const ne = bounds!.getNorthEast();
      
      // Check that bounds encompass both polygons
      expect(sw.lat).toBeLessThanOrEqual(-15.79);
      expect(sw.lng).toBeLessThanOrEqual(-47.93);
      expect(ne.lat).toBeGreaterThanOrEqual(-15.77);
      expect(ne.lng).toBeGreaterThanOrEqual(-47.90);
    });
  });
});
