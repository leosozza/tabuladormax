import { supabase } from '@/integrations/supabase/client';
import type { TabuladorMaxConfig } from './types';
import { createTabuladorClient } from './tabulador/createTabuladorClient';

/**
 * Get TabuladorMax configuration from localStorage (temporary storage)
 * In production, this should be stored in a secure backend or environment variables
 */
export async function getTabuladorConfig(): Promise<TabuladorMaxConfig | null> {
  try {
    console.log('🔍 [TabuladorConfigRepo] Buscando configuração do TabuladorMax...');
    
    // Try to get from localStorage first
    const stored = localStorage.getItem('tabuladormax_config');
    if (stored) {
      const config = JSON.parse(stored) as TabuladorMaxConfig;
      
      // VALIDAR SE TEM project_id - se não tiver, ignorar localStorage
      if (!config.project_id) {
        console.log('⚠️ [TabuladorConfigRepo] Config do localStorage sem project_id, buscando do banco...');
        localStorage.removeItem('tabuladormax_config'); // Limpar cache inválido
      } else {
        console.log('✅ [TabuladorConfigRepo] Configuração carregada do localStorage');
        return config;
      }
    }

    // Try to get from Supabase table if it exists
    const { data, error } = await supabase
      .from('tabulador_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // Table might not exist, that's OK - we'll use localStorage
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('ℹ️ [TabuladorConfigRepo] Tabela tabulador_config não existe, usando localStorage');
        return getDefaultConfig();
      }
      console.error('❌ [TabuladorConfigRepo] Erro ao buscar configuração:', error);
      return getDefaultConfig();
    }

    if (data) {
      const typedData = data as TabuladorMaxConfig;
      // Store in localStorage for quick access
      localStorage.setItem('tabuladormax_config', JSON.stringify(typedData));
      console.log('✅ [TabuladorConfigRepo] Configuração carregada do Supabase');
      return typedData;
    }

    return getDefaultConfig();
  } catch (error) {
    console.error('❌ [TabuladorConfigRepo] Exceção ao buscar configuração:', error);
    return getDefaultConfig();
  }
}

/**
 * Save TabuladorMax configuration to localStorage and optionally to Supabase
 */
export async function saveTabuladorConfig(config: Omit<TabuladorMaxConfig, 'id' | 'created_at' | 'updated_at'>): Promise<TabuladorMaxConfig | null> {
  try {
    console.log('💾 [TabuladorConfigRepo] Salvando configuração do TabuladorMax...');
    
    const configWithTimestamp: Partial<TabuladorMaxConfig> = {
      ...config,
      updated_at: new Date().toISOString(),
    };

    // Always save to localStorage
    localStorage.setItem('tabuladormax_config', JSON.stringify(configWithTimestamp));
    console.log('✅ [TabuladorConfigRepo] Configuração salva no localStorage');

    // Try to save to Supabase if table exists
    try {
      console.log('📤 [TabuladorConfigRepo] Tentando UPSERT no Supabase...');
      console.log('📋 [TabuladorConfigRepo] Dados:', {
        project_id: config.project_id,
        url: config.url,
        enabled: config.enabled
      });
      
      const { data, error } = await supabase
        .from('tabulador_config')
        .upsert(
          {
            project_id: config.project_id,
            url: config.url,
            publishable_key: config.publishable_key,
            enabled: config.enabled,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'project_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('❌ [TabuladorConfigRepo] Erro UPSERT:', error);
        console.error('📊 [TabuladorConfigRepo] Código do erro:', error.code);
        console.error('💬 [TabuladorConfigRepo] Mensagem:', error.message);
        throw error; // IMPORTANTE: Re-lançar erro para o painel capturar
      }
      
      console.log('✅ [TabuladorConfigRepo] UPSERT bem-sucedido!');
      console.log('📋 [TabuladorConfigRepo] Dados salvos:', data);
      
      // Atualizar localStorage com dados completos (incluindo ID)
      localStorage.setItem('tabuladormax_config', JSON.stringify(data));
      
      return data as TabuladorMaxConfig;
    } catch (dbError) {
      console.error('❌ [TabuladorConfigRepo] Exceção no UPSERT:', dbError);
      // REMOVER fallback silencioso - deixar erro subir
      throw dbError;
    }
  } catch (error) {
    console.error('❌ [TabuladorConfigRepo] Exceção ao salvar configuração:', error);
    return null;
  }
}

/**
 * Get default TabuladorMax configuration
 */
function getDefaultConfig(): TabuladorMaxConfig {
  return {
    project_id: 'gkvvtfqfggddzotxltxf',
    url: 'https://gkvvtfqfggddzotxltxf.supabase.co',
    publishable_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU',
    enabled: true,
  };
}

/**
 * Test connection to TabuladorMax (EXTERNAL DATABASE)
 * 
 * ⚠️ IMPORTANTE: Esta função consulta o banco TabuladorMax EXTERNO
 * ================================================================
 * A tabela 'leads' aqui referenciada é do banco TabuladorMax, NÃO do Supabase local.
 * É correto usar 'leads' aqui pois é o schema do banco externo.
 * 
 * O Supabase LOCAL usa 'fichas' e sincroniza com TabuladorMax 'leads'.
 */
export async function testTabuladorConnection(config: TabuladorMaxConfig): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    console.log('🧪 [TabuladorConfigRepo] Testando conexão com TabuladorMax...');
    console.log('📡 [TabuladorConfigRepo] URL:', config.url);
    console.log('🔑 [TabuladorConfigRepo] Project ID:', config.project_id);

    // Create a Supabase client for TabuladorMax with isolated auth storage
    const tabuladorClient = createTabuladorClient(config.url, config.publishable_key);

    // Try to query the leads table
    const { data, error, count } = await tabuladorClient
      .from('leads')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('❌ [TabuladorConfigRepo] Erro ao testar conexão:', error);
      return {
        success: false,
        message: `Erro: ${error.message} (Código: ${error.code})`,
      };
    }

    console.log('✅ [TabuladorConfigRepo] Conexão bem-sucedida!');
    console.log(`📊 [TabuladorConfigRepo] Total de leads: ${count ?? 0}`);

    return {
      success: true,
      message: `Conexão bem-sucedida! Encontrados ${count ?? 0} leads na tabela.`,
      count: count ?? 0,
    };
  } catch (error) {
    console.error('❌ [TabuladorConfigRepo] Exceção ao testar conexão:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido ao testar conexão',
    };
  }
}