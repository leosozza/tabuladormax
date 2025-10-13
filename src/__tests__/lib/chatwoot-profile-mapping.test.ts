// ============================================
// Test for mapChatwootToProfile with Agent Fields
// ============================================
// Tests for proper mapping of agent fields in profile

import { describe, it, expect, beforeEach } from 'vitest';

// Mock console methods to avoid cluttering test output
const originalLog = console.log;
beforeEach(() => {
  console.log = () => {};
});

// Define types
type DynamicProfile = Record<string, unknown>;

interface FieldMapping {
  id?: string;
  profile_field: string;
  chatwoot_field: string;
  display_name?: string;
}

// Helper function to get nested values
const getNestedValue = (obj: any, path: string): any => {
  if (!path) return '';
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
};

// Implementation of mapChatwootToProfile (copied from LeadTab.tsx)
const mapChatwootToProfile = (contact: any, fieldMappings: FieldMapping[]): DynamicProfile => {
  const profile: DynamicProfile = {};
  
  // Mapear todos os campos configurados
  fieldMappings.forEach(mapping => {
    let value = "";
    const field = mapping.chatwoot_field;
    
    // Limpar prefixos para determinar a fonte de dados
    let cleanPath = field
      .replace(/^data\.contact\./, '')
      .replace(/^contact\./, '')
      .replace(/^data\./, '');
    
    // Se o campo for do agente atual, buscar em currentAgent ou assignee
    if (cleanPath.startsWith('currentAgent.') || cleanPath.startsWith('assignee.')) {
      const agentPath = cleanPath.replace(/^currentAgent\./, '').replace(/^assignee\./, '');
      const agentData = contact?.currentAgent || contact?.assignee;
      
      if (agentData) {
        value = getNestedValue(agentData, agentPath);
      }
    } else {
      // Para outros campos, buscar normalmente no objeto contact
      value = getNestedValue(contact, cleanPath);
    }
    
    profile[mapping.profile_field] = value || "";
  });

  return profile;
};

