import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Image, Paperclip, Mic, Square, X, Loader2, Plus } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
export type MediaType = 'image' | 'video' | 'audio' | 'document';

interface MediaPreview {
  file: File;
  type: MediaType;
  url: string;
}

interface ChatInputProps {
  onSendText: (message: string) => Promise<boolean | void>;
  onSendMedia: (mediaUrl: string, mediaType: MediaType, caption?: string, filename?: string) => Promise<boolean | void>;
  disabled?: boolean;
  isWindowOpen: boolean;
  inCooldown?: boolean;
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

export function ChatInput({ 
  onSendText, 
  onSendMedia, 
  disabled, 
  isWindowOpen,
  inCooldown 
}: ChatInputProps) {
  const [messageInput, setMessageInput] = useState('');
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
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

  // Upload file to Supabase Storage
  const uploadMedia = useCallback(async (file: File | Blob, filename: string): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${timestamp}_${safeName}`;
      
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[ChatInput] Upload error:', error);
        toast.error('Erro ao fazer upload do arquivo');
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('[ChatInput] Upload error:', err);
      toast.error('Erro ao fazer upload');
      return null;
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, acceptType?: 'image' | 'all') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (16MB para WhatsApp)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 16MB.');
      return;
    }

    const type = getMediaType(file);
    const url = URL.createObjectURL(file);
    
    setMediaPreview({ file, type, url });
    
    // Limpar input
    e.target.value = '';
  }, []);

  // Clear media preview
  const clearMedia = useCallback(() => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
    clearRecording();
  }, [mediaPreview, clearRecording]);

  // Estado para prevenir double-click
  const [isSending, setIsSending] = useState(false);

  // Mostrar erro de gravação apenas uma vez
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  // Handle send
  const handleSend = async () => {
    if (disabled || uploading || isSending) return;

    setIsSending(true);
    try {
      // Send audio recording
      if (audioBlob) {
        setUploading(true);
        try {
          // Determinar extensão baseada no tipo do blob
          const extension = audioBlob.type.includes('ogg') ? 'ogg' : 
                            audioBlob.type.includes('mp4') ? 'm4a' : 
                            audioBlob.type.includes('webm') ? 'ogg' : 'audio';
          const url = await uploadMedia(audioBlob, `audio.${extension}`);
          if (url) {
            await onSendMedia(url, 'audio');
            clearRecording();
          }
        } finally {
          setUploading(false);
        }
        return;
      }

      // Send media with optional caption
      if (mediaPreview) {
        setUploading(true);
        try {
          const url = await uploadMedia(mediaPreview.file, mediaPreview.file.name);
          if (url) {
            const caption = messageInput.trim() || undefined;
            await onSendMedia(url, mediaPreview.type, caption, mediaPreview.file.name);
            clearMedia();
            setMessageInput('');
          }
        } finally {
          setUploading(false);
        }
        return;
      }

      // Send text message
      if (messageInput.trim()) {
        const success = await onSendText(messageInput);
        if (success !== false) {
          setMessageInput('');
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Toggle recording
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      clearMedia();
      await startRecording();
    }
  };

  const isDisabled = disabled || uploading || inCooldown || isSending;
  const canSend = !isDisabled && (messageInput.trim() || mediaPreview || audioBlob);

  return (
    <div className="space-y-2">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={(e) => handleFileSelect(e, 'all')}
        className="hidden"
      />

      {/* Media Preview */}
      {mediaPreview && (
        <div className="relative bg-muted rounded-lg p-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={clearMedia}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            {mediaPreview.type === 'image' && (
              <img 
                src={mediaPreview.url} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded"
              />
            )}
            {mediaPreview.type === 'video' && (
              <video 
                src={mediaPreview.url} 
                className="h-20 w-20 object-cover rounded"
              />
            )}
            {(mediaPreview.type === 'document' || mediaPreview.type === 'audio') && (
              <div className="h-20 w-20 bg-background rounded flex items-center justify-center">
                <Paperclip className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaPreview.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(mediaPreview.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audio Recording Preview */}
      {audioBlob && !mediaPreview && (
        <div className="relative bg-muted rounded-lg p-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={clearRecording}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-10" />
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Gravando... {formatTime(recordingTime)}
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelRecording}
            className="text-red-600 hover:text-red-700"
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Main input area - Compact layout */}
      <div className="flex gap-1.5 items-end">
        {/* Menu de anexos */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDisabled || isRecording || !isWindowOpen}
              className="h-9 w-9 shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  imageInputRef.current?.click();
                }}
                className="h-9 w-9"
                title="Foto/Vídeo"
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="h-9 w-9"
                title="Arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Text input */}
        <Textarea
          placeholder={
            inCooldown 
              ? "Aguardando..." 
              : isRecording 
              ? "Gravando..."
              : mediaPreview 
              ? "Legenda (opcional)"
              : "Mensagem..."
          }
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isDisabled || isRecording}
          className={`min-h-[36px] max-h-[100px] resize-none flex-1 py-2 text-sm ${
            isDisabled ? 'opacity-50' : ''
          }`}
          rows={1}
        />

        {/* Mic button - sempre visível */}
        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size="icon"
          onClick={toggleRecording}
          disabled={isDisabled || !isWindowOpen}
          title={isRecording ? "Parar" : "Gravar"}
          className="h-9 w-9 shrink-0"
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
