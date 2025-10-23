# Gestão Scouter Module

This module contains the gestao-scouter application integrated as part of the tabuladormax monorepo.

## Status

⚠️ **Integration In Progress** - See [GESTAO_SCOUTER_INTEGRATION_BLOCKED.md](../../GESTAO_SCOUTER_INTEGRATION_BLOCKED.md) for current status.

## Overview

The gestao-scouter module provides lead management and scouting functionality integrated with the tabuladormax platform.

## Integration Details

- **Source Repository**: https://github.com/leosozza/gestao-scouter
- **Integration Method**: Git subtree (preserves commit history)
- **Target Location**: `modules/gestao-scouter/`
- **Integration Branch**: `integrate/gestao-scouter`

## Directory Structure

```
modules/gestao-scouter/
├── src/                    # Source code
├── public/                 # Public assets
├── package.json            # Module dependencies
├── tsconfig.json           # TypeScript configuration
├── README.md              # This file
└── ... (other files from gestao-scouter)
```

## Development

Once integrated, you can work with this module:

### Install Dependencies
```bash
# From root
npm install

# Or from this module
cd modules/gestao-scouter
npm install
```

### Run Development Server
```bash
# From root
npm run dev

# Or from this module
cd modules/gestao-scouter
npm run dev
```

### Build
```bash
# From root
npm run build

# Or from this module
cd modules/gestao-scouter
npm run build
```

### Test
```bash
# From root
npm run test

# Or from this module
cd modules/gestao-scouter
npm run test
```

## Configuration

The module integrates with tabuladormax through:

1. **Supabase Configuration**: Uses `gestao_scouter_config` table
2. **API Integration**: Connects to gestao-scouter Supabase instance
3. **Sync Functions**: 
   - `sync-from-gestao-scouter`
   - `export-to-gestao-scouter-batch`
   - `validate-gestao-scouter-config`
   - `reload-gestao-scouter-schema-cache`

See main tabuladormax documentation for setup details:
- [Quick Setup Guide](../../QUICK_SETUP_GESTAO_SCOUTER_CONFIG.md)
- [Architecture Overview](../../GESTAO_SCOUTER_CONFIG_ARCHITECTURE.md)
- [Implementation Guide](../../IMPLEMENTATION_GESTAO_SCOUTER_CONFIG.md)

## Integration with Tabuladormax

### Routing

The module is accessible through the tabuladormax router at:
- `/gestao/*` - Main gestao-scouter routes
- `/scouter/*` - Alternative route alias

### Authentication

Users with `module: "gestao"` or `module: "scouter"` in their auth metadata are automatically redirected to this module.

### Data Sync

Lead data syncs between tabuladormax and gestao-scouter:
- **From Gestao**: Imports leads into tabuladormax
- **To Gestao**: Exports filtered leads to gestao-scouter
- **Batch Operations**: Bulk export functionality

## Troubleshooting

### Module Not Loading

1. Ensure dependencies are installed: `npm install`
2. Check build output: `npm run build`
3. Verify configuration: See [troubleshooting docs](../../docs/guides/gestao-scouter-sync-guide.md)

### Sync Issues

1. Verify gestao_scouter_config table is set up
2. Check Supabase function logs
3. Validate credentials in config table

### Build Errors

1. Check TypeScript configuration
2. Ensure all dependencies are compatible
3. Review import paths

## Contributing

When making changes to this module:

1. Follow the existing code structure
2. Update tests for new functionality
3. Run linter before committing: `npm run lint`
4. Ensure build passes: `npm run build`
5. Update documentation as needed

## Related Documentation

- [Gestão Scouter Sync Guide](../../docs/guides/gestao-scouter-sync-guide.md)
- [Batch Export Guide](../../docs/guides/gestao-scouter-batch-export.md)
- [CSV Import Control](../../docs/guides/csv-import-sync.md)
- [Main Architecture](../../ARCHITECTURE.md)

## License

See main tabuladormax repository license.
