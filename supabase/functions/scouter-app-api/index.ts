import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "login" | "get_stats" | "get_ranking" | "get_projects" | "get_leads";
  access_key?: string;
  scouter_name?: string;
  params?: {
    date_preset?: "today" | "yesterday" | "week" | "month";
    project_id?: string;
    start_date?: string;
    end_date?: string;
  };
}

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
    const { action, access_key, scouter_name, params } = body;

    console.log(`[scouter-app-api] Action: ${action}, Scouter: ${scouter_name || "N/A"}`);

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

        result = {
          scouter_id: data[0].scouter_id,
          scouter_name: data[0].scouter_name,
          scouter_photo: data[0].scouter_photo,
        };
        break;
      }

      case "get_stats": {
        if (!scouter_name) {
          return new Response(
            JSON.stringify({ success: false, error: "scouter_name is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const dateRange = getDateRange(params?.date_preset);

        const { data, error } = await supabase.rpc("get_leads_stats", {
          p_start_date: params?.start_date || dateRange.start,
          p_end_date: params?.end_date || dateRange.end,
          p_project_id: params?.project_id || null,
          p_scouter: scouter_name,
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
        if (!scouter_name) {
          return new Response(
            JSON.stringify({ success: false, error: "scouter_name is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const dateRange = getDateRange(params?.date_preset);

        const { data, error } = await supabase.rpc("get_scouter_ranking_position", {
          p_scouter_name: scouter_name,
          p_start_date: params?.start_date || dateRange.start,
          p_end_date: params?.end_date || dateRange.end,
          p_project_id: params?.project_id || null,
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
        if (!scouter_name) {
          return new Response(
            JSON.stringify({ success: false, error: "scouter_name is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("get_scouter_projects", {
          p_scouter_name: scouter_name,
        });

        if (error) throw error;

        result = data || [];
        break;
      }

      case "get_leads": {
        if (!scouter_name) {
          return new Response(
            JSON.stringify({ success: false, error: "scouter_name is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const dateRange = getDateRange(params?.date_preset);

        const { data, error } = await supabase.rpc("get_scouter_leads_simple", {
          p_scouter_name: scouter_name,
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
