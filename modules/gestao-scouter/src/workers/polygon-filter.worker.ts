/**
 * Web Worker for Heavy Polygon Filtering
 * Filters large datasets (5000+ points) without blocking UI
 */

// Import turf for polygon operations
import * as turf from '@turf/turf';

interface FilterMessage {
  type: 'filter';
  points: Array<{ lat: number; lng: number; [key: string]: unknown }>;
  polygonCoords: Array<[number, number]>;
}

interface FilterResponse {
  type: 'result';
  selected: Array<{ lat: number; lng: number; [key: string]: unknown }>;
  total: number;
}

// Worker message handler
self.onmessage = (e: MessageEvent<FilterMessage>) => {
  const { type, points, polygonCoords } = e.data;

  if (type === 'filter') {
    try {
      // Create polygon from coordinates
      const polygon = turf.polygon([polygonCoords]);

      // Filter points inside polygon
      const selected = points.filter((point) => {
        const turfPoint = turf.point([point.lng, point.lat]);
        return turf.booleanPointInPolygon(turfPoint, polygon);
      });

      // Send result back
      const response: FilterResponse = {
        type: 'result',
        selected,
        total: selected.length,
      };

      self.postMessage(response);
    } catch (error) {
      // Send error back
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

// Export empty object to make TypeScript happy
export {};
