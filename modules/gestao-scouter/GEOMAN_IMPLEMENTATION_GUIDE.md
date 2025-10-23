# Geoman Polygon Drawing Implementation Guide

## Overview
This document describes the implementation of Geoman-based polygon drawing for the Fichas map module, replacing the previous custom selection implementation.

## Changes Summary

### 1. Package Installation
```bash
npm install @geoman-io/leaflet-geoman-free
```

### 2. Import Order (Critical!)
In `src/pages/TestFichas.tsx`:
```typescript
// CSS imports MUST come before script imports
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

// Script imports (side-effects) AFTER CSS
import "@geoman-io/leaflet-geoman-free";
```

### 3. State and Refs
```typescript
const drawnLayerRef = useRef<L.Layer | null>(null);
const [isDrawing, setIsDrawing] = useState(false);
```

### 4. Polygon Drawing Handler
```typescript
const handleStartSelection = () => {
  const map = mapRef.current as any;
  if (!map?.pm) {
    console.error('Geoman não carregado (map.pm undefined)');
    return;
  }
  if (!filteredFichas.length) return;
  
  setControlsVisible(false);
  setIsDrawing(true);
  
  if (map.pm.globalDrawModeEnabled()) {
    map.pm.disableDraw();
  }
  
  map.pm.setPathOptions({ 
    color: '#4096ff', 
    fillColor: '#4096ff', 
    fillOpacity: 0.1, 
    weight: 2 
  });
  
  map.pm.enableDraw('Polygon', {
    snappable: true,
    snapDistance: 25,
    allowSelfIntersection: false,
    finishOnDoubleClick: true,
    tooltips: true
  });
};
```

### 5. Polygon Creation Event Listener
```typescript
useEffect(() => {
  const map = mapRef.current as any;
  if (!map || !map.pm) return;

  const onCreate = (e: any) => {
    // Keep only 1 active shape
    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current);
    }
    drawnLayerRef.current = e.layer;
    setIsDrawing(false);
    map.pm.disableDraw();

    // Convert L.LatLng[] to GeoJSON [lng, lat]
    const latlngs = e.layer.getLatLngs()[0];
    const coords = latlngs.map((p: any) => [p.lng, p.lat]);
    coords.push(coords[0]); // Close the polygon

    // Filter points using Turf.js
    const turf = require('@turf/turf');
    const poly = turf.polygon([coords]);

    const selected = displayedFichas.filter((ficha) => {
      const point = turf.point([ficha.lng, ficha.lat]);
      return turf.booleanPointInPolygon(point, poly);
    });

    setDisplayedFichas(selected);
    setSummary(generateSummary(selected));
    if (showHeatmap) {
      heatmapRef.current?.updateData(selected);
    }
  };

  map.on('pm:create', onCreate);
  return () => { map.off('pm:create', onCreate); };
}, [displayedFichas, showHeatmap]);
```

### 6. Clear Selection
```typescript
const handleClearSelection = () => {
  const map = mapRef.current;
  if (drawnLayerRef.current && map) {
    map.removeLayer(drawnLayerRef.current);
    drawnLayerRef.current = null;
  }
  setDisplayedFichas(filteredFichas);
  setSummary(generateSummary(filteredFichas));
  if (showHeatmap) {
    heatmapRef.current?.updateData(filteredFichas);
  }
  setIsDrawing(false);
};
```

### 7. Search Bounds (Visible Area)
```typescript
const handleSearchArea = () => {
  const map = mapRef.current;
  if (!map) return;
  
  const bounds = map.getBounds();
  const visibles = filteredFichas.filter((f) =>
    bounds.contains([f.lat, f.lng])
  );
  
  setDisplayedFichas(visibles);
  setSummary(generateSummary(visibles));
  if (showHeatmap) {
    heatmapRef.current?.updateData(visibles);
  }
  setIsDrawing(false);
};
```

