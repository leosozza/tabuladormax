import { Button } from '@/components/ui/button';
import { RefreshCw, X, Phone, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface WhatsAppHeaderProps {
  contactName: string;
  phoneNumber?: string;
  bitrixId?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onClose?: () => void;
  onReconnect?: () => void;
  rightContent?: React.ReactNode;
}

export function WhatsAppHeader({
  contactName,
  phoneNumber,
  bitrixId,
  loading,
  onRefresh,
  onClose,
  onReconnect,
  rightContent
}: WhatsAppHeaderProps) {
  const navigate = useNavigate();

  const handleReconnect = () => {
    toast.info('Reconectando sessão...');
    if (onReconnect) {
      onReconnect();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-semibold text-primary">
            {contactName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">{contactName}</h2>
          <p className="text-xs text-muted-foreground">
            {phoneNumber || `Lead #${bitrixId}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          className="gap-1.5 text-xs"
          title="Reconectar sessão se houver problemas de envio"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reconectar
        </Button>
        {bitrixId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/portal-telemarketing/tabulador?lead=${bitrixId}`)}
            title="Abrir Tabulador"
          >
            <Phone className="w-4 h-4" />
          </Button>
        )}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
