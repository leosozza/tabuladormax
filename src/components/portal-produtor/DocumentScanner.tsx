import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, RotateCcw, Loader2, Upload, SwitchCamera } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentScannerProps {
  onCapture: (imageDataUrl: string, canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
  title?: string;
}

export const DocumentScanner = ({ onCapture, onCancel, title = 'Escanear Documento' }: DocumentScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCamera, setHasCamera] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    setIsLoading(true);
    
    // Stop existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      setStream(mediaStream);
      setHasCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
      toast.error('Não foi possível acessar a câmera. Use o upload de arquivo.');
    } finally {
      setIsLoading(false);
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const switchCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCapture(imageDataUrl, canvas);
  }, [onCapture]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(imageDataUrl, canvas);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onCapture]);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {hasCamera ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Câmera não disponível. Use o botão abaixo para enviar uma foto.
              </p>
            </div>
          )}

          {/* Document guide overlay */}
          {hasCamera && !isLoading && (
            <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-lg pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Controls */}
        <div className="flex gap-2">
          {hasCamera && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                className="h-12 w-12"
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
              <Button
                onClick={capturePhoto}
                className="flex-1 h-12 gap-2"
                disabled={isLoading}
              >
                <Camera className="h-5 w-5" />
                Capturar
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => startCamera(facingMode)}
                className="h-12 w-12"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </>
          )}
          
          <Button
            variant={hasCamera ? 'outline' : 'default'}
            onClick={() => fileInputRef.current?.click()}
            className={hasCamera ? 'h-12 w-12' : 'flex-1 h-12 gap-2'}
          >
            <Upload className="h-5 w-5" />
            {!hasCamera && 'Enviar Foto'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Posicione o documento dentro das marcações para melhor resultado
        </p>
      </CardContent>
    </Card>
  );
};
