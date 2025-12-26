import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, RotateCw, Loader2 } from 'lucide-react';
import { Corners, Point, applyPerspectiveTransform, enhanceDocument, getDefaultCorners, canvasToBlob } from '@/lib/documentScanner';

interface DocumentCropEditorProps {
  imageDataUrl: string;
  sourceCanvas: HTMLCanvasElement;
  onConfirm: (processedBlob: Blob) => void;
  onCancel: () => void;
}

export const DocumentCropEditor = ({ 
  imageDataUrl, 
  sourceCanvas, 
  onConfirm, 
  onCancel 
}: DocumentCropEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [corners, setCorners] = useState<Corners | null>(null);
  const [dragging, setDragging] = useState<keyof Corners | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Initialize corners when image loads
  useEffect(() => {
    const defaultCorners = getDefaultCorners(sourceCanvas.width, sourceCanvas.height, 0.08);
    setCorners(defaultCorners);
    
    // Calculate scale to fit container
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32;
      const containerHeight = containerRef.current.clientHeight - 32;
      const scaleX = containerWidth / sourceCanvas.width;
      const scaleY = containerHeight / sourceCanvas.height;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, [sourceCanvas]);

  const handlePointerDown = useCallback((corner: keyof Corners) => {
    setDragging(corner);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !corners || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - 16) / scale;
    const y = (e.clientY - rect.top - 16) / scale;

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(sourceCanvas.width, x));
    const clampedY = Math.max(0, Math.min(sourceCanvas.height, y));

    setCorners(prev => prev ? {
      ...prev,
      [dragging]: { x: clampedX, y: clampedY }
    } : null);
  }, [dragging, corners, scale, sourceCanvas]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleConfirm = async () => {
    if (!corners) return;
    
    setIsProcessing(true);
    
    try {
      // Apply rotation if needed
      let workingCanvas = sourceCanvas;
      if (rotation !== 0) {
        workingCanvas = rotateCanvas(sourceCanvas, rotation);
      }

      // Apply perspective transform
      const transformedCanvas = applyPerspectiveTransform(workingCanvas, corners);
      
      // Enhance the document
      const enhancedCanvas = enhanceDocument(transformedCanvas, {
        contrast: 1.15,
        brightness: 1.05,
      });
      
      // Convert to blob
      const blob = await canvasToBlob(enhancedCanvas, 0.92);
      onConfirm(blob);
    } catch (error) {
      console.error('Error processing document:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const rotateCanvas = (canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement => {
    const rotated = document.createElement('canvas');
    const ctx = rotated.getContext('2d')!;
    
    if (degrees === 90 || degrees === 270) {
      rotated.width = canvas.height;
      rotated.height = canvas.width;
    } else {
      rotated.width = canvas.width;
      rotated.height = canvas.height;
    }
    
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotated;
  };

  const cornerPositions: (keyof Corners)[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ajustar Recorte</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Editor Area */}
        <div 
          ref={containerRef}
          className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Image */}
          <img
            src={imageDataUrl}
            alt="Document"
            className="absolute"
            style={{
              left: 16,
              top: 16,
              width: sourceCanvas.width * scale,
              height: sourceCanvas.height * scale,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center',
            }}
            draggable={false}
          />

          {/* Corner handles and lines */}
          {corners && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ 
                left: 16, 
                top: 16,
                width: sourceCanvas.width * scale,
                height: sourceCanvas.height * scale,
              }}
            >
              {/* Selection polygon */}
              <polygon
                points={`
                  ${corners.topLeft.x * scale},${corners.topLeft.y * scale}
                  ${corners.topRight.x * scale},${corners.topRight.y * scale}
                  ${corners.bottomRight.x * scale},${corners.bottomRight.y * scale}
                  ${corners.bottomLeft.x * scale},${corners.bottomLeft.y * scale}
                `}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              />
            </svg>
          )}

          {/* Draggable corner handles */}
          {corners && cornerPositions.map((cornerKey) => {
            const corner = corners[cornerKey];
            return (
              <div
                key={cornerKey}
                className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-move touch-none pointer-events-auto"
                style={{
                  left: corner.x * scale + 16,
                  top: corner.y * scale + 16,
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handlePointerDown(cornerKey);
                }}
              >
                <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg" />
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRotate}
            className="h-12 gap-2"
          >
            <RotateCw className="h-5 w-5" />
            Girar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 h-12 gap-2"
            disabled={isProcessing || !corners}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            Aplicar e Salvar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Arraste os pontos para ajustar as bordas do documento
        </p>
      </CardContent>
    </Card>
  );
};
