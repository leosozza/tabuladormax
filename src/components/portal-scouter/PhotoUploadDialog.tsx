import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scouterId: string;
  scouterName: string;
  currentPhoto: string | null;
  onPhotoUpdated: (newPhotoUrl: string) => void;
}

export const PhotoUploadDialog = ({
  open,
  onOpenChange,
  scouterId,
  scouterName,
  currentPhoto,
  onPhotoUpdated
}: PhotoUploadDialogProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Converter para base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('update-scouter-photo', {
          body: {
            scouter_id: scouterId,
            image_data: base64Data,
            file_name: selectedFile.name
          }
        });

        if (error) throw error;

        if (data?.photo_url) {
          onPhotoUpdated(data.photo_url);
          toast.success('Foto atualizada com sucesso!');
          handleClose();
        }
      };
    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      toast.error('Erro ao atualizar foto. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Foto de Perfil</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Preview da foto */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
              <AvatarImage src={previewUrl || currentPhoto || undefined} />
              <AvatarFallback className="text-4xl bg-primary/10">
                {scouterName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="h-5 w-5" />
            </Button>
          </div>

          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Instruções */}
          <p className="text-sm text-muted-foreground text-center">
            Clique no ícone da câmera para selecionar uma nova foto.
            <br />
            Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
          </p>

          {selectedFile && (
            <p className="text-sm text-primary font-medium">
              Arquivo selecionado: {selectedFile.name}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Salvar Foto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
