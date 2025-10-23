/**
 * Fichas Heatmap Module
 * Manages persistent heatmap visualization using leaflet.heat
 * Heatmap persists across all zoom levels
 */

import L from 'leaflet';
import 'leaflet.heat';
import { LeadDataPoint } from './data';

export interface HeatmapOptions {
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
}

const DEFAULT_HEATMAP_OPTIONS: HeatmapOptions = {
  radius: 25,
  blur: 15,
  maxZoom: 18, // Increased to persist at all zoom levels
  max: 1.0,
  minOpacity: 0.25, // Ensures heatmap stays visible at all zoom levels
  gradient: {
    0.0: 'green',
    0.5: 'yellow',
    1.0: 'red'
  }
};

export class LeadsHeatmap {
  private map: L.Map;
  private heatLayer: L.HeatLayer | null = null;
  private currentData: LeadDataPoint[] = [];
  private options: HeatmapOptions;
  private isHidden: boolean = false;

  constructor(map: L.Map, options?: HeatmapOptions) {
    this.map = map;
    this.options = { ...DEFAULT_HEATMAP_OPTIONS, ...options };
  }

  /**
   * Update heatmap with new data
   * Uses setLatLngs to update existing layer or creates new one if needed
   */
  updateData(fichas: LeadDataPoint[]): void {
    console.log(`🔥 [Fichas Heatmap] Updating heatmap with ${fichas.length} points`);
    
    this.currentData = fichas;
    
    if (fichas.length === 0) {
      console.log('⚠️ [Fichas Heatmap] No data to display');
      if (this.heatLayer) {
        this.heatLayer.setLatLngs([]);
      }
      return;
    }

    // Create heat layer points: [lat, lng, intensity]
    const points: [number, number, number][] = fichas.map(ficha => [
      ficha.lat,
      ficha.lng,
      1 // Default intensity, can be customized based on ficha properties
    ]);

    // If layer exists and not hidden, update it; otherwise create new one
    if (this.heatLayer && !this.isHidden) {
      console.log('🔄 [Fichas Heatmap] Updating existing layer with setLatLngs');
      this.heatLayer.setLatLngs(points);
    } else if (!this.heatLayer) {
      this.heatLayer = (L as any).heatLayer(points, {
        radius: this.options.radius,
        blur: this.options.blur,
        maxZoom: this.options.maxZoom,
        max: this.options.max,
        minOpacity: this.options.minOpacity,
        gradient: this.options.gradient
      }).addTo(this.map);
      this.isHidden = false;
      console.log('✅ [Fichas Heatmap] Heatmap layer created successfully');
    }
  }

  /**
   * Hide heatmap without destroying the layer
   * Uses setLatLngs([]) to hide points efficiently
   */
  hide(): void {
    if (this.heatLayer) {
      this.heatLayer.setLatLngs([]);
      this.isHidden = true;
      console.log('👁️ [Fichas Heatmap] Heatmap hidden');
    }
  }

  /**
   * Show heatmap with current data
   */
  show(): void {
    if (this.heatLayer && this.currentData.length > 0) {
      const points: [number, number, number][] = this.currentData.map(ficha => [
        ficha.lat,
        ficha.lng,
        1
      ]);
      this.heatLayer.setLatLngs(points);
      this.isHidden = false;
      console.log('👁️ [Fichas Heatmap] Heatmap shown');
    } else if (!this.heatLayer && this.currentData.length > 0) {
      // Create layer if it doesn't exist
      this.updateData(this.currentData);
    }
  }

  /**
   * Toggle heatmap visibility
   */
  toggle(): boolean {
    if (this.isHidden) {
      this.show();
    } else {
      this.hide();
    }
    return !this.isHidden;
  }

  /**
   * Clear heatmap layer from map (for cleanup)
   */
  clear(): void {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
      this.isHidden = false;
      console.log('🧹 [Fichas Heatmap] Heatmap cleared');
    }
  }

  /**
   * Update heatmap options without reloading data
   */
  updateOptions(options: Partial<HeatmapOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Reload heatmap with new options
    if (this.currentData.length > 0) {
      this.updateData(this.currentData);
    }
  }

  /**
   * Get current data count
   */
  getDataCount(): number {
    return this.currentData.length;
  }

  /**
   * Check if heatmap is currently visible
   */
  isVisible(): boolean {
    return this.heatLayer !== null && !this.isHidden;
  }

  /**
   * Fit map bounds to show all heatmap points
   */
  fitBounds(padding?: [number, number]): void {
    if (this.currentData.length === 0) {
      console.warn('⚠️ [Fichas Heatmap] No data to fit bounds');
      return;
    }

    const points: [number, number][] = this.currentData.map(ficha => [
      ficha.lat,
      ficha.lng
    ]);

    const bounds = L.latLngBounds(points);
    this.map.fitBounds(bounds, { padding: padding || [50, 50] });
    
    console.log('📍 [Fichas Heatmap] Map bounds fitted to data');
  }

  /**
   * Destroy heatmap instance
   */
  destroy(): void {
    this.clear();
    this.currentData = [];
    console.log('💥 [Fichas Heatmap] Instance destroyed');
  }
}

/**
 * Create a new heatmap instance
 */
export function createLeadsHeatmap(
  map: L.Map,
  options?: HeatmapOptions
): LeadsHeatmap {
  return new LeadsHeatmap(map, options);
}
