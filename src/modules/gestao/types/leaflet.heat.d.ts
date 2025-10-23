/**
 * Type declarations for leaflet.heat
 */

declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    gradient?: { [key: number]: string };
    minOpacity?: number;
  }

  namespace L {
    function heatLayer(
      latlngs: [number, number, number][],
      options?: HeatLayerOptions
    ): L.Layer;
  }

  export = L;
}
