import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTelemarketingTheme, TELEMARKETING_THEMES } from '@/hooks/useTelemarketingTheme';
import { cn } from '@/lib/utils';

export const ThemeSelector = () => {
  const { theme, setTheme } = useTelemarketingTheme();

  const lightThemes = TELEMARKETING_THEMES.filter(t => !t.isDark);
  const darkThemes = TELEMARKETING_THEMES.filter(t => t.isDark);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Alterar tema">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          ☀️ Temas Claros
        </DropdownMenuLabel>
        {lightThemes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              theme === t.id && "bg-accent/50"
            )}
          >
            <div 
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ 
                backgroundColor: t.preview.bg,
                borderColor: t.preview.primary 
              }}
            >
              {theme === t.id && (
                <Check className="w-3 h-3" style={{ color: t.preview.primary }} />
              )}
            </div>
            <span>{t.name}</span>
          </button>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          🌙 Temas Escuros
        </DropdownMenuLabel>
        {darkThemes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              theme === t.id && "bg-accent/50"
            )}
          >
            <div 
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ 
                backgroundColor: t.preview.bg,
                borderColor: t.preview.primary 
              }}
            >
              {theme === t.id && (
                <Check className="w-3 h-3" style={{ color: t.preview.primary }} />
              )}
            </div>
            <span>{t.name}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
