#!/usr/bin/env node
/**
 * Validation Script: TabuladorMax Migration Setup
 * ================================================
 * 
 * Validates that the synchronization setup is correct:
 * 1. Environment variables are configured
 * 2. SQL migration scripts are present
 * 3. Documentation is complete
 * 4. Code references use correct column names
 * 
 * Usage:
 * ----
 * npx tsx scripts/validate-migration-setup.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: unknown;
}

const results: ValidationResult[] = [];

function addResult(check: string, status: 'pass' | 'fail' | 'warning', message: string, details?: unknown) {
  results.push({ check, status, message, details });
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 VALIDATION REPORT: TabuladorMax Migration Setup');
  console.log('='.repeat(80) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${index + 1}. ${result.check}`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
    console.log('');

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warnCount++;
  });

  console.log('='.repeat(80));
  console.log(`📊 SUMMARY: ${passCount} passed | ${warnCount} warnings | ${failCount} failed`);
  console.log('='.repeat(80) + '\n');

  if (failCount > 0) {
    console.log('❌ Some validations failed. Review the errors above.');
    console.log('💡 See TABULADORMAX_MIGRATION_GUIDE.md for instructions.\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️ All critical checks passed, but there are warnings.');
    console.log('💡 Review the warnings for optimal configuration.\n');
    process.exit(0);
  } else {
    console.log('✅ All validations passed! Migration setup is ready.\n');
    process.exit(0);
  }
}

function checkFileExists(filePath: string, description: string) {
  const fullPath = join(process.cwd(), filePath);
  const exists = existsSync(fullPath);
  
  if (exists) {
    addResult(
      `File: ${description}`,
      'pass',
      `File exists: ${filePath}`
    );
  } else {
    addResult(
      `File: ${description}`,
      'fail',
      `File not found: ${filePath}`
    );
  }
  
  return exists;
}

function checkFileContent(filePath: string, searchTerm: string, description: string, shouldNotExist = false) {
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    addResult(
      `Content: ${description}`,
      'fail',
      `Cannot check content - file not found: ${filePath}`
    );
    return;
  }
  
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const found = content.includes(searchTerm);
    
    if (shouldNotExist) {
      if (!found) {
        addResult(
          `Content: ${description}`,
          'pass',
          `Correctly does NOT contain: "${searchTerm}"`
        );
      } else {
        addResult(
          `Content: ${description}`,
          'fail',
          `File should NOT contain: "${searchTerm}"`,
          { file: filePath }
        );
      }
    } else {
      if (found) {
        addResult(
          `Content: ${description}`,
          'pass',
          `Contains expected content: "${searchTerm.substring(0, 50)}..."`
        );
      } else {
        addResult(
          `Content: ${description}`,
          'fail',
          `Missing expected content: "${searchTerm.substring(0, 50)}..."`,
          { file: filePath }
        );
      }
    }
  } catch (error) {
    addResult(
      `Content: ${description}`,
      'fail',
      `Error reading file: ${error}`
    );
  }
}

function checkEnvExample() {
  const envPath = join(process.cwd(), '.env.example');
  
  if (!existsSync(envPath)) {
    addResult(
      'Env: .env.example exists',
      'fail',
      '.env.example file not found'
    );
    return;
  }
  
  const content = readFileSync(envPath, 'utf-8');
  const hasTabuladorUrl = content.includes('TABULADOR_URL');
  const hasTabuladorKey = content.includes('TABULADOR_SERVICE_KEY');
  
  if (hasTabuladorUrl && hasTabuladorKey) {
    addResult(
      'Env: TabuladorMax variables',
      'pass',
      '.env.example contains TABULADOR_URL and TABULADOR_SERVICE_KEY'
    );
  } else {
    const missing = [];
    if (!hasTabuladorUrl) missing.push('TABULADOR_URL');
    if (!hasTabuladorKey) missing.push('TABULADOR_SERVICE_KEY');
    
    addResult(
      'Env: TabuladorMax variables',
      'fail',
      `Missing variables in .env.example: ${missing.join(', ')}`
    );
  }
}

function checkTypoInFiles() {
  const filesToCheck = [
    'scripts/syncLeadsToFichas.ts',
    'supabase/migrations/20251018_sync_leads_tabMax.sql',
    'SQL_TABULADORMAX_SETUP.md',
    'scripts/sql/tabuladormax_incremental_sync_setup.sql'
  ];
  
  let foundTypo = false;
  const filesWithTypo: string[] = [];
  
  filesToCheck.forEach(filePath => {
    const fullPath = join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      // Check for the typo: atualizado_at when it should be updated_at
      if (content.includes('atualizado_at')) {
        foundTypo = true;
        filesWithTypo.push(filePath);
      }
    }
  });
  
  if (!foundTypo) {
    addResult(
      'Typo Check: No atualizado_at found',
      'pass',
      'All files use correct column name "updated_at"'
    );
  } else {
    addResult(
      'Typo Check: atualizado_at usage',
      'fail',
      'Found incorrect column name "atualizado_at" (should be "updated_at")',
      { filesWithTypo }
    );
  }
}

async function runValidation() {
  console.log('🚀 Starting TabuladorMax Migration Setup Validation...\n');
  console.log('📍 Working Directory:', process.cwd());
  console.log('');

  // Check SQL migration script
  console.log('🔍 Checking SQL migration scripts...\n');
  checkFileExists(
    'scripts/sql/tabuladormax_incremental_sync_setup.sql',
    'TabuladorMax Incremental Sync Setup SQL'
  );
  
  checkFileContent(
    'scripts/sql/tabuladormax_incremental_sync_setup.sql',
    'ALTER TABLE public.leads',
    'SQL script targets public.leads table'
  );
  
  checkFileContent(
    'scripts/sql/tabuladormax_incremental_sync_setup.sql',
    'ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ',
    'SQL script creates updated_at column'
  );
  
  checkFileContent(
    'scripts/sql/tabuladormax_incremental_sync_setup.sql',
    'CREATE INDEX IF NOT EXISTS idx_leads_updated_at',
    'SQL script creates index on updated_at'
  );
  
  checkFileContent(
    'scripts/sql/tabuladormax_incremental_sync_setup.sql',
    'update_updated_at_column',
    'SQL script has trigger function'
  );

  // Check documentation
  console.log('🔍 Checking documentation...\n');
  checkFileExists(
    'TABULADORMAX_MIGRATION_GUIDE.md',
    'TabuladorMax Migration Guide'
  );
  
  checkFileExists(
    'MIGRATION_CLARIFICATION.md',
    'Migration Clarification (typo explanation)'
  );
  
  checkFileExists(
    'SQL_TABULADORMAX_SETUP.md',
    'SQL TabuladorMax Setup Guide'
  );
  
  checkFileContent(
    'TABULADORMAX_MIGRATION_GUIDE.md',
    'SERVICE_ROLE_KEY',
    'Migration guide mentions SERVICE_ROLE_KEY'
  );
  
  checkFileContent(
    'TABULADORMAX_MIGRATION_GUIDE.md',
    'test-tabulador-connection',
    'Migration guide includes curl tests'
  );

  // Check environment configuration
  console.log('🔍 Checking environment configuration...\n');
  checkEnvExample();

  // Check sync script
  console.log('🔍 Checking sync scripts...\n');
  checkFileExists(
    'scripts/syncLeadsToFichas.ts',
    'Sync Leads to Fichas script'
  );
  
  checkFileContent(
    'scripts/syncLeadsToFichas.ts',
    'updated_at',
    'Sync script uses updated_at field'
  );

  // Check migrations
  console.log('🔍 Checking Supabase migrations...\n');
  checkFileExists(
    'supabase/migrations/20251018_sync_leads_tabMax.sql',
    'Sync Leads TabuladorMax migration'
  );
  
  checkFileContent(
    'supabase/migrations/20251018_sync_leads_tabMax.sql',
    'updated_at TIMESTAMPTZ DEFAULT NOW()',
    'Migration creates updated_at column'
  );

  // Check for typo (atualizado_at instead of updated_at)
  console.log('🔍 Checking for column name typos...\n');
  checkTypoInFiles();

  // Check Edge Functions
  console.log('🔍 Checking Edge Functions...\n');
  checkFileExists(
    'supabase/functions/sync-tabulador/index.ts',
    'Sync Tabulador Edge Function'
  );
  
  checkFileContent(
    'supabase/functions/sync-tabulador/index.ts',
    'updated_at',
    'Edge function references updated_at'
  );

  // Print results
  printResults();
}

// Run validation
runValidation().catch(error => {
  console.error('\n❌ Unhandled error during validation:');
  console.error(error);
  process.exit(1);
});