describe('mapChatwootToProfile with Agent Fields', () => {
  it('should map agent fields from currentAgent', () => {
    const contact = {
      bitrix_id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      currentAgent: {
        id: 101,
        name: 'Agent Smith',
        email: 'agent@example.com',
        role: 'admin',
      },
      custom_attributes: {
        cidade: 'São Paulo',
      },
    };

    const fieldMappings: FieldMapping[] = [
      { profile_field: 'nome', chatwoot_field: 'contact.name' },
      { profile_field: 'agente_nome', chatwoot_field: 'currentAgent.name' },
      { profile_field: 'agente_email', chatwoot_field: 'currentAgent.email' },
      { profile_field: 'cidade', chatwoot_field: 'custom_attributes.cidade' },
    ];

    const profile = mapChatwootToProfile(contact, fieldMappings);

    expect(profile.nome).toBe('John Doe');
    expect(profile.agente_nome).toBe('Agent Smith');
    expect(profile.agente_email).toBe('agent@example.com');
    expect(profile.cidade).toBe('São Paulo');
  });

  it('should map agent fields from assignee if currentAgent is not present', () => {
    const contact = {
      bitrix_id: '123',
      name: 'John Doe',
      assignee: {
        id: 101,
        name: 'Agent Jones',
        email: 'jones@example.com',
      },
    };

    const fieldMappings: FieldMapping[] = [
      { profile_field: 'agente_nome', chatwoot_field: 'currentAgent.name' },
      { profile_field: 'agente_id', chatwoot_field: 'assignee.id' },
    ];

    const profile = mapChatwootToProfile(contact, fieldMappings);

    expect(profile.agente_nome).toBe('Agent Jones');
    expect(profile.agente_id).toBe(101);
  });

  it('should return empty string for agent fields when agent data is missing', () => {
    const contact = {
      bitrix_id: '123',
      name: 'John Doe',
      // No currentAgent or assignee
    };

    const fieldMappings: FieldMapping[] = [
      { profile_field: 'nome', chatwoot_field: 'contact.name' },
      { profile_field: 'agente_nome', chatwoot_field: 'currentAgent.name' },
      { profile_field: 'agente_email', chatwoot_field: 'currentAgent.email' },
    ];

    const profile = mapChatwootToProfile(contact, fieldMappings);

    expect(profile.nome).toBe('John Doe');
    expect(profile.agente_nome).toBe('');
    expect(profile.agente_email).toBe('');
  });

  it('should handle mixed contact and agent fields correctly', () => {
    const contact = {
      bitrix_id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      phone_number: '+1234567890',
      currentAgent: {
        id: 101,
        name: 'Agent Smith',
        email: 'agent@example.com',
        role: 'admin',
      },
      custom_attributes: {
        cidade: 'São Paulo',
        estado: 'SP',
      },
      additional_attributes: {
        source: 'website',
      },
    };

    const fieldMappings: FieldMapping[] = [
      { profile_field: 'nome', chatwoot_field: 'data.contact.name' },
      { profile_field: 'email', chatwoot_field: 'contact.email' },
      { profile_field: 'telefone', chatwoot_field: 'phone_number' },
      { profile_field: 'cidade', chatwoot_field: 'custom_attributes.cidade' },
      { profile_field: 'fonte', chatwoot_field: 'additional_attributes.source' },
      { profile_field: 'agente_nome', chatwoot_field: 'currentAgent.name' },
      { profile_field: 'agente_id', chatwoot_field: 'currentAgent.id' },
    ];

    const profile = mapChatwootToProfile(contact, fieldMappings);

    // Contact fields
    expect(profile.nome).toBe('John Doe');
    expect(profile.email).toBe('john@example.com');
    expect(profile.telefone).toBe('+1234567890');
    
    // Custom attributes
    expect(profile.cidade).toBe('São Paulo');
    expect(profile.fonte).toBe('website');
    
    // Agent fields
    expect(profile.agente_nome).toBe('Agent Smith');
    expect(profile.agente_id).toBe(101);
  });

  it('should handle prefixed field names correctly', () => {
    const contact = {
      name: 'John Doe',
      currentAgent: {
        name: 'Agent Smith',
      },
    };

    const fieldMappings: FieldMapping[] = [
      { profile_field: 'nome1', chatwoot_field: 'contact.name' },
      { profile_field: 'nome2', chatwoot_field: 'data.contact.name' },
      { profile_field: 'agente1', chatwoot_field: 'currentAgent.name' },
      { profile_field: 'agente2', chatwoot_field: 'assignee.name' },
    ];

    const profile = mapChatwootToProfile(contact, fieldMappings);

    expect(profile.nome1).toBe('John Doe');
    expect(profile.nome2).toBe('John Doe');
    expect(profile.agente1).toBe('Agent Smith');
    expect(profile.agente2).toBe('Agent Smith');
  });

  it('should handle nested agent fields', () => {
    const contact = {
      currentAgent: {
        id: 101,
        name: 'Agent Smith',
        email: 'agent@example.com',
        role: 'admin',
      },
    };

    const fieldMappings: FieldMapping[] = [
      { profile_field: 'agente_id', chatwoot_field: 'currentAgent.id' },
      { profile_field: 'agente_nome', chatwoot_field: 'currentAgent.name' },
      { profile_field: 'agente_email', chatwoot_field: 'currentAgent.email' },
      { profile_field: 'agente_funcao', chatwoot_field: 'currentAgent.role' },
    ];

    const profile = mapChatwootToProfile(contact, fieldMappings);

    expect(profile.agente_id).toBe(101);
    expect(profile.agente_nome).toBe('Agent Smith');
    expect(profile.agente_email).toBe('agent@example.com');
    expect(profile.agente_funcao).toBe('admin');
  });
});