### 8. Dynamic Heatmap by Zoom Level
```typescript
useEffect(() => {
  const map = mapRef.current;
  if (!map || !heatmapRef.current) return;

  const updateHeatmapByZoom = () => {
    const zoom = map.getZoom();
    const radius = zoom <= 7 ? 8 : zoom <= 10 ? 18 : zoom <= 12 ? 28 : zoom <= 14 ? 38 : 48;
    const blur = Math.round(radius * 0.6);
    
    heatmapRef.current?.updateOptions({
      radius,
      blur,
      minOpacity: 0.25,
      maxZoom: 19
    });
  };

  map.on('zoomend', updateHeatmapByZoom);
  return () => { map.off('zoomend', updateHeatmapByZoom); };
}, []);
```

### 9. CSS to Prevent UI Blocking
In `src/index.css`:
```css
/* Geoman Drawing Mode - Prevent UI blocking */
.leaflet-container.drawing-mode .panel-flutuante,
.leaflet-container.drawing-mode .floating-controls {
  pointer-events: none !important;
}

.panel-flutuante,
.floating-controls {
  pointer-events: auto;
}

.leaflet-pm-toolbar,
.leaflet-pm-actions,
.leaflet-bar {
  pointer-events: auto !important;
}
```

And toggle the class:
```typescript
useEffect(() => {
  const container = mapRef.current?.getContainer();
  if (!container) return;
  
  if (isDrawing) {
    container.classList.add('drawing-mode');
  } else {
    container.classList.remove('drawing-mode');
  }
}, [isDrawing]);
```

## Features Implemented

### ✅ Polygon Drawing
- Click ✏️ button to activate Geoman polygon drawing mode
- Cursor changes to crosshair
- Click to add vertices
- Double-click to complete polygon
- Automatic spatial filtering using Turf.js

### ✅ Shape Management
- Maintains only 1 active shape at a time
- Removes previous shape when drawing new one
- "Limpar" button removes active shape and resets view

### ✅ Spatial Filtering
- Polygon selection uses `turf.booleanPointInPolygon()` for accurate filtering
- "Pesquisar nesta área" uses `map.getBounds()` for visible area filtering
- Summary panel shows total, by project, and by scouter

### ✅ Heatmap Optimization
- Dynamic radius/blur based on zoom level (8-48px)
- `minOpacity: 0.25` ensures visibility at all zoom levels
- `maxZoom: 19` for persistence
- Smooth transitions with `setLatLngs()` method

### ✅ UI Interaction
- Floating panels don't block map clicks during drawing
- Geoman toolbar remains interactive
- Drawing mode visually indicated with blue highlight

## Manual Testing Checklist

### Basic Functionality
- [ ] Navigate to `/test-fichas` route
- [ ] Wait for fichas to load (heatmap should appear)
- [ ] Click ✏️ button - cursor should change to crosshair
- [ ] Click on map to add vertices (at least 3)
- [ ] Double-click to complete polygon
- [ ] Verify polygon appears with blue outline
- [ ] Verify summary panel updates with filtered count

### Summary Panel
- [ ] Total count matches selected fichas
- [ ] Projects listed in descending order by count
- [ ] Scouters listed in descending order by count
- [ ] Percentages displayed correctly

### Clear and Reset
- [ ] Click "Limpar" button
- [ ] Verify polygon is removed
- [ ] Verify all fichas are displayed again
- [ ] Verify summary shows full count

### Bounds Search
- [ ] Zoom/pan to specific area
- [ ] Click "Pesquisar área" button
- [ ] Verify only visible fichas are counted
- [ ] Verify summary updates

### Multiple Selections
- [ ] Draw first polygon, complete it
- [ ] Click ✏️ to draw second polygon
- [ ] Verify first polygon is removed
- [ ] Complete second polygon
- [ ] Verify only second selection is active

### Heatmap Zoom Behavior
- [ ] Zoom out to level 4-7 (distant view)
- [ ] Verify heatmap is visible with small radius
- [ ] Zoom in to level 11-14 (city view)
- [ ] Verify heatmap has larger radius
- [ ] Zoom in to level 18 (close view)
- [ ] Verify heatmap is still visible with max radius

