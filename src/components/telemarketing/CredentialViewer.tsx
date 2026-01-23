import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, ExternalLink, MessageCircle, Check, Download, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CredentialViewerProps {
  open: boolean;
  onClose: () => void;
  credentialUrl: string;
  clientPhone?: string;
  clientName?: string;
}

export function CredentialViewer({
  open,
  onClose,
  credentialUrl,
  clientPhone,
  clientName,
}: CredentialViewerProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Reset phone and message when opening with new client data
  useEffect(() => {
    if (open) {
      if (clientPhone) {
        const cleanPhone = clientPhone.replace(/\D/g, '');
        setPhoneNumber(cleanPhone);
      }
      setCustomMessage(`Olá${clientName ? ` ${clientName}` : ''}! Segue sua credencial.`);
    }
  }, [open, clientPhone, clientName]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(credentialUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleSendViaAPI = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }

    let phone = phoneNumber.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    setIsSending(true);

    try {
      const response = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_media',
          phone_number: phone,
          media_type: 'image',
          media_url: credentialUrl,
          caption: customMessage,
          source: 'tabulador'
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Credencial enviada com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }

    let phone = phoneNumber.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    // 1. Download the image first
    try {
      const response = await fetch(credentialUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credencial-${clientName || 'cliente'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Imagem baixada! Arraste-a para a conversa.');
    } catch (e) {
      console.error('Erro ao baixar imagem:', e);
      toast.error('Erro ao baixar imagem');
    }

    // 2. Open WhatsApp Web with just the message (no link)
    const message = encodeURIComponent(customMessage);
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${message}`, '_blank');
  };

  const handleDownload = () => {
    window.open(credentialUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Credencial do Cliente
            {clientName && (
              <span className="text-sm font-normal text-muted-foreground">
                - {clientName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credential Image */}
          <div className="relative w-full flex justify-center bg-muted/30 rounded-lg p-2">
            <img
              src={credentialUrl}
              alt="Credencial"
              className="max-h-[300px] w-auto object-contain rounded-md shadow-md"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" dominant-baseline="middle" font-size="14">Erro ao carregar</text></svg>';
              }}
            />
          </div>

          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone:</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem (opcional):</Label>
            <Textarea
              id="message"
              placeholder="Digite uma mensagem..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Secondary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex-1"
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copiado!' : 'Copiar Link'}
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
          </div>

          {/* Primary Action: Send via API */}
          <Button
            onClick={handleSendViaAPI}
            disabled={isSending}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSending ? 'Enviando...' : 'Enviar via WhatsApp (API)'}
          </Button>

          {/* Secondary: WhatsApp Web fallback */}
          <Button
            variant="outline"
            onClick={handleShareWhatsApp}
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Abrir WhatsApp Web
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Use "Enviar via WhatsApp (API)" para enviar a imagem diretamente. 
            Caso não funcione, use "Abrir WhatsApp Web" como alternativa.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
