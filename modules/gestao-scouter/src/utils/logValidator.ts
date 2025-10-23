/**
 * Log Validator and Normalizer
 * =============================
 * 
 * This utility validates and normalizes log entries from various sources,
 * ensuring they are valid JSON and conform to expected schemas.
 * 
 * Features:
 * - JSON validation and repair
 * - Schema validation with Zod
 * - Automatic timestamp normalization
 * - Error message sanitization
 */

import { z } from 'zod';

// Schema for sync log entries
export const SyncLogSchema = z.object({
  id: z.string().uuid().optional(),
  event_message: z.string(),
  event_type: z.string().optional(),
  function_id: z.string().uuid().optional(),
  log_level: z.enum(['ERRO', 'erro', 'ERROR', 'error', 'registro', 'log', 'informações', 'info', 'INFO', 'warning', 'WARN', 'aviso']),
  timestamp: z.union([
    z.number(), // Unix timestamp in microseconds
    z.string(), // ISO string
    z.coerce.date() // Any date format
  ]).optional().transform((val) => {
    if (!val) return undefined;
    if (typeof val === 'number') {
      // Convert microseconds to milliseconds
      return val > 10000000000000 ? Math.floor(val / 1000) : val;
    }
    if (typeof val === 'string') {
      const date = new Date(val);
      return date.getTime();
    }
    if (val instanceof Date) {
      return val.getTime();
    }
    return undefined;
  }),
  'carimbo de data/hora': z.number().optional(), // Portuguese timestamp field
});

export type SyncLog = z.infer<typeof SyncLogSchema>;

export interface ValidationResult {
  isValid: boolean;
  logs: SyncLog[];
  errors: string[];
  warnings: string[];
  originalInput: string;
  repairedJson?: string;
}

/**
 * Attempts to repair common JSON formatting issues
 */
export function repairJsonString(input: string): string {
  let repaired = input.trim();
  
  // Remove leading/trailing malformed fragments
  repaired = repaired.replace(/^[^{[]*/, ''); // Remove leading garbage
  repaired = repaired.replace(/[^}\]]*$/, ''); // Remove trailing garbage
  
  // Fix missing commas between objects
  repaired = repaired.replace(/}\s*{/g, '},{');
  
  // Fix missing opening/closing brackets for arrays
  if (repaired.startsWith('{') && repaired.includes('},{')) {
    repaired = `[${repaired}]`;
  }
  
  // Remove duplicate opening braces
  repaired = repaired.replace(/{{+/g, '{');
  
  // Remove duplicate closing braces
  repaired = repaired.replace(/}}+/g, '}');
  
  // Fix malformed strings with quotes issues
  repaired = repaired.replace(/"([^"]*)""\s*{/g, '"$1",{');
  
  // Try to extract individual JSON objects if wrapped in string
  if (repaired.includes('"{') && repaired.includes('}"')) {
    repaired = repaired.replace(/"({[^}]+})"/g, '$1');
  }
  
  return repaired;
}

/**
 * Normalizes a log level to a standard format
 */
export function normalizeLogLevel(level: string): 'ERROR' | 'INFO' | 'WARN' | 'LOG' {
  const normalized = level.toLowerCase();
  
  if (['erro', 'error'].includes(normalized)) return 'ERROR';
  if (['informações', 'info'].includes(normalized)) return 'INFO';
  if (['warning', 'warn', 'aviso'].includes(normalized)) return 'WARN';
  return 'LOG';
}

/**
 * Extracts and parses individual log objects from malformed JSON
 */
