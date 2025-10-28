# Field Mapping System - TabuladorMax Sync Center

## Overview

The Field Mapping System provides transparent visibility into which fields are being synchronized between Bitrix24 and Supabase. This system tracks, logs, and displays field mappings during bidirectional sync operations, making it easy for developers and administrators to understand and maintain the integration.

## Architecture

### Database Schema

#### sync_events Table

The `sync_events` table has been enhanced with the following new columns:

```sql
-- Field mapping details stored as JSONB
field_mappings JSONB

-- Count of fields synced in this operation
fields_synced_count INTEGER DEFAULT 0
```

The `field_mappings` column stores data in the following format:

```json
{
  "bitrix_to_supabase": [
    {
      "bitrix_field": "NAME",
      "tabuladormax_field": "name",
      "value": "John Doe",
      "transformed": false,
      "priority": 1
    },
    {
      "bitrix_field": "UF_IDADE",
      "tabuladormax_field": "age",
      "value": "25",
      "transformed": true,
      "transform_function": "toNumber",
      "priority": 1
    }
  ],
  "supabase_to_bitrix": [
    {
      "tabuladormax_field": "name",
      "bitrix_field": "NAME",
      "value": "John Doe",
      "transformed": false
    }
  ]
}
```

### Components

#### 1. Field Mapping Utilities (`src/lib/fieldMappingUtils.ts`)

Core utilities for creating, formatting, and analyzing field mappings:

- **`FieldMapping` interface**: Defines the structure of a field mapping
- **`SyncFieldMappings` interface**: Container for bidirectional mappings
- **`createBitrixToSupabaseMapping()`**: Creates a mapping record for Bitrix → Supabase
- **`createSupabaseToBitrixMapping()`**: Creates a mapping record for Supabase → Bitrix
- **`formatFieldMappingsForDisplay()`**: Formats mappings for UI display
- **`getFieldMappingSummary()`**: Calculates statistics about mappings
- **`groupFieldMappingsByDirection()`**: Groups mappings by sync direction

#### 2. Field Mapping Display Component (`src/components/sync/FieldMappingDisplay.tsx`)

React components for visualizing field mappings:

- **`FieldMappingDisplay`**: Main display component with compact and full modes
- **`FieldMappingCard`**: Card wrapper for field mapping display

Features:
- Shows field mappings with clear source → destination arrows
- Highlights transformed fields with a sparkles icon
- Displays value previews (truncated for long values)
- Provides summary statistics (total fields, transformed fields, by direction)

#### 3. Enhanced Sync Monitor (`src/pages/admin/SyncMonitor.tsx`)

Updated admin interface that:
- Lists all sync events
- Shows field count badges on each event
- Provides collapsible sections to view detailed field mappings
- Displays real-time sync statistics

### Edge Functions

#### bitrix-webhook Function

Updated to track field mappings during Bitrix → Supabase sync:

```typescript
// Track applied mappings
const appliedMappings: any[] = [];

// For each mapping, record what was applied
appliedMappings.push({
  bitrix_field: mapping.bitrix_field,
  tabuladormax_field: tabuladorField,
  value: value,
  transformed: !!mapping.transform_function,
  transform_function: mapping.transform_function,
  priority: mapping.priority
});

// Log to sync_events
await supabase.from('sync_events').insert({
  event_type: 'update',
  direction: 'bitrix_to_supabase',
  lead_id: parseInt(leadId),
  status: 'success',
  field_mappings: {
    bitrix_to_supabase: appliedMappings
  },
  fields_synced_count: appliedMappings.length
});
```

#### sync-to-bitrix Function

Updated to track field mappings during Supabase → Bitrix sync:

```typescript
// Track applied mappings
const appliedMappings: any[] = [];

// For each field mapped, track it
if (lead.name) {
  bitrixPayload.fields.NAME = lead.name;
  appliedMappings.push({
    tabuladormax_field: 'name',
    bitrix_field: 'NAME',
    value: lead.name,
    transformed: false
  });
}

// Log to sync_events
await supabase.from('sync_events').insert({
  event_type: 'update',
  direction: 'supabase_to_bitrix',
  lead_id: lead.id,
  status: 'success',
  field_mappings: {
    supabase_to_bitrix: appliedMappings
  },
  fields_synced_count: appliedMappings.length
});
```

## Usage

### Viewing Field Mappings in UI

