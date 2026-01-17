import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TemplateHistoryPopoverProps {
  leadId: number;
  phoneNormalized?: string;
  children: React.ReactNode;
}

interface TemplateAttempt {
  id: string;
  created_at: string;
  status: string;
  error_reason: string | null;
  template_name: string | null;
}

export function TemplateHistoryPopover({ leadId, phoneNormalized, children }: TemplateHistoryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['template-history', leadId, phoneNormalized],
    queryFn: async () => {
      // Usar a nova RPC que faz match inteligente por telefone (com/sem 9)
      const { data, error } = await supabase.rpc('get_scouter_template_history', {
        p_lead_id: leadId,
        p_phone_normalized: phoneNormalized || '',
        p_limit: 10
      });

      if (error) {
        console.error('Erro ao buscar histórico de templates:', error);
        throw error;
      }

      return (data || []).map((msg: any) => ({
        id: msg.id,
        created_at: msg.created_at,
        status: msg.status,
        error_reason: msg.error_reason,
        template_name: msg.template_name,
      })) as TemplateAttempt[];
    },
    enabled: isOpen,
  });

  // Traduzir status para português
  const getStatusInfo = (status: string, errorReason: string | null) => {
    switch (status) {
      case 'read':
        return {
          label: 'Lido',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          variant: 'default' as const,
          className: 'bg-emerald-500 hover:bg-emerald-600',
        };
      case 'delivered':
        return {
          label: 'Entregue',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600',
        };
      case 'sent':
        return {
          label: 'Enviado',
          icon: <Clock className="h-3.5 w-3.5" />,
          variant: 'default' as const,
          className: 'bg-amber-500 hover:bg-amber-600',
        };
      case 'failed':
        return {
          label: translateError(errorReason),
          icon: <XCircle className="h-3.5 w-3.5" />,
          variant: 'destructive' as const,
          className: '',
        };
      default:
        return {
          label: status || 'Desconhecido',
          icon: <Clock className="h-3.5 w-3.5" />,
          variant: 'secondary' as const,
          className: '',
        };
    }
  };

  // Traduzir erros para português
  const translateError = (reason: string | null): string => {
    if (!reason) return 'Falha no envio';
    
    const lowerReason = reason.toLowerCase();
    
    const errorPatterns: Array<{ pattern: string; message: string }> = [
      { pattern: 'low balance', message: 'Saldo insuficiente' },
      { pattern: 'insufficient balance', message: 'Saldo insuficiente' },
      { pattern: 'balance', message: 'Saldo insuficiente' },
      { pattern: 'not a valid whatsapp', message: 'Sem WhatsApp' },
      { pattern: 'not on whatsapp', message: 'Sem WhatsApp' },
      { pattern: 'recipient not found', message: 'Sem WhatsApp' },
      { pattern: 'message undeliverable', message: 'Não entregue' },
      { pattern: 'blocked', message: 'Bloqueado' },
      { pattern: 'spam', message: 'Bloqueado' },
      { pattern: 'invalid', message: 'Número inválido' },
      { pattern: 'rate limit', message: 'Limite excedido' },
      { pattern: 'expired', message: 'Expirado' },
      { pattern: 'timeout', message: 'Timeout' },
    ];

    for (const { pattern, message } of errorPatterns) {
      if (lowerReason.includes(pattern)) {
        return message;
      }
    }

    return 'Falha no envio';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 z-[700]" 
        align="start"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Histórico de Envios</span>
        </div>
        
        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !attempts || attempts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum template enviado
            </div>
          ) : (
            <div className="divide-y">
              {attempts.map((attempt, index) => {
                const statusInfo = getStatusInfo(attempt.status, attempt.error_reason);
                const isFirst = index === 0;
                
                return (
                  <div 
                    key={attempt.id} 
                    className={`p-3 flex items-start gap-3 ${isFirst ? 'bg-muted/30' : ''}`}
                  >
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center pt-0.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        attempt.status === 'read' || attempt.status === 'delivered'
                          ? 'bg-green-500'
                          : attempt.status === 'failed'
                          ? 'bg-destructive'
                          : 'bg-amber-500'
                      }`} />
                      {index < attempts.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-1 min-h-[24px]" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={statusInfo.variant}
                          className={`text-xs ${statusInfo.className}`}
                        >
                          {statusInfo.icon}
                          <span className="ml-1">{statusInfo.label}</span>
                        </Badge>
                        {isFirst && (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Último
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(attempt.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {attempts && attempts.length > 0 && (
          <div className="p-2 border-t bg-muted/30 text-center">
            <span className="text-xs text-muted-foreground">
              {attempts.length} {attempts.length === 1 ? 'tentativa' : 'tentativas'}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
