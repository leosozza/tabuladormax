import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, name, password } = await req.json();

    if (!agentId) {
      throw new Error("agentId é obrigatório");
    }

    if (!name && !password) {
      throw new Error("Ao menos name ou password devem ser fornecidos");
    }

    // Buscar configurações do Chatwoot
    const CHATWOOT_URL = Deno.env.get("CHATWOOT_BASE_URL") || "https://chat.ybrasil.com.br";
    const ACCOUNT_ID = Deno.env.get("CHATWOOT_ACCOUNT_ID") || "1";
    const TOKEN = Deno.env.get("CHATWOOT_API_TOKEN");

    if (!TOKEN) {
      throw new Error("CHATWOOT_API_TOKEN não configurado");
    }

    console.log(`📝 Atualizando agente ${agentId} no Chatwoot`);

    // Construir payload com apenas os campos fornecidos
    const payload: any = {};
    if (name) payload.name = name;
    if (password) payload.password = password;

    const updateRes = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/agents/${agentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": TOKEN,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("❌ Erro ao atualizar agente:", updateRes.status, errorText);
      throw new Error(`Erro ao atualizar agente no Chatwoot: ${updateRes.status}`);
    }

    const updatedAgent = await updateRes.json();
    console.log(`✅ Agente atualizado com sucesso no Chatwoot (ID: ${agentId})`);

    return new Response(
      JSON.stringify({
        success: true,
        agent: updatedAgent,
        message: "Agente atualizado com sucesso no Chatwoot",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
