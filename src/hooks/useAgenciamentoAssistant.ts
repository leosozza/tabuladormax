import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { BitrixProduct } from '@/lib/bitrix';

export type AgenciamentoStage = 'idle' | 'package' | 'value' | 'payment' | 'review' | 'complete';

export interface PaymentMethodData {
  method: string;
  amount: number;
  installments: number;
  dueDate?: string;
}

export interface AgenciamentoData {
  stage: AgenciamentoStage;
  selectedPackage: BitrixProduct | null;
  baseValue: number;
  finalValue: number;
  discountPercent: number;
  paymentMethods: PaymentMethodData[];
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
  
  // Recording state
  isRecording: boolean;
  recordingTime: number;
  
  // Actions
  startAssistant: () => void;
  sendMessage: (text: string) => Promise<void>;
  sendAudio: () => Promise<void>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  confirmAndSave: () => void;
  cancel: () => void;
  goBack: () => void;
  reset: () => void;
  stopSpeaking: () => void;
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
  onComplete,
}: UseAgenciamentoAssistantProps): UseAgenciamentoAssistantReturn {
  const audioRecorder = useAudioRecorder();
  
  const [stage, setStage] = useState<AgenciamentoStage>('idle');
  const [data, setData] = useState<AgenciamentoData>(INITIAL_DATA);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Provider state
  const [provider, setProvider] = useState<string>('lovable');
  const [model, setModel] = useState<string>('google/gemini-2.5-flash');
  
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
      };
      
      audio.onerror = () => {
        console.error('[TTS] Audio playback error');
        setIsSpeaking(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('[TTS] Error:', err);
      setIsSpeaking(false);
    }
  }, [voiceResponseEnabled]);

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

  const startAssistant = useCallback(() => {
    reset();
    setStage('package');
    
    // Initial greeting
    const greeting = `Olá! 👋 Vou te ajudar a registrar a negociação${clientName ? ` do ${clientName}` : ''}.

Qual pacote o cliente escolheu?`;
    
    setCurrentMessage(greeting);
    setMessages([{ role: 'assistant', content: greeting }]);
    
    // Speak the greeting if voice is enabled
    setTimeout(() => speakText(greeting), 500);
  }, [reset, clientName, speakText]);

  const processResponse = useCallback(async (transcription: string, audioBlob?: Blob) => {
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
            setStage('complete');
            setData(prev => ({ ...prev, stage: 'complete' }));
          }
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
    
    // Recording state
    isRecording: audioRecorder.isRecording,
    recordingTime: audioRecorder.recordingTime,
    
    // Actions
    startAssistant,
    sendMessage,
    sendAudio,
    startRecording: audioRecorder.startRecording,
    stopRecording: audioRecorder.stopRecording,
    cancelRecording: audioRecorder.cancelRecording,
    confirmAndSave,
    cancel,
    goBack,
    reset,
    stopSpeaking,
  };
}
