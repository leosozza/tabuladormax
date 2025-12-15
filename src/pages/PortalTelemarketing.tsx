import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TelemarketingAccessKeyForm, TelemarketingOperatorData } from '@/components/portal-telemarketing/TelemarketingAccessKeyForm';
import { TelemarketingPortalLayout } from '@/components/portal-telemarketing/TelemarketingPortalLayout';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'telemarketing_operator';
const CONTEXT_KEY = 'telemarketing_context';

const PortalTelemarketing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');

  const [operatorData, setOperatorData] = useState<TelemarketingOperatorData | null>(() => {
    const prefix = '[TM][Portal]';
    console.groupCollapsed(`${prefix} init`, {
      path: location.pathname,
      search: location.search,
      href: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });

    let result: TelemarketingOperatorData | null = null;

    try {
      const keys = Object.keys(localStorage);
      console.log(`${prefix} localStorage keys`, keys);

      const saved = localStorage.getItem(STORAGE_KEY);
      console.log(`${prefix} ${STORAGE_KEY} raw`, saved);

      if (!saved) {
        result = null;
        return result;
      }

      result = JSON.parse(saved) as TelemarketingOperatorData;
      console.log(`${prefix} ${STORAGE_KEY} parsed`, {
        bitrix_id: result.bitrix_id,
        cargo: result.cargo,
        operator_name: result.operator_name,
      });

      return result;
    } catch (e) {
      console.error(`${prefix} error restoring session`, e);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CONTEXT_KEY);
        console.warn(`${prefix} cleared corrupted session keys`);
      } catch (clearErr) {
        console.error(`${prefix} error clearing localStorage`, clearErr);
      }
      result = null;
      return result;
    } finally {
      console.log(
        `${prefix} final operatorData`,
        result
          ? {
              bitrix_id: result.bitrix_id,
              cargo: result.cargo,
              operator_name: result.operator_name,
            }
          : null
      );
      console.groupEnd();
    }
  });

  // Pós-restauração: garantir contexto e aplicar deep-link
  useEffect(() => {
    const prefix = '[TM][Portal]';

    if (!operatorData) {
      console.log(`${prefix} post-restore skipped: no operatorData`);
      return;
    }

    console.groupCollapsed(`${prefix} post-restore`, { redirectTo });

    try {
      const ctx = localStorage.getItem(CONTEXT_KEY);
      console.log(`${prefix} ${CONTEXT_KEY} raw`, ctx);

      if (!ctx) {
        const newCtx = {
          bitrix_id: operatorData.bitrix_id,
          cargo: operatorData.cargo,
          name: operatorData.operator_name,
        };
        localStorage.setItem(CONTEXT_KEY, JSON.stringify(newCtx));
        console.log(`${prefix} ${CONTEXT_KEY} persisted`, newCtx);
      }
    } catch (e) {
      console.error(`${prefix} error saving context`, e);
    }

    if (redirectTo) {
      console.warn(`${prefix} navigating to deep-link`, { redirectTo });
      navigate(redirectTo, { replace: true });
    }

    console.groupEnd();
  }, [operatorData, redirectTo, navigate]);

  // Refresh automático da foto do operador
  useEffect(() => {
    const refreshOperatorPhoto = async () => {
      if (!operatorData) return;
      
      const prefix = '[TM][Portal]';
      
      try {
        const { data, error } = await supabase
          .from('telemarketing_operators')
          .select('photo_url')
          .eq('bitrix_id', operatorData.bitrix_id)
          .single();
        
        if (error) {
          console.error(`${prefix} error fetching photo:`, error);
          return;
        }
        
        if (data?.photo_url && data.photo_url !== operatorData.operator_photo) {
          console.log(`${prefix} updating operator photo from DB`);
          const updatedData = { ...operatorData, operator_photo: data.photo_url };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
          setOperatorData(updatedData);
        }
      } catch (e) {
        console.error(`${prefix} error refreshing photo:`, e);
      }
    };
    
    refreshOperatorPhoto();
  }, [operatorData?.bitrix_id]);

  const handleAccessGranted = (data: TelemarketingOperatorData) => {
    const prefix = '[TM][Portal]';

    console.groupCollapsed(`${prefix} access granted`, {
      bitrix_id: data.bitrix_id,
      cargo: data.cargo,
      operator_name: data.operator_name,
      redirectTo,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Salvar contexto também para acesso direto às sub-rotas
    localStorage.setItem(
      CONTEXT_KEY,
      JSON.stringify({
        bitrix_id: data.bitrix_id,
        cargo: data.cargo,
        name: data.operator_name,
      })
    );

    console.log(`${prefix} persisted ${STORAGE_KEY} + ${CONTEXT_KEY}`);

    setOperatorData(data);

    // Se veio de um deep-link, seguir automaticamente para a rota desejada
    if (redirectTo) {
      console.warn(`${prefix} navigating to deep-link after login`, { redirectTo });
      navigate(redirectTo, { replace: true });
    }

    console.groupEnd();
  };

  const handleLogout = () => {
    console.warn('[TM][Portal] logout: clearing session');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    setOperatorData(null);
  };


  return (
    <div className="min-h-screen bg-background">
      {!operatorData ? (
        <TelemarketingAccessKeyForm onAccessGranted={handleAccessGranted} />
      ) : (
        <TelemarketingPortalLayout
          operatorData={operatorData}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default PortalTelemarketing;
