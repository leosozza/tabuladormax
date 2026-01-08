import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, MapPin, ExternalLink } from 'lucide-react';
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

// Format WhatsApp markdown: *bold*, _italic_, ~strikethrough~, ```code```
function formatWhatsAppText(text: string): React.ReactNode {
  if (!text) return null;
  
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, idx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3);
      return (
        <code key={idx} className="block bg-background/30 rounded px-2 py-1 my-1 text-xs font-mono whitespace-pre-wrap">
          {code}
        </code>
      );
    }
    
    // Process inline formatting
    let formatted = part;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex for *bold*, _italic_, ~strikethrough~
    const regex = /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)/g;
    let match;
    
    while ((match = regex.exec(formatted)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        elements.push(formatted.slice(lastIndex, match.index));
      }
      
      const content = match[0];
      if (content.startsWith('*') && content.endsWith('*')) {
        elements.push(<strong key={`${idx}-${match.index}`}>{content.slice(1, -1)}</strong>);
      } else if (content.startsWith('_') && content.endsWith('_')) {
        elements.push(<em key={`${idx}-${match.index}`}>{content.slice(1, -1)}</em>);
      } else if (content.startsWith('~') && content.endsWith('~')) {
        elements.push(<del key={`${idx}-${match.index}`}>{content.slice(1, -1)}</del>);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < formatted.length) {
      elements.push(formatted.slice(lastIndex));
    }
    
    return elements.length > 0 ? <span key={idx}>{elements}</span> : part;
  });
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
  // Handle both 'bitrix' and 'bitrix_automation' (from fallback webhook)
  const sentBy = message.sent_by as string | null;
  const isBitrixAutomation = sentBy === 'bitrix' || sentBy === 'bitrix_automation';
  const isLocation = message.message_type === 'location';
  
  // Check if content is a generic placeholder
  const isGenericPlaceholder = message.content?.includes('[📋 Template enviado via automação Bitrix]');

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
        isBitrixAutomation
          ? 'bg-sky-500 text-white'
          : isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
      }`}>
        {/* Sender info */}
        <div className="text-sm font-medium mb-1 flex items-center gap-2">
          {message.sender_name || (isOutbound ? 'Você' : 'Cliente')}
          {sentBy && isOutbound && (
            <span className="text-xs opacity-70">
              ({sentBy === 'bitrix' || sentBy === 'bitrix_automation' ? 'Bitrix' : sentBy === 'tabulador' ? 'TabuladorMax' : 'Operador'})
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

        {/* Location Content */}
        {isLocation ? (
          <LocationPreview message={message} />
        ) : isGenericPlaceholder ? (
          /* Generic placeholder - show friendly message */
          <div className="text-sm opacity-80 italic">
            📋 Template enviado - conteúdo não capturado
          </div>
        ) : (
          /* Regular Content with WhatsApp formatting */
          <div className="whitespace-pre-wrap">{formatWhatsAppText(message.content || '')}</div>
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
        <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
          {format(new Date(message.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
          {isOutbound && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}