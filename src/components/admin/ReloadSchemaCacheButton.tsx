import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ReloadSchemaCacheButton() {
  const [loading, setLoading] = useState(false);

  const handleReload = async () => {
    try {
      setLoading(true);
      toast.info("Recarregando cache do schema...");

      const { data, error } = await supabase.functions.invoke('reload-schema-cache');

      if (error) throw error;

      if (data?.success) {
        toast.success("Cache do schema recarregado com sucesso!");
        // Recarregar página após 1 segundo
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error(data?.error || "Falha ao recarregar cache");
      }
    } catch (error: any) {
      console.error("Erro ao recarregar cache:", error);
      toast.error(error.message || "Erro ao recarregar cache do schema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleReload} 
      disabled={loading}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Recarregar Schema Cache
    </Button>
  );
}
