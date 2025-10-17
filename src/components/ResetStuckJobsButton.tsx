import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ResetStuckJobsButton() {
  const [loading, setLoading] = useState(false);

  const resetStuckJobs = async () => {
    setLoading(true);
    
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('csv_import_jobs')
        .update({ 
          status: 'failed',
          error_details: [{ error: 'Job timeout - não processou após 10 minutos' }]
        })
        .eq('status', 'processing')
        .lt('started_at', tenMinutesAgo)
        .select();

      if (error) {
        console.error('Erro ao resetar jobs:', error);
        toast.error('Erro ao resetar jobs travados');
      } else {
        const count = data?.length || 0;
        if (count > 0) {
          toast.success(`${count} job(s) resetado(s) com sucesso`);
        } else {
          toast.info('Nenhum job travado encontrado');
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao resetar jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={resetStuckJobs}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Resetando...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4" />
          Resetar Jobs Travados
        </>
      )}
    </Button>
  );
}
