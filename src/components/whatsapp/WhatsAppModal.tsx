import { useEffect } from 'react';
import { WhatsAppChatContainer } from './WhatsAppChatContainer';

interface WhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  bitrixId?: string;
  phoneNumber?: string;
  conversationId?: number;
  contactName: string;
}

export function WhatsAppModal({
  open,
  onClose,
  bitrixId,
  phoneNumber,
  conversationId,
  contactName
}: WhatsAppModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal container - centered with fixed dimensions */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative w-[95vw] max-w-4xl h-[85vh] max-h-[calc(100vh-2rem)] bg-background rounded-lg shadow-xl border overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <WhatsAppChatContainer
            bitrixId={bitrixId}
            phoneNumber={phoneNumber}
            conversationId={conversationId}
            contactName={contactName}
            onClose={onClose}
            variant="modal"
          />
        </div>
      </div>
    </div>
  );
}
