// ============================================
// N8N MCP Proxy - Proxy for n8n MCP operations
// ============================================
// This edge function acts as a proxy to interact with n8n via MCP tools

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MCPWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerType?: string;
  active?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface MCPWorkflowDetails {
  id: string;
  name: string;
  description?: string;
  triggerType?: string;
  triggerDetails?: {
    type: string;
    inputSchema?: Record<string, any>;
  };
  nodes?: any[];
  active?: boolean;
  tags?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, workflowId, search, inputs } = body;

    console.log('🔌 N8N MCP Proxy:', { action, workflowId, search, userId: user.id });

    switch (action) {
      case 'list-workflows': {
        // Use MCP to list workflows
        // The MCP tool search_workflows is available to the Lovable agent
        // For the edge function, we'll simulate the response based on MCP data
        
        // In a real implementation, this would call the MCP server directly
        // For now, we return mock data that matches the n8n MCP structure
        const workflows = await fetchWorkflowsFromMCP(search);
        
        return new Response(
          JSON.stringify({ workflows }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-workflow-details': {
        if (!workflowId) {
          return new Response(
            JSON.stringify({ error: 'workflowId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const details = await fetchWorkflowDetailsFromMCP(workflowId);
        
        return new Response(
          JSON.stringify({ workflow: details }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute-workflow': {
        if (!workflowId) {
          return new Response(
            JSON.stringify({ error: 'workflowId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await executeWorkflowViaMCP(workflowId, inputs);
        
        return new Response(
          JSON.stringify({ result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ N8N MCP Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions to interact with n8n MCP
// These would typically call the MCP server directly or use stored configuration

async function fetchWorkflowsFromMCP(search?: string): Promise<MCPWorkflow[]> {
  // Get MCP configuration
  const n8nMcpUrl = Deno.env.get('N8N_MCP_URL');
  
  if (!n8nMcpUrl) {
    console.log('⚠️ N8N_MCP_URL not configured, returning empty list');
    // Return empty array if MCP not configured
    return [];
  }

  try {
    // Call n8n MCP endpoint to list workflows
    const response = await fetch(`${n8nMcpUrl}/workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Error fetching workflows from MCP:', response.status);
      return [];
    }

    const data = await response.json();
    let workflows: MCPWorkflow[] = data.workflows || data || [];

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      workflows = workflows.filter(w => 
        w.name.toLowerCase().includes(searchLower) ||
        w.description?.toLowerCase().includes(searchLower)
      );
    }

    return workflows;
  } catch (err) {
    console.error('Error connecting to n8n MCP:', err);
    return [];
  }
}

async function fetchWorkflowDetailsFromMCP(workflowId: string): Promise<MCPWorkflowDetails | null> {
  const n8nMcpUrl = Deno.env.get('N8N_MCP_URL');
  
  if (!n8nMcpUrl) {
    return null;
  }

  try {
    const response = await fetch(`${n8nMcpUrl}/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Error fetching workflow details from MCP:', response.status);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Error fetching workflow details:', err);
    return null;
  }
}

async function executeWorkflowViaMCP(workflowId: string, inputs?: Record<string, any>): Promise<any> {
  const n8nMcpUrl = Deno.env.get('N8N_MCP_URL');
  
  if (!n8nMcpUrl) {
    throw new Error('N8N_MCP_URL not configured');
  }

  try {
    const response = await fetch(`${n8nMcpUrl}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: inputs || {} })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workflow execution failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error executing workflow:', err);
    throw err;
  }
}
