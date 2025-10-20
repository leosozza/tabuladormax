# Test Plan: Batch Export Enhancements for Gestão Scouter

## Overview
This document outlines the test plan for validating the batch export enhancements implemented in this PR.

## Prerequisites
- TabuladorMax instance running
- Gestão Scouter project configured with active integration
- Test data: At least 200 leads with various fields populated
- User with appropriate permissions

## Test Cases

### 1. Field Selection

#### TC-1.1: Select All Fields (Default)
**Steps:**
1. Navigate to `/sync-monitor` → "Importações" → "Gestão Scouter"
2. Verify "Selecionar Todos os Campos" checkbox is checked by default
3. Verify all individual field checkboxes are disabled and checked
4. Set date range and click "Iniciar Exportação"
5. Wait for job to process at least 10 leads

**Expected Result:**
- Job created with `fields_selected: null`
- All available fields exported to gestao-scouter
- No errors related to missing fields

#### TC-1.2: Select Specific Fields
**Steps:**
1. Navigate to batch export tab
2. Uncheck "Selecionar Todos os Campos"
3. Select only: name, celular, etapa
4. Set date range and click "Iniciar Exportação"
5. Check gestao-scouter database for exported leads

**Expected Result:**
- Job created with `fields_selected: ["name", "celular", "etapa"]`
- Only selected fields (+ id, updated_at, sync_source, last_sync_at) exported
- Other fields remain null or unchanged in gestao-scouter

#### TC-1.3: Field Selection Persistence
**Steps:**
1. Create job with specific fields selected
2. Query database: `SELECT fields_selected FROM gestao_scouter_export_jobs WHERE id = '[job_id]'`

**Expected Result:**
- `fields_selected` column contains JSON array of selected field names
- Field selection is persisted in database

### 2. Reset Functionality

#### TC-2.1: Reset Paused Job
**Steps:**
1. Start an export job
2. Let it process at least 50 leads
3. Pause the job
4. Note down current counters (total_leads, exported_leads, error_leads)
5. Click "Resetar" button
6. Verify job status changes to 'pending' then 'running'
7. Check counters reset to 0
8. Verify processing starts from original start_date

**Expected Result:**
- Job status: paused → pending → running
- All counters reset to 0
- processing_date reset to start_date
- Job reprocesses all leads from the beginning
- Previous export errors deleted

#### TC-2.2: Reset Job with Errors
**Steps:**
1. Create job that will generate errors (e.g., invalid data)
2. Let it accumulate at least 5 errors
3. Pause job
4. Query: `SELECT COUNT(*) FROM gestao_scouter_export_errors WHERE job_id = '[job_id]'`
5. Click "Resetar"
6. Query again: `SELECT COUNT(*) FROM gestao_scouter_export_errors WHERE job_id = '[job_id]'`

**Expected Result:**
- Error count before reset: > 0
- Error count after reset: 0
- Job starts fresh without previous error history

### 3. Delete Functionality

#### TC-3.1: Delete Paused Job
**Steps:**
1. Start an export job
2. Pause the job
3. Click "Excluir" button
4. Confirm in UI that job card disappears
5. Query: `SELECT * FROM gestao_scouter_export_jobs WHERE id = '[job_id]'`
6. Query: `SELECT * FROM gestao_scouter_export_errors WHERE job_id = '[job_id]'`

**Expected Result:**
- Job removed from database
- All associated errors removed (CASCADE)
- Can create new job immediately

#### TC-3.2: Attempt to Delete Running Job
**Steps:**
1. Start an export job (status: running)
2. Verify "Excluir" button is not visible

**Expected Result:**
- Delete button only shown for paused jobs
- Running jobs cannot be deleted

### 4. Detailed Error Logging

#### TC-4.1: Error Card Display
**Steps:**
1. Create conditions that will cause errors (e.g., gestao-scouter offline)
2. Start export job
3. Wait for errors to accumulate
4. Verify error card appears with red styling
5. Check error count matches `job.error_leads`

**Expected Result:**
- Red error card appears when errors exist
- Error count displayed accurately
- Errors listed in descending order (most recent first)

#### TC-4.2: Error Detail Modal
**Steps:**
1. Click on any error in the error list
2. Verify modal opens with complete error details
3. Check all sections are populated:
   - Error message
   - Lead ID
   - Date/Time
   - Fields Sent (JSON)
   - Lead Snapshot (JSON)
   - Error Details (if available)
   - Response Status (if available)
   - Response Body (if available)

**Expected Result:**
- Modal displays all error information
- JSON is properly formatted
- Snapshot includes all lead data at time of error
- Fields sent matches job's fields_selected

#### TC-4.3: Error Database Storage
**Steps:**
1. Generate an export error
2. Query: `SELECT * FROM gestao_scouter_export_errors WHERE job_id = '[job_id]' LIMIT 1`
3. Verify all columns are populated correctly

**Expected Result:**
```sql
{
  id: UUID,
  job_id: UUID (matches job),
  lead_id: UUID (matches lead),
  lead_snapshot: {...}, // Complete lead object
  fields_sent: {...},   // Fields that were attempted
  error_message: "...",
  error_details: {...},
  response_status: 400,
  response_body: {...},
  created_at: TIMESTAMP
}
```

### 5. Integration with PR #73 (leads table)

