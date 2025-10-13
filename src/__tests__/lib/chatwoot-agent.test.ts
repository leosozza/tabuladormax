// ============================================
// Test for Chatwoot Agent Mapping
// ============================================
// Tests for extracting and mapping agent data from Chatwoot events

import { describe, it, expect } from 'vitest';
import { extractChatwootData, extractAssigneeData, type ChatwootEventData } from '@/lib/chatwoot';

describe('Chatwoot Agent Data Extraction', () => {
  it('should extract assignee data from data.currentAgent (priority)', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            phone_number: '+1234567890',
            email: 'john@example.com',
            custom_attributes: { idbitrix: '789' },
            additional_attributes: {},
          },
          assignee: {
            id: 999,
            name: 'Old Agent',
            email: 'old@example.com',
            role: 'agent',
          },
        },
      },
      data: {
        contact: {
          id: 456,
          name: 'John Doe',
          custom_attributes: { idbitrix: '789' },
          additional_attributes: {},
        },
        currentAgent: {
          id: 101,
          name: 'Agent Smith',
          email: 'agent@example.com',
          role: 'admin',
        },
      },
    };

    const assigneeData = extractAssigneeData(eventData);

    expect(assigneeData).not.toBeNull();
    expect(assigneeData?.email).toBe('agent@example.com');
    expect(assigneeData?.name).toBe('Agent Smith');
    expect(assigneeData?.role).toBe('admin');
  });

  it('should extract assignee data from event with conversation.meta.assignee', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            phone_number: '+1234567890',
            email: 'john@example.com',
            custom_attributes: { idbitrix: '789' },
            additional_attributes: {},
          },
          assignee: {
            id: 101,
            name: 'Agent Smith',
            email: 'agent@example.com',
            role: 'admin',
          },
        },
      },
    };

    const assigneeData = extractAssigneeData(eventData);

    expect(assigneeData).not.toBeNull();
    expect(assigneeData?.email).toBe('agent@example.com');
    expect(assigneeData?.name).toBe('Agent Smith');
    expect(assigneeData?.role).toBe('admin');
  });

  it('should return null when assignee data is incomplete', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            custom_attributes: { idbitrix: '789' },
            additional_attributes: {},
          },
          assignee: {
            id: 101,
            name: 'Agent Smith',
            email: '', // Empty email
          },
        },
      },
    };

    const assigneeData = extractAssigneeData(eventData);

    expect(assigneeData).toBeNull();
  });

  it('should extract contact data with agent info from conversation.meta.sender format', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            phone_number: '+1234567890',
            email: 'john@example.com',
            custom_attributes: { idbitrix: '789' },
            additional_attributes: {},
          },
          assignee: {
            id: 101,
            name: 'Agent Smith',
            email: 'agent@example.com',
            role: 'agent',
          },
        },
      },
    };

    const contactData = extractChatwootData(eventData);

    expect(contactData).not.toBeNull();
    expect(contactData?.bitrix_id).toBe('789');
    expect(contactData?.name).toBe('John Doe');
    expect(contactData?.currentAgent).toEqual({
      id: 101,
      name: 'Agent Smith',
      email: 'agent@example.com',
      role: 'agent',
    });
    expect(contactData?.assignee).toEqual({
      id: 101,
      name: 'Agent Smith',
      email: 'agent@example.com',
      role: 'agent',
    });
  });

  it('should extract contact data with agent info from data.contact format', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'Dummy',
            custom_attributes: {},
            additional_attributes: {},
          },
          assignee: {
            id: 101,
            name: 'Agent Smith',
            email: 'agent@example.com',
          },
        },
      },
      data: {
        contact: {
          id: 456,
          name: 'John Doe',
          phone_number: '+1234567890',
          email: 'john@example.com',
          custom_attributes: { idbitrix: '789' },
          additional_attributes: {},
        },
        conversation: {
          id: 123,
        },
      },
    };

    const contactData = extractChatwootData(eventData);

    expect(contactData).not.toBeNull();
    expect(contactData?.bitrix_id).toBe('789');
    expect(contactData?.name).toBe('John Doe');
    expect(contactData?.currentAgent).toEqual({
      id: 101,
      name: 'Agent Smith',
      email: 'agent@example.com',
      role: undefined,
    });
  });

  it('should prioritize data.currentAgent over conversation.meta.assignee', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            custom_attributes: { idbitrix: '789' },
            additional_attributes: {},
          },
          assignee: {
            id: 999,
            name: 'Old Agent',
            email: 'old@example.com',
            role: 'agent',
          },
        },
      },
      data: {
        contact: {
          id: 456,
          name: 'John Doe',
          custom_attributes: { idbitrix: '789' },
          additional_attributes: {},
        },
        currentAgent: {
          id: 101,
          name: 'Agent Smith',
          email: 'agent@example.com',
          role: 'admin',
        },
      },
    };

    const contactData = extractChatwootData(eventData);

    expect(contactData).not.toBeNull();
    expect(contactData?.currentAgent).toEqual({
      id: 101,
      name: 'Agent Smith',
      email: 'agent@example.com',
      role: 'admin',
    });
    expect(contactData?.assignee).toEqual({
      id: 101,
      name: 'Agent Smith',
      email: 'agent@example.com',
      role: 'admin',
    });
  });

  it('should handle missing assignee gracefully', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            custom_attributes: { idbitrix: '789' },
            additional_attributes: {},
          },
          // No assignee
        },
      },
    };

    const contactData = extractChatwootData(eventData);

    expect(contactData).not.toBeNull();
    expect(contactData?.bitrix_id).toBe('789');
    expect(contactData?.currentAgent).toBeUndefined();
    expect(contactData?.assignee).toBeUndefined();
  });

  it('should return null when idbitrix is missing', () => {
    const eventData: ChatwootEventData = {
      conversation: {
        id: 123,
        meta: {
          sender: {
            id: 456,
            name: 'John Doe',
            custom_attributes: {}, // No idbitrix
            additional_attributes: {},
          },
        },
      },
    };

    const contactData = extractChatwootData(eventData);

    expect(contactData).toBeNull();
  });
});
