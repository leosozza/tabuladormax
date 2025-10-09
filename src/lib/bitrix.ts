export class BitrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BitrixError';
  }
}

export interface BitrixLead {
  ID: string;
  NAME?: string;
  TITLE?: string;
  UF_RESPONSAVEL?: string;
  ASSIGNED_BY_ID?: string;
  ASSIGNED_BY_NAME?: string;
  UF_IDADE?: string;
  AGE?: string;
  UF_LOCAL?: string;
  ADDRESS?: string;
  ADDRESS_CITY?: string;
  UF_SCOUTER?: string;
  UF_PHOTO?: string;
  PHOTO?: string;
  DATE_MODIFY?: string;
  [key: string]: any;
}

export interface BitrixField {
  ID: string;
  FIELD_NAME: string;
  TITLE: string;
  TYPE: string;
  name: string;  // Propriedade padronizada
  title: string; // Propriedade padronizada
  type: string;  // Propriedade padronizada
  items?: Array<{ ID: string; VALUE: string }>;
  [key: string]: any;
}

export async function listLeads(params?: { limit?: number }): Promise<BitrixLead[]> {
  const limit = params?.limit || 50;
  
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.list.json?select[]=*&order[DATE_MODIFY]=DESC&start=0`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar leads do Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    return (data.result || []).slice(0, limit);
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível conectar ao Bitrix');
  }
}

export async function getLead(id: string | number): Promise<BitrixLead> {
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.get.json?id=${id}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar lead do Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    return data.result;
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível conectar ao Bitrix');
  }
}

export async function updateLead(id: string | number, fields: Record<string, any>): Promise<void> {
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fields })
      }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao atualizar lead no Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível atualizar lead no Bitrix');
  }
}

export async function updateLeadViaWebhook(
  webhookUrl: string,
  leadId: string | number,
  fields: Record<string, any>
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, fields })
    });
    
    if (!response.ok) {
      throw new BitrixError('Falha ao atualizar via webhook');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do webhook');
    }
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível executar webhook');
  }
}

export async function getLeadFields(): Promise<BitrixField[]> {
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.fields.json`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar campos do Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    const fields = data.result || {};
    return Object.entries(fields).map(([key, value]: [string, any]) => {
      // Para campos personalizados do Bitrix (UF_CRM_*), verificar várias propriedades possíveis
      const displayTitle = value.formLabel || value.listLabel || value.title || 
                           value.label || value.name || key;
      
      // Log para debug (remover depois)
      if (key.startsWith('UF_CRM_')) {
        console.log('🔍 Campo personalizado:', key, {
          formLabel: value.formLabel,
          listLabel: value.listLabel,
          title: value.title,
          label: value.label,
          name: value.name,
          displayTitle
        });
      }
      
      return {
        ID: key,
        FIELD_NAME: key,
        TITLE: displayTitle,
        TYPE: value.type || 'string',
        // Propriedades padronizadas (minúsculas)
        name: key,
        title: displayTitle,
        type: value.type || 'string',
        items: value.items,
        ...value
      };
    });
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível buscar campos do Bitrix');
  }
}
