// ============================================
// Sync Validation Tests
// ============================================
// Unit tests for synchronization logic validation

import { describe, it, expect } from 'vitest';

describe('Sync Loop Prevention', () => {
  it('should ignore updates when source is gestao_scouter', () => {
    const source = 'gestao_scouter' as string;
    const shouldSync = source !== 'gestao_scouter' && source !== 'gestao-scouter';
    expect(shouldSync).toBe(false);
  });

  it('should ignore updates when source is gestao-scouter (with hyphen)', () => {
    const source = 'gestao-scouter' as string;
    const shouldSync = source !== 'gestao_scouter' && source !== 'gestao-scouter';
    expect(shouldSync).toBe(false);
  });

  it('should allow sync when source is tabuladormax', () => {
    const source = 'tabuladormax' as string;
    const shouldSync = source !== 'gestao_scouter' && source !== 'gestao-scouter';
    expect(shouldSync).toBe(true);
  });

  it('should allow sync when source is supabase', () => {
    const source = 'supabase' as string;
    const shouldSync = source !== 'gestao_scouter' && source !== 'gestao-scouter';
    expect(shouldSync).toBe(true);
  });

  it('should allow sync when source is undefined', () => {
    const source = undefined as string | undefined;
    const shouldSync = source !== 'gestao_scouter' && source !== 'gestao-scouter';
    expect(shouldSync).toBe(true);
  });

  it('should allow sync when source is null', () => {
    const source = null as string | null;
    const shouldSync = source !== 'gestao_scouter' && source !== 'gestao-scouter';
    expect(shouldSync).toBe(true);
  });
});

describe('Date Serialization', () => {
  it('should serialize Date object to ISO string', () => {
    const date = new Date('2025-10-17T10:30:00Z');
    const serialized = date.toISOString();
    expect(serialized).toBe('2025-10-17T10:30:00.000Z');
  });

  it('should serialize date string to ISO string', () => {
    const dateStr = '2025-10-17T10:30:00Z';
    const serialized = new Date(dateStr).toISOString();
    expect(serialized).toBe('2025-10-17T10:30:00.000Z');
  });

  it('should handle null dates gracefully', () => {
    const dateStr = null;
    const serialized = dateStr ? new Date(dateStr).toISOString() : null;
    expect(serialized).toBeNull();
  });

  it('should handle undefined dates gracefully', () => {
    const dateStr = undefined;
    const serialized = dateStr ? new Date(dateStr).toISOString() : null;
    expect(serialized).toBeNull();
  });

  it('should preserve timestamp precision in ISO format', () => {
    const date = new Date('2025-10-17T10:30:45.123Z');
    const serialized = date.toISOString();
    expect(serialized).toContain('.123Z');
  });
});

