import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bot, FileText, Link2, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: string | null;
  isLoading: boolean;
  scouterName: string;
  periodLabel: string;
  metrics?: {
    confirmationRate: number;
    attendanceRate: number;
    photoRate: number;
  };
  onExportPDF?: () => void;
  onGenerateLink?: () => void;
}

export const AIAnalysisModal = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
  scouterName,
  periodLabel,
  metrics,
  onExportPDF,
  onGenerateLink,
}: AIAnalysisModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAnalysis = async () => {
    if (!analysis) return;
    
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      toast.success('Análise copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const formatAnalysis = (text: string) => {
    // Split by sections and format
    return text.split('\n').map((line, index) => {
      // Headers with emojis
      if (line.match(/^[0-9]+\.\s*[📊📈💰🎯🏆⭐]/)) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-6 mb-3 text-primary">
            {line}
          </h3>
        );
      }
      // Section headers
      if (line.match(/^#{1,3}\s/)) {
        return (
          <h4 key={index} className="text-base font-medium mt-4 mb-2">
            {line.replace(/^#+\s/, '')}
          </h4>
        );
      }
      // Bullet points
      if (line.match(/^[-•]\s/)) {
        return (
          <li key={index} className="ml-4 mb-1 text-sm text-muted-foreground">
            {line.replace(/^[-•]\s/, '')}
          </li>
        );
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="mb-2 text-sm">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={index} className="h-2" />;
      }
      // Regular text
      return (
        <p key={index} className="mb-2 text-sm text-muted-foreground">
          {line}
        </p>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Análise de IA</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {scouterName} • {periodLabel}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Metrics Cards */}
        {metrics && !isLoading && (
          <div className="grid grid-cols-3 gap-2 py-3 border-b">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Confirmação</p>
              <p className="text-lg font-bold text-primary">{metrics.confirmationRate}%</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Comparecimento</p>
              <p className="text-lg font-bold text-green-600">{metrics.attendanceRate}%</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Com Foto</p>
              <p className="text-lg font-bold text-blue-600">{metrics.photoRate}%</p>
            </div>
          </div>
        )}

        {/* Analysis Content */}
        <ScrollArea className="flex-1 min-h-0 pr-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Gerando análise...</p>
                <p className="text-sm text-muted-foreground">
                  A IA está analisando seu desempenho
                </p>
              </div>
            </div>
          ) : analysis ? (
            <div className="py-4">
              {formatAnalysis(analysis)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Bot className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground text-center">
                Clique em "Gerar Análise" para iniciar
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        {analysis && !isLoading && (
          <div className="flex items-center gap-2 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAnalysis}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            
            {onExportPDF && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPDF}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            )}
            
            {onGenerateLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateLink}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                Compartilhar
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
