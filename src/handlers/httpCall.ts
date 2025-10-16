// ============================================
// HTTP Call Handler - Reusable HTTP Request Logic
// ============================================

export interface HttpCallConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface HttpCallContext {
  leadId?: number;
  variables?: Record<string, unknown>;
}

export interface HttpCallResult {
  success: boolean;
  status: number;
  data?: unknown;
  error?: string;
  message: string;
}

/**
 * Replace placeholders in strings with context values
 */
const replacePlaceholders = (
  value: unknown,
  context: HttpCallContext
): unknown => {
  if (typeof value === 'string') {
    let result = value;
    
    // Replace lead_id
    if (context.leadId !== undefined) {
      result = result.replace(/\{\{lead_id\}\}/g, String(context.leadId));
    }
    
    // Replace any variables passed in context
    if (context.variables) {
      Object.entries(context.variables).forEach(([key, val]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(val));
      });
    }
    
    return result;
  } else if (Array.isArray(value)) {
    return value.map(item => replacePlaceholders(item, context));
  } else if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, val]) => {
      result[key] = replacePlaceholders(val, context);
    });
    return result;
  }
  
  return value;
};

/**
 * Execute an HTTP call with placeholder replacement
 */
export async function execHttpCall(
  config: HttpCallConfig,
  context: HttpCallContext = {}
): Promise<HttpCallResult> {
  // Importar supabase para logging
  const { supabase } = await import("@/integrations/supabase/client");
  
  try {
    console.log('🌐 execHttpCall called:', { config, context });

    // Process URL and body with placeholder replacement
    const processedUrl = replacePlaceholders(config.url, context);
    const processedBody = config.body ? replacePlaceholders(config.body, context) : undefined;
    const processedHeaders = config.headers ? replacePlaceholders(config.headers, context) : {};

    console.log('🔗 Processed URL:', processedUrl);
    console.log('📤 Processed body:', processedBody);

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...(typeof processedHeaders === 'object' && processedHeaders !== null ? processedHeaders as Record<string, string> : {})
      }
    };

    // Add body for methods that support it
    if (processedBody && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      fetchOptions.body = JSON.stringify(processedBody);
    }

    // Execute the request
    const response = await fetch(String(processedUrl), fetchOptions);
    
    let responseData: unknown;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log('📥 HTTP Response:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    if (!response.ok) {
      // ✅ FASE 2: Log do erro HTTP
      if (context.leadId) {
        try {
          await supabase.from('actions_log').insert({
            lead_id: Number(context.leadId),
            action_label: `HTTP ${config.method}`,
            payload: { url: processedUrl, body: processedBody, response: responseData } as any,
            status: 'ERROR',
            error: `HTTP ${response.status}`,
          });
        } catch (logError) {
          console.error('❌ Erro ao salvar log:', logError);
        }
      }
      
      return {
        success: false,
        status: response.status,
        message: `HTTP ${config.method} failed with status ${response.status}`,
        data: responseData,
        error: typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
      };
    }

    // ✅ FASE 2: Log do sucesso HTTP
    if (context.leadId) {
      try {
        await supabase.from('actions_log').insert({
          lead_id: Number(context.leadId),
          action_label: `HTTP ${config.method}`,
          payload: { url: processedUrl, body: processedBody } as any,
          status: 'OK',
        });
      } catch (logError) {
        console.error('❌ Erro ao salvar log:', logError);
      }
    }

    return {
      success: true,
      status: response.status,
      message: `HTTP ${config.method} to ${processedUrl} successful`,
      data: responseData
    };
  } catch (error) {
    console.error('❌ Erro em execHttpCall:', error);
    
    // ✅ FASE 2: Log do erro de exceção
    if (context.leadId) {
      const { supabase } = await import("@/integrations/supabase/client");
      try {
        await supabase.from('actions_log').insert({
          lead_id: Number(context.leadId),
          action_label: `HTTP ${config.method}`,
          payload: { url: config.url, error: true } as any,
          status: 'ERROR',
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (logError) {
        console.error('❌ Erro ao salvar log:', logError);
      }
    }
    
    return {
      success: false,
      status: 0,
      message: `Erro ao executar HTTP call: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
