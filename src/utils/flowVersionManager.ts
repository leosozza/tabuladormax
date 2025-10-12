// ============================================
// Flow Version Manager - Version Control Utilities
// ============================================
// Utilities for managing flow versions

import { createClient } from '@supabase/supabase-js';
import type { FlowDefinition } from './flowSchemaValidator';
import { validateFlowDefinition } from './flowSchemaValidator';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Flow version record
 */
export interface FlowVersion {
  id: string;
  flow_id: string;
  version_number: number;
  nome: string;
  descricao?: string;
  definition: FlowDefinition;
  schema_version: string;
  is_active: boolean;
  criado_em: string;
  criado_por?: string;
  notas_versao?: string;
}

/**
 * Create a new version of a flow
 */
export async function createFlowVersion(
  flowId: string,
  nome: string,
  definition: FlowDefinition,
  options?: {
    descricao?: string;
    notas_versao?: string;
    schema_version?: string;
    activate?: boolean;
  }
): Promise<{ data: FlowVersion | null; error: any }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Validate definition
  const validation = validateFlowDefinition(definition, options?.schema_version as any || 'v1');
  if (!validation.valid) {
    return {
      data: null,
      error: {
        message: 'Invalid flow definition',
        details: validation.errors
      }
    };
  }

  // Get next version number
  const { data: nextVersionData, error: versionError } = await supabase
    .rpc('get_next_flow_version', { p_flow_id: flowId });

  if (versionError) {
    return { data: null, error: versionError };
  }

  const version_number = nextVersionData || 1;

  // Create new version
  const { data, error } = await supabase
    .from('flow_versions')
    .insert({
      flow_id: flowId,
      version_number,
      nome,
      descricao: options?.descricao,
      definition,
      schema_version: options?.schema_version || 'v1',
      is_active: options?.activate || false,
      notas_versao: options?.notas_versao
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // If activate flag is set, activate this version
  if (options?.activate && data) {
    const { error: activateError } = await activateVersion(data.id);
    if (activateError) {
      return { data: null, error: activateError };
    }
  }

  return { data, error: null };
}

/**
 * Get all versions of a flow
 */
export async function getFlowVersions(
  flowId: string
): Promise<{ data: FlowVersion[] | null; error: any }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('flow_versions')
    .select('*')
    .eq('flow_id', flowId)
    .order('version_number', { ascending: false });

  return { data, error };
}

/**
 * Get active version of a flow
 */
export async function getActiveVersion(
  flowId: string
): Promise<{ data: FlowVersion | null; error: any }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('flow_versions')
    .select('*')
    .eq('flow_id', flowId)
    .eq('is_active', true)
    .single();

  return { data, error };
}

/**
 * Get specific version of a flow
 */
export async function getFlowVersion(
  versionId: string
): Promise<{ data: FlowVersion | null; error: any }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('flow_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  return { data, error };
}

/**
 * Activate a specific version
 */
export async function activateVersion(
  versionId: string
): Promise<{ data: boolean | null; error: any }> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .rpc('activate_flow_version', { p_version_id: versionId });

  return { data, error };
}

/**
 * Compare two versions and return differences
 */
export function compareVersions(
  version1: FlowVersion,
  version2: FlowVersion
): {
  stepsAdded: number;
  stepsRemoved: number;
  stepsModified: number;
  changes: string[];
} {
  const steps1 = version1.definition.steps || [];
  const steps2 = version2.definition.steps || [];
  
  const changes: string[] = [];
  
  // Check for basic changes
  if (version1.nome !== version2.nome) {
    changes.push(`Nome changed: "${version1.nome}" → "${version2.nome}"`);
  }
  
  if (version1.descricao !== version2.descricao) {
    changes.push(`Descrição changed`);
  }
  
  // Calculate step differences
  const stepsAdded = Math.max(0, steps2.length - steps1.length);
  const stepsRemoved = Math.max(0, steps1.length - steps2.length);
  
  let stepsModified = 0;
  const minLength = Math.min(steps1.length, steps2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (JSON.stringify(steps1[i]) !== JSON.stringify(steps2[i])) {
      stepsModified++;
    }
  }
  
  if (stepsAdded > 0) {
    changes.push(`${stepsAdded} step(s) added`);
  }
  if (stepsRemoved > 0) {
    changes.push(`${stepsRemoved} step(s) removed`);
  }
  if (stepsModified > 0) {
    changes.push(`${stepsModified} step(s) modified`);
  }
  
  return {
    stepsAdded,
    stepsRemoved,
    stepsModified,
    changes
  };
}

/**
 * Get version history summary
 */
export async function getVersionHistory(
  flowId: string
): Promise<{
  data: Array<{
    version: FlowVersion;
    isActive: boolean;
    changesSincePrevious?: string[];
  }> | null;
  error: any;
}> {
  const { data: versions, error } = await getFlowVersions(flowId);
  
  if (error || !versions) {
    return { data: null, error };
  }
  
  const history = versions.map((version, index) => {
    const isActive = version.is_active;
    let changesSincePrevious: string[] | undefined;
    
    // Compare with previous version if exists
    if (index < versions.length - 1) {
      const previous = versions[index + 1];
      const comparison = compareVersions(previous, version);
      changesSincePrevious = comparison.changes;
    }
    
    return {
      version,
      isActive,
      changesSincePrevious
    };
  });
  
  return { data: history, error: null };
}
