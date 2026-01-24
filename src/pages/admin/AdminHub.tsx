import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Bot,
  GraduationCap,
  Search,
  AlertTriangle,
  MonitorDot,
  Workflow,
  Plug,
  Cpu,
  ScrollText,
  Gauge,
  MapPin,
  LucideIcon,
  Repeat,
  TestTube,
  Mic,
  HardDrive,
  Send,
} from 'lucide-react';
import { ResyncDateClosedButton } from '@/components/admin/ResyncDateClosedButton';
import { AdminCategorySection, AdminOption } from '@/components/admin/AdminCategorySection';

interface CategoryConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  options: AdminOption[];
}

// Definição de todas as ferramentas administrativas organizadas por categoria
const adminCategories: Record<string, CategoryConfig> = {
  monitoring: {
    title: 'Monitoramento & Diagnósticos',
    description: 'Logs, métricas e diagnósticos do sistema',
    icon: MonitorDot,
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    options: [
      {
        path: '/admin/dashboard',
        icon: LayoutDashboard,
        title: 'Dashboard Unificado',
        description: 'Visão geral de monitoramento e diagnósticos',
        color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      },
      {
        path: '/admin/monitoring',
        icon: Gauge,
        title: 'Performance & Métricas',
        description: 'Métricas de desempenho do sistema',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      },
      {
        path: '/admin/logs',
        icon: ScrollText,
        title: 'Logs do Sistema',
        description: 'Visualizar logs de atividades',
        color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      },
      {
        path: '/admin/diagnostic',
        icon: TestTube,
        title: 'Diagnósticos',
        description: 'Diagnóstico avançado de problemas',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      },
      {
        path: '/admin/loop-monitor',
        icon: Repeat,
        title: 'Monitor de Loop',
        description: 'Detectar loops de mensagens',
        color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      },
      {
        path: '/admin/database-maintenance',
        icon: HardDrive,
        title: 'Manutenção do Banco',
        description: 'Limpeza e otimização do banco de dados',
        color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      },
    ],
  },
  sync: {
    title: 'Sincronização & Dados',
    description: 'Gerenciar sincronização e importação de dados',
    icon: Cloud,
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    options: [
      {
        path: '/admin/sync-monitor',
        icon: Cloud,
        title: 'Central de Sincronização',
        description: 'Monitorar e gerenciar sincronizações',
        color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      },
      {
        path: '/admin/sync-errors',
        icon: AlertTriangle,
        title: 'Erros de Sincronização',
        description: 'Visualizar e corrigir erros de sync',
        color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      },
      {
        path: '/admin/bitrix-sync',
        icon: RefreshCw,
        title: 'Central Bitrix',
        description: 'Sincronizar SPAs, mapeamentos e webhook',
        color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
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
        description: 'Re-processar leads do campo raw',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      },
      {
        path: '/admin/csv-import',
        icon: Upload,
        title: 'Importação CSV',
        description: 'Importar leads via arquivo CSV',
        color: 'bg-green-500/10 text-green-600 dark:text-green-400',
      },
      {
        path: '/admin/scouter-resend',
        icon: Send,
        title: 'Reenvio Mensagens Scouter',
        description: 'Reenviar confirmações que falharam',
        color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
      },
    ],
  },
  integrations: {
    title: 'Integrações',
    description: 'Conectar e configurar serviços externos',
    icon: Plug,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    options: [
      {
        path: '/admin/bitrix-integration',
        icon: Database,
        title: 'Integração Bitrix',
        description: 'Configurar conexão com Bitrix24',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      },
      {
        path: '/admin/gupshup-integration',
        icon: Smartphone,
        title: 'Integração Gupshup',
        description: 'Configurar WhatsApp via Gupshup',
        color: 'bg-green-500/10 text-green-600 dark:text-green-400',
      },
      {
        path: '/admin/template-management',
        icon: MessageSquare,
        title: 'Templates WhatsApp',
        description: 'Gerenciar templates Gupshup',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      },
      {
        path: '/admin/flow-builder',
        icon: Workflow,
        title: 'Flow Builder',
        description: 'Automações visuais e n8n',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      },
    ],
  },
  ai: {
    title: 'Inteligência Artificial',
    description: 'Configurar e treinar agentes de IA',
    icon: Cpu,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    options: [
      {
        path: '/admin/whatsapp-bot',
        icon: Bot,
        title: 'Bot WhatsApp',
        description: 'Atendimento automatizado por IA',
        color: 'bg-green-500/10 text-green-600 dark:text-green-400',
      },
      {
        path: '/admin/ai-training',
        icon: GraduationCap,
        title: 'Treinamento IA',
        description: 'Treinar e configurar o agente de IA',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      },
      {
        path: '/admin/agenciamento-training',
        icon: Mic,
        title: 'Assistente Produtor',
        description: 'Configurar assistente de voz do produtor',
        color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      },
      {
        path: '/admin/ai-playground',
        icon: TestTube,
        title: 'Playground IA',
        description: 'Testar e experimentar modelos de IA',
        color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
      },
    ],
  },
  config: {
    title: 'Configurações',
    description: 'Configurações gerais e mapeamentos',
    icon: Settings,
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    options: [
      {
        path: '/admin/config',
        icon: Settings,
        title: 'Configurações do Tabulador',
        description: 'Configurações gerais do sistema',
        color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      },
      {
        path: '/admin/agent-mapping',
        icon: UserCog,
        title: 'Mapeamento de Agentes',
        description: 'Vincular agentes Bitrix e Chatwoot',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      },
      {
        path: '/admin/field-management',
        icon: Database,
        title: 'Gestão de Campos',
        description: 'Configurar campos e mapeamentos',
        color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      },
      {
        path: '/admin/permissions',
        icon: Shield,
        title: 'Permissões de Acesso',
        description: 'Controle de acesso por perfil',
        color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      },
      {
        path: '/admin/system-settings',
        icon: Mic,
        title: 'IA & Voz',
        description: 'Provedores de IA e vozes padrão',
        color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      },
    ],
  },
  users: {
    title: 'Gestão de Usuários',
    description: 'Usuários, equipes e aplicativos',
    icon: Users,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    options: [
      {
        path: '/admin/users',
        icon: Users,
        title: 'Usuários & Equipes',
        description: 'Gestão de usuários do sistema',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      },
      {
        path: '/admin/app-releases',
        icon: Smartphone,
        title: 'App Android',
        description: 'Gerenciar versões do app',
        color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
      },
    ],
  },
  developers: {
    title: 'Desenvolvedores',
    description: 'APIs e ferramentas para desenvolvedores',
    icon: Key,
    color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    options: [
      {
        path: '/admin/api-keys',
        icon: Key,
        title: 'API Keys',
        description: 'Gerenciar chaves de acesso',
        color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      },
      {
        path: '/admin/api-docs',
        icon: FileText,
        title: 'Documentação API',
        description: 'Referência completa da API REST',
        color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      },
    ],
  },
};

