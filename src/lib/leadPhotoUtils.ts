import noPhotoPlaceholder from "@/assets/no-photo-placeholder.png";

/**
 * Retorna a URL da foto do lead ou a imagem padrão "Sem Imagem"
 */
export const getLeadPhotoUrl = (photoUrl: string | null | undefined): string => {
  return photoUrl && photoUrl.trim() !== '' ? photoUrl : noPhotoPlaceholder;
};
