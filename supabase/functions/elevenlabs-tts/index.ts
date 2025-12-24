import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice IDs for ElevenLabs
const VOICES: Record<string, string> = {
  roger: 'CwhRBWXzGAHq8TQ4Fs17',
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  laura: 'FGY2WhTYpPnrIDTdsKH5',
  charlie: 'IKne3meq5aSn9XLyUdCD',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  callum: 'N2lVS1w4EtoT3dr4eOWO',
  river: 'SAz9YHcvj6GT2YYXdXww',
  liam: 'TX3LPaxmHKxFdv7VOQHJ',
  alice: 'Xb7hH8MSUJpSbSDYk0k2',
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  will: 'bIHbv24MWmeRgasZH58o',
  jessica: 'cgSgspJ2msm6clMCkdW9',
  eric: 'cjVigY5qzO86Huf0OWal',
  chris: 'iP95p4xoKVk53GoZ742B',
  brian: 'nPczCjzI2devNBz1zQrb',
  daniel: 'onwK4e9ZLuTAKqWW03F9',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
  bill: 'pqHfZKP75CvOlQylNhV4',
};

// Buscar voz padrão do config_kv
async function getDefaultVoice(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return 'laura';
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('config_kv')
      .select('value')
      .eq('key', 'system_default_voice')
      .single();

    if (data?.value) {
      const voiceName = typeof data.value === 'string' ? data.value : String(data.value);
      return voiceName.replace(/"/g, '');
    }
  } catch (e) {
    console.error('[elevenlabs-tts] Error fetching default voice:', e);
  }
  return 'laura';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, voiceName } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY não configurada');
    }

    // Get voice ID - use provided voiceId, or look up by name, or fetch default from config
    let selectedVoiceId = voiceId;
    if (!selectedVoiceId && voiceName) {
      selectedVoiceId = VOICES[voiceName.toLowerCase()];
    }
    if (!selectedVoiceId) {
      const defaultVoiceName = await getDefaultVoice();
      selectedVoiceId = VOICES[defaultVoiceName.toLowerCase()] || VOICES.laura;
      console.log('[elevenlabs-tts] Using default voice from config:', defaultVoiceName);
    }

    console.log('[elevenlabs-tts] Generating speech for text:', text.substring(0, 50) + '...');
    console.log('[elevenlabs-tts] Using voice:', selectedVoiceId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[elevenlabs-tts] Error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log('[elevenlabs-tts] Generated audio, size:', audioBuffer.byteLength);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[elevenlabs-tts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
