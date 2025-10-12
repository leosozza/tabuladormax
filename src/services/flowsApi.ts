// ============================================
// Flows API Client - Edge Functions Integration
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type { Flow, CreateFlowRequest } from "@/types/flow";

/**
 * Create a new flow
 * POST /functions/v1/flows-api
 */
export async function createFlow(flowData: CreateFlowRequest): Promise<Flow> {
  const { data, error } = await supabase.functions.invoke('flows-api', {
    method: 'POST',
    body: flowData
  });

  if (error) {
    throw new Error(`Failed to create flow: ${error.message || String(error)}`);
  }

  return data.flow;
}

/**
 * Update an existing flow
 * PUT /functions/v1/flows-api/:id
 */
export async function updateFlow(flowId: string, flowData: Partial<CreateFlowRequest>): Promise<Flow> {
  const { data, error } = await supabase.functions.invoke(`flows-api/${flowId}`, {
    method: 'PUT',
    body: flowData
  });

  if (error) {
    throw new Error(`Failed to update flow: ${error.message || String(error)}`);
  }

  return data.flow;
}

/**
 * Execute a flow with optional lead context
 * POST /functions/v1/flows-executor
 * 
 * Can execute either by flowId (persisted) or by passing flow object (ephemeral)
 */
export async function executeFlow(params: {
  flowId?: string;
  flow?: Flow;
  leadId?: number;
  context?: Record<string, any>;
}): Promise<any> {
  const { flowId, flow, leadId, context } = params;

  const body: any = {
    leadId,
    context: context || {}
  };

  if (flowId) {
    body.flowId = flowId;
  } else if (flow) {
    body.flow = flow;
  } else {
    throw new Error("Either flowId or flow must be provided");
  }

  const { data, error } = await supabase.functions.invoke('flows-executor', {
    method: 'POST',
    body
  });

  if (error) {
    throw new Error(`Failed to execute flow: ${error.message || String(error)}`);
  }

  return data;
}
