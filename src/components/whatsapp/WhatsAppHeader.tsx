import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, RotateCw, CheckCircle2, UserPlus, Tag, UserCheck, PhoneCall, Server, History, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useConversationClosure, useReopenConversation } from '@/hooks/useCloseConversation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMyParticipation } from '@/hooks/useMyParticipation';
import { CloseConversationDialog } from './CloseConversationDialog';
import { ResolveParticipationDialog } from './ResolveParticipationDialog';
import { InviteAgentDialog } from './InviteAgentDialog';
import { ConversationParticipants } from './ConversationParticipants';
import { ConversationTagsManager } from './ConversationTagsManager';
import { useConversationTags } from '@/hooks/useConversationTags';
import { TagBadge } from './TagBadge';
import { useResolutionHistory } from '@/hooks/useInternalNotes';
import { CallResultDialog } from './CallResultDialog';
import { CallHistoryPopover } from './CallHistoryPopover';
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
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [callResultDialogOpen, setCallResultDialogOpen] = useState(false);
  const {
    data: closure
  } = useConversationClosure(phoneNumber);
  const {
    data: myParticipation
  } = useMyParticipation(phoneNumber);
  const {
    data: conversationTags = []
  } = useConversationTags(phoneNumber);
  const {
    data: resolutions = []
  } = useResolutionHistory(phoneNumber);
  const reopenConversation = useReopenConversation();
  const isClosed = !!closure;
  const handleReopen = () => {
    if (phoneNumber) {
      reopenConversation.mutate(phoneNumber);
    }
  };
  const handleClickToCall = () => {
    if (!phoneNumber) return;

    // Formatar número (remover caracteres especiais, manter apenas dígitos)
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Domínio SIP da Fale Fácil
    const sipDomain = 'sip.falefacilvoip.com.br';

    // Construir URI SIP
    const sipUri = `sip:${cleanNumber}@${sipDomain}`;

    // Abrir no softphone
    window.location.href = sipUri;
    toast.info('Iniciando chamada no MicroSIP...');

    // Abrir dialog para registrar resultado após um breve delay
    setTimeout(() => {
      setCallResultDialogOpen(true);
    }, 1500);
  };
  return <>
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
              {isClosed && <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Encerrada
                </Badge>}
              {resolutions.length > 0 && <Badge variant="secondary" className="gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <History className="h-3 w-3" />
                  {resolutions.length} {resolutions.length === 1 ? 'resolução' : 'resoluções'}
                </Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {phoneNumber || `Lead #${bitrixId}`}
            </p>
            {/* Display conversation tags */}
            {conversationTags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">
                {conversationTags.slice(0, 3).map(tag => <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />)}
                {conversationTags.length > 3 && <span className="text-[10px] text-muted-foreground">+{conversationTags.length - 3}</span>}
              </div>}
          </div>
          
          {/* Participants */}
          <ConversationParticipants phoneNumber={phoneNumber} />
        </div>
        <div className="flex items-center gap-2">
          {rightContent}
          
          {/* Close/Reopen Conversation Button */}
          {phoneNumber && (isClosed ? <Button variant="outline" size="sm" onClick={handleReopen} disabled={reopenConversation.isPending} className="gap-1.5 text-xs" title="Reabrir conversa">
                <RotateCw className="w-3.5 h-3.5" />
                Reabrir
              </Button> : <Button variant="outline" size="sm" onClick={() => setCloseDialogOpen(true)} className="gap-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950" title="Encerrar conversa">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Encerrar
              </Button>)}
          
          {/* Resolve My Participation Button - shown when user is invited participant */}
          {phoneNumber && myParticipation && <Button variant="outline" size="sm" onClick={() => setResolveDialogOpen(true)} className="gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" title="Marcar sua participação como resolvida">
              <UserCheck className="w-3.5 h-3.5" />
              Resolvido
            </Button>}
          
          {/* Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="Mais ações">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {bitrixId && <DropdownMenuItem onClick={() => navigate(`/portal-telemarketing/tabulador?lead=${bitrixId}`)}>
                  <Server className="w-4 h-4 mr-2" />
                  Tabulador
                </DropdownMenuItem>}
              {phoneNumber && <>
                  <DropdownMenuItem onClick={handleClickToCall} className="text-green-600">
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Ligar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCallResultDialogOpen(true)}>
                    <History className="w-4 h-4 mr-2" />
                    Histórico de Chamadas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convidar Agentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTagsDialogOpen(true)}>
                    <Tag className="w-4 h-4 mr-2" />
                    Etiquetas
                  </DropdownMenuItem>
                </>}
            </DropdownMenuContent>
          </DropdownMenu>

          {onClose}
        </div>
      </div>

      {/* Dialogs */}
      {phoneNumber && <>
          <CloseConversationDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} phoneNumber={phoneNumber} bitrixId={bitrixId} contactName={contactName} />
          {myParticipation && <ResolveParticipationDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen} phoneNumber={phoneNumber} participationId={myParticipation.id} contactName={contactName} onResolved={onClose} />}
          <InviteAgentDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} phoneNumber={phoneNumber} bitrixId={bitrixId} />
          <ConversationTagsManager open={tagsDialogOpen} onOpenChange={setTagsDialogOpen} phoneNumber={phoneNumber} bitrixId={bitrixId} />
          <CallResultDialog open={callResultDialogOpen} onOpenChange={setCallResultDialogOpen} phoneNumber={phoneNumber} bitrixId={bitrixId} contactName={contactName} />
        </>}
    </>;
}