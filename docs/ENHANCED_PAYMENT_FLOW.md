# Enhanced Payment Flow Documentation

## Overview

This document describes the enhanced payment flow implementation for the TabuladorMax application. The enhancement adds batch payment processing capabilities, payment calculation features (ajuda de custo and faltas), and a modal-based confirmation UI to the Pagamentos page.

## Features Implemented

### 1. SQL Migrations

Two SQL migration files have been created under the `sql/` directory:

#### `sql/add_project_payment_settings_and_payments_table.sql`
- Adds payment configuration fields to the `projects` table:
  - `valor_ficha_base`: Base value for fichas
  - `ajuda_custo_valor`: Daily cost assistance amount
  - `ajuda_custo_enabled`: Enable/disable cost assistance
  - `desconto_falta_valor`: Deduction amount per absence
  - `desconto_falta_enabled`: Enable/disable absence deductions
- Creates the `payments_records` table to track individual payment transactions
- Includes comprehensive indexing for performance
- Implements Row Level Security (RLS) with appropriate policies

#### `sql/rpc/pay_fichas_transaction.sql`
- Creates an RPC function `pay_fichas_transaction` for atomic batch payment processing
- Uses `SECURITY DEFINER` to bypass RLS when needed
- Handles transaction rollback on errors
- Returns detailed results including success/error counts

### 2. Payment Services and Utilities

#### `src/utils/formatters.ts`
- `parseCurrencyBR()`: Parses Brazilian Real currency strings to numbers
- `formatCurrency()`: Formats numbers as BRL currency strings
- `formatNumber()`: Formats numbers with Brazilian separators

#### `src/services/paymentsCoordinator.ts`
- `calculateDaysWorked()`: Calculates days worked between two dates
- `calculateAjudaCustoForScouter()`: Calculates cost assistance based on days worked
- `calculateFaltasForScouter()`: Calculates absence deductions (placeholder for future implementation)
- `executeBatchPayment()`: Executes batch payment with RPC fallback

### 3. UI Components

#### `src/components/gestao/PaymentConfirmModal.tsx`
- Modal dialog for confirming batch payments
- Groups payments by scouter
- Shows detailed breakdown:
  - Number of leads and fichas
  - Ficha values
  - Cost assistance (ajuda de custo)
  - Absence deductions (faltas)
  - Gross and net amounts
- Grand totals across all scouters

#### `src/pages/gestao/Pagamentos.tsx` (Enhanced)
- Added checkbox-based selection for pending payments
- "Select All" functionality for pending payments
- "Pagar Selecionados" button to trigger batch payment
- Integration with PaymentConfirmModal
- Automatic data refresh after successful payment using react-query invalidation
- Toast notifications for success/error feedback

## Migration Steps

### Step 1: Run SQL Migrations

1. Log into your Supabase Dashboard
2. Navigate to SQL Editor
3. Execute the migrations in this order:

   **First:** Run `sql/add_project_payment_settings_and_payments_table.sql`
   ```sql
   -- Copy and paste the contents of the file into the SQL editor
   ```

   **Second:** Run `sql/rpc/pay_fichas_transaction.sql`
   ```sql
   -- Copy and paste the contents of the file into the SQL editor
   ```

4. After both migrations, reload the PostgREST schema cache:
   - Go to Settings > API > PostgREST Settings
   - Click "Reload schema cache"
   - Or execute: `NOTIFY pgrst, 'reload schema'`

### Step 2: Configure Project Payment Settings (Optional)

If your project uses cost assistance or absence deductions, update the project settings:

```sql
UPDATE public.projects
SET 
  valor_ficha_base = 50.00,
  ajuda_custo_valor = 10.00,
  ajuda_custo_enabled = true,
  desconto_falta_valor = 5.00,
  desconto_falta_enabled = false
WHERE id = '<your-project-id>';
```

### Step 3: Verify RLS Policies

The migrations create default RLS policies. Review and adjust them based on your security requirements:

