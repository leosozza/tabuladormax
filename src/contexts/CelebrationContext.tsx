import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TelemarketingNotification } from '@/hooks/useTelemarketingNotifications';

interface CelebrationState {
  open: boolean;
  clientName: string;
  projectName?: string;
}

interface CelebrationContextType {
  celebration: CelebrationState;
  showCelebration: (clientName: string, projectName?: string) => void;
  closeCelebration: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

interface CelebrationProviderProps {
  children: ReactNode;
  bitrixTelemarketingId: number | null;
}

export function CelebrationProvider({ children, bitrixTelemarketingId }: CelebrationProviderProps) {
  const [celebration, setCelebration] = useState<CelebrationState>({
    open: false,
    clientName: '',
    projectName: ''
  });

  const showCelebration = useCallback((clientName: string, projectName?: string) => {
    setCelebration({
      open: true,
      clientName,
      projectName: projectName || ''
    });
  }, []);

  const closeCelebration = useCallback(() => {
    setCelebration(prev => ({ ...prev, open: false }));
  }, []);

  // Listener de realtime para celebração
  useEffect(() => {
    if (!bitrixTelemarketingId) return;

    console.log('[CelebrationContext] Setting up realtime listener for operator:', bitrixTelemarketingId);

    const channel = supabase
      .channel(`global-celebration-${bitrixTelemarketingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemarketing_notifications',
          filter: `bitrix_telemarketing_id=eq.${bitrixTelemarketingId}`,
        },
        (payload) => {
          const notification = payload.new as TelemarketingNotification;
          
          // Se for notificação de cliente compareceu, mostrar celebração
          if (notification.type === 'cliente_compareceu') {
            console.log('🎉 [CelebrationContext] Cliente compareceu! Mostrando celebração:', notification);
            showCelebration(
              (notification.metadata?.nome_modelo as string) || 'Cliente',
              (notification.metadata?.projeto as string) || ''
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[CelebrationContext] Removing realtime channel');
      supabase.removeChannel(channel);
    };
  }, [bitrixTelemarketingId, showCelebration]);

  return (
    <CelebrationContext.Provider value={{ celebration, showCelebration, closeCelebration }}>
      {children}
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): CelebrationContextType {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}
