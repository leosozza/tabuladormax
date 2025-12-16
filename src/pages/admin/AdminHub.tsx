import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  RefreshCw,
  Users,
  Settings,
  UserCog,
  Shield,
  Activity,
  Cloud,
  LayoutDashboard,
  Upload,
  Database,
  MessageSquare,
  Smartphone,
  Loader2,
  FileText,
  Key,
} from 'lucide-react';
import { ResyncDateClosedButton } from '@/components/admin/ResyncDateClosedButton';

const adminOptions = [
  {
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    title: 'Monitoramento & Diagnósticos',
    description: 'Monitoramento, diagnósticos e logs unificados',
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    path: '/admin/users',
    icon: Users,
    title: 'Usuários',
    description: 'Gestão de usuários e equipes',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    path: '/admin/config',
    icon: Settings,
    title: 'Configurações',
    description: 'Configurações do sistema',
    color: 'bg-primary/10 text-primary',
  },
  {
    path: '/admin/agent-mapping',
    icon: UserCog,
    title: 'Mapeamento',
    description: 'Mapeamento de agentes',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    path: '/admin/permissions',
    icon: Shield,
    title: 'Permissões',
    description: 'Controle de acesso',
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  {
    path: '/admin/sync-monitor',
    icon: Cloud,
    title: 'Sincronização',
    description: 'Central de sincronização',
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    path: '/admin/csv-import',
    icon: Upload,
    title: 'Importação CSV',
    description: 'Importar leads via CSV',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    path: '/admin/lead-resync',
    icon: Activity,
    title: 'Resincronização Leads',
    description: 'Atualizar leads do Bitrix',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    path: '/admin/leads-reprocess',
    icon: Database,
    title: 'Re-processar Leads',
    description: 'Re-processar leads históricos do campo raw',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    path: '/admin/template-management',
    icon: MessageSquare,
    title: 'Templates WhatsApp',
    description: 'Gerenciar templates Gupshup',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    path: '/admin/gupshup-integration',
    icon: Smartphone,
    title: 'Integração Gupshup',
    description: 'Configurar WhatsApp via Gupshup',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    path: '/admin/stage-mappings',
    icon: Settings,
    title: 'Mapeamento de Stages',
    description: 'Configurar sincronização de status dos scouters',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    path: '/admin/spa-sync',
    icon: RefreshCw,
    title: 'Sincronizar SPAs',
    description: 'Sincronizar Scouters, Telemarketing e Produtores',
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  {
    path: '/admin/app-releases',
    icon: Smartphone,
    title: 'App Android',
    description: 'Gerenciar versões do aplicativo Android',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
  {
    path: '/admin/api-docs',
    icon: FileText,
    title: 'Documentação API',
    description: 'Referência completa da API REST',
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    path: '/admin/api-keys',
    icon: Key,
    title: 'API Keys',
    description: 'Gerenciar chaves de acesso à API',
    color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
];

export default function AdminHub() {
  const [filteredOptions, setFilteredOptions] = useState<typeof adminOptions>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSpa, setSyncingSpa] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPermissions = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setFilteredOptions([]);
          return;
        }

        const permissionChecks = await Promise.all(
          adminOptions.map(async (option) => {
            const { data: canAccess } = await supabase.rpc('can_access_route' as any, {
              _user_id: user.id,
              _route_path: option.path,
            });
            return { option, canAccess: canAccess === true };
          })
        );

        const allowed = permissionChecks
          .filter(({ canAccess }) => canAccess)
          .map(({ option }) => option);

        setFilteredOptions(allowed);
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setFilteredOptions([]);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

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
      title="Área Administrativa" 
      description="Escolha a ferramenta administrativa que deseja acessar"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredOptions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma opção administrativa disponível para seu perfil.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.path}
                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 group"
                onClick={() => navigate(option.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${option.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{option.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    {option.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <ResyncDateClosedButton />
      </div>
      
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
