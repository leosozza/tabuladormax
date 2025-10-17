# Maintenance Notes

This document tracks potential code cleanup opportunities and maintenance tasks for future consideration.

## Last Updated
October 17, 2025

## Potentially Unused Components

The following components were identified as not being imported by any other files. They are kept in the codebase for now but should be reviewed:

### 1. `CommercialProjectSelector.tsx`
**Location**: `src/components/CommercialProjectSelector.tsx`

**Description**: A simple commercial project selector that queries a `commercial_projects` table.

**Status**: Not imported anywhere in the codebase.

**Reason to Keep**: May be an earlier version replaced by `CommercialProjectBitrixSelector`. Could be useful for future non-Bitrix integrations.

**Recommendation**: Consider removing if `commercial_projects` table is also unused, or if it's confirmed this selector is obsolete.

### 2. `HotkeyListener.tsx`
**Location**: `src/components/HotkeyListener.tsx`

**Description**: A hotkey listener component for keyboard shortcuts on buttons.

**Status**: Not imported anywhere in the codebase.

**Reason to Keep**: May have been planned for keyboard shortcuts feature that wasn't completed. Could be useful for future accessibility improvements.

**Recommendation**: Consider removing if keyboard shortcuts are not a planned feature, or implement if they are desired.

## Code Quality Improvements

### ESLint Warnings
Current status: 233 ESLint issues (mostly TypeScript `any` types and style issues)

**Impact**: Low - mainly code style and type safety improvements

**Recommendation**: Address gradually during feature development to improve code quality.

### Build Warnings
- Large bundle size (1.5MB after minification)
- Dynamic import warnings for Supabase client

**Impact**: Low - site loads fine, but could be optimized

**Recommendation**: Consider code splitting for better initial load performance.

## Documentation Structure

✅ **Complete** - Documentation reorganized on October 17, 2025:
- Main documentation hub: `docs/README.md`
- Features: `docs/features/`
- Guides: `docs/guides/`
- Historical docs: `docs/archived/`

## Testing

✅ **Current Status**: All 211 tests passing

**Test Coverage Areas**:
- Authentication flow
- User management
- Flow Builder v2
- Chatwoot integration
- Step runners and validators

**Recommendation**: Maintain test coverage as features are added.

## Dependencies

**Current Package Issues**:
- date-fns version conflict with react-day-picker (resolved with --legacy-peer-deps)

**Recommendation**: Monitor for updates to react-day-picker that support date-fns v4.

---

## Review Schedule

This document should be reviewed:
- Before major refactoring efforts
- When adding new features that might replace old code
- During quarterly code cleanup sprints
- When removing deprecated features

## Contributing to This Document

When you identify unused code or maintenance opportunities:
1. Add them to the appropriate section above
2. Include reasoning for keeping or removing
3. Update the "Last Updated" date
4. Consider opening an issue for tracking if it's a significant item
