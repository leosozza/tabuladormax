# Copilot Instructions for Gestão Scouter

## Project Overview

This is a React/TypeScript management system called "Gestão Scouter" (Scouter Management System) built with Vite. The application manages scouters/scouts with features including performance dashboards, lead management, payment processing, and integrations with external services.

### Key Features
- **Performance Analytics**: Dashboard with KPI tracking and data visualization
- **Lead Management**: Comprehensive lead tracking and conversion analytics
- **Financial Control**: Payment processing and financial reporting
- **Multi-platform Integration**: Supabase database, Bitrix CRM, Google Sheets
- **Advanced Reporting**: PDF generation with custom business reports
- **Real-time Data**: Live updates and synchronization across platforms

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 7 with SWC compiler
- **UI Framework**: shadcn/ui with Radix UI components
- **Styling**: Tailwind CSS 3.4+ with custom design system
- **State Management**: TanStack React Query v5 for server state
- **Routing**: React Router DOM v6
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **External Integrations**: Bitrix24 CRM, Google Sheets API
- **PDF Generation**: jsPDF with AutoTable plugin
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Date Handling**: date-fns with timezone support
- **Development**: ESLint + TypeScript ESLint + Lovable Tagger

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── dashboard/      # Dashboard-specific components
│   │   ├── charts/     # Chart components (Recharts)
│   │   ├── tables/     # Data table components
│   │   └── integrations/ # External service integrations
│   ├── layout/         # Layout components
│   ├── auth/           # Authentication components
│   ├── shared/         # Shared utility components
│   ├── data-table/     # Generic table functionality
│   └── projection/     # Business projection components
├── pages/              # Route components
│   └── Configuracoes/  # Settings page components
├── hooks/              # Custom React hooks
├── services/           # External API services and integrations
├── repositories/       # Data access layer (Supabase)
├── layouts/            # Page layout templates
├── utils/              # Utility functions and helpers
├── lib/                # Library configurations (Supabase, utils)
├── data/               # Static data, types, and constants
└── integrations/       # Integration-specific logic
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `DashboardHeader.tsx`)
- **Pages**: PascalCase (e.g., `Dashboard.tsx`)
- **Utilities**: camelCase (e.g., `dateUtils.ts`)
- **Services**: camelCase with Service suffix (e.g., `bitrixService.ts`)
- **Repositories**: camelCase with Repo suffix (e.g., `leadsRepo.ts`)
- **Types**: PascalCase interfaces (e.g., `interface UserData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `const API_ENDPOINTS`)

## Coding Standards

### TypeScript
- **Strict Mode**: Use strict TypeScript configuration
- **No `any` types**: Replace `any` with proper types (current priority: 76+ violations to fix)
- **Interface over Type**: Prefer interfaces for object shapes, types for unions/primitives
- **Explicit return types**: Add return types for all exported functions
- **Null Safety**: Handle null/undefined explicitly (strictNullChecks: false currently, should be enabled)
- **Type Guards**: Use type guards for runtime type checking
- **Generic Constraints**: Use proper generic constraints for reusable code

### Current TypeScript Issues
⚠️ **PRIORITY**: The codebase currently has TypeScript strict mode disabled with:
- `noImplicitAny: false` - should be `true`
- `strictNullChecks: false` - should be `true`
- `noUnusedParameters: false` - should be `true`
- `noUnusedLocals: false` - should be `true`

When making changes, gradually improve type safety without breaking existing functionality.

### React Best Practices
- **Functional Components**: Use functional components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Component Composition**: Prefer composition over complex props
- **Error Boundaries**: Implement error boundaries for critical sections
- **Performance**: Use React.memo, useMemo, useCallback appropriately

### Code Organization
- **Single Responsibility**: Each component/function should have one clear purpose
- **Consistent Naming**: Use descriptive, consistent naming conventions
- **File Structure**: Follow the established directory structure
- **Imports**: Use absolute imports with `@/` prefix

### State Management
- **React Query**: Use for server state management
- **Local State**: Use useState for component-local state
- **Form State**: Use React Hook Form for form management
- **Global State**: Minimize global state, prefer prop drilling or context when needed

## External Integrations

### Supabase
- Database operations should go through the repositories layer
- Use proper error handling for database operations
- Implement proper type safety for database queries

### Bitrix CRM
- API calls should use the `bitrixService`
- Handle authentication and rate limiting appropriately
- Implement proper error handling and retry logic

### Google Sheets
- Use `googleSheetsService` for spreadsheet operations
- Handle authentication through service accounts
- Implement batch operations where possible

## UI/UX Guidelines

### Design System
- Use shadcn/ui components consistently
- Follow the established color scheme and typography
- Maintain consistent spacing using Tailwind classes
- Ensure responsive design for all components

### User Experience
- Provide loading states for async operations
- Show appropriate error messages to users
- Implement proper form validation with clear feedback
- Use toast notifications for user actions

### Accessibility
- Ensure keyboard navigation works properly
- Use semantic HTML elements
- Provide proper ARIA labels where needed
- Maintain good color contrast ratios

## Performance Considerations

- **Code Splitting**: Implement route-based code splitting
- **Lazy Loading**: Use lazy loading for heavy components
- **Memoization**: Use React.memo for expensive renders
- **Virtual Scrolling**: Implement for large data lists
- **Image Optimization**: Optimize images and use proper formats

## Testing Guidelines

⚠️ **Note**: This project currently has no dedicated test infrastructure. When adding new features:

- **Manual Testing**: Thoroughly test in development mode (`npm run dev`)
- **Integration Testing**: Test external API integrations (Supabase, Bitrix, Google Sheets)
- **Cross-browser Testing**: Verify functionality in different browsers
- **Error Boundary Testing**: Ensure error states are handled gracefully
- **Performance Testing**: Monitor for performance regressions

### Future Testing Setup (Recommended)
- **Unit Tests**: Vitest for utility functions and hooks
- **Component Tests**: React Testing Library for UI components  
- **E2E Tests**: Playwright for critical user journeys
- **API Mocking**: Mock external services for reliable testing

## Development Workflow

### Local Development
```bash
npm run dev      # Start development server on localhost:8080
npm run build    # Build for production
npm run lint     # Run ESLint (currently 89 issues to fix)
npm run preview  # Preview production build
```

### Environment Setup
Required environment variables in `.env`:
```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_key
```

### Code Quality Tools
- **ESLint**: TypeScript + React configuration with react-hooks plugin
- **TypeScript**: Configured with project references (app + node configs)
- **Vite**: SWC compiler for fast development builds
- **Lovable Tagger**: Component tagging for development mode
- **Manual Chunking**: Optimized bundle splitting for performance

### Code Quality
- **Fix TypeScript errors gradually**: Currently 76 `@typescript-eslint/no-explicit-any` errors
- **Ensure ESLint passes**: Fix linting issues before submitting code  
- **Follow existing patterns**: Maintain consistency with established code style
- **Add proper error handling**: All async operations must have try-catch blocks
- **Test critical paths**: Verify functionality manually in development mode
- **Performance awareness**: Monitor bundle sizes and runtime performance

### Current Linting Issues (Priority Order)
1. **TypeScript `any` types**: 76 violations across multiple files
2. **React Hooks dependencies**: Missing dependencies in useEffect
3. **React Refresh warnings**: Component export structure issues
4. **Unused variables**: ESLint rule currently disabled but should be addressed

### Git Workflow
- Use descriptive commit messages
- Keep commits focused and atomic
- Test changes locally before committing
- Follow the existing branch naming conventions

## Common Patterns

### API Services
```typescript
// Use proper error handling and type safety
export const fetchData = async (): Promise<DataType[]> => {
  try {
    const response = await supabase
      .from('table_name')
      .select('*');
    
    if (response.error) throw response.error;
    return response.data || [];
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};
```

### Component Structure
```typescript
interface ComponentProps {
  // Always define proper prop types
  data: DataType[];
  onAction: (id: string) => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  // Component implementation
};
```

### Form Handling
```typescript
// Use React Hook Form with Zod validation
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    // Define default values
  },
});
```

### Data Fetching with React Query
```typescript
// Use TanStack Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['key', param],
  queryFn: async () => {
    const result = await fetchData(param);
    return result;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Domain-Specific Patterns

### Dashboard Components
- Use `Card` wrapper for dashboard sections
- Implement loading states with skeleton components
- Handle empty states gracefully
- Use consistent spacing with Tailwind utilities

### External Integration Services
- Always implement proper error handling and retry logic
- Use environment variables for API credentials
- Implement rate limiting where applicable
- Log integration events for debugging

### Data Processing
- Validate external data with Zod schemas before processing
- Use proper date handling with date-fns (timezone-aware)
- Implement data caching strategies with React Query
- Handle large datasets with pagination or virtualization

## Working with This Codebase

### Before Making Changes
1. **Start development server**: `npm run dev` and verify it runs without errors
2. **Check current issues**: Run `npm run lint` to see existing problems
3. **Review related files**: Understand the context of components you're modifying
4. **Test integrations**: Verify external services (Supabase/Bitrix) are accessible

### Making Changes
1. **Follow existing patterns**: Look at similar components for reference
2. **Maintain consistency**: Use same styling, naming, and structure conventions
3. **Handle edge cases**: Consider loading, error, and empty states
4. **Update types**: If changing data structures, update TypeScript interfaces
5. **Test thoroughly**: Manual testing is crucial due to lack of automated tests

### Code Review Checklist
- [ ] No new TypeScript `any` types introduced
- [ ] Proper error handling for async operations
- [ ] Loading states implemented where needed
- [ ] Consistent with existing component patterns
- [ ] External API calls properly typed and error-handled
- [ ] Responsive design maintained
- [ ] Accessibility standards followed

## AI Assistant Guidelines

### For Copilot/AI Tools
- **Context awareness**: Always check surrounding code for patterns and conventions
- **Incremental improvements**: Fix typing issues when working on related code
- **Error prevention**: Suggest proper error handling for all async operations
- **Performance considerations**: Be mindful of bundle size when importing libraries
- **Business context**: Understand this is a management system for scouting/lead generation

### Best Practices for AI-Generated Code
- **Type safety first**: Always provide proper TypeScript types
- **Error boundaries**: Suggest error handling patterns
- **Accessibility**: Include ARIA labels and semantic HTML
- **Performance**: Recommend React.memo, useMemo, useCallback where beneficial
- **Security**: Never suggest hardcoded secrets or unsafe practices

### Common AI Code Issues to Avoid
- Don't suggest `any` types - always provide proper interfaces
- Don't ignore error handling in async operations
- Don't create components without proper TypeScript props
- Don't suggest inline styles when Tailwind classes are available
- Don't recommend outdated React patterns (class components, old hooks patterns)

## Security Considerations

- **Environment Variables**: Never commit secrets, use proper env vars
- **Input Validation**: Validate all user inputs with Zod schemas
- **API Security**: Implement proper authentication for API calls
- **Data Sanitization**: Sanitize data before displaying or processing

## Maintenance Notes

### Current Technical Debt
- **Linting Issues**: 89 total (76 errors, 13 warnings)
  - Primary: TypeScript `any` types need proper typing
  - Secondary: React Hooks dependency arrays need review
  - Tertiary: Component export structure for Fast Refresh
- **TypeScript Configuration**: Strict mode disabled, should be gradually enabled
- **Missing Tests**: No test infrastructure currently exists
- **Bundle Analysis**: Monitor chunk sizes (some chunks >390KB)

### Improvement Priorities
1. **Type Safety**: Gradually enable strict TypeScript settings
2. **Error Handling**: Improve error boundaries and async error handling
3. **Performance**: Implement virtual scrolling for large datasets
4. **Testing**: Add testing infrastructure for critical business logic
5. **Documentation**: Add JSDoc comments for complex functions
6. **Security**: Audit external API integrations for security best practices

### Performance Metrics
- **Development Build**: ~10s build time
- **Production Bundle**: 
  - React Core: ~142KB
  - UI Components: ~95KB  
  - Charts: ~392KB (largest chunk)
  - Total: ~1.3MB optimized

When making changes to this codebase, prioritize type safety, follow established patterns, ensure proper error handling, and manually verify all functionality in development mode.