/**
 * Validation schemas for Edge Functions using Zod
 * 
 * Segurança: Validação de entrada previne injection attacks e garante
 * que os dados recebidos estão no formato esperado
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================================================
// Query Parameters Validation
// ============================================================================

/**
 * Schema para validação de query params do endpoint /diagnostics/logs
 * 
 * Parâmetros:
 * - cursor: string opcional para paginação
 * - level: nível de log (info, warn, error, debug, all)
 * - q: string de busca opcional
 */
export const LogsQuerySchema = z.object({
  cursor: z.string().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug', 'all']).default('all'),
  q: z.string().max(200).optional(), // Limita tamanho da query para prevenir abuse
});

export type LogsQuery = z.infer<typeof LogsQuerySchema>;

// ============================================================================
// Request Body Validation
// ============================================================================

/**
 * Schema para validação do body do endpoint /diagnostics/auto-fix
 * 
 * Requer:
 * - issueId: identificador do issue a ser corrigido
 */
export const AutoFixRequestSchema = z.object({
  issueId: z.string()
    .min(1, 'issueId is required')
    .max(100, 'issueId is too long'),
});

export type AutoFixRequest = z.infer<typeof AutoFixRequestSchema>;

/**
 * Schema para validação do body do endpoint /reload-gestao-scouter-schema-cache
 * 
 * Requer:
 * - secret: segredo compartilhado para autorização
 */
export const ReloadSchemaRequestSchema = z.object({
  secret: z.string()
    .min(1, 'secret is required'),
});

export type ReloadSchemaRequest = z.infer<typeof ReloadSchemaRequestSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Valida query parameters de uma URL
 * 
 * @param url URL do request
 * @param schema Schema Zod para validação
 * @returns Resultado da validação
 */
export function validateQueryParams<T>(
  url: URL,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params: Record<string, string> = {};
    
    for (const [key, value] of url.searchParams.entries()) {
      params[key] = value;
    }
    
    const result = schema.safeParse(params);
    
    if (!result.success) {
      const errors = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      
      return { 
        success: false, 
        error: `Invalid query parameters: ${errors}` 
      };
    }
    
    return { success: true, data: result.data };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation error' 
    };
  }
}

/**
 * Valida body JSON de um request
 * 
 * @param req Request object
 * @param schema Schema Zod para validação
 * @returns Resultado da validação
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      
      return { 
        success: false, 
        error: `Invalid request body: ${errors}` 
      };
    }
    
    return { success: true, data: result.data };
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { 
        success: false, 
        error: 'Invalid JSON in request body' 
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation error' 
    };
  }
}

/**
 * Retorna resposta de erro de validação
 */
export function validationErrorResponse(error: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Validation error',
      details: error 
    }),
    { 
      status: 400,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    }
  );
}
