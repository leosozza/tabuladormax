import { AlertTriangle, RefreshCw, X, WifiOff, Clock, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SendErrorDetails {
  message: string;
  code: string;
  canRetry: boolean;
  requiresReconnect: boolean;
}

interface WhatsAppSendErrorProps {
  error: SendErrorDetails;
  onClear: () => void;
  onRetry?: () => void;
  onReconnect?: () => void;
}

// Mapeia códigos de erro para ícones
const getErrorIcon = (code: string) => {
  if (code.includes('session') || code.includes('auth') || code.includes('jwt')) {
    return <ShieldAlert className="h-4 w-4" />;
  }
  if (code.includes('network') || code.includes('connection')) {
    return <WifiOff className="h-4 w-4" />;
  }
  if (code.includes('rate') || code.includes('limit')) {
    return <Clock className="h-4 w-4" />;
  }
  if (code.includes('phone') || code.includes('number')) {
    return <Phone className="h-4 w-4" />;
  }
  return <AlertTriangle className="h-4 w-4" />;
};

// Mapeia erros técnicos para mensagens amigáveis em português
export const mapErrorToFriendlyMessage = (error: any): SendErrorDetails => {
  const errorStr = typeof error === 'string' 
    ? error 
    : error?.message || error?.error || JSON.stringify(error);
  
  const errorLower = errorStr.toLowerCase();
  
  // Erros de sessão/autenticação
  if (errorLower.includes('claim') || errorLower.includes('missing sub')) {
    return {
      message: 'Sua sessão expirou. Clique em "Reconectar" para continuar enviando.',
      code: 'session_expired',
      canRetry: false,
      requiresReconnect: true,
    };
  }
  
  if (errorLower.includes('jwt') || errorLower.includes('token')) {
    return {
      message: 'Token de acesso inválido. Reconecte sua sessão.',
      code: 'jwt_invalid',
      canRetry: false,
      requiresReconnect: true,
    };
  }
  
  if (errorLower.includes('401') || errorLower.includes('unauthorized') || errorLower.includes('não autorizado')) {
    return {
      message: 'Sessão inválida. Faça login novamente para enviar mensagens.',
      code: 'auth_unauthorized',
      canRetry: false,
      requiresReconnect: true,
    };
  }
  
  if (errorLower.includes('403') || errorLower.includes('forbidden')) {
    return {
      message: 'Você não tem permissão para enviar mensagens. Contate o supervisor.',
      code: 'auth_forbidden',
      canRetry: false,
      requiresReconnect: false,
    };
  }
  
  // Erros de rate limit
  if (errorLower.includes('429') || errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return {
      message: 'Muitas mensagens enviadas. Aguarde alguns minutos antes de tentar novamente.',
      code: 'rate_limit',
      canRetry: true,
      requiresReconnect: false,
    };
  }
  
  // Erros de número/telefone
  if (errorLower.includes('phone') || errorLower.includes('number') || errorLower.includes('telefone')) {
    if (errorLower.includes('invalid') || errorLower.includes('inválido')) {
      return {
        message: 'Número de telefone inválido. Verifique o número e tente novamente.',
        code: 'phone_invalid',
        canRetry: false,
        requiresReconnect: false,
      };
    }
    if (errorLower.includes('blocked') || errorLower.includes('bloqueado')) {
      return {
        message: 'Este número está bloqueado para envio de mensagens.',
        code: 'phone_blocked',
        canRetry: false,
        requiresReconnect: false,
      };
    }
  }
  
  // Erros de rede
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    return {
      message: 'Falha na conexão com o servidor. Verifique sua internet e tente novamente.',
      code: 'network_error',
      canRetry: true,
      requiresReconnect: false,
    };
  }
  
  // Erros de servidor
  if (errorLower.includes('500') || errorLower.includes('internal server')) {
    return {
      message: 'Erro no servidor. Aguarde alguns instantes e tente novamente.',
      code: 'server_error',
      canRetry: true,
      requiresReconnect: false,
    };
  }
  
  if (errorLower.includes('503') || errorLower.includes('unavailable')) {
    return {
      message: 'Sistema temporariamente indisponível. Tente novamente em alguns minutos.',
      code: 'service_unavailable',
      canRetry: true,
      requiresReconnect: false,
    };
  }
  
  // Erros de configuração
  if (errorLower.includes('credentials') || errorLower.includes('gupshup')) {
    return {
      message: 'Sistema de mensagens indisponível. Contate o suporte técnico.',
      code: 'config_error',
      canRetry: false,
      requiresReconnect: false,
    };
  }
  
  // Erro genérico
  return {
    message: `Erro ao enviar mensagem: ${errorStr.substring(0, 100)}`,
    code: 'unknown_error',
    canRetry: true,
    requiresReconnect: false,
  };
};

export function WhatsAppSendError({ error, onClear, onRetry, onReconnect }: WhatsAppSendErrorProps) {
  const isSessionError = error.requiresReconnect;
  
  return (
    <div 
      className={cn(
        "mx-3 mb-2 p-3 rounded-lg border flex items-start gap-3",
        isSessionError 
          ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800" 
          : "bg-destructive/10 border-destructive/30"
      )}
    >
      <div className={cn(
        "flex-shrink-0 mt-0.5",
        isSessionError ? "text-orange-600 dark:text-orange-400" : "text-destructive"
      )}>
        {getErrorIcon(error.code)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          isSessionError ? "text-orange-800 dark:text-orange-200" : "text-destructive"
        )}>
          {error.message}
        </p>
        
        <div className="flex items-center gap-2 mt-2">
          {error.requiresReconnect && onReconnect && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReconnect}
              className="h-7 text-xs bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800 dark:bg-orange-900/50 dark:hover:bg-orange-900 dark:border-orange-700 dark:text-orange-200"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reconectar Sessão
            </Button>
          )}
          
          {error.canRetry && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-6 w-6 p-0 flex-shrink-0 hover:bg-transparent"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
