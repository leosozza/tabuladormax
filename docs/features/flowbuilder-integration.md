# FlowBuilder Integration with Button Configuration

## Overview

This feature integrates the visual FlowBuilder editor directly into button configuration dialogs, allowing users to:
- Visualize button automations as node-based flows
- Convert existing button configurations into flows
- Edit and save flows using a visual editor

## Reference Design

![Reference Design](https://github.com/user-attachments/assets/c4694d4e-06fc-46f3-90c5-2158649ac1ff)

## Features

### 1. Visualizar como Flow (View as Flow)
- **Location**: Button Edit Dialog footer
- **Icon**: Eye icon
- **Function**: Converts the current button configuration to a Flow and opens it in read-only mode in FlowExecuteModal
- **Use case**: Preview how the button actions would look as a flow without editing

### 2. Abrir no FlowBuilder (Open in FlowBuilder)
- **Location**: Button Edit Dialog footer
- **Icon**: Workflow icon
- **Function**: Converts the current button configuration to a Flow and opens it in the FlowBuilder editor
- **Use case**: Edit button automation as a flow, add additional steps, and save as a new flow

## How It Works

### Button to Flow Conversion

The `createFlowFromButton` utility (`src/handlers/flowFromButton.ts`) converts button configurations into Flow format:

1. **Main Action**: The primary button action becomes the first flow step
   - If `action_type` is 'tabular' or undefined → creates a `tabular` step
   - If `action_type` is 'http_call' → creates an `http_call` step

2. **Sub-buttons**: Each sub-button becomes an additional flow step
   - Mapped as sequential `tabular` steps

3. **Additional Fields**: Preserved in step configuration
   - Included in the step's `config.additional_fields`

### Flow Step Types

The converter supports:
- **Tabular steps**: For button actions that update Bitrix/Supabase fields
- **HTTP call steps**: For webhook-based button actions
- **Wait steps**: Can be added in FlowBuilder after conversion

## Usage Instructions

### Prerequisites
- User must be authenticated via Chatwoot
- Navigate to LeadTab
- Have at least one button configured

### Steps to Use

1. **Open Button Configuration**
   - Click "Configurar Botões" in LeadTab
   - Select a button to edit
   - Button Edit Dialog opens

2. **Visualize as Flow**
   - Click "Visualizar como Flow" button (Eye icon)
   - FlowExecuteModal opens showing the flow in read-only mode
   - You can execute the flow by providing a leadId
   - Modal shows flow steps as a sequence

3. **Edit in FlowBuilder**
   - Click "Abrir no FlowBuilder" button (Workflow icon)
   - FlowBuilder opens in edit mode
   - You can:
     - Modify existing steps
     - Add new steps (Tabular, HTTP, Wait)
     - Reorder steps
     - Delete steps
   - Click "Salvar Flow" to persist the flow via flows-api

## Technical Details

### Files Modified
- `src/components/ButtonEditDialog.tsx`: Added Flow integration buttons and modals
- `src/handlers/flowFromButton.ts`: Utility for converting button config to Flow

### Dependencies
- Existing FlowBuilder component (`src/components/flow/FlowBuilder.tsx`)
- Existing FlowExecuteModal component (`src/components/flow/FlowExecuteModal.tsx`)
- Flow types (`src/types/flow.ts`)

### API Endpoints Used
- **flows-api** (`POST /functions/v1/flows-api`): Create/update flows
- **flows-executor** (`POST /functions/v1/flows-executor`): Execute flows

### State Management
- `flowBuilderOpen`: Controls FlowBuilder modal visibility
- `flowExecuteOpen`: Controls FlowExecuteModal visibility
- `currentFlow`: Holds the converted Flow object

## Example Flow Conversion

### Input: Button Configuration
```json
{
  "id": "btn-123",
  "label": "Qualificar Lead",
  "description": "Marca lead como qualificado",
  "action_type": "tabular",
  "field": "STATUS_ID",
  "value": "QUALIFIED",
  "webhook_url": "https://api.example.com/webhook",
  "additional_fields": [
    { "field": "PRIORITY", "value": "HIGH" }
  ]
}
```

### Output: Flow Object
```json
{
  "id": "",
  "nome": "Flow: Qualificar Lead",
  "descricao": "Flow gerado a partir do botão Qualificar Lead",
  "steps": [
    {
      "id": "step-main-btn-123",
      "type": "tabular",
      "nome": "Qualificar Lead",
      "descricao": "Marca lead como qualificado",
      "config": {
        "buttonId": "btn-123",
        "webhook_url": "https://api.example.com/webhook",
        "field": "STATUS_ID",
        "value": "QUALIFIED",
        "additional_fields": [
          { "field": "PRIORITY", "value": "HIGH" }
        ]
      }
    }
  ],
  "ativo": true,
  "criado_em": "2025-10-12T00:00:00Z",
  "atualizado_em": "2025-10-12T00:00:00Z"
}
```

## UI Components

### Button Edit Dialog Footer
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  [🗑️]  [👁️ Visualizar como Flow]  [⚡ Abrir no Flow] │  [💾 Salvar]
│                                                        │
└────────────────────────────────────────────────────────┘
```

### FlowExecuteModal
- Shows flow steps in sequence
- Allows input of leadId for execution
- Displays execution logs and results
- Read-only view of flow structure

### FlowBuilder
- Visual editor with step management
- Add/remove/reorder steps
- Configure step parameters
- Save flow to database

## Future Enhancements
- Drag-and-drop node-based visual editor (react-flow-renderer)
- Real-time flow execution preview
- Flow templates for common button patterns
- Import/export flows between buttons
