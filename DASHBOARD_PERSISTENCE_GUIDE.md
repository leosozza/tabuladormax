# Dashboard Persistence System - Complete Documentation

## Overview

The Dashboard Persistence System is a comprehensive solution for creating, managing, and persisting custom dashboards with dynamic widgets. It provides a visual query builder, multiple chart types, drag-and-drop layout management, and user-specific data persistence.

## Architecture

### Database Schema

The system uses two main tables:

#### `dashboard_configs`
Stores dashboard metadata and configuration:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to auth.users
- `name` (TEXT): Dashboard name
- `description` (TEXT): Optional description
- `is_default` (BOOLEAN): Whether this is the user's default dashboard
- `theme` (JSONB): Theme configuration
- `layout` (JSONB): Grid layout settings
- `auto_refresh` (BOOLEAN): Enable/disable auto-refresh
- `refresh_interval` (INTEGER): Refresh interval in milliseconds
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

#### `dashboard_widgets`
Stores individual widget configurations:
- `id` (UUID): Primary key
- `dashboard_id` (UUID): Foreign key to dashboard_configs
- `widget_config` (JSONB): Complete widget configuration
- `position` (INTEGER): Order position in dashboard
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### Security

**Row Level Security (RLS)** is enabled on both tables with policies ensuring:
- Users can only view their own dashboards
- Users can only create, update, and delete their own dashboards
- Widget access is controlled through dashboard ownership

### React Query Integration

The system uses `@tanstack/react-query` for:
- **Caching**: Automatic caching of dashboard and widget data
- **Optimistic Updates**: UI updates immediately before server confirmation
- **Automatic Refetching**: Keeps data fresh across components
- **Request Deduplication**: Prevents redundant API calls

## Components

### 1. DashboardManager (Page)
**Location**: `src/pages/DashboardManager.tsx`

Main dashboard management interface providing:
- Dashboard CRUD operations
- Widget management
- Dashboard selection
- Integration with QueryBuilder

**Features:**
- Create new dashboards
- Select active dashboard
- Add/edit/delete widgets
- Delete dashboards with confirmation
- Drag-and-drop widget reordering

### 2. QueryBuilder
**Location**: `src/components/dashboard/QueryBuilder.tsx`

Visual interface for creating and configuring widgets without code.

**Tabs:**
1. **Básico**: Title, subtitle, chart type
2. **Dados**: Dimension, metrics, date grouping
3. **Filtros**: Date range filters
4. **Avançado**: Sorting, limits, ordering

**Supported Dimensions:**
- Scouter
- Projeto
- Data (with grouping: day, week, month, quarter, year)
- Supervisor
- Localização
- Etapa
- Tabulação
- Status de Confirmação

**Supported Metrics:**
- Count Distinct ID
- Count All
- Sum/Avg Valor Ficha
- Count Com Foto
- Count Confirmadas
- Count Agendadas
- Count Compareceu
- Percentages (% Com Foto, % Confirmadas, % Comparecimento)

### 3. DynamicWidget
**Location**: `src/components/dashboard/DynamicWidget.tsx`

Renders widgets based on their configuration using React Query for data fetching.

**Supported Chart Types:**
1. **Bar Chart**: Horizontal/vertical bars
2. **Line Chart**: Time series or trends
3. **Area Chart**: Filled line charts
4. **Pie Chart**: Circular distribution
5. **Donut Chart**: Hollow pie chart
6. **Gauge**: Progress/KPI indicator
7. **Heatmap**: Density visualization
8. **Treemap**: Hierarchical data
9. **KPI Card**: Large number display
10. **Table**: Data table
11. **Pivot Table**: Dynamic cross-tabulation
12. **Radar**: Multi-metric comparison
13. **Funnel**: Conversion visualization

### 4. DraggableGridLayout
**Location**: `src/components/dashboard/DraggableGridLayout.tsx`

Grid system with drag-and-drop support using `@dnd-kit`.

**Features:**
- Drag-and-drop widget reordering
- Responsive grid (12 columns)
- Custom widget sizing
- Editable/view-only modes
- Order persistence

### 5. Chart Components

#### ApexGaugeChart
**Location**: `src/components/dashboard/charts/ApexGaugeChart.tsx`

Radial gauge for displaying progress or KPIs.

**Props:**
- `title`: Chart title
- `value`: Current value
- `max`, `min`: Value range
- `colors`: Color scheme
- `unit`: Display unit

#### ApexHeatmapChart
**Location**: `src/components/dashboard/charts/ApexHeatmapChart.tsx`

Heatmap for density and pattern visualization.

**Props:**
- `title`: Chart title
- `series`: Data series with x/y coordinates
- `colorScale`: Custom color ranges

#### ApexTreemapChart
**Location**: `src/components/dashboard/charts/ApexTreemapChart.tsx`

Treemap for hierarchical data visualization.

**Props:**
- `title`: Chart title
- `series`: Hierarchical data
- `distributed`: Enable color distribution

#### PivotTable
**Location**: `src/components/dashboard/charts/PivotTable.tsx`

Interactive pivot table with dynamic grouping.

**Features:**
- Row and column dimension selection
- Multiple aggregation types (sum, avg, count, min, max)
- Automatic total calculations
- Interactive UI controls

## Hooks

### useDashboard
**Location**: `src/hooks/useDashboard.ts`

Primary hook for dashboard management.

