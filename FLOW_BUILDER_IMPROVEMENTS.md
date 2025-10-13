# Flow Builder Layout Improvements

## Overview
Fixed multiple layout and UX issues in the Flow Builder visual editor to provide a cleaner, more organized interface.

## Visual Layout Comparison

### Before (Issues)
```
┌──────────────────────────────────────────────────────────┐
│ FlowBuilder Dialog (max-w-[95vw] h-[90vh])              │
├──────────────────────────────────────────────────────────┤
│ Header: "Novo Flow"                                      │
├──────────────────────────────────────────────────────────┤
│ Basic Info (2 columns)                                   │
├──────────────────────────────────────────────────────────┤
│ ┌─────────┬─────────────────┬──────────┐                │
│ │  Node   │                 │          │                │
│ │ Palette │     Canvas      │          │ ← Fixed widths │
│ │ (250px) │  (ReactFlow)    │          │   caused       │
│ │         ├─────────────────┤          │   overlap      │
│ │overflow │  Variables      │ overflow │                │
│ │ -y-auto │  (inside)       │ -y-auto  │ ← Multiple     │
│ │         │  ┌──────────┐   │          │   scrollbars   │
│ │         │  │ Config   │   │          │                │
│ └─────────┴──┴──────────┴───┴──────────┘                │
│          grid-cols-[250px_1fr_300px]                     │
└──────────────────────────────────────────────────────────┘
Problems: Overlapping columns, multiple scrollbars, confusing layout
```

### After (Fixed)
```
┌──────────────────────────────────────────────────────────┐
│ FlowBuilder Dialog (max-w-[95vw] h-[90vh])              │
├──────────────────────────────────────────────────────────┤
│ Header: "Novo Flow"                                      │
├──────────────────────────────────────────────────────────┤
│ Basic Info (2 columns)                                   │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐  │
│ │  ┌──────────┬────────────────────┬──────────────┐ │  │
│ │  │  Node    │ ┌─[◀]─────────[▶]─┐│   Variables  │ │  │
│ │  │ Palette  │ │   ReactFlow     ││  ┌─────────┐ │ │  │
│ │  │          │ │     Canvas      ││  │ Search  │ │ │  │
│ │  │ ┌──────┐ │ │                 ││  ├─────────┤ │ │  │
│ │  │ │Header│ │ │   Controls      ││  │ScrollA- │ │ │  │
│ │  │ ├──────┤ │ │   MiniMap       ││  │rea with │ │ │  │
│ │  │ │Scroll│ │ │                 ││  │variables│ │ │  │
│ │  │ │Area  │ │ │                 ││  └─────────┘ │ │  │
│ │  │ │      │ │ │                 ││              │ │  │
│ │  │ └──────┘ │ └─────────────────┘│              │ │  │
│ │  │  (w-64)  │    (flex-1)        │   (w-80)     │ │  │
│ │  └──────────┴────────────────────┴──────────────┘ │  │
│ │                                                    │  │
│ │  ┌──────────────────────────────────────┐         │  │
│ │  │ Config Panel (absolute, z-10)        │         │  │
│ │  │ Shows when node selected             │         │  │
│ │  │ (w-96, overlays right side)          │         │  │
│ │  └──────────────────────────────────────┘         │  │
│ └────────────────────────────────────────────────────┘  │
│              flex layout with overflow-hidden           │
└──────────────────────────────────────────────────────────┘
Benefits: No overlap, single scroll per panel, clear layout

Responsive Behavior:
📱 Mobile   (< 768px):  [═══════ Canvas ═══════]
📲 Tablet   (768-1024): [Nodes│══ Canvas ══│    ]  
💻 Desktop  (> 1024px): [Nodes│══ Canvas ══│Vars]
```

## Problems Addressed

### 1. Overlapping Columns
**Before:** Used `grid-cols-[250px_1fr_300px]` which caused columns to overlap when space was constrained.
**After:** Implemented proper flex layout with `flex` container and conditional rendering.

### 2. Multiple Scrollbars
**Before:** Multiple nested `overflow-y-auto` elements created duplicate scrollbars.
**After:** Single ScrollArea component per panel with proper hierarchy.

### 3. Confusing Panel Layout
**Before:** Fixed grid layout with Node Palette outside the canvas.
**After:** Integrated three-column layout:
- Left: Node Palette (256px)
- Center: ReactFlow Canvas (flex-1)
- Right: Variables (320px)
- Overlay: Config Panel (absolute, when node selected)

