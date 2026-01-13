import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "login" | "get_stats" | "get_ranking" | "get_projects" | "get_leads";
  access_key?: string;
  bitrix_id?: number;
  params?: {
    date_preset?: "today" | "yesterday" | "week" | "month";
    project_id?: string;
    start_date?: string;
    end_date?: string;
  };
}

// Session token duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { action, access_key, bitrix_id, params } = body;

    console.log(`[scouter-app-api] Action: ${action}, Bitrix ID: ${bitrix_id || "N/A"}`);

    // ==========================================
    // SESSION TOKEN VALIDATION (for all actions except login)
    // ==========================================
    if (action !== "login") {
      const authHeader = req.headers.get("Authorization");
      
      if (!authHeader?.startsWith("Bearer ")) {
        console.log("[scouter-app-api] Missing or invalid Authorization header");
        return new Response(
          JSON.stringify({ success: false, error: "Authorization required. Use Bearer <session_token>" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sessionToken = authHeader.replace("Bearer ", "");

      // Validate session token
      const { data: session, error: sessionError } = await supabase
        .from("scouter_sessions")
        .select("scouter_id, bitrix_id, expires_at")
        .eq("session_token", sessionToken)
        .single();

      if (sessionError || !session) {
        console.log("[scouter-app-api] Invalid session token");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid session token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        console.log("[scouter-app-api] Session token expired");
        // Clean up expired session
        await supabase.from("scouter_sessions").delete().eq("session_token", sessionToken);
        return new Response(
          JSON.stringify({ success: false, error: "Session expired. Please login again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate that bitrix_id matches the session
      if (bitrix_id && session.bitrix_id !== bitrix_id) {
        console.log(`[scouter-app-api] bitrix_id mismatch: request=${bitrix_id}, session=${session.bitrix_id}`);
        return new Response(
          JSON.stringify({ success: false, error: "Access denied. bitrix_id does not match session." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last_used_at
      await supabase
        .from("scouter_sessions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("session_token", sessionToken);
    }

    // Helper: Get scouter name by bitrix_id
    const getScouterName = async (bitrixId: number): Promise<string> => {
      const { data, error } = await supabase
        .from("scouters")
        .select("name")
        .eq("bitrix_id", bitrixId)
        .single();

      if (error || !data) {
        console.error(`[scouter-app-api] Scouter not found for bitrix_id: ${bitrixId}`);
        throw new Error("Scouter not found");
      }
      return data.name.trim();
    };

    // Calculate date range based on preset
    const getDateRange = (preset?: string) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (preset) {
        case "today":
          return {
            start: today.toISOString(),
            end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
          };
        case "yesterday":
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          return {
            start: yesterday.toISOString(),
            end: new Date(today.getTime() - 1).toISOString(),
          };
        case "week":
          const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return {
            start: weekStart.toISOString(),
            end: now.toISOString(),
          };
        case "month":
        default:
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          return {
            start: monthStart.toISOString(),
            end: now.toISOString(),
          };
      }
    };

    let result: unknown;

    switch (action) {
      case "login": {
        if (!access_key) {
          return new Response(
            JSON.stringify({ success: false, error: "access_key is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("validate_scouter_access_key", {
          p_access_key: access_key,
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid access key" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch bitrix_id from scouters table
        const { data: scouterData, error: scouterError } = await supabase
          .from("scouters")
          .select("bitrix_id")
          .eq("id", data[0].scouter_id)
          .single();

        if (scouterError) {
          console.error("[scouter-app-api] Error fetching scouter bitrix_id:", scouterError);
        }

        const scouterBitrixId = scouterData?.bitrix_id;

        if (!scouterBitrixId) {
          return new Response(
            JSON.stringify({ success: false, error: "Scouter does not have a bitrix_id configured" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate session token
        const sessionToken = crypto.randomUUID() + "-" + Date.now();
        const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

        // Remove any existing sessions for this scouter (single session per scouter)
        await supabase
          .from("scouter_sessions")
          .delete()
          .eq("scouter_id", data[0].scouter_id);

        // Create new session
        const { error: sessionInsertError } = await supabase
          .from("scouter_sessions")
          .insert({
            scouter_id: data[0].scouter_id,
            bitrix_id: scouterBitrixId,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
          });

        if (sessionInsertError) {
          console.error("[scouter-app-api] Error creating session:", sessionInsertError);
          throw new Error("Failed to create session");
        }

        console.log(`[scouter-app-api] Login successful for scouter: ${data[0].scouter_name}, session expires: ${expiresAt.toISOString()}`);

        result = {
          scouter_id: data[0].scouter_id,
          bitrix_id: scouterBitrixId,
          scouter_name: data[0].scouter_name,
          scouter_photo: data[0].scouter_photo,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        };
        break;
      }

      case "get_stats": {
        if (!bitrix_id) {
          return new Response(
            JSON.stringify({ success: false, error: "bitrix_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const scouterName = await getScouterName(bitrix_id);
        const dateRange = getDateRange(params?.date_preset);

        const { data, error } = await supabase.rpc("get_leads_stats", {
          p_start_date: params?.start_date || dateRange.start,
          p_end_date: params?.end_date || dateRange.end,
          p_project_id: params?.project_id || null,
          p_scouter: scouterName,
          p_fonte: "Scouter - Fichas",
        });

        if (error) throw error;

        result = data && data.length > 0 ? data[0] : {
          total: 0,
          confirmados: 0,
          compareceram: 0,
          pendentes: 0,
          com_foto: 0,
          agendados: 0,
          reagendar: 0,
        };
        break;
      }

      case "get_ranking": {
        if (!bitrix_id) {
          return new Response(
            JSON.stringify({ success: false, error: "bitrix_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const scouterName = await getScouterName(bitrix_id);
        const dateRange = getDateRange(params?.date_preset);

        const { data, error } = await supabase.rpc("get_scouter_ranking_position", {
          p_scouter_name: scouterName,
          p_start_date: params?.start_date || dateRange.start,
          p_end_date: params?.end_date || dateRange.end,
        });

        if (error) throw error;

        result = data && data.length > 0 ? data[0] : {
          rank_position: null,
          total_scouters: 0,
          scouter_fichas: 0,
          first_place_name: null,
          first_place_fichas: 0,
        };
        break;
      }

      case "get_projects": {
        if (!bitrix_id) {
          return new Response(
            JSON.stringify({ success: false, error: "bitrix_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const scouterName = await getScouterName(bitrix_id);

        const { data, error } = await supabase.rpc("get_scouter_projects", {
          p_scouter_name: scouterName,
        });

        if (error) throw error;

        result = data || [];
        break;
      }

      case "get_leads": {
        if (!bitrix_id) {
          return new Response(
            JSON.stringify({ success: false, error: "bitrix_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const scouterName = await getScouterName(bitrix_id);
        const dateRange = getDateRange(params?.date_preset);

        const { data, error } = await supabase.rpc("get_scouter_leads_simple", {
          p_scouter_name: scouterName,
          p_date_from: params?.start_date || dateRange.start,
          p_date_to: params?.end_date || dateRange.end,
          p_project_id: params?.project_id || null,
        });

        if (error) throw error;

        result = data || [];
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[scouter-app-api] Action ${action} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[scouter-app-api] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
