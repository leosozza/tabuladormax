import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { LogOut, Camera, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TelePhotoCropper } from './TelePhotoCropper';

interface TeleProfileHeroProps {
  operatorName: string;
  operatorPhoto?: string | null;
  operatorBitrixId: number;
  isSupervisor: boolean;
  onLogout: () => void;
  onPhotoUpdated: (newPhotoUrl: string) => void;
  onSettingsClick?: () => void;
}

export const TeleProfileHero = ({
  operatorName,
  operatorPhoto,
  operatorBitrixId,
  isSupervisor,
  onLogout,
  onPhotoUpdated,
  onSettingsClick
}: TeleProfileHeroProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const initials = operatorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    // Criar URL temporária para o cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropperOpen(true);
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setIsUploading(true);

    try {
      const fileName = `${operatorBitrixId}-${Date.now()}.jpg`;
      const filePath = `operator-photos/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar banco de dados
      const { error: updateError } = await supabase
        .from('telemarketing_operators')
        .update({ photo_url: publicUrl })
        .eq('bitrix_id', operatorBitrixId);

      if (updateError) throw updateError;

      onPhotoUpdated(publicUrl);
      
      toast({
        title: 'Sucesso',
        description: 'Foto atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a foto.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    }
  };

  const handleCropperClose = () => {
    setCropperOpen(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
  };

  return (
    <div className="bg-card py-8 px-4 relative">
      {/* Botões de configurações e sair */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {onSettingsClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="text-muted-foreground hover:text-foreground"
            title="Configurações"
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          className="text-muted-foreground hover:text-foreground"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Foto com borda e indicador online */}
      <div className="relative mx-auto w-fit">
        <button
          onClick={handlePhotoClick}
          disabled={isUploading}
          className="relative group cursor-pointer disabled:cursor-wait"
        >
          <div className="w-32 h-40 border-4 border-primary shadow-lg shadow-primary/20 rounded-lg overflow-hidden bg-primary/20">
            {operatorPhoto ? (
              <img 
                src={operatorPhoto} 
                alt={operatorName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary text-3xl font-bold">
                {initials}
              </div>
            )}
          </div>
          
          {/* Overlay da câmera ao passar o mouse */}
          <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
          
          {/* Indicador online */}
          <span className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-3 border-background animate-pulse" />
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Nome e cargo */}
      <h1 className="text-2xl font-bold text-center mt-4 text-foreground">
        {operatorName}
      </h1>
      <p className="text-primary text-center font-semibold uppercase tracking-wider text-sm mt-1">
        {isSupervisor ? 'SUPERVISOR' : 'AGENTE'}
      </p>

      {/* Badge de status */}
      <div className="flex justify-center mt-4">
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          Sistema Ativo • Turno 1
        </Badge>
      </div>

      {/* Modal de recorte */}
      {selectedImage && (
        <TelePhotoCropper
          imageSrc={selectedImage}
          isOpen={cropperOpen}
          onClose={handleCropperClose}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};