export function extractLogObjects(input: string): Array<Record<string, unknown>> {
  const objects: Array<Record<string, unknown>> = [];
  
  // Strategy 1: Split by likely object boundaries and try to parse each
  // Look for patterns like "}\s*{" or "}\s*\"{"
  const splits = input.split(/}\s*(?={|")/);
  
  for (let i = 0; i < splits.length; i++) {
    let part = splits[i].trim();
    
    // Add closing brace if missing
    if (part && !part.endsWith('}')) {
      part += '}';
    }
    
    // Remove leading quote and text before opening brace
    part = part.replace(/^[^{]*/, '');
    
    if (!part || part.length < 3) continue;
    
    try {
      const parsed = JSON.parse(part);
      if (parsed && typeof parsed === 'object') {
        objects.push(parsed);
      }
    } catch (e) {
      // Try more aggressive repair
      try {
        // Remove trailing garbage after last }
        const lastBrace = part.lastIndexOf('}');
        if (lastBrace > 0) {
          part = part.substring(0, lastBrace + 1);
        }
        
        const parsed = JSON.parse(part);
        if (parsed && typeof parsed === 'object') {
          objects.push(parsed);
        }
      } catch (e2) {
        // Skip this one
      }
    }
  }
  
  // Strategy 2: If we got nothing, try regex pattern matching
  if (objects.length === 0) {
    const objectPattern = /{[^{}]*}/g;
    const matches = input.match(objectPattern);
    
    if (matches) {
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          objects.push(parsed);
        } catch (e) {
          // Skip
        }
      }
    }
  }
  
  return objects;
}

/**
 * Main validation function that processes raw log input
 */
export function validateAndNormalizeLogs(input: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    logs: [],
    errors: [],
    warnings: [],
    originalInput: input,
  };
  
  if (!input || input.trim().length === 0) {
    result.errors.push('Input is empty');
    return result;
  }
  
  // Step 1: Try to parse as-is
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    result.warnings.push('Initial JSON parsing failed, attempting repair...');
    
    // Step 2: Try to repair the JSON
    const repaired = repairJsonString(input);
    result.repairedJson = repaired;
    
    try {
      parsed = JSON.parse(repaired);
      result.warnings.push('JSON successfully repaired');
    } catch (e2) {
      // Step 3: Try to extract individual objects
      result.warnings.push('Full repair failed, extracting individual objects...');
      const objects = extractLogObjects(input);
      
      if (objects.length === 0) {
        result.errors.push('Could not extract any valid JSON objects from input');
        return result;
      }
      
      parsed = objects;
      result.warnings.push(`Extracted ${objects.length} log objects`);
    }
  }
  
  // Step 4: Normalize to array
  const logArray = Array.isArray(parsed) ? parsed : [parsed];
  
  // Step 5: Validate and normalize each log entry
  for (let i = 0; i < logArray.length; i++) {
    const logEntry = logArray[i];
    
    try {
      // Normalize Portuguese field names
      if ('carimbo de data/hora' in logEntry && !('timestamp' in logEntry)) {
        (logEntry as Record<string, unknown>).timestamp = (logEntry as Record<string, unknown>)['carimbo de data/hora'];
      }
      
      // Validate against schema
      const validated = SyncLogSchema.parse(logEntry);
      
      // Normalize log level
      const normalizedLog = {
        ...validated,
        log_level_normalized: normalizeLogLevel(validated.log_level),
        timestamp_iso: validated.timestamp 
          ? new Date(validated.timestamp).toISOString() 
          : new Date().toISOString(),
      };
      
      result.logs.push(validated);
      
      // Add warning for critical issues
      if (normalizeLogLevel(validated.log_level) === 'ERROR') {
        result.warnings.push(`Log ${i + 1}: Critical error detected - ${validated.event_message}`);
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        result.errors.push(`Log ${i + 1}: Validation error - ${e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')}`);
      } else {
        result.errors.push(`Log ${i + 1}: Unknown validation error - ${String(e)}`);
      }
    }
  }
  
  result.isValid = result.logs.length > 0 && result.errors.length === 0;
  
  return result;
}

/**
 * Formats validation results for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('LOG VALIDATION REPORT');
  lines.push('='.repeat(80));
  
  lines.push(`\n✅ Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
  lines.push(`📊 Logs Processed: ${result.logs.length}`);
  lines.push(`❌ Errors: ${result.errors.length}`);
  lines.push(`⚠️  Warnings: ${result.warnings.length}`);
  
  if (result.warnings.length > 0) {
    lines.push('\n⚠️  WARNINGS:');
    result.warnings.forEach(w => lines.push(`   - ${w}`));
  }
  
  if (result.errors.length > 0) {
    lines.push('\n❌ ERRORS:');
    result.errors.forEach(e => lines.push(`   - ${e}`));
  }
  
  if (result.logs.length > 0) {
    lines.push('\n📋 VALIDATED LOGS:');
    result.logs.forEach((log, i) => {
      lines.push(`\n   Log ${i + 1}:`);
      lines.push(`   - Level: ${log.log_level}`);
      lines.push(`   - Message: ${log.event_message}`);
      if (log.timestamp) {
        lines.push(`   - Timestamp: ${new Date(log.timestamp).toISOString()}`);
      }
    });
  }
  
  if (result.repairedJson) {
    lines.push('\n🔧 REPAIRED JSON:');
    lines.push(result.repairedJson);
  }
  
  lines.push('\n' + '='.repeat(80));
  
  return lines.join('\n');
}