**Returns:**
```typescript
{
  dashboards: DashboardConfig[];
  isLoading: boolean;
  getDashboard: (id: string) => Promise<DashboardConfig | null>;
  createDashboard: (config) => void;
  updateDashboard: (id, config) => void;
  deleteDashboard: (id: string) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}
```

**Features:**
- Automatic user authentication
- Optimistic updates
- Error handling with toast notifications
- React Query integration

## Services

### dashboardQueryService
**Location**: `src/services/dashboardQueryService.ts`

Executes dynamic queries based on widget configuration.

**Main Functions:**

#### `executeDashboardQuery(widget: DashboardWidget)`
Executes query and returns processed metrics.

**Process:**
1. Build Supabase query with filters
2. Fetch data from leads table
3. Group by dimension
4. Calculate metrics
5. Sort and limit results

#### `processMetrics(data, widget)`
Groups data and calculates metrics.

#### `groupByDimension(data, dimension, dateGrouping)`
Groups data by specified dimension.

#### `calculateMetric(rows, metric)`
Calculates individual metric values.

## Usage Examples

### Creating a Dashboard

```typescript
import { useDashboard } from '@/hooks/useDashboard';

function MyComponent() {
  const { createDashboard } = useDashboard();

  const handleCreate = () => {
    createDashboard({
      name: 'Sales Dashboard',
      description: 'Monthly sales metrics',
      widgets: [],
      is_default: false,
    });
  };

  return <button onClick={handleCreate}>Create Dashboard</button>;
}
```

### Adding a Widget

```typescript
const widget: DashboardWidget = {
  id: 'unique-id',
  title: 'Leads by Scouter',
  dimension: 'scouter',
  metrics: ['count_distinct_id', 'avg_valor_ficha'],
  chartType: 'bar',
  sortBy: 'count_distinct_id',
  sortOrder: 'desc',
  limit: 10,
};

updateDashboard({
  id: dashboardId,
  config: { widgets: [...existingWidgets, widget] },
});
```

### Using DynamicWidget

```typescript
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';

<DynamicWidget
  config={widgetConfig}
  onEdit={(widget) => console.log('Edit', widget)}
  onDelete={(id) => console.log('Delete', id)}
/>
```

### Implementing Drag-and-Drop

```typescript
import { DraggableGridLayout } from '@/components/dashboard/DraggableGridLayout';

const widgets = [
  {
    id: '1',
    title: 'Widget 1',
    component: <MyWidget />,
    size: { cols: 6, rows: 4 },
  },
];

<DraggableGridLayout
  widgets={widgets}
  onReorder={(reordered) => saveOrder(reordered)}
  editable={true}
/>
```

## Performance Optimization

### Query Optimization
- Queries are filtered at database level
- Aggregations happen in memory after fetch
- Limit clause reduces data transfer
- Indexes on user_id and dashboard_id

### Caching Strategy
- React Query caches by `['dashboards']` key
- Individual widgets cached by `['dashboard-widget', id, config]`
- Automatic cache invalidation on mutations
- Stale time configurable per query

### Optimistic Updates
Updates UI immediately before server confirmation:
```typescript
onMutate: async ({ id, config }) => {
  await queryClient.cancelQueries(['dashboards']);
  const previous = queryClient.getQueryData(['dashboards']);
  
  queryClient.setQueryData(['dashboards'], (old) => 
    old.map(d => d.id === id ? { ...d, ...config } : d)
  );
  
  return { previous };
}
```

## Testing

### Unit Tests
Located in `src/__tests__/`:
- `hooks/useDashboard.test.tsx`: Hook functionality
- `components/QueryBuilder.test.tsx`: UI interactions

### Running Tests
```bash
npm test                 # Run all tests
npm run test:ui          # Interactive test UI
npm run test:coverage    # Coverage report
```

## Migration

The database migration is located at:
`supabase/migrations/20251025_dashboard_persistence.sql`

**Includes:**
- Table creation
- Index creation
- RLS policies
- Triggers for timestamps
- Single default dashboard constraint

## Security Considerations

### RLS Policies
✅ Users can only access their own dashboards  
✅ Cascade delete removes widgets automatically  
✅ Single default dashboard per user enforced  

### Input Validation
✅ Widget configs validated before save  
✅ User authentication required  
✅ SQL injection prevented via Supabase client  

### Data Privacy
✅ User data isolated by user_id  
✅ No cross-user data leakage  
✅ Audit trail via timestamps  

## Troubleshooting

### Common Issues

**Issue**: Dashboards not loading  
**Solution**: Check user authentication, verify RLS policies

**Issue**: Widget not updating  
**Solution**: Check React Query devtools, verify mutation success

**Issue**: Drag-and-drop not working  
**Solution**: Ensure `editable={true}` prop set, check @dnd-kit installation

**Issue**: Charts not rendering  
**Solution**: Verify data format, check console for errors, ensure ApexCharts loaded

## Future Enhancements

- [ ] Dashboard templates
- [ ] Dashboard sharing between users
- [ ] Export dashboard as PDF/PNG
- [ ] Real-time collaboration
- [ ] Advanced filter UI (project, scouter selection)
- [ ] Widget resize capability
- [ ] Custom formulas in QueryBuilder
- [ ] Scheduled dashboard emails

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check React Query devtools
4. Review Supabase logs
5. Create GitHub issue

## License

This feature is part of TabuladorMax and follows the project license.
