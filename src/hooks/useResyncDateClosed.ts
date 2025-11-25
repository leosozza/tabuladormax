import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResyncResult {
  success: boolean;
  message?: string;
  job?: {
    total_leads: number;
    processed: number;
    updated: number;
    skipped: number;
    errors: number;
    error_details: Array<{ lead_id: number; error: string }>;
  };
  duration_ms?: number;
  needs_more_calls?: boolean;
  remaining_estimate?: string;
}

interface UseResyncDateClosedReturn {
  resync: () => Promise<ResyncResult | null>;
  loading: boolean;
  progress: {
    totalProcessed: number;
    totalUpdated: number;
    totalSkipped: number;
    totalErrors: number;
    iterations: number;
  };
}

export function useResyncDateClosed(): UseResyncDateClosedReturn {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    totalProcessed: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    iterations: 0,
  });

  const resync = async (): Promise<ResyncResult | null> => {
    try {
      setLoading(true);
      setProgress({
        totalProcessed: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        totalErrors: 0,
        iterations: 0,
      });

      let needsMoreCalls = true;
      let iterations = 0;
      let cumulativeResult: ResyncResult = {
        success: true,
        job: {
          total_leads: 0,
          processed: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
          error_details: [],
        },
      };

      toast.info("Iniciando resincronização de DATE_CLOSED...");

      while (needsMoreCalls && iterations < 100) {
        iterations++;
        
        console.log(`🔄 Iteração ${iterations}...`);
        toast.loading(`Processando lote ${iterations}...`, { id: 'resync-progress' });

        const { data, error } = await supabase.functions.invoke<ResyncResult>(
          "resync-date-closed",
          { method: "POST" }
        );

        if (error) throw error;

        if (data?.success && data.job) {
          cumulativeResult.job!.processed += data.job.processed;
          cumulativeResult.job!.updated += data.job.updated;
          cumulativeResult.job!.skipped += data.job.skipped;
          cumulativeResult.job!.errors += data.job.errors;
          
          if (data.job.error_details) {
            cumulativeResult.job!.error_details.push(...data.job.error_details);
          }

          setProgress({
            totalProcessed: cumulativeResult.job!.processed,
            totalUpdated: cumulativeResult.job!.updated,
            totalSkipped: cumulativeResult.job!.skipped,
            totalErrors: cumulativeResult.job!.errors,
            iterations,
          });

          needsMoreCalls = data.needs_more_calls || false;

          console.log(`✅ Lote ${iterations}: ${data.job.updated} atualizados, ${data.job.skipped} ignorados, ${data.job.errors} erros`);
          
          if (!needsMoreCalls) {
            toast.success(
              `Resincronização concluída! ${cumulativeResult.job!.updated} leads atualizados em ${iterations} iterações.`,
              { id: 'resync-progress' }
            );
          }
        } else {
          throw new Error(data?.message || "Falha ao reprocessar lote");
        }

        // Pequeno delay entre chamadas para não sobrecarregar
        if (needsMoreCalls) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (iterations >= 100) {
        toast.warning("Atingido limite de 100 iterações. Execute novamente se necessário.", { id: 'resync-progress' });
      }

      return cumulativeResult;
    } catch (error: any) {
      console.error("Erro ao resincronizar:", error);
      toast.error(error.message || "Erro ao resincronizar DATE_CLOSED", { id: 'resync-progress' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { resync, loading, progress };
}
