import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MaxTalkInputProps {
  onSend: (content: string) => Promise<boolean>;
  disabled?: boolean;
}

export function MaxTalkInput({ onSend, disabled }: MaxTalkInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    const success = await onSend(message);
    if (success) {
      setMessage('');
      textareaRef.current?.focus();
    }
    setSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card">
      <div className="flex items-end gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[44px] max-h-32 resize-none pr-10"
            rows={1}
            disabled={disabled || sending}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 bottom-1"
            disabled={disabled}
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>
        
        <Button 
          size="icon" 
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          className="shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
