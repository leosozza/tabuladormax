# Module Router Setup Guide

This guide explains how to switch the application to use the new ModuleRouter for multi-module architecture.

## Overview

The application now supports a multi-module architecture with:
- **Tabulador Module**: The existing lead management system
- **Gestão Scouter Module**: The scouting management system (to be integrated)
- **HomeChoice Page**: Landing page for choosing between modules

## Switching to ModuleRouter

### Option 1: Update index.html (Recommended)

Update the `index.html` file to use the new entry point:

```html
<!-- Change this line: -->
<script type="module" src="/src/main.tsx"></script>

<!-- To this: -->
<script type="module" src="/src/main.module-router.tsx"></script>
```

### Option 2: Update main.tsx

Alternatively, you can modify `src/main.tsx` to use ModuleRouter instead of App:

```tsx
// Replace the import:
// import App from "./App.tsx";
import ModuleRouter from "./routes/ModuleRouter";

// And replace in the render:
// <App />
<ModuleRouter />
```

## File Structure

```
src/
├── main.module-router.tsx    # Alternative entry point with ModuleRouter
├── routes/
│   └── ModuleRouter.tsx      # Main router for modules
├── pages/
│   └── HomeChoice.tsx        # Module selection page
├── hooks/
│   └── useAuthRedirect.ts    # Auth redirect based on user metadata
└── modules/
    ├── tabulador/
    │   └── App.tsx           # Tabulador module wrapper
    └── gestao/
        ├── README.md         # Instructions for integration
        ├── .gitkeep          # Git tracking
        └── App.tsx           # Placeholder (to be replaced)
```

## Routes

- `/` - HomeChoice page (module selection)
- `/tabulador/*` - Tabulador module (existing app)
- `/scouter/*` or `/gestao/*` - Gestão Scouter module

## Integrating Gestão Scouter

### Step 1: Copy the Code

Use one of these methods to integrate the gestao-scouter code:

**Method A: Using the merge script**
```bash
./scripts/merge_gestao_into_tabuladormax.sh /path/to/gestao-scouter
```

**Method B: Using git subtree**
```bash
git subtree add --prefix=src/modules/gestao [gestao-repo-url] [branch] --squash
```

**Method C: Manual copy**
```bash
cp -r /path/to/gestao-scouter/src/* src/modules/gestao/
```

### Step 2: Update App.tsx

Ensure `src/modules/gestao/App.tsx` exports a default React component:

```tsx
import React from 'react';
// ... other imports

const GestaoScouterApp: React.FC = () => {
  return (
    // Your gestao-scouter app component
  );
};

export default GestaoScouterApp;
```

### Step 3: Merge Dependencies

Copy dependencies from gestao-scouter's `package.json` to the main `package.json`:

```bash
# Review and manually merge dependencies
# Then run:
npm install
```

### Step 4: Test

```bash
# Start development server
npm run dev

# Navigate to http://localhost:8080
# You should see the HomeChoice page
# Test both module routes: /tabulador and /scouter
```

### Step 5: Build

```bash
npm run build
```

## Auth Redirect

The `useAuthRedirect` hook can be used to automatically redirect users based on their metadata:

```tsx
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

// In your Auth component or post-login page:
useAuthRedirect({ enabled: true });
```

User metadata should include a `module` field:
- `module: 'tabulador'` - Redirects to `/tabulador`
- `module: 'scouter'` or `module: 'gestao'` - Redirects to `/scouter`
- No module field - Redirects to `/` (HomeChoice)

## Development Notes

### Lazy Loading

Both modules are lazy-loaded using React.lazy() and Suspense:
- Reduces initial bundle size
- Loads modules on-demand when routes are accessed
- Shows loading spinner during module load

### Error Handling

If a module fails to load (e.g., App.tsx doesn't exist), an error fallback is shown with a button to return to HomeChoice.

### Testing Without Gestão Scouter

The placeholder `src/modules/gestao/App.tsx` allows testing the routing without having the full gestao-scouter code integrated. The placeholder shows instructions for integration.

## Troubleshooting

### Module not loading

- Verify `src/modules/gestao/App.tsx` exists and exports a default component
- Check browser console for import errors
- Ensure all imports use the correct path aliases (@/modules/*)

### Routes not working

- Verify you switched to main.module-router.tsx or updated main.tsx
- Check that BrowserRouter is properly configured
- Clear browser cache and restart dev server

### TypeScript errors

- Run `npm run build` to check for compilation errors
- Ensure tsconfig.json includes the @/modules/* path mapping
- Verify vite.config.ts has the @/modules alias

## Reverting to Single-Module

To revert to the original single-module architecture:

1. Update index.html to use `/src/main.tsx`
2. Or revert changes to main.tsx
3. The original App.tsx and routes remain unchanged

The multi-module structure is additive and doesn't break existing functionality.
