import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { BitrixProduct } from '@/lib/bitrix';
import { useSystemSettings } from './useSystemSettings';

export type AgenciamentoStage = 'idle' | 'package' | 'value' | 'payment' | 'review' | 'complete';

export interface PaymentMethodData {
  method: string;
  amount: number;
  installments: number;
  dueDate?: string;
}

export interface PendingBoletoData {
  method: string;
  amount: number;
  installments: number;
}

export interface AgenciamentoData {
  stage: AgenciamentoStage;
  selectedPackage: BitrixProduct | null;
  baseValue: number;
  finalValue: number;
  discountPercent: number;
  paymentMethods: PaymentMethodData[];
  pendingBoletoData?: PendingBoletoData;
  showDatePicker?: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any[];
}

export interface AIProviderOption {
  id: string;
  name: string;
  displayName: string;
  models: { id: string; name: string }[];
  defaultModel: string;
}

interface UseAgenciamentoAssistantProps {
  products: BitrixProduct[];
  clientName?: string;
  dealTitle?: string;
  defaultPackage?: BitrixProduct | null;
  defaultValue?: number;
  onComplete: (data: AgenciamentoData) => void;
}

interface UseAgenciamentoAssistantReturn {
  // State
  stage: AgenciamentoStage;
  data: AgenciamentoData;
  messages: ConversationMessage[];
  currentMessage: string | null;
  isProcessing: boolean;
  error: string | null;
  
  // AI Provider state
  provider: string;
  model: string;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  
  // Voice response state
  voiceResponseEnabled: boolean;
  setVoiceResponseEnabled: (enabled: boolean) => void;
  isSpeaking: boolean;
  setOnSpeakingComplete: (callback: (() => void) | null) => void;
  
  // Recording state
  isRecording: boolean;
  recordingTime: number;
  
  // Date picker state for boleto
  showDatePicker: boolean;
  pendingBoletoData: PendingBoletoData | null;
  
  // Actions
  startAssistant: () => void;
  sendMessage: (text: string) => Promise<void>;
  sendAudio: () => Promise<void>;
  sendAudioBlob: (blob: Blob) => Promise<void>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  confirmAndSave: () => void;
  cancel: () => void;
  goBack: () => void;
  reset: () => void;
  stopSpeaking: () => void;
  selectDueDate: (date: Date) => Promise<void>;
  cancelDatePicker: () => void;
}

const INITIAL_DATA: AgenciamentoData = {
  stage: 'idle',
  selectedPackage: null,
  baseValue: 0,
  finalValue: 0,
  discountPercent: 0,
  paymentMethods: [],
};

const STAGE_ORDER: AgenciamentoStage[] = ['package', 'value', 'payment', 'review', 'complete'];

