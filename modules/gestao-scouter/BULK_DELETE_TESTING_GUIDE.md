# Manual Testing Guide - Bulk Delete Feature

## Prerequisites

1. Ensure you have access to the Supabase database
2. Make sure there are test leads in the `fichas` table
3. Open the application in development mode: `npm run dev`
4. Navigate to the Leads page

## Test Scenarios

### ✅ Test 1: Basic Bulk Delete (Happy Path)

**Steps:**
1. Navigate to the Leads page
2. Verify the page loads with leads data
3. Check that checkboxes appear next to each lead
4. Select 2-3 leads by clicking their checkboxes
5. Verify "Excluir Selecionados (N)" button appears (where N = number selected)
6. Click the "Excluir Selecionados" button
7. Verify confirmation dialog appears with:
   - Title: "Confirmar Exclusão"
   - Message showing count of leads to be deleted
   - Warning: "Esta ação não pode ser desfeita."
   - Two buttons: "Cancelar" and "Excluir"
8. Click "Excluir" button
9. Verify button text changes to "Excluindo..."
10. Wait for operation to complete

**Expected Results:**
- ✅ Success toast appears: "N lead(s) excluído(s) com sucesso"
- ✅ Dialog closes automatically
- ✅ Leads list refreshes
- ✅ Deleted leads are no longer visible
- ✅ Checkboxes are cleared (no selection)
- ✅ Delete button disappears

### ✅ Test 2: Cancel Deletion

**Steps:**
1. Select 1-2 leads
2. Click "Excluir Selecionados" button
3. Verify confirmation dialog appears
4. Click "Cancelar" button

**Expected Results:**
- ✅ Dialog closes
- ✅ No deletion occurs
- ✅ Selected leads remain selected
- ✅ Delete button still visible
- ✅ Lead count unchanged

### ✅ Test 3: No Selection Error

**Steps:**
1. Make sure no leads are selected (all checkboxes unchecked)
2. Try to find the delete button

**Expected Results:**
- ✅ Delete button is not visible
- ✅ Page functions normally

### ✅ Test 4: Single Lead Deletion

**Steps:**
1. Select exactly 1 lead
2. Click "Excluir Selecionados (1)"
3. Confirm deletion

**Expected Results:**
- ✅ Dialog shows "1 lead(s) selecionado(s)"
- ✅ Single lead is deleted successfully
- ✅ Success toast: "1 lead(s) excluído(s) com sucesso"

### ✅ Test 5: Large Batch Deletion

**Steps:**
1. Select 10+ leads (use "select all" checkbox if available on current page)
2. Click "Excluir Selecionados" button
3. Verify count in dialog matches selection
4. Confirm deletion

**Expected Results:**
- ✅ All selected leads are deleted
- ✅ Success toast shows correct count
- ✅ Operation completes without errors
- ✅ Page refreshes correctly

### ✅ Test 6: Delete with Filters Applied

**Steps:**
1. Apply a filter (e.g., filter by specific scouter)
2. Verify filtered leads appear
3. Select some leads from filtered results
4. Delete selected leads
5. Verify filter remains applied after deletion

**Expected Results:**
- ✅ Only selected leads are deleted
- ✅ Filter stays active
- ✅ List updates to show remaining filtered leads

### ✅ Test 7: Delete During Pagination

**Steps:**
1. If there are multiple pages, navigate to page 2
2. Select leads from page 2
3. Delete them
4. Check pagination state

**Expected Results:**
- ✅ Leads from page 2 are deleted
- ✅ Pagination updates correctly
- ✅ If page becomes empty, shows previous page

### ✅ Test 8: UI States and Loading

**Steps:**
1. Select leads
2. Click delete
3. Observe button and dialog states during deletion

**Expected Results:**
- ✅ Delete button shows correct count
- ✅ Delete button has red (destructive) styling
- ✅ During deletion:
  - Button text: "Excluindo..."
  - Buttons are disabled
  - No multiple clicks possible
- ✅ After completion: returns to normal state

### ✅ Test 9: Integration with Other Features

**Steps:**
1. Verify "Iniciar Análise" button still works
2. Verify "Exportar" button still works
3. Verify view/edit actions in dropdown menu still work
4. Test filters and search functionality
5. Delete some leads
6. Retry steps 1-4

**Expected Results:**
- ✅ All existing features continue to work
- ✅ No interference between bulk delete and other features
- ✅ Selection state works for both Análise and Delete

### ✅ Test 10: Error Scenarios

**Scenario A: Network Error**
- Disconnect from internet or block Supabase
- Try to delete leads
- Expected: Error toast with message

**Scenario B: Database Permission Error**
- If RLS policies prevent deletion
- Expected: Error toast with descriptive message

**Scenario C: Invalid Lead IDs**
- This is handled automatically by the code
- Leads without valid IDs are filtered out

## Accessibility Checks

1. **Keyboard Navigation**
   - ✅ Can tab to checkboxes
   - ✅ Can tab to delete button
   - ✅ Can use Enter to select checkbox
   - ✅ Dialog can be navigated with keyboard

2. **Screen Reader**
   - ✅ Button announces "Excluir Selecionados" with count
   - ✅ Dialog title and description are readable
   - ✅ Toast messages are announced

3. **Visual Feedback**
   - ✅ Hover states work on buttons
   - ✅ Selected checkboxes are clearly visible
   - ✅ Red delete button stands out
   - ✅ Loading state is clear

## Performance Checks

1. **Small Batch (1-5 leads)**
   - ✅ Deletion completes in < 2 seconds
   - ✅ UI remains responsive

2. **Medium Batch (10-20 leads)**
   - ✅ Deletion completes in < 5 seconds
   - ✅ Loading state visible during operation

3. **Large Batch (50+ leads)**
   - ✅ Deletion completes without timeout
   - ✅ No UI freezing
   - ✅ Success confirmation accurate

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (Chrome Mobile, Safari Mobile)

## Regression Testing

After implementing bulk delete:
- [ ] Can still create new leads
- [ ] Can still view lead details
- [ ] Can still edit leads
- [ ] Filters work correctly
- [ ] Search works correctly
- [ ] Pagination works correctly
- [ ] Tinder Analysis feature works
- [ ] Export feature works
- [ ] Summary cards update correctly

## Security Verification

1. **SQL Injection Protection**
   - ✅ Using Supabase parameterized queries (`.in()` method)
   - ✅ No raw SQL construction from user input

2. **Authorization**
   - ✅ Check Supabase RLS policies are enforced
   - ✅ Users can only delete their own leads (if applicable)

3. **Input Validation**
   - ✅ Empty selections handled
   - ✅ Invalid IDs filtered out
   - ✅ No undefined/null IDs sent to database

## Reporting Issues

If you find any issues during testing, please report:

1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Browser and version**
5. **Console errors** (if any)
6. **Screenshots** (if applicable)

## Sign-off Checklist

Before approving the feature:
- [ ] All happy path tests pass
- [ ] Error scenarios handled gracefully
- [ ] No new console errors
- [ ] Performance is acceptable
- [ ] Accessibility requirements met
- [ ] No regression in existing features
- [ ] Documentation is clear and complete
- [ ] Code follows project conventions

---

**Testing Date**: _______________
**Tester Name**: _______________
**Environment**: _______________
**Result**: PASS / FAIL
**Notes**: _____________________
