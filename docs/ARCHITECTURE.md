# FlowBuilder Integration - Visual Architecture

## Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        ButtonEditDialog                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Button Configuration Fields                  │   │
│  │  - Label, Color, Category                                │   │
│  │  - Field, Value, Webhook URL                             │   │
│  │  - Additional Fields, Sub-buttons                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Footer Buttons                         │   │
│  │                                                           │   │
│  │  [🗑️ Delete]  [👁️ Visualizar Flow]  [⚙️ FlowBuilder*]  [💾 Save] │
│  │                                        *Admin Only         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  When user clicks "Visualizar Flow" or "Abrir no FlowBuilder":  │
│                                                                   │
│  ┌───────────────────┐                                          │
│  │ flowFromButton.ts │  Converts button config → Flow          │
│  │                   │                                           │
│  │  Button Config    │  ┌─────────────────────────────────┐   │
│  │  ├─ label         │→ │ Flow                            │   │
│  │  ├─ field         │→ │  ├─ nome: "Flow: [label]"      │   │
│  │  ├─ value         │→ │  ├─ steps: [                   │   │
│  │  ├─ webhook_url   │→ │  │   {                          │   │
│  │  └─ sub_buttons[] │→ │  │     type: 'tabular',        │   │
│  │                   │  │  │     config: {...}            │   │
│  │                   │  │  │   },                         │   │
│  │                   │  │  │   {                          │   │
│  │                   │  │  │     type: 'change_status',  │   │
│  │                   │  │  │     config: {...}            │   │
│  │                   │  │  │   }                          │   │
│  │                   │  │  └─]                            │   │
│  └───────────────────┘  └─────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ Opens one of:
                              │
            ┌─────────────────┴─────────────────┐
            │                                     │
            ▼                                     ▼
   ┌──────────────────────┐         ┌──────────────────────┐
   │ FlowExecuteModal     │         │   FlowBuilder        │
   │  (Read-Only)         │         │   (Editable)         │
   │                      │         │                      │
   │ - Show flow steps    │         │ - Edit flow name     │
   │ - Execute with lead  │         │ - Add/remove steps   │
   │ - View logs          │         │ - Reorder steps      │
   │ - Cannot edit        │         │ - Configure each     │
   │                      │         │                      │
   │ [Execute] [Close]    │         │ [Save] [Cancel]      │
   └──────────────────────┘         └──────────────────────┘
                                              │
                                              │ On Save:
                                              │
                                              ▼
                                  ┌──────────────────────┐
                                  │   flowsApi.ts        │
                                  │                      │
                                  │ createFlow() or      │
                                  │ updateFlow()         │
                                  │                      │
                                  │ POST/PUT to          │
                                  │ /functions/v1/       │
                                  │   flows-api          │
                                  └──────────────────────┘
                                              │
                                              │ Returns saved Flow
                                              │
                                              ▼
                                  ┌──────────────────────┐
                                  │ Update Button        │
                                  │                      │
                                  │ button.action = {    │
                                  │   type: 'flow',      │
                                  │   flowId: uuid       │
                                  │ }                    │
                                  └──────────────────────┘
```

## Flow Conversion Examples

### Example 1: Simple Status Change Button

```
Input (Button):
┌────────────────────────────┐
│ Label: "Qualificar Lead"   │
│ Field: "STATUS_ID"         │
│ Value: "QUALIFIED"         │
│ Webhook: "https://..."     │
└────────────────────────────┘
                │
                │ createFlowFromButton()
                ▼
Output (Flow):
┌────────────────────────────┐
│ Flow: "Flow: Qualificar"   │
│ Steps:                     │
│  [1] change_status         │
│      ├─ statusId: QUALIFIED│
│      └─ webhook: https://..│
└────────────────────────────┘
```

### Example 2: Button with Sub-buttons

```
Input (Button):
┌────────────────────────────────────┐
│ Main Button: "Selecionar Motivo"   │
│ ├─ Field: "REASON"                 │
│ ├─ Value: "pending"                │
│ │                                   │
│ Sub-buttons:                        │
│ ├─ [1] "Motivo A"                  │
│ │      ├─ subField: "REASON"       │
│ │      └─ subValue: "reason_a"     │
│ │                                   │
│ └─ [2] "Motivo B"                  │
│        ├─ subField: "REASON"       │
│        └─ subValue: "reason_b"     │
└────────────────────────────────────┘
                │
                │ createFlowFromButton()
                ▼
Output (Flow):
┌────────────────────────────────────┐
│ Flow: "Flow: Selecionar Motivo"    │
│ Steps:                              │
│  [1] tabular                        │
│      ├─ field: REASON               │
│      └─ value: pending              │
│                                     │
│  [2] tabular (Sub-ação: Motivo A)  │
│      ├─ field: REASON               │
│      └─ value: reason_a             │
│                                     │
│  [3] tabular (Sub-ação: Motivo B)  │
│      ├─ field: REASON               │
│      └─ value: reason_b             │
└────────────────────────────────────┘
```

## User Interaction Flow

### Scenario: Admin Creates New Flow

```
1. Admin opens ButtonEditDialog
   ↓
