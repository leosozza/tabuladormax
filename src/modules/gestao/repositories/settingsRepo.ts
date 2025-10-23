// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { AppSettings } from './types';

/**
 * Get application settings from Supabase.
 * Returns the first settings row or null if none exists.
 */
export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    console.log('🔍 [SettingsRepo] Buscando configurações da aplicação...');
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ [SettingsRepo] Erro ao buscar configurações:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }

    console.log('✅ [SettingsRepo] Configurações carregadas com sucesso');
    return data;
  } catch (error) {
    console.error('❌ [SettingsRepo] Exceção ao buscar configurações:', error);
    return null;
  }
}

/**
 * Save application settings to Supabase.
 * Uses upsert to update existing settings or create new ones.
 */
export async function saveAppSettings(settings: Omit<AppSettings, 'id' | 'updated_at'>): Promise<AppSettings | null> {
  try {
    console.log('💾 [SettingsRepo] Salvando configurações...');
    
    // First, try to get existing settings to update
    const existing = await getAppSettings();
    
    if (existing) {
      // Update existing settings
      console.log('📝 [SettingsRepo] Atualizando configurações existentes');
      const { data, error } = await supabase
        .from('app_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('❌ [SettingsRepo] Erro ao atualizar configurações:', error);
        return null;
      }

      console.log('✅ [SettingsRepo] Configurações atualizadas com sucesso');
      return data;
    } else {
      // Insert new settings
      console.log('➕ [SettingsRepo] Criando novas configurações');
      const { data, error } = await supabase
        .from('app_settings')
        .insert([settings])
        .select()
        .single();

      if (error) {
        console.error('❌ [SettingsRepo] Erro ao criar configurações:', error);
        return null;
      }

      console.log('✅ [SettingsRepo] Configurações criadas com sucesso');
      return data;
    }
  } catch (error) {
    console.error('❌ [SettingsRepo] Exceção ao salvar configurações:', error);
    return null;
  }
}