## ⚠️ NOTA: Este documento está obsoleto ou parcialmente obsoleto

**Status**: ⚠️ Este documento contém referências a implementações antigas que dependiam de Google Sheets.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) ou [../LEADS_DATA_SOURCE.md](../LEADS_DATA_SOURCE.md)
- [README.md](./README.md) ou [../README.md](../README.md)

---

# Enterprise Fichas Module - Quick Reference

## Feature Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE FICHAS MODULE                      │
│                   /area-de-abordagem (Fichas Tab)                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Date Filter     │  │  Map Controls    │  │  Fullscreen Btn  │
│  (Top-Left)      │  │  (Top-Right)     │  │  (Top-Right)     │
│                  │  │                  │  │                  │
│ [Start] [End]    │  │ [Desenhar]       │  │     [⤢]          │
│ [Aplicar][Limpar]│  │ [Limpar]         │  │                  │
└──────────────────┘  │ [Center]         │  └──────────────────┘
                      │ [Refresh]        │
                      └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐      │
│   │                                                       │      │
│   │              MAP AREA                                 │      │
│   │         (Leaflet + Geoman)                           │      │
│   │                                                       │      │
│   │    • Base Tiles (OpenStreetMap)                      │      │
│   │    • Base Heat Layer (all/filtered fichas)           │      │
│   │    • Selection Heat Layer (realtime during draw)     │      │
│   │    • Cluster Markers                                 │      │
│   │    • Drawn Polygon (selection area)                  │      │
│   │                                                       │      │
│   └──────────────────────────────────────────────────────┘      │
│                                                                  │
│   ┌──────────────────────┐                                      │
│   │  ADVANCED SUMMARY    │ ← Appears after polygon drawn        │
│   │  (Top-Right Overlay) │                                      │
│   ├──────────────────────┤                                      │
│   │ [Baixar PDF]  [CSV]  │                                      │
│   ├──────────────────────┤                                      │
│   │ Total: 245 fichas    │                                      │
│   ├──────────────────────┤                                      │
│   │ ▼ Projeto A (120)    │                                      │
│   │   • Scouter 1: 80    │                                      │
│   │   • Scouter 2: 40    │                                      │
│   │ ▶ Projeto B (125)    │                                      │
│   └──────────────────────┘                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow

```
START
  ↓
Load Fichas Data (Google Sheets)
  ↓
[Optional] Apply Date Filter → Updates Base Heat + Clusters
  ↓
Click "Desenhar" Button
  ↓
Map Locks (no pan/zoom) + Cursor changes to Crosshair
  ↓
User Clicks Vertices → Realtime Selection Heat Updates
  ↓
User Double-Clicks to Complete → Polygon Created
  ↓
Map Unlocks + Advanced Summary Panel Appears
  ↓
┌─────────────────────────────────────┐
│ User Actions (from Summary Panel):  │
├─────────────────────────────────────┤
│ • Click "Baixar PDF" → Generate     │
│   comprehensive report              │
│ • Click "Baixar CSV" → Export data  │
│ • Expand/Collapse projects          │
│ • Close panel (X button)            │
│ • Click "Limpar" → Reset selection  │
└─────────────────────────────────────┘
  ↓
[Optional] Enter Fullscreen Mode
  ↓
END (or repeat from "Apply Date Filter")
```

## Data Flow

```
Google Sheets CSV
      ↓
useFichasFromSheets() Hook
      ↓
FichaDataPoint[] (allFichas)
      ↓
      ├─→ [Date Filter Applied?]
      │         ↓ YES
      │   filteredFichas → Base Heat Layer + Clusters
      │         ↓ NO
      └─→ allFichas → Base Heat Layer + Clusters
      
User Draws Polygon
      ↓
pm:drawvertex events → Realtime Heat Layer
      ↓
pm:create event → displayedFichas (spatial filter)
      ↓
generateAnalysis() → AnalysisSummary
      ↓
      ├─→ AdvancedSummary Component (UI)
      ├─→ exportAreaReportPDF() → PDF file
      ├─→ exportAreaReportCSV() → CSV file
      └─→ buildAISummaryFromSelection() → AI insights
```

## Performance Strategy

```
Total Fichas: N points

Step 1: Date Filter (if applied)
  → Filter by date string comparison
  → Result: M points (where M ≤ N)
  → Time: O(N)

Step 2: User draws polygon
  ↓
Step 3: BBox Pre-filter
  → Quick bounds check (lat/lng min/max)
  → Result: P points (where P << M typically)
  → Time: O(M)
  
Step 4: Precise Polygon Filter
  ├─→ IF P < 5000: Sync processing (Turf.js)
  │   → Time: O(P)
  └─→ IF P ≥ 5000: Web Worker processing
      → Time: O(P) but non-blocking
      
Step 5: Display Results
  → Realtime Heat: ~10-50ms per vertex
  → Final Selection: <100ms for most cases
  → Report Generation: 2-10 seconds (includes screenshot)
```

