import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Image, Paperclip, Mic, Square, X, Loader2, Plus, Sparkles, Wand2, MapPin } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { QuickTextSelector } from './QuickTextSelector';
import { useWhatsAppAI } from '@/hooks/useWhatsAppAI';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LocationSendModal } from './LocationSendModal';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

interface MediaPreview {
  file: File;
  type: MediaType;
  url: string;
}

interface ChatMessage {
  direction: 'inbound' | 'outbound';
  content: string;
  sender_name?: string;
}

interface WhatsAppInputProps {
  onSendText: (message: string) => Promise<boolean | void>;
  onSendMedia: (mediaUrl: string, mediaType: MediaType, caption?: string, filename?: string) => Promise<boolean | void>;
  onSendLocation?: (latitude: number, longitude: number, name: string, address: string) => Promise<boolean>;
  disabled?: boolean;
  isWindowOpen?: boolean; // Mantido para compatibilidade, mas não será usado para bloquear
  inCooldown?: boolean;
  projectId?: string;
  chatMessages?: ChatMessage[];
  operatorBitrixId?: number;
  profileId?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

export function WhatsAppInput({
  onSendText,
  onSendMedia,
  onSendLocation,
  disabled,
  isWindowOpen, // Não usado para bloquear
  inCooldown,
  projectId,
  chatMessages = [],
  operatorBitrixId,
  profileId
}: WhatsAppInputProps) {
  const [messageInput, setMessageInput] = useState('');
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [autoSendAfterStop, setAutoSendAfterStop] = useState(false);
  const [generatedByAgent, setGeneratedByAgent] = useState<string | null>(null);
  
  // Location state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [sendingLocation, setSendingLocation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);

  const { generateResponse, improveText, isGenerating, isImproving } = useWhatsAppAI();

  // Buscar nome do agente vinculado ao usuário
  const [assignedAgentName, setAssignedAgentName] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAssignedAgent = async () => {
      if (!operatorBitrixId && !profileId) return;
      
      let query = supabase
        .from('agent_operator_assignments')
        .select('agent:ai_agents(name)')
        .eq('is_active', true);
      
      if (operatorBitrixId) {
        query = query.eq('operator_bitrix_id', operatorBitrixId);
      } else if (profileId) {
        query = query.eq('profile_id', profileId);
      }
      
      const { data } = await query.maybeSingle();
      if (data?.agent?.name) {
        setAssignedAgentName(data.agent.name);
      }
    };
    
    fetchAssignedAgent();
  }, [operatorBitrixId, profileId]);

  const handleGenerateAI = async () => {
    if (chatMessages.length === 0) {
      toast.error('Nenhuma mensagem na conversa');
      return;
    }
    
    const result = await generateResponse(chatMessages, undefined, operatorBitrixId, profileId);
    if (result.response) {
      setMessageInput(result.response);
      setGeneratedByAgent(result.agentName || 'IA');
      const agentInfo = result.agentName ? ` (Agente: ${result.agentName})` : '';
      toast.success(`Resposta gerada!${agentInfo}`);
    }
  };

  const handleImproveText = async () => {
    if (!messageInput.trim()) {
      toast.error('Digite algo para melhorar');
      return;
    }
    
    const improved = await improveText(messageInput, undefined, operatorBitrixId, profileId);
    if (improved) {
      setMessageInput(improved);
      setGeneratedByAgent(assignedAgentName || 'IA');
      toast.success('Texto melhorado!');
    }
  };

  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    error: recordingError
  } = useAudioRecorder();

  // Create audio URL only once per blob
  const audioUrl = useMemo(() => {
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioBlob]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  // Auto-send after stopping recording
  useEffect(() => {
    if (autoSendAfterStop && audioBlob && !sendingRef.current) {
      setAutoSendAfterStop(false);
      handleSendAudio();
    }
  }, [autoSendAfterStop, audioBlob]);

  const uploadMedia = useCallback(async (file: File | Blob, filename: string): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${timestamp}_${safeName}`;

      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) {
        toast.error('Erro ao fazer upload');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch {
      toast.error('Erro ao fazer upload');
      return null;
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 16MB.');
      return;
    }

    const type = getMediaType(file);
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, type, url });
    e.target.value = '';
  }, []);

  const clearMedia = useCallback(() => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
    clearRecording();
  }, [mediaPreview, clearRecording]);

  const handleLocationRequest = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não é suportada pelo seu navegador');
      return;
    }

    toast.info('Obtendo sua localização...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setShowLocationModal(true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Permissão de localização negada. Verifique as configurações do navegador.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Informação de localização indisponível.');
            break;
          case error.TIMEOUT:
            toast.error('Tempo esgotado ao obter localização.');
            break;
          default:
            toast.error('Erro ao obter localização.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const handleSendLocation = async (latitude: number, longitude: number, name: string, address: string) => {
    if (!onSendLocation) return false;
    
    setSendingLocation(true);
    try {
      const success = await onSendLocation(latitude, longitude, name, address);
      if (success) {
        setShowLocationModal(false);
        setLocationCoords(null);
      }
      return success;
    } finally {
      setSendingLocation(false);
    }
  };

  const handleSendAudio = async () => {
    if (!audioBlob || sendingRef.current) return;
    
    sendingRef.current = true;
    setIsSending(true);
    setUploading(true);
    
    try {
      // audioBlob já vem em MP3 do hook useAudioRecorder
      const url = await uploadMedia(audioBlob, `audio_${Date.now()}.mp3`);
      if (url) {
        await onSendMedia(url, 'audio');
        clearRecording();
      }
    } finally {
      setUploading(false);
      setIsSending(false);
      sendingRef.current = false;
    }
  };

  const handleSend = async () => {
    if (disabled || uploading || sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    
    try {
      if (audioBlob) {
        await handleSendAudio();
        return;
      }

      if (mediaPreview) {
        setUploading(true);
        const url = await uploadMedia(mediaPreview.file, mediaPreview.file.name);
        if (url) {
          await onSendMedia(url, mediaPreview.type, messageInput.trim() || undefined, mediaPreview.file.name);
          clearMedia();
          setMessageInput('');
        }
        setUploading(false);
        return;
      }

      if (messageInput.trim()) {
        const success = await onSendText(messageInput);
        if (success !== false) {
          setMessageInput('');
        }
      }
    } finally {
      setIsSending(false);
      sendingRef.current = false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStopAndSend = () => {
    if (!isRecording) return;
    stopRecording();
    setAutoSendAfterStop(true);
  };

  const handleCancelRecording = () => {
    cancelRecording();
    setAutoSendAfterStop(false);
  };

  // Remover isWindowOpen da lógica de disabled - apenas usar disabled e inCooldown
  const isDisabled = disabled || uploading || inCooldown || isSending;
  const canSend = !isDisabled && (messageInput.trim() || mediaPreview || audioBlob);

  return (
    <div className="p-3 border-t bg-card space-y-2">
      {/* Hidden inputs */}
      <input ref={imageInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />

      {/* Media Preview - Above input */}
      {mediaPreview && (
        <div className="relative bg-muted rounded-lg p-3">
          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearMedia}>
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            {mediaPreview.type === 'image' && (
              <img src={mediaPreview.url} alt="Preview" className="h-16 w-16 object-cover rounded" />
            )}
            {mediaPreview.type === 'video' && (
              <video src={mediaPreview.url} className="h-16 w-16 object-cover rounded" />
            )}
            {(mediaPreview.type === 'document' || mediaPreview.type === 'audio') && (
              <div className="h-16 w-16 bg-background rounded flex items-center justify-center">
                <Paperclip className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaPreview.file.name}</p>
              <p className="text-xs text-muted-foreground">{(mediaPreview.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Audio Preview - only show when NOT recording and has audioBlob */}
      {audioBlob && !mediaPreview && !isRecording && (
        <div className="relative bg-muted rounded-lg p-3">
          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={clearRecording}>
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            {audioUrl && <audio controls src={audioUrl} className="flex-1 h-8" />}
          </div>
        </div>
      )}

      {/* Recording controls - 3 clear buttons */}
      {isRecording && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium text-destructive">
            {formatTime(recordingTime)}
          </span>
          
          <div className="flex-1" />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancelRecording}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={stopRecording}
            className="h-8"
          >
            <Square className="h-4 w-4 mr-1" />
            Parar
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleStopAndSend}
            className="h-8"
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </div>
      )}

      {/* Main input row - hide mic button during recording */}
      <div className="flex gap-1.5 items-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isDisabled || isRecording} className="h-9 w-9 shrink-0">
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} className="h-9 w-9" title="Foto/Vídeo">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-9 w-9" title="Arquivo">
                <Paperclip className="h-5 w-5" />
              </Button>
              {onSendLocation && (
                <Button variant="ghost" size="icon" onClick={handleLocationRequest} className="h-9 w-9" title="Localização">
                  <MapPin className="h-5 w-5" />
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <QuickTextSelector
          projectId={projectId}
          onSelect={(text) => setMessageInput(text)}
          disabled={isDisabled || isRecording}
        />

        {/* AI Buttons */}
        <TooltipProvider>
          {messageInput.trim() ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleImproveText}
                  disabled={isDisabled || isRecording || isImproving}
                  className="h-9 w-9 shrink-0 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10"
                >
                  {isImproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Melhorar texto com IA{assignedAgentName ? ` (${assignedAgentName})` : ''}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGenerateAI}
                  disabled={isDisabled || isRecording || isGenerating || chatMessages.length === 0}
                  className="h-9 w-9 shrink-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Gerar resposta com IA{assignedAgentName ? ` (${assignedAgentName})` : ''}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>

        <div className="relative flex-1">
          <Textarea
            placeholder={inCooldown ? "Aguardando..." : isRecording ? "Gravando..." : mediaPreview ? "Legenda (opcional)" : "Mensagem..."}
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // Limpa a marca d'água se o usuário editar o texto manualmente
              if (generatedByAgent) {
                setGeneratedByAgent(null);
              }
            }}
            onKeyDown={handleKeyPress}
            disabled={isDisabled || isRecording}
            className={`min-h-[48px] max-h-[160px] resize-none w-full py-3 text-base leading-relaxed ${isDisabled ? 'opacity-50' : ''} ${generatedByAgent ? 'pr-24' : ''}`}
            rows={2}
          />
          {generatedByAgent && messageInput && (
            <div className="absolute right-2 bottom-2 flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
              <Sparkles className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{generatedByAgent}</span>
            </div>
          )}
        </div>

        {/* Mic button - only show when NOT recording */}
        {!isRecording && (
          <Button
            variant="ghost"
            size="icon"
            onClick={startRecording}
            disabled={isDisabled}
            className="h-9 w-9 shrink-0"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}

        <Button onClick={handleSend} disabled={!canSend || isRecording} size="icon" className="h-9 w-9 shrink-0">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Location Modal */}
      {locationCoords && (
        <LocationSendModal
          open={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setLocationCoords(null);
          }}
          onSend={handleSendLocation}
          latitude={locationCoords.lat}
          longitude={locationCoords.lon}
          sending={sendingLocation}
        />
      )}
    </div>
  );
}
