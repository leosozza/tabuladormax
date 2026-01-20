import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Log helper para diagnóstico
const logDebug = (action: string, data?: any) => {
  console.log(`[WhatsApp] ${new Date().toISOString()} - ${action}`, data || '');
};

export interface WhatsAppMessage {
  id: string;
  phone_number: string;
  bitrix_id: string | null;
  conversation_id: number | null;
  gupshup_message_id: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string | null;
  template_name: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'enqueued';
  sent_by: 'bitrix' | 'tabulador' | 'operador' | 'gupshup' | null;
  sender_name: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  metadata?: Record<string, any>;
}

export interface TemplateParams {
  templateId: string;
  variables: string[];
}

interface UseWhatsAppMessagesOptions {
  bitrixId?: string;
  phoneNumber?: string;
  conversationId?: number;
}

// Debounce time to prevent spam
const SEND_DEBOUNCE_MS = 3000;
// Limite máximo de envios por sessão
const MAX_SENDS_PER_SESSION = 50;
// Key para lock cross-tab
const SEND_LOCK_KEY = 'whatsapp_send_lock';

// Helper para verificar lock cross-tab
const acquireSendLock = (phoneNumber: string): boolean => {
  const lockData = localStorage.getItem(SEND_LOCK_KEY);
  const now = Date.now();
  
  if (lockData) {
    try {
      const lock = JSON.parse(lockData);
      // Lock expira em 10 segundos
      if (lock.phone === phoneNumber && now - lock.timestamp < 10000) {
        logDebug('Cross-tab lock active', { phone: phoneNumber });
        return false;
      }
    } catch {}
  }
  
  // Adquirir lock
  localStorage.setItem(SEND_LOCK_KEY, JSON.stringify({ phone: phoneNumber, timestamp: now }));
  return true;
};

const releaseSendLock = () => {
  localStorage.removeItem(SEND_LOCK_KEY);
};

// Interface para erros de envio detalhados
export interface SendErrorDetails {
  message: string;
  code: string;
  canRetry: boolean;
  requiresReconnect: boolean;
  originalError?: any;
  timestamp: number;
}

