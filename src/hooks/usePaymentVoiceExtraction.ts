import { useState, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { SelectedPaymentMethod, PaymentMethod } from '@/types/agenciamento';

interface ExtractedPayment {
  method: PaymentMethod;
  amount: number;
  installments: number;
}

interface AIQuestion {
  id: string;
  question: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any[];
}

interface ExtractionResult {
  success: boolean;
  status?: 'complete' | 'needs_info';
  transcription?: string;
  payments?: ExtractedPayment[];
  reasoning?: string;
  totalExtracted?: number;
  totalValue?: number;
  difference?: number;
  error?: string;
  // For needs_info status
  questions?: AIQuestion[];
  partialPayments?: ExtractedPayment[];
  context?: string;
  conversationHistory?: ConversationMessage[];
}

interface UsePaymentVoiceExtractionReturn {
  // Recording state
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  
  // Extraction state
  isExtracting: boolean;
  extractedPayments: SelectedPaymentMethod[] | null;
  transcription: string | null;
  reasoning: string | null;
  extractionError: string | null;
  
  // Conversation state
  needsMoreInfo: boolean;
  questions: AIQuestion[];
  partialPayments: SelectedPaymentMethod[];
  conversationHistory: ConversationMessage[];
  
  // Actions
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
  extractPayments: (totalValue: number, blob?: Blob) => Promise<boolean>;
  respondWithText: (text: string, totalValue: number) => Promise<boolean>;
  respondWithAudio: (totalValue: number, blob?: Blob) => Promise<boolean>;
  clearExtraction: () => void;
  reset: () => void;
}

export function usePaymentVoiceExtraction(): UsePaymentVoiceExtractionReturn {
  const audioRecorder = useAudioRecorder();
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPayments, setExtractedPayments] = useState<SelectedPaymentMethod[] | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Conversation state
  const [needsMoreInfo, setNeedsMoreInfo] = useState(false);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [partialPayments, setPartialPayments] = useState<SelectedPaymentMethod[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  const convertToSelectedPaymentMethod = useCallback((payments: ExtractedPayment[], totalValue: number): SelectedPaymentMethod[] => {
    return payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      installments: p.installments,
      installment_value: p.installments > 0 ? p.amount / p.installments : p.amount,
      percentage: totalValue > 0 ? (p.amount / totalValue) * 100 : 0
    }));
  }, []);

  const processResult = useCallback((result: ExtractionResult, totalValue: number): boolean => {
    if (!result.success) {
      throw new Error(result.error || 'Erro ao extrair pagamentos');
    }

    setTranscription(result.transcription || null);

    if (result.status === 'needs_info') {
      setNeedsMoreInfo(true);
      setQuestions(result.questions || []);
      setPartialPayments(
        convertToSelectedPaymentMethod(result.partialPayments || [], totalValue)
      );
      setConversationHistory(result.conversationHistory || []);
      setReasoning(result.context || null);
      return false; // Not complete yet
    }

    if (result.status === 'complete') {
      setNeedsMoreInfo(false);
      setQuestions([]);
      setReasoning(result.reasoning || null);
      setExtractedPayments(
        convertToSelectedPaymentMethod(result.payments || [], totalValue)
      );
      setConversationHistory([]);
      return true; // Complete
    }

    throw new Error('Status desconhecido');
  }, [convertToSelectedPaymentMethod]);

  const extractPayments = useCallback(async (totalValue: number, blob?: Blob): Promise<boolean> => {
    const audioToUse = blob || audioRecorder.audioBlob;
    
    if (!audioToUse) {
      setExtractionError('Nenhum áudio gravado');
      return false;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const arrayBuffer = await audioToUse.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      console.log('[usePaymentVoiceExtraction] Enviando áudio, totalValue:', totalValue, 'blob size:', audioToUse.size);

      const { data, error } = await supabase.functions.invoke('extract-payment-from-audio', {
        body: { 
          audio: base64Audio,
          totalValue,
          conversationHistory
        }
      });

      if (error) {
        console.error('[usePaymentVoiceExtraction] Erro na invocação:', error);
        throw new Error(error.message || 'Erro ao processar áudio');
      }

      return processResult(data as ExtractionResult, totalValue);
    } catch (err) {
      console.error('[usePaymentVoiceExtraction] Erro:', err);
      setExtractionError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setIsExtracting(false);
    }
  }, [audioRecorder.audioBlob, conversationHistory, processResult]);

  const respondWithText = useCallback(async (text: string, totalValue: number): Promise<boolean> => {
    if (!text.trim()) {
      setExtractionError('Digite uma resposta');
      return false;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      console.log('[usePaymentVoiceExtraction] Enviando resposta de texto:', text);

      const { data, error } = await supabase.functions.invoke('extract-payment-from-audio', {
        body: { 
          textResponse: text,
          totalValue,
          conversationHistory
        }
      });

      if (error) {
        console.error('[usePaymentVoiceExtraction] Erro na invocação:', error);
        throw new Error(error.message || 'Erro ao processar resposta');
      }

      return processResult(data as ExtractionResult, totalValue);
    } catch (err) {
      console.error('[usePaymentVoiceExtraction] Erro:', err);
      setExtractionError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setIsExtracting(false);
    }
  }, [conversationHistory, processResult]);

  const respondWithAudio = useCallback(async (totalValue: number, blob?: Blob): Promise<boolean> => {
    const audioToUse = blob || audioRecorder.audioBlob;
    
    if (!audioToUse) {
      setExtractionError('Nenhum áudio gravado');
      return false;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const arrayBuffer = await audioToUse.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      console.log('[usePaymentVoiceExtraction] Enviando resposta de áudio, blob size:', audioToUse.size);

      const { data, error } = await supabase.functions.invoke('extract-payment-from-audio', {
        body: { 
          audio: base64Audio,
          totalValue,
          conversationHistory
        }
      });

      if (error) {
        console.error('[usePaymentVoiceExtraction] Erro na invocação:', error);
        throw new Error(error.message || 'Erro ao processar áudio');
      }

      return processResult(data as ExtractionResult, totalValue);
    } catch (err) {
      console.error('[usePaymentVoiceExtraction] Erro:', err);
      setExtractionError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setIsExtracting(false);
    }
  }, [audioRecorder.audioBlob, conversationHistory, processResult]);

  const clearExtraction = useCallback(() => {
    setExtractedPayments(null);
    setTranscription(null);
    setReasoning(null);
    setExtractionError(null);
    setNeedsMoreInfo(false);
    setQuestions([]);
    setPartialPayments([]);
    setConversationHistory([]);
  }, []);

  const reset = useCallback(() => {
    audioRecorder.clearRecording();
    clearExtraction();
  }, [audioRecorder, clearExtraction]);

  return {
    // Recording state
    isRecording: audioRecorder.isRecording,
    recordingTime: audioRecorder.recordingTime,
    audioBlob: audioRecorder.audioBlob,
    
    // Extraction state
    isExtracting,
    extractedPayments,
    transcription,
    reasoning,
    extractionError: extractionError || audioRecorder.error,
    
    // Conversation state
    needsMoreInfo,
    questions,
    partialPayments,
    conversationHistory,
    
    // Actions
    startRecording: audioRecorder.startRecording,
    stopRecording: audioRecorder.stopRecording,
    cancelRecording: audioRecorder.cancelRecording,
    extractPayments,
    respondWithText,
    respondWithAudio,
    clearExtraction,
    reset,
  };
}
