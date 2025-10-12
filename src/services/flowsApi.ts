// ============================================
// Flows API Service - Edge Functions Integration
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type { Flow, CreateFlowRequest, ExecuteFlowRequest, ExecuteFlowResponse } from "@/types/flow";

/**
 * Create a new flow
 */
export async function createFlow(flow: CreateFlowRequest): Promise<{ data: Flow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('flows-api', {
      body: flow,
      method: 'POST'
    });

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to create flow') };
    }

    return { data: data as Flow, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing flow
 */
export async function updateFlow(flowId: string, flow: Partial<CreateFlowRequest>): Promise<{ data: Flow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(`flows-api/${flowId}`, {
      body: flow,
      method: 'PUT'
    });

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to update flow') };
    }

    return { data: data as Flow, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Execute a flow
 */
export async function executeFlow(payload: ExecuteFlowRequest | { flow: Flow; leadId?: number }): Promise<{ data: ExecuteFlowResponse | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('flows-executor', {
      body: payload
    });

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to execute flow') };
    }

    return { data: data as ExecuteFlowResponse, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
