import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Image } from "lucide-react";

export function SyncScouterPhotosButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      toast({
        title: "Sincronizando fotos...",
        description: "Buscando fotos dos scouters do Bitrix",
      });

      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');

      if (error) {
        throw error;
      }

      toast({
        title: "Fotos sincronizadas!",
        description: `${data.totalSynced} scouters atualizados com sucesso`,
      });

      // Recarregar a página para ver as fotos
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Erro ao sincronizar fotos:', error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Sincronizando...
        </>
      ) : (
        <>
          <Image className="w-4 h-4" />
          Sincronizar Fotos
        </>
      )}
    </Button>
  );
}
