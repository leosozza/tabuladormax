import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface LeadUpdate {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  scouter?: string;
  status?: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  timestamp: Date;
}

interface UseRealtimeLeadsOptions {
  enabled?: boolean;
  projectId?: string | null;
  scouterId?: string | null;
  onUpdate?: (update: LeadUpdate) => void;
}

/**
 * Hook for subscribing to real-time lead updates via Supabase Realtime
 * Provides incremental updates for efficient map rendering
 */
export function useRealtimeLeads(options: UseRealtimeLeadsOptions = {}) {
  const { enabled = true, projectId, scouterId, onUpdate } = options;
  const [updates, setUpdates] = useState<LeadUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addUpdate = useCallback((update: LeadUpdate) => {
    setUpdates(prev => [...prev, update]);
    if (onUpdate) {
      onUpdate(update);
    }
  }, [onUpdate]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Create a channel for lead updates
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        async (payload) => {
          console.log("Lead update received:", payload);
          
          try {
            // Fetch the complete lead data if needed
            const leadId = (payload.new as any)?.id || (payload.old as any)?.id;
            if (!leadId) return;

            // For DELETE events, we don't need to fetch
            if (payload.eventType === "DELETE") {
              addUpdate({
                id: leadId,
                name: "",
                lat: 0,
                lng: 0,
                event: "DELETE",
                timestamp: new Date(),
              });
              return;
            }

            // For INSERT and UPDATE, fetch complete data with geocoding
            const { data: lead, error } = await supabase
              .from("leads")
              .select("id, name, address, local_abordagem, scouter, status_fluxo, commercial_project_id")
              .eq("id", leadId)
              .single();

            if (error || !lead) {
              console.error("Error fetching lead:", error);
              return;
            }

            // Apply filters
            if (projectId && (lead as any).commercial_project_id !== projectId) {
              return;
            }
            if (scouterId && (lead as any).scouter !== scouterId) {
              return;
            }

            // In a production app, geocode the address here
            // For now, use simulated coordinates
            const baseCoords = { lat: -15.7801, lng: -47.9292 };
            const offset = 0.03;
            
            addUpdate({
              id: lead.id,
              name: lead.name || "Sem nome",
              lat: baseCoords.lat + (Math.random() - 0.5) * offset,
              lng: baseCoords.lng + (Math.random() - 0.5) * offset,
              address: lead.address,
              scouter: lead.scouter || undefined,
              status: lead.status_fluxo || undefined,
              event: payload.eventType as "INSERT" | "UPDATE",
              timestamp: new Date(),
            });
          } catch (error) {
            console.error("Error processing lead update:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      console.log("Unsubscribing from leads realtime");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, projectId, scouterId, addUpdate]);

  return {
    updates,
    clearUpdates,
    isConnected,
  };
}