- **payments_records table**: Allows authenticated users to view, service role to insert/update
- **leads table**: Should already have appropriate policies from previous migrations

### Step 4: Test the Application

1. Navigate to the Pagamentos page in the Gestão section
2. Verify that pending payments show checkboxes
3. Select one or more pending payments
4. Click "Pagar Selecionados"
5. Review the payment summary in the modal
6. Confirm the payment
7. Verify that:
   - Toast notification appears
   - Payments are marked as confirmed
   - Page data refreshes automatically

## RLS Considerations

### SECURITY DEFINER Function

The `pay_fichas_transaction` RPC function uses `SECURITY DEFINER`, which means:

- The function executes with the privileges of the user who created it (typically a superuser or service_role)
- This bypasses RLS policies, allowing batch operations even with strict RLS
- **Important:** Only create this function using a privileged account (postgres user or service_role)

### Alternative Approaches

If you prefer not to use `SECURITY DEFINER`:

1. **Backend Service**: Call the batch operations from a backend service using the service_role key
2. **Adjust RLS Policies**: Modify RLS policies on `leads` and `payments_records` to allow batch operations from authenticated users
3. **Client-side Fallback**: The implementation already includes a fallback that uses individual insert/update operations

## QA Checklist

### Pre-deployment Testing

- [ ] SQL migrations execute without errors
- [ ] Schema cache is reloaded successfully
- [ ] `payments_records` table created with all columns and indexes
- [ ] RPC function `pay_fichas_transaction` is accessible
- [ ] Project payment settings fields exist in `projects` table (if applicable)

### Functional Testing

#### Selection Features
- [ ] Checkboxes appear only for pending payments
- [ ] Individual payment selection works correctly
- [ ] "Select All" checkbox selects all pending payments
- [ ] "Select All" checkbox deselects when clicked again
- [ ] Selected count badge shows correct number
- [ ] "Pagar Selecionados" button is disabled when no payments selected

#### Payment Modal
- [ ] Modal opens when "Pagar Selecionados" is clicked
- [ ] Payments are grouped by scouter correctly
- [ ] Each scouter group shows:
  - [ ] Lead count
  - [ ] Ficha count and value
  - [ ] Cost assistance (if enabled)
  - [ ] Absence deductions (if enabled)
  - [ ] Net amount
- [ ] Grand totals are calculated correctly
- [ ] Warning message is displayed
- [ ] "Cancelar" button closes modal without action
- [ ] "Confirmar Pagamento" button is disabled during processing

#### Payment Processing
- [ ] Payment processing shows loading state
- [ ] Success toast appears on successful payment
- [ ] Error toast appears on failed payment
- [ ] Page data refreshes automatically after success
- [ ] Selected items are cleared after success
- [ ] Modal closes after successful payment
- [ ] Leads are marked as `ficha_confirmada = true`
- [ ] `data_confirmacao_ficha` is set correctly
- [ ] Payment records are inserted into `payments_records` table

#### Payment Calculations
- [ ] Days worked calculated correctly (data_criacao_ficha to now)
- [ ] Cost assistance calculated when enabled: `dias_trabalhados * ajuda_custo_por_dia`
- [ ] Absence deductions calculated when enabled (currently returns 0)
- [ ] Gross amount = fichas + cost assistance
- [ ] Net amount = gross amount - deductions
- [ ] Values formatted as BRL currency (R$ X.XXX,XX)

### Data Integrity
- [ ] Payment records have correct `batch_id`
- [ ] All payments in a batch share the same `batch_id`
- [ ] Foreign key constraints are respected
- [ ] No orphaned payment records
- [ ] Transaction rollback works on error (all or nothing)

### Error Handling
- [ ] RPC errors fall back to individual operations
- [ ] Individual operation errors are logged
- [ ] Partial failures are reported correctly
- [ ] Network errors show appropriate messages
- [ ] Missing project settings don't break payment flow (uses defaults)

