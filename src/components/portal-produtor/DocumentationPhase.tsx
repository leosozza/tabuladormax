import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, FileText, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNegotiationDocuments, NegotiationDocument } from '@/hooks/useNegotiationDocuments';
import { DocumentScanner } from './DocumentScanner';
import { DocumentCropEditor } from './DocumentCropEditor';
import { DocumentUploadCard } from './DocumentUploadCard';

interface PaymentMethod {
  id: string;
  method: string;
  value: number;
  installments?: number;
}

interface DocumentationPhaseProps {
  negotiationId: string;
  clientName: string;
  totalValue: number;
  paymentMethods: PaymentMethod[];
  onComplete: () => void;
  onBack: () => void;
}

type ScanMode = {
  active: boolean;
  type: NegotiationDocument['document_type'];
  label: string;
  paymentMethodId?: string;
};

const DOCUMENT_TYPES: { type: NegotiationDocument['document_type']; label: string }[] = [
  { type: 'identity', label: 'Documento de Identidade (RG/CPF)' },
  { type: 'address_proof', label: 'Comprovante de Endereço' },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
};

export const DocumentationPhase = ({
  negotiationId,
  clientName,
  totalValue,
  paymentMethods,
  onComplete,
  onBack,
}: DocumentationPhaseProps) => {
  const { documents, isLoading, uploadDocument, deleteDocument } = useNegotiationDocuments(negotiationId);
  const [scanMode, setScanMode] = useState<ScanMode>({ active: false, type: 'identity', label: '' });
  const [capturedImage, setCapturedImage] = useState<{ dataUrl: string; canvas: HTMLCanvasElement } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleStartScan = (type: NegotiationDocument['document_type'], label: string, paymentMethodId?: string) => {
    setScanMode({ active: true, type, label, paymentMethodId });
  };

  const handleCapture = (dataUrl: string, canvas: HTMLCanvasElement) => {
    setCapturedImage({ dataUrl, canvas });
  };

  const handleCancelScan = () => {
    setScanMode({ active: false, type: 'identity', label: '' });
    setCapturedImage(null);
  };

  const handleConfirmCrop = async (blob: Blob) => {
    setIsUploading(true);
    
    try {
      await uploadDocument.mutateAsync({
        file: blob,
        documentType: scanMode.type,
        paymentMethodId: scanMode.paymentMethodId,
      });
      
      toast.success('Documento salvo com sucesso!');
      handleCancelScan();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erro ao salvar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument.mutateAsync(id);
      toast.success('Documento removido');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao remover documento');
    }
  };

  const hasRequiredDocuments = () => {
    const hasIdentity = documents.some(d => d.document_type === 'identity');
    const hasPaymentReceipts = paymentMethods.every(pm => 
      documents.some(d => d.document_type === 'payment_receipt' && d.payment_method_id === pm.id)
    );
    return hasIdentity && hasPaymentReceipts;
  };

  // Show scanner or crop editor if active
  if (scanMode.active) {
    if (capturedImage) {
      return (
        <div className="p-4">
          <DocumentCropEditor
            imageDataUrl={capturedImage.dataUrl}
            sourceCanvas={capturedImage.canvas}
            onConfirm={handleConfirmCrop}
            onCancel={() => setCapturedImage(null)}
          />
          {isUploading && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Salvando documento...</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="p-4">
        <DocumentScanner
          title={scanMode.label}
          onCapture={handleCapture}
          onCancel={handleCancelScan}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Negociação Finalizada!</CardTitle>
          </div>
          <CardDescription>
            Agora, envie os documentos e comprovantes de pagamento para concluir.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{clientName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Documentos do Cliente</h3>
        </div>

        {DOCUMENT_TYPES.map(({ type, label }) => (
          <DocumentUploadCard
            key={type}
            type={type}
            label={label}
            documents={documents}
            onScan={() => handleStartScan(type, label)}
            onDelete={handleDeleteDocument}
            isDeleting={deleteDocument.isPending}
          />
        ))}
      </div>

      <Separator />

      {/* Payment Receipts Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Comprovantes de Pagamento</h3>
        </div>

        {paymentMethods.map((pm) => {
          const methodLabel = PAYMENT_METHOD_LABELS[pm.method] || pm.method;
          const label = `${methodLabel} - ${formatCurrency(pm.value)}`;
          
          return (
            <DocumentUploadCard
              key={pm.id}
              type="payment_receipt"
              label={label}
              documents={documents.filter(d => d.payment_method_id === pm.id)}
              onScan={() => handleStartScan('payment_receipt', `Comprovante ${methodLabel}`, pm.id)}
              onDelete={handleDeleteDocument}
              isDeleting={deleteDocument.isPending}
            />
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={onComplete}
          className="flex-1 gap-2"
          disabled={isLoading}
        >
          <CheckCircle className="h-4 w-4" />
          Concluir Documentação
        </Button>
      </div>

      {!hasRequiredDocuments() && (
        <p className="text-xs text-muted-foreground text-center">
          Recomendado: envie pelo menos o documento de identidade e os comprovantes de pagamento
        </p>
      )}
    </div>
  );
};
