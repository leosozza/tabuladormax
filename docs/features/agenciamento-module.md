# Agenciamento Module - Complete Documentation

## Overview

The Agenciamento (Agency/Negotiation) module is a comprehensive commercial negotiation management system integrated with Bitrix24 and Supabase. It provides producers and administrators with powerful tools to manage commercial deals, define payment conditions, apply discounts, and track negotiation lifecycles.

## Features

### Core Functionality

✅ **Complete Negotiation Management**
- Create, edit, view, and delete negotiations
- Multi-column responsive form layout
- Real-time value calculations
- Automatic financial summaries

✅ **Commercial Conditions**
- Base value with percentage-based discounts
- Additional fees and taxes
- Automatic calculation of final values
- Support for complex pricing structures

✅ **Payment Methods**
- Multiple payment method selection
- Percentage-based distribution (must total 100%)
- Visual validation feedback
- Support for: Cash, Credit Card, Debit Card, Bank Transfer, PIX, Check, Financing, Installments

✅ **Installment Management**
- Configurable number of installments
- Multiple payment frequencies (Monthly, Weekly, Biweekly, Quarterly, Yearly)
- First payment date selection
- Automatic per-installment calculation

✅ **Bitrix24 Integration**
- Direct API integration (no OAuth required)
- Commercial project linking
- Search and select existing projects
- Create new projects on-the-fly

✅ **Status Workflow**
- Draft → In Progress → Pending Approval → Approved → Completed
- Rejection and cancellation flows
- Status-based permissions and actions

✅ **History & Audit Trail**
- Complete change history
- Action tracking with timestamps
- User attribution for all changes

✅ **Permissions & Security**
- Row-level security (RLS) policies
- Producer/Admin restricted access
- User can only see their own negotiations unless admin/manager

## Database Schema

### Main Tables

#### `negotiations`
Complete negotiation data with automatic calculations via triggers.

**Key Fields:**
- `id` - UUID primary key
- `title`, `description` - Basic info
- `client_name`, `client_email`, `client_phone`, `client_document` - Client data
- `bitrix_deal_id`, `bitrix_project_id` - Bitrix24 integration
- `base_value`, `discount_percentage`, `discount_value` - Pricing
- `final_value`, `total_value` - Calculated values
- `payment_methods` - JSONB array of selected methods
- `installments_number`, `installment_value` - Payment plan
- `status` - Enum (draft, in_progress, pending_approval, approved, rejected, completed, cancelled)
- Timestamps and user tracking

#### `negotiation_history`
Audit trail for all changes.

#### `negotiation_attachments`
File attachments (contracts, proposals, etc.)

### Database Triggers

1. **Auto-update `updated_at`** - Automatic timestamp on updates
2. **Auto-calculate values** - Recalculates discount, taxes, and totals
3. **Log history** - Automatically tracks status changes and value updates

### Views

- `negotiation_summary` - Joined view with user data for reporting

## API / Service Layer

Location: `src/services/agenciamentoService.ts`

### Main Functions

#### CRUD Operations
```typescript
createNegotiation(data: NegotiationFormData): Promise<Negotiation>
updateNegotiation(id: string, data: Partial<NegotiationFormData>): Promise<Negotiation>
getNegotiation(id: string): Promise<Negotiation | null>
listNegotiations(filters?: NegotiationFilters): Promise<Negotiation[]>
deleteNegotiation(id: string): Promise<void>
```

#### Workflow Actions
```typescript
approveNegotiation(id: string, notes?: string): Promise<Negotiation>
rejectNegotiation(id: string, notes?: string): Promise<Negotiation>
completeNegotiation(id: string): Promise<Negotiation>
cancelNegotiation(id: string, reason?: string): Promise<Negotiation>
```

#### Calculations
```typescript
calculateNegotiationValues(data): NegotiationCalculation
validatePaymentMethods(methods): { valid: boolean; message?: string }
```

#### History
```typescript
getNegotiationHistory(negotiationId: string): Promise<NegotiationHistory[]>
```

## UI Components

Location: `src/components/agenciamento/`

### 1. NegotiationForm
Full-featured form with two-column layout.

**Features:**
- React Hook Form with Zod validation
- Real-time calculation as user types
- Bitrix24 project selector integration
- Payment method percentage manager
- Installment calculator
- Visual summary panel

**Usage:**
```tsx
<NegotiationForm
  initialData={existingNegotiation}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isLoading={isSubmitting}
/>
```

### 2. PaymentMethodsSelector
Interactive payment method selection with validation.

**Features:**
- Add/remove payment methods
- Percentage input with live validation
- Visual feedback (total must be 100%)
- Amount calculation per method

### 3. NegotiationSummaryPanel
Visual financial summary with color-coded sections.

**Features:**
- Base value, discounts, fees, taxes display
- Total value highlight
- Payment method breakdown
- Installment information

### 4. NegotiationDetailsDialog
Full-screen dialog with complete negotiation details.

**Features:**
- Client information
- Financial summary
- Payment conditions
- Dates and timeline
- Terms and conditions
- Change history

### 5. NegotiationList
Tabular view with sorting.

**Features:**
- Sortable columns
- Quick actions menu
- Status badges
- Responsive design

### 6. NegotiationStats
Dashboard statistics cards.

**Metrics:**
- Total negotiations
- Total value
- Average value
- In progress count
- Pending approval
- Completed

## Main Page

Location: `src/pages/Agenciamento.tsx`

**Features:**
- Statistics dashboard
- Search and filter
- Grid/List view toggle
- Status filter dropdown
- Create/Edit dialogs
- Quick actions (Approve, Reject, Complete, Cancel)
- React Query for data management

**Route:** `/agenciamento`

## Type Definitions

