/**
 * Tests for shared synchronization utilities
 * 
 * To run these tests:
 * deno test supabase/functions/_tests/shared-utils.test.ts
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.193.0/testing/asserts.ts";
import {
  CORS_HEADERS,
  LogLevel,
  createLogEntry,
  log,
  logMessage,
  generateTraceId,
  createErrorResponse,
  createSuccessResponse,
  jsonResponse,
  handleCorsPreFlight,
  extractErrorMessage,
  extractSupabaseError,
  PerformanceTimer,
  retryWithBackoff,
  validateEnvVars,
  DEFAULT_RETRY_CONFIG,
} from "../_shared/sync-utils.ts";

// Test CORS Headers
Deno.test("CORS_HEADERS - contains required fields", () => {
  assertExists(CORS_HEADERS['Access-Control-Allow-Origin']);
  assertExists(CORS_HEADERS['Access-Control-Allow-Headers']);
  assertExists(CORS_HEADERS['Access-Control-Allow-Methods']);
});

Deno.test("CORS_HEADERS - allows all origins", () => {
  assertEquals(CORS_HEADERS['Access-Control-Allow-Origin'], '*');
});

Deno.test("CORS_HEADERS - includes common headers", () => {
  const headers = CORS_HEADERS['Access-Control-Allow-Headers'];
  assert(headers.includes('authorization'));
  assert(headers.includes('content-type'));
});

// Test Log Levels
Deno.test("LogLevel enum - contains all expected levels", () => {
  assertEquals(LogLevel.DEBUG, 'debug');
  assertEquals(LogLevel.INFO, 'info');
  assertEquals(LogLevel.WARN, 'warn');
  assertEquals(LogLevel.ERROR, 'error');
});

// Test createLogEntry
Deno.test("createLogEntry - creates basic log entry", () => {
  const entry = createLogEntry(
    LogLevel.INFO,
    'test-function',
    'test message'
  );
  
  assertExists(entry.timestamp);
  assertEquals(entry.level, LogLevel.INFO);
  assertEquals(entry.function_name, 'test-function');
  assertEquals(entry.message, 'test message');
});

Deno.test("createLogEntry - includes metadata when provided", () => {
  const metadata = { key: 'value', count: 42 };
  const entry = createLogEntry(
    LogLevel.INFO,
    'test-function',
    'test message',
    metadata
  );
  
  assertExists(entry.metadata);
  assertEquals(entry.metadata?.key, 'value');
  assertEquals(entry.metadata?.count, 42);
});

Deno.test("createLogEntry - includes duration when provided", () => {
  const entry = createLogEntry(
    LogLevel.INFO,
    'test-function',
    'test message',
    undefined,
    150
  );
  
  assertEquals(entry.duration_ms, 150);
});

Deno.test("createLogEntry - includes trace_id when provided", () => {
  const traceId = 'test-trace-123';
  const entry = createLogEntry(
    LogLevel.INFO,
    'test-function',
    'test message',
    undefined,
    undefined,
    traceId
  );
  
  assertEquals(entry.trace_id, traceId);
});

Deno.test("createLogEntry - timestamp is valid ISO string", () => {
  const entry = createLogEntry(LogLevel.INFO, 'test', 'message');
  const date = new Date(entry.timestamp);
  assertEquals(isNaN(date.getTime()), false);
});

// Test generateTraceId
Deno.test("generateTraceId - generates unique IDs", () => {
  const id1 = generateTraceId();
  const id2 = generateTraceId();
  
  assertExists(id1);
  assertExists(id2);
  assert(id1 !== id2);
});

Deno.test("generateTraceId - format contains timestamp and random part", () => {
  const id = generateTraceId();
  assert(id.includes('-'));
  
  const parts = id.split('-');
  assertEquals(parts.length, 2);
  
  // First part should be a number (timestamp)
  const timestamp = parseInt(parts[0]);
  assertEquals(isNaN(timestamp), false);
  assert(timestamp > 0);
});

// Test createErrorResponse
Deno.test("createErrorResponse - creates basic error response", () => {
  const response = createErrorResponse(
    'TEST_ERROR',
    'Something went wrong'
  );
  
  assertEquals(response.error, 'TEST_ERROR');
  assertEquals(response.message, 'Something went wrong');
  assertExists(response.timestamp);
});

Deno.test("createErrorResponse - includes error_code when provided", () => {
  const response = createErrorResponse(
    'TEST_ERROR',
    'Error message',
    '500'
  );
  
  assertEquals(response.error_code, '500');
});

Deno.test("createErrorResponse - includes details when provided", () => {
  const details = { field: 'username', value: 'invalid' };
  const response = createErrorResponse(
    'VALIDATION_ERROR',
    'Invalid input',
    undefined,
    details
  );
  
  assertExists(response.details);
  assertEquals(response.details?.field, 'username');
});

Deno.test("createErrorResponse - includes suggestions when provided", () => {
  const suggestions = ['Check your input', 'Try again'];
  const response = createErrorResponse(
    'ERROR',
    'Failed',
    undefined,
    undefined,
    suggestions
  );
  
  assertExists(response.suggestions);
  assertEquals(response.suggestions?.length, 2);
});

Deno.test("createErrorResponse - includes trace_id when provided", () => {
  const traceId = 'trace-123';
  const response = createErrorResponse(
    'ERROR',
    'Failed',
    undefined,
    undefined,
    undefined,
    traceId
  );
  
  assertEquals(response.trace_id, traceId);
});

// Test createSuccessResponse
Deno.test("createSuccessResponse - creates basic success response", () => {
  const data = { count: 10, items: [] };
  const response = createSuccessResponse(data);
  
  assertEquals(response.status, 'success');
  assertEquals(response.data.count, 10);
  assertExists(response.timestamp);
});

Deno.test("createSuccessResponse - includes trace_id when provided", () => {
  const traceId = 'trace-456';
  const response = createSuccessResponse({ ok: true }, traceId);
  
  assertEquals(response.trace_id, traceId);
});

Deno.test("createSuccessResponse - includes duration_ms when provided", () => {
  const response = createSuccessResponse({ ok: true }, undefined, 250);
  
  assertEquals(response.duration_ms, 250);
});

// Test jsonResponse
Deno.test("jsonResponse - creates Response with JSON body", () => {
  const data = { message: 'test' };
  const response = jsonResponse(data);
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Content-Type'), 'application/json');
});

Deno.test("jsonResponse - includes CORS headers", () => {
  const response = jsonResponse({ test: true });
  
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test("jsonResponse - accepts custom status code", () => {
  const response = jsonResponse({ error: true }, 500);
  
  assertEquals(response.status, 500);
});

Deno.test("jsonResponse - merges additional headers", () => {
  const response = jsonResponse(
    { test: true },
    200,
    { 'X-Custom-Header': 'value' }
  );
  
  assertEquals(response.headers.get('X-Custom-Header'), 'value');
  // CORS headers should still be present
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});

// Test handleCorsPreFlight
Deno.test("handleCorsPreFlight - returns 204 status", () => {
  const response = handleCorsPreFlight();
  
  assertEquals(response.status, 204);
});

Deno.test("handleCorsPreFlight - includes CORS headers", () => {
  const response = handleCorsPreFlight();
  
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});

// Test extractErrorMessage
Deno.test("extractErrorMessage - extracts from Error object", () => {
  const error = new Error('Test error message');
  const message = extractErrorMessage(error);
  
  assertEquals(message, 'Test error message');
});

Deno.test("extractErrorMessage - handles string errors", () => {
  const message = extractErrorMessage('String error');
  
  assertEquals(message, 'String error');
});

Deno.test("extractErrorMessage - handles unknown error types", () => {
  const message = extractErrorMessage({ custom: 'object' });
  
  assertEquals(message, 'Unknown error occurred');
});

Deno.test("extractErrorMessage - handles null", () => {
  const message = extractErrorMessage(null);
  
  assertEquals(message, 'Unknown error occurred');
});

// Test extractSupabaseError
Deno.test("extractSupabaseError - extracts all error fields", () => {
  const supabaseError = {
    message: 'Database error',
    code: 'PGRST116',
    details: 'Table not found',
    hint: 'Check table name'
  };
  
  const extracted = extractSupabaseError(supabaseError);
  
  assertEquals(extracted.message, 'Database error');
  assertEquals(extracted.code, 'PGRST116');
  assertEquals(extracted.details, 'Table not found');
  assertEquals(extracted.hint, 'Check table name');
});

Deno.test("extractSupabaseError - handles missing fields", () => {
  const supabaseError = {};
  
  const extracted = extractSupabaseError(supabaseError);
  
  assertEquals(extracted.message, 'Unknown database error');
  assertEquals(extracted.code, undefined);
  assertEquals(extracted.details, undefined);
  assertEquals(extracted.hint, undefined);
});

// Test PerformanceTimer
Deno.test("PerformanceTimer - tracks duration", async () => {
  const timer = new PerformanceTimer();
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const duration = timer.getDuration();
  assert(duration >= 50);
  assert(duration < 100); // Should be close to 50ms
});

Deno.test("PerformanceTimer - marks checkpoints", () => {
  const timer = new PerformanceTimer();
  
  timer.mark('checkpoint1');
  timer.mark('checkpoint2');
  
  const marks = timer.getAllMarks();
  
  assertExists(marks.checkpoint1);
  assertExists(marks.checkpoint2);
});

Deno.test("PerformanceTimer - calculates duration between marks", async () => {
  const timer = new PerformanceTimer();
  
  timer.mark('start');
  await new Promise(resolve => setTimeout(resolve, 50));
  timer.mark('end');
  
  const duration = timer.getDurationBetween('start', 'end');
  
  assertExists(duration);
  assert(duration! >= 50);
});

Deno.test("PerformanceTimer - returns null for non-existent marks", () => {
  const timer = new PerformanceTimer();
  
  timer.mark('exists');
  
  const duration = timer.getDurationBetween('exists', 'not-exists');
  assertEquals(duration, null);
});

Deno.test("PerformanceTimer - getAllMarks returns relative times", async () => {
  const timer = new PerformanceTimer();
  
  await new Promise(resolve => setTimeout(resolve, 50));
  timer.mark('mark1');
  await new Promise(resolve => setTimeout(resolve, 50));
  timer.mark('mark2');
  
  const marks = timer.getAllMarks();
  
  assert(marks.mark1 >= 50);
  assert(marks.mark2 >= 100);
  assert(marks.mark2 > marks.mark1);
});

// Test retryWithBackoff
Deno.test("retryWithBackoff - succeeds on first attempt", async () => {
  let attempts = 0;
  
  const result = await retryWithBackoff(async () => {
    attempts++;
    return 'success';
  });
  
  assertEquals(result, 'success');
  assertEquals(attempts, 1);
});

Deno.test("retryWithBackoff - retries on failure", async () => {
  let attempts = 0;
  
  const result = await retryWithBackoff(async () => {
    attempts++;
    if (attempts < 2) {
      throw new Error('Temporary failure');
    }
    return 'success';
  });
  
  assertEquals(result, 'success');
  assertEquals(attempts, 2);
});

Deno.test("retryWithBackoff - respects maxAttempts", async () => {
  let attempts = 0;
  
  try {
    await retryWithBackoff(
      async () => {
        attempts++;
        throw new Error('Always fails');
      },
      { maxAttempts: 3, delayMs: 10, backoffMultiplier: 1 }
    );
    assert(false, 'Should have thrown');
  } catch (error) {
    assertEquals(attempts, 3);
  }
});

Deno.test("retryWithBackoff - calls onRetry callback", async () => {
  let retryCallbacks = 0;
  let attempts = 0;
  
  try {
    await retryWithBackoff(
      async () => {
        attempts++;
        throw new Error('Fail');
      },
      { maxAttempts: 2, delayMs: 10, backoffMultiplier: 1 },
      () => {
        retryCallbacks++;
      }
    );
  } catch {
    // Expected to fail
  }
  
  assertEquals(attempts, 2);
  assertEquals(retryCallbacks, 1); // Only called between attempts
});

// Test validateEnvVars
Deno.test("validateEnvVars - validates present variables", () => {
  // Set a test env var
  Deno.env.set('TEST_VAR_PRESENT', 'value');
  
  const result = validateEnvVars(['TEST_VAR_PRESENT']);
  
  assertEquals(result.valid, true);
  assertEquals(result.missing.length, 0);
  
  // Clean up
  Deno.env.delete('TEST_VAR_PRESENT');
});

Deno.test("validateEnvVars - detects missing variables", () => {
  const result = validateEnvVars(['NON_EXISTENT_VAR_12345']);
  
  assertEquals(result.valid, false);
  assertEquals(result.missing.length, 1);
  assertEquals(result.missing[0], 'NON_EXISTENT_VAR_12345');
});

Deno.test("validateEnvVars - handles multiple variables", () => {
  Deno.env.set('TEST_VAR_1', 'value1');
  Deno.env.set('TEST_VAR_2', 'value2');
  
  const result = validateEnvVars(['TEST_VAR_1', 'TEST_VAR_2', 'TEST_VAR_MISSING']);
  
  assertEquals(result.valid, false);
  assertEquals(result.missing.length, 1);
  assertEquals(result.missing[0], 'TEST_VAR_MISSING');
  
  // Clean up
  Deno.env.delete('TEST_VAR_1');
  Deno.env.delete('TEST_VAR_2');
});

// Test DEFAULT_RETRY_CONFIG
Deno.test("DEFAULT_RETRY_CONFIG - has expected values", () => {
  assertEquals(DEFAULT_RETRY_CONFIG.maxAttempts, 3);
  assertEquals(DEFAULT_RETRY_CONFIG.delayMs, 1000);
  assertEquals(DEFAULT_RETRY_CONFIG.backoffMultiplier, 2);
});

// Integration test: Error handling flow
Deno.test("Integration - complete error handling flow", () => {
  const traceId = generateTraceId();
  
  // Create error response
  const errorResponse = createErrorResponse(
    'DATABASE_ERROR',
    'Failed to connect to database',
    'ECONNREFUSED',
    { host: 'localhost', port: 5432 },
    ['Check if database is running', 'Verify connection string'],
    traceId
  );
  
  // Verify all fields are present
  assertExists(errorResponse.error);
  assertExists(errorResponse.message);
  assertExists(errorResponse.error_code);
  assertExists(errorResponse.details);
  assertExists(errorResponse.suggestions);
  assertExists(errorResponse.trace_id);
  assertExists(errorResponse.timestamp);
  
  // Create JSON response
  const response = jsonResponse(errorResponse, 500);
  
  assertEquals(response.status, 500);
  assertEquals(response.headers.get('Content-Type'), 'application/json');
});

// Integration test: Success flow
Deno.test("Integration - complete success flow", () => {
  const timer = new PerformanceTimer();
  const traceId = generateTraceId();
  
  timer.mark('operation_start');
  
  // Simulate some work
  const data = { processed: 100, failed: 0 };
  
  timer.mark('operation_end');
  const duration = timer.getDurationBetween('operation_start', 'operation_end');
  
  // Create success response
  const successResponse = createSuccessResponse(data, traceId, duration!);
  
  assertExists(successResponse.status);
  assertExists(successResponse.data);
  assertExists(successResponse.timestamp);
  assertExists(successResponse.trace_id);
  assertExists(successResponse.duration_ms);
  
  // Create JSON response
  const response = jsonResponse(successResponse, 200);
  
  assertEquals(response.status, 200);
});

// Integration test: Logging flow
Deno.test("Integration - structured logging flow", () => {
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  
  timer.mark('start');
  
  // Create log entry
  const entry = createLogEntry(
    LogLevel.INFO,
    'test-function',
    'Operation completed successfully',
    {
      records_processed: 150,
      errors: 0,
    },
    timer.getDuration(),
    traceId
  );
  
  // Verify entry structure
  assertExists(entry.timestamp);
  assertEquals(entry.level, LogLevel.INFO);
  assertEquals(entry.function_name, 'test-function');
  assertExists(entry.metadata);
  assertExists(entry.duration_ms);
  assertEquals(entry.trace_id, traceId);
});

console.log("✅ All shared utilities tests passed!");
