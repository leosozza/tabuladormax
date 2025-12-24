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
 * Verifica se o photo_url contém objetos Bitrix que precisam ser sincronizados
 */
export const needsPhotoSync = (photoUrl: string | null | undefined): boolean => {
  if (!photoUrl || typeof photoUrl !== 'string') return false;
  if (photoUrl.startsWith('[') && photoUrl.endsWith(']')) {
    try {
      const parsed = JSON.parse(photoUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Se é objeto com id (formato Bitrix não sincronizado)
        return typeof parsed[0] === 'object' && parsed[0] !== null && parsed[0].id;
      }
    } catch {
      return false;
    }
  }
  return false;
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
  
  // Tratar caso de array JSON: ["url"] ou ["url1", "url2"] ou objetos Bitrix
  if (photoUrl.startsWith('[') && photoUrl.endsWith(']')) {
    try {
      const parsed = JSON.parse(photoUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Se é string (URL direta), retornar
        if (typeof parsed[0] === 'string') {
          return parsed[0];
        }
        // Se é objeto Bitrix (não sincronizado), retornar placeholder
        if (typeof parsed[0] === 'object' && parsed[0]?.id) {
          return noPhotoPlaceholder;
        }
      }
      return noPhotoPlaceholder;
    } catch {
      return noPhotoPlaceholder;
    }
  }
  
  return photoUrl;
};
