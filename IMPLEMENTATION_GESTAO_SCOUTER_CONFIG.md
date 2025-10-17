# Implementation Guide - Gestão Scouter Config

This guide provides practical implementation examples for integrating the `gestao_scouter_config` table into your TabuladorMax application.

## Table of Contents
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Sync Service Implementation](#sync-service-implementation)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Backend Implementation

### Database Functions

#### Get Active Configuration
Create a PostgreSQL function for easy config retrieval:

```sql
-- Function to get active configuration
CREATE OR REPLACE FUNCTION get_active_gestao_scouter_config()
RETURNS TABLE (
  id INTEGER,
  project_url TEXT,
  anon_key TEXT,
  sync_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gsc.id,
    gsc.project_url,
    gsc.anon_key,
    gsc.sync_enabled
  FROM public.gestao_scouter_config gsc
  WHERE gsc.active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Usage:
```sql
SELECT * FROM get_active_gestao_scouter_config();
```

### Supabase Edge Functions

#### Configuration Service Edge Function

Create: `supabase/functions/gestao-scouter-config/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get active configuration
    const { data: config, error } = await supabaseClient
      .from('gestao_scouter_config')
      .select('*')
      .eq('active', true)
      .single()

    if (error) {
      throw error
    }

    if (!config) {
      return new Response(
        JSON.stringify({ error: 'No active configuration found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ config }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

## Frontend Implementation

### React Hook for Configuration

Create: `src/hooks/useGestaoScouterConfig.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GestaoScouterConfig {
  id: number;
  project_url: string;
  anon_key: string;
  active: boolean;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useGestaoScouterConfig() {
  return useQuery({
    queryKey: ['gestao-scouter-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_scouter_config')
        .select('*')
        .eq('active', true)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No active configuration found');

      return data as GestaoScouterConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
}
```

Usage in a component:

```typescript
import { useGestaoScouterConfig } from '@/hooks/useGestaoScouterConfig';

function GestaoScouterStatus() {
  const { data: config, isLoading, error } = useGestaoScouterConfig();

  if (isLoading) return <div>Loading configuration...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!config) return <div>No configuration found</div>;

  return (
    <div>
      <h3>Gestão Scouter Configuration</h3>
      <p>Project: {config.project_url}</p>
      <p>Sync: {config.sync_enabled ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
}
```

### Configuration Management Component

Create: `src/components/GestaoScouterConfigManager.tsx`

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGestaoScouterConfig } from '@/hooks/useGestaoScouterConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function GestaoScouterConfigManager() {
  const { data: config, isLoading } = useGestaoScouterConfig();
  const queryClient = useQueryClient();

  const [projectUrl, setProjectUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<GestaoScouterConfig>) => {
      if (!config) throw new Error('No config to update');

      const { data, error } = await supabase
        .from('gestao_scouter_config')
        .update(updates)
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-scouter-config'] });
      toast.success('Configuration updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateConfig.mutate({
      project_url: projectUrl,
      anon_key: anonKey,
      sync_enabled: syncEnabled,
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4 p-4 border rounded">
      <h3 className="text-lg font-semibold">Gestão Scouter Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">Project URL</label>
        <Input
          value={projectUrl || config?.project_url || ''}
          onChange={(e) => setProjectUrl(e.target.value)}
          placeholder="https://your-project.supabase.co"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Anon Key</label>
        <Input
          type="password"
          value={anonKey || config?.anon_key || ''}
          onChange={(e) => setAnonKey(e.target.value)}
          placeholder="eyJ..."
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={syncEnabled || config?.sync_enabled || false}
          onCheckedChange={setSyncEnabled}
        />
        <label className="text-sm font-medium">Enable Sync</label>
      </div>

      <Button onClick={handleSave} disabled={updateConfig.isPending}>
        {updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
      </Button>
    </div>
  );
}
```

## Sync Service Implementation

### Gestão Scouter Client Factory

Create: `src/lib/gestao-scouter-client.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

let gestaoScouterClient: SupabaseClient | null = null;
let currentConfigId: number | null = null;

export async function getGestaoScouterClient(): Promise<SupabaseClient> {
  // Get active configuration
  const { data: config, error } = await supabase
    .from('gestao_scouter_config')
    .select('*')
    .eq('active', true)
    .eq('sync_enabled', true)
    .single();

  if (error || !config) {
    throw new Error('No active Gestão Scouter configuration found');
  }

  // Return cached client if config hasn't changed
  if (gestaoScouterClient && currentConfigId === config.id) {
    return gestaoScouterClient;
  }

  // Create new client
  gestaoScouterClient = createClient(config.project_url, config.anon_key);
  currentConfigId = config.id;

  return gestaoScouterClient;
}

export function invalidateGestaoScouterClient() {
  gestaoScouterClient = null;
  currentConfigId = null;
}
```

### Sync Handler

Create: `src/handlers/gestao-scouter-sync.ts`

```typescript
import { getGestaoScouterClient } from '@/lib/gestao-scouter-client';
import { supabase } from '@/integrations/supabase/client';

export async function syncToGestaoScouter(leadData: any) {
  try {
    // Get Gestão Scouter client
    const gestaoClient = await getGestaoScouterClient();

    // Transform lead data to ficha format
    const fichaData = {
      nome: leadData.name,
      telefone: leadData.phone,
      email: leadData.email,
      // ... other field mappings
    };

    // Insert into Gestão Scouter
    const { data, error } = await gestaoClient
      .from('fichas')
      .insert([fichaData])
      .select()
      .single();

    if (error) throw error;

    // Log sync event
    await supabase
      .from('sync_events')
      .insert({
        direction: 'supabase_to_gestao_scouter',
        entity_type: 'lead',
        entity_id: leadData.id,
        status: 'success',
        details: { ficha_id: data.id },
      });

    return { success: true, data };
  } catch (error) {
    // Log sync error
    await supabase
      .from('sync_events')
      .insert({
        direction: 'supabase_to_gestao_scouter',
        entity_type: 'lead',
        entity_id: leadData.id,
        status: 'error',
        error_message: error.message,
      });

    throw error;
  }
}

export async function syncFromGestaoScouter() {
  try {
    const gestaoClient = await getGestaoScouterClient();

    // Fetch new fichas
    const { data: fichas, error } = await gestaoClient
      .from('fichas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Process each ficha
    for (const ficha of fichas) {
      // Transform ficha to lead format
      const leadData = {
        name: ficha.nome,
        phone: ficha.telefone,
        email: ficha.email,
        sync_source: 'gestao_scouter',
        // ... other field mappings
      };

      // Insert or update lead
      const { error: insertError } = await supabase
        .from('leads')
        .upsert([leadData], { onConflict: 'phone' });

      if (insertError) {
        console.error('Failed to sync ficha:', ficha.id, insertError);
      }
    }

    return { success: true, count: fichas.length };
  } catch (error) {
    console.error('Sync from Gestão Scouter failed:', error);
    throw error;
  }
}
```

## Testing

### Unit Tests

Create: `src/tests/gestao-scouter-config.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Gestão Scouter Configuration', () => {
  beforeEach(async () => {
    // Clean up test data
    await supabase.from('gestao_scouter_config').delete().neq('id', 0);
  });

  it('should create a new configuration', async () => {
    const { data, error } = await supabase
      .from('gestao_scouter_config')
      .insert({
        project_url: 'https://test.supabase.co',
        anon_key: 'test-key',
        active: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.project_url).toBe('https://test.supabase.co');
  });

  it('should enforce URL format', async () => {
    const { error } = await supabase
      .from('gestao_scouter_config')
      .insert({
        project_url: 'invalid-url',
        anon_key: 'test-key',
      });

    expect(error).toBeDefined();
    expect(error?.message).toContain('project_url_format_check');
  });

  it('should only allow one active configuration', async () => {
    // Create first active config
    await supabase
      .from('gestao_scouter_config')
      .insert({
        project_url: 'https://first.supabase.co',
        anon_key: 'key1',
        active: true,
      });

    // Create second active config
    await supabase
      .from('gestao_scouter_config')
      .insert({
        project_url: 'https://second.supabase.co',
        anon_key: 'key2',
        active: true,
      });

    // Query active configs
    const { data } = await supabase
      .from('gestao_scouter_config')
      .select('*')
      .eq('active', true);

    expect(data).toHaveLength(1);
    expect(data?.[0]?.project_url).toBe('https://second.supabase.co');
  });
});
```

### Integration Tests

Create: `src/tests/gestao-scouter-sync.integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getGestaoScouterClient } from '@/lib/gestao-scouter-client';
import { syncToGestaoScouter } from '@/handlers/gestao-scouter-sync';

describe('Gestão Scouter Sync Integration', () => {
  it('should get client with active configuration', async () => {
    const client = await getGestaoScouterClient();
    expect(client).toBeDefined();
  });

  it('should sync lead to Gestão Scouter', async () => {
    const leadData = {
      id: 1,
      name: 'Test Lead',
      phone: '1234567890',
      email: 'test@example.com',
    };

    const result = await syncToGestaoScouter(leadData);
    expect(result.success).toBe(true);
  });
});
```

## Error Handling

### Configuration Errors

```typescript
export class GestaoScouterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GestaoScouterConfigError';
  }
}

export async function validateConfiguration(config: GestaoScouterConfig): Promise<boolean> {
  // Validate URL format
  const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
  if (!urlPattern.test(config.project_url)) {
    throw new GestaoScouterConfigError('Invalid project URL format');
  }

  // Validate anon key
  if (!config.anon_key || config.anon_key.length < 20) {
    throw new GestaoScouterConfigError('Invalid anon key');
  }

  // Test connection
  try {
    const client = createClient(config.project_url, config.anon_key);
    const { error } = await client.from('fichas').select('count').limit(1);
    
    if (error) {
      throw new GestaoScouterConfigError(`Connection test failed: ${error.message}`);
    }
  } catch (error) {
    throw new GestaoScouterConfigError(`Connection test failed: ${error.message}`);
  }

  return true;
}
```

## Best Practices

### 1. Configuration Caching

```typescript
// Cache configuration with TTL
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedConfig: GestaoScouterConfig | null = null;
let cacheTimestamp = 0;

export async function getCachedConfig(): Promise<GestaoScouterConfig> {
  const now = Date.now();
  
  if (cachedConfig && (now - cacheTimestamp) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const { data, error } = await supabase
    .from('gestao_scouter_config')
    .select('*')
    .eq('active', true)
    .single();

  if (error || !data) {
    throw new Error('No active configuration found');
  }

  cachedConfig = data;
  cacheTimestamp = now;

  return cachedConfig;
}
```

### 2. Graceful Degradation

```typescript
export async function syncWithFallback(leadData: any) {
  try {
    return await syncToGestaoScouter(leadData);
  } catch (error) {
    console.error('Sync failed, adding to retry queue:', error);
    
    // Add to retry queue
    await supabase.from('sync_retry_queue').insert({
      entity_type: 'lead',
      entity_id: leadData.id,
      direction: 'supabase_to_gestao_scouter',
      retry_count: 0,
    });

    // Don't throw - allow operation to continue
    return { success: false, queued: true };
  }
}
```

### 3. Monitoring

```typescript
export async function monitorSyncHealth() {
  const { data: config } = await supabase
    .from('gestao_scouter_config')
    .select('*')
    .eq('active', true)
    .single();

  if (!config || !config.sync_enabled) {
    return { status: 'disabled' };
  }

  // Check recent sync events
  const { data: recentEvents } = await supabase
    .from('sync_events')
    .select('status')
    .in('direction', ['supabase_to_gestao_scouter', 'gestao_scouter_to_supabase'])
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  const successCount = recentEvents?.filter(e => e.status === 'success').length || 0;
  const errorCount = recentEvents?.filter(e => e.status === 'error').length || 0;

  return {
    status: 'enabled',
    recentSuccess: successCount,
    recentErrors: errorCount,
    healthScore: successCount / (successCount + errorCount || 1),
  };
}
```

## Related Documentation

- [Table Setup Guide](./TABULADORMAX_CONFIG_TABLE_SETUP.md)
- [Quick Setup](./QUICK_SETUP_GESTAO_SCOUTER_CONFIG.md)
- [Architecture Overview](./GESTAO_SCOUTER_CONFIG_ARCHITECTURE.md)

---

**Implementation Level:** Intermediate  
**Prerequisites:** React, TypeScript, Supabase  
**Estimated Time:** 2-4 hours
