# Testing Guide for Sync Functions

## Overview

This directory contains automated tests for the synchronization Edge Functions. The tests are written for Deno and can be run locally or in CI/CD pipelines.

## Test Files

### 1. shared-utils.test.ts
Tests for the shared utilities module (`_shared/sync-utils.ts`).

**Coverage:**
- CORS headers configuration
- Structured logging (LogLevel, LogEntry, log functions)
- Trace ID generation
- Error response creation
- Success response creation
- JSON response formatting
- Error message extraction
- Supabase error handling
- Performance timer functionality
- Retry logic with exponential backoff
- Environment variable validation

**Example tests:**
- ✅ CORS headers include required fields
- ✅ Trace IDs are unique
- ✅ Log entries are properly formatted
- ✅ Performance timer tracks duration accurately
- ✅ Retry logic respects max attempts
- ✅ Environment validation detects missing vars

### 2. sync-utils.test.ts
Tests for sync-specific utility functions (date handling, loop prevention).

**Coverage:**
- Date normalization
- Updated-at field extraction with fallbacks
- Sync loop prevention logic
- Lead data normalization flows

### 3. config-validation.test.ts
Tests for configuration validation.

**Coverage:**
- URL format validation
- Credentials validation
- Table name quoting
- Table name variation generation

## Running Tests

### Prerequisites

1. **Install Deno** (if not already installed):
   ```bash
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh
   
   # Windows
   irm https://deno.land/install.ps1 | iex
   
   # Or using package managers
   brew install deno      # macOS
   choco install deno     # Windows
   apt install deno       # Ubuntu/Debian
   ```

2. **Add Deno to PATH**:
   ```bash
   export PATH="$HOME/.deno/bin:$PATH"
   ```

### Running All Tests

```bash
# From project root
deno test supabase/functions/_tests/

# Or run specific test file
deno test supabase/functions/_tests/shared-utils.test.ts
```

### Running Tests with Different Options

```bash
# Verbose output
deno test --allow-all supabase/functions/_tests/ --verbose

# Run only tests matching a pattern
deno test supabase/functions/_tests/ --filter "PerformanceTimer"

# Run tests with coverage
deno test --coverage=coverage supabase/functions/_tests/
deno coverage coverage

# Parallel execution
deno test --parallel supabase/functions/_tests/

# Watch mode (re-run on file changes)
deno test --watch supabase/functions/_tests/
```

## Test Structure

All tests follow the same pattern:

```typescript
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.193.0/testing/asserts.ts";
import { /* imports */ } from "../_shared/sync-utils.ts";

Deno.test("Test description", () => {
  // Arrange
  const input = /* test data */;
  
  // Act
  const result = functionUnderTest(input);
  
  // Assert
  assertEquals(result, expected);
});

// Async tests
Deno.test("Async test description", async () => {
  const result = await asyncFunction();
  assertExists(result);
});
```

## Common Assertions

```typescript
// Value equality
assertEquals(actual, expected);

// Existence check
assertExists(value);

// Boolean assertion
assert(condition);

// Throws check
assertThrows(() => { functionThatThrows(); });

// Async throws
await assertRejects(async () => { await asyncThatThrows(); });

// Array includes
assert(array.includes(value));

// String contains
assert(string.includes('substring'));
```

## Writing New Tests

### 1. Create Test File

```typescript
/**
 * Tests for [feature name]
 * 
 * To run: deno test supabase/functions/_tests/your-test.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.193.0/testing/asserts.ts";

// Import functions to test
import { yourFunction } from "../path/to/module.ts";

Deno.test("yourFunction - description", () => {
  // Your test here
});
```

### 2. Test Naming Convention

Format: `[FunctionName] - [scenario being tested]`

Examples:
- `createLogEntry - creates basic log entry`
- `retryWithBackoff - respects maxAttempts`
- `PerformanceTimer - tracks duration`

### 3. Test Organization

Group related tests together:

```typescript
// Feature 1 tests
Deno.test("Feature1 - test case 1", () => { /* ... */ });
Deno.test("Feature1 - test case 2", () => { /* ... */ });

// Feature 2 tests
Deno.test("Feature2 - test case 1", () => { /* ... */ });
Deno.test("Feature2 - test case 2", () => { /* ... */ });

// Integration tests
Deno.test("Integration - complete flow", () => { /* ... */ });
```

## Testing Edge Functions

Since Edge Functions are Deno-based, you can test them locally:

### 1. Test Individual Functions

```bash
# Test sync-health
deno run --allow-all supabase/functions/sync-health/index.ts

# Test with environment variables
TABULADOR_URL=https://test.supabase.co \
TABULADOR_SERVICE_KEY=test-key \
deno run --allow-all supabase/functions/sync-health/index.ts
```

### 2. Use Supabase CLI

```bash
# Serve functions locally
supabase functions serve

# Invoke locally
supabase functions invoke sync-health --method POST

# With data
supabase functions invoke test-tabulador-connection \
  --method POST \
  --data '{"test": true}'
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Edge Functions

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      
      - name: Run tests
        run: deno test --allow-all supabase/functions/_tests/
      
      - name: Generate coverage
        run: |
          deno test --coverage=coverage supabase/functions/_tests/
          deno coverage coverage --lcov > coverage.lcov
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.lcov
```

## Troubleshooting

### Problem: Deno not found
**Solution**: Install Deno or add to PATH

### Problem: Permission denied
**Solution**: Run with `--allow-all` or specify permissions:
```bash
deno test --allow-env --allow-net --allow-read supabase/functions/_tests/
```

### Problem: Import errors
**Solution**: Verify import paths are correct (use relative paths from test file)

### Problem: Tests timeout
**Solution**: Increase timeout or check for infinite loops:
```bash
deno test --allow-all --timeout=60000 supabase/functions/_tests/
```

## Best Practices

1. **Keep tests focused**: Each test should verify one thing
2. **Use descriptive names**: Test names should clearly describe what's being tested
3. **Test edge cases**: Include tests for null, undefined, empty values
4. **Test error paths**: Verify error handling works correctly
5. **Use integration tests**: Test complete flows, not just units
6. **Mock external dependencies**: Don't rely on external services in tests
7. **Keep tests fast**: Avoid unnecessary delays or timeouts
8. **Clean up resources**: Delete test env vars, close connections
9. **Document complex tests**: Add comments explaining test logic
10. **Run tests before committing**: Ensure all tests pass

## Coverage Goals

- **Unit tests**: >80% coverage for utility functions
- **Integration tests**: All critical flows tested
- **Edge cases**: Common error scenarios covered
- **Performance**: Key operations have performance benchmarks

## Next Steps

1. Run existing tests to establish baseline
2. Add tests for any new features
3. Improve coverage for edge cases
4. Add performance benchmarks
5. Set up CI/CD integration
6. Monitor test results over time

## Resources

- [Deno Testing Documentation](https://deno.land/manual/testing)
- [Deno Standard Library](https://deno.land/std)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Testing Best Practices](https://deno.land/manual/testing/best_practices)
