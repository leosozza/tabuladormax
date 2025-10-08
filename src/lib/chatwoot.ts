import { supabase } from "@/integrations/supabase/client";

export interface ChatwootContact {
  bitrix_id: string;
  conversation_id: number;
  contact_id: number;
  name: string;
  phone_number?: string;
  email?: string;
  thumbnail?: string;
  custom_attributes: Record<string, any>;
  additional_attributes: Record<string, any>;
  last_activity_at?: number;
}

export interface ChatwootEventData {
  conversation: {
    id: number;
    meta: {
      sender: {
        id: number;
        name: string;
        phone_number?: string;
        email?: string;
        thumbnail?: string;
        custom_attributes: Record<string, any>;
        additional_attributes: Record<string, any>;
        last_activity_at?: number;
      };
      assignee?: {
        id: number;
        name: string;
        email: string;
      };
    };
  };
  contact: {
    id: number;
    name: string;
    custom_attributes: Record<string, any>;
  };
}

/**
 * Salva ou atualiza um contato do Chatwoot no Supabase
 */
export async function saveChatwootContact(contactData: ChatwootContact): Promise<void> {
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
    custom_attributes: (data.custom_attributes as Record<string, any>) || {},
    additional_attributes: (data.additional_attributes as Record<string, any>) || {},
    last_activity_at: data.last_activity_at || undefined,
  };
}

/**
 * Extrai dados do evento do Chatwoot
 */
export function extractChatwootData(eventData: ChatwootEventData): ChatwootContact | null {
  const sender = eventData.conversation?.meta?.sender;
  const bitrixId = sender?.custom_attributes?.idbitrix;

  if (!bitrixId || !sender) {
    return null;
  }

  return {
    bitrix_id: String(bitrixId),
    conversation_id: eventData.conversation.id,
    contact_id: sender.id,
    name: sender.name,
    phone_number: sender.phone_number,
    email: sender.email,
    thumbnail: sender.thumbnail,
    custom_attributes: sender.custom_attributes || {},
    additional_attributes: sender.additional_attributes || {},
    last_activity_at: sender.last_activity_at,
  };
}
