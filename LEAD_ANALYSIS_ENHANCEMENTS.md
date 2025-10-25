# Lead Analysis Enhancements - Feature Documentation

This document describes the new features implemented for the Lead Analysis system (Tinder-style interface) in TabuladorMax.

## 🎯 Features Implemented

### 1. Tinder Card Configuration UI

A user-friendly interface that allows users to customize which fields appear on lead analysis cards.

#### What it does:
- Provides an intuitive modal dialog to configure card display
- Allows selection of photo field from any available field
- Enables customization of main fields (name and primary info)
- Supports adding/removing detail fields (additional information)
- Manages badge fields (status indicators)
- Enforces validation rules to maintain usability
- Persists configuration in localStorage

#### How to use:
1. Navigate to "Análise de Leads" page
2. Click the "Configurar Cartão" button in the top-right corner
3. Configure fields in the modal:
   - **Photo Field**: Select which field contains the lead's photo
   - **Main Fields** (1-2): Primary information displayed prominently
   - **Detail Fields** (0-6): Additional details shown in the card body
   - **Badge Fields** (0-5): Status badges displayed in the top-right corner
4. Click "Salvar e Fechar" to apply changes
5. Use "Restaurar Padrão" to reset to default configuration

#### Technical Details:
- **Component**: `TinderCardConfigModal.tsx`
- **Hook**: Uses existing `useTinderCardConfig` hook
- **Storage**: localStorage with key `tinder_card_config`
- **Integration**: Connected to `AnaliseLeads.tsx` page

---

### 2. Offline Queue System

A complete offline-first system that stores lead evaluations locally when offline and syncs them when connection is restored.

#### What it does:
- Queues lead evaluations when offline using IndexedDB
- Automatically syncs pending evaluations when connection returns
- Provides visual feedback for offline mode and sync status
- Implements retry logic with exponential backoff
- Prevents duplicate submissions
- Shows pending count in UI

#### How it works:

**When Offline:**
1. User evaluates a lead (approve/reject/skip)
2. Evaluation is stored in IndexedDB
3. Yellow banner shows "Modo Offline" with pending count
4. User can continue evaluating leads

**When Online:**
1. System detects connection restoration
2. Blue banner shows sync status
3. Automatically syncs all pending evaluations
4. Shows success/failure notifications
5. Removes successfully synced items from queue

#### User Experience:
- **Offline Mode**: Yellow banner with offline indicator and pending count
- **Sync Mode**: Blue banner with sync progress and manual sync button
- **Toast Notifications**: 
  - "📥 Avaliação salva localmente" when queued
  - "✅ Sincronização concluída" when synced
  - "⚠️ Algumas avaliações falharam" if errors occur

#### Technical Details:
- **IndexedDB**: `tabuladormax_offline` database
- **Store**: `lead_evaluations` object store
- **Hook**: `useOfflineQueue.ts`
- **Library**: `offlineQueue.ts`
- **Features**:
  - Automatic retry up to 5 attempts
  - Error logging for debugging
  - Graceful degradation
  - Connection state monitoring

#### API:
```typescript
const {
  pendingCount,      // Number of pending evaluations
  isSyncing,         // Whether sync is in progress
  addToQueue,        // Add evaluation to queue
  syncPendingEvaluations, // Manually trigger sync
  clearQueue,        // Clear all pending items
  getPendingEvaluations   // Get list of pending items
} = useOfflineQueue();
```

---

### 3. Optimized Lead Queries & Pagination

Enhanced database queries with dynamic column selection, pagination, and performance indexes.

#### What it does:
- Supports dynamic column selection to reduce data transfer
- Implements pagination for large datasets
- Adds PostgreSQL indexes for improved query performance
- Returns metadata (page, total pages, count)

#### How to use:

**Dynamic Column Selection:**
```typescript
const { data } = useLeads({
  columns: ['id', 'name', 'email', 'scouter'],
  // Only fetches specified columns
});
```

**Pagination:**
```typescript
const { data } = useLeads({
  page: 1,
  pageSize: 50,
});
// Returns: { data, count, page, pageSize, totalPages }
```

**Combined Filters:**
```typescript
const { data } = useLeads({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  projeto: 'Projeto X',
  scouter: 'John Doe',
  columns: ['id', 'name', 'telefone'],
  page: 2,
  pageSize: 25,
});
```

#### Database Indexes:
New migration file `20251025015500_add_leads_performance_indexes.sql` adds:
- Partial index on `qualidade_lead` for pending analysis
- Composite index on `criado` and `qualidade_lead`
- Indexes on `commercial_project_id`, `scouter`, `etapa`
- Composite index for geolocation queries
- Index for analyst performance tracking

