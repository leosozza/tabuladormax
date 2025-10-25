import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueueDB, QueuedEvaluation } from '@/lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from './use-toast';

export const useOfflineQueue = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  // Initialize database and count pending items
  useEffect(() => {
    const initAndCount = async () => {
      try {
        await offlineQueueDB.init();
        const count = await offlineQueueDB.countPending();
        setPendingCount(count);
      } catch (error) {
        console.error('[OfflineQueue] Failed to initialize:', error);
      }
    };
    initAndCount();
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncPendingEvaluations();
    }
  }, [isOnline, pendingCount]);

  const addToQueue = useCallback(async (
    leadId: number,
    quality: string,
    userId: string
  ): Promise<void> => {
    try {
      const evaluation: Omit<QueuedEvaluation, 'id'> = {
        leadId,
        quality,
        userId,
        timestamp: new Date().toISOString(),
        synced: false,
        attempts: 0,
      };

      await offlineQueueDB.add(evaluation);
      const count = await offlineQueueDB.countPending();
      setPendingCount(count);

      console.log('[OfflineQueue] Evaluation queued:', { leadId, quality });
      toast({
        title: '📥 Avaliação salva localmente',
        description: 'Será sincronizada quando a conexão retornar',
      });
    } catch (error) {
      console.error('[OfflineQueue] Failed to queue evaluation:', error);
      throw error;
    }
  }, []);

  const syncPendingEvaluations = useCallback(async (): Promise<void> => {
    if (isSyncing) return;

    setIsSyncing(true);
    console.log('[OfflineQueue] Starting sync...');

    try {
      const pending = await offlineQueueDB.getPending();
      
      if (pending.length === 0) {
        setPendingCount(0);
        setIsSyncing(false);
        return;
      }

      console.log(`[OfflineQueue] Syncing ${pending.length} evaluations...`);
      
      let successCount = 0;
      let failCount = 0;

      for (const evaluation of pending) {
        try {
          // Update attempts
          await offlineQueueDB.update(evaluation.id, {
            attempts: evaluation.attempts + 1,
            lastAttempt: new Date().toISOString(),
          });

          // Sync to Supabase
          const { error } = await supabase
            .from('leads')
            .update({
              qualidade_lead: evaluation.quality,
              analisado_por: evaluation.userId,
              data_analise: evaluation.timestamp,
            })
            .eq('id', evaluation.leadId);

          if (error) throw error;

          // Mark as synced
          await offlineQueueDB.update(evaluation.id, {
            synced: true,
            error: undefined,
          });

          // Delete synced item
          await offlineQueueDB.delete(evaluation.id);
          
          successCount++;
          console.log(`[OfflineQueue] Synced evaluation for lead ${evaluation.leadId}`);
        } catch (error) {
          failCount++;
          console.error(`[OfflineQueue] Failed to sync evaluation:`, error);
          
          // Update error info
          await offlineQueueDB.update(evaluation.id, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Remove if too many failed attempts
          if (evaluation.attempts >= 5) {
            console.warn(`[OfflineQueue] Removing evaluation after ${evaluation.attempts} failed attempts`);
            await offlineQueueDB.delete(evaluation.id);
          }
        }
      }

      const newCount = await offlineQueueDB.countPending();
      setPendingCount(newCount);

      if (successCount > 0) {
        toast({
          title: '✅ Sincronização concluída',
          description: `${successCount} avaliação(ões) sincronizada(s)`,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['leads-pending-analysis'] });
        queryClient.invalidateQueries({ queryKey: ['analysis-session-stats'] });
      }

      if (failCount > 0) {
        toast({
          title: '⚠️ Algumas avaliações falharam',
          description: `${failCount} avaliação(ões) não puderam ser sincronizadas`,
          variant: 'destructive',
        });
      }

      console.log(`[OfflineQueue] Sync complete: ${successCount} success, ${failCount} failed`);
    } catch (error) {
      console.error('[OfflineQueue] Sync failed:', error);
      toast({
        title: 'Erro na sincronização',
        description: 'Não foi possível sincronizar as avaliações',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient]);

  const clearQueue = useCallback(async (): Promise<void> => {
    try {
      await offlineQueueDB.clear();
      setPendingCount(0);
      toast({
        title: 'Fila limpa',
        description: 'Todas as avaliações pendentes foram removidas',
      });
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear queue:', error);
      throw error;
    }
  }, []);

  const getPendingEvaluations = useCallback(async (): Promise<QueuedEvaluation[]> => {
    try {
      return await offlineQueueDB.getPending();
    } catch (error) {
      console.error('[OfflineQueue] Failed to get pending evaluations:', error);
      return [];
    }
  }, []);

  return {
    pendingCount,
    isSyncing,
    addToQueue,
    syncPendingEvaluations,
    clearQueue,
    getPendingEvaluations,
  };
};
