import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, MessageCircle, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

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

  // Reset phone when opening with new client data
  useEffect(() => {
    if (open && clientPhone) {
      // Clean the phone number
      const cleanPhone = clientPhone.replace(/\D/g, '');
      setPhoneNumber(cleanPhone);
    }
  }, [open, clientPhone]);

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

  const handleShareWhatsApp = () => {
    if (!phoneNumber.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }

    // Clean phone number and ensure it has country code
    let phone = phoneNumber.replace(/\D/g, '');
    
    // Add Brazil country code if not present
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const message = encodeURIComponent(
      `Olá${clientName ? ` ${clientName}` : ''}! Segue sua credencial:\n${credentialUrl}`
    );

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
            <Label htmlFor="phone">Enviar para (WhatsApp):</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Número do cliente pré-preenchido. Edite se necessário.
            </p>
          </div>

          {/* Action Buttons */}
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

          <Button
            onClick={handleShareWhatsApp}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Compartilhar via WhatsApp Web
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao clicar, o WhatsApp Web abrirá com a mensagem pronta para enviar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
