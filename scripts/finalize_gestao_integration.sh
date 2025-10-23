#!/bin/bash

# Script to finalize gestao-scouter integration after repository access is granted
# This script should be run after the git subtree add command succeeds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Gestão Scouter Integration - Finalization${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check if modules/gestao-scouter has content
if [ ! -d "modules/gestao-scouter" ]; then
    echo -e "${RED}Error: modules/gestao-scouter directory not found${NC}"
    echo -e "${YELLOW}Please run the git subtree add command first:${NC}"
    echo "git subtree add --prefix=modules/gestao-scouter gestao-scouter main --squash=false"
    exit 1
fi

# Count files in the directory (excluding .gitkeep)
file_count=$(find modules/gestao-scouter -type f ! -name '.gitkeep' ! -name 'README.md' | wc -l)
if [ "$file_count" -lt 5 ]; then
    echo -e "${YELLOW}Warning: modules/gestao-scouter seems to have limited content (${file_count} files)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}Step 1: Update package.json for workspaces${NC}"
# Check if package.json has workspaces
if ! grep -q '"workspaces"' package.json; then
    echo "Adding workspaces configuration to package.json..."
    # Create backup
    cp package.json package.json.backup
    
    # Add workspaces configuration using node
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.workspaces = ['modules/*'];
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
    "
    echo -e "${GREEN}✓ Workspaces configuration added${NC}"
else
    echo -e "${GREEN}✓ Workspaces already configured${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Check for package.json in gestao-scouter module${NC}"
if [ -f "modules/gestao-scouter/package.json" ]; then
    echo -e "${GREEN}✓ Module package.json found${NC}"
    
    # Show module name and version
    module_name=$(node -p "require('./modules/gestao-scouter/package.json').name" 2>/dev/null || echo "unknown")
    module_version=$(node -p "require('./modules/gestao-scouter/package.json').version" 2>/dev/null || echo "unknown")
    echo "  Module: ${module_name} v${module_version}"
else
    echo -e "${YELLOW}⚠ No package.json found in module${NC}"
    echo "  This might be expected if gestao-scouter is not an npm package"
fi

echo ""
echo -e "${BLUE}Step 3: Update tsconfig.json for module paths${NC}"
if [ -f "tsconfig.json" ]; then
    # Check if paths already include modules
    if ! grep -q '"@/modules/gestao-scouter/*"' tsconfig.json 2>/dev/null; then
        echo "Adding module path alias to tsconfig.json..."
        # Note: This is a simplified version - manual adjustment may be needed
        echo -e "${YELLOW}⚠ Manual tsconfig.json update recommended${NC}"
        echo "  Add to compilerOptions.paths:"
        echo '    "@/modules/gestao-scouter/*": ["./modules/gestao-scouter/*"]'
    else
        echo -e "${GREEN}✓ Module paths already configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No tsconfig.json found${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Update README.md${NC}"
if ! grep -q "modules/gestao-scouter" README.md; then
    echo "Adding gestao-scouter module reference to README.md..."
    # Add a section about the module
    cat >> README.md << 'EOF'

## Modules

### Gestão Scouter Module

Located at `modules/gestao-scouter/`, this module provides lead management and scouting functionality.

See [modules/gestao-scouter/README.md](./modules/gestao-scouter/README.md) for module-specific documentation.

EOF
    echo -e "${GREEN}✓ README.md updated${NC}"
else
    echo -e "${GREEN}✓ README.md already references the module${NC}"
fi

echo ""
echo -e "${BLUE}Step 5: Check GitHub Actions workflows${NC}"
if [ -d ".github/workflows" ]; then
    workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
    if [ "$workflow_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found ${workflow_count} workflow(s)${NC}"
        echo "  Review and update workflows to include modules/gestao-scouter in:"
        echo "  - Build steps"
        echo "  - Test steps"
        echo "  - Lint steps"
    else
        echo -e "${GREEN}✓ No workflows found (nothing to update)${NC}"
    fi
else
    echo -e "${GREEN}✓ No .github/workflows directory${NC}"
fi

echo ""
echo -e "${BLUE}Step 6: Install dependencies${NC}"
echo "Running npm install..."
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ npm install failed${NC}"
    echo -e "${YELLOW}You may need to resolve dependency conflicts manually${NC}"
fi

echo ""
echo -e "${BLUE}Step 7: Run build test${NC}"
echo "Testing build..."
if npm run build 2>&1 | tee build.log; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    echo -e "${YELLOW}Review build.log for errors${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  - Import path mismatches"
    echo "  - TypeScript configuration issues"
    echo "  - Dependency version conflicts"
fi

echo ""
echo -e "${BLUE}Step 8: Run linter${NC}"
echo "Running linter..."
if npm run lint; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠ Linting issues found${NC}"
    echo "Run 'npm run lint' to see details"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Integration Steps Completed${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the integration in modules/gestao-scouter/"
echo "2. Test the application: npm run dev"
echo "3. Review and resolve any build/lint errors"
echo "4. Update GitHub Actions workflows if present"
echo "5. Commit the changes:"
echo "   git add ."
echo "   git commit -m 'Complete gestao-scouter integration with history preservation'"
echo "6. Push and create PR:"
echo "   git push origin integrate/gestao-scouter"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Integration status: GESTAO_SCOUTER_INTEGRATION_BLOCKED.md"
echo "- Module README: modules/gestao-scouter/README.md"
echo "- Main README: README.md"
echo ""
