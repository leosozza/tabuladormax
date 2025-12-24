import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Vozes disponíveis do ElevenLabs
export const ELEVENLABS_VOICES = {
  roger: { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'Masculino' },
  sarah: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Feminino' },
  laura: { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Feminino (PT-BR)' },
  charlie: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Masculino' },
  george: { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Masculino' },
  callum: { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Masculino' },
  river: { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'Neutro' },
  liam: { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Masculino' },
  alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Feminino' },
  matilda: { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Feminino' },
  will: { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Masculino' },
  jessica: { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Feminino' },
  eric: { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Masculino' },
  chris: { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Masculino' },
  brian: { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Masculino' },
  daniel: { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Masculino' },
  lily: { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Feminino' },
  bill: { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Masculino' },
} as const;

export type VoiceKey = keyof typeof ELEVENLABS_VOICES;

export interface SystemSettings {
  defaultVoice: VoiceKey;
  defaultAIProvider: string;
  defaultAIModel: string;
}

interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  is_free: boolean;
  requires_api_key: boolean;
  supports_tools: boolean;
  models: string[];
  default_model: string | null;
}

export function useSystemSettings() {
  const queryClient = useQueryClient();

  // Buscar configurações do config_kv
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const keys = ['system_default_voice', 'system_default_ai_provider', 'system_default_ai_model'];
      
      const { data, error } = await supabase
        .from('config_kv')
        .select('key, value')
        .in('key', keys);

      if (error) throw error;

      const configMap = new Map(data?.map(row => [row.key, row.value]) || []);
      
      return {
        defaultVoice: (configMap.get('system_default_voice') as VoiceKey) || 'laura',
        defaultAIProvider: (configMap.get('system_default_ai_provider') as string) || 'lovable',
        defaultAIModel: (configMap.get('system_default_ai_model') as string) || 'google/gemini-2.5-flash',
      };
    },
  });

  // Buscar provedores de IA disponíveis
  const { data: aiProviders } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async (): Promise<AIProvider[]> => {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      
      return (data || []).map(p => {
        // Converter models de Json para string[]
        let models: string[] = [];
        if (Array.isArray(p.models)) {
          models = p.models.map((m: unknown) => {
            // Se for objeto com id, pegar o id
            if (typeof m === 'object' && m !== null && 'id' in m) {
              return (m as { id: string }).id;
            }
            // Se já for string, usar direto
            if (typeof m === 'string') {
              return m;
            }
            return null;
          }).filter((m): m is string => m !== null);
        }
        return {
          id: p.id,
          name: p.name,
          display_name: p.display_name,
          is_active: p.is_active ?? false,
          is_free: p.is_free ?? false,
          requires_api_key: p.requires_api_key ?? false,
          supports_tools: p.supports_tools ?? false,
          default_model: p.default_model,
          models,
        };
      });
    },
  });

  // Salvar configurações
  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<SystemSettings>) => {
      const updates: { key: string; value: string }[] = [];
      
      if (newSettings.defaultVoice !== undefined) {
        updates.push({ key: 'system_default_voice', value: JSON.stringify(newSettings.defaultVoice) });
      }
      if (newSettings.defaultAIProvider !== undefined) {
        updates.push({ key: 'system_default_ai_provider', value: JSON.stringify(newSettings.defaultAIProvider) });
      }
      if (newSettings.defaultAIModel !== undefined) {
        updates.push({ key: 'system_default_ai_model', value: JSON.stringify(newSettings.defaultAIModel) });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('config_kv')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Configurações salvas com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  // Testar voz
  const testVoice = async (voiceKey: VoiceKey) => {
    const voice = ELEVENLABS_VOICES[voiceKey];
    const testText = `Olá, eu sou ${voice.name}. Esta é uma demonstração da minha voz.`;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: testText, voiceName: voiceKey }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        await audio.play();
      }
    } catch (error) {
      console.error('Erro ao testar voz:', error);
      toast.error('Erro ao testar voz');
      throw error;
    }
  };

  return {
    settings,
    isLoading,
    aiProviders: aiProviders || [],
    saveSettings: saveSettings.mutate,
    isSaving: saveSettings.isPending,
    testVoice,
  };
}
