# Manual Testing Guide: ButtonEditDialog FlowBuilder Integration

## Overview
This guide helps verify that the "Abrir no FlowBuilder" button correctly opens the FlowBuilder with the current button automation configuration.

## Prerequisites
1. Application running locally or in development environment
2. User authenticated via Chatwoot
3. Access to Config page
4. At least one button configured in the system

## Test Scenarios

### Test 1: Basic Flow Opening
**Goal**: Verify FlowBuilder opens with basic button configuration

**Steps**:
1. Navigate to Config page (`/config`)
2. Double-click any existing button to open ButtonEditDialog
3. Verify the dialog shows button information correctly
4. Look for the "Abrir no FlowBuilder" button in the footer (with Workflow icon)
5. Click "Abrir no FlowBuilder"

**Expected Results**:
- FlowBuilder modal opens
- Flow name is "Flow: [Button Label]"
- Flow has at least one step (Bitrix Connector)
- Step configuration matches button field/value
- Visual editor shows the step node

### Test 2: Flow with Recent Changes
**Goal**: Verify FlowBuilder reflects unsaved form changes

**Steps**:
1. Open ButtonEditDialog for a button
2. Change the button label (e.g., "Test Button" → "Updated Test Button")
3. Change the field value (e.g., "QUALIFIED" → "PROCESSED")
4. **Without saving**, click "Abrir no FlowBuilder"

**Expected Results**:
- FlowBuilder opens with flow name "Flow: Updated Test Button"
- Bitrix step shows the new value "PROCESSED"
- Changes are reflected in the flow even without saving

### Test 3: Flow with Additional Fields
**Goal**: Verify additional fields are included in the flow

**Steps**:
1. Open ButtonEditDialog for a button
2. Add an additional field (e.g., field: "PRIORITY", value: "HIGH")
3. Click "Abrir no FlowBuilder"
4. In FlowBuilder, select the Bitrix step
5. Check the step configuration panel

**Expected Results**:
- Additional fields section shows the added field
- Field "PRIORITY" with value "HIGH" is present in step config

### Test 4: Flow with Transfer Conversation
**Goal**: Verify Chatwoot step is created when transfer is enabled

**Steps**:
1. Open ButtonEditDialog for a button
2. Check the "Transferir conversa após executar" checkbox
3. Click "Abrir no FlowBuilder"

**Expected Results**:
- Flow has 2 steps:
  1. Bitrix Connector (main action)
  2. Chatwoot Connector (transfer conversation)
- Chatwoot step shows transfer configuration

### Test 5: Flow with Supabase Sync
**Goal**: Verify Supabase step is created when sync target is Supabase

**Steps**:
1. Open ButtonEditDialog for a button
2. Change "Destino da Sincronização" to "Supabase"
3. Click "Abrir no FlowBuilder"

**Expected Results**:
- Flow has at least 2 steps:
  1. Bitrix Connector (main action)
  2. Supabase Connector (sync action)
- Supabase step shows update configuration for leads table

### Test 6: Flow with Sub-buttons
**Goal**: Verify sub-buttons are converted to separate flow steps

**Steps**:
1. Open ButtonEditDialog for a button with sub-buttons (or add them)
2. Verify sub-buttons section shows at least 2 sub-buttons
3. Click "Abrir no FlowBuilder"

**Expected Results**:
- Flow has multiple steps:
  1. Main Bitrix step
  2. Sub-button 1 Bitrix step
  3. Sub-button 2 Bitrix step
- Each sub-button step shows its label and configuration

### Test 7: Complete Flow with All Features
**Goal**: Verify complex button with all features creates correct flow

**Steps**:
1. Create or edit a button with:
   - Main action (field + value)
   - 2 additional fields
   - Transfer conversation enabled
   - Sync target = Supabase
   - 2 sub-buttons
2. Click "Abrir no FlowBuilder"

**Expected Results**:
- Flow has 5+ steps:
  1. Main Bitrix Connector
  2. Chatwoot Connector (transfer)
  3. Supabase Connector (sync)
  4. Sub-button 1 Bitrix Connector
  5. Sub-button 2 Bitrix Connector
- All steps show correct configuration
- Visual editor displays all nodes

### Test 8: Flow Editing and Saving
**Goal**: Verify flow can be edited in FlowBuilder

**Steps**:
1. Open FlowBuilder via ButtonEditDialog
2. Add a new step (e.g., "Wait" step)
3. Reorder steps by dragging
4. Click "Salvar Flow"

**Expected Results**:
- Flow saves successfully
- Success toast message appears
- FlowBuilder closes
- New flow appears in Flows list (if navigating to flows page)

### Test 9: Multiple Opens
**Goal**: Verify opening FlowBuilder multiple times with different buttons

**Steps**:
1. Open ButtonEditDialog for Button A
2. Click "Abrir no FlowBuilder"
3. Close FlowBuilder
4. Close ButtonEditDialog
5. Open ButtonEditDialog for Button B
6. Click "Abrir no FlowBuilder"

**Expected Results**:
- Second FlowBuilder shows Button B configuration
- No data from Button A persists
- Each opening creates a fresh flow from current button

### Test 10: Cancel Without Saving
**Goal**: Verify closing modals doesn't affect original button

**Steps**:
1. Open ButtonEditDialog for a button
2. Make changes (e.g., change label)
3. Click "Abrir no FlowBuilder"
4. Close FlowBuilder without saving
5. Close ButtonEditDialog without saving
6. Reopen the same button

**Expected Results**:
- Button shows original configuration
- Changes made were not persisted
- Button state is unchanged

## Verification Checklist

### Visual Checks
- [ ] "Abrir no FlowBuilder" button has Workflow icon
- [ ] Button is positioned in dialog footer
- [ ] FlowBuilder modal opens with correct size
- [ ] Flow steps are visible in visual editor
- [ ] Step nodes show correct labels

### Functional Checks
- [ ] Flow name matches button label
- [ ] Bitrix step has correct field/value
- [ ] Additional fields are included
- [ ] Chatwoot step appears when transfer enabled
- [ ] Supabase step appears when sync target is Supabase
- [ ] Sub-buttons create separate steps
- [ ] Recent form changes are reflected
- [ ] Flow can be edited and saved
- [ ] Multiple buttons can be opened independently

### Error Scenarios
- [ ] Opening with null button shows nothing
- [ ] Opening with corrupted button shows error
- [ ] Network errors during save are handled gracefully

## Common Issues and Solutions

### Issue: FlowBuilder doesn't open
**Solution**: 
- Check browser console for errors
- Verify button prop is not null
- Ensure createFlowFromButton is imported correctly

### Issue: Flow doesn't show recent changes
**Solution**:
- Verify onUpdate callbacks are being called
- Check that button prop is derived from current state
- Ensure no stale closures in handler

### Issue: Steps missing in flow
**Solution**:
- Check createFlowFromButton logic
- Verify button has the expected properties
- Check for conditional step creation (transfer, sync_target)

## Success Criteria
All test scenarios pass without errors, and the flow opened always reflects the current button automation configuration with all steps (Bitrix, Supabase, Chatwoot, sub-buttons) properly displayed.
