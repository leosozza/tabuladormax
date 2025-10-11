# Dashboard Filter System

## Overview
The dashboard now includes a powerful filter system that allows users to view statistics filtered by date and operator (for admins).

## Features

### Date Filtering
The date filter supports four modes:

1. **Hoje (Today)** - Shows statistics for the current day only (default)
2. **Esta Semana (This Week)** - Shows statistics from Sunday to today
3. **Este Mês (This Month)** - Shows statistics from the 1st of the month to today
4. **Personalizado (Custom)** - Allows selecting a specific date range

#### Using Custom Date Range
1. Select "Personalizado" from the date filter dropdown
2. Click on the date button that appears
3. Select start date and end date from the calendar
4. Click "Aplicar" to apply the filter

### Operator Filtering (Admin Only)
Administrators can filter statistics by operator:
- Select an operator from the dropdown to see only their statistics
- Select "Todos os operadores" to see combined statistics

### Clickable Statistics Panels
All action statistics panels are now interactive:
1. Click on any statistics card (e.g., "Agendado", "Finalizado")
2. A modal opens showing all leads associated with that action
3. The modal displays:
   - Lead ID
   - Name and photo
   - Age
   - Address
   - Responsible person
   - Last action timestamp
4. Use pagination controls at the bottom to navigate through multiple pages
5. Close the modal by clicking the X or clicking outside

### Filter Interactions
- All filters work together - date and operator filters are applied simultaneously
- Statistics panels show counts based on the current filters
- Clicking a panel shows only leads matching both the action AND the current filters
- Use "Limpar Filtros" button to reset all filters to defaults

## Technical Details

### Components
- `DateFilterSelector` - Reusable date filter component
- `LeadsListModal` - Modal for displaying filtered leads with pagination

### Data Flow
1. Filters update state in Dashboard component
2. `loadActionStats()` is called with current filter values
3. Database queries use date range and operator filters
4. When a panel is clicked, `loadLeadsByStatus()` fetches detailed lead information
5. Modal displays paginated results

### Database Queries
- Filters use `actions_log.created_at` for date filtering
- Operator filter joins with `leads.responsible`
- All queries respect admin vs. agent permissions
