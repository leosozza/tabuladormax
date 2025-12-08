import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "generate" | "revoke" | "rotate" | "list" | "get_usage";
  key_id?: string;
  name?: string;
  description?: string;
  scopes?: string[];
  rate_limit?: number;
  expires_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { action } = body;

    console.log(`[api-key-management] Action: ${action}, User: ${user.id}`);

    switch (action) {
      case "generate": {
        if (!body.name) {
          return new Response(
            JSON.stringify({ success: false, error: "Name is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("generate_api_key", {
          p_name: body.name,
          p_scopes: body.scopes || ["*"],
          p_description: body.description || null,
          p_rate_limit: body.rate_limit || 60,
          p_expires_at: body.expires_at || null,
        });

        if (error) {
          console.error("[api-key-management] Generate error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const keyData = data[0];
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              key_id: keyData.key_id,
              api_key: keyData.api_key,
              key_prefix: keyData.key_prefix,
              message: "⚠️ Guarde esta chave! Ela não será exibida novamente.",
            },
          }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "revoke": {
        if (!body.key_id) {
          return new Response(
            JSON.stringify({ success: false, error: "key_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("revoke_api_key", {
          p_key_id: body.key_id,
        });

        if (error) {
          console.error("[api-key-management] Revoke error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: { revoked: data } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "rotate": {
        if (!body.key_id) {
          return new Response(
            JSON.stringify({ success: false, error: "key_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("rotate_api_key", {
          p_key_id: body.key_id,
        });

        if (error) {
          console.error("[api-key-management] Rotate error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const keyData = data[0];
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              key_id: keyData.key_id,
              api_key: keyData.api_key,
              key_prefix: keyData.key_prefix,
              message: "⚠️ Nova chave gerada! Guarde-a, ela não será exibida novamente.",
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const { data, error } = await supabase
          .from("api_keys")
          .select(`
            id,
            name,
            description,
            key_prefix,
            scopes,
            rate_limit_per_minute,
            is_active,
            expires_at,
            created_at,
            last_used_at,
            usage_count
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[api-key-management] List error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_usage": {
        if (!body.key_id) {
          return new Response(
            JSON.stringify({ success: false, error: "key_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("api_key_usage_logs")
          .select("*")
          .eq("api_key_id", body.key_id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("[api-key-management] Get usage error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[api-key-management] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
