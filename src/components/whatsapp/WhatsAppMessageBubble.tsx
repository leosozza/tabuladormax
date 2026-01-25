import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, MapPin, ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import { WhatsAppMessage } from '@/hooks/useWhatsAppMessages';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
}

// Mapear erro para mensagem amigável
function formatErrorReason(metadata: Record<string, any> | undefined): string {
  if (!metadata) return 'Falha no envio';
  
  const errorCode = metadata.error_code || metadata.code;
  const errorReason = metadata.error_reason || metadata.reason || '';
  
  // Erro 470 - Janela de 24h expirada
  if (errorCode === 470 || errorCode === '470' || errorReason.includes('24 hour') || errorReason.includes('window')) {
    return 'Janela de 24h expirada. Use um template para retomar contato.';
  }
  
  // Erros de bloqueio/spam
  if (errorReason.includes('blocked') || errorReason.includes('spam')) {
    return 'Número bloqueou mensagens ou marcou como spam.';
  }
  
  // Número inválido
  if (errorReason.includes('invalid') && (errorReason.includes('phone') || errorReason.includes('number'))) {
    return 'Número de telefone inválido.';
  }
  
  // Rate limit
  if (errorCode === 429 || errorReason.includes('rate limit')) {
    return 'Limite de mensagens atingido. Aguarde alguns minutos.';
  }
  
  // Número não está no WhatsApp
  if (errorReason.includes('not on whatsapp') || errorReason.includes('not registered')) {
    return 'Número não está registrado no WhatsApp.';
  }
  
  // Mensagem genérica
  if (errorReason) {
    return errorReason.substring(0, 80);
  }
  
  return 'Falha no envio da mensagem.';
}

function MessageStatus({ status, metadata }: { status: WhatsAppMessage['status']; metadata?: Record<string, any> }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case 'failed':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{formatErrorReason(metadata)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return null;
  }
}

function LocationPreview({ message }: { message: WhatsAppMessage }) {
  // Extract coordinates from metadata if available
  const metadata = message.metadata as any;
  const lat = metadata?.latitude;
  const lon = metadata?.longitude;
  const locationName = metadata?.location_name;
  const locationAddress = metadata?.location_address;

  const googleMapsUrl = lat && lon 
    ? `https://www.google.com/maps?q=${lat},${lon}`
    : null;

  const osmMapUrl = lat && lon
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=15&size=300x150&markers=${lat},${lon},red-pushpin`
    : null;

  return (
    <div className="space-y-2">
      {osmMapUrl && (
        <a href={googleMapsUrl || '#'} target="_blank" rel="noopener noreferrer" className="block">
          <div className="relative rounded-lg overflow-hidden">
            <img 
              src={osmMapUrl} 
              alt="Localização"
              className="w-full h-[120px] object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute bottom-2 right-2 bg-background/80 rounded-full p-1.5">
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        </a>
      )}
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="min-w-0">
          {locationName && <div className="font-medium text-sm">{locationName}</div>}
          {locationAddress && <div className="text-xs opacity-80 break-words">{locationAddress}</div>}
          {!locationName && !locationAddress && lat && lon && (
            <div className="text-xs opacity-80">{lat.toFixed(6)}, {lon.toFixed(6)}</div>
          )}
        </div>
      </div>
      {googleMapsUrl && (
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs underline opacity-80 hover:opacity-100 flex items-center gap-1"
        >
          Abrir no Google Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

export function WhatsAppMessageBubble({ message }: WhatsAppMessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';
  const isBitrixAutomation = message.sent_by === 'bitrix';
  const isLocation = message.message_type === 'location';
  const isFailed = message.status === 'failed';

  // Detectar se é erro 470 (janela expirada)
  const isWindowExpiredError = isFailed && (
    message.metadata?.error_code === 470 || 
    message.metadata?.error_code === '470' ||
    message.metadata?.error_reason?.includes('24 hour')
  );

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
        isFailed
          ? 'bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-foreground'
          : isBitrixAutomation
            ? 'bg-sky-500 text-white'
            : isOutbound
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
      }`}>
        {/* Sender info */}
        <div className={`text-sm font-medium mb-1 flex items-center gap-2 ${isFailed ? 'text-red-700 dark:text-red-300' : ''}`}>
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
            📋 Template: {(message.metadata as any)?.template_display_name || message.template_name}
          </div>
        )}

        {/* Button reply badge */}
        {message.message_type === 'button_reply' && (
          <div className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded px-2 py-0.5 mb-1 inline-flex items-center gap-1">
            👆 Clicou no botão:
          </div>
        )}

        {/* Location Content */}
        {isLocation ? (
          <LocationPreview message={message} />
        ) : (
          /* Regular Content - prefer rendered_content from metadata for templates */
          <div className="whitespace-pre-wrap">
            {message.message_type === 'template' && (message.metadata as any)?.rendered_content && 
             !message.content?.includes((message.metadata as any)?.rendered_content?.substring(0, 20))
              ? (message.metadata as any).rendered_content
              : message.content}
          </div>
        )}

        {/* Error reason badge for failed messages */}
        {isFailed && (
          <div className="text-xs bg-red-200/50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded px-2 py-1 mt-2 flex items-center gap-1.5">
            {isWindowExpiredError ? (
              <Clock className="h-3 w-3 shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" />
            )}
            <span>{formatErrorReason(message.metadata)}</span>
          </div>
        )}

        {/* Media */}
        {message.media_url && !isLocation && (
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
        <div className={`flex items-center gap-1 text-xs mt-1 ${isFailed ? 'text-red-600 dark:text-red-400' : 'opacity-70'}`}>
          {format(new Date(message.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
          {isOutbound && <MessageStatus status={message.status} metadata={message.metadata} />}
        </div>
      </div>
    </div>
  );
}
