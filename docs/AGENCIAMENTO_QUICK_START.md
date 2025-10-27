# Agenciamento Module - Quick Start Guide

## 🚀 Quick Access

**Route:** `/agenciamento`  
**Required Role:** Producer, Manager, or Admin  
**Database Migration:** `supabase/migrations/20251027_create_agenciamento_schema.sql`

## ⚡ 5-Minute Setup

### 1. Run Database Migration

**Option A - Supabase Dashboard:**
```sql
-- Copy and paste the entire content from:
-- supabase/migrations/20251027_create_agenciamento_schema.sql
-- into Supabase SQL Editor and run it
```

**Option B - Supabase CLI:**
```bash
supabase db push
```

### 2. Verify User Roles

Ensure users have appropriate roles in the `user_roles` table:
```sql
-- Check your role
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- If needed, add producer role
INSERT INTO user_roles (user_id, role_name)
VALUES (auth.uid(), 'producer');
```

### 3. Navigate to the Module

Open your app and go to: `http://localhost:3000/agenciamento` (or your deployment URL)

## 📝 Create Your First Negotiation

1. Click **"Nova Negociação"** button
2. Fill in required fields (marked with *):
   - Title (e.g., "Proposta Comercial - Cliente ABC")
   - Client Name
   - Base Value
3. Add at least one payment method with percentage (must total 100%)
4. Click **"Salvar Negociação"**

## 🎯 Key Features at a Glance

### Automatic Calculations
- Type a base value → See real-time discount calculations
- Add fees/taxes → Total updates automatically
- Change installments → Per-installment value recalculates

### Payment Methods
- Select multiple methods
- Distribute percentages (must equal 100%)
- See amount breakdown instantly

### Bitrix24 Integration
- Search for existing commercial projects
- Create new projects directly from the form
- No OAuth configuration needed

### Status Workflow
```
Draft → In Progress → Pending Approval → Approved → Completed
         ↓                                   ↓
      Cancelled                          Rejected
```

## 🔍 Common Tasks

### View All Negotiations
- Navigate to `/agenciamento`
- Use search box to filter by title or client name
- Use status dropdown to filter by status
- Toggle between Grid 📇 and List 📋 views

### Edit a Negotiation
1. Click on a negotiation card or table row
2. Click the edit icon (pencil) in the actions menu
3. Make your changes
4. Click "Salvar Negociação"

### Approve a Negotiation
1. Find a negotiation with status "Aguardando Aprovação"
2. Click the actions menu (three dots)
3. Select "Aprovar"
4. Optionally add approval notes

### Complete a Negotiation
1. Find an approved negotiation
2. Click the actions menu
3. Select "Concluir"
4. Sets status to "Concluído" and records closing date

## 💡 Pro Tips

### ✅ Payment Method Validation
The sum of all payment method percentages **must equal 100%**. The interface shows:
- ✓ Green checkmark when valid
- ⚠️ Yellow alert when incomplete
- Shows remaining percentage needed

### 📊 Statistics Dashboard
The top of the page shows real-time metrics:
- Total negotiations
- Total value (sum of all negotiations)
- Average negotiation value
- Count by status

### 🔄 Real-time Calculations
Values update as you type:
- Discount amount = Base × (Discount % ÷ 100)
- Final value = Base - Discount
- Tax amount = Final × (Tax % ÷ 100)
- Total = Final + Fees + Tax
- Installment = Total ÷ Number of Installments

### 🎨 View Modes
- **Grid View** - Card-based, visual, good for browsing
- **List View** - Table format, sortable columns, detailed

## 🔒 Security & Permissions

### Who Can Do What

| Action | Producer | Manager | Admin |
|--------|----------|---------|-------|
| View own negotiations | ✅ | ✅ | ✅ |
| View all negotiations | ❌ | ✅ | ✅ |
| Create negotiations | ✅ | ✅ | ✅ |
| Edit own negotiations | ✅ | ✅ | ✅ |
| Edit any negotiation | ❌ | ✅ | ✅ |
| Approve/Reject | ❌ | ✅ | ✅ |
| Delete negotiations | ❌ | ❌ | ✅ |

### Data Access
- **Producers** see only negotiations they created
- **Managers** see all negotiations in the system
- **Admins** have full access including deletion

## 🐛 Troubleshooting

### "Payment methods must total 100%"
**Solution:** Check all payment method percentages add up to exactly 100.00%. Adjust percentages as needed.

### Cannot see negotiations
**Solution:** 
1. Verify you're logged in
2. Check you have the correct role: `SELECT * FROM user_roles WHERE user_id = auth.uid();`
3. If you're a producer, you'll only see your own negotiations

### Bitrix24 project search not working
**Solution:**
1. Verify Bitrix24 API endpoint is accessible
2. Try creating a new project instead of searching
3. Check network tab for error details

### Form won't save
**Solution:**
1. Check all required fields (*) are filled
2. Ensure payment methods total 100%
3. Verify base value is a valid number
4. Check browser console for specific errors

## 📚 Further Reading

For complete documentation, see:
- **Full Documentation:** `docs/features/agenciamento-module.md`
- **Database Schema:** `supabase/migrations/20251027_create_agenciamento_schema.sql`
- **Type Definitions:** `src/types/agenciamento.ts`
- **Service API:** `src/services/agenciamentoService.ts`

## 🆘 Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review the full documentation
3. Check browser console for errors
4. Verify database migration ran successfully
5. Contact your system administrator

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-27
