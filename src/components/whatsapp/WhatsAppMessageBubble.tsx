import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';
import { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';

interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
}

function MessageStatus({ status }: { status: WhatsAppMessage['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case 'failed':
      return <span className="text-xs text-red-500">Erro</span>;
    default:
      return null;
  }
}

export function WhatsAppMessageBubble({ message }: WhatsAppMessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  const isBitrixAutomation = message.sent_by === 'bitrix';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
        isBitrixAutomation
          ? 'bg-amber-600 text-white'
          : isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
      }`}>
        {/* Sender info */}
        <div className="text-sm font-medium mb-1 flex items-center gap-2">
          {message.sender_name || (isOutbound ? 'Você' : 'Cliente')}
          {message.sent_by && isOutbound && (
            <span className="text-xs opacity-70">
              ({message.sent_by === 'bitrix' ? 'Bitrix' : message.sent_by === 'tabulador' ? 'TabuladorMax' : 'Operador'})
            </span>
          )}
        </div>

        {/* Template badge */}
        {message.message_type === 'template' && message.template_name && (
          <div className="text-xs bg-background/20 rounded px-2 py-0.5 mb-1 inline-block">
            📋 Template: {message.template_name}
          </div>
        )}

        {/* Button reply badge */}
        {message.message_type === 'button_reply' && (
          <div className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded px-2 py-0.5 mb-1 inline-flex items-center gap-1">
            👆 Clicou no botão:
          </div>
        )}

        {/* Content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Media */}
        {message.media_url && (
          <div className="mt-2">
            {message.media_type === 'image' ? (
              <img src={message.media_url} alt="Imagem" className="max-w-full rounded" />
            ) : message.media_type === 'audio' ? (
              <audio controls src={message.media_url} className="max-w-full" />
            ) : (
              <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                📎 {message.media_type || 'Arquivo'}
              </a>
            )}
          </div>
        )}

        {/* Timestamp and status */}
        <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
          {format(new Date(message.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
          {isOutbound && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}
