# Visual Summary - Field Mapping Feature

## UI Changes Overview

### Before (Old Implementation)
```
┌─────────────────────────────────────────────────────────────┐
│ Campos a Exportar                                           │
├─────────────────────────────────────────────────────────────┤
│ ☑ Selecionar Todos os Campos                                │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Nome              ☑ Celular         ☑ Etapa          │ │
│ │ ☑ Responsável       ☑ Tel. Trabalho   ☑ Fonte          │ │
│ │ ☑ Idade             ☑ Tel. Casa       ☑ Nome Modelo    │ │
│ │ ☑ Endereço          ☑ Scouter         ☑ Local Abord.   │ │
│ │ ... (more checkboxes)                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Todos os campos disponíveis serão exportados               │
└─────────────────────────────────────────────────────────────┘
```

### After (New Implementation)
```
┌─────────────────────────────────────────────────────────────┐
│ Mapeamento de Campos                                        │
├─────────────────────────────────────────────────────────────┤
│ Configure o mapeamento entre os campos do Tabuladormax     │
│ e do Gestão Scouter                                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚙️  Configurar Mapeamento de Campos    [3 mapeado(s)]  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Field Mapping Dialog

When user clicks "Configurar Mapeamento de Campos":

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Mapeamento de Campos                                                    │ │
│ Arraste os campos do Tabuladormax (direita) para os campos             │ │
│ correspondentes do Gestão Scouter (esquerda)                           │ │
├──────────────────────────────────┬────────────────────────────────────────┤
│ Campos Gestão Scouter            │ Campos Tabuladormax                   │
│                                  │                                        │
│ ┌──────────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ │ Nome → [Nome (Tab...)] [×]   │ │ │ ≡ Nome (Tabuladormax)              │ │
│ │ Responsável → Arraste...     │ │ │ ≡ Responsável (Tabuladormax)       │ │
│ │ Idade → [Idade (Tab...)] [×] │ │ │ ≡ Idade (Tabuladormax) (Atribuído)│ │
│ │ Endereço → Arraste...        │ │ │ ≡ Endereço (Tabuladormax)          │ │
│ │ Scouter → Arraste...         │ │ │ ≡ Scouter (Tabuladormax)           │ │
│ │ Celular → [Cel. (Tab.)] [×]  │ │ │ ≡ Celular (Tabuladormax)           │ │
│ │ ...                          │ │ │ ...                                │ │
│ └──────────────────────────────┘ │ └────────────────────────────────────┘ │
│                                  │                                        │
└──────────────────────────────────┴────────────────────────────────────────┘
                          3 campo(s) mapeado(s)
                    [Cancelar]  [Salvar Mapeamento]
```

## Interaction Flow

### Step 1: Opening the Dialog
```
User Action: Click "Configurar Mapeamento de Campos" button
   ↓
System Response: Opens FieldMappingDialog with two columns
   ↓
Display: Shows all Gestão Scouter fields on left, Tabuladormax fields on right
```

### Step 2: Mapping Fields
```
User Action: Drag "Nome (Tabuladormax)" from right column
   ↓
Visual Feedback: Field becomes semi-transparent, drag overlay appears
   ↓
User Action: Drop on "Nome" in left column
   ↓
System Response: Creates mapping connection
   ↓
Display: "Nome → Nome (Tabuladormax) [×]" shown in left column
        "Nome (Tabuladormax) (Atribuído)" shown in right column
```

### Step 3: Removing Mapping
```
User Action: Click [×] button on mapped field
   ↓
System Response: Removes mapping
   ↓
Display: "Nome → Arraste um campo aqui" shown
        "Nome (Tabuladormax)" becomes draggable again
```

### Step 4: Saving Mappings
```
User Action: Click "Salvar Mapeamento"
   ↓
System Response: 
  - Saves mappings to component state
  - Shows toast: "3 campo(s) mapeado(s) com sucesso!"
  - Closes dialog
   ↓
Display: Button shows badge "3 mapeado(s)"
```

### Step 5: Exporting Data
```
User Action: Click "Iniciar Exportação"
   ↓
System Processing:
  - Converts mappings to backend format:
    {
      "name": "tab_name",
      "age": "tab_age",
      "celular": "tab_celular"
    }
  - Sends to export-to-gestao-scouter-batch function
   ↓
Backend: Uses field mappings to export data correctly
```

## Visual States

### Drag States
- **Idle**: Field with grip icon (≡) and white background
- **Dragging**: Field semi-transparent, drag overlay following cursor
- **Over Target**: Target field highlighted with blue background
- **Assigned**: Field greyed out with "(Atribuído)" badge

### Mapping States
- **Empty**: "Arraste um campo aqui" in grey italic text
- **Mapped**: Badge showing field name with [×] remove button
- **Hover on Remove**: [×] button changes color

## Color Scheme

- **Primary Action**: Blue for active states
- **Mapped Fields**: Outlined badges
- **Assigned Fields**: Grey background, opacity reduced
- **Drop Targets**: Blue highlight on hover
- **Success**: Green toast notification

## Accessibility Features

- Keyboard navigation support (via @dnd-kit)
- Clear visual indicators for drag states
- Remove buttons clearly visible
- Toast notifications for actions
- Descriptive labels and instructions

## Responsive Design

- Two-column layout on desktop
- Scrollable columns for many fields
- Fixed height (500px) with scroll
- Full-width dialog (max-w-6xl)
- Grid layout: grid-cols-2

## Technical Implementation

### Components Used
- Dialog (shadcn/ui)
- ScrollArea (shadcn/ui)
- Badge (shadcn/ui)
- Button (shadcn/ui)
- DndContext (@dnd-kit)
- useSortable (@dnd-kit)
- useDroppable (@dnd-kit)

### State Management
- React useState for mappings
- Component-level state (can be upgraded to global state/DB)
- Real-time visual updates during drag operations

## Benefits

1. **Better UX**: Visual mapping is more intuitive than checkboxes
2. **Clearer Relationships**: Shows exact field-to-field connections
3. **Flexibility**: Easy to map fields with different names
4. **Reusability**: Mappings can be saved and reused
5. **Error Prevention**: Can see unmapped required fields
6. **Professional**: More polished interface

## Future Enhancements

1. Save mappings to database for persistence
2. Create mapping templates (presets)
3. Auto-suggest mappings based on field names
4. Validate required field mappings
5. Support for field transformations
6. Import/export mapping configurations
