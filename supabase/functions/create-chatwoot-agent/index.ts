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
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      throw new Error("name, email e password são obrigatórios");
    }

    // Buscar configurações do Chatwoot
    const CHATWOOT_URL = Deno.env.get("CHATWOOT_BASE_URL") || "https://chat.ybrasil.com.br";
    const ACCOUNT_ID = Deno.env.get("CHATWOOT_ACCOUNT_ID") || "1";
    const TOKEN = Deno.env.get("CHATWOOT_API_TOKEN");

    if (!TOKEN) {
      throw new Error("CHATWOOT_API_TOKEN não configurado");
    }

    console.log(`📝 Verificando se agente com email "${email}" já existe no Chatwoot`);

    // Buscar todos os agentes para verificar se email já existe
    const listRes = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/agents`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": TOKEN,
        },
      }
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error("❌ Erro ao buscar agentes:", listRes.status, errorText);
      throw new Error(`Erro ao buscar agentes do Chatwoot: ${listRes.status}`);
    }

    const agents = await listRes.json();
    const existingAgent = agents.find((agent: any) => agent.email === email);

    if (existingAgent) {
      console.log(`✅ Agente com email "${email}" já existe (ID: ${existingAgent.id})`);
      return new Response(
        JSON.stringify({
          success: true,
          agent: existingAgent,
          existed: true,
          message: "Agente já existia no Chatwoot",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Criar novo agente
    console.log(`📝 Criando novo agente no Chatwoot: "${name}" (${email})`);

    const createRes = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/agents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": TOKEN,
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: role || "agent",
        }),
      }
    );

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("❌ Erro ao criar agente:", createRes.status, errorText);
      throw new Error(`Erro ao criar agente no Chatwoot: ${createRes.status}`);
    }

    const newAgent = await createRes.json();
    console.log(`✅ Agente criado com sucesso no Chatwoot (ID: ${newAgent.id})`);

    return new Response(
      JSON.stringify({
        success: true,
        agent: newAgent,
        existed: false,
        message: "Agente criado com sucesso no Chatwoot",
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
