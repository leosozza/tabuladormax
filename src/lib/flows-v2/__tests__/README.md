# Flows v2 - Unit Tests

This directory contains unit test skeletons for the Flows v2 infrastructure. Tests are organized by module and use Vitest as the testing framework.

## Test Structure

### schemas.test.ts
Tests for JSON schema definitions and validation rules:
- Step schema validation (Tabular, HTTP Call, Wait)
- Flow definition schema validation
- Flow version schema validation
- Flow execution schema validation
- Discriminated union type handling

### validators.test.ts
Tests for validation utility functions:
- Core validation functions (`validate`, `validateOrThrow`)
- Step validation (`validateFlowStep`, `validateFlowSteps`)
- Flow validation (`validateFlowDefinition`, `validateFlowVersion`)
- Utility functions (`hasEnabledSteps`, `getEnabledSteps`)
- Error formatting
- Type guards

### step-runner.test.ts
Tests for step runner infrastructure:
- `StepRunnerRegistry` functionality
- Utility functions (logging, results, timing)
- `TabularStepRunner` execution
- `HttpCallStepRunner` execution
- `WaitStepRunner` execution
- Default registry creation

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test schemas.test.ts
```

## Test Implementation Guide

All tests currently have `// TODO: Implement test` placeholders. To implement a test:

1. **Setup**: Add necessary imports and setup in `beforeEach` if needed
2. **Arrange**: Prepare test data and mocks
3. **Act**: Execute the function being tested
4. **Assert**: Verify the expected outcome using `expect()`

### Example Test Implementation

```typescript
it('should validate a valid tabular step', () => {
  // Arrange
  const validStep = {
    id: 'step-1',
    type: 'tabular' as const,
    nome: 'Update Status',
    config: {
      webhook_url: 'https://api.example.com/webhook',
      field: 'STATUS_ID',
      value: 'QUALIFIED'
    }
  };

  // Act
  const result = TabularStepSchema.parse(validStep);

  // Assert
  expect(result).toEqual(validStep);
  expect(result.type).toBe('tabular');
});
```

## Mocking Guidelines

### Mocking fetch for HTTP tests

```typescript
import { vi } from 'vitest';

// Mock successful response
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);

// Mock error response
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    status: 404,
    text: () => Promise.resolve('Not Found'),
  } as Response)
);
```

### Mocking timers for Wait tests

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('should wait for specified duration', async () => {
  const promise = waitStepRunner.execute(config, context);
  
  // Fast-forward time
  await vi.advanceTimersByTimeAsync(5000);
  
  const result = await promise;
  expect(result.success).toBe(true);
});
```

## Coverage Goals

Aim for the following coverage targets:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Test Data

Create test fixtures in a `__fixtures__` directory for reusable test data:

```typescript
// __fixtures__/steps.ts
export const validTabularStep = {
  id: 'step-1',
  type: 'tabular' as const,
  nome: 'Update Status',
  config: {
    webhook_url: 'https://api.example.com/webhook',
    field: 'STATUS_ID',
    value: 'QUALIFIED'
  }
};
```

## Continuous Integration

Tests should be run automatically on:
- Every commit (pre-commit hook)
- Every pull request (CI pipeline)
- Before deployment

## Contributing

When adding new functionality to Flows v2:
1. Update or add relevant test skeletons
2. Implement the tests alongside the feature
3. Ensure all tests pass before submitting PR
4. Update this README if new test files are added
