import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { AdminAccessModal } from '@/components/admin/AdminAccessModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { ResyncDateClosedButton } from '@/components/admin/ResyncDateClosedButton';

export default function AdminHub() {
  const [modalOpen, setModalOpen] = useState(true);
  const [syncingSpa, setSyncingSpa] = useState(false);
  const navigate = useNavigate();

  // Quando o modal fechar, volta para home-choice
  useEffect(() => {
    if (!modalOpen) {
      navigate('/home-choice', { replace: true });
    }
  }, [modalOpen, navigate]);

  const handleSyncSpa = async () => {
    setSyncingSpa(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-spa-entities');
      
      if (error) {
        console.error('Erro ao sincronizar SPAs:', error);
        toast.error('Erro ao sincronizar entidades SPA');
      } else {
        toast.success(`${data?.totalSynced || 0} entidades SPA sincronizadas`);
      }
    } catch (err) {
      console.error('Erro ao chamar função:', err);
      toast.error('Erro ao sincronizar entidades SPA');
    } finally {
      setSyncingSpa(false);
    }
  };

  return (
    <AdminPageLayout 
      title="Administrativo" 
      description="Painel de administração do sistema"
    >
      <AdminAccessModal open={modalOpen} onOpenChange={setModalOpen} />
      
      <div className="space-y-6">
        <ResyncDateClosedButton />
      </div>
      
      {/* ✅ FASE 6: Botão para sincronizar SPAs manualmente */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleSyncSpa}
          disabled={syncingSpa}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncingSpa ? 'animate-spin' : ''}`} />
          {syncingSpa ? 'Sincronizando...' : 'Sincronizar SPAs'}
        </Button>
      </div>
    </AdminPageLayout>
  );
}
