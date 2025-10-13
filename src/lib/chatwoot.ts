import { supabase } from "@/integrations/supabase/client";

export interface ChatwootContact {
  bitrix_id: string;
  conversation_id: number;
  contact_id: number;
  name: string;
  phone_number?: string;
  email?: string;
  thumbnail?: string;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
  last_activity_at?: number;
  currentAgent?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
}

export interface ChatwootEventData {
  conversation?: {
    id: number;
    meta: {
      sender: {
        id: number;
        name: string;
        phone_number?: string;
        email?: string;
        thumbnail?: string;
        custom_attributes: Record<string, unknown>;
        additional_attributes: Record<string, unknown>;
        last_activity_at?: number;
      };
      assignee?: {
        id: number;
        name: string;
        email: string;
        role?: string;
      };
    };
  };
  data?: {
    contact: {
      id: number;
      name: string;
      phone_number?: string;
      email?: string;
      thumbnail?: string;
      custom_attributes: Record<string, unknown>;
      additional_attributes?: Record<string, unknown>;
    };
    conversation?: {
      id: number;
    };
  };
}

/**
 * Salva ou atualiza um contato do Chatwoot no Supabase
 */
export async function saveChatwootContact(contactData: ChatwootContact): Promise<void> {
  console.log("💾 Salvando contato do Chatwoot com dados do agente:", {
    bitrix_id: contactData.bitrix_id,
    hasCurrentAgent: !!contactData.currentAgent,
    hasAssignee: !!contactData.assignee,
    currentAgent: contactData.currentAgent,
    assignee: contactData.assignee
  });

  const { error } = await supabase
    .from("chatwoot_contacts")
    .upsert({
      bitrix_id: contactData.bitrix_id,
      conversation_id: contactData.conversation_id,
      contact_id: contactData.contact_id,
      name: contactData.name,
      phone_number: contactData.phone_number,
      email: contactData.email,
      thumbnail: contactData.thumbnail,
      custom_attributes: contactData.custom_attributes,
      additional_attributes: contactData.additional_attributes,
      last_activity_at: contactData.last_activity_at,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "bitrix_id"
    });

  if (error) {
    console.error("Erro ao salvar contato do Chatwoot:", error);
    throw error;
  }
  
  console.log("✅ Contato salvo com sucesso no Supabase");
}

/**
 * Busca um contato do Chatwoot pelo bitrix_id
 */
export async function getChatwootContact(bitrixId: string): Promise<ChatwootContact | null> {
  const { data, error } = await supabase
    .from("chatwoot_contacts")
    .select("*")
    .eq("bitrix_id", bitrixId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar contato:", error);
    throw error;
  }

  if (!data) return null;

  return {
    bitrix_id: data.bitrix_id,
    conversation_id: data.conversation_id,
    contact_id: data.contact_id,
    name: data.name,
    phone_number: data.phone_number || undefined,
    email: data.email || undefined,
    thumbnail: data.thumbnail || undefined,
    custom_attributes: (data.custom_attributes as Record<string, unknown>) || {},
    additional_attributes: (data.additional_attributes as Record<string, unknown>) || {},
    last_activity_at: data.last_activity_at || undefined,
  };
}

/**
 * Extrai dados do evento do Chatwoot
 * Suporta duas estruturas:
 * 1. eventData.conversation.meta.sender (formato antigo)
 * 2. eventData.data.contact (formato novo)
 */
export interface ChatwootAssignee {
  email: string;
  name: string;
  role: string;
}

/**
 * Extrai dados do assignee do evento Chatwoot para auto-login
 */
export function extractAssigneeData(eventData: ChatwootEventData): ChatwootAssignee | null {
  const assignee = eventData.conversation?.meta?.assignee;
  
  if (!assignee?.email || !assignee?.name) {
    console.log("⚠️ Dados do assignee incompletos ou não encontrados");
    return null;
  }

  console.log("✅ Dados do assignee extraídos:", { email: assignee.email, name: assignee.name });
  
  return {
    email: assignee.email,
    name: assignee.name,
    role: assignee.role || 'agent'
  };
}

export function extractChatwootData(eventData: ChatwootEventData): ChatwootContact | null {
  // Extrair dados do assignee/agent se disponível
  const assignee = eventData.conversation?.meta?.assignee;
  const agentData = assignee ? {
    id: assignee.id,
    name: assignee.name,
    email: assignee.email,
    role: assignee.role
  } : undefined;

  console.log("🔍 Extraindo dados do Chatwoot com informações do agente:", {
    hasAssignee: !!assignee,
    agentData
  });

  // Tentar formato novo: eventData.data.contact
  if (eventData.data?.contact) {
    const contact = eventData.data.contact;
    const bitrixId = contact.custom_attributes?.idbitrix;
    
    if (!bitrixId) {
      console.log("⚠️ idbitrix não encontrado em data.contact.custom_attributes");
      return null;
    }

    console.log("✅ Usando formato data.contact - bitrix_id:", bitrixId);
    console.log("📋 Custom attributes encontrados:", Object.keys(contact.custom_attributes || {}));
    
    return {
      bitrix_id: String(bitrixId),
      conversation_id: eventData.data.conversation?.id || 0,
      contact_id: contact.id,
      name: contact.name,
      phone_number: contact.phone_number,
      email: contact.email,
      thumbnail: contact.custom_attributes?.foto || contact.thumbnail,
      custom_attributes: contact.custom_attributes || {},
      additional_attributes: contact.additional_attributes || {},
      last_activity_at: undefined,
      currentAgent: agentData,
      assignee: agentData,
    };
  }

  // Tentar formato antigo: eventData.conversation.meta.sender
  const sender = eventData.conversation?.meta?.sender;
  const bitrixId = sender?.custom_attributes?.idbitrix;

  if (!bitrixId || !sender) {
    console.log("⚠️ Nenhum formato reconhecido ou idbitrix não encontrado");
    return null;
  }

  console.log("✅ Usando formato conversation.meta.sender - bitrix_id:", bitrixId);

  return {
    bitrix_id: String(bitrixId),
    conversation_id: eventData.conversation!.id,
    contact_id: sender.id,
    name: sender.name,
    phone_number: sender.phone_number,
    email: sender.email,
    thumbnail: sender.thumbnail,
    custom_attributes: sender.custom_attributes || {},
    additional_attributes: sender.additional_attributes || {},
    last_activity_at: sender.last_activity_at,
    currentAgent: agentData,
    assignee: agentData,
  };
}
