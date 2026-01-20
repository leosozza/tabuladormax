import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BarChart2, Plus, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeleBottomNavProps {
  isSupervisor: boolean;
}

export const TeleBottomNav = ({ isSupervisor }: TeleBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/portal-telemarketing',
      isCenter: false
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: BarChart2,
      path: '/portal-telemarketing/dashboard',
      isCenter: false
    },
    {
      id: 'add',
      label: '',
      icon: Plus,
      path: '/portal-telemarketing/tabulador',
      isCenter: true
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      path: isSupervisor ? '/portal-telemarketing/equipe' : '/portal-telemarketing/whatsapp',
      isCenter: false
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/portal-telemarketing/configuracoes',
      isCenter: false
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t py-2 px-4 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              item.isCenter ? "" : "px-3 py-1",
              isActive(item.path) && !item.isCenter && "text-primary"
            )}
          >
            {item.isCenter ? (
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center -mt-8 shadow-lg shadow-primary/30">
                <item.icon className="w-6 h-6 text-primary-foreground" />
              </div>
            ) : (
              <>
                <item.icon className={cn(
                  "w-5 h-5",
                  isActive(item.path) ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs",
                  isActive(item.path) ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
