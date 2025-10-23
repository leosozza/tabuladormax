# Gestão Scouter Module - Integration Documentation

## Overview

This module contains the complete **gestao-scouter** application, imported into the tabuladormax monorepo while preserving full commit history.

## Integration Details

- **Source Repository**: https://github.com/leosozza/gestao-scouter
- **Integration Date**: October 23, 2025
- **Integration Method**: Git subtree (preserves full commit history)
- **Target Location**: `modules/gestao-scouter/`
- **Package Name**: `@tabuladormax/gestao-scouter`

## Commit History Preservation

The integration was performed using `git subtree add`, which preserves the complete commit history from the gestao-scouter repository. You can view the full history:

```bash
cd modules/gestao-scouter
git log --oneline .
```

## Development

### Install Dependencies

From the repository root:

```bash
npm install
```

This will install dependencies for all workspaces, including gestao-scouter.

### Run Development Server

To run the gestao-scouter module in development mode:

```bash
cd modules/gestao-scouter
npm run dev
```

### Build

To build the module:

```bash
cd modules/gestao-scouter
npm run build
```

### Lint

To lint the code:

```bash
cd modules/gestao-scouter
npm run lint
```

## Module-Specific Scripts

The gestao-scouter module includes several custom scripts:

- `npm run migrate:leads` - Sync leads to fichas
- `npm run verify:fichas` - Verify fichas centralization
- `npm run diagnostics:sync` - Run diagnostics sync (dry-run)
- `npm run diagnostics:sync:write` - Run diagnostics sync (write mode)
- `npm run deploy:sync` - Deploy sync functions
- `npm run verify:leads` - Verify leads centralization
- `npm run verify:leads-setup` - Verify leads setup
- `npm run validate:migration` - Validate migration setup
- `npm run analyze-logs` - Analyze logs

## Configuration

The module uses its own configuration files:

- `.env` - Environment variables (copy from `.env.example`)
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration

### Environment Variables

Copy the example environment file:

```bash
cd modules/gestao-scouter
cp .env.example .env
```

Then edit `.env` with your Supabase credentials.

## Dependencies

The gestao-scouter module has additional dependencies beyond the root project:

### Key Dependencies
- **Mapping**: Leaflet, Leaflet Geoman, Leaflet MarkerCluster, Turf.js
- **Charts**: ApexCharts, Recharts
- **Data Processing**: PapaParse, XLSX
- **PDF Generation**: jsPDF, jsPDF-AutoTable, html2pdf.js
- **UI Components**: React Grid Layout, React Tinder Card
- **Date Handling**: date-fns, date-fns-tz

All dependencies are managed through the monorepo's workspace configuration.

## Integration with Tabuladormax

### Routing

The module can be integrated into the main tabuladormax application through routing:

```typescript
// In main app router
import GestaoScouterApp from '@gestao-scouter/App';

// Add route
<Route path="/gestao-scouter/*" element={<GestaoScouterApp />} />
```

### Import Paths

TypeScript paths are configured for easy imports:

```typescript
// Import from gestao-scouter module
import { Component } from '@gestao-scouter/components/Component';
```

## Monorepo Workspace Configuration

This module is part of the npm workspaces configuration in the root `package.json`:

```json
{
  "workspaces": ["modules/*"]
}
```

This allows:
- Shared dependencies between modules
- Single `npm install` for the entire monorepo
- Unified version management
- Hoisted dependencies for efficiency

## Architecture

The gestao-scouter module is a complete Vite + React + TypeScript application with:

- **Supabase Backend**: Authentication, database, and edge functions
- **React Components**: Built with shadcn/ui and Radix UI
- **State Management**: React Query for server state
- **Routing**: React Router for navigation
- **Styling**: Tailwind CSS
- **Maps**: Leaflet with custom layers and markers
- **Data Visualization**: Charts and dashboards

## Testing

To run tests for the module:

```bash
cd modules/gestao-scouter
npm test
```

## Troubleshooting

### Build Issues

If you encounter build issues:

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Check for TypeScript errors:
   ```bash
   npm run build
   ```

3. Verify all environment variables are set in `.env`

### Dependency Conflicts

If there are dependency version conflicts:

1. Check the root `package-lock.json` for version resolutions
2. Update conflicting dependencies in the module's `package.json`
3. Run `npm install` from the root

### Import Path Issues

If imports fail:

1. Verify TypeScript paths in root `tsconfig.json`
2. Ensure the path alias `@gestao-scouter/*` is configured
3. Rebuild the project

## Contributing

When making changes to this module:

1. Create a feature branch
2. Make changes within `modules/gestao-scouter/`
3. Test thoroughly with `npm run build` and `npm run lint`
4. Commit with clear messages
5. Create a pull request

## Syncing Updates from Upstream

If the original gestao-scouter repository receives updates, you can sync them:

```bash
git fetch gestao-scouter
git subtree pull --prefix=modules/gestao-scouter gestao-scouter main
```

This will merge new commits while preserving history.

## Documentation

For detailed documentation about the gestao-scouter application itself, see the various markdown files in this directory:

- `README.md` - Original project README
- `ARCHITECTURE_DIAGRAM.md` - System architecture
- `AUTHENTICATION_SETUP.md` - Authentication configuration
- Various feature-specific documentation files

## License

See the main tabuladormax repository license.

## Support

For issues related to:
- **Module integration**: Contact the tabuladormax team
- **gestao-scouter features**: See the original repository at https://github.com/leosozza/gestao-scouter
