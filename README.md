# TabuladorMax

A comprehensive lead management and automation platform with Bitrix24 integration.

**Project URL**: https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a

## Quick Start

### Prerequisites
- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm (comes with Node.js)

### Development Setup

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd tabuladormax

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run preview      # Preview production build
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Testing**: Vitest + Testing Library
- **Integrations**: Bitrix24, Chatwoot, gestao-scouter

## Documentation

📚 **[Complete Documentation](./docs/README.md)** - Start here for comprehensive guides

### Key Features
- [Flow Builder v2](./docs/features/flows.md) - Visual automation system
- [Sync Architecture](./docs/features/sync-architecture.md) - Multi-system synchronization
- [Dashboard Filters](./docs/features/dashboard-filters.md) - Advanced filtering

### Guides
- [Gestão Scouter Integration](./docs/guides/gestao-scouter-sync-guide.md)
- [CSV Import Control](./docs/guides/csv-import-sync.md)
- [Batch Export Guide](./docs/guides/gestao-scouter-batch-export.md)

## Project Structure

```
tabuladormax/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Application pages/routes
│   ├── lib/            # Core libraries (flows-v2, etc.)
│   ├── handlers/       # Business logic handlers
│   └── types/          # TypeScript type definitions
├── supabase/
│   ├── functions/      # Edge Functions (Deno)
│   └── migrations/     # Database migrations
├── docs/               # Documentation
│   ├── features/       # Feature documentation
│   ├── guides/         # How-to guides
│   └── archived/       # Historical docs
└── public/             # Static assets
```

## Deployment

Deploy via [Lovable](https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a):
1. Go to **Share** → **Publish**
2. Follow deployment instructions

### Custom Domain
Navigate to **Project** > **Settings** > **Domains** and click **Connect Domain**.
[Learn more](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Deployment

Deploy via [Lovable](https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a):
1. Go to **Share** → **Publish**
2. Follow deployment instructions

### Custom Domain
Navigate to **Project** > **Settings** > **Domains** and click **Connect Domain**.
[Learn more](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Database & Migrations

### Running Migrations

**Option 1: Supabase Dashboard**
1. Log in to [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **SQL Editor**
3. Run migration files from `supabase/migrations/`

**Option 2: Supabase CLI**
```bash
supabase link --project-ref your-project-ref
supabase db push
```

### Key Migrations
- Agent telemarketing mapping RLS policies
- Flow Builder v2 tables (flows, flow_configs, flows_runs)
- Sync system tables (sync_events, gestao_scouter_config)

See [docs/README.md](./docs/README.md) for detailed migration guides.

