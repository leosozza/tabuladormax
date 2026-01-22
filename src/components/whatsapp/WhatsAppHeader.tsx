import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, X, Phone, RotateCcw, CheckCircle2, UserPlus, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useConversationClosure, useReopenConversation } from '@/hooks/useCloseConversation';
import { CloseConversationDialog } from './CloseConversationDialog';
import { InviteAgentDialog } from './InviteAgentDialog';
import { ConversationParticipants } from './ConversationParticipants';

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
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const { data: closure } = useConversationClosure(phoneNumber);
  const reopenConversation = useReopenConversation();
  
  const isClosed = !!closure;

  const handleReconnect = () => {
    toast.info('Reconectando sessão...');
    if (onReconnect) {
      onReconnect();
    } else {
      window.location.reload();
    }
  };

  const handleReopen = () => {
    if (phoneNumber) {
      reopenConversation.mutate(phoneNumber);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">
              {contactName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold leading-tight">{contactName}</h2>
              {isClosed && (
                <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Encerrada
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {phoneNumber || `Lead #${bitrixId}`}
            </p>
          </div>
          
          {/* Participants */}
          <ConversationParticipants phoneNumber={phoneNumber} />
        </div>
        <div className="flex items-center gap-2">
          {rightContent}
          
          {/* Close/Reopen Conversation Button */}
          {phoneNumber && (
            isClosed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopen}
                disabled={reopenConversation.isPending}
                className="gap-1.5 text-xs"
                title="Reabrir conversa"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Reabrir
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCloseDialogOpen(true)}
                className="gap-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                title="Encerrar conversa"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Encerrar
              </Button>
            )
          )}
          
          {/* Invite Agent Button */}
          {phoneNumber && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-1.5 text-xs"
              title="Convidar agentes para a conversa"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Convidar
            </Button>
          )}
          
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

      {/* Dialogs */}
      {phoneNumber && (
        <>
          <CloseConversationDialog
            open={closeDialogOpen}
            onOpenChange={setCloseDialogOpen}
            phoneNumber={phoneNumber}
            bitrixId={bitrixId}
            contactName={contactName}
          />
          <InviteAgentDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            phoneNumber={phoneNumber}
            bitrixId={bitrixId}
          />
        </>
      )}
    </>
  );
}
