# Gestão Scouter Integration - Access Required

## Current Status: BLOCKED

### Issue
Cannot access the repository `https://github.com/leosozza/gestao-scouter` due to authentication requirements.

### Error Message
```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/leosozza/gestao-scouter.git/'
```

## Integration Plan (To Execute Once Access is Granted)

### Prerequisites
1. Repository access: `https://github.com/leosozza/gestao-scouter` must be:
   - Made public, OR
   - Access granted via GitHub token/credentials, OR
   - Provided as an alternative source (ZIP, tar, different repo URL)

### Steps to Complete Integration

Once repository access is available, execute the following commands:

#### 1. Fetch the Repository with History
```bash
cd /home/runner/work/tabuladormax/tabuladormax
git fetch gestao-scouter --tags
```

#### 2. Import Using Git Subtree (Preserves History)

**Option A: Using git subtree (Recommended)**
```bash
# Import the entire gestao-scouter repository into modules/gestao-scouter
# This preserves all commit history
git subtree add --prefix=modules/gestao-scouter gestao-scouter main --squash=false
```

**Option B: If subtree fails, use merge with unrelated histories**
```bash
# Merge the unrelated history
git merge --allow-unrelated-histories -s ours --no-commit gestao-scouter/main

# Read the tree into the target directory
git read-tree --prefix=modules/gestao-scouter/ -u gestao-scouter/main

# Commit the import
git commit -m "Import gestao-scouter into modules/gestao-scouter preserving history

Imported from: https://github.com/leosozza/gestao-scouter
Target location: modules/gestao-scouter/
Strategy: git read-tree with unrelated history merge
Preserves: Full commit history from gestao-scouter repository"
```

#### 3. Update Package.json for Workspaces
```bash
# Edit package.json to add workspaces configuration
# This will be done automatically by the integration script
```

#### 4. Update TypeScript Configuration
```bash
# Update tsconfig.json to include the new module
# Add path aliases for the new module
```

#### 5. Create Module-Specific Documentation
```bash
# Create README.md in modules/gestao-scouter/
# Document how to work with the module
```

#### 6. Update GitHub Actions
```bash
# Update .github/workflows to include the new module in CI/CD
```

#### 7. Install Dependencies and Build
```bash
npm install
npm run build
npm run lint
npm test
```

### Alternative Approaches

If the repository cannot be made accessible:

#### Manual Import (No History Preservation)
```bash
# 1. Get a ZIP/tar of the gestao-scouter repository
# 2. Extract it to modules/gestao-scouter/
# 3. Commit the files:
git add modules/gestao-scouter/
git commit -m "Import gestao-scouter code (without git history)

Source: gestao-scouter repository
Note: Commit history not preserved due to repository access limitations"
```

#### Use Existing Integration Points
The tabuladormax repository already has:
- `src/modules/gestao/` - Placeholder module
- Supabase functions for gestao-scouter sync
- Configuration and documentation

We could enhance these existing integration points instead of importing the full repository.

## Next Steps

**User Action Required:**
1. Confirm the repository URL is correct
2. Grant access to `https://github.com/leosozza/gestao-scouter`, OR
3. Provide alternative access method, OR
4. Confirm if we should proceed with existing integration points only

## Current Branch Setup

- ✅ Branch created: `integrate/gestao-scouter`
- ✅ Remote added: `gestao-scouter` → `https://github.com/leosozza/gestao-scouter.git`
- ⏸️ Integration paused: Waiting for repository access

## Contact

If you need to grant access or have questions about this integration, please:
1. Make the repository public temporarily, OR
2. Add the appropriate GitHub token to the environment, OR
3. Provide an alternative method to access the gestao-scouter codebase
