# Module Architecture Diagram

## Multi-Module Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                              │
│                   (Entry Point Configuration)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Changed to use:
                          │ /src/main.module-router.tsx
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  main.module-router.tsx                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ QueryClientProvider, TooltipProvider, Toaster, Sonner   │ │
│  └───────────────────────┬───────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              BrowserRouter                                │ │
│  └───────────────────────┬───────────────────────────────────┘ │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ModuleRouter.tsx                              │
│                 (Main Routing Logic)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Routes                                                  │   │
│  │  ├─ / ────────────────────────► HomeChoice             │   │
│  │  ├─ /tabulador/* ──────────────► Tabulador Module      │   │
│  │  ├─ /scouter/* ────────────────► Gestão Scouter Module │   │
│  │  ├─ /gestao/* ─────────────────► Gestão Scouter Module │   │
│  │  └─ * ─────────────────────────► 404 / Redirect        │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────┬──────────────┬────────────┘
                       │              │              │
        ┌──────────────┘              │              └──────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐         ┌────────────────────┐      ┌──────────────────┐
│  HomeChoice   │         │  Tabulador Module  │      │ Gestão Scouter   │
│     Page      │         │    (Lazy Load)     │      │     Module       │
├───────────────┤         ├────────────────────┤      │  (Lazy Load)     │
│               │         │                    │      ├──────────────────┤
│ ┌───────────┐ │         │ src/modules/       │      │                  │
│ │ Tabulador │ │         │   tabulador/       │      │ src/modules/     │
│ │  Button   │ │         │     App.tsx        │      │   gestao/        │
│ │           │ │         │       │            │      │     App.tsx      │
│ │  [Go to]  │ │         │       │            │      │       │          │
│ └─────┬─────┘ │         │       ▼            │      │       ▼          │
│       │       │         │  ../../App.tsx     │      │  (Placeholder or │
│ ┌─────▼─────┐ │         │  (Existing app)    │      │   Real Gestão    │
│ │   Gestão  │ │         │                    │      │   Scouter App)   │
│ │  Scouter  │ │         │ Includes:          │      │                  │
│ │  Button   │ │         │ - All pages        │      │ To be integrated │
│ │           │ │         │ - Components       │      │ via merge script │
│ │  [Go to]  │ │         │ - Routes           │      │ or git subtree   │
│ └───────────┘ │         │ - Auth, Config     │      │                  │
│               │         │ - Dashboard, etc.  │      │                  │
└───────────────┘         └────────────────────┘      └──────────────────┘
```

## Authentication Flow with useAuthRedirect

```
┌─────────────┐
│   User      │
│   Logs In   │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────────────┐
│         Auth Component / Page                  │
│  ┌──────────────────────────────────────────┐  │
│  │    useAuthRedirect({ enabled: true })    │  │
│  └────────────────┬─────────────────────────┘  │
└─────────────────┬─┴────────────────────────────┘
                  │
                  ▼
     ┌────────────────────────────┐
     │  Get User from Supabase    │
     │  Check user_metadata or    │
     │  app_metadata for "module" │
     └────────────┬───────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   module == "scouter"  module == "tabulador"
   or "gestao"
        │                   │
        ▼                   ▼
   navigate('/scouter')  navigate('/tabulador')
        │                   │
        ▼                   ▼
┌────────────────┐    ┌────────────────┐
│ Gestão Scouter │    │   Tabulador    │
│     Module     │    │     Module     │
└────────────────┘    └────────────────┘
```

## File Organization

```
tabuladormax/
│
├── index.html (update to use main.module-router.tsx)
│
├── src/
│   ├── main.tsx (original - kept for backwards compatibility)
│   ├── main.module-router.tsx (new multi-module entry) ✨
│   ├── App.tsx (original tabulador app - unchanged)
│   │
│   ├── routes/
│   │   └── ModuleRouter.tsx (routing logic) ✨
│   │
│   ├── pages/
│   │   ├── HomeChoice.tsx (module selection) ✨
│   │   ├── Auth.tsx (existing)
│   │   ├── Home.tsx (existing)
│   │   └── ... (other existing pages)
│   │
│   ├── hooks/
│   │   ├── useAuthRedirect.ts (auth routing) ✨
│   │   └── ... (other hooks)
│   │
│   ├── modules/
│   │   ├── tabulador/
│   │   │   └── App.tsx (wrapper for existing app) ✨
│   │   │
│   │   └── gestao/
│   │       ├── App.tsx (placeholder or real app) ✨
│   │       ├── README.md (integration instructions) ✨
│   │       ├── .gitkeep ✨
│   │       └── ... (gestao-scouter files - to be added)
│   │
│   └── ... (components, lib, utils, etc. - existing)
│
├── scripts/
│   └── merge_gestao_into_tabuladormax.sh (merge automation) ✨
│
├── MODULE_ROUTER_GUIDE.md (detailed docs) ✨
├── GESTAO_INTEGRATION_QUICKSTART.md (quick reference) ✨
│
├── tsconfig.json (updated with @/modules/* path) ✨
├── vite.config.ts (updated with @/modules alias) ✨
│
└── ... (other config files - unchanged)

✨ = New or modified files in this PR
```

## Lazy Loading Flow

```
User navigates to /tabulador or /scouter
                │
                ▼
    ┌───────────────────────┐
    │  ModuleRouter.tsx     │
    │  Route matches        │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │  React.lazy()         │
    │  starts loading       │
    │  module chunk         │
    └───────────┬───────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    Loading         Module
    Spinner         loads
        │               │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Module renders│
        │ in Suspense   │
        └───────────────┘
```

## Benefits of this Architecture

### 1. **Separation of Concerns**
- Each module is self-contained
- Modules can be developed independently
- Clear boundaries between tabulador and gestao-scouter

### 2. **Performance**
- Lazy loading reduces initial bundle size
- Only load what's needed when it's needed
- Faster initial page load

### 3. **Scalability**
- Easy to add more modules in the future
- Each module can have its own dependencies
- Modules can be versioned separately

### 4. **User Experience**
- Clear module selection on HomeChoice page
- Automatic routing based on user preferences
- Seamless navigation between modules

### 5. **Development Workflow**
- Modules can be integrated gradually
- Testing is isolated per module
- Backwards compatible - original app still works

### 6. **Maintenance**
- Clear documentation for integration
- Automated merge script
- Easy to understand structure

## Next Steps for Integration

1. **Update Entry Point**: Change index.html to use main.module-router.tsx
2. **Run Merge Script**: Execute `./scripts/merge_gestao_into_tabuladormax.sh`
3. **Update Dependencies**: Merge package.json dependencies
4. **Configure Module**: Update src/modules/gestao/App.tsx
5. **Test Routes**: Verify all routes work correctly
6. **Build**: Run production build
7. **Deploy**: Deploy to production

## Security Considerations

✅ **CodeQL Analysis**: 0 security issues found  
✅ **Auth Integration**: Uses existing Supabase client  
✅ **No New Dependencies**: Only reorganization, no new packages  
✅ **Backwards Compatible**: Original app still functional  
✅ **Type Safety**: Full TypeScript support maintained

---

**Architecture Version:** 1.0  
**Last Updated:** 2025-10-23  
**PR:** #83 - Prepare tabuladormax for gestao-scouter integration
