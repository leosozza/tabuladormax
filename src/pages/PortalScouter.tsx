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

// Mapeamento de IDs numéricos do Bitrix para labels legíveis
const TIER_MAP: Record<string, string> = {
  '9006': 'Iniciante',
  '9008': 'Pleno',
  '9010': 'Premium',
  '9012': 'Sênior',
  '9014': 'Júnior',
};

// Resolver tier numérico para label
const resolveTier = (tier: string | null): string | null => {
  if (!tier) return null;
  return TIER_MAP[tier] || tier;
};

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

  // Atualiza sessão para sincronizar dados do banco (bitrix_id, tier, name)
  useEffect(() => {
    const updateSession = async () => {
      if (scouterData) {
        try {
          const { data, error } = await supabase
            .from('scouters')
            .select('bitrix_id, tier, name')
            .eq('id', scouterData.id)
            .single();
          
          if (!error && data) {
            // Resolver tier do banco (pode vir como ID ou label)
            const resolvedDbTier = resolveTier(data.tier);
            // Resolver tier atual da sessão (pode ser ID legado)
            const resolvedSessionTier = resolveTier(scouterData.tier);
            
            // Verificar se há diferenças para atualizar
            const needsUpdate = 
              data.bitrix_id !== scouterData.bitrix_id ||
              resolvedDbTier !== resolvedSessionTier ||
              data.name !== scouterData.name;
            
            if (needsUpdate) {
              const updatedData = { 
                ...scouterData, 
                bitrix_id: data.bitrix_id || scouterData.bitrix_id,
                tier: resolvedDbTier || resolvedSessionTier,
                name: data.name || scouterData.name
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
              setScouterData(updatedData);
              console.log('Sessão atualizada com dados do banco:', updatedData);
            }
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
