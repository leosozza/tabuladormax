import { useState, useEffect } from 'react';
import { AccessKeyForm } from '@/components/portal-scouter/AccessKeyForm';
import { ScouterDashboard } from '@/components/portal-scouter/ScouterDashboard';
import { supabase } from '@/integrations/supabase/client';

interface ScouterData {
  id: string;
  name: string;
  photo: string | null;
  bitrix_id: number | null;
  tier: string | null;
}

const STORAGE_KEY = 'scouter_session';

const PortalScouter = () => {
  const [scouterData, setScouterData] = useState<ScouterData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as ScouterData;
      }
      return null;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  // Atualiza sessão se bitrix_id ou tier estiverem faltando (sessões antigas)
  useEffect(() => {
    const updateSession = async () => {
      if (scouterData && (!scouterData.bitrix_id || !scouterData.tier)) {
        try {
          const { data, error } = await supabase
            .from('scouters')
            .select('bitrix_id, tier')
            .eq('id', scouterData.id)
            .single();
          
          if (!error && data) {
            const updatedData = { 
              ...scouterData, 
              bitrix_id: data.bitrix_id || scouterData.bitrix_id,
              tier: data.tier || scouterData.tier
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
            setScouterData(updatedData);
          }
        } catch (err) {
          console.error('Erro ao atualizar sessão:', err);
        }
      }
    };
    
    updateSession();
  }, [scouterData?.id]);

  const handleAccessGranted = (data: ScouterData) => {
    // Limpar contextos de outros portais para evitar conflitos de sessão
    localStorage.removeItem('telemarketing_operator');
    localStorage.removeItem('telemarketing_context');
    localStorage.removeItem('produtor_session');
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setScouterData(data);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setScouterData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {!scouterData ? (
        <AccessKeyForm onAccessGranted={handleAccessGranted} />
      ) : (
        <ScouterDashboard 
          scouterData={scouterData} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default PortalScouter;
