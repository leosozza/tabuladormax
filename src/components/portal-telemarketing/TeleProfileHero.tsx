import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeleProfileHeroProps {
  operatorName: string;
  operatorPhoto?: string | null;
  operatorBitrixId: number;
  isSupervisor: boolean;
  onLogout: () => void;
  onPhotoUpdated: (newPhotoUrl: string) => void;
}

export const TeleProfileHero = ({
  operatorName,
  operatorPhoto,
  operatorBitrixId,
  isSupervisor,
  onLogout,
  onPhotoUpdated
}: TeleProfileHeroProps) => {
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${operatorBitrixId}-${Date.now()}.${fileExt}`;
      const filePath = `operator-photos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update database
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
      console.error('Error uploading photo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a foto.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[hsl(var(--primary)/0.3)] to-background py-8 px-4 relative">
      {/* Logout button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onLogout}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        title="Sair"
      >
        <LogOut className="w-5 h-5" />
      </Button>

      {/* Photo with border and online indicator */}
      <div className="relative mx-auto w-fit">
        <button
          onClick={handlePhotoClick}
          disabled={isUploading}
          className="relative group cursor-pointer disabled:cursor-wait"
        >
          <Avatar className="w-32 h-32 border-4 border-primary shadow-lg shadow-primary/20">
            <AvatarImage src={operatorPhoto || undefined} alt={operatorName} />
            <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* Camera overlay on hover */}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
          
          {/* Online indicator */}
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

      {/* Name and role */}
      <h1 className="text-2xl font-bold text-center mt-4 text-foreground">
        {operatorName}
      </h1>
      <p className="text-primary text-center font-semibold uppercase tracking-wider text-sm mt-1">
        {isSupervisor ? 'SUPERVISOR' : 'AGENTE'}
      </p>

      {/* Status badge */}
      <div className="flex justify-center mt-4">
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          System Active • Shift 1
        </Badge>
      </div>
    </div>
  );
};
