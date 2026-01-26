import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const logDebug = (action: string, data?: any) => {
  console.log(`[SessionGuard] ${new Date().toISOString()} - ${action}`, data || '');
};

// Intervalo de verificação (1 minuto)
const CHECK_INTERVAL_MS = 60 * 1000;
// Margem de segurança antes da expiração (5 minutos)
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
// Margem mínima para considerar sessão válida no momento do envio (1 minuto)
const MIN_VALID_BUFFER_MS = 60 * 1000;

export interface SessionGuardState {
  isSessionValid: boolean;
  isRefreshing: boolean;
  showReloginModal: boolean;
}

export function useSessionGuard() {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReloginModal, setShowReloginModal] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Verificar se token está válido com margem de segurança
  const isTokenValid = useCallback(async (bufferMs: number = MIN_VALID_BUFFER_MS): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.expires_at) {
        logDebug('No session or expiry found');
        return false;
      }
      
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      logDebug('Token expiry check', { 
        expiresAt: new Date(expiresAt).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + 's',
        bufferMs,
        isValid: timeUntilExpiry > bufferMs 
      });
      
      return timeUntilExpiry > bufferMs;
    } catch (error) {
      logDebug('Error checking token validity', { error });
      return false;
    }
  }, []);

  // Tentar refresh de sessão
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      logDebug('Attempting session refresh...');
      setIsRefreshing(true);
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshData?.session) {
        logDebug('Session refreshed successfully');
        setIsSessionValid(true);
        return true;
      }
      
      logDebug('Refresh failed', { error: refreshError?.message });
      return false;
    } catch (error) {
      logDebug('Refresh error', { error });
      return false;
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Tentar re-autenticação via access_key
  const reAuthWithAccessKey = useCallback(async (): Promise<boolean> => {
    try {
      const authStatus = localStorage.getItem('telemarketing_auth_status');
      
      if (!authStatus) {
        logDebug('No telemarketing_auth_status found for re-auth');
        return false;
      }
      
      const parsed = JSON.parse(authStatus);
      
      if (!parsed.accessKey || !parsed.email) {
        logDebug('Missing email or accessKey in auth status');
        return false;
      }
      
      logDebug('Attempting re-auth via access_key', { email: parsed.email });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.accessKey,
      });
      
      if (!error) {
        logDebug('Re-auth successful');
        setIsSessionValid(true);
        return true;
      }
      
      logDebug('Re-auth failed', { error: error.message });
      return false;
    } catch (error) {
      logDebug('Re-auth error', { error });
      return false;
    }
  }, []);

  /**
   * Garantir que a sessão está válida antes de uma operação
   * Tenta refresh e re-auth automaticamente se necessário
   * @returns true se sessão válida, false se precisa relogin
   */
  const ensureValidSession = useCallback(async (): Promise<boolean> => {
    logDebug('ensureValidSession called');
    
    // 1. Verificar se token ainda é válido
    const tokenValid = await isTokenValid();
    
    if (tokenValid) {
      logDebug('Token is valid, proceeding');
      setIsSessionValid(true);
      return true;
    }
    
    // 2. Tentar refresh
    logDebug('Token expired or expiring soon, attempting refresh...');
    const refreshed = await refreshSession();
    
    if (refreshed) {
      return true;
    }
    
    // 3. Tentar re-auth com access_key
    logDebug('Refresh failed, attempting re-auth...');
    const reAuthed = await reAuthWithAccessKey();
    
    if (reAuthed) {
      return true;
    }
    
    // 4. Falhou - mostrar modal de relogin
    logDebug('All recovery attempts failed, showing relogin modal');
    setIsSessionValid(false);
    setShowReloginModal(true);
    return false;
  }, [isTokenValid, refreshSession, reAuthWithAccessKey]);

  // Monitor proativo em background
  useEffect(() => {
    mountedRef.current = true;
    
    const checkAndRefreshProactively = async () => {
      if (!mountedRef.current) return;
      
      try {
        // Verificar se token expira em menos de 5 minutos
        const stillValid = await isTokenValid(EXPIRY_BUFFER_MS);
        
        if (!stillValid) {
          logDebug('Token expiring soon, proactive refresh...');
          
          // Tentar refresh proativo
          const refreshed = await refreshSession();
          
          if (!refreshed) {
            // Tentar re-auth
            await reAuthWithAccessKey();
          }
        }
      } catch (error) {
        logDebug('Proactive check error', { error });
      }
    };
    
    // Verificar imediatamente ao montar
    checkAndRefreshProactively();
    
    // Configurar verificação periódica
    checkIntervalRef.current = setInterval(checkAndRefreshProactively, CHECK_INTERVAL_MS);
    
    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isTokenValid, refreshSession, reAuthWithAccessKey]);

  // Handler para fechar modal
  const closeReloginModal = useCallback(() => {
    setShowReloginModal(false);
  }, []);

  return {
    isSessionValid,
    isRefreshing,
    showReloginModal,
    ensureValidSession,
    setShowReloginModal,
    closeReloginModal,
  };
}