### Performance
- [ ] Large batch payments (50+ items) complete in reasonable time
- [ ] Page remains responsive during payment processing
- [ ] Query invalidation doesn't cause excessive refetching
- [ ] Indexes on `payments_records` improve query performance

### UI/UX
- [ ] Modal is responsive on mobile devices
- [ ] Currency values are formatted correctly
- [ ] Loading states are clear and visible
- [ ] Success/error messages are clear and actionable
- [ ] Modal can be dismissed with Escape key
- [ ] Focus management is correct

### Security
- [ ] Only authenticated users can access payment features
- [ ] RLS policies prevent unauthorized access to payment records
- [ ] SECURITY DEFINER function validates inputs properly
- [ ] No SQL injection vulnerabilities in RPC function
- [ ] User permissions are checked appropriately

### Edge Cases
- [ ] Empty selection handled gracefully
- [ ] Single payment works correctly
- [ ] Payments with missing scouter name handled (shows "Não informado")
- [ ] Payments with null `commercial_project_id` handled
- [ ] Payments with missing `data_criacao_ficha` handled (days worked = 0)
- [ ] Duplicate batch ID handling (if any)

## Known Limitations and Future Enhancements

### Current Limitations

1. **Absence Detection**: The `calculateFaltasForScouter` function is a placeholder and always returns 0 faltas. Full implementation requires:
   - Attendance tracking system
   - Expected work days calculation
   - Business rules for absence detection

2. **Single Project Settings**: Currently assumes a single project or default settings. Multi-project scenarios may need project-specific settings lookup.

3. **Payment Reversal**: No built-in mechanism to reverse/cancel completed payments. This would need to be added as a separate feature.

### Future Enhancements

1. **Payment History View**: Add a detailed view of payment records from `payments_records` table
2. **Payment Reports**: Generate reports by period, scouter, or project
3. **Bulk Actions**: Add ability to filter and pay by date range, project, or scouter
4. **Payment Export**: Export payment records to Excel/PDF
5. **Attendance Integration**: Integrate with an attendance tracking system for automatic falta calculation
6. **Payment Approval Workflow**: Add multi-step approval process for large payments
7. **Payment Notifications**: Email/SMS notifications to scouters when payments are confirmed

## Troubleshooting

### RPC Function Not Found

**Problem:** Error calling `pay_fichas_transaction` function

**Solution:**
1. Verify the function was created: `SELECT * FROM pg_proc WHERE proname = 'pay_fichas_transaction'`
2. Reload PostgREST schema cache
3. Check function permissions: `GRANT EXECUTE ON FUNCTION public.pay_fichas_transaction TO authenticated`

### RLS Policy Errors

**Problem:** Permission denied errors when updating leads or inserting payment records

**Solution:**
1. Review RLS policies on `leads` and `payments_records` tables
2. Ensure the RPC function uses `SECURITY DEFINER`
3. Verify the function was created by a privileged user

### Payment Calculation Errors

**Problem:** Incorrect amounts in payment calculations

**Solution:**
1. Check project payment settings in the database
2. Verify `data_criacao_ficha` and `data_confirmacao_ficha` are set correctly
3. Review calculation logic in `paymentsCoordinator.ts`

### Transaction Rollback Issues

**Problem:** Partial payments processed despite errors

**Solution:**
1. Verify RPC function is being used (check console logs for "Using fallback method")
2. Check that RPC function has proper error handling
3. Ensure all operations within RPC are in the same transaction

## Support and Maintenance

For issues or questions:
1. Check the implementation files for inline documentation
2. Review console logs for error details
3. Verify SQL migrations were executed correctly
4. Check Supabase logs for RPC function errors

## Summary

This enhanced payment flow provides a robust, user-friendly solution for batch payment processing in TabuladorMax. The implementation follows best practices for database transactions, security (RLS), and user experience, while maintaining compatibility with the existing codebase.
