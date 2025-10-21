# Field Mapping Implementation

## Overview
This document describes the implementation of the field mapping feature for the Gestão Scouter export functionality.

## Changes Made

### 1. Created FieldMappingDialog Component
**File:** `src/components/sync/FieldMappingDialog.tsx`

A new reusable component that provides a drag-and-drop interface for mapping fields between two systems:
- **Left Column**: Gestão Scouter fields (destination)
- **Right Column**: Tabuladormax fields (source)

#### Features:
- Drag-and-drop functionality using `@dnd-kit`
- Visual feedback when dragging fields
- Shows which fields are already assigned
- Displays count of mapped fields
- Allows removing existing mappings
- Saves and persists mappings

#### Key Components:
- `DraggableField`: Represents a Tabuladormax field that can be dragged
- `MappingRow`: Represents a Gestão Scouter field with its mapping target
- `useDroppable`: Hook to make Gestão Scouter fields droppable zones

### 2. Modified GestaoScouterExportTab Component
**File:** `src/components/sync/GestaoScouterExportTab.tsx`

Updated the export tab to use the new field mapping dialog instead of checkboxes:

#### Changes:
- Removed checkbox-based field selection UI
- Added "Configurar Mapeamento de Campos" button with Settings2 icon
- Shows badge with count of mapped fields
- Stores field mappings in component state
- Converts field mappings to backend format before export
- Updated export API call to send `fieldMappings` instead of `fieldsSelected`

### 3. Added Tests
**File:** `src/components/sync/__tests__/FieldMappingDialog.test.tsx`

Created comprehensive tests for the FieldMappingDialog component:
- Renders dialog when open
- Displays both columns correctly
- Doesn't render when closed
- Shows count of mapped fields correctly
- Handles initial mappings properly

## User Interface Changes

### Before:
- Checkbox list for selecting fields
- "Select All" option
- Static field list

### After:
- Button to open field mapping dialog
- Badge showing number of mapped fields
- Interactive drag-and-drop interface
- Two-column layout for better visualization
- Clear mapping relationships

## Technical Details

### Drag and Drop Implementation
Uses `@dnd-kit` library with the following setup:
- `DndContext`: Main context for drag-and-drop
- `useSortable`: For draggable Tabuladormax fields
- `useDroppable`: For droppable Gestão Scouter field zones
- Visual feedback during drag operations

### Data Flow
1. User clicks "Configurar Mapeamento de Campos"
2. Dialog opens with current mappings (if any)
3. User drags Tabuladormax fields to Gestão Scouter fields
4. Mappings are updated in real-time
5. User clicks "Salvar Mapeamento"
6. Mappings are stored in component state
7. On export, mappings are converted to backend format

### Backend Integration
The export function now sends:
```javascript
{
  action: "create",
  startDate: "...",
  endDate: "...",
  fieldMappings: {
    "gestao_field_id": "tabuladormax_field_id",
    ...
  }
}
```

Instead of the previous:
```javascript
{
  action: "create",
  startDate: "...",
  endDate: "...",
  fieldsSelected: ["field1", "field2", ...]
}
```

## Testing

All existing tests continue to pass (257 tests).
New tests added specifically for FieldMappingDialog (5 tests).

### Running Tests:
```bash
npm test -- --run
```

## Future Enhancements

Potential improvements for future iterations:
1. Persist mappings to database for reuse across sessions
2. Add preset mapping templates
3. Allow auto-mapping based on field name similarity
4. Add validation to ensure required fields are mapped
5. Support for custom field transformations
6. Export/import mapping configurations

## Migration Notes

**Note for Backend Developers:**
The backend export function needs to be updated to handle the new `fieldMappings` parameter instead of `fieldsSelected`. The mapping object provides a more explicit relationship between source and destination fields.
