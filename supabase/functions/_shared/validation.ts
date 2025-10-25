/**
 * Zod schemas for validation in Edge Functions
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Schema para validação de query params do endpoint logs
 */
export const logsQuerySchema = z.object({
  cursor: z.string().optional(),
  level: z.enum(['all', 'info', 'warn', 'error', 'debug']).optional().default('all'),
  q: z.string().optional().default(''),
});

/**
 * Schema para validação do body do endpoint auto-fix
 */
export const autoFixBodySchema = z.object({
  issueId: z.string().min(1, 'issueId is required'),
  action: z.enum(['restart', 'clear_cache', 'reset_connection']).optional(),
});

/**
 * Schema para validação do body do endpoint reload
 */
export const reloadBodySchema = z.object({
  secret: z.string().min(1, 'secret is required'),
  force: z.boolean().optional().default(false),
});

/**
 * Helper para validar e retornar erros de validação Zod
 */
export function validateData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: `Validation error: ${messages}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}
