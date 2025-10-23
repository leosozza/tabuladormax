# 🚀 Quick Start: TabuladorMax Sync Setup

**5-Minute Setup Guide** | For detailed instructions, see [TABULADORMAX_MIGRATION_GUIDE.md](./TABULADORMAX_MIGRATION_GUIDE.md)

---

## ⚡ Fast Track

### Step 1: Update SERVICE_ROLE_KEY (2 min)

1. Go to TabuladorMax project: https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a
2. **Settings → Backend → Secrets** → Copy **SERVICE_ROLE_KEY**
3. Go to Gestão Scouter → **Settings → Backend → Secrets**
4. Update `TABULADOR_SERVICE_KEY` with copied key
5. Update local `.env` file:
   ```env
   TABULADOR_SERVICE_KEY=<paste_key_here>
   ```

---

### Step 2: Run SQL Script (1 min)

1. Access TabuladorMax SQL Editor
2. Execute: `scripts/sql/tabuladormax_incremental_sync_setup.sql`
3. Verify output shows: `✅ Setup concluído com sucesso!`

**What it does:**
- Adds `updated_at` column to leads table
- Creates index for performance
- Creates trigger for auto-updates
- Populates existing records

---

### Step 3: Validate Setup (30 sec)

```bash
npm run validate:migration
```

**Expected:** `✅ All validations passed! Migration setup is ready.`

---

### Step 4: Test Sync (1 min)

**Option A - Use curl:**
```bash
curl -X POST "https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/sync-tabulador?direction=pull" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Option B - Use npm script:**
```bash
npm run migrate:leads
```

**Expected:** Records synced successfully

---

## ✅ Quick Checklist

- [ ] SERVICE_ROLE_KEY updated in secrets
- [ ] SQL script executed in TabuladorMax
- [ ] Validation passed (`npm run validate:migration`)
- [ ] Sync test successful
- [ ] 🎉 Done!

---

## 📚 Documentation

| Need | Document |
|------|----------|
| Complete guide (all 5 tasks) | [TABULADORMAX_MIGRATION_GUIDE.md](./TABULADORMAX_MIGRATION_GUIDE.md) |
| Typo explanation | [MIGRATION_CLARIFICATION.md](./MIGRATION_CLARIFICATION.md) |
| Implementation summary | [IMPLEMENTATION_COMPLETE_TABULADORMAX_SYNC.md](./IMPLEMENTATION_COMPLETE_TABULADORMAX_SYNC.md) |
| Security review | [SECURITY_SUMMARY_TABULADORMAX.md](./SECURITY_SUMMARY_TABULADORMAX.md) |
| Scripts documentation | [scripts/README.md](./scripts/README.md) |

---

## 🆘 Troubleshooting

### "Invalid API key" or "403 Forbidden"
→ Use **SERVICE_ROLE_KEY**, not anon key

### "Column updated_at does not exist"
→ Execute SQL script in TabuladorMax

### Sync returns 0 records
→ Verify `updated_at` is populated in all leads

### More help
→ See [TABULADORMAX_MIGRATION_GUIDE.md](./TABULADORMAX_MIGRATION_GUIDE.md) → Troubleshooting section

---

## 🎯 What This Setup Does

✅ Enables incremental sync (only changed records)  
✅ Tracks last update time for each lead  
✅ Improves sync performance with indexing  
✅ Maintains data consistency between projects  
✅ Preserves audit trail with timestamps  

---

## 🔑 Important Note

**Column name is `updated_at` (not `atualizado_at`)**

The problem statement had a typo. All code uses `updated_at` (English).  
See [MIGRATION_CLARIFICATION.md](./MIGRATION_CLARIFICATION.md) for details.

---

**Questions?** Check [TABULADORMAX_MIGRATION_GUIDE.md](./TABULADORMAX_MIGRATION_GUIDE.md) for complete instructions.
