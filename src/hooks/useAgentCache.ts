import { supabase } from "@/integrations/supabase/client";

export type AgentProfile = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
};

class AgentCache {
  private cache = new Map<string, AgentProfile | null>();

  async preload(ids: Array<string | null | undefined>) {
    const idsToFetch = Array.from(
      new Set(
        ids
          .filter((id): id is string => Boolean(id))
          .filter((id) => !this.cache.has(id))
      )
    );

    if (idsToFetch.length === 0) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", idsToFetch);

      if (error) {
        console.error("agentCache preload error", error);
        idsToFetch.forEach((id) => this.cache.set(id, null));
        return;
      }

      (data ?? []).forEach((profile) => {
        this.cache.set(profile.id, profile as AgentProfile);
      });

      idsToFetch.forEach((id) => {
        if (!this.cache.has(id)) {
          this.cache.set(id, null);
        }
      });
    } catch (err) {
      console.error("agentCache preload exception", err);
      idsToFetch.forEach((id) => this.cache.set(id, null));
    }
  }

  get(id: string | null | undefined) {
    if (!id) return null;
    return this.cache.get(id) ?? null;
  }

  clear() {
    this.cache.clear();
  }
}

const agentCache = new AgentCache();

export const useAgentCache = () => agentCache;

export default agentCache;