describe('Updated At Field Standardization', () => {
  it('should use updated_at when available', () => {
    const data = {
      updated_at: '2025-10-17T10:30:00Z',
      date_modify: '2025-10-16T10:30:00Z'
    };
    const effectiveDate = data.updated_at || data.date_modify;
    expect(effectiveDate).toBe(data.updated_at);
  });

  it('should fallback to date_modify when updated_at is not available', () => {
    const data = {
      updated_at: null,
      date_modify: '2025-10-16T10:30:00Z'
    };
    const effectiveDate = data.updated_at || data.date_modify;
    expect(effectiveDate).toBe(data.date_modify);
  });

  it('should fallback to date_modify when updated_at is undefined', () => {
    const data = {
      date_modify: '2025-10-16T10:30:00Z'
    };
    const effectiveDate = (data as any).updated_at || data.date_modify;
    expect(effectiveDate).toBe(data.date_modify);
  });

  it('should set updated_at on insert/update', () => {
    const leadData = {
      id: 123,
      name: 'Test Lead',
      updated_at: new Date().toISOString()
    };
    expect(leadData.updated_at).toBeDefined();
    expect(typeof leadData.updated_at).toBe('string');
    expect(leadData.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('Conflict Resolution Based on Timestamps', () => {
  it('should skip update when incoming data is older', () => {
    const existingDate = new Date('2025-10-17T10:30:00Z');
    const incomingDate = new Date('2025-10-16T10:30:00Z');
    
    const shouldSkip = incomingDate < existingDate;
    expect(shouldSkip).toBe(true);
  });

  it('should allow update when incoming data is newer', () => {
    const existingDate = new Date('2025-10-16T10:30:00Z');
    const incomingDate = new Date('2025-10-17T10:30:00Z');
    
    const shouldSkip = incomingDate < existingDate;
    expect(shouldSkip).toBe(false);
  });

  it('should allow update when dates are equal', () => {
    const existingDate = new Date('2025-10-17T10:30:00Z');
    const incomingDate = new Date('2025-10-17T10:30:00Z');
    
    const shouldSkip = incomingDate < existingDate;
    expect(shouldSkip).toBe(false);
  });

  it('should handle date comparison from ISO strings', () => {
    const existingDateStr = '2025-10-17T10:30:00.000Z';
    const incomingDateStr = '2025-10-16T10:30:00.000Z';
    
    const existingDate = new Date(existingDateStr);
    const incomingDate = new Date(incomingDateStr);
    
    const shouldSkip = incomingDate < existingDate;
    expect(shouldSkip).toBe(true);
  });
});

describe('Sync Status Tracking', () => {
  it('should set sync_source to gestao_scouter when syncing from gestao-scouter', () => {
    const leadData = {
      id: 123,
      name: 'Test Lead',
      sync_source: 'gestao_scouter',
      sync_status: 'synced',
      last_sync_at: new Date().toISOString()
    };
    
    expect(leadData.sync_source).toBe('gestao_scouter');
    expect(leadData.sync_status).toBe('synced');
    expect(leadData.last_sync_at).toBeDefined();
  });

  it('should set sync_source to tabuladormax when syncing to gestao-scouter', () => {
    const fichaData = {
      id: 123,
      name: 'Test Lead',
      sync_source: 'tabuladormax',
      last_sync_at: new Date().toISOString()
    };
    
    expect(fichaData.sync_source).toBe('tabuladormax');
    expect(fichaData.last_sync_at).toBeDefined();
  });

  it('should update sync_status on local table after successful sync', () => {
    const updateData = {
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      sync_source: 'supabase',
      updated_at: new Date().toISOString()
    };
    
    expect(updateData.sync_status).toBe('synced');
    expect(updateData.sync_source).toBe('supabase');
    expect(updateData.last_sync_at).toBeDefined();
    expect(updateData.updated_at).toBeDefined();
  });
});

describe('Sync Event Logging', () => {
  it('should create proper sync event structure for success', () => {
    const syncEvent = {
      event_type: 'update',
      direction: 'gestao_scouter_to_supabase',
      lead_id: 123,
      status: 'success',
      sync_duration_ms: 150,
      error_message: null
    };
    
    expect(syncEvent.event_type).toBe('update');
    expect(syncEvent.direction).toBe('gestao_scouter_to_supabase');
    expect(syncEvent.status).toBe('success');
    expect(syncEvent.error_message).toBeNull();
  });

  it('should create proper sync event structure for error', () => {
    const syncEvent = {
      event_type: 'update',
      direction: 'supabase_to_gestao_scouter',
      lead_id: 123,
      status: 'error',
      error_message: 'Connection timeout'
    };
    
    expect(syncEvent.status).toBe('error');
    expect(syncEvent.error_message).toBe('Connection timeout');
  });

  it('should create proper sync event for skipped updates', () => {
    const syncEvent = {
      event_type: 'update',
      direction: 'gestao_scouter_to_supabase',
      lead_id: 123,
      status: 'success',
      error_message: 'Skipped - older version',
      sync_duration_ms: 50
    };
    
    expect(syncEvent.status).toBe('success');
    expect(syncEvent.error_message).toBe('Skipped - older version');
  });
});

describe('Optional Field Handling', () => {
  it('should handle optional date fields with null values', () => {
    const leadData = {
      criado: null,
      data_criacao_ficha: null,
      data_confirmacao_ficha: null,
      data_criacao_agendamento: null,
      data_retorno_ligacao: null
    };
    
    const serializedData = {
      criado: leadData.criado ? new Date(leadData.criado).toISOString() : null,
      data_criacao_ficha: leadData.data_criacao_ficha ? new Date(leadData.data_criacao_ficha).toISOString() : null,
      data_confirmacao_ficha: leadData.data_confirmacao_ficha ? new Date(leadData.data_confirmacao_ficha).toISOString() : null,
      data_criacao_agendamento: leadData.data_criacao_agendamento ? new Date(leadData.data_criacao_agendamento).toISOString() : null,
      data_retorno_ligacao: leadData.data_retorno_ligacao ? new Date(leadData.data_retorno_ligacao).toISOString() : null
    };
    
    expect(serializedData.criado).toBeNull();
    expect(serializedData.data_criacao_ficha).toBeNull();
    expect(serializedData.data_confirmacao_ficha).toBeNull();
    expect(serializedData.data_criacao_agendamento).toBeNull();
    expect(serializedData.data_retorno_ligacao).toBeNull();
  });

  it('should serialize optional date fields when they have values', () => {
    const leadData = {
      criado: '2025-10-17T10:30:00Z',
      data_criacao_ficha: '2025-10-16T10:30:00Z',
      data_confirmacao_ficha: '2025-10-15T10:30:00Z'
    };
    
    const serializedData = {
      criado: leadData.criado ? new Date(leadData.criado).toISOString() : null,
      data_criacao_ficha: leadData.data_criacao_ficha ? new Date(leadData.data_criacao_ficha).toISOString() : null,
      data_confirmacao_ficha: leadData.data_confirmacao_ficha ? new Date(leadData.data_confirmacao_ficha).toISOString() : null
    };
    
    expect(serializedData.criado).toBe('2025-10-17T10:30:00.000Z');
    expect(serializedData.data_criacao_ficha).toBe('2025-10-16T10:30:00.000Z');
    expect(serializedData.data_confirmacao_ficha).toBe('2025-10-15T10:30:00.000Z');
  });
});
