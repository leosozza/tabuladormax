# TabuladorMax - Complete Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Development](#development)
- [Security](#security)
- [Database](#database)
- [Documentation Structure](#documentation-structure)

## Overview

TabuladorMax is a lead management and automation system built with:
- **Frontend**: React + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Integrations**: Bitrix24, Chatwoot, gestao-scouter

### Key Capabilities
- Lead tabulation and management
- Flow-based automation system (Flow Builder v2)
- Real-time sync with external systems (Bitrix24, gestao-scouter)
- User and permission management
- Dashboard analytics with filtering
- CSV import/export functionality

## Architecture

### Frontend Structure
```
src/
├── components/          # Reusable UI components
│   ├── flow/           # Flow Builder components
│   ├── sync/           # Sync-related components
│   └── ui/             # Base UI components (shadcn/ui)
├── pages/              # Application pages/routes
├── lib/                # Core libraries
│   └── flows-v2/       # Flow Builder v2 system
├── handlers/           # Business logic handlers
├── hooks/              # React hooks
├── integrations/       # External service integrations
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Backend Structure
```
supabase/
├── functions/          # Edge Functions (Deno)
│   ├── flows-api/     # Flow CRUD operations
│   ├── flows-executor/ # Flow execution engine
│   ├── sync-*/        # Sync operations
│   └── chatwoot-*/    # Chatwoot integrations
└── migrations/         # Database migrations
```

### Key Routes
- `/` - Home page
- `/auth` - Authentication
- `/lead` - Lead tabulation interface
- `/dashboard` - Analytics dashboard
- `/users` - User management (supervisors+)
- `/config` - Configuration (managers+)
- `/logs` - System logs (managers+)
- `/agent-mapping` - Agent-telemarketing mapping (managers+)
- `/sync-monitor` - Sync monitoring (admins only)
- `/permissions` - Permission management (admins only)

## Features

### Flow Builder v2
A visual, node-based automation system for creating workflows.

**Key Features:**
- Visual flow editor with drag-and-drop
- Versioning system (draft → published → archived)
- Server-side execution via Edge Functions
- JSON schema validation
- Step types: Tabular, HTTP Call, Delay, Condition, etc.

**Documentation:**
- [Flow Builder Overview](./features/flows.md)
- [Architecture](./features/flows-v2-architecture.md)
- [Migration Guide](./features/flows-v2-migration.md)
- [Quick Reference](./features/flows-v2-quick-reference.md)

### Synchronization System

Multi-directional sync between TabuladorMax, Bitrix24, and gestao-scouter.

**Features:**
- Real-time bidirectional sync
- Conflict resolution
- Event logging and monitoring
- Batch operations

**Documentation:**
- [Sync Architecture](./features/sync-architecture.md)
- [Gestão Scouter Integration](./guides/gestao-scouter-sync-guide.md)
- [CSV Import Control](./guides/csv-import-sync.md)

### Dashboard & Filters

Analytics dashboard with powerful filtering capabilities.

**Features:**
- Date range filtering (today, week, month, custom)
- Operator filtering (admins only)
- Real-time statistics
- Lead list modal

**Documentation:**
- [Dashboard Filters](./features/dashboard-filters.md)

### Agent-Telemarketing Mapping

Maps TabuladorMax users to Bitrix24 telemarketing operators.

**Features:**
- Automatic mapping during user creation
- OAuth integration
- RLS policies for security
- Smart operator search and creation

**Related Files:**
- `supabase/functions/search-bitrix-telemarketing/`
- `supabase/functions/create-bitrix-telemarketing/`
- `src/pages/AgentMapping.tsx`

## Development

### Prerequisites
- Node.js 18+ (use nvm: `nvm use`)
- npm or bun
- Supabase CLI (for local development)

### Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
# ... other variables
```

### Testing

The project uses Vitest for testing:
- Unit tests: `src/__tests__/`
- Integration tests: `src/lib/flows-v2/__tests__/`
- Component tests: `src/__tests__/pages/`, `src/__tests__/components/`

```bash
npm test           # Run all tests
npm run test:ui    # Run tests with UI
npm run test:coverage  # Generate coverage report
```

### Code Quality

```bash
npm run lint       # Run ESLint
npm run build      # Type checking via TypeScript
```

## Security

### Row Level Security (RLS)

All tables use Supabase RLS policies to control access.

**Example: agent_telemarketing_mapping**
- SELECT: Users see own mapping; admins/managers see all
- INSERT: Authenticated users can create own mapping
- UPDATE/DELETE: Admins and managers only

### Permissions System

Role hierarchy:
1. **User** - Basic access to lead tabulation
2. **Supervisor** - Can manage users
3. **Manager** - Can access config and logs
4. **Admin** - Full system access

### Authentication

- Email/password authentication
- Google OAuth integration
- Automatic agent-telemarketing mapping on signup
- Session management via Supabase Auth

## Database

### Key Tables

**Core Tables:**
- `leads` - Lead records
- `profiles` - User profiles
- `agent_telemarketing_mapping` - User-to-operator mapping

**Flow System:**
- `flows` - Flow metadata
- `flow_configs` - Flow versions and configurations
- `flows_runs` - Flow execution logs

**Sync System:**
- `sync_events` - Sync event log
- `gestao_scouter_config` - Sync configuration
- `sync_queue` - Pending sync operations

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or run SQL directly in Supabase Dashboard
# Navigate to SQL Editor and execute migration files
```

## Documentation Structure

```
docs/
├── README.md (this file)           # Main documentation hub
├── features/                       # Feature-specific documentation
│   ├── flows.md                   # Flow Builder overview
│   ├── flows-v2-*.md              # Flow Builder v2 details
│   ├── flowbuilder-integration.md # Button-flow integration
│   ├── sync-architecture.md       # Sync system architecture
│   └── dashboard-filters.md       # Dashboard filtering
└── guides/                         # How-to guides
    ├── gestao-scouter-sync-guide.md
    ├── csv-import-sync.md
    └── gestao-scouter-batch-export.md
```

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Build: `npm run build`
6. Submit PR

## Support

For issues or questions:
1. Check existing documentation in `/docs`
2. Review CHANGELOG.md for recent changes
3. Check test files for usage examples
4. Contact the development team

---

**Last Updated:** October 17, 2025
**Version:** 2.0
