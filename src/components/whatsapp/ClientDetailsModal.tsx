import { Phone, User, Mail, MapPin, Calendar, Tag, Handshake, Clock, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdminConversation } from '@/hooks/useAdminWhatsAppConversations';
import { getEtapaStyle } from '@/lib/etapaColors';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailsModalProps {
  conversation: AdminConversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEAL_STATUS_CONFIG = {
  won: { label: 'Contrato fechado', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: '✅' },
  lost: { label: 'Não fechou', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: '❌' },
  open: { label: 'Em negociação', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: '🔄' }
};

export function ClientDetailsModal({ conversation, open, onOpenChange }: ClientDetailsModalProps) {
  if (!conversation) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const etapaStyle = conversation.lead_etapa ? getEtapaStyle(conversation.lead_etapa) : null;
  const dealStatus = conversation.deal_status ? DEAL_STATUS_CONFIG[conversation.deal_status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Primary Info */}
          <div className="space-y-3">
            {/* Model Name (Deal Title) */}
            {conversation.deal_title && (
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Modelo</p>
                  <p className="font-medium">{conversation.deal_title}</p>
                </div>
              </div>
            )}

            {/* Responsible Name */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="font-medium">{conversation.lead_name || 'Não informado'}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="font-medium">{conversation.phone_number || 'Não informado'}</p>
              </div>
            </div>

            {/* Bitrix ID */}
            {conversation.bitrix_id && (
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Bitrix ID</p>
                  <p className="font-medium">{conversation.bitrix_id}</p>
                </div>
              </div>
            )}

            {/* Lead ID */}
            {conversation.lead_id && (
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead ID</p>
                  <p className="font-medium">{conversation.lead_id}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Info */}
          <div className="space-y-3">
            {/* Etapa */}
            {etapaStyle && (
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fase do Lead</p>
                  <Badge className={cn("mt-1", etapaStyle.bg, etapaStyle.text)}>
                    {etapaStyle.label}
                  </Badge>
                </div>
              </div>
            )}

            {/* Deal Status */}
            {dealStatus && (
              <div className="flex items-start gap-3">
                <Handshake className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Status do Contrato</p>
                  <Badge className={cn("mt-1", dealStatus.color)}>
                    {dealStatus.icon} {dealStatus.label}
                  </Badge>
                  {conversation.deal_count > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({conversation.deal_count} negociações)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Window Status */}
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Janela de Resposta</p>
                <Badge 
                  variant={conversation.is_window_open ? "default" : "secondary"}
                  className={conversation.is_window_open ? "bg-green-600" : ""}
                >
                  {conversation.is_window_open ? 'Aberta (24h)' : 'Fechada'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Message Stats */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total de Mensagens</p>
                <p className="font-medium">{conversation.total_messages}</p>
              </div>
            </div>

            {conversation.unread_count > 0 && (
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mensagens não lidas</p>
                  <Badge variant="destructive">{conversation.unread_count}</Badge>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Última Mensagem</p>
                <p className="text-sm">{formatDate(conversation.last_message_at)}</p>
              </div>
            </div>

            {conversation.last_customer_message_at && (
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Última Mensagem do Cliente</p>
                  <p className="text-sm">{formatDate(conversation.last_customer_message_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Last Operator */}
          {conversation.last_operator_name && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Último Operador</p>
                  <p className="font-medium">{conversation.last_operator_name}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
