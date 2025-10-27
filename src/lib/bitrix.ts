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

export async function updateLead(id: string | number, fields: Record<string, unknown>): Promise<void> {
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
  fields: Record<string, unknown>
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
    return Object.entries(fields).map(([key, value]: [string, any]) => ({
      ID: key,
      FIELD_NAME: key,
      TITLE: value.formLabel || value.listLabel || value.title || key,
      TYPE: value.type || 'string',
      // Propriedades padronizadas (minúsculas)
      name: key,
      title: value.formLabel || value.listLabel || value.title || key,
      type: value.type || 'string',
      items: value.items,
      ...value
    }));
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível buscar campos do Bitrix');
  }
}

// Buscar etapas (STATUS_ID) do Bitrix
export async function getLeadStatuses(): Promise<Array<{ ID: string; NAME: string; SORT: number }>> {
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.status.list.json?filter[ENTITY_ID]=STATUS`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar etapas do Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    return (data.result || []).sort((a: any, b: any) => (a.SORT || 0) - (b.SORT || 0));
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível buscar etapas do Bitrix');
  }
}

// Product API Types
export interface BitrixProduct {
  ID: string;
  NAME: string;
  PRICE: number;
  CURRENCY_ID: string;
  DESCRIPTION?: string;
  SECTION_ID?: string;
  CATALOG_ID?: string;
  VAT_INCLUDED?: 'Y' | 'N';
  VAT_ID?: string;
  MEASURE?: number;
  ACTIVE?: 'Y' | 'N';
  [key: string]: any;
}

export interface BitrixProductPrice {
  PRODUCT_ID: string;
  PRICE: number;
  CURRENCY: string;
  PRICE_SCALE?: number;
  EXTRA_ID?: string;
  [key: string]: any;
}

/**
 * Listar produtos do catálogo Bitrix24
 */
export async function listProducts(params?: { 
  limit?: number;
  filter?: Record<string, any>;
}): Promise<BitrixProduct[]> {
  const limit = params?.limit || 50;
  
  try {
    let url = `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.product.list.json?select[]=*&order[NAME]=ASC`;
    
    // Adicionar filtros se fornecidos
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        url += `&filter[${key}]=${encodeURIComponent(value)}`;
      });
    }
    
    const response = await fetch(url, { method: 'GET' });
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar produtos do Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    const products = (data.result || []).slice(0, limit);
    
    // Normalizar dados do produto
    return products.map((product: any) => {
      const normalizedPrice = parseFloat(product.PRICE) || 0;
      return {
        ...product,
        ID: product.ID,
        NAME: product.NAME || 'Produto sem nome',
        PRICE: normalizedPrice,
        CURRENCY_ID: product.CURRENCY_ID || 'BRL',
        DESCRIPTION: product.DESCRIPTION,
        SECTION_ID: product.SECTION_ID,
        CATALOG_ID: product.CATALOG_ID,
        VAT_INCLUDED: product.VAT_INCLUDED,
        VAT_ID: product.VAT_ID,
        MEASURE: product.MEASURE,
        ACTIVE: product.ACTIVE,
      };
    });
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível conectar ao Bitrix para buscar produtos');
  }
}

/**
 * Buscar um produto específico do Bitrix24
 */
export async function getProduct(id: string | number): Promise<BitrixProduct> {
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.product.get.json?id=${id}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar produto do Bitrix');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    const product = data.result;
    
    const normalizedPrice = parseFloat(product.PRICE) || 0;
    
    return {
      ...product,
      ID: product.ID,
      NAME: product.NAME || 'Produto sem nome',
      PRICE: normalizedPrice,
      CURRENCY_ID: product.CURRENCY_ID || 'BRL',
      DESCRIPTION: product.DESCRIPTION,
      SECTION_ID: product.SECTION_ID,
      CATALOG_ID: product.CATALOG_ID,
      VAT_INCLUDED: product.VAT_INCLUDED,
      VAT_ID: product.VAT_ID,
      MEASURE: product.MEASURE,
      ACTIVE: product.ACTIVE,
    };
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível buscar produto do Bitrix');
  }
}

/**
 * Buscar preço de um produto com descontos aplicados
 */
export async function getProductPrice(productId: string | number): Promise<BitrixProductPrice> {
  try {
    // Primeiro buscar o produto
    const product = await getProduct(productId);
    
    // Retornar estrutura de preço
    return {
      PRODUCT_ID: product.ID,
      PRICE: product.PRICE,
      CURRENCY: product.CURRENCY_ID,
    };
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível buscar preço do produto');
  }
}

/**
 * Buscar produtos em linha de pedido/negócio
 */
export async function getProductRows(entityType: 'deal' | 'lead', entityId: string | number): Promise<any[]> {
  try {
    const response = await fetch(
      `https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.${entityType}.productrows.get.json?id=${entityId}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      throw new BitrixError('Falha ao buscar produtos do pedido');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new BitrixError(data.error_description || 'Erro do Bitrix');
    }
    
    return data.result || [];
  } catch (error) {
    if (error instanceof BitrixError) throw error;
    throw new BitrixError('Não foi possível buscar produtos do pedido');
  }
}
