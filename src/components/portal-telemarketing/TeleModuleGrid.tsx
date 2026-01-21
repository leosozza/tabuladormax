import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, BarChart3, MessageSquare, MessageCircle } from 'lucide-react';
import { TelemarketingOperatorData } from './TelemarketingAccessKeyForm';
import { cn } from '@/lib/utils';
interface TeleModuleGridProps {
  operatorData: TelemarketingOperatorData;
  isSupervisor: boolean;
}
const modules = [{
  id: 'tabulador',
  title: 'Tabulador',
  description: 'Categorização de chamadas',
  icon: Phone,
  path: '/portal-telemarketing/tabulador',
  gradient: 'from-primary/20 to-primary/5',
  iconBg: 'bg-primary',
  iconColor: 'text-primary-foreground',
  supervisorOnly: false
}, {
  id: 'dashboard',
  title: 'Dashboard',
  description: 'Métricas em tempo real',
  icon: BarChart3,
  path: '/portal-telemarketing/dashboard',
  gradient: 'from-purple-500/20 to-purple-500/5',
  iconBg: 'bg-purple-500',
  iconColor: 'text-white',
  supervisorOnly: false
}, {
  id: 'whatsapp',
  title: 'WhatsApp',
  description: 'Mensagens & Omnichannel',
  icon: MessageSquare,
  path: '/portal-telemarketing/whatsapp',
  gradient: 'from-green-500/20 to-green-500/5',
  iconBg: 'bg-green-500',
  iconColor: 'text-white',
  supervisorOnly: false
}, {
  id: 'maxtalk',
  title: 'MaxTalk',
  description: 'Infraestrutura VoIP',
  icon: MessageCircle,
  path: '/portal-telemarketing/maxtalk',
  gradient: 'from-blue-500/20 to-blue-500/5',
  iconBg: 'bg-blue-500',
  iconColor: 'text-white',
  supervisorOnly: false
}];
export const TeleModuleGrid = ({
  operatorData,
  isSupervisor
}: TeleModuleGridProps) => {
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
  return <div className="px-4 pb-8 flex-1">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold text-lg">Módulos</h2>
        
      </div>

      {/* Modules Grid - Cards mais arredondados e modernos */}
      <div className="grid grid-cols-2 gap-4">
        {visibleModules.map((module, index) => <Card key={module.id} className={cn("cursor-pointer transition-all duration-300 border-0 overflow-hidden", "hover:shadow-xl hover:scale-[1.03] active:scale-[0.98]", "rounded-2xl", `bg-gradient-to-br ${module.gradient}`)} style={{
        animationDelay: `${index * 50}ms`
      }} onClick={() => saveContextAndNavigate(module.path)}>
            <CardContent className="flex flex-col items-center py-7 px-4">
              {/* Ícone maior com background */}
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg", "transition-transform duration-300 hover:rotate-3", module.iconBg)}>
                <module.icon className={cn("w-7 h-7", module.iconColor)} />
              </div>
              
              {/* Título */}
              <h3 className="font-semibold text-base mb-1">{module.title}</h3>
              
              {/* Descrição */}
              <p className="text-xs text-muted-foreground text-center line-clamp-2">
                {module.description}
              </p>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};