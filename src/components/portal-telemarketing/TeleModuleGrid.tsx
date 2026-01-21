import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Phone, 
  BarChart3, 
  MessageSquare, 
  MessageCircle
} from 'lucide-react';
import { TelemarketingOperatorData } from './TelemarketingAccessKeyForm';

interface TeleModuleGridProps {
  operatorData: TelemarketingOperatorData;
  isSupervisor: boolean;
}

const modules = [
  {
    id: 'tabulador',
    title: 'Tabulador',
    description: 'Call categorization tool',
    icon: Phone,
    path: '/portal-telemarketing/tabulador',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    supervisorOnly: false
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Real-time performance analytics',
    icon: BarChart3,
    path: '/portal-telemarketing/dashboard',
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    supervisorOnly: false
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Messaging & Omnichannel',
    icon: MessageSquare,
    path: '/portal-telemarketing/whatsapp',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    supervisorOnly: false
  },
  {
    id: 'maxtalk',
    title: 'MaxTalk',
    description: 'Internal VoIP Infrastructure',
    icon: MessageCircle,
    path: '/portal-telemarketing/maxtalk',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    supervisorOnly: false
  }
  // Módulos Equipe e Configurações removidos - acessados via header/KPI
];

export const TeleModuleGrid = ({ operatorData, isSupervisor }: TeleModuleGridProps) => {
  const navigate = useNavigate();

  const saveContextAndNavigate = (path: string) => {
    localStorage.setItem('telemarketing_context', JSON.stringify({
      bitrix_id: operatorData.bitrix_id,
      cargo: operatorData.cargo,
      name: operatorData.operator_name,
      commercial_project_id: operatorData.commercial_project_id
    }));
    navigate(path);
  };

  const visibleModules = modules.filter(m => !m.supervisorOnly || isSupervisor);

  return (
    <div className="px-4 pb-8 flex-1">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">Modules</h2>
        <div className="flex gap-3">
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Activity
          </button>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            History
          </button>
          <span className="text-xs font-medium text-primary">Quick Access</span>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visibleModules.map((module) => (
          <Card 
            key={module.id}
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border-none bg-card/80"
            onClick={() => saveContextAndNavigate(module.path)}
          >
            <CardContent className="flex flex-col items-center py-6 px-3">
              <div className={`w-12 h-12 rounded-xl ${module.bgColor} flex items-center justify-center mb-3`}>
                <module.icon className={`w-6 h-6 ${module.color}`} />
              </div>
              <h3 className="font-medium text-sm">{module.title}</h3>
              <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-1">
                {module.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