1. Navigate to **Admin → Central de Sincronização**
2. Each sync event shows a badge with the number of fields synced
3. Click "Ver campos sincronizados" to expand and see detailed mapping information
4. The display shows:
   - Source field → Destination field
   - Value that was synced (truncated if long)
   - Transformation indicator (sparkles icon) if value was transformed
   - Summary by direction (Bitrix → Supabase / Supabase → Bitrix)

### Querying Field Mappings Programmatically

```typescript
// Get sync events with field mappings
const { data: syncEvents } = await supabase
  .from('sync_events')
  .select('*')
  .not('field_mappings', 'is', null)
  .order('created_at', { ascending: false });

// Analyze a specific sync event
import { getFieldMappingSummary } from '@/lib/fieldMappingUtils';

const summary = getFieldMappingSummary(syncEvent.field_mappings);
console.log(`Total: ${summary.totalFields}, Transformed: ${summary.transformedFields}`);
```

## Benefits

### 1. Transparency
- Clear visibility into which fields are being synced
- Easy identification of transformation rules being applied
- Real-time feedback on sync operations

### 2. Debugging
- Quickly identify missing or incorrect field mappings
- See actual values being synced
- Track down sync issues to specific fields

### 3. Maintenance
- Understand the impact of adding/removing field mappings
- Document which fields are actively being used
- Plan field mapping changes with confidence

### 4. Compliance & Auditing
- Complete history of which fields were synced when
- Traceable data flow between systems
- Support for compliance requirements

## Future Enhancements

Potential improvements to the field mapping system:

1. **Field Mapping Configuration UI**: Admin interface to manage field mappings without SQL
2. **Mapping Validation**: Pre-flight checks to validate mappings before sync
3. **Mapping Analytics**: Dashboard showing most-used fields, transformation success rates
4. **Conflict Detection**: Alert when multiple mappings could apply to the same field
5. **Mapping Templates**: Predefined mapping sets for common scenarios
6. **Field History**: Track changes to field values over time
7. **Custom Transformations**: UI for defining custom transformation functions

## Migration

To apply the field mapping enhancements to your Supabase instance:

```bash
# Run the migration
supabase db push

# Or manually execute:
psql $DATABASE_URL < supabase/migrations/20251027_add_field_mapping_to_sync_events.sql
```

## Testing

The field mapping utilities include comprehensive unit tests:

```bash
npm test src/__tests__/lib/fieldMappingUtils.test.ts
```

Tests cover:
- Creating mappings for both directions
- Formatting mappings for display
- Handling edge cases (null values, long strings, objects)
- Calculating summaries and statistics
- Grouping mappings by direction

## API Reference

### Types

```typescript
interface FieldMapping {
  bitrix_field: string;
  tabuladormax_field: string;
  value: unknown;
  transformed: boolean;
  transform_function?: string;
  priority?: number;
}

interface SyncFieldMappings {
  bitrix_to_supabase?: FieldMapping[];
  supabase_to_bitrix?: FieldMapping[];
}
```

### Functions

**`createBitrixToSupabaseMapping(bitrixField, tabuladorMaxField, value, transformFunction?, priority?)`**
- Creates a field mapping record for Bitrix → Supabase sync
- Returns: `FieldMapping`

**`createSupabaseToBitrixMapping(tabuladorMaxField, bitrixField, value)`**
- Creates a field mapping record for Supabase → Bitrix sync
- Returns: `FieldMapping`

**`formatFieldMappingsForDisplay(mappings)`**
- Formats field mappings for UI display
- Returns: Array of formatted mapping objects

**`getFieldMappingSummary(mappings)`**
- Calculates summary statistics about mappings
- Returns: `{ totalFields, transformedFields, bitrixToSupabaseCount, supabaseToBitrixCount }`

**`groupFieldMappingsByDirection(mappings)`**
- Groups field mappings by sync direction
- Returns: Array of `{ direction, mappings }` objects

## Troubleshooting

### Field mappings not showing in UI

1. Check that the migration has been applied to your database
2. Verify that `field_mappings` column exists in `sync_events` table
3. Ensure sync operations are happening after the update (old events won't have mappings)

### Missing fields in mappings

1. Check that the field is included in the edge function logic
2. Verify the field has a non-empty value (empty values are not tracked)
3. Check `bitrix_field_mappings` table for configured mappings

### Performance concerns with large mappings

1. The `field_mappings` column uses JSONB with GIN index for efficient queries
2. Consider archiving old sync events if performance degrades
3. Use `fields_synced_count` for quick statistics without parsing JSON

## Support

For questions or issues related to the field mapping system:
- Check the code comments in the relevant files
- Review test cases for usage examples
- Consult the main documentation in `/docs`