**Expected Performance Improvements:**
- 50-80% faster queries for pending analysis
- Improved date range filtering
- Faster project/scouter filtering
- Better geolocation query performance

---

## 🧪 Testing

### Test Coverage:
1. **useOfflineQueue**: Comprehensive unit tests
   - Queue initialization
   - Adding evaluations
   - Syncing pending items
   - Clearing queue
   - Concurrent sync prevention

2. **TinderCardConfigModal**: Component tests
   - Rendering in open/closed state
   - Configuration display
   - Button interactions
   - User interactions

### Running Tests:
```bash
# Run all tests
npm run test

# Run specific test files
npm run test -- src/__tests__/hooks/useOfflineQueue.test.ts
npm run test -- src/__tests__/components/TinderCardConfigModal.test.tsx

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

---

## 📁 File Structure

```
src/
├── components/
│   └── gestao/
│       └── TinderCardConfigModal.tsx       # Configuration UI modal
├── hooks/
│   ├── useOfflineQueue.ts                   # Offline queue hook
│   ├── useTinderCardConfig.ts              # Existing config hook
│   └── useLeads.ts                          # Enhanced leads query
├── lib/
│   └── offlineQueue.ts                      # IndexedDB wrapper
├── pages/
│   └── gestao/
│       └── AnaliseLeads.tsx                 # Updated with new features
├── __tests__/
│   ├── hooks/
│   │   └── useOfflineQueue.test.ts         # Queue tests
│   └── components/
│       └── TinderCardConfigModal.test.tsx  # Modal tests
└── supabase/
    └── migrations/
        └── 20251025015500_add_leads_performance_indexes.sql
```

---

## 🔧 Technical Architecture

### Offline Queue Flow:
```
User Action → Check Online Status
    ↓
If Offline:
    → Store in IndexedDB
    → Show offline toast
    → Update pending count
    ↓
If Online:
    → Save to Supabase
    → Show success toast
    → Invalidate queries

Connection Restored:
    → Auto-trigger sync
    → Process queue items
    → Update Supabase
    → Remove synced items
    → Show completion toast
```

### Configuration Persistence:
```
User Changes Config → Update State
    ↓
useEffect watches state
    ↓
Save to localStorage
    ↓
LeadCard reads config
    ↓
Renders with custom fields
```

---

## 🚀 Future Enhancements

### Potential Improvements:
1. **Infinite Scroll**: Replace pagination with infinite scroll for seamless browsing
2. **Field Search**: Add search/filter in configuration modal
3. **Preset Configurations**: Allow saving multiple configuration presets
4. **Sync Conflicts**: Handle conflicts when same lead is evaluated offline and online
5. **Background Sync**: Use Service Worker Background Sync API
6. **Analytics**: Track which fields are most commonly used
7. **Export Queue**: Allow exporting pending evaluations for debugging

---

## 📊 Performance Metrics

### Expected Improvements:
- **Query Performance**: 50-80% faster for common queries
- **Data Transfer**: 30-60% reduction with column selection
- **Offline Resilience**: 100% of evaluations preserved when offline
- **User Experience**: Seamless offline/online transitions

### Monitoring:
- Check IndexedDB size: DevTools → Application → IndexedDB
- Monitor sync failures: Check console for `[OfflineQueue]` logs
- Database query performance: Monitor slow query logs in PostgreSQL

---

## 🐛 Troubleshooting

### Common Issues:

**1. Evaluations not syncing:**
- Check browser console for errors
- Verify network connectivity
- Check Supabase connection
- Manually trigger sync with blue banner button

**2. Configuration not saving:**
- Check localStorage permissions
- Verify no browser extensions blocking storage
- Try clearing localStorage and reconfiguring

**3. Database indexes not applied:**
- Run migration: `supabase db push`
- Verify indexes: `SELECT * FROM pg_indexes WHERE tablename = 'leads';`

**4. IndexedDB full:**
- Clear old data: `offlineQueueDB.clearQueue()`
- Check browser storage quota

---

## 📝 Migration Guide

### For Developers:

**To use the new pagination:**
```typescript
// Old
const { data: leads } = useLeads({ projeto: 'X' });

// New
const { data } = useLeads({ projeto: 'X', page: 1, pageSize: 50 });
const leads = data.data;
const totalPages = data.totalPages;
```

**To use dynamic columns:**
```typescript
const { data } = useLeads({
  columns: ['id', 'name', 'email'], // Only fetch needed columns
});
```

### For Users:
No migration needed - all features work out of the box with sensible defaults.

---

## 🙏 Credits

Developed as part of the TabuladorMax platform enhancement initiative.

**Technologies Used:**
- React + TypeScript
- TanStack Query (React Query)
- IndexedDB API
- Radix UI Components
- Supabase
- Vitest + Testing Library
