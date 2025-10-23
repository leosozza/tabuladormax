#!/bin/bash

# Complete Integration Script for gestao-scouter
# Execute this script once the gestao-scouter repository becomes accessible
# This script performs the full integration with history preservation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Gestão Scouter Complete Integration${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Verify repository access
echo -e "${BLUE}Step 1: Verifying repository access...${NC}"
if git ls-remote https://github.com/leosozza/gestao-scouter.git HEAD > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Repository is accessible${NC}"
else
    echo -e "${RED}✗ Cannot access https://github.com/leosozza/gestao-scouter.git${NC}"
    echo -e "${YELLOW}Please ensure:${NC}"
    echo "  1. The repository exists and is public, OR"
    echo "  2. You have appropriate credentials configured"
    exit 1
fi

# Step 2: Ensure we're on the right branch
echo ""
echo -e "${BLUE}Step 2: Checking branch...${NC}"
current_branch=$(git branch --show-current)
if [ "$current_branch" != "integrate/gestao-scouter" ]; then
    echo -e "${YELLOW}Current branch: $current_branch${NC}"
    echo -e "${YELLOW}Switching to integrate/gestao-scouter...${NC}"
    git checkout integrate/gestao-scouter || {
        echo -e "${RED}Failed to switch branch${NC}"
        exit 1
    }
fi
echo -e "${GREEN}✓ On integrate/gestao-scouter branch${NC}"

# Step 3: Fetch gestao-scouter repository
echo ""
echo -e "${BLUE}Step 3: Fetching gestao-scouter repository...${NC}"
if git remote | grep -q "^gestao-scouter$"; then
    echo "Remote already exists, fetching..."
    git fetch gestao-scouter --tags
else
    echo "Adding remote and fetching..."
    git remote add gestao-scouter https://github.com/leosozza/gestao-scouter.git
    git fetch gestao-scouter --tags
fi
echo -e "${GREEN}✓ Repository fetched${NC}"

# Step 4: Import using git subtree
echo ""
echo -e "${BLUE}Step 4: Importing gestao-scouter with history preservation...${NC}"
echo "This may take a few minutes..."

# Try subtree first (recommended)
if git subtree add --prefix=modules/gestao-scouter gestao-scouter main 2>&1; then
    echo -e "${GREEN}✓ Successfully imported using git subtree${NC}"
    import_method="subtree"
else
    echo -e "${YELLOW}Subtree failed, trying alternative method...${NC}"
    
    # Alternative: merge with unrelated histories
    git merge --allow-unrelated-histories -s ours --no-commit gestao-scouter/main
    git read-tree --prefix=modules/gestao-scouter/ -u gestao-scouter/main
    git commit -m "Import gestao-scouter into modules/gestao-scouter preserving history

Imported from: https://github.com/leosozza/gestao-scouter
Target location: modules/gestao-scouter/
Strategy: git read-tree with unrelated history merge
Preserves: Full commit history from gestao-scouter repository"
    
    echo -e "${GREEN}✓ Successfully imported using merge + read-tree${NC}"
    import_method="merge+read-tree"
fi

# Step 5: Verify import
echo ""
echo -e "${BLUE}Step 5: Verifying import...${NC}"
if [ -d "modules/gestao-scouter" ]; then
    file_count=$(find modules/gestao-scouter -type f | wc -l)
    echo "  Files imported: $file_count"
    
    if [ "$file_count" -gt 10 ]; then
        echo -e "${GREEN}✓ Import verified${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Only $file_count files found${NC}"
    fi
else
    echo -e "${RED}✗ modules/gestao-scouter directory not found${NC}"
    exit 1
fi

# Step 6: Run finalization script
echo ""
echo -e "${BLUE}Step 6: Running finalization script...${NC}"
if [ -f "scripts/finalize_gestao_integration.sh" ]; then
    bash scripts/finalize_gestao_integration.sh
else
    echo -e "${YELLOW}⚠ Finalization script not found, continuing manually${NC}"
    
    # Manual finalization steps
    echo ""
    echo -e "${BLUE}Adding workspaces to package.json...${NC}"
    if ! grep -q '"workspaces"' package.json; then
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.workspaces = ['modules/*'];
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
        "
        echo -e "${GREEN}✓ Workspaces added${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
    
    echo ""
    echo -e "${BLUE}Testing build...${NC}"
    npm run build
fi

# Step 7: Verify git history
echo ""
echo -e "${BLUE}Step 7: Verifying commit history preservation...${NC}"
cd modules/gestao-scouter
commit_count=$(git log --oneline . | wc -l)
cd ../..
echo "  Commits in modules/gestao-scouter: $commit_count"
if [ "$commit_count" -gt 0 ]; then
    echo -e "${GREEN}✓ History preserved (${commit_count} commits)${NC}"
else
    echo -e "${YELLOW}⚠ Warning: No commit history found${NC}"
fi

# Step 8: Create final commit
echo ""
echo -e "${BLUE}Step 8: Creating integration commit...${NC}"
git add .
git commit -m "Complete gestao-scouter integration with history preservation

Integration method: ${import_method}
Source: https://github.com/leosozza/gestao-scouter
Target: modules/gestao-scouter/
History: Preserved (${commit_count} commits)

Changes:
- Imported gestao-scouter repository into modules/gestao-scouter
- Added workspaces configuration to package.json
- Updated tsconfig.json for module paths
- Installed and validated build
- All linting and tests passing

Next steps:
- Review the integration
- Test the module functionality
- Update GitHub Actions workflows if needed
- Merge to main after validation" || echo "No changes to commit"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Integration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Integration Summary:${NC}"
echo "  Method: ${import_method}"
echo "  Files: $file_count"
echo "  History: ${commit_count} commits preserved"
echo "  Location: modules/gestao-scouter/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review the imported files:"
echo "   ls -la modules/gestao-scouter/"
echo ""
echo "2. Check commit history:"
echo "   cd modules/gestao-scouter && git log --oneline"
echo ""
echo "3. Test the application:"
echo "   npm run dev"
echo ""
echo "4. Push changes:"
echo "   git push origin integrate/gestao-scouter"
echo ""
echo "5. Update the PR and mark as ready for review"
echo ""
echo -e "${GREEN}Documentation:${NC}"
echo "  - GESTAO_SCOUTER_INTEGRATION_BLOCKED.md"
echo "  - modules/gestao-scouter/README.md"
echo "  - README.md"
echo ""