## File Map

```
src/
├── components/FichasMap/
│   ├── DateFilter.tsx              ← 🆕 Date range picker
│   └── AdvancedSummary.tsx         ← 🆕 Collapsible summary + export
│
├── utils/
│   ├── map-helpers.ts              ← 🆕 lockMap, unlockMap, bboxFilter
│   ├── ai-analysis.ts              ← 🆕 buildAISummaryFromSelection
│   └── export-reports.ts           ← 🆕 exportAreaReportPDF/CSV
│
├── workers/
│   └── polygon-filter.worker.ts    ← 🆕 Heavy filtering (5K+ points)
│
└── pages/AreaDeAbordagem/
    ├── FichasTab.tsx               ← ⚡ UPGRADED with all features
    └── mobile.css                  ← ⚡ UPDATED with drawing/fullscreen
```

## Key Events & Hooks

| Event/Hook | Purpose | File Location |
|------------|---------|---------------|
| `pm:drawstart` | Lock map, init realtime heat | FichasTab.tsx:~230 |
| `pm:drawvertex` | Update realtime heat | FichasTab.tsx:~240 |
| `pm:create` | Finalize selection, show summary | FichasTab.tsx:~265 |
| `pm:drawcancel` | Unlock map, clean up | FichasTab.tsx:~295 |
| `fullscreenchange` | Invalidate map size | FichasTab.tsx:~445 |
| `handleExportPDF` | Generate PDF report | FichasTab.tsx:~460 |
| `handleExportCSV` | Generate CSV export | FichasTab.tsx:~490 |

## State Management

```typescript
// Core data states
allFichas          // Unfiltered source from sheets
filteredFichas     // After date filter
displayedFichas    // After spatial selection

// UI states
isDrawing          // Drawing mode active?
showSummary        // Summary panel visible?
isExporting        // Export in progress?
isFullscreen       // Fullscreen mode active?
hasDateFilter      // Date filter applied?

// Refs
mapRef             // Leaflet map instance
heatLayerRef       // Base heat layer
heatSelectedRef    // Realtime selection heat
drawnLayerRef      // Polygon layer
clusterGroupRef    // Cluster markers
```

## Export File Naming

```
PDF: relatorio-area-YYYYMMDD-HHmm.pdf
  Example: relatorio-area-20240102-1430.pdf

CSV: resumo-area-YYYYMMDD-HHmm.csv
  Example: resumo-area-20240102-1430.csv
```

## Color Schemes

**Base Heat** (all/filtered fichas):
- 0.0 → Green (#4ade80)
- 0.5 → Yellow (#fbbf24)
- 0.8 → Orange (#f97316)
- 1.0 → Red (#ef4444)

**Selection Heat** (realtime during drawing):
- 0.0 → Blue (#3b82f6)
- 0.5 → Purple (#8b5cf6)
- 0.8 → Pink (#ec4899)
- 1.0 → Red (#ef4444)

**Cluster Colors**:
- Small (<10): #FF6B35, 40px
- Medium (10-99): #FF6B35, 50px
- Large (100+): #FF6B35, 60px

## CSS Classes Reference

| Class | Purpose | File |
|-------|---------|------|
| `.body--drawing` | Applied to body during drawing | mobile.css:28 |
| `.fullscreen-container` | Fullscreen wrapper | mobile.css:164 |
| `.fullscreen-button` | Fullscreen toggle button | mobile.css:179 |
| `.touch-manipulation` | Touch-friendly controls | mobile.css:8 |
| `.drawing-mode` | Map in drawing state | mobile.css:112 |

## Browser Console Debug

```javascript
// Check if features are available
document.fullscreenEnabled     // Should be true
typeof Worker !== 'undefined'  // Should be true

// Access map instance (in dev tools)
// (requires manual inspection of React DevTools)

// Check heat layers
// heatLayerRef.current
// heatSelectedRef.current

// Monitor events
map.on('pm:drawstart', () => console.log('Draw started'));
map.on('pm:drawvertex', (e) => console.log('Vertex added', e));
```

---

**Legend**:
- 🆕 New file created
- ⚡ Existing file upgraded
- ← Describes purpose
- → Indicates flow direction