### UI Interaction
- [ ] Start drawing polygon
- [ ] Try to click on floating panels
- [ ] Verify panels don't interfere with drawing
- [ ] Complete polygon
- [ ] Verify panels are interactive again

## Troubleshooting

### "map.pm undefined" Error
**Symptom:** Console shows "Geoman não carregado (map.pm undefined)"

**Solution:**
1. Verify imports order: CSS before JS
2. Check that `@geoman-io/leaflet-geoman-free` is installed
3. Ensure side-effect import: `import "@geoman-io/leaflet-geoman-free"`
4. Rebuild the project: `npm run build`

### Polygon Not Appearing
**Symptom:** Click ✏️ but no drawing starts

**Solution:**
1. Check browser console for errors
2. Verify `map.pm.enableDraw()` is called
3. Check that `isDrawing` state is true
4. Verify Geoman CSS is loaded (inspect element for `.leaflet-pm-toolbar`)

### Filtering Not Working
**Symptom:** Polygon completes but fichas not filtered

**Solution:**
1. Check `pm:create` event listener is attached
2. Verify Turf.js is available: `require('@turf/turf')`
3. Check console for coordinate conversion errors
4. Verify `displayedFichas` state is updated

### Heatmap Not Visible at Zoom
**Symptom:** Heatmap disappears at certain zoom levels

**Solution:**
1. Verify `minOpacity: 0.25` is set
2. Check `maxZoom: 19` configuration
3. Verify zoom event listener is attached
4. Check `updateOptions()` is called on zoom

### UI Blocking Map Clicks
**Symptom:** Can't click on map to draw vertices

**Solution:**
1. Verify `.drawing-mode` class is added to map container
2. Check CSS for `.drawing-mode .panel-flutuante { pointer-events: none }`
3. Verify `isDrawing` state toggles correctly

## Performance Considerations

### Large Datasets (>5000 points)
- Use viewport-based filtering on `moveend`/`zoomend`
- Heatmap handles large datasets efficiently with `leaflet.heat`
- Turf.js point-in-polygon is optimized for real-time filtering

### Memory Management
- Single shape maintained in `drawnLayerRef`
- Previous shapes are properly removed with `map.removeLayer()`
- Event listeners cleaned up in `useEffect` return functions

## Future Enhancements

### Suggested Improvements
1. **Rectangle Selection**: Add support for `map.pm.enableDraw('Rectangle')`
2. **Circle Selection**: Add support for `map.pm.enableDraw('Circle')`
3. **Save Selections**: Persist drawn polygons to localStorage
4. **Export Selections**: Export selected fichas to CSV/JSON
5. **Edit Mode**: Allow editing existing polygons with `layer.pm.enable()`
6. **Multiple Shapes**: Support multiple active selections with union/intersection

## API Reference

### Geoman Methods
- `map.pm.enableDraw('Polygon', options)` - Start drawing mode
- `map.pm.disableDraw()` - Stop drawing mode
- `map.pm.globalDrawModeEnabled()` - Check if drawing is active
- `map.pm.setPathOptions(options)` - Set style for drawn shapes

### Events
- `pm:create` - Fired when a shape is created
- `pm:remove` - Fired when a shape is removed
- `pm:drawstart` - Fired when drawing starts
- `pm:drawend` - Fired when drawing ends

### Turf.js Functions
- `turf.polygon(coordinates)` - Create polygon from coordinates
- `turf.point([lng, lat])` - Create point from coordinates
- `turf.booleanPointInPolygon(point, polygon)` - Test if point is inside polygon

## References
- [Geoman Documentation](https://www.geoman.io/docs/modes/draw-mode)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Turf.js Documentation](https://turfjs.org/docs/)
- [leaflet.heat](https://github.com/Leaflet/Leaflet.heat)
