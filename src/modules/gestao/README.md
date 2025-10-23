# Gestão Scouter Module

This directory is reserved for the Gestão Scouter module code.

## Setup Instructions

To integrate the Gestão Scouter codebase into this module:

### Option 1: Using the merge script
```bash
# From the root of the tabuladormax repository
./scripts/merge_gestao_into_tabuladormax.sh /path/to/gestao-scouter
```

### Option 2: Using git subtree
```bash
git subtree add --prefix=src/modules/gestao [gestao-scouter-repo-url] [branch] --squash
```

### Option 3: Manual copy
1. Copy the contents of the gestao-scouter `src/` directory into this folder
2. Ensure there's an `App.tsx` file that exports a default React component
3. Update import paths as needed

## Module Structure

After integration, this module should have:
- `App.tsx` - Main entry point component (must export default)
- Other component files and directories from gestao-scouter
- Module-specific assets and utilities

## Next Steps

1. Run the merge script or copy the code manually
2. Update `App.tsx` to be the main entry point
3. Merge dependencies from gestao-scouter's package.json
4. Run `npm install`
5. Test the routing in the main application
6. Build and verify: `npm run build`
