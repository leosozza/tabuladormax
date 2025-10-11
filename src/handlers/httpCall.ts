// ============================================
// HTTP Call Handler - Reusable HTTP Request Logic
// ============================================

export interface HttpCallConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

export interface HttpCallContext {
  leadId?: number;
  variables?: Record<string, any>;
}

export interface HttpCallResult {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
  message: string;
}

/**
 * Replace placeholders in strings with context values
 */
const replacePlaceholders = (
  value: any,
  context: HttpCallContext
): any => {
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
    const result: Record<string, any> = {};
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
        ...processedHeaders
      }
    };

    // Add body for methods that support it
    if (processedBody && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      fetchOptions.body = JSON.stringify(processedBody);
    }

    // Execute the request
    const response = await fetch(processedUrl, fetchOptions);
    
    let responseData: any;
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
      return {
        success: false,
        status: response.status,
        message: `HTTP ${config.method} failed with status ${response.status}`,
        data: responseData,
        error: typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
      };
    }

    return {
      success: true,
      status: response.status,
      message: `HTTP ${config.method} to ${processedUrl} successful`,
      data: responseData
    };
  } catch (error) {
    console.error('❌ Erro em execHttpCall:', error);
    return {
      success: false,
      status: 0,
      message: `Erro ao executar HTTP call: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
