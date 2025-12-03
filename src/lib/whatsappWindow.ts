/**
 * Utilitário para calcular status da janela de 24h do WhatsApp Business API (Meta)
 * 
 * A Meta permite envio de mensagens livres apenas dentro de 24h após a última
 * mensagem do cliente. Após esse período, apenas templates são permitidos.
 */

export interface WindowStatus {
  isOpen: boolean;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
  closedSince: Date | null;
  lastCustomerMessage: Date | null;
}

/**
 * Calcula o status da janela de 24h baseado na última mensagem do cliente
 */
export function calculateWindowStatus(lastCustomerMessageAt: string | Date | null): WindowStatus {
  if (!lastCustomerMessageAt) {
    return { 
      isOpen: false, 
      hoursRemaining: null, 
      minutesRemaining: null,
      closedSince: null,
      lastCustomerMessage: null 
    };
  }
  
  const lastMessage = new Date(lastCustomerMessageAt);
  const now = new Date();
  const windowCloseTime = new Date(lastMessage.getTime() + 24 * 60 * 60 * 1000); // +24h
  
  const isOpen = now < windowCloseTime;
  const msRemaining = windowCloseTime.getTime() - now.getTime();
  
  const hoursRemaining = isOpen ? Math.floor(msRemaining / (60 * 60 * 1000)) : null;
  const minutesRemaining = isOpen ? Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000)) : null;
  const closedSince = !isOpen ? windowCloseTime : null;
  
  return { 
    isOpen, 
    hoursRemaining, 
    minutesRemaining,
    closedSince,
    lastCustomerMessage: lastMessage
  };
}

/**
 * Formata o tempo restante da janela para exibição
 */
export function formatWindowTime(status: WindowStatus): string {
  if (!status.isOpen) {
    return 'Janela fechada';
  }
  
  if (status.hoursRemaining === null || status.minutesRemaining === null) {
    return 'Calculando...';
  }
  
  if (status.hoursRemaining > 0) {
    return `${status.hoursRemaining}h ${status.minutesRemaining}min restantes`;
  }
  
  return `${status.minutesRemaining}min restantes`;
}
