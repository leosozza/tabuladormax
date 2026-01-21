import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { LogOut, Camera, Settings, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TelePhotoCropper } from './TelePhotoCropper';
import { TeleCoverPattern, CoverPattern } from './TeleCoverPatterns';
import { TeleCoverSelector } from './TeleCoverSelector';

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
  const [coverSelectorOpen, setCoverSelectorOpen] = useState(false);
  const [coverPattern, setCoverPattern] = useState<CoverPattern>('circles');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Carregar padrão salvo do localStorage
  useEffect(() => {
    const savedPattern = localStorage.getItem(`cover-pattern-${operatorBitrixId}`);
    if (savedPattern && ['circles', 'lines', 'dots', 'waves', 'triangles', 'grid'].includes(savedPattern)) {
      setCoverPattern(savedPattern as CoverPattern);
    }
  }, [operatorBitrixId]);

  const handleCoverSelect = (pattern: CoverPattern) => {
    setCoverPattern(pattern);
    localStorage.setItem(`cover-pattern-${operatorBitrixId}`, pattern);
    toast({
      title: 'Sucesso',
      description: 'Capa atualizada com sucesso!'
    });
  };

  const initials = operatorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropperOpen(true);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setIsUploading(true);
    try {
      const fileName = `${operatorBitrixId}-${Date.now()}.jpg`;
      const filePath = `operator-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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
    <div className="relative overflow-hidden">
      {/* Background com padrão geométrico */}
      <div className="absolute inset-0 bg-card">
        <TeleCoverPattern pattern={coverPattern} className="opacity-100" />
      </div>

      {/* Conteúdo */}
      <div className="relative py-8 px-4">
        {/* Botões de configurações, capa e sair */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCoverSelectorOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Mudar capa"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
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
                <img src={operatorPhoto} alt={operatorName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
            
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
        </div>
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

      {/* Modal de seleção de capa */}
      <TeleCoverSelector
        isOpen={coverSelectorOpen}
        onClose={() => setCoverSelectorOpen(false)}
        currentPattern={coverPattern}
        onSelect={handleCoverSelect}
      />
    </div>
  );
};