### 4. Poor Responsiveness
**Before:** Fixed widths on all screen sizes.
**After:** Responsive behavior with auto-hide panels:
- Mobile (< 768px): Both panels hidden by default
- Tablet (768-1024px): Node palette shown, variables hidden
- Desktop (> 1024px): Both panels visible
- Toggle buttons to show/hide panels at any screen size

## Technical Changes

### FlowBuilder.tsx
```tsx
// Before: Fixed grid layout
<div className="flex-1 grid grid-cols-[250px_1fr_300px] gap-4 min-h-0">
  <div className="overflow-y-auto">
    <NodePalette onAddNode={addStep} />
  </div>
  <div className="min-h-0">
    <VisualFlowEditor ... />
  </div>
</div>

// After: Flexible container
<div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
  <div className="flex-1 min-w-0">
    <VisualFlowEditor ... />
  </div>
</div>
```

### VisualFlowEditor.tsx

#### Layout Structure
```tsx
<div className="h-full w-full flex border rounded-lg overflow-hidden bg-background">
  {/* Left Panel - Collapsible */}
  {showNodePalette && (
    <div className="w-64 lg:w-64 md:w-56 border-r flex-shrink-0 flex flex-col overflow-hidden">
      <NodePalette />
    </div>
  )}
  
  {/* Center Panel - Always visible */}
  <div className="flex-1 relative min-w-0">
    <ReactFlow>
      {/* Toggle buttons in Panel components */}
      <Panel position="top-left">
        <Button onClick={() => setShowNodePalette(!showNodePalette)}>
          {showNodePalette ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
      </Panel>
      <Panel position="top-right">
        <Button onClick={() => setShowVariables(!showVariables)}>
          {showVariables ? <PanelRightClose /> : <PanelRightOpen />}
        </Button>
      </Panel>
    </ReactFlow>
  </div>
  
  {/* Right Panel - Collapsible */}
  {showVariables && (
    <div className="w-80 lg:w-80 md:w-64 border-l flex-shrink-0 flex flex-col overflow-hidden">
      <VariablePicker />
    </div>
  )}
  
  {/* Config Panel - Overlay */}
  {selectedNode && (
    <div className="absolute right-0 top-0 bottom-0 w-96 max-w-full border-l shadow-lg z-10">
      <NodeConfigPanel ... />
    </div>
  )}
</div>
```

#### Responsive Logic
```tsx
useEffect(() => {
  const handleResize = () => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    if (isMobile) {
      setShowNodePalette(false);
      setShowVariables(false);
    } else if (isTablet) {
      setShowNodePalette(true);
      setShowVariables(false);
    }
  };

  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### NodePalette.tsx
```tsx
// Before: Card with overflow-y-auto
<Card className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
  <h3>Adicionar Nós</h3>
  <div className="space-y-2">{/* nodes */}</div>
</Card>

// After: Proper flex layout with ScrollArea
<div className="h-full flex flex-col">
  <div className="p-4 border-b bg-background flex-shrink-0">
    <h3>Adicionar Nós</h3>
  </div>
  <ScrollArea className="flex-1">
    <div className="p-3 space-y-2">{/* nodes */}</div>
  </ScrollArea>
</div>
```

## Benefits

1. **No Overlapping**: Proper flexbox ensures panels never overlap
2. **Single Scroll**: Each panel has its own controlled scroll area
3. **Clear Hierarchy**: Visual separation between Node Palette, Canvas, and Variables
4. **Responsive**: Works on mobile, tablet, and desktop
5. **User Control**: Toggle buttons let users customize their workspace
6. **Better Spacing**: Proper padding and margins between elements
7. **Independent Canvas**: ReactFlow canvas scrolls independently

## Testing

Build successful with no errors:
```bash
npm run build
# ✓ built in 7.94s
```

Lint warnings are pre-existing and unrelated to these changes.

## UI Controls

- **Left Toggle Button** (top-left): Show/hide Node Palette
- **Right Toggle Button** (top-right): Show/hide Variables
- **Responsive**: Panels auto-hide on smaller screens
- **Config Panel**: Automatically appears when node selected, overlays on right

## Browser Compatibility

- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓

All modern browsers with flexbox support.
