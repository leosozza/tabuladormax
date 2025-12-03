import noPhotoPlaceholder from "@/assets/no-photo-placeholder.png";

/**
 * Extrai IDs de arquivos do campo photo_url quando contém objetos Bitrix
 * Ex: '[{"id":1225670, "showUrl": "..."}]' -> [1225670]
 */
export const extractPhotoFileIds = (photoUrl: string | null | undefined): number[] => {
  if (!photoUrl || typeof photoUrl !== 'string') return [];
  
  if (photoUrl.startsWith('[') && photoUrl.endsWith(']')) {
    try {
      const parsed = JSON.parse(photoUrl);
      if (Array.isArray(parsed)) {
        const ids = parsed
          .filter(item => typeof item === 'object' && item !== null && item.id)
          .map(item => typeof item.id === 'number' ? item.id : parseInt(item.id))
          .filter(id => !isNaN(id));
        return ids;
      }
    } catch {
      return [];
    }
  }
  return [];
};

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
