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
  leadId?: number;
  // Contexto do operador telemarketing (para uso com RPC)
  operatorBitrixId?: number;
  teamOperatorIds?: number[];
}

// Debounce time to prevent spam
const SEND_DEBOUNCE_MS = 3000;
// Limite máximo de envios por sessão
const MAX_SENDS_PER_SESSION = 50;
// Cooldown inicial após erro (60 segundos)
const INITIAL_COOLDOWN_MS = 60000;
// Cooldown máximo (5 minutos)
const MAX_COOLDOWN_MS = 300000;
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

export const useWhatsAppMessages = (options: UseWhatsAppMessagesOptions) => {
  const { bitrixId, phoneNumber, conversationId, leadId, operatorBitrixId, teamOperatorIds } = options;
  
  // Determinar se deve usar modo telemarketing (RPC)
  const useTelemarketingMode = !!operatorBitrixId;
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [bitrixMessages, setBitrixMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBitrix, setLoadingBitrix] = useState(false);
  const [sending, setSending] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number>(0);
  const [usingBitrixFallback, setUsingBitrixFallback] = useState(false);
  
  const lastSendTimeRef = useRef<number>(0);
  const sendCountRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const consecutiveFailsRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Calcular tempo restante de cooldown
  const getCooldownRemaining = useCallback(() => {
    const now = Date.now();
    if (rateLimitedUntil > now) {
      return Math.ceil((rateLimitedUntil - now) / 1000);
    }
    return 0;
  }, [rateLimitedUntil]);

  // Verificar se está em cooldown
  const isInCooldown = useCallback(() => {
    return Date.now() < rateLimitedUntil;
  }, [rateLimitedUntil]);

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
    if (!bitrixId && !phoneNumber && !conversationId && !leadId) return;

    setLoading(true);
    setUsingBitrixFallback(false);
    setBitrixMessages([]);
    
    try {
      let supabaseMessages: WhatsAppMessage[] = [];
      
      // Busca simplificada via RPC (sem filtros de operador)
      if (leadId || phoneNumber) {
        logDebug('Fetching messages', { leadId, phoneNumber });
        
        const { data, error } = await supabase.rpc('get_telemarketing_whatsapp_messages', {
          p_operator_bitrix_id: null,
          p_phone_number: phoneNumber || null,
          p_lead_id: leadId || null,
          p_team_operator_ids: null,
          p_limit: 500
        });

        if (error) {
          console.error('Erro ao buscar mensagens via RPC:', error);
        } else if (data && data.length > 0) {
          supabaseMessages = data.map((m: any) => ({
            id: m.id,
            phone_number: m.phone_number,
            bitrix_id: m.bitrix_id,
            conversation_id: null,
            gupshup_message_id: m.gupshup_message_id,
            direction: m.direction as 'inbound' | 'outbound',
            message_type: m.message_type,
            content: m.content,
            template_name: m.template_name,
            status: m.status as WhatsAppMessage['status'],
            sent_by: null,
            sender_name: m.direction === 'inbound' ? 'Cliente' : 'Você',
            media_url: m.media_url,
            media_type: m.media_type,
            created_at: m.created_at,
            delivered_at: null,
            read_at: m.read_at,
            metadata: m.metadata
          }));
          logDebug('Messages loaded', { count: supabaseMessages.length });
        }
      } else {
        // Fallback: query direta para outros casos
        let query = supabase
          .from('whatsapp_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(500);

        if (phoneNumber) {
          query = query.eq('phone_number', phoneNumber.replace(/\D/g, ''));
        } else if (bitrixId) {
          query = query.eq('bitrix_id', bitrixId);
        } else if (conversationId) {
          query = query.eq('conversation_id', conversationId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar mensagens:', error);
        } else {
          supabaseMessages = (data || []) as WhatsAppMessage[];
        }
      }

      setMessages(supabaseMessages);
      
      // Se não há mensagens mas temos conversationId, buscar do Bitrix
      if (supabaseMessages.length === 0 && conversationId) {
        logDebug('No messages, trying Bitrix fallback', { conversationId });
        await fetchBitrixMessages(conversationId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [bitrixId, phoneNumber, conversationId, leadId, fetchBitrixMessages]);

  // Handler de erro com cooldown
  const handleSendError = useCallback((error: any, context: string) => {
    consecutiveFailsRef.current += 1;
    
    // Calcular cooldown com backoff exponencial
    const cooldownMs = Math.min(
      INITIAL_COOLDOWN_MS * Math.pow(1.5, consecutiveFailsRef.current - 1),
      MAX_COOLDOWN_MS
    );
    const cooldownUntil = Date.now() + cooldownMs;
    const cooldownSeconds = Math.ceil(cooldownMs / 1000);
    
    setRateLimitedUntil(cooldownUntil);
    
    logDebug('Send error - applying cooldown', { 
      context, 
      consecutiveFails: consecutiveFailsRef.current,
      cooldownSeconds,
      error: error?.message || error 
    });
    
    toast.error(`⚠️ Erro ao enviar. Aguarde ${cooldownSeconds}s antes de tentar novamente.`, {
      duration: 10000,
    });
    
    return false;
  }, []);

  const sendMessage = async (content: string): Promise<boolean> => {
    logDebug('sendMessage called', { content: content.substring(0, 50), phoneNumber });
    
    if (!phoneNumber || !content.trim()) {
      logDebug('sendMessage rejected: missing data');
      toast.error('Telefone e mensagem são obrigatórios');
      return false;
    }

    // Verificar cooldown por rate limit
    if (isInCooldown()) {
      const waitSeconds = getCooldownRemaining();
      logDebug('sendMessage rejected: in cooldown', { waitSeconds });
      toast.warning(`Aguarde ${waitSeconds}s antes de enviar`);
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
        
        // Check for auth error (401) or rate limit (429)
        const errorMessage = error?.message || '';
        const errorContext = (error as any)?.context;
        
        if (errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
          return handleSendError(error, 'auth_error');
        }
        if (errorContext?.error?.includes('Limite') || errorContext?.blocked || errorMessage.includes('429')) {
          return handleSendError(error, 'rate_limit');
        }
        
        return handleSendError(error, 'unknown_error');
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        if (data.blocked || data.error?.includes('Limite') || data.error?.includes('401')) {
          return handleSendError(data.error, 'api_error');
        }
        
        toast.error(data.error);
        return false;
      }

      // Sucesso! Reset contador de falhas
      consecutiveFailsRef.current = 0;
      releaseSendLock();

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
      
      return handleSendError(error, 'catch_error');
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

    // Verificar cooldown por rate limit
    if (isInCooldown()) {
      const waitSeconds = getCooldownRemaining();
      logDebug('sendTemplate rejected: in cooldown', { waitSeconds });
      toast.warning(`Aguarde ${waitSeconds}s antes de enviar`);
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
        
        const errorMessage = error?.message || '';
        const errorContext = (error as any)?.context;
        
        if (errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
          return handleSendError(error, 'auth_error');
        }
        if (errorContext?.error?.includes('Limite') || errorContext?.blocked || errorMessage.includes('429')) {
          return handleSendError(error, 'rate_limit');
        }
        
        return handleSendError(error, 'unknown_error');
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        if (data.blocked || data.error?.includes('Limite') || data.error?.includes('401')) {
          return handleSendError(data.error, 'api_error');
        }
        
        toast.error(data.error);
        return false;
      }

      // Sucesso!
      consecutiveFailsRef.current = 0;
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
      
      return handleSendError(error, 'catch_error');
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

    // Verificar cooldown por rate limit
    if (isInCooldown()) {
      const waitSeconds = getCooldownRemaining();
      logDebug('sendMedia rejected: in cooldown', { waitSeconds });
      toast.warning(`Aguarde ${waitSeconds}s antes de enviar`);
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
        
        const errorMessage = error?.message || '';
        const errorContext = (error as any)?.context;
        
        if (errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
          return handleSendError(error, 'auth_error');
        }
        if (errorContext?.error?.includes('Limite') || errorContext?.blocked || errorMessage.includes('429')) {
          return handleSendError(error, 'rate_limit');
        }
        
        return handleSendError(error, 'unknown_error');
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        if (data.blocked || data.error?.includes('Limite') || data.error?.includes('401')) {
          return handleSendError(data.error, 'api_error');
        }
        
        toast.error(data.error);
        return false;
      }

      // Sucesso!
      consecutiveFailsRef.current = 0;
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
      
      return handleSendError(error, 'catch_error');
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

    // Verificar cooldown por rate limit
    if (isInCooldown()) {
      const waitSeconds = getCooldownRemaining();
      logDebug('sendLocation rejected: in cooldown', { waitSeconds });
      toast.warning(`Aguarde ${waitSeconds}s antes de enviar`);
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
        
        const errorMessage = error?.message || '';
        const errorContext = (error as any)?.context;
        
        if (errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
          return handleSendError(error, 'auth_error');
        }
        if (errorContext?.error?.includes('Limite') || errorContext?.blocked || errorMessage.includes('429')) {
          return handleSendError(error, 'rate_limit');
        }
        
        return handleSendError(error, 'unknown_error');
      }

      if (data?.error) {
        console.error('Erro da API:', data.error);
        releaseSendLock();
        
        if (data.blocked || data.error?.includes('Limite') || data.error?.includes('401')) {
          return handleSendError(data.error, 'api_error');
        }
        
        toast.error(data.error);
        return false;
      }

      // Sucesso!
      consecutiveFailsRef.current = 0;
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
      
      return handleSendError(error, 'catch_error');
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
    if (!messageIds || messageIds.length === 0) return;

    try {
      // Marcar localmente primeiro (otimístico)
      setMessages(prev => 
        prev.map(msg => {
          if (msg.direction === 'inbound' && msg.status !== 'read') {
            if (messageIds.includes(msg.id)) {
              return { ...msg, status: 'read' as const, read_at: new Date().toISOString() };
            }
          }
          return msg;
        })
      );

      // Modo telemarketing: usar RPC
      if (useTelemarketingMode && operatorBitrixId) {
        const { error } = await supabase.rpc('mark_telemarketing_whatsapp_messages_read', {
          p_operator_bitrix_id: operatorBitrixId,
          p_message_ids: messageIds,
          p_team_operator_ids: teamOperatorIds && teamOperatorIds.length > 0 ? teamOperatorIds : null
        });
        
        if (error) {
          console.error('Erro ao marcar mensagens via RPC:', error);
        }
        return;
      }

      // Modo padrão: update direto
      let query = supabase
        .from('whatsapp_messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('direction', 'inbound')
        .neq('status', 'read');

      if (messageIds.length > 0) {
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
  }, [bitrixId, phoneNumber, conversationId, useTelemarketingMode, operatorBitrixId, teamOperatorIds]);

  // Combinar mensagens: Supabase tem prioridade, fallback para Bitrix
  const allMessages = messages.length > 0 ? messages : bitrixMessages;

  return {
    messages: allMessages,
    loading: loading || loadingBitrix,
    sending,
    rateLimitedUntil,
    getCooldownRemaining,
    isInCooldown,
    fetchMessages,
    sendMessage,
    sendMedia,
    sendLocation,
    sendTemplate,
    markAsRead,
    usingBitrixFallback,
  };
};
