# Bulk Delete - Visual UI Guide

## UI Components Added

### 1. Delete Button in Header
**Location**: Leads page, table header (CardHeader)
**Behavior**: Conditionally rendered

```
Before any selection:
┌─────────────────────────────────────────────────────────┐
│ Lista de Leads                                          │
│                    [❤️ Iniciar Análise (0)] [📥 Exportar]│
└─────────────────────────────────────────────────────────┘

After selecting 3 leads:
┌─────────────────────────────────────────────────────────┐
│ Lista de Leads                                          │
│ [🗑️ Excluir Selecionados (3)]                          │
│                    [❤️ Iniciar Análise (3)] [📥 Exportar]│
└─────────────────────────────────────────────────────────┘
```

**Button Properties**:
- Color: Red (destructive variant)
- Icon: Trash2 (🗑️)
- Text: "Excluir Selecionados (N)" where N = number of selected leads
- State: Disabled during deletion operation
- Visibility: Only visible when selectedLeads.length > 0

### 2. Confirmation Dialog
**Triggered**: When user clicks "Excluir Selecionados" button

```
┌─────────────────────────────────────────────────────┐
│                  Confirmar Exclusão                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Você tem certeza que deseja excluir 3 lead(s)     │
│  selecionado(s)?                                    │
│  Esta ação não pode ser desfeita.                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                           [Cancelar] [Excluir] ←red │
└─────────────────────────────────────────────────────┘
```

**Dialog Properties**:
- Title: "Confirmar Exclusão"
- Description: Dynamic count of selected leads
- Warning: "Esta ação não pode ser desfeita."
- Buttons:
  - Cancel: Gray outline button (left)
  - Excluir: Red button (right, bg-red-600)
- During deletion: Button text changes to "Excluindo..."

### 3. Toast Notifications

**Success Message**:
```
┌────────────────────────────────────┐
│ ✅ 3 lead(s) excluído(s) com       │
│    sucesso                         │
└────────────────────────────────────┘
```

**Error Message** (if deletion fails):
```
┌────────────────────────────────────┐
│ ❌ Erro ao deletar leads           │
│    [Error description]             │
└────────────────────────────────────┘
```

**No Selection Error**:
```
┌────────────────────────────────────┐
│ ❌ Nenhum lead selecionado         │
└────────────────────────────────────┘
```

## User Interaction Flow

### Step-by-Step UI Changes

1. **Initial State** - No selection
   ```
   [All checkboxes unchecked]
   Delete button: HIDDEN
   ```

2. **After Selecting 1+ Leads**
   ```
   [Some checkboxes checked]
   Delete button: VISIBLE, ENABLED
   Button text: "Excluir Selecionados (N)"
   ```

3. **Click Delete Button**
   ```
   Delete button: ENABLED
   Dialog: OPENS with confirmation message
   ```

4. **During Deletion** (after clicking "Excluir")
   ```
   Delete button: DISABLED
   Dialog button text: "Excluindo..."
   Dialog buttons: DISABLED
   ```

5. **After Successful Deletion**
   ```
   Dialog: CLOSES
   Toast: SUCCESS message appears
   Table: REFRESHES automatically
   Selection: CLEARED
   Delete button: HIDDEN (no selection)
   ```

6. **After Cancellation**
   ```
   Dialog: CLOSES
   Selection: UNCHANGED
   Delete button: STILL VISIBLE
   ```

## Responsive Design

### Desktop View (sm: and above)
```
┌────────────────────────────────────────────────────────┐
│ Lista de Leads                                         │
│ [🗑️ Excluir...] [❤️ Iniciar...] [📥 Exportar]         │
└────────────────────────────────────────────────────────┘
```

### Mobile View (below sm:)
```
┌──────────────────────┐
│ Lista de Leads       │
├──────────────────────┤
│ [🗑️ Excluir...]      │
│ [❤️ Iniciar...]      │
│ [📥 Exportar]        │
└──────────────────────┘
```

The buttons are wrapped with `flex-wrap` class, so they stack on smaller screens.

## Accessibility Features

1. **Button States**: Clear visual feedback for enabled/disabled states
2. **Color Coding**: Red for destructive actions (standard pattern)
3. **Confirmation**: Required confirmation prevents accidental deletion
4. **Loading Indicators**: "Excluindo..." text shows operation in progress
5. **Toast Messages**: Clear feedback on success/failure
6. **Count Display**: Always shows how many leads are affected

## Integration with Existing Features

The bulk delete feature integrates seamlessly with:

1. **Selection System**: Uses existing DataTable checkbox selection
2. **Tinder Analysis**: Both features use the same selection state
3. **Export**: All three action buttons coexist in the header
4. **Filters**: Deletion works with filtered data
5. **Pagination**: Selection works across pages

## Design Consistency

The implementation follows existing patterns:
- Uses shadcn/ui components (AlertDialog)
- Matches button styling (rounded-xl)
- Uses lucide-react icons
- Follows toast notification patterns
- Maintains color scheme (red for destructive)
