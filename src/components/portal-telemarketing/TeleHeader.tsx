import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeSelector } from './ThemeSelector';

interface TeleHeaderProps {
  operatorName: string;
  operatorPhoto?: string | null;
  isSupervisor: boolean;
  onLogout: () => void;
}

export const TeleHeader = ({ operatorName, operatorPhoto, isSupervisor, onLogout }: TeleHeaderProps) => {
  const initials = operatorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const firstName = operatorName.split(' ')[0];

  return (
    <header className="px-4 py-3 bg-card border-b sticky top-0 z-10">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="font-bold text-lg">TeleTalk</span>
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          <Button variant="ghost" size="icon">
            <Search className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarImage src={operatorPhoto || undefined} alt={operatorName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="font-medium text-sm leading-tight">{firstName}</p>
              <p className="text-xs text-muted-foreground">{isSupervisor ? 'Supervisor' : 'Agente'}</p>
            </div>
          </div>

          <ThemeSelector />
          <Button variant="ghost" size="icon" onClick={onLogout} title="Sair">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">System Active</span>
        </span>
        <span className="text-xs text-muted-foreground">•</span>
        <Badge variant="secondary" className="text-xs py-0">
          Shift 1
        </Badge>
      </div>
    </header>
  );
};
