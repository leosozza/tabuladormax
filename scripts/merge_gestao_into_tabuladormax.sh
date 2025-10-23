#!/bin/bash

# Script to merge/copy gestao-scouter repository into tabuladormax as a module
# This script automates the process of copying gestao-scouter code into src/modules/gestao

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GESTAO_REPO_PATH="${1:-../gestao-scouter}"
TARGET_MODULE_PATH="src/modules/gestao"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Gestão Scouter Merge Script${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check if source repository exists
if [ ! -d "$GESTAO_REPO_PATH" ]; then
    echo -e "${RED}Error: Gestão Scouter repository not found at: $GESTAO_REPO_PATH${NC}"
    echo -e "${YELLOW}Usage: $0 [path-to-gestao-scouter-repo]${NC}"
    echo -e "${YELLOW}Example: $0 ../gestao-scouter${NC}"
    exit 1
fi

echo -e "${GREEN}Source repository: $GESTAO_REPO_PATH${NC}"
echo -e "${GREEN}Target module path: $TARGET_MODULE_PATH${NC}"
echo ""

# Check if target directory already has content (excluding .gitkeep and README.md)
if [ -d "$TARGET_MODULE_PATH" ]; then
    file_count=$(find "$TARGET_MODULE_PATH" -type f ! -name '.gitkeep' ! -name 'README.md' | wc -l)
    if [ "$file_count" -gt 0 ]; then
        echo -e "${YELLOW}Warning: Target directory already contains files.${NC}"
        read -p "Do you want to continue and overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Aborted.${NC}"
            exit 1
        fi
    fi
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_MODULE_PATH"

echo -e "${GREEN}Copying source files...${NC}"

# Copy src directory contents
if [ -d "$GESTAO_REPO_PATH/src" ]; then
    cp -r "$GESTAO_REPO_PATH/src"/* "$TARGET_MODULE_PATH/"
    echo -e "${GREEN}✓ Copied src/ contents${NC}"
fi

# Copy public assets if they exist
if [ -d "$GESTAO_REPO_PATH/public" ]; then
    mkdir -p "public/gestao"
    cp -r "$GESTAO_REPO_PATH/public"/* "public/gestao/"
    echo -e "${GREEN}✓ Copied public/ assets${NC}"
fi

# Copy configuration files that might be needed
for file in .env.example tsconfig.json; do
    if [ -f "$GESTAO_REPO_PATH/$file" ]; then
        cp "$GESTAO_REPO_PATH/$file" "$TARGET_MODULE_PATH/$file.gestao"
        echo -e "${GREEN}✓ Copied $file as $file.gestao${NC}"
    fi
done

# Create a module App entry point if it doesn't exist
if [ ! -f "$TARGET_MODULE_PATH/App.tsx" ]; then
    echo "Creating module App.tsx entry point..."
    cat > "$TARGET_MODULE_PATH/App.tsx" << 'EOF'
// Gestão Scouter Module Entry Point
// This file should be updated to export the main App component from gestao-scouter
// Import and export your main component here

import React from 'react';

const GestaoScouterApp: React.FC = () => {
  return (
    <div>
      <h1>Gestão Scouter Module</h1>
      <p>Replace this placeholder with your actual Gestão Scouter app component.</p>
    </div>
  );
};

export default GestaoScouterApp;
EOF
    echo -e "${GREEN}✓ Created placeholder App.tsx${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Merge completed successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the copied files in $TARGET_MODULE_PATH"
echo "2. Update $TARGET_MODULE_PATH/App.tsx to export the main component"
echo "3. Merge dependencies from gestao-scouter's package.json into the main package.json"
echo "4. Run: npm install"
echo "5. Update import paths if needed (adjust for new module structure)"
echo "6. Test the application: npm run dev"
echo "7. Build the application: npm run build"
echo ""
echo -e "${YELLOW}Alternative approach using git subtree:${NC}"
echo "git subtree add --prefix=$TARGET_MODULE_PATH [gestao-repo-url] [branch] --squash"
echo ""
