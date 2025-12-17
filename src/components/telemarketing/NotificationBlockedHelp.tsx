import { useState } from 'react';
import { AlertTriangle, RefreshCw, Chrome, Globe, Volume2, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'other';

const detectBrowser = (): BrowserType => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('edg')) return 'edge';
  if (userAgent.includes('opera') || userAgent.includes('opr')) return 'opera';
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  
  return 'other';
};

const browserInstructions: Record<BrowserType, { name: string; icon: string; steps: string[] }> = {
  chrome: {
    name: 'Google Chrome',
    icon: '🔵',
    steps: [
      'Clique no ícone 🔒 (cadeado) na barra de endereços',
      'Clique em "Configurações do site"',
      'Encontre "Notificações" na lista',
      'Selecione "Permitir"',
      'Recarregue a página',
    ],
  },
  edge: {
    name: 'Microsoft Edge',
    icon: '🔷',
    steps: [
      'Clique no ícone 🔒 (cadeado) na barra de endereços',
      'Clique em "Permissões para este site"',
      'Encontre "Notificações"',
      'Altere para "Permitir"',
      'Recarregue a página',
    ],
  },
  firefox: {
    name: 'Mozilla Firefox',
    icon: '🦊',
    steps: [
      'Clique no ícone 🔒 (cadeado) na barra de endereços',
      'Clique na seta ao lado de "Conexão segura"',
      'Clique em "Mais informações"',
      'Vá para a aba "Permissões"',
      'Em "Enviar notificações", desmarque "Usar padrão" e selecione "Permitir"',
    ],
  },
  safari: {
    name: 'Safari',
    icon: '🧭',
    steps: [
      'Abra o menu "Safari" → "Preferências"',
      'Clique na aba "Sites"',
      'Selecione "Notificações" na barra lateral',
      'Encontre este site e selecione "Permitir"',
      'Feche as preferências e recarregue',
    ],
  },
  opera: {
    name: 'Opera',
    icon: '🔴',
    steps: [
      'Clique no ícone 🔒 (cadeado) na barra de endereços',
      'Clique em "Configurações do site"',
      'Encontre "Notificações"',
      'Selecione "Permitir"',
      'Recarregue a página',
    ],
  },
  other: {
    name: 'Seu navegador',
    icon: '🌐',
    steps: [
      'Acesse as configurações do seu navegador',
      'Procure por "Notificações" ou "Permissões de site"',
      'Encontre este site na lista',
      'Altere a permissão para "Permitir"',
      'Recarregue a página',
    ],
  },
};

interface NotificationBlockedHelpProps {
  onReload?: () => void;
}

export const NotificationBlockedHelp = ({ onReload }: NotificationBlockedHelpProps) => {
  const [open, setOpen] = useState(false);
  const browser = detectBrowser();
  const instructions = browserInstructions[browser];

  const handleReload = () => {
    if (onReload) {
      onReload();
    }
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Como desbloquear
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Notificações Bloqueadas
          </DialogTitle>
          <DialogDescription>
            As notificações push estão bloqueadas pelo navegador. Siga as instruções abaixo para habilitar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Browser-specific instructions */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{instructions.icon}</span>
              <span className="font-medium">{instructions.name}</span>
            </div>
            <ol className="space-y-2 text-sm">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Reload button */}
          <Button onClick={handleReload} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Recarregar página
          </Button>

          <Separator />

          {/* What still works */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Enquanto isso, você ainda receberá:
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Sons de alerta (se habilitado)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Notificações dentro do app (toast)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Badge com contador de não lidas</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