#### TC-5.1: Export to leads Table
**Steps:**
1. Start export job with all fields
2. Let it export at least 10 leads
3. Query gestao-scouter: `SELECT * FROM leads LIMIT 10`
4. Verify leads exist and have correct data

**Expected Result:**
- Data exported to `gestao-scouter.public.leads` table
- Data structure matches lead structure

#### TC-5.2: Sync Source Prevention
**Steps:**
1. Export leads to gestao-scouter
2. Verify `sync_source = 'tabuladormax'` in exported leads
3. Check that sync trigger doesn't create loop

**Expected Result:**
- All exported leads have `sync_source: 'tabuladormax'`
- No infinite sync loops
- Changes from TabuladorMax don't trigger sync back

### 6. UI/UX Validation

#### TC-6.1: Button States
**Steps:**
1. Start export (verify buttons during different states):
   - Before starting: "Iniciar Exportação" enabled
   - During running: "Pausar" visible, dates/fields disabled
   - During paused: "Retomar", "Resetar", "Excluir" visible

**Expected Result:**
- Correct buttons shown for each state
- Form fields properly disabled/enabled
- No UI glitches or layout issues

#### TC-6.2: Real-time Updates
**Steps:**
1. Start export job
2. Watch progress bar update
3. Verify counters update automatically
4. Check error list updates in real-time (if errors occur)

**Expected Result:**
- Progress bar animates smoothly
- Counters update every ~3 seconds (refetch interval)
- Error list updates when new errors occur
- No need to manually refresh page

#### TC-6.3: Field Selection UI
**Steps:**
1. Test checkbox interactions:
   - Toggle "Select All"
   - Select/deselect individual fields
   - Verify counter updates

**Expected Result:**
- Smooth checkbox interactions
- Field counter updates correctly
- Individual fields disabled when "Select All" is checked
- ScrollArea works properly with many fields

### 7. Edge Cases

#### TC-7.1: Empty Date Range
**Steps:**
1. Select date range with no leads
2. Start export

**Expected Result:**
- Job completes quickly with 0 leads processed
- Status changes to 'completed'
- No errors

#### TC-7.2: Large Export
**Steps:**
1. Select date range with 1000+ leads
2. Start export
3. Monitor progress
4. Verify batch processing (100 leads at a time)

**Expected Result:**
- Export completes successfully
- Processed in batches of 100
- 500ms delay between batches
- All leads exported correctly

#### TC-7.3: Network Interruption
**Steps:**
1. Start export
2. Disconnect network temporarily
3. Reconnect after a few seconds

**Expected Result:**
- Errors logged for failed leads
- Job continues after reconnection
- Failed leads can be identified in error log

#### TC-7.4: Multiple Concurrent Exports
**Steps:**
1. Try to start second export while first is running

**Expected Result:**
- "Iniciar Exportação" button disabled
- Message indicating job already active
- Cannot start multiple jobs simultaneously

## Performance Tests

### PT-1: Export Speed
**Metrics:**
- Time to export 100 leads: ~1-2 seconds
- Time to export 1000 leads: ~10-20 seconds
- CPU usage stays reasonable
- Memory usage stable

### PT-2: Error Logging Performance
**Metrics:**
- Error logging doesn't significantly slow export
- Can handle 100+ errors without degradation
- Error queries remain fast

## Regression Tests

### RT-1: Existing Sync Still Works
**Steps:**
1. Update a lead in TabuladorMax
2. Verify automatic sync to gestao-scouter still works
3. Check sync_events table

**Expected Result:**
- Automatic sync unchanged
- Real-time sync still functional
- No conflicts with batch export

### RT-2: Previous Jobs Viewable
**Steps:**
1. Check "Histórico de Exportações" card
2. Verify old jobs still display correctly

**Expected Result:**
- Historical jobs visible
- Status/counters correct
- No broken data from migration

## Security Tests

### ST-1: RLS Policies
**Steps:**
1. Log in as non-admin user
2. Verify can only see own jobs
3. Try to query another user's job

**Expected Result:**
- Users can only view/manage own jobs
- Admins can see all jobs
- RLS properly enforced

### ST-2: Input Validation
**Steps:**
1. Try invalid date ranges
2. Try SQL injection in field selection
3. Try XSS in error messages

**Expected Result:**
- Invalid inputs rejected
- No SQL injection possible
- XSS properly escaped in UI

## Documentation Verification

### DV-1: Documentation Accuracy
**Steps:**
1. Follow docs/guides/gestao-scouter-batch-export.md
2. Verify all examples work
3. Check SQL queries execute correctly

**Expected Result:**
- All documentation accurate
- Examples work as written
- No broken references

## Sign-off Criteria

- [ ] All test cases pass
- [ ] No security vulnerabilities (CodeQL clean)
- [ ] Build passes without errors
- [ ] Lint passes without errors
- [ ] Documentation is complete and accurate
- [ ] Code review comments addressed
- [ ] Performance is acceptable
- [ ] No regressions in existing functionality

## Test Environment

**Setup:**
- Fresh TabuladorMax deployment
- Gestão Scouter test instance
- Test database with diverse lead data
- Network conditions: Normal, Slow, Offline

**Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- Some tests require manual execution due to network/environment conditions
- Automated tests can be added in future PRs
- Focus on critical path validation for this PR
