import { Button } from '@/components/ui/button';
import { RefreshCw, X, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WhatsAppHeaderProps {
  contactName: string;
  phoneNumber?: string;
  bitrixId?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onClose?: () => void;
}

export function WhatsAppHeader({
  contactName,
  phoneNumber,
  bitrixId,
  loading,
  onRefresh,
  onClose
}: WhatsAppHeaderProps) {
  const navigate = useNavigate();

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
      <div className="flex items-center gap-1">
        {bitrixId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/portal-telemarketing/tabulador?lead=${bitrixId}`)}
            title="Abrir Tabulador"
          >
            <ClipboardList className="w-4 h-4" />
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
