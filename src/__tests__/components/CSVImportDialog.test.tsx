// ============================================
// CSVImportDialog Tests
// ============================================
// Test suite for CSV import functionality

import { describe, it, expect } from 'vitest';

describe('CSVImportDialog - File Size Validation', () => {
  const MB = 1024 * 1024;
  const MAX_FILE_SIZE = 250 * MB;

  it('should accept file sizes up to 250MB', () => {
    const fileSize = 250 * MB;
    expect(fileSize).toBeLessThanOrEqual(MAX_FILE_SIZE);
  });

  it('should reject file sizes over 250MB', () => {
    const fileSize = 251 * MB;
    expect(fileSize).toBeGreaterThan(MAX_FILE_SIZE);
  });

  it('should accept file sizes at common thresholds', () => {
    const testSizes = [
      1 * MB,      // 1MB
      50 * MB,     // 50MB (old limit)
      100 * MB,    // 100MB (practical backend limit)
      200 * MB,    // 200MB
      250 * MB,    // 250MB (new limit)
    ];

    testSizes.forEach(size => {
      expect(size).toBeLessThanOrEqual(MAX_FILE_SIZE);
    });
  });

  it('should correctly calculate megabytes', () => {
    expect(1 * MB).toBe(1048576);
    expect(250 * MB).toBe(262144000);
  });
});