// Flatten all options for permission checking
const allOptions = Object.values(adminCategories).flatMap((cat) => cat.options);

export default function AdminHub() {
  const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncingSpa, setSyncingSpa] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkPermissions = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAllowedPaths(new Set());
          return;
        }

        const permissionChecks = await Promise.all(
          allOptions.map(async (option) => {
            const { data: canAccess } = await supabase.rpc('can_access_route' as any, {
              _user_id: user.id,
              _route_path: option.path,
            });
            return { path: option.path, canAccess: canAccess === true };
          })
        );

        const allowed = new Set(
          permissionChecks
            .filter(({ canAccess }) => canAccess)
            .map(({ path }) => path)
        );

        setAllowedPaths(allowed);
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setAllowedPaths(new Set());
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  // Filter options based on permissions and search
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return Object.entries(adminCategories).map(([key, category]) => {
      const filteredOptions = category.options.filter((option) => {
        const hasPermission = allowedPaths.has(option.path);
        const matchesSearch = !query || 
          option.title.toLowerCase().includes(query) ||
          option.description.toLowerCase().includes(query);
        return hasPermission && matchesSearch;
      });

      return {
        key,
        ...category,
        filteredOptions,
        totalOptions: category.options.length,
      };
    }).filter((cat) => cat.filteredOptions.length > 0);
  }, [allowedPaths, searchQuery]);

  const totalAvailable = allowedPaths.size;
  const totalFiltered = filteredCategories.reduce((acc, cat) => acc + cat.filteredOptions.length, 0);

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
      title="Central Administrativa" 
      description="Todas as ferramentas administrativas organizadas por categoria"
    >
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ferramenta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!loading && (
          <p className="text-xs text-muted-foreground mt-2">
            {searchQuery 
              ? `${totalFiltered} ferramenta${totalFiltered !== 1 ? 's' : ''} encontrada${totalFiltered !== 1 ? 's' : ''}`
              : `${totalAvailable} ferramenta${totalAvailable !== 1 ? 's' : ''} disponíve${totalAvailable !== 1 ? 'is' : 'l'}`
            }
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery 
            ? 'Nenhuma ferramenta encontrada para sua busca.'
            : 'Nenhuma opção administrativa disponível para seu perfil.'
          }
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <AdminCategorySection
              key={category.key}
              title={category.title}
              description={category.description}
              icon={category.icon}
              color={category.color}
              options={category.filteredOptions}
              totalOptions={category.totalOptions}
              onNavigate={navigate}
              defaultExpanded={!searchQuery}
            />
          ))}
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
