# Gestão Scouter Integration - Quick Start

This document provides a quick reference for integrating the Gestão Scouter module into Tabulador.

## 🚀 Quick Setup (5 minutes)

### 1. Switch to Module Router

Update `index.html` line 54:
```html
<!-- Change from: -->
<script type="module" src="/src/main.tsx"></script>

<!-- To: -->
<script type="module" src="/src/main.module-router.tsx"></script>
```

### 2. Test the Setup

```bash
npm run dev
```

Visit http://localhost:8080 - you should see the HomeChoice page with two module options.

### 3. Integrate Gestão Scouter Code

Choose one method:

**A. Using the merge script (Recommended)**
```bash
./scripts/merge_gestao_into_tabuladormax.sh /path/to/gestao-scouter
```

**B. Using git subtree**
```bash
git subtree add --prefix=src/modules/gestao https://github.com/[org]/gestao-scouter main --squash
```

**C. Manual copy**
```bash
# Copy source files
cp -r /path/to/gestao-scouter/src/* src/modules/gestao/

# Make sure App.tsx exports a default component
# Update imports if needed
```

### 4. Merge Dependencies

Open both `package.json` files and merge the dependencies:

```bash
# From gestao-scouter, add any missing dependencies to tabuladormax package.json
# Then run:
npm install
```

### 5. Update Gestão App Entry Point

Ensure `src/modules/gestao/App.tsx` exports the main component:

```tsx
// src/modules/gestao/App.tsx
import { YourMainComponent } from './components/Main';

export default YourMainComponent;
```

### 6. Test Both Modules

```bash
npm run dev

# Test routes:
# http://localhost:8080/           -> HomeChoice
# http://localhost:8080/tabulador  -> Tabulador module
# http://localhost:8080/scouter    -> Gestão Scouter module
```

### 7. Build for Production

```bash
npm run build
```

## 📁 File Structure After Integration

```
tabuladormax/
├── scripts/
│   └── merge_gestao_into_tabuladormax.sh
├── src/
│   ├── main.tsx                    # Original entry (not used with module router)
│   ├── main.module-router.tsx     # New entry point ✨
│   ├── App.tsx                    # Original tabulador app
│   ├── routes/
│   │   └── ModuleRouter.tsx       # Module router
│   ├── pages/
│   │   ├── HomeChoice.tsx         # Module selection page
│   │   └── ... (other pages)
│   ├── hooks/
│   │   ├── useAuthRedirect.ts     # Auth redirect hook
│   │   └── ... (other hooks)
│   └── modules/
│       ├── tabulador/
│       │   └── App.tsx            # Wrapper for original app
│       └── gestao/
│           ├── App.tsx            # Gestão Scouter main component
│           ├── components/        # Gestão components
│           ├── pages/             # Gestão pages
│           └── ... (gestao files)
├── MODULE_ROUTER_GUIDE.md         # Detailed guide
└── GESTAO_INTEGRATION_QUICKSTART.md  # This file
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `index.html` | Update to use `main.module-router.tsx` |
| `src/main.module-router.tsx` | New entry point with ModuleRouter |
| `src/routes/ModuleRouter.tsx` | Routes for both modules |
| `src/pages/HomeChoice.tsx` | Landing page for module selection |
| `src/modules/tabulador/App.tsx` | Tabulador module wrapper |
| `src/modules/gestao/App.tsx` | Gestão Scouter module entry |
| `src/hooks/useAuthRedirect.ts` | Auto-redirect based on user data |

## 🎯 Routes

| Route | Description |
|-------|-------------|
| `/` | HomeChoice - select which module to use |
| `/tabulador` | Tabulador module (existing app) |
| `/tabulador/*` | All tabulador routes work as before |
| `/scouter` or `/gestao` | Gestão Scouter module |
| `/scouter/*` or `/gestao/*` | All gestao routes |

## 🔐 Auth Redirect

To automatically redirect users after login based on their module preference:

```tsx
// In Auth.tsx or post-login page
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

const Auth = () => {
  useAuthRedirect({ enabled: true });
  // ... rest of component
};
```

**User metadata format:**
```json
{
  "user_metadata": {
    "module": "scouter"  // or "tabulador"
  }
}
```

## 🛠️ Troubleshooting

### Module not loading
- Check `src/modules/gestao/App.tsx` exists and exports default
- Verify imports use correct paths
- Clear browser cache: `Ctrl+Shift+R`

### Build errors
```bash
# Check TypeScript
npx tsc --noEmit

# Check paths in tsconfig.json and vite.config.ts
```

### Routes not working
- Ensure index.html uses `main.module-router.tsx`
- Verify BrowserRouter is configured correctly
- Check browser console for errors

## 📚 Full Documentation

See [MODULE_ROUTER_GUIDE.md](./MODULE_ROUTER_GUIDE.md) for complete documentation including:
- Detailed setup instructions
- Architecture overview
- Advanced configuration
- Testing strategies
- Rollback procedures

## 🔄 Reverting to Single-Module

To go back to the original single-module setup:

1. Update `index.html` back to `/src/main.tsx`
2. Restart dev server
3. Original app still works as before!

The multi-module structure is additive and doesn't break existing functionality.

## ✅ Checklist

- [ ] Updated index.html to use main.module-router.tsx
- [ ] Tested dev server - HomeChoice page loads
- [ ] Integrated gestao-scouter code into src/modules/gestao
- [ ] Updated src/modules/gestao/App.tsx to export main component
- [ ] Merged dependencies from gestao package.json
- [ ] Ran npm install
- [ ] Tested /tabulador route
- [ ] Tested /scouter route
- [ ] Build succeeds: npm run build
- [ ] Deployed to production

## 📞 Support

For issues or questions:
1. Check [MODULE_ROUTER_GUIDE.md](./MODULE_ROUTER_GUIDE.md)
2. Review console logs for specific errors
3. Check git history for recent changes
4. Consult the team

---

**Last Updated:** 2025-10-23  
**Version:** 1.0
