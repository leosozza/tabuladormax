# Gestão Scouter Config - Architecture Overview

## System Architecture

This document outlines the architectural design of the Gestão Scouter configuration system within TabuladorMax.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TabuladorMax                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Application Layer                           │  │
│  │  - React Components                                  │  │
│  │  - Sync Handlers                                     │  │
│  │  - Configuration Management                          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Configuration Layer                         │  │
│  │  - gestao_scouter_config table                       │  │
│  │  - RLS Policies                                      │  │
│  │  - Validation Logic                                  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │  Gestão Scouter      │
           │  (External Supabase) │
           │  - leads table       │
           │  - Other tables      │
           └──────────────────────┘
```

## Components

### 1. Database Layer

#### gestao_scouter_config Table
Central configuration storage for Gestão Scouter integration.

**Responsibilities:**
- Store connection credentials (project URL, anon key)
- Manage active/inactive configurations
- Control sync enablement
- Track configuration changes

**Schema:**
```sql
CREATE TABLE public.gestao_scouter_config (
  id SERIAL PRIMARY KEY,
  project_url TEXT NOT NULL,
  anon_key TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Security Layer

#### Row Level Security (RLS)
Implements granular access control at the database level.

**Policy Structure:**
- **SELECT:** Public access (anyone can read)
- **INSERT/UPDATE/DELETE:** Authenticated users only

**Benefits:**
- Prevents unauthorized modifications
- Allows public read access for frontend configuration loading
- Leverages Supabase's built-in authentication

#### URL Validation
CHECK constraint ensures only valid URLs are stored:
```regex
^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$
```

### 3. Business Logic Layer

#### Single Active Configuration
**Implementation:** Database trigger + function

**Mechanism:**
```sql
CREATE FUNCTION enforce_single_active_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = true THEN
    UPDATE public.gestao_scouter_config 
    SET active = false 
    WHERE id != NEW.id AND active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Guarantees:**
- Only one configuration is active at any time
- Automatic deactivation of previous active config
- No application-level coordination needed

#### Automatic Timestamp Updates
**Implementation:** Trigger on UPDATE

**Purpose:**
- Track when configurations were last modified
- Audit trail for configuration changes
- Help identify stale configurations

### 4. Performance Layer

#### Indexes
Optimized for common query patterns:

**Active Configuration Index:**
```sql
CREATE INDEX idx_gestao_scouter_config_active 
  ON public.gestao_scouter_config(active)
  WHERE active = true;
```
- Partial index (only indexes active records)
- Optimizes the most common query: finding active config

**Sync Enabled Index:**
```sql
CREATE INDEX idx_gestao_scouter_config_sync_enabled 
  ON public.gestao_scouter_config(sync_enabled)
  WHERE sync_enabled = true;
```
- Optimizes queries for sync-enabled configs

**Composite Index:**
```sql
CREATE INDEX idx_gestao_scouter_config_active_sync 
  ON public.gestao_scouter_config(active, sync_enabled)
  WHERE active = true AND sync_enabled = true;
```
- Optimizes finding active configs with sync enabled
- Most efficient for sync operations

## Data Flow

### Configuration Retrieval Flow

```
┌──────────────┐
│  Frontend    │
│  Component   │
└──────┬───────┘
       │
       │ 1. Query active config
       │
       ▼
┌──────────────────────┐
│  Supabase Client     │
│  SELECT ... WHERE    │
│  active = true       │
└──────┬───────────────┘
       │
       │ 2. RLS Check (SELECT policy)
       │
       ▼
┌──────────────────────┐
│  gestao_scouter_     │
│  config table        │
└──────┬───────────────┘
       │
       │ 3. Return config data
       │
       ▼
┌──────────────────────┐
│  Application uses    │
│  config for sync     │
└──────────────────────┘
```

### Configuration Update Flow

```
┌──────────────┐
│  Admin User  │
│  (Authenticated)
└──────┬───────┘
       │
       │ 1. Update request
       │
       ▼
┌──────────────────────┐
│  Supabase Client     │
│  UPDATE ...          │
└──────┬───────────────┘
       │
       │ 2. RLS Check (UPDATE policy)
       │    ✓ User authenticated?
       │
       ▼
┌──────────────────────┐
│  Trigger: enforce_   │
│  single_active_      │
│  config()            │
└──────┬───────────────┘
       │
       │ 3. If active=true,
       │    deactivate others
       │
       ▼
┌──────────────────────┐
│  Trigger: update_    │
│  updated_at          │
└──────┬───────────────┘
       │
       │ 4. Set updated_at
       │    = now()
       │
       ▼
┌──────────────────────┐
│  Record updated      │
│  in database         │
└──────────────────────┘
```

### Sync Operation Flow

```
┌──────────────────────┐
│  Sync Service        │
│  (Background/Cron)   │
└──────┬───────────────┘
       │
       │ 1. Get active config
       │    WHERE active = true
       │    AND sync_enabled = true
       │
       ▼
┌──────────────────────┐
│  gestao_scouter_     │
│  config table        │
└──────┬───────────────┘
       │
       │ 2. Return config if found
       │
       ▼
┌──────────────────────┐
│  Create Gestão       │
│  Scouter Client      │
│  with config data    │
└──────┬───────────────┘
       │
       │ 3. Initialize client
       │    createClient(url, key)
       │
       ▼
┌──────────────────────┐
│  Perform Sync        │
│  Operations          │
└──────────────────────┘
```

## Design Decisions

### Why SERIAL instead of UUID for ID?
**Decision:** Use SERIAL (auto-increment integer)

**Rationale:**
- Simpler for debugging and logging
- Smaller index size
- Sequential IDs make ordering intuitive
- Configuration table is small (likely < 10 records)
- No distributed system concerns

### Why TEXT for anon_key instead of encrypted storage?
**Decision:** Store anon_key as plain TEXT

**Rationale:**
- Anon key is designed for public use
- Not a sensitive credential (unlike service role key)
- Simplifies retrieval and usage
- Follows Supabase best practices

**Note:** Service role keys should NEVER be stored here. Use Supabase Vault for sensitive keys.

### Why Public SELECT but Authenticated INSERT/UPDATE/DELETE?
**Decision:** Asymmetric RLS policies

**Rationale:**
- Frontend needs to read config without authentication
- Prevents unauthorized modifications
- Allows public API access for initial setup
- Maintains security while improving UX

### Why Single Active Configuration?
**Decision:** Enforce one active config via trigger

**Rationale:**
- Prevents ambiguity in application logic
- Simplifies configuration management
- No need for complex selection logic
- Clear source of truth

### Why Partial Indexes?
**Decision:** Use partial indexes for active/sync_enabled

**Rationale:**
- Smaller index size
- Faster lookups
- Only indexes relevant records
- Matches actual query patterns

## Scalability Considerations

### Current Design
- Optimized for single-tenant configuration
- Suitable for < 100 configuration records
- Indexes optimized for common queries

### Future Enhancements
If multi-tenant support is needed:

```sql
-- Add tenant_id column
ALTER TABLE gestao_scouter_config 
ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Update active constraint to be per-tenant
-- Modify trigger to enforce single active per tenant
```

## Integration Points

### With Sync System
- Sync handlers query active configuration
- Sync operations validate config before executing
- Sync logs reference configuration ID

### With Frontend
- Configuration UI reads from this table
- Admin panel allows CRUD operations
- Public pages can read config for display

### With Edge Functions
- Edge functions can use service role to read config
- Enable server-side sync operations
- Support background jobs

## Security Architecture

### Defense in Depth
1. **RLS Policies:** Primary access control
2. **CHECK Constraints:** Data validation
3. **Triggers:** Business logic enforcement
4. **Application Layer:** Additional validation

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized config changes | RLS policies require authentication |
| Invalid URLs | CHECK constraint validation |
| Multiple active configs | Trigger enforcement |
| Data tampering | RLS + audit via updated_at |
| Credential exposure | Only anon keys stored (public by design) |

## Monitoring & Observability

### Key Metrics to Track
- Number of configuration changes per day
- Active configuration switches
- Failed sync attempts
- Configuration read frequency

### Audit Trail
- `created_at`: When config was added
- `updated_at`: Last modification time
- Can extend with additional audit columns if needed

## Related Systems

### Dependencies
- Supabase PostgreSQL database
- Supabase Authentication (for RLS)
- Application sync handlers

### Consumers
- React frontend components
- Background sync services
- Edge functions
- Admin tools

## Best Practices

1. **One Active Config:** Always maintain exactly one active configuration
2. **Test Before Activating:** Set sync_enabled=false initially
3. **Monitor Changes:** Track updated_at for unexpected modifications
4. **Backup Configs:** Keep inactive configs as backup/fallback
5. **Validate URLs:** Always include protocol in URLs

## Migration Strategy

### From Existing System
If migrating from a different configuration system:

```sql
-- Step 1: Insert existing config
INSERT INTO gestao_scouter_config (project_url, anon_key, active, sync_enabled)
SELECT old_url, old_key, true, false FROM old_config_table LIMIT 1;

-- Step 2: Verify
SELECT * FROM gestao_scouter_config WHERE active = true;

-- Step 3: Test connection
-- (Application-level testing)

-- Step 4: Enable sync
UPDATE gestao_scouter_config SET sync_enabled = true WHERE active = true;
```

## References

- [Detailed Setup Guide](./TABULADORMAX_CONFIG_TABLE_SETUP.md)
- [Quick Setup](./QUICK_SETUP_GESTAO_SCOUTER_CONFIG.md)
- [Implementation Guide](./IMPLEMENTATION_GESTAO_SCOUTER_CONFIG.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

**Version:** 1.0  
**Last Updated:** 2025-10-17  
**Status:** Active
