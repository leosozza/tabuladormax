import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Settings,
  FileText,
  AlertTriangle,
  Shield,
  UserCog,
  Activity,
  Cloud,
  LayoutDashboard,
  Upload,
  Database,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

interface AdminAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    path: '/admin/stage-mappings',
    icon: Settings,
    title: 'Mapeamento de Stages',
    description: 'Configurar sincronização de status dos scouters',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    path: '/admin/app-releases',
    icon: Smartphone,
    title: 'App Android',
    description: 'Gerenciar versões do aplicativo Android',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
];

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Área Administrativa
          </DialogTitle>
          <DialogDescription>
            Escolha a ferramenta administrativa que deseja acessar
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {adminOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.path}
                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 group"
                onClick={() => handleNavigate(option.path)}
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
      </DialogContent>
    </Dialog>
  );
};