export function useAgenciamentoAssistant({
  products,
  clientName,
  dealTitle,
  defaultPackage,
  defaultValue,
  onComplete,
}: UseAgenciamentoAssistantProps): UseAgenciamentoAssistantReturn {
  const audioRecorder = useAudioRecorder();
  const { settings } = useSystemSettings();
  
  const [stage, setStage] = useState<AgenciamentoStage>('idle');
  const [data, setData] = useState<AgenciamentoData>(INITIAL_DATA);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processingMutexRef = useRef(false);
  
  // Date picker state for boleto parcelado
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingBoletoData, setPendingBoletoData] = useState<PendingBoletoData | null>(null);
  
  // AI Provider state - usar valores padrão do sistema
  const [provider, setProvider] = useState<string>('lovable');
  const [model, setModel] = useState<string>('google/gemini-2.5-flash');
  
  // Atualizar quando as configurações do sistema carregarem
  useEffect(() => {
    if (settings?.defaultAIProvider) {
      setProvider(settings.defaultAIProvider);
    }
    if (settings?.defaultAIModel) {
      setModel(settings.defaultAIModel);
    }
  }, [settings?.defaultAIProvider, settings?.defaultAIModel]);
  
  // Voice response state
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!voiceResponseEnabled) return;
    
    try {
      setIsSpeaking(true);
      
      // Clean text for TTS (remove emojis and special characters)
      const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
      if (!cleanText) {
        setIsSpeaking(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: cleanText,
            voiceName: 'laura' // Brazilian Portuguese friendly voice
          }),
        }
      );

      if (!response.ok) {
        console.error('[TTS] Error:', response.status);
        setIsSpeaking(false);
        return;
      }

      const data = await response.json();
      if (!data.audioContent) {
        console.error('[TTS] No audio content received');
        setIsSpeaking(false);
        return;
      }

      // Play the audio using data URI
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        onSpeakingCompleteRef.current?.();
      };
      
      audio.onerror = () => {
        console.error('[TTS] Audio playback error');
        setIsSpeaking(false);
        audioRef.current = null;
        onSpeakingCompleteRef.current?.();
      };

      await audio.play();
    } catch (err) {
      console.error('[TTS] Error:', err);
      setIsSpeaking(false);
      onSpeakingCompleteRef.current?.();
    }
  }, [voiceResponseEnabled]);

  // Callback ref for speaking complete
  const onSpeakingCompleteRef = useRef<(() => void) | null>(null);
  
  const setOnSpeakingComplete = useCallback((callback: (() => void) | null) => {
    onSpeakingCompleteRef.current = callback;
  }, []);

  const reset = useCallback(() => {
    stopSpeaking();
    setStage('idle');
    setData(INITIAL_DATA);
    setMessages([]);
    setConversationHistory([]);
    setCurrentMessage(null);
    setError(null);
    audioRecorder.clearRecording();
  }, [audioRecorder, stopSpeaking]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const startAssistant = useCallback(() => {
    reset();
    
    // Se tem pacote padrão do deal, já começar com ele selecionado
    if (defaultPackage) {
      const pkgValue = defaultValue || defaultPackage.PRICE;
      setData(prev => ({
        ...prev,
        selectedPackage: defaultPackage,
        baseValue: pkgValue,
        finalValue: pkgValue,
        stage: 'value'
      }));
      setStage('value');
      
      const greeting = `Olá! 👋 O pacote ${defaultPackage.NAME} já está selecionado (${formatCurrency(pkgValue)}).

Qual será o valor final negociado?`;
      
      setCurrentMessage(greeting);
      setMessages([{ role: 'assistant', content: greeting }]);
      
      // Speak the greeting if voice is enabled
      setTimeout(() => speakText(greeting), 500);
    } else {
      setStage('package');
      
      // Initial greeting - perguntando o pacote
      const greeting = `Olá! 👋 Vou te ajudar a registrar a negociação${clientName ? ` do ${clientName}` : ''}.

Qual pacote o cliente escolheu?`;
      
      setCurrentMessage(greeting);
      setMessages([{ role: 'assistant', content: greeting }]);
      
      // Speak the greeting if voice is enabled
      setTimeout(() => speakText(greeting), 500);
    }
  }, [reset, clientName, defaultPackage, defaultValue, speakText]);

  const processResponse = useCallback(async (transcription: string, audioBlob?: Blob) => {
    // Prevent parallel processing
    if (processingMutexRef.current) {
      console.log('[useAgenciamentoAssistant] Já processando, ignorando chamada');
      return;
    }
    
    processingMutexRef.current = true;
    setIsProcessing(true);
    setError(null);
    stopSpeaking(); // Stop any ongoing speech

    try {
      let base64Audio: string | undefined;
      
      if (audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        base64Audio = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
      }

      console.log('[useAgenciamentoAssistant] Enviando:', { 
        hasAudio: !!base64Audio, 
        textResponse: transcription,
        stage: data.stage,
        provider,
        model
      });

      const { data: result, error: invokeError } = await supabase.functions.invoke('agenciamento-assistant', {
        body: {
          audio: base64Audio,
          textResponse: !base64Audio ? transcription : undefined,
          conversationHistory,
          currentData: {
            stage,
            selectedPackage: data.selectedPackage ? {
              id: data.selectedPackage.ID,
              name: data.selectedPackage.NAME,
              price: data.selectedPackage.PRICE
            } : undefined,
            baseValue: data.baseValue,
            finalValue: data.finalValue,
            discountPercent: data.discountPercent,
            paymentMethods: data.paymentMethods
          },
          products: products.map(p => ({
            id: p.ID,
            name: p.NAME,
            price: p.PRICE,
            description: p.DESCRIPTION
          })),
          clientName,
          dealTitle,
          provider,
          model
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao processar');
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      console.log('[useAgenciamentoAssistant] Resultado:', result);

      // Add user message to display
      if (result.transcription) {
        setMessages(prev => [...prev, { role: 'user', content: result.transcription }]);
      }

      // Update conversation history
      if (result.conversationHistory) {
        setConversationHistory(result.conversationHistory);
      }

      // Handle different actions
      switch (result.action) {
        case 'select_package':
          const selectedProduct = products.find(p => 
            p.ID === result.data.packageId || 
            p.NAME.toLowerCase().includes(result.data.packageName.toLowerCase())
          );
          
          if (selectedProduct) {
            setData(prev => ({
              ...prev,
              selectedPackage: selectedProduct,
              baseValue: selectedProduct.PRICE,
              stage: 'value'
            }));
            setStage('value');
          }
          break;

        case 'set_value':
          setData(prev => ({
            ...prev,
            finalValue: result.data.finalValue,
            discountPercent: result.data.discountPercent || 
              (prev.baseValue > 0 ? ((prev.baseValue - result.data.finalValue) / prev.baseValue) * 100 : 0),
            stage: 'payment'
          }));
          setStage('payment');
          break;

        case 'set_payment_methods':
          setData(prev => ({
            ...prev,
            paymentMethods: result.data.payments,
            stage: 'review'
          }));
          setStage('review');
          break;

        case 'complete_negotiation':
          if (result.confirmed) {
            const finalData = {
              ...data,
              stage: 'complete' as AgenciamentoStage
            };
            setStage('complete');
            setData(finalData);
            // Salvar negociação automaticamente
            onComplete(finalData);
          }
          break;

        case 'ask_due_date':
          // Salvar dados do boleto pendente e mostrar date picker
          setPendingBoletoData({
            method: result.data.method,
            amount: result.data.amount,
            installments: result.data.installments
          });
          setShowDatePicker(true);
          break;

        case 'add_payment_method':
          // Adicionar ao array de pagamentos existente (não substitui)
          setData(prev => ({
            ...prev,
            paymentMethods: [
              ...(prev.paymentMethods || []),
              {
                method: result.data.method,
                amount: result.data.amount,
                installments: result.data.installments,
                dueDate: result.data.dueDate
              }
            ]
            // NÃO muda o stage - continua em 'payment' até completar o valor
          }));
          break;

        case 'ask_question':
        case 'message':
          // Just display the message
          break;
      }

      // Set the AI's response message and speak it
      if (result.message) {
        setCurrentMessage(result.message);
        setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
        
        // Speak the response
        setTimeout(() => speakText(result.message), 300);
      }

    } catch (err) {
      console.error('[useAgenciamentoAssistant] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
      processingMutexRef.current = false;
    }
  }, [conversationHistory, data, products, stage, clientName, dealTitle, provider, model, stopSpeaking, speakText]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;
    await processResponse(text);
  }, [isProcessing, processResponse]);

  const sendAudio = useCallback(async () => {
    const blob = await audioRecorder.stopRecording();
    if (!blob) {
      setError('Nenhum áudio gravado');
      return;
    }
    await processResponse('', blob);
  }, [audioRecorder, processResponse]);

  const sendAudioBlob = useCallback(async (blob: Blob) => {
    if (!blob || blob.size === 0) {
      setError('Nenhum áudio fornecido');
      return;
    }
    await processResponse('', blob);
  }, [processResponse]);

  const confirmAndSave = useCallback(() => {
    onComplete(data);
    setStage('complete');
  }, [data, onComplete]);

  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  const goBack = useCallback(() => {
    const currentIndex = STAGE_ORDER.indexOf(stage);
    if (currentIndex > 0) {
      const prevStage = STAGE_ORDER[currentIndex - 1];
      setStage(prevStage);
      setData(prev => ({ ...prev, stage: prevStage }));
      
      // Clear data for the current stage
      if (stage === 'value') {
        setData(prev => ({ ...prev, selectedPackage: null, baseValue: 0 }));
      } else if (stage === 'payment') {
        setData(prev => ({ ...prev, finalValue: 0, discountPercent: 0 }));
      } else if (stage === 'review') {
        setData(prev => ({ ...prev, paymentMethods: [] }));
      }
    }
  }, [stage]);

  // Selecionar data de vencimento do boleto
  const selectDueDate = useCallback(async (date: Date) => {
    if (!pendingBoletoData) return;
    
    setShowDatePicker(false);
    
    // Formatar a data para enviar à IA
    const formattedDate = date.toISOString().split('T')[0];
    const displayDate = date.toLocaleDateString('pt-BR');
    
    // Enviar resposta com a data selecionada
    await sendMessage(`A primeira parcela vence em ${displayDate}`);
    
    // Limpar dados pendentes
    setPendingBoletoData(null);
  }, [pendingBoletoData, sendMessage]);

  // Cancelar seleção de data
  const cancelDatePicker = useCallback(() => {
    setShowDatePicker(false);
    setPendingBoletoData(null);
  }, []);

  return {
    // State
    stage,
    data,
    messages,
    currentMessage,
    isProcessing,
    error,
    
    // AI Provider state
    provider,
    model,
    setProvider,
    setModel,
    
    // Voice response state
    voiceResponseEnabled,
    setVoiceResponseEnabled,
    isSpeaking,
    setOnSpeakingComplete,
    
    // Recording state
    isRecording: audioRecorder.isRecording,
    recordingTime: audioRecorder.recordingTime,
    
    // Date picker state for boleto
    showDatePicker,
    pendingBoletoData,
    
    // Actions
    startAssistant,
    sendMessage,
    sendAudio,
    sendAudioBlob,
    startRecording: audioRecorder.startRecording,
    stopRecording: audioRecorder.stopRecording,
    cancelRecording: audioRecorder.cancelRecording,
    confirmAndSave,
    cancel,
    goBack,
    reset,
    stopSpeaking,
    selectDueDate,
    cancelDatePicker,
  };
}
