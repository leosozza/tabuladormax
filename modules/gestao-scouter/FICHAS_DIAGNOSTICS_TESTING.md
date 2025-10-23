## ⚠️ NOTA: Este documento está obsoleto ou parcialmente obsoleto

**Status**: ⚠️ Este documento contém referências a implementações antigas que dependiam de Google Sheets.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) ou [../LEADS_DATA_SOURCE.md](../LEADS_DATA_SOURCE.md)
- [README.md](./README.md) ou [../README.md](../README.md)

---

# Fichas Heatmap Diagnostics - Testing Guide

## Overview
This patch adds support for decimal comma coordinate formats and enhanced diagnostics for the fichas heatmap feature.

## New Features

### 1. Decimal Comma Support
The `parseLatLng` function now supports European-style decimal comma formats:

**Supported formats:**
- `-23,7233014,-46,5439845` (comma decimal for both lat & lng)
- `-23,7233014 ; -46,5439845` (semicolon separator with decimal commas)
- `-23,7233014  -46,5439845` (double space separator with decimal commas)

**Backward compatibility:**
All existing formats continue to work:
- `-23.507144,-46.846307` (standard dot decimal)
- `-23.507144, -46.846307` (with space)
- `-23.507144 -46.846307` (space-separated)
- `-23.507144 ; -46.846307` (semicolon-separated)

### 2. Debug Mode
Enable verbose logging with either:
- **URL parameter:** Add `?debugMap=1` to the page URL
- **Environment variable:** Set `VITE_MAP_DEBUG=1` in `.env`

### 3. Enhanced Diagnostics

#### Console Output (Debug Mode)
When debug mode is enabled, you'll see:
```
🔍 Debug: Problematic rows (first 25)
Row 15: "-200,123,-46,5" - Reason: out-of-bounds
Row 23: "invalid data" - Reason: parse-failed
Row 45: "" - Reason: empty
```

#### Summary (Always Shown)
```javascript
📊 Fichas parsing summary: {
  total: 150,              // Total rows in sheet
  valid: 135,              // Successfully parsed coordinates
  skippedNoValue: 8,       // Empty location cells
  skippedParse: 5,         // Failed to parse
  skippedOutOfBounds: 2,   // Coordinates outside valid range
  decimalCommaConverted: 45, // Decimal comma format converted
  duplicates: 3,           // Duplicate coordinates found
  locationHeader: "Localização (lat,lng)" // Column used
}
```

#### Debug Data (window.__fichasParsed)
Access detailed parsing data from the browser console:
```javascript
window.__fichasParsed
// Returns:
{
  summary: { /* full summary object */ },
  fichasSample: [ /* first 20 fichas */ ],
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### 4. Enhanced Heatmap Rendering
The UnifiedMap component now has:
- Improved logging with `[Heatmap]` and `[Scouters]` prefixes
- Proper layer clearing when switching modes
- Robust handling of empty data arrays
- Better error reporting

## Testing Instructions

### 1. Test Decimal Comma Format

**Step 1:** Add test coordinates to Google Sheet column L:
```
-23,7233014,-46,5439845
-23,5491761,-46,6881783
-23,6234567,-46,7123456
```

**Step 2:** Load the "Área de Abordagem" page

**Step 3:** Switch to "Fichas" view

**Expected result:**
- Console should show: `decimalCommaConverted: 3` (or higher)
- New points should appear on the heatmap
- Valid count should increase

### 2. Test Debug Mode

**Step 1:** Add `?debugMap=1` to the URL:
```
http://localhost:8080/area-de-abordagem?debugMap=1
```

**Step 2:** Switch to "Fichas" view and check console

**Expected output:**
- Detailed row-by-row diagnostics for problematic rows
- Grouped under "🔍 Debug: Problematic rows (first 25)"
- Each row shows: index, raw value, and reason

**Step 3:** Remove `?debugMap=1` and reload

**Expected result:**
- No per-row diagnostics
- Summary still displayed

### 3. Test Window Debug Data

**Step 1:** Open browser console

**Step 2:** After fichas load, type:
```javascript
window.__fichasParsed
```

**Expected output:**
```javascript
{
  summary: {
    total: 150,
    valid: 135,
    // ... more fields
  },
  fichasSample: [
    { lat: -23.723, lng: -46.543, localizacao: "..." },
    // ... up to 20 samples
  ],
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### 4. Test Mode Switching

**Step 1:** Load "Área de Abordagem" page

**Step 2:** Start in "Scouters" mode (default)

**Step 3:** Switch to "Fichas" mode

**Expected console output:**
```
[Scouters] Clearing cluster layer (switched to fichas mode)
[Heatmap] Effect triggered
[Heatmap] Rendering 135 fichas
[Heatmap] Layer added successfully
```

**Step 4:** Switch back to "Scouters"

**Expected console output:**
```
[Heatmap] Clearing heatmap layer (switched to scouters mode)
[Scouters] Effect triggered
[Scouters] Ready to display X scouters on map
```

### 5. Test Reload Button

**Step 1:** In "Fichas" mode, click "Recarregar Fichas" button

**Expected behavior:**
- Button shows loading spinner
- Heatmap automatically updates after refetch
- Console shows new parsing summary
- `window.__fichasParsed.timestamp` updates

## Common Issues and Solutions

### Issue: Coordinates not parsing
**Check:**
1. Format matches one of the supported patterns
2. Latitude is between -90 and 90
3. Longitude is between -180 and 180
4. No extra characters or formatting

**Debug:**
```javascript
// Enable debug mode to see why rows are skipped
// Add ?debugMap=1 to URL
```

### Issue: No fichas displayed
**Check:**
1. Column L contains coordinate data
2. Console shows `valid: X` where X > 0
3. No JavaScript errors in console
4. Switched to "Fichas" view mode

**Debug:**
```javascript
// Check parsed data
console.log(window.__fichasParsed.summary);
console.log(window.__fichasParsed.fichasSample);
```

### Issue: Heatmap not updating
**Check:**
1. React Query cache might be stale
2. Use "Recarregar Fichas" button
3. Check console for `[Heatmap]` logs

**Debug:**
```javascript
// Force refetch
window.location.reload();
```

## Performance Notes

- **Duplicate handling:** Duplicates are counted but NOT excluded (as per spec)
- **Debug mode:** Only logs first 25 problematic rows to avoid console spam
- **Summary logs:** Always compact and performant
- **Window data:** Limited to first 20 fichas to avoid memory issues

## Backward Compatibility

All existing features remain unchanged:
- ✅ Reload button functionality
- ✅ Keyboard shortcuts
- ✅ Timestamp display
- ✅ Count display
- ✅ Standard coordinate formats
- ✅ Scouters clustering
- ✅ Map navigation and zoom

## Code Changes Summary

### Files Modified:
1. `src/services/googleSheetsMapService.ts`
   - Enhanced `parseLatLng()` with decimal comma support
   - Enhanced `fetchFichasData()` with diagnostics
   - Added debug mode detection
   - Added window.__fichasParsed exposure

2. `src/components/map/UnifiedMap.tsx`
   - Improved heatmap effect with better logging
   - Enhanced scouters effect with better logging
   - Proper layer clearing when switching modes
   - More robust empty data handling

### Lines Changed:
- `googleSheetsMapService.ts`: ~150 lines modified/added
- `UnifiedMap.tsx`: ~40 lines modified

## Future Improvements

Potential enhancements not included in this patch:
- Geocoding support for address strings
- Custom coordinate format validation rules
- Export diagnostics to file
- Visual indicators for problematic rows in UI
- Batch coordinate validation API
