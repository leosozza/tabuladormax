import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Nenhuma imagem enviada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Converter para base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ valid: true, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem. Responda APENAS com 'FACE_DETECTED' se houver pelo menos um rosto humano claramente visível, ou 'NO_FACE' se não houver rosto humano ou se o rosto estiver muito obscuro/cortado. Não inclua nenhuma explicação."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 20
      }),
    });

    if (!response.ok) {
      console.error('Erro na API Lovable:', response.status);
      return new Response(
        JSON.stringify({ valid: true, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || '';
    
    const hasFace = aiResponse.includes('FACE_DETECTED');
    
    console.log(`Face detection result: ${hasFace ? 'FACE_DETECTED' : 'NO_FACE'}`);
    
    return new Response(
      JSON.stringify({ 
        valid: hasFace,
        message: hasFace ? 'Rosto detectado' : 'Nenhum rosto detectado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Erro na detecção de rosto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    // Fallback: permitir a foto em caso de erro
    return new Response(
      JSON.stringify({ valid: true, fallback: true, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