2. Clicks "Abrir no FlowBuilder"
   ↓
3. System converts button → Flow (in memory)
   ↓
4. FlowBuilder opens with converted steps
   ↓
5. Admin edits flow:
   - Changes name
   - Adds Wait step
   - Reorders steps
   ↓
6. Admin clicks "Salvar Flow"
   ↓
7. flowsApi.createFlow() called
   ↓
8. Edge Function creates flow in database
   ↓
9. Returns: { id: 'uuid', nome: '...', steps: [...] }
   ↓
10. ButtonEditDialog.handleFlowSave() receives saved flow
   ↓
11. Updates button: button.action = { type: 'flow', flowId: 'uuid' }
   ↓
12. Success! Button now references the flow
```

### Scenario: Regular User Views Flow

```
1. User opens ButtonEditDialog
   ↓
2. Only sees "Visualizar como Flow" button
   ↓
3. Clicks "Visualizar como Flow"
   ↓
4. System converts button → Flow (in memory)
   ↓
5. FlowExecuteModal opens (read-only)
   ↓
6. User sees all steps that would execute
   ↓
7. User can execute or close
   ↓
8. No changes saved (ephemeral flow)
```

## Step Type Detection Logic

```
Button Config                  →  Flow Step Type
─────────────────────────────────────────────────────────
field = "STATUS_ID"            →  change_status
field contains "status"        →  change_status

action_type = "http_call"      →  http_call

action_type = "webhook"        →  webhook

action_type = "email"          →  email

action_type = "wait"           →  wait

Default (field + value exist)  →  tabular
```

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Authentication                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │ ButtonEditDialog.useEffect()  │
            │   checkAdminStatus()          │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Query user_roles table       │
            │  WHERE user_id = current_user │
            └───────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌───────────────┐      ┌───────────────┐
        │ role = 'admin'│      │ role = 'agent'│
        └───────────────┘      └───────────────┘
                │                       │
                │                       │
        isAdmin = true          isAdmin = false
                │                       │
                │                       │
        ┌───────▼─────────────────┐   │
        │ Show both buttons:      │   │
        │ - Visualizar como Flow  │   │
        │ - Abrir no FlowBuilder  │   │
        └─────────────────────────┘   │
                                      │
                        ┌─────────────▼────────────┐
                        │ Show only one button:    │
                        │ - Visualizar como Flow   │
                        └──────────────────────────┘
```

## Data Flow: Button Update with FlowId

```
Before Save:
┌──────────────────────────────┐
│ Button Config                │
│ ├─ id: "btn-123"             │
│ ├─ label: "Qualificar"       │
│ ├─ action_type: "tabular"    │
│ ├─ field: "STATUS_ID"        │
│ └─ value: "QUALIFIED"        │
└──────────────────────────────┘

After Flow Creation:
┌──────────────────────────────┐
│ Flow Created                 │
│ ├─ id: "flow-uuid-456"       │
│ ├─ nome: "Qualificação"      │
│ └─ steps: [...]              │
└──────────────────────────────┘
                │
                │ handleFlowSave(savedFlow)
                ▼
┌──────────────────────────────┐
│ Button Config (Updated)      │
│ ├─ id: "btn-123"             │
│ ├─ label: "Qualificar"       │
│ ├─ action_type: "flow"       │◄── Changed!
│ ├─ action: {                 │◄── New!
│ │   type: 'flow',            │
│ │   flowId: 'flow-uuid-456'  │
│ │ }                           │
│ ├─ field: "STATUS_ID"        │
│ └─ value: "QUALIFIED"        │
└──────────────────────────────┘
```

## File Structure

```
tabuladormax/
├── src/
│   ├── components/
│   │   ├── ButtonEditDialog.tsx       (Modified - Integration point)
│   │   └── flow/
│   │       ├── FlowBuilder.tsx        (Modified - Enhanced callback)
│   │       ├── FlowExecuteModal.tsx   (Existing - Used for read-only)
│   │       └── FlowList.tsx           (Existing - Not modified)
│   ├── handlers/
│   │   └── flowFromButton.ts          (New - Conversion logic)
│   ├── services/
│   │   └── flowsApi.ts                (New - Edge Function client)
│   └── types/
│       └── flow.ts                    (Modified - Extended types)
├── docs/
│   ├── flowbuilder-embedded.md        (New - Feature docs)
│   ├── TESTING.md                     (New - Testing guide)
│   └── flows.md                       (Existing - Original docs)
└── supabase/
    └── functions/
        ├── flows-api/                 (Existing - CRUD operations)
        └── flows-executor/            (Existing - Execution)
```

## API Endpoints Used

```
Edge Functions:
├── POST   /functions/v1/flows-api
│   Body: { nome, descricao, steps, ativo }
│   Returns: { flow: { id, nome, steps, ... } }
│
├── PUT    /functions/v1/flows-api/:id
│   Body: { nome, descricao, steps, ativo }
│   Returns: { flow: { id, nome, steps, ... } }
│
└── POST   /functions/v1/flows-executor
    Body: { flowId, leadId, context }
    OR: { flow, leadId, context }
    Returns: { runId, status, logs, ... }
```
