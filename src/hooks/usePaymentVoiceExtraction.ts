import { useState, useCallback } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { SelectedPaymentMethod, PaymentMethod } from '@/types/agenciamento';

interface ExtractedPayment {
  method: PaymentMethod;
  amount: number;
  installments: number;
}

interface ExtractionResult {
  success: boolean;
  transcription?: string;
  payments?: ExtractedPayment[];
  reasoning?: string;
  totalExtracted?: number;
  totalValue?: number;
  difference?: number;
  error?: string;
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
  
  // Actions
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  cancelRecording: () => void;
  extractPayments: (totalValue: number) => Promise<boolean>;
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

  const extractPayments = useCallback(async (totalValue: number): Promise<boolean> => {
    if (!audioRecorder.audioBlob) {
      setExtractionError('Nenhum áudio gravado');
      return false;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioRecorder.audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      console.log('[usePaymentVoiceExtraction] Enviando áudio para extração, totalValue:', totalValue);

      const { data, error } = await supabase.functions.invoke('extract-payment-from-audio', {
        body: { 
          audio: base64Audio,
          totalValue 
        }
      });

      if (error) {
        console.error('[usePaymentVoiceExtraction] Erro na invocação:', error);
        throw new Error(error.message || 'Erro ao processar áudio');
      }

      const result = data as ExtractionResult;

      if (!result.success) {
        throw new Error(result.error || 'Erro ao extrair pagamentos');
      }

      setTranscription(result.transcription || null);
      setReasoning(result.reasoning || null);

      // Convert to SelectedPaymentMethod format
      const payments: SelectedPaymentMethod[] = (result.payments || []).map((p) => ({
        method: p.method,
        amount: p.amount,
        installments: p.installments,
        installment_value: p.installments > 0 ? p.amount / p.installments : p.amount,
        percentage: totalValue > 0 ? (p.amount / totalValue) * 100 : 0
      }));

      setExtractedPayments(payments);
      console.log('[usePaymentVoiceExtraction] Pagamentos extraídos:', payments);

      return true;
    } catch (err) {
      console.error('[usePaymentVoiceExtraction] Erro:', err);
      setExtractionError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setIsExtracting(false);
    }
  }, [audioRecorder.audioBlob]);

  const clearExtraction = useCallback(() => {
    setExtractedPayments(null);
    setTranscription(null);
    setReasoning(null);
    setExtractionError(null);
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
    
    // Actions
    startRecording: audioRecorder.startRecording,
    stopRecording: audioRecorder.stopRecording,
    cancelRecording: audioRecorder.cancelRecording,
    extractPayments,
    clearExtraction,
    reset,
  };
}
