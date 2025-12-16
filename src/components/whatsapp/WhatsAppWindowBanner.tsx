import { Clock, Lock, CheckCircle } from 'lucide-react';
import { WindowStatus, formatWindowTime } from '@/lib/whatsappWindow';

interface WhatsAppWindowBannerProps {
  status: WindowStatus;
}

export function WhatsAppWindowBanner({ status }: WhatsAppWindowBannerProps) {
  if (status.isOpen) {
    const timeText = formatWindowTime(status);
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-green-700 dark:text-green-400">
        <CheckCircle className="w-4 h-4 shrink-0" />
        <span className="text-xs font-medium">
          Janela aberta - {timeText}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400">
      <Lock className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium">
        Janela expirada - Use um Template para iniciar conversa
      </span>
    </div>
  );
}

export function CooldownTimer({ remaining }: { remaining: number }) {
  if (remaining <= 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400">
      <Clock className="w-4 h-4 animate-pulse shrink-0" />
      <span className="text-xs font-medium">
        Aguarde {remaining}s para enviar novamente
      </span>
    </div>
  );
}
