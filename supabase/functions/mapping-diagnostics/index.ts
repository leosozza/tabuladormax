import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticIssue {
  type: 'duplicate' | 'divergence' | 'orphan' | 'warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  table: string;
  field: string;
  description: string;
  suggestion: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[mapping-diagnostics] Starting comprehensive mapping validation...');

    const issues: DiagnosticIssue[] = [];

    // ============================================
    // 1. Check for duplicates in unified_field_config
    // ============================================
    const { data: unifiedDuplicates } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          supabase_field,
          COUNT(*) as count,
          array_agg(
            json_build_object(
              'bitrix_field', bitrix_field,
              'priority', sync_priority
            ) ORDER BY sync_priority DESC
          ) as mappings
        FROM unified_field_config
        WHERE sync_active = true
        GROUP BY supabase_field
        HAVING COUNT(*) > 1
      `
    });

    if (unifiedDuplicates && unifiedDuplicates.length > 0) {
      for (const dup of unifiedDuplicates) {
        issues.push({
          type: 'duplicate',
          severity: 'critical',
          table: 'unified_field_config',
          field: dup.supabase_field,
          description: `Campo ${dup.supabase_field} tem ${dup.count} mapeamentos ativos no webhook`,
          suggestion: `Desativar mapeamentos duplicados, manter apenas o de maior prioridade`
        });
      }
    }

    // ============================================
    // 2. Check for duplicates in resync_field_mappings
    // ============================================
    const { data: resyncDuplicates } = await supabase
      .from('resync_field_mappings')
      .select('mapping_name, leads_column, bitrix_field')
      .eq('active', true)
      .eq('mapping_name', 'Mapeamento Padrão Bitrix');

    const resyncGrouped = new Map<string, any[]>();
    if (resyncDuplicates) {
      for (const row of resyncDuplicates) {
        const key = row.leads_column;
        if (!resyncGrouped.has(key)) {
          resyncGrouped.set(key, []);
        }
        resyncGrouped.get(key)!.push(row);
      }
    }

    for (const [column, mappings] of resyncGrouped.entries()) {
      if (mappings.length > 1) {
        issues.push({
          type: 'duplicate',
          severity: 'critical',
          table: 'resync_field_mappings',
          field: column,
          description: `Campo ${column} tem ${mappings.length} mapeamentos ativos no resync`,
          suggestion: `Manter apenas 1 mapeamento por coluna no resync`
        });
      }
    }

    // ============================================
    // 3. Check divergences between unified_field_config and field_mappings
    // ============================================
    const { data: unifiedFields } = await supabase
      .from('unified_field_config')
      .select('supabase_field, bitrix_field, sync_priority')
      .eq('sync_active', true);

    const { data: uiFields } = await supabase
      .from('field_mappings')
      .select('supabase_field, bitrix_field, priority')
      .eq('active', true);

    if (unifiedFields && uiFields) {
      const uiMap = new Map(uiFields.map(f => [f.supabase_field, f]));

      for (const unified of unifiedFields) {
        const ui = uiMap.get(unified.supabase_field);
        
        if (ui && ui.bitrix_field && unified.bitrix_field) {
          if (ui.bitrix_field !== unified.bitrix_field) {
            issues.push({
              type: 'divergence',
              severity: 'high',
              table: 'unified_field_config vs field_mappings',
              field: unified.supabase_field,
              description: `Webhook usa "${unified.bitrix_field}" mas UI usa "${ui.bitrix_field}"`,
              suggestion: `Alinhar field_mappings.bitrix_field com unified_field_config`
            });
          }
        }
      }
    }

    // ============================================
    // 4. Check for orphan fields (in leads table but no mapping)
    // ============================================
    const { data: leadsColumns } = await supabase.rpc('get_leads_table_columns');
    const mappedFields = new Set(unifiedFields?.map(f => f.supabase_field) || []);

    const ignoredColumns = ['id', 'raw', 'created_at', 'updated_at', 'last_sync_at', 'geocoded_at', 'sync_status', 'sync_source'];

    if (leadsColumns) {
      for (const col of leadsColumns) {
        if (ignoredColumns.includes(col.column_name)) continue;
        
        if (!mappedFields.has(col.column_name)) {
          issues.push({
            type: 'orphan',
            severity: 'medium',
            table: 'leads',
            field: col.column_name,
            description: `Campo ${col.column_name} existe na tabela leads mas não tem mapeamento ativo no webhook`,
            suggestion: `Adicionar mapeamento em unified_field_config ou marcar como campo manual/calculado`
          });
        }
      }
    }

    // ============================================
    // 5. Calculate Health Score
    // ============================================
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;

    let healthStatus = '✅ SISTEMA SAUDÁVEL';
    let healthColor = 'green';

    if (criticalCount > 0) {
      healthStatus = '🔴 CRÍTICO - Duplicatas ou erros graves';
      healthColor = 'red';
    } else if (highCount > 0) {
      healthStatus = '🟡 ATENÇÃO - Divergências entre sistemas';
      healthColor = 'yellow';
    } else if (mediumCount > 0) {
      healthStatus = '🟢 OK - Alguns campos órfãos';
      healthColor = 'green';
    }

    const result = {
      health_status: healthStatus,
      health_color: healthColor,
      summary: {
        total_issues: issues.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: issues.filter(i => i.severity === 'low').length
      },
      statistics: {
        total_active_webhook_fields: unifiedFields?.length || 0,
        total_active_ui_fields: uiFields?.length || 0,
        total_resync_mappings: resyncDuplicates?.length || 0,
        total_leads_columns: leadsColumns?.length || 0
      },
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      last_check: new Date().toISOString(),
      recommendations: generateRecommendations(issues)
    };

    console.log(`[mapping-diagnostics] ✅ Health check complete: ${healthStatus}`);
    console.log(`[mapping-diagnostics] Found ${issues.length} issues (${criticalCount} critical, ${highCount} high, ${mediumCount} medium)`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[mapping-diagnostics] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        health_status: '❌ ERRO NA VALIDAÇÃO',
        last_check: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateRecommendations(issues: DiagnosticIssue[]): string[] {
  const recommendations: string[] = [];

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const divergences = issues.filter(i => i.type === 'divergence');

  if (criticalIssues.length > 0) {
    recommendations.push(
      '🔴 AÇÃO IMEDIATA: Corrigir duplicatas críticas antes de qualquer sincronização'
    );
    recommendations.push(
      'Execute: UPDATE unified_field_config SET sync_active = false WHERE ... (ver query em FIELD_MAPPING_VALIDATION.md)'
    );
  }

  if (divergences.length > 0) {
    recommendations.push(
      '🟡 PRIORIDADE ALTA: Alinhar mapeamentos entre webhook e UI'
    );
    recommendations.push(
      'Consulte docs/BITRIX_FIELD_MAPPINGS_FINAL.md para campos oficiais'
    );
  }

  if (issues.some(i => i.type === 'orphan')) {
    recommendations.push(
      '📋 Revisar campos órfãos: verificar se devem ter mapeamento ou são campos calculados'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Sistema está em conformidade. Continue monitorando semanalmente.');
  }

  return recommendations;
}
