import noPhotoPlaceholder from "@/assets/no-photo-placeholder.png";

/**
 * Retorna a URL da foto do lead ou a imagem padrão "Sem Imagem"
 */
export const getLeadPhotoUrl = (photoUrl: string | null | undefined): string => {
  if (!photoUrl || 
      typeof photoUrl !== 'string' || 
      photoUrl.trim() === '' ||
      photoUrl === '—' ||
      photoUrl === 'null' ||
      photoUrl === 'undefined' ||
      photoUrl === '[]') {
    return noPhotoPlaceholder;
  }
  
  // Tratar caso de array JSON: ["url"] ou ["url1", "url2"]
  if (photoUrl.startsWith('[') && photoUrl.endsWith(']')) {
    try {
      const parsed = JSON.parse(photoUrl);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0];
      }
      return noPhotoPlaceholder;
    } catch {
      return noPhotoPlaceholder;
    }
  }
  
  return photoUrl;
};
