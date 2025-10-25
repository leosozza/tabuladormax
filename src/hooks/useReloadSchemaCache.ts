import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseReloadSchemaCacheReturn {
  reload: () => Promise<boolean>;
  loading: boolean;
}

export function useReloadSchemaCache(): UseReloadSchemaCacheReturn {
  const [loading, setLoading] = useState(false);

  const reload = async (): Promise<boolean> => {
    try {
      setLoading(true);
      toast.info("Recarregando cache do schema...");

      const { data, error } = await supabase.functions.invoke(
        "reload-gestao-scouter-schema-cache",
        { method: "POST" }
      );

      if (error) throw error;

      if (data?.success) {
        toast.success("Cache do schema recarregado com sucesso!");
        return true;
      } else {
        throw new Error(data?.error || "Falha ao recarregar cache");
      }
    } catch (error: any) {
      console.error("Erro ao recarregar cache:", error);
      toast.error(error.message || "Erro ao recarregar cache do schema");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { reload, loading };
}