export const useWhatsAppMessages = (options: UseWhatsAppMessagesOptions) => {
  const { bitrixId, phoneNumber, conversationId } = options;
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [bitrixMessages, setBitrixMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBitrix, setLoadingBitrix] = useState(false);
  const [sending, setSending] = useState(false);
  const [usingBitrixFallback, setUsingBitrixFallback] = useState(false);
  const [lastSendError, setLastSendError] = useState<SendErrorDetails | null>(null);
  
  const lastSendTimeRef = useRef<number>(0);
  const sendCountRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageContentRef = useRef<string>('');

  // Função para mapear erro técnico para erro amigável
  const mapErrorToDetails = (error: any): SendErrorDetails => {
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
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    if (errorLower.includes('jwt') || errorLower.includes('token')) {
      return {
        message: 'Token de acesso inválido. Reconecte sua sessão.',
        code: 'jwt_invalid',
        canRetry: false,
        requiresReconnect: true,
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    if (errorLower.includes('401') || errorLower.includes('unauthorized') || errorLower.includes('não autorizado')) {
      return {
        message: 'Sessão inválida. Faça login novamente para enviar mensagens.',
        code: 'auth_unauthorized',
        canRetry: false,
        requiresReconnect: true,
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    if (errorLower.includes('403') || errorLower.includes('forbidden')) {
      return {
        message: 'Você não tem permissão para enviar mensagens. Contate o supervisor.',
        code: 'auth_forbidden',
        canRetry: false,
        requiresReconnect: false,
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    // Erros de rate limit
    if (errorLower.includes('429') || errorLower.includes('rate limit') || errorLower.includes('too many')) {
      return {
        message: 'Muitas mensagens enviadas. Aguarde alguns minutos antes de tentar novamente.',
        code: 'rate_limit',
        canRetry: true,
        requiresReconnect: false,
        originalError: error,
        timestamp: Date.now(),
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
          originalError: error,
          timestamp: Date.now(),
        };
      }
      if (errorLower.includes('blocked') || errorLower.includes('bloqueado')) {
        return {
          message: 'Este número está bloqueado para envio de mensagens.',
          code: 'phone_blocked',
          canRetry: false,
          requiresReconnect: false,
          originalError: error,
          timestamp: Date.now(),
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
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    // Erros de servidor
    if (errorLower.includes('500') || errorLower.includes('internal server')) {
      return {
        message: 'Erro no servidor. Aguarde alguns instantes e tente novamente.',
        code: 'server_error',
        canRetry: true,
        requiresReconnect: false,
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    if (errorLower.includes('503') || errorLower.includes('unavailable')) {
      return {
        message: 'Sistema temporariamente indisponível. Tente novamente em alguns minutos.',
        code: 'service_unavailable',
        canRetry: true,
        requiresReconnect: false,
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    // Erros de configuração
    if (errorLower.includes('credentials') || errorLower.includes('gupshup')) {
      return {
        message: 'Sistema de mensagens indisponível. Contate o suporte técnico.',
        code: 'config_error',
        canRetry: false,
        requiresReconnect: false,
        originalError: error,
        timestamp: Date.now(),
      };
    }
    
    // Erro genérico
    return {
      message: `Erro ao enviar mensagem: ${errorStr.substring(0, 100)}`,
      code: 'unknown_error',
      canRetry: true,
      requiresReconnect: false,
      originalError: error,
      timestamp: Date.now(),
    };
  };

  // Limpar erro
  const clearSendError = useCallback(() => {
    setLastSendError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    logDebug('Hook mounted', { bitrixId, phoneNumber, conversationId });
    return () => {
      mountedRef.current = false;
      // Cancelar requisições pendentes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      releaseSendLock();
      logDebug('Hook unmounted');
    };
  }, []);

  // Buscar mensagens do Bitrix via sessionId
  const fetchBitrixMessages = useCallback(async (sessionId: number) => {
    if (!sessionId) return;
    
    setLoadingBitrix(true);
    logDebug('Fetching messages from Bitrix', { sessionId });
    
    try {
      const { data, error } = await supabase.functions.invoke('bitrix-openline-messages', {
        body: {
          action: 'fetch',
          sessionId: sessionId,
        },
      });

      if (error) {
        console.error('Erro ao buscar mensagens do Bitrix:', error);
        return;
      }

      if (data?.messages && Array.isArray(data.messages)) {
        // Converter mensagens do Bitrix para formato WhatsApp
        const convertedMessages: WhatsAppMessage[] = data.messages.map((msg: any) => ({
          id: `bitrix-${msg.id}`,
          phone_number: phoneNumber?.replace(/\D/g, '') || '',
          bitrix_id: bitrixId || null,
          conversation_id: sessionId,
          gupshup_message_id: null,
          direction: msg.message_type === 'incoming' ? 'inbound' : 'outbound',
          message_type: 'text',
          content: msg.content,
          template_name: null,
          status: 'delivered' as const,
          sent_by: msg.message_type === 'incoming' ? null : 'bitrix',
          sender_name: msg.sender?.name || (msg.message_type === 'incoming' ? 'Cliente' : 'Agente'),
          media_url: null,
          media_type: null,
          created_at: new Date(msg.created_at * 1000).toISOString(),
          delivered_at: null,
          read_at: null,
        }));

        setBitrixMessages(convertedMessages);
        setUsingBitrixFallback(true);
        logDebug('Bitrix messages loaded', { count: convertedMessages.length });
      }
    } catch (error) {
      console.error('Error fetching Bitrix messages:', error);
    } finally {
      setLoadingBitrix(false);
    }
  }, [bitrixId, phoneNumber]);

  const fetchMessages = useCallback(async () => {
    if (!bitrixId && !phoneNumber && !conversationId) return;

    setLoading(true);
    setUsingBitrixFallback(false);
    setBitrixMessages([]);
    
    try {
      // Usar RPC com SECURITY DEFINER para bypass de RLS
      const normalizedPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : undefined;
      const leadId = bitrixId ? parseInt(bitrixId, 10) : undefined;
      
      logDebug('Fetching messages via RPC', { normalizedPhone, leadId, conversationId });
      
      // Chamar RPC com parâmetros nomeados completos para evitar ambiguidade
      const { data, error } = await supabase.rpc('get_telemarketing_whatsapp_messages', {
        p_operator_bitrix_id: null,
        p_phone_number: normalizedPhone || null,
        p_lead_id: !isNaN(leadId as number) ? leadId : null,
        p_team_operator_ids: null,
        p_limit: 200,
      });

      if (error) {
        console.error('Erro ao buscar mensagens via RPC:', error);
        // Fallback para query direta se RPC falhar
        logDebug('RPC failed, trying direct query', { error: error.message });
        
        let query = supabase
          .from('whatsapp_messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (normalizedPhone) {
          query = query.eq('phone_number', normalizedPhone);
        } else if (bitrixId) {
          query = query.eq('bitrix_id', bitrixId);
        }

        const { data: directData, error: directError } = await query;
        
        if (directError) {
          console.error('Erro ao buscar mensagens diretamente:', directError);
          toast.error('Erro ao carregar mensagens');
          return;
        }
        
        const directMessages = (directData || []) as WhatsAppMessage[];
        setMessages(directMessages);
        
        if (directMessages.length === 0 && conversationId && conversationId < 50000) {
          logDebug('No messages found, trying legacy Bitrix fallback', { conversationId });
          await fetchBitrixMessages(conversationId);
        }
        return;
      }

      // Mapear dados do RPC para o formato WhatsAppMessage
      const supabaseMessages: WhatsAppMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        phone_number: msg.phone_number || '',
        bitrix_id: msg.bitrix_id,
        conversation_id: msg.conversation_id || null,
        gupshup_message_id: msg.gupshup_message_id || null,
        direction: msg.direction as 'inbound' | 'outbound',
        message_type: msg.message_type || 'text',
        content: msg.content,
        template_name: msg.template_name || null,
        status: (msg.status || 'sent') as 'sent' | 'delivered' | 'read' | 'failed' | 'enqueued',
        sent_by: msg.sent_by || null,
        sender_name: msg.sender_name || null,
        media_url: msg.media_url || null,
        media_type: msg.media_type || null,
        created_at: msg.created_at,
        delivered_at: msg.delivered_at || null,
        read_at: msg.read_at || null,
        metadata: msg.metadata,
      }));
      
      logDebug('Messages loaded via RPC', { count: supabaseMessages.length });
      setMessages(supabaseMessages);
      
      // Só usar fallback do Bitrix se não há mensagens E tiver conversationId antigo (< 50000)
      if (supabaseMessages.length === 0 && conversationId && conversationId < 50000) {
        logDebug('No Supabase messages, trying legacy Bitrix fallback', { conversationId });
        await fetchBitrixMessages(conversationId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [bitrixId, phoneNumber, conversationId, fetchBitrixMessages]);

  // Verificar sessão Supabase antes de enviar - retorna true se válida
  const verifySession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logDebug('Session verification failed', { error: error?.message, hasSession: !!session });
        
        // Tentar refresh do token
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session) {
          logDebug('Session refresh failed', { error: refreshError?.message });
          return false;
        }
        
        logDebug('Session refreshed successfully');
        return true;
      }
      
      return true;
    } catch (e) {
      logDebug('Session verification error', { error: e });
      return false;
    }
  };

  const sendMessage = async (content: string): Promise<boolean> => {
    logDebug('sendMessage called', { content: content.substring(0, 50), phoneNumber });
    
    if (!phoneNumber || !content.trim()) {
      logDebug('sendMessage rejected: missing data');
      toast.error('Telefone e mensagem são obrigatórios');
      return false;
    }

    // Anti-spam: verificar tempo desde último envio
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    if (timeSinceLastSend < SEND_DEBOUNCE_MS) {
      logDebug('sendMessage rejected: debounce', { timeSinceLastSend, required: SEND_DEBOUNCE_MS });
      toast.warning('Aguarde antes de enviar outra mensagem');
      return false;
    }

    // Verificar se já está enviando
    if (sending) {
      logDebug('sendMessage rejected: already sending');
      toast.warning('Aguarde o envio anterior terminar');
      return false;
    }

    // Limite de envios por sessão
    if (sendCountRef.current >= MAX_SENDS_PER_SESSION) {
      logDebug('sendMessage rejected: session limit reached', { count: sendCountRef.current });
      toast.error('Limite de mensagens por sessão atingido. Recarregue a página.');
      return false;
    }

    // Lock cross-tab
    if (!acquireSendLock(phoneNumber)) {
      logDebug('sendMessage rejected: cross-tab lock');
      toast.warning('Envio em andamento em outra aba');
      return false;
    }

    // VERIFICAR SESSÃO ANTES DE ENVIAR
    const hasValidSession = await verifySession();
    if (!hasValidSession) {
      logDebug('sendMessage rejected: invalid session');
      releaseSendLock();
      lastMessageContentRef.current = content; // Guardar para retry
      const errorDetails = mapErrorToDetails('Sessão expirada - missing sub claim');
      setLastSendError(errorDetails);
      return false;
    }
    
    // Limpar erro anterior ao tentar enviar
    setLastSendError(null);

    lastSendTimeRef.current = now;
    sendCountRef.current += 1;
    setSending(true);
    logDebug('sendMessage starting', { sendCount: sendCountRef.current });
    
    // Criar AbortController para cancelamento
    abortControllerRef.current = new AbortController();
    
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_message',
          phone_number: phoneNumber,
          message: content.trim(),
          bitrix_id: bitrixId,
          conversation_id: conversationId,
        },
      });

      // Verificar se foi desmontado durante a requisição
      if (!mountedRef.current) {
        logDebug('sendMessage aborted: component unmounted');
        return false;
      }

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        releaseSendLock();
        lastMessageContentRef.current = content;
        const errorDetails = mapErrorToDetails(error.message || error);
        setLastSendError(errorDetails);
        return false;
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        lastMessageContentRef.current = content;
        const errorDetails = mapErrorToDetails(data.error);
        setLastSendError(errorDetails);
        return false;
      }

      // Sucesso!
      releaseSendLock();
      lastMessageContentRef.current = '';

      // Adicionar mensagem otimisticamente
      const newMessage: WhatsAppMessage = {
        id: crypto.randomUUID(),
        phone_number: phoneNumber.replace(/\D/g, ''),
        bitrix_id: bitrixId || null,
        conversation_id: conversationId || null,
        gupshup_message_id: data?.messageId || null,
        direction: 'outbound',
        message_type: 'text',
        content: content.trim(),
        template_name: null,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: 'Você',
        media_url: null,
        media_type: null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
      };

      setMessages(prev => [...prev, newMessage]);
      setLastSendError(null); // Limpar qualquer erro anterior
      toast.success('Mensagem enviada');
      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      releaseSendLock();
      
      // Verificar se foi abortado
      if (error?.name === 'AbortError') {
        logDebug('sendMessage aborted');
        return false;
      }
      
      lastMessageContentRef.current = content;
      const errorDetails = mapErrorToDetails(error);
      setLastSendError(errorDetails);
      return false;
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const sendTemplate = async (templateParams: TemplateParams): Promise<boolean> => {
    logDebug('sendTemplate called', { templateId: templateParams.templateId });
    
    if (!phoneNumber) {
      logDebug('sendTemplate rejected: missing phone');
      toast.error('Telefone é obrigatório');
      return false;
    }

    // Anti-spam: verificar tempo desde último envio
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    if (timeSinceLastSend < SEND_DEBOUNCE_MS) {
      logDebug('sendTemplate rejected: debounce', { timeSinceLastSend });
      toast.warning('Aguarde antes de enviar outro template');
      return false;
    }

    // Verificar se já está enviando
    if (sending) {
      logDebug('sendTemplate rejected: already sending');
      toast.warning('Aguarde o envio anterior terminar');
      return false;
    }

    // Limite de envios por sessão
    if (sendCountRef.current >= MAX_SENDS_PER_SESSION) {
      logDebug('sendTemplate rejected: session limit reached');
      toast.error('Limite de mensagens por sessão atingido. Recarregue a página.');
      return false;
    }

    // Lock cross-tab
    if (!acquireSendLock(phoneNumber)) {
      logDebug('sendTemplate rejected: cross-tab lock');
      toast.warning('Envio em andamento em outra aba');
      return false;
    }

    // VERIFICAR SESSÃO ANTES DE ENVIAR
    const hasValidSession = await verifySession();
    if (!hasValidSession) {
      logDebug('sendTemplate rejected: invalid session');
      releaseSendLock();
      toast.error('Sessão expirada. Faça login novamente para enviar mensagens.', {
        duration: 5000,
        action: {
          label: 'Reconectar',
          onClick: () => window.location.reload()
        }
      });
      return false;
    }

    lastSendTimeRef.current = now;
    sendCountRef.current += 1;
    setSending(true);
    logDebug('sendTemplate starting', { sendCount: sendCountRef.current });
    
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_template',
          phone_number: phoneNumber,
          template_id: templateParams.templateId,
          variables: templateParams.variables,
          bitrix_id: bitrixId,
          conversation_id: conversationId,
        },
      });

      if (!mountedRef.current) {
        logDebug('sendTemplate aborted: component unmounted');
        return false;
      }

      if (error) {
        console.error('Erro ao enviar template:', error);
        releaseSendLock();
        
        // Verificar se é erro de autenticação
        if (error.message?.includes('claim') || error.message?.includes('JWT') || error.message?.includes('401')) {
          toast.error('Sessão expirada. Faça login novamente.', {
            duration: 5000,
            action: {
              label: 'Reconectar',
              onClick: () => window.location.reload()
            }
          });
        } else {
          toast.error('Erro ao enviar template');
        }
        return false;
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        // Verificar se é erro de autenticação
        if (data.error.includes('claim') || data.error.includes('JWT') || data.error.includes('Unauthorized')) {
          toast.error('Sessão expirada. Faça login novamente.', {
            duration: 5000,
            action: {
              label: 'Reconectar',
              onClick: () => window.location.reload()
            }
          });
        } else {
          toast.error(data.error);
        }
        return false;
      }

      // Sucesso!
      releaseSendLock();
      
      toast.success('Template enviado');
      await fetchMessages();
      return true;
    } catch (error: any) {
      console.error('Error sending template:', error);
      releaseSendLock();
      
      if (error?.name === 'AbortError') {
        logDebug('sendTemplate aborted');
        return false;
      }
      
      toast.error('Erro ao enviar template');
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendMedia = async (
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    filename?: string
  ): Promise<boolean> => {
    logDebug('sendMedia called', { mediaType, mediaUrl: mediaUrl.substring(0, 50) });
    
    if (!phoneNumber) {
      logDebug('sendMedia rejected: missing phone');
      toast.error('Telefone é obrigatório');
      return false;
    }

    // Anti-spam: verificar tempo desde último envio
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    if (timeSinceLastSend < SEND_DEBOUNCE_MS) {
      logDebug('sendMedia rejected: debounce', { timeSinceLastSend });
      toast.warning('Aguarde antes de enviar outra mídia');
      return false;
    }

    // Verificar se já está enviando
    if (sending) {
      logDebug('sendMedia rejected: already sending');
      toast.warning('Aguarde o envio anterior terminar');
      return false;
    }

    // Limite de envios por sessão
    if (sendCountRef.current >= MAX_SENDS_PER_SESSION) {
      logDebug('sendMedia rejected: session limit reached');
      toast.error('Limite de mensagens por sessão atingido. Recarregue a página.');
      return false;
    }

    // Lock cross-tab
    if (!acquireSendLock(phoneNumber)) {
      logDebug('sendMedia rejected: cross-tab lock');
      toast.warning('Envio em andamento em outra aba');
      return false;
    }

    // VERIFICAR SESSÃO ANTES DE ENVIAR
    const hasValidSession = await verifySession();
    if (!hasValidSession) {
      logDebug('sendMedia rejected: invalid session');
      releaseSendLock();
      toast.error('Sessão expirada. Faça login novamente para enviar mensagens.', {
        duration: 5000,
        action: {
          label: 'Reconectar',
          onClick: () => window.location.reload()
        }
      });
      return false;
    }

    lastSendTimeRef.current = now;
    sendCountRef.current += 1;
    setSending(true);
    logDebug('sendMedia starting', { sendCount: sendCountRef.current });
    
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_media',
          phone_number: phoneNumber,
          media_type: mediaType,
          media_url: mediaUrl,
          caption: caption,
          filename: filename,
          bitrix_id: bitrixId,
          conversation_id: conversationId,
        },
      });

      if (!mountedRef.current) {
        logDebug('sendMedia aborted: component unmounted');
        return false;
      }

      if (error) {
        console.error('Erro ao enviar mídia:', error);
        releaseSendLock();
        
        // Verificar se é erro de autenticação
        if (error.message?.includes('claim') || error.message?.includes('JWT') || error.message?.includes('401')) {
          toast.error('Sessão expirada. Faça login novamente.', {
            duration: 5000,
            action: {
              label: 'Reconectar',
              onClick: () => window.location.reload()
            }
          });
        } else {
          toast.error('Erro ao enviar mídia');
        }
        return false;
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        // Verificar se é erro de autenticação
        if (data.error.includes('claim') || data.error.includes('JWT') || data.error.includes('Unauthorized')) {
          toast.error('Sessão expirada. Faça login novamente.', {
            duration: 5000,
            action: {
              label: 'Reconectar',
              onClick: () => window.location.reload()
            }
          });
        } else {
          toast.error(data.error);
        }
        return false;
      }

      // Sucesso!
      releaseSendLock();

      // Adicionar mensagem otimisticamente
      const newMessage: WhatsAppMessage = {
        id: crypto.randomUUID(),
        phone_number: phoneNumber.replace(/\D/g, ''),
        bitrix_id: bitrixId || null,
        conversation_id: conversationId || null,
        gupshup_message_id: data?.messageId || null,
        direction: 'outbound',
        message_type: mediaType,
        content: caption || `[${mediaType}]`,
        template_name: null,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: 'Você',
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
      };

      setMessages(prev => [...prev, newMessage]);
      toast.success('Mídia enviada');
      return true;
    } catch (error: any) {
      console.error('Error sending media:', error);
      releaseSendLock();
      
      if (error?.name === 'AbortError') {
        logDebug('sendMedia aborted');
        return false;
      }
      
      toast.error('Erro ao enviar mídia');
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendLocation = async (
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<boolean> => {
    logDebug('sendLocation called', { latitude, longitude, name });
    
    if (!phoneNumber) {
      logDebug('sendLocation rejected: missing phone');
      toast.error('Telefone é obrigatório');
      return false;
    }

    // Anti-spam: verificar tempo desde último envio
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;
    if (timeSinceLastSend < SEND_DEBOUNCE_MS) {
      logDebug('sendLocation rejected: debounce', { timeSinceLastSend });
      toast.warning('Aguarde antes de enviar outra localização');
      return false;
    }

    // Verificar se já está enviando
    if (sending) {
      logDebug('sendLocation rejected: already sending');
      toast.warning('Aguarde o envio anterior terminar');
      return false;
    }

    // Limite de envios por sessão
    if (sendCountRef.current >= MAX_SENDS_PER_SESSION) {
      logDebug('sendLocation rejected: session limit reached');
      toast.error('Limite de mensagens por sessão atingido. Recarregue a página.');
      return false;
    }

    // Lock cross-tab
    if (!acquireSendLock(phoneNumber)) {
      logDebug('sendLocation rejected: cross-tab lock');
      toast.warning('Envio em andamento em outra aba');
      return false;
    }

    // VERIFICAR SESSÃO ANTES DE ENVIAR
    const hasValidSession = await verifySession();
    if (!hasValidSession) {
      logDebug('sendLocation rejected: invalid session');
      releaseSendLock();
      toast.error('Sessão expirada. Faça login novamente para enviar mensagens.', {
        duration: 5000,
        action: {
          label: 'Reconectar',
          onClick: () => window.location.reload()
        }
      });
      return false;
    }

    lastSendTimeRef.current = now;
    sendCountRef.current += 1;
    setSending(true);
    logDebug('sendLocation starting', { sendCount: sendCountRef.current });
    
    try {
      const { data, error } = await supabase.functions.invoke('gupshup-send-message', {
        body: {
          action: 'send_location',
          phone_number: phoneNumber,
          latitude,
          longitude,
          name,
          address,
          bitrix_id: bitrixId,
          conversation_id: conversationId,
        },
      });

      if (!mountedRef.current) {
        logDebug('sendLocation aborted: component unmounted');
        return false;
      }

      if (error) {
        console.error('Erro ao enviar localização:', error);
        releaseSendLock();
        
        // Verificar se é erro de autenticação
        if (error.message?.includes('claim') || error.message?.includes('JWT') || error.message?.includes('401')) {
          toast.error('Sessão expirada. Faça login novamente.', {
            duration: 5000,
            action: {
              label: 'Reconectar',
              onClick: () => window.location.reload()
            }
          });
        } else {
          toast.error('Erro ao enviar localização');
        }
        return false;
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        // Verificar se é erro de autenticação
        if (data.error.includes('claim') || data.error.includes('JWT') || data.error.includes('Unauthorized')) {
          toast.error('Sessão expirada. Faça login novamente.', {
            duration: 5000,
            action: {
              label: 'Reconectar',
              onClick: () => window.location.reload()
            }
          });
        } else {
          toast.error(data.error);
        }
        return false;
      }

      // Sucesso!
      releaseSendLock();

      // Adicionar mensagem otimisticamente
      const contentPreview = name 
        ? `📍 ${name}${address ? ` - ${address}` : ''}`
        : `📍 ${address || `${latitude}, ${longitude}`}`;

      const newMessage: WhatsAppMessage = {
        id: crypto.randomUUID(),
        phone_number: phoneNumber.replace(/\D/g, ''),
        bitrix_id: bitrixId || null,
        conversation_id: conversationId || null,
        gupshup_message_id: data?.messageId || null,
        direction: 'outbound',
        message_type: 'location',
        content: contentPreview,
        template_name: null,
        status: 'sent',
        sent_by: 'tabulador',
        sender_name: 'Você',
        media_url: null,
        media_type: null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
      };

      setMessages(prev => [...prev, newMessage]);
      toast.success('Localização enviada');
      return true;
    } catch (error: any) {
      console.error('Error sending location:', error);
      releaseSendLock();
      
      if (error?.name === 'AbortError') {
        logDebug('sendLocation aborted');
        return false;
      }
      
      toast.error('Erro ao enviar localização');
      return false;
    } finally {
      setSending(false);
    }
  };

  // Buscar mensagens iniciais
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscription realtime para novas mensagens
  useEffect(() => {
    if (!bitrixId && !phoneNumber && !conversationId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${bitrixId || phoneNumber || conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: bitrixId 
            ? `bitrix_id=eq.${bitrixId}` 
            : conversationId 
              ? `conversation_id=eq.${conversationId}` 
              : undefined,
        },
        (payload) => {
          console.log('📨 Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as WhatsAppMessage;
            setMessages(prev => {
              // Evitar duplicatas
              if (prev.some(m => m.id === newMsg.id || m.gupshup_message_id === newMsg.gupshup_message_id)) {
                return prev;
              }
              return [...prev, newMsg];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as WhatsAppMessage;
            setMessages(prev =>
              prev.map(m => m.id === updatedMsg.id ? updatedMsg : m)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bitrixId, phoneNumber, conversationId]);

  // Marcar mensagens como lidas
  const markAsRead = useCallback(async (messageIds?: string[]) => {
    if (!bitrixId && !phoneNumber && !conversationId) return;

    try {
      // Marcar localmente primeiro (otimístico)
      setMessages(prev => 
        prev.map(msg => {
          if (msg.direction === 'inbound' && msg.status !== 'read') {
            if (!messageIds || messageIds.includes(msg.id)) {
              return { ...msg, status: 'read' as const, read_at: new Date().toISOString() };
            }
          }
          return msg;
        })
      );

      // Atualizar no banco
      let query = supabase
        .from('whatsapp_messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('direction', 'inbound')
        .neq('status', 'read');

      if (messageIds && messageIds.length > 0) {
        query = query.in('id', messageIds);
      } else if (bitrixId) {
        query = query.eq('bitrix_id', bitrixId);
      } else if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (phoneNumber) {
        query = query.eq('phone_number', phoneNumber.replace(/\D/g, ''));
      }

      const { error } = await query;
      if (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [bitrixId, phoneNumber, conversationId]);

  // Combinar mensagens: Supabase tem prioridade, fallback para Bitrix
  const allMessages = messages.length > 0 ? messages : bitrixMessages;

  return {
    messages: allMessages,
    loading: loading || loadingBitrix,
    sending,
    fetchMessages,
    sendMessage,
    sendMedia,
    sendLocation,
    sendTemplate,
    markAsRead,
    usingBitrixFallback,
    lastSendError,
    clearSendError,
    lastMessageContent: lastMessageContentRef.current,
  };
};