Location: `src/types/agenciamento.ts`

**Main Types:**
- `Negotiation` - Complete negotiation entity
- `NegotiationFormData` - Form input data
- `NegotiationCalculation` - Calculation results
- `NegotiationStatus` - Status enum
- `PaymentMethod` - Payment method enum
- `SelectedPaymentMethod` - Payment method with percentage

**Helper Objects:**
- `PAYMENT_METHOD_LABELS` - User-friendly labels
- `NEGOTIATION_STATUS_CONFIG` - Status config with colors
- `PAYMENT_FREQUENCY_LABELS` - Frequency labels

## Installation & Setup

### 1. Database Migration

Run the migration file in your Supabase project:

```sql
-- File: supabase/migrations/20251027_create_agenciamento_schema.sql
```

Via Supabase Dashboard:
1. Go to SQL Editor
2. Copy and paste the migration SQL
3. Run the query

Via Supabase CLI:
```bash
supabase db push
```

### 2. Permissions

Ensure users have the appropriate roles:
- `producer` - Can create and manage their own negotiations
- `manager` / `admin` - Can view and manage all negotiations

### 3. Bitrix24 Setup

The module uses the existing Bitrix24 integration (`src/lib/bitrix.ts`). Ensure the endpoint is configured:
```
https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/
```

No additional OAuth setup is required - it uses direct API calls.

## Usage Guide

### Creating a Negotiation

1. Navigate to `/agenciamento`
2. Click "Nova Negociação"
3. Fill in the form:
   - **Basic Info:** Title, description, Bitrix24 project
   - **Client Data:** Name, email, phone, document
   - **Commercial Values:** Base value, discount %, fees, taxes
   - **Payment Methods:** Select methods and percentages (must total 100%)
   - **Installments:** Number, frequency, first payment date
   - **Dates:** Negotiation date, validity, expected closing
   - **Terms:** Conditions, special terms, internal notes
4. Review the automatic summary panel
5. Click "Salvar Negociação"

### Managing Negotiations

**View Details:**
- Click on any card/row to open full details dialog
- View complete information, history, and timeline

**Edit:**
- Click edit icon in actions menu
- Modify any field
- Values recalculate automatically

**Approve/Reject:**
- Available for "Pending Approval" status
- Click action in menu
- Optionally add notes

**Complete:**
- Available for "Approved" status
- Marks negotiation as finished
- Sets actual closing date

**Cancel:**
- Available for active negotiations
- Adds cancellation note

### Filtering & Search

- **Search:** Type in search box to filter by title or client name
- **Status Filter:** Select specific status or "All"
- **View Mode:** Toggle between grid cards and table list

## Validation Rules

### Form Validation

- Title: Minimum 3 characters
- Client Name: Minimum 3 characters, required
- Client Email: Valid email format (optional)
- Base Value: Must be ≥ 0
- Discount: 0-100%
- Installments: ≥ 1
- Tax Percentage: 0-100%

### Payment Methods Validation

- At least one payment method required
- Total percentage must equal 100%
- Each percentage must be > 0

### Business Rules

- Cannot edit completed or cancelled negotiations
- Only admins can delete negotiations
- Approval requires manager/admin role
- Status transitions follow workflow rules

## Calculation Logic

### Financial Calculations

```
discount_value = base_value × (discount_percentage ÷ 100)
final_value = base_value - discount_value
tax_value = final_value × (tax_percentage ÷ 100)
total_value = final_value + additional_fees + tax_value
installment_value = total_value ÷ installments_number
```

### Payment Method Amounts

For each payment method:
```
amount = total_value × (percentage ÷ 100)
```

## Security & Permissions

### RLS Policies

**SELECT:** Users can view negotiations they created or were assigned to, plus all if admin/manager
**INSERT:** Only producers, managers, and admins can create
**UPDATE:** Owners and admins can update (except completed/cancelled)
**DELETE:** Admin only

### User Roles

The module respects the existing `user_roles` table:
- `producer` - Standard negotiation creator
- `manager` - Can view and approve all
- `admin` - Full access including deletion

## Troubleshooting

### Common Issues

**"Payment methods must total 100%"**
- Ensure all selected payment methods add up to exactly 100%
- Use the visual feedback to see remaining percentage

**"User not authenticated"**
- Ensure user is logged in
- Check Supabase session is active

**Cannot see negotiations**
- Verify user has correct role in `user_roles` table
- Check RLS policies are enabled

**Bitrix24 project not found**
- Verify Bitrix24 API endpoint is accessible
- Check project exists in Bitrix24
- Consider creating new project if it doesn't exist

## Future Enhancements

Potential additions:
- [ ] PDF export for proposals
- [ ] Email notifications for status changes
- [ ] Advanced reporting and analytics
- [ ] Negotiation templates
- [ ] Document signing integration
- [ ] Recurring negotiation support
- [ ] Multi-currency support
- [ ] Commission calculations

## API Reference

### Types

All types are fully documented in `src/types/agenciamento.ts` with JSDoc comments.

### Service Methods

All service methods in `src/services/agenciamentoService.ts` include error handling and return typed Promises.

## Testing

To test the module:

1. **Manual Testing:**
   ```bash
   npm run dev
   # Navigate to /agenciamento
   ```

2. **Build Test:**
   ```bash
   npm run build
   ```

3. **Type Checking:**
   ```bash
   npx tsc --noEmit
   ```

## Contributing

When extending the module:
1. Follow existing TypeScript patterns
2. Add proper type definitions
3. Update this documentation
4. Test calculations thoroughly
5. Ensure RLS policies are maintained

## Support

For issues or questions:
- Check the troubleshooting section
- Review existing code comments
- Consult the main project documentation
- Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-27  
**Module Status:** ✅ Production Ready
