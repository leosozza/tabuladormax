import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Camera, User, Ruler, Instagram as InstagramIcon, Sparkles, Send, MapPin, Loader2, Phone } from "lucide-react";
import { FormSection } from "@/components/cadastro/FormSection";
import { PreCadastroFooter } from "@/components/precadastro/PreCadastroFooter";
import { FormField } from "@/components/cadastro/FormField";
import { MultiSelect } from "@/components/cadastro/MultiSelect";
import { DateSelectField } from "@/components/cadastro/DateSelectField";
import { estadosBrasileiros, tamanhoSapato } from "@/data/preCadastroOptions";
import { supabase } from "@/integrations/supabase/client";
import { getLeadPhotoUrl } from "@/lib/leadPhotoUtils";

// ========================================================================
// MAPEAMENTO DE CAMPOS DO BITRIX LEAD
// ========================================================================
const BITRIX_LEAD_FIELD_MAPPING = {
  nomeModelo: 'UF_CRM_LEAD_1732627097745',
  dataNascimento: 'BIRTHDATE',
  estadoCivil: 'UF_CRM_1762283540',
  cidade: 'ADDRESS_CITY',
  estado: 'ADDRESS_PROVINCE',
  altura: 'UF_CRM_1733485575',
  peso: 'UF_CRM_1733485977896',
  manequim: 'UF_CRM_1762283056',
  tamanhoSapato: 'UF_CRM_1733485454702',
  corPele: 'UF_CRM_1762283877',
  corCabelo: 'UF_CRM_1762283650',
  corOlhos: 'UF_CRM_1733485183850',
  tipoCabelo: 'UF_CRM_1733485270151',
  habilidades: 'UF_CRM_1762282315',
  cursos: 'UF_CRM_1762282626',
  caracteristicas: 'UF_CRM_1762282725',
  tipoModelo: 'UF_CRM_1762282818',
  fotoUrl: 'UF_CRM_LEAD_1733231445171',
  fotoIds: 'UF_CRM_1764358561',
  clienteAtualizaFoto: 'UF_CRM_CLIENTEATUALIZAFOTO',
  sexo: 'sexo_local',
  instagram: 'instagram_local',
  tiktok: 'tiktok_local'
} as const;

// ========================================================================
// OPÇÕES COM IDs DO BITRIX
// ========================================================================
const ESTADO_CIVIL_OPTIONS = [{
  value: '9418',
  label: 'Casado(a)'
}, {
  value: '9420',
  label: 'Divorciado(a)'
}, {
  value: '9422',
  label: 'Solteiro(a)'
}, {
  value: '9424',
  label: 'Viúvo(a)'
}];
const SEXO_OPTIONS = [{
  value: 'M',
  label: 'Masculino'
}, {
  value: 'F',
  label: 'Feminino'
}];
const COR_PELE_OPTIONS = [{
  value: '9446',
  label: 'Branca'
}, {
  value: '9448',
  label: 'Negra'
}, {
  value: '9450',
  label: 'Oriental'
}, {
  value: '9452',
  label: 'Parda'
}];
const COR_CABELO_OPTIONS = [{
  value: '9440',
  label: 'Loiro'
}, {
  value: '10298',
  label: 'Castanho Claro'
}, {
  value: '10300',
  label: 'Castanho Médio'
}, {
  value: '10302',
  label: 'Castanho Escuro'
}, {
  value: '9442',
  label: 'Preto'
}, {
  value: '10304',
  label: 'Ruivo'
}];
const COR_OLHOS_OPTIONS = [{
  value: '434',
  label: 'Azul'
}, {
  value: '438',
  label: 'Castanho'
}, {
  value: '440',
  label: 'Cinza'
}, {
  value: '442',
  label: 'Preto'
}, {
  value: '436',
  label: 'Verde'
}];
const TIPO_CABELO_OPTIONS = [{
  value: '444',
  label: 'Liso'
}, {
  value: '446',
  label: 'Ondulado'
}, {
  value: '448',
  label: 'Cacheado'
}, {
  value: '450',
  label: 'Crespo'
}, {
  value: '2258',
  label: 'Natural'
}, {
  value: '2260',
  label: 'Outros'
}];
const MANEQUIM_OPTIONS = [{
  value: '9374',
  label: '6'
}, {
  value: '9376',
  label: '8'
}, {
  value: '9378',
  label: '10'
}, {
  value: '9380',
  label: '12'
}, {
  value: '9382',
  label: '14'
}, {
  value: '9384',
  label: '16'
}, {
  value: '9386',
  label: '18'
}, {
  value: '9388',
  label: '20'
}, {
  value: '9390',
  label: '22'
}, {
  value: '9392',
  label: '24'
}, {
  value: '9394',
  label: '26'
}, {
  value: '9396',
  label: '28'
}, {
  value: '9398',
  label: '30'
}, {
  value: '9400',
  label: '32'
}, {
  value: '9402',
  label: '34'
}, {
  value: '9404',
  label: '36'
}, {
  value: '452',
  label: '38'
}, {
  value: '454',
  label: '40'
}, {
  value: '3946',
  label: '42'
}, {
  value: '9406',
  label: '44'
}, {
  value: '9408',
  label: '46'
}, {
  value: '9410',
  label: '48'
}, {
  value: '9412',
  label: '50'
}, {
  value: '9414',
  label: '52'
}, {
  value: '9416',
  label: '54'
}];
const IDIOMAS_OPTIONS = [{
  value: '9268',
  label: 'Inglês'
}, {
  value: '9266',
  label: 'Espanhol'
}, {
  value: '9280',
  label: 'Libras'
}];
const TALENTOS_OPTIONS = [{
  value: '9228',
  label: 'Atua'
}, {
  value: '9232',
  label: 'Canta'
}, {
  value: '9234',
  label: 'Dança'
}, {
  value: '9236',
  label: 'Esportes'
}, {
  value: '9238',
  label: 'Instrumentos'
}, {
  value: '9240',
  label: 'Malabarismo'
}];
const EXPERIENCIA_OPTIONS = [{
  value: '9304',
  label: 'Publicidade'
}, {
  value: '9302',
  label: 'Fashion'
}, {
  value: '9306',
  label: 'Elenco'
}, {
  value: '9308',
  label: 'Figuração'
}];
const TIPO_MODELO_OPTIONS = [{
  value: '9242',
  label: 'Moda'
}, {
  value: '9244',
  label: 'Publicidade'
}, {
  value: '9246',
  label: 'Catálogo'
}, {
  value: '9248',
  label: 'Editorial'
}, {
  value: '9250',
  label: 'Fitness'
}, {
  value: '9252',
  label: 'Plus Size'
}, {
  value: '9254',
  label: 'Lingerie'
}, {
  value: '9256',
  label: 'Partes (Mãos, Pés, etc)'
}, {
  value: '9258',
  label: 'Criança'
}, {
  value: '9260',
  label: 'Maduro/Senior'
}];
const HABILIDADES_OPTIONS = [{
  value: '9228',
  label: 'Atua'
}, {
  value: '9230',
  label: 'Bilingue'
}, {
  value: '9232',
  label: 'Canta'
}, {
  value: '9234',
  label: 'Dança'
}, {
  value: '9236',
  label: 'Desfila'
}, {
  value: '9238',
  label: 'DRT'
}, {
  value: '9240',
  label: 'Figurantes'
}, {
  value: '9242',
  label: 'Joga Futebol'
}, {
  value: '9244',
  label: 'Outros, colocar em informações'
}, {
  value: '9246',
  label: 'Segura texto'
}];
const CURSOS_OPTIONS = [{
  value: '9262',
  label: 'Canto'
}, {
  value: '9264',
  label: 'Dança'
}, {
  value: '9266',
  label: 'Espanhol'
}, {
  value: '9268',
  label: 'Exclusivo'
}, {
  value: '9270',
  label: 'Formatura CWB'
}, {
  value: '9272',
  label: 'Ginástica Artística'
}, {
  value: '9274',
  label: 'Inglês'
}, {
  value: '9276',
  label: 'Outros, colocar em informações'
}, {
  value: '9278',
  label: 'Passarela'
}, {
  value: '9280',
  label: 'Teatro'
}, {
  value: '9282',
  label: 'Toca Instrumento Musical'
}, {
  value: '9284',
  label: 'Workshop Gui'
}];
const CARACTERISTICAS_OPTIONS = [{
  value: '9286',
  label: 'Comunicativo'
}, {
  value: '9288',
  label: 'Desinibida'
}, {
  value: '9290',
  label: 'Dinâmica'
}, {
  value: '9292',
  label: 'Esperto'
}, {
  value: '9294',
  label: 'Espontâneo'
}, {
  value: '9296',
  label: 'Interativa'
}, {
  value: '9298',
  label: 'Risonho'
}];
interface LeadData {
  nomeResponsavel: string;
  estadoCivil: string;
  telefone: string;
  cidade: string;
  estado: string;
  nomeModelo: string;
  dataNascimento: string;
  sexo: string;
  altura: string;
  peso: string;
  manequim: string;
  corPele: string;
  corCabelo: string;
  corOlhos: string;
  tipoCabelo: string;
  tamanhoSapato: string;
  tipoModelo: string;
  instagram: string;
  tiktok: string;
  habilidades: string[];
  cursos: string[];
  caracteristicasEspeciais: string[];
}
const normalizeEnumerationValue = (value: unknown): string | string[] => {
  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }
  return String(value || '');
};
const convertImageToJpeg = async (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1920;
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round(height * MAX_DIMENSION / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round(width * MAX_DIMENSION / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao converter imagem'));
        }
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};
const urlToBase64 = async (url: string): Promise<{
  filename: string;
  base64: string;
} | null> => {
  try {
    if (!url || url.includes('no-photo-placeholder')) {
      return null;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const filename = `foto_${Date.now()}.jpg`;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIndex = result.indexOf(',');
          resolve(commaIndex >= 0 ? result.substring(commaIndex + 1) : result);
        } else {
          reject(new Error('Falha ao ler blob como Data URL'));
        }
      };
      reader.onerror = () => {
        reject(reader.error || new Error('Erro ao ler blob'));
      };
      reader.readAsDataURL(blob);
    });
    return {
      filename,
      base64
    };
  } catch (error) {
    console.error('Erro ao converter URL para base64:', error);
    return null;
  }
};

// Helper function to parse and format birthdate from Bitrix
const parseBirthDate = (value: any): string => {
  if (!value) return "";

  // If already in YYYY-MM-DD format, return as is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Try to parse ISO date (e.g., "2025-07-03T03:00:00+03:00")
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Error parsing birth date:', e);
  }
  return "";
};
const PreCadastro = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('lead');
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSyncingPhotos, setIsSyncingPhotos] = useState(false);
  const [photosBase64Cache, setPhotosBase64Cache] = useState<Map<string, {
    filename: string;
    base64: string;
  }>>(new Map());
  const [phoneEditable, setPhoneEditable] = useState(false);
  const [leadData, setLeadData] = useState<LeadData>({
    nomeResponsavel: "",
    estadoCivil: "",
    telefone: "",
    cidade: "",
    estado: "",
    nomeModelo: "",
    dataNascimento: "",
    sexo: "",
    altura: "",
    peso: "",
    manequim: "",
    corPele: "",
    corCabelo: "",
    corOlhos: "",
    tipoCabelo: "",
    tamanhoSapato: "",
    tipoModelo: "",
    instagram: "",
    tiktok: "",
    habilidades: [],
    cursos: [],
    caracteristicasEspeciais: []
  });
  const syncPhotosInBackground = async (numericLeadId: number, fileIds: number[]) => {
    if (!fileIds.length) return;
    try {
      setIsSyncingPhotos(true);
      const {
        data,
        error
      } = await supabase.functions.invoke('bitrix-photo-sync', {
        body: {
          leadId: numericLeadId,
          fileIds
        }
      });
      if (error) {
        console.error('❌ Erro ao sincronizar fotos:', error);
        toast.error('Erro ao sincronizar fotos do Bitrix');
        return;
      }
      if (data?.publicUrls && Array.isArray(data.publicUrls) && data.publicUrls.length > 0) {
        setImages(prev => {
          const withoutPlaceholder = prev.filter(img => !img.includes('no-photo-placeholder'));
          return data.publicUrls.length > 0 ? data.publicUrls : withoutPlaceholder;
        });
        toast.success(`${data.publicUrls.length} fotos sincronizadas!`);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao sincronizar fotos:', error);
    } finally {
      setIsSyncingPhotos(false);
    }
  };
  useEffect(() => {
    const convertInBackground = async () => {
      for (const imageUrl of images) {
        if (imageUrl && !imageUrl.includes('no-photo-placeholder') && !photosBase64Cache.has(imageUrl)) {
          try {
            const result = await urlToBase64(imageUrl);
            if (result) {
              setPhotosBase64Cache(prev => {
                const newCache = new Map(prev);
                newCache.set(imageUrl, result);
                return newCache;
              });
            }
          } catch (error) {
            console.error('Erro ao converter foto em background:', error);
          }
        }
      }
    };
    convertInBackground();
  }, [images, photosBase64Cache]);
  const validatePhoto = async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const {
        data,
        error
      } = await supabase.functions.invoke('face-detection', {
        body: formData
      });
      if (error) {
        console.error('Erro na validação:', error);
        toast.warning("Não foi possível validar a foto. Ela será enviada mesmo assim.");
        return true;
      }
      return data?.valid === true;
    } catch (err) {
      console.error('Erro inesperado:', err);
      return true;
    }
  };
  useEffect(() => {
    const loadLeadData = async () => {
      if (!leadId) {
        setImages([getLeadPhotoUrl(null)]);
        setPageLoading(false);
        return;
      }
      try {
        const {
          data: lead,
          error
        } = await supabase.from('leads').select('*').eq('id', parseInt(leadId)).single();
        if (error) throw error;
        if (lead) {
          const rawData = lead.raw as any || {};
          setLeadData({
            nomeResponsavel: lead.nome_responsavel_legal || "",
            estadoCivil: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.estadoCivil]) as string,
            telefone: lead.celular || lead.telefone_casa || "",
            cidade: rawData[BITRIX_LEAD_FIELD_MAPPING.cidade] || "",
            estado: rawData[BITRIX_LEAD_FIELD_MAPPING.estado] || "",
            nomeModelo: lead.nome_modelo || lead.name || "",
            dataNascimento: parseBirthDate(rawData[BITRIX_LEAD_FIELD_MAPPING.dataNascimento]),
            sexo: rawData[BITRIX_LEAD_FIELD_MAPPING.sexo] || "",
            altura: rawData[BITRIX_LEAD_FIELD_MAPPING.altura] || "",
            peso: rawData[BITRIX_LEAD_FIELD_MAPPING.peso] || "",
            manequim: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.manequim]) as string,
            corPele: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.corPele]) as string,
            corCabelo: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.corCabelo]) as string,
            corOlhos: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.corOlhos]) as string,
            tipoCabelo: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.tipoCabelo]) as string,
            tamanhoSapato: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.tamanhoSapato]) as string,
            tipoModelo: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.tipoModelo]) as string,
            instagram: rawData[BITRIX_LEAD_FIELD_MAPPING.instagram] || "",
            tiktok: rawData[BITRIX_LEAD_FIELD_MAPPING.tiktok] || "",
            habilidades: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.habilidades]) as string[],
            cursos: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.cursos]) as string[],
            caracteristicasEspeciais: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.caracteristicas]) as string[]
          });
          const photoUrls: string[] = [];
          let fileIdsToSync: number[] = [];
          if (lead.additional_photos && Array.isArray(lead.additional_photos) && lead.additional_photos.length > 0) {
            const cachedPhotos = lead.additional_photos.filter((url): url is string => typeof url === 'string');
            if (cachedPhotos.length > 0) {
              photoUrls.push(...cachedPhotos);
            }
          }
          if (photoUrls.length === 0) {
            const newPhotoField = rawData.UF_CRM_1764358561 || rawData[BITRIX_LEAD_FIELD_MAPPING.fotoIds];
            if (newPhotoField) {
              if (Array.isArray(newPhotoField)) {
                fileIdsToSync = newPhotoField.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => !isNaN(id));
              } else if (typeof newPhotoField === 'string' && newPhotoField.trim()) {
                fileIdsToSync = newPhotoField.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
              }
              if (fileIdsToSync.length > 0) {
                syncPhotosInBackground(parseInt(leadId), fileIdsToSync);
              }
            }
          }
          if (photoUrls.length > 0) {
            setImages(photoUrls);
          } else {
            setImages([getLeadPhotoUrl(lead.photo_url)]);
          }
        }
        setPageLoading(false);
      } catch (error) {
        console.error('Erro ao carregar lead:', error);
        toast.error("Erro ao carregar dados");
        setPageLoading(false);
      }
    };
    loadLeadData();
  }, [leadId]);
  useEffect(() => {
    const detectLocation = async () => {
      if (!leadData.cidade || !leadData.estado) {
        try {
          const {
            data,
            error
          } = await supabase.functions.invoke('get-location');
          if (error) throw error;
          if (data?.success && data.cidade && data.estado) {
            setLeadData(prev => ({
              ...prev,
              cidade: data.cidade,
              estado: data.estado
            }));
            toast.success(`Localização detectada: ${data.cidade}, ${data.estado}`);
          }
        } catch (error) {
          console.error('Failed to detect location:', error);
        }
      }
    };
    if (!pageLoading) {
      detectLocation();
    }
  }, [pageLoading, leadData.cidade, leadData.estado]);
  const handleAddPhoto = () => {
    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      toast.error("Máximo de 10 fotos");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async e => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        toast.warning(`Apenas ${remainingSlots} fotos foram adicionadas (limite de 10)`);
      }
      setIsUploadingPhotos(true);
      const validFiles: {
        file: File;
        localUrl: string;
      }[] = [];
      for (const file of filesToProcess) {
        const localUrl = URL.createObjectURL(file);
        setImages(prev => [...prev.filter(img => !img.includes('no-photo-placeholder')), localUrl]);
        const isValid = await validatePhoto(file);
        if (!isValid) {
          setImages(prev => prev.filter(url => url !== localUrl));
          URL.revokeObjectURL(localUrl);
          toast.error("Não conseguimos identificar um rosto nessa foto. Envie uma foto em que o rosto do(a) modelo apareça com clareza.");
          continue;
        }
        validFiles.push({
          file,
          localUrl
        });
      }
      if (validFiles.length === 0) {
        setIsUploadingPhotos(false);
        return;
      }
      for (const {
        file,
        localUrl
      } of validFiles) {
        try {
          const jpegBlob = await convertImageToJpeg(file);
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
          const tempId = leadId || `temp_${Date.now()}`;
          const filePath = `${tempId}/${fileName}`;
          const {
            error
          } = await supabase.storage.from('lead-photos').upload(filePath, jpegBlob, {
            contentType: 'image/jpeg'
          });
          if (!error) {
            const {
              data: {
                publicUrl
              }
            } = supabase.storage.from('lead-photos').getPublicUrl(filePath);
            setImages(prev => prev.map(img => img === localUrl ? publicUrl : img));
            URL.revokeObjectURL(localUrl);
            const result = await urlToBase64(publicUrl);
            if (result) {
              setPhotosBase64Cache(prev => new Map(prev).set(publicUrl, result));
            }
          } else {
            setImages(prev => prev.filter(url => url !== localUrl));
            URL.revokeObjectURL(localUrl);
            toast.error('Erro ao fazer upload da foto');
          }
        } catch (err) {
          console.error('Erro ao processar foto:', err);
          setImages(prev => prev.filter(url => url !== localUrl));
          URL.revokeObjectURL(localUrl);
        }
      }
      setIsUploadingPhotos(false);
      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} foto(s) enviada(s)!`);
      }
    };
    input.click();
  };
  const handleReplacePhoto = (index: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const localUrl = URL.createObjectURL(file);
      const oldUrl = images[index];
      setImages(prevImages => {
        const newImages = [...prevImages];
        newImages[index] = localUrl;
        return newImages;
      });
      toast.info('Processando foto...');
      setTimeout(async () => {
        setIsUploadingPhotos(true);
        try {
          const jpegBlob = await convertImageToJpeg(file);
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
          const tempId = leadId || `temp_${Date.now()}`;
          const filePath = `${tempId}/${fileName}`;
          const {
            error
          } = await supabase.storage.from('lead-photos').upload(filePath, jpegBlob, {
            contentType: 'image/jpeg'
          });
          if (!error) {
            const {
              data: {
                publicUrl
              }
            } = supabase.storage.from('lead-photos').getPublicUrl(filePath);
            setImages(prevImages => {
              const newImages = [...prevImages];
              newImages[index] = publicUrl;
              return newImages;
            });
            URL.revokeObjectURL(localUrl);
            toast.success('Foto substituída!');
          } else {
            setImages(prevImages => {
              const newImages = [...prevImages];
              newImages[index] = oldUrl;
              return newImages;
            });
            URL.revokeObjectURL(localUrl);
            toast.error(`Erro ao enviar foto: ${error.message}`);
          }
        } catch (err) {
          console.error('Erro ao processar imagem:', err);
          setImages(prevImages => {
            const newImages = [...prevImages];
            newImages[index] = oldUrl;
            return newImages;
          });
          URL.revokeObjectURL(localUrl);
          toast.error('Erro ao processar imagem');
        } finally {
          setIsUploadingPhotos(false);
        }
      }, 50);
    };
    input.click();
  };
  const handleRemovePhoto = (index: number) => {
    if (leadId && images.length <= 1) {
      toast.error("Você precisa ter pelo menos uma foto!");
      return;
    }
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages.length > 0 ? newImages : [getLeadPhotoUrl(null)]);
    if (activeImageIndex >= newImages.length) setActiveImageIndex(Math.max(0, newImages.length - 1));
    toast.success("Foto removida!");
  };
  const handleFieldChange = (field: keyof LeadData, value: any) => {
    setLeadData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleAddPhone = () => {
    setAdditionalPhones([...additionalPhones, ""]);
  };
  const handleRemovePhone = (index: number) => {
    setAdditionalPhones(additionalPhones.filter((_, i) => i !== index));
  };
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...additionalPhones];
    newPhones[index] = value;
    setAdditionalPhones(newPhones);
  };
  const handleSave = async () => {
    if (!leadId) {
      toast.error("ID do lead não encontrado");
      return;
    }
    const validPhotos = images.filter(img => img && !img.includes('no-photo-placeholder'));
    if (validPhotos.length === 0) {
      toast.error("Envie pelo menos uma foto em que o rosto do(a) modelo apareça.");
      return;
    }
    if (!leadData.nomeModelo) {
      toast.error("Nome do modelo é obrigatório");
      return;
    }
    if (!leadData.telefone) {
      toast.error("Telefone é obrigatório");
      return;
    }
    try {
      setSaving(true);
      setSaveStatus('Preparando fotos...');
      const fotosBase64 = [];
      for (const imageUrl of images) {
        if (imageUrl && !imageUrl.includes('no-photo-placeholder')) {
          const cached = photosBase64Cache.get(imageUrl);
          if (cached) {
            fotosBase64.push({
              fileData: [cached.filename, cached.base64]
            });
          } else {
            const base64Result = await urlToBase64(imageUrl);
            if (base64Result) {
              fotosBase64.push({
                fileData: [base64Result.filename, base64Result.base64]
              });
            }
          }
        }
      }
      setSaveStatus('Salvando dados...');
      const rawData = {
        [BITRIX_LEAD_FIELD_MAPPING.estadoCivil]: leadData.estadoCivil,
        [BITRIX_LEAD_FIELD_MAPPING.altura]: leadData.altura,
        [BITRIX_LEAD_FIELD_MAPPING.peso]: leadData.peso,
        [BITRIX_LEAD_FIELD_MAPPING.manequim]: leadData.manequim,
        [BITRIX_LEAD_FIELD_MAPPING.tamanhoSapato]: leadData.tamanhoSapato,
        [BITRIX_LEAD_FIELD_MAPPING.corPele]: leadData.corPele,
        [BITRIX_LEAD_FIELD_MAPPING.corCabelo]: leadData.corCabelo,
        [BITRIX_LEAD_FIELD_MAPPING.corOlhos]: leadData.corOlhos,
        [BITRIX_LEAD_FIELD_MAPPING.tipoCabelo]: leadData.tipoCabelo,
        [BITRIX_LEAD_FIELD_MAPPING.tipoModelo]: leadData.tipoModelo,
        [BITRIX_LEAD_FIELD_MAPPING.habilidades]: leadData.habilidades,
        [BITRIX_LEAD_FIELD_MAPPING.cursos]: leadData.cursos,
        [BITRIX_LEAD_FIELD_MAPPING.caracteristicas]: leadData.caracteristicasEspeciais,
        [BITRIX_LEAD_FIELD_MAPPING.fotoUrl]: fotosBase64,
        [BITRIX_LEAD_FIELD_MAPPING.sexo]: leadData.sexo,
        [BITRIX_LEAD_FIELD_MAPPING.instagram]: leadData.instagram,
        [BITRIX_LEAD_FIELD_MAPPING.tiktok]: leadData.tiktok,
        additional_photos: images.slice(1),
        additional_phones: additionalPhones.filter(p => p.trim() !== '')
      };
      const updateData = {
        nome_modelo: leadData.nomeModelo,
        name: leadData.nomeModelo,
        nome_responsavel_legal: leadData.nomeResponsavel,
        celular: leadData.telefone,
        photo_url: images[0] || null,
        additional_photos: images.slice(1),
        updated_at: new Date().toISOString(),
        raw: rawData
      };
      const {
        error: supabaseError
      } = await supabase.from('leads').update(updateData).eq('id', parseInt(leadId));
      if (supabaseError) throw supabaseError;
      setSaveStatus('Sincronizando com Bitrix...');
      try {
        await supabase.functions.invoke('bitrix-entity-update', {
          body: {
            entityType: 'lead',
            entityId: leadId,
            fields: {
              NAME: leadData.nomeModelo,
              [BITRIX_LEAD_FIELD_MAPPING.nomeModelo]: [leadData.nomeModelo],
              PHONE: [{
                VALUE: leadData.telefone,
                VALUE_TYPE: "MOBILE"
              }],
              [BITRIX_LEAD_FIELD_MAPPING.cidade]: leadData.cidade,
              [BITRIX_LEAD_FIELD_MAPPING.estado]: leadData.estado,
              [BITRIX_LEAD_FIELD_MAPPING.dataNascimento]: leadData.dataNascimento,
              ...rawData
            }
          }
        });
        setSaveStatus('Concluído!');
        toast.success("Mini currículo enviado!");
        setTimeout(() => {
          navigate('/precadastro/sucesso', {
            state: {
              nomeModelo: leadData.nomeModelo || leadData.nomeModelo
            }
          });
        }, 300);
        setTimeout(async () => {
          try {
            const {
              data: leadDataBitrix
            } = await supabase.functions.invoke('bitrix-get-lead', {
              body: {
                leadId
              }
            });
            if (leadDataBitrix?.result) {
              const photoObjects = leadDataBitrix.result.UF_CRM_LEAD_1733231445171 || [];
              const photoIds = Array.isArray(photoObjects) ? photoObjects.map((p: any) => p.id).filter(Boolean) : [];
              const currentCount = parseInt(leadDataBitrix.result.UF_CRM_CLIENTEATUALIZAFOTO || '0');
              const fieldsToUpdate: Record<string, string> = {
                [BITRIX_LEAD_FIELD_MAPPING.clienteAtualizaFoto]: String(currentCount + 1)
              };
              if (photoIds.length > 0) {
                fieldsToUpdate[BITRIX_LEAD_FIELD_MAPPING.fotoIds] = photoIds.join(',');
              }
              await supabase.functions.invoke('bitrix-entity-update', {
                body: {
                  entityType: 'lead',
                  entityId: leadId,
                  fields: fieldsToUpdate
                }
              });
            }
          } catch (photoUpdateError) {
            console.error('❌ Erro ao atualizar IDs das fotos em background:', photoUpdateError);
          }
        }, 100);
      } catch (bitrixError) {
        console.error('Erro Bitrix:', bitrixError);
        throw bitrixError;
      }
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };
  if (pageLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>;
  }
  const isModelDataComplete = !!(leadData.nomeModelo && leadData.dataNascimento && leadData.sexo);
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">Max Fama</h1>
          <p className="text-muted-foreground">Pré-análise de perfil</p>
          
          <div className="mt-4 max-w-xl mx-auto">
            <h2 className="text-lg font-semibold">
              Para melhorar a análise preencha o perfil {leadData.nomeModelo ? `de ${leadData.nomeModelo}` : "do modelo"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1"> Aqui você pode atualizar fotos e informações para que o produtor faça a análise do perfil.</p>
            <p className="text-xs text-muted-foreground mt-2">
              ⏱ Leva menos de 2 minutos.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <span className="font-medium text-primary">1. Fotos</span>
            <span>•</span>
            <span>2. Dados do modelo</span>
            <span>•</span>
            <span>3. Talentos & redes</span>
            <span>•</span>
            <span>4. Responsável & envio</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-elegant">
                    <img src={images[activeImageIndex]} alt="Foto" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button size="sm" variant="ghost" className="bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white" onClick={() => handleReplacePhoto(activeImageIndex)}>
                      <Camera className="h-4 w-4 mr-2" />Trocar
                    </Button>
                    <Button size="sm" variant="ghost" className="bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white" onClick={() => handleRemovePhoto(activeImageIndex)}>
                      <Trash2 className="h-4 w-4 mr-2" />Remover
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {images.map((image, index) => <button key={index} onClick={() => setActiveImageIndex(index)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImageIndex === index ? "border-primary shadow-glow" : "border-transparent hover:border-border"}`}>
                      <img src={image} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    </button>)}
                  {images.length < 10 && <button onClick={handleAddPhoto} className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex items-center justify-center group">
                      <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                    </button>}
                </div>
                
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  📷 Envie de 2 a 5 fotos do(a) modelo, em boa iluminação, sem filtros.<br />
                  Dê preferência a: rosto, meio corpo e corpo inteiro.
                </p>

                {(isUploadingPhotos || isSyncingPhotos) && <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>{isUploadingPhotos ? "Enviando fotos..." : "Sincronizando fotos..."}</span>
                  </div>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold">{leadData.nomeModelo || "Sem nome"}</h2>
                <p className="text-muted-foreground">
                  {leadData.cidade && leadData.estado ? `${leadData.cidade}, ${leadData.estado}` : "Localização não informada"}
                </p>
              </CardContent>
            </Card>

            <FormSection title="Dados do Modelo" icon={<User />} collapsible={true} defaultOpen={!isModelDataComplete} isComplete={isModelDataComplete}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField id="nomeModelo" label="Nome Completo do Modelo" value={leadData.nomeModelo} onChange={v => handleFieldChange("nomeModelo", v)} required />
                <DateSelectField id="dataNascimento" label="Data de Nascimento" value={leadData.dataNascimento} onChange={v => handleFieldChange("dataNascimento", v)} required />
                <FormField id="sexo" label="Sexo" type="select" value={leadData.sexo} onChange={v => handleFieldChange("sexo", v)} options={SEXO_OPTIONS} required />
                <FormField id="altura" label="Altura (cm)" type="number" value={leadData.altura} onChange={v => handleFieldChange("altura", v)} />
                <FormField id="peso" label="Peso (kg)" type="number" value={leadData.peso} onChange={v => handleFieldChange("peso", v)} />
                <FormField id="manequim" label="Manequim" type="select" value={leadData.manequim} onChange={v => handleFieldChange("manequim", v)} options={MANEQUIM_OPTIONS} />
                <FormField id="corPele" label="Cor da Pele" type="select" value={leadData.corPele} onChange={v => handleFieldChange("corPele", v)} options={COR_PELE_OPTIONS} />
                <FormField id="corCabelo" label="Cor do Cabelo" type="select" value={leadData.corCabelo} onChange={v => handleFieldChange("corCabelo", v)} options={COR_CABELO_OPTIONS} />
                <FormField id="corOlhos" label="Cor dos Olhos" type="select" value={leadData.corOlhos} onChange={v => handleFieldChange("corOlhos", v)} options={COR_OLHOS_OPTIONS} />
                <FormField id="tipoCabelo" label="Tipo de Cabelo" type="select" value={leadData.tipoCabelo} onChange={v => handleFieldChange("tipoCabelo", v)} options={TIPO_CABELO_OPTIONS} />
                <FormField id="tamanhoSapato" label="Tamanho de Sapato" type="select" value={leadData.tamanhoSapato} onChange={v => handleFieldChange("tamanhoSapato", v)} options={tamanhoSapato} />
                <FormField id="estadoCivil" label="Estado Civil" type="select" value={leadData.estadoCivil} onChange={v => handleFieldChange("estadoCivil", v)} options={ESTADO_CIVIL_OPTIONS} />
                <FormField id="cidade" label="Cidade" value={leadData.cidade} onChange={v => handleFieldChange("cidade", v)} />
                <FormField id="estado" label="Estado" type="select" value={leadData.estado} onChange={v => handleFieldChange("estado", v)} options={estadosBrasileiros} />
                <FormField id="tipoModelo" label="Tipo de Modelo" type="select" value={leadData.tipoModelo} onChange={v => handleFieldChange("tipoModelo", v)} options={TIPO_MODELO_OPTIONS} />
              </div>
            </FormSection>

            <FormSection title="Talentos & Experiência" icon={<Sparkles />} collapsible={true} defaultOpen={false}>
              <p className="text-xs text-muted-foreground mb-4">
                Preencha apenas se o(a) modelo já tem experiência ou habilidades.<br />
                Isso não é obrigatório, mas ajuda a mostrar o diferencial.
              </p>
              
              <div className="space-y-4">
                <MultiSelect id="habilidades" label="Habilidades" value={leadData.habilidades} onChange={v => handleFieldChange("habilidades", v)} options={HABILIDADES_OPTIONS} />
                <MultiSelect id="cursos" label="Cursos" value={leadData.cursos} onChange={v => handleFieldChange("cursos", v)} options={CURSOS_OPTIONS} />
                <MultiSelect id="caracteristicasEspeciais" label="Características Especiais" value={leadData.caracteristicasEspeciais} onChange={v => handleFieldChange("caracteristicasEspeciais", v)} options={CARACTERISTICAS_OPTIONS} />
              </div>
            </FormSection>

            <FormSection title="Redes Sociais" icon={<InstagramIcon />} collapsible={true} defaultOpen={false}>
              <p className="text-xs text-muted-foreground mb-4">
                Se o modelo tem rede social de trabalho, você pode informar aqui (opcional).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField id="instagram" label="Instagram" value={leadData.instagram} onChange={v => handleFieldChange("instagram", v)} placeholder="@usuario" />
                <FormField id="tiktok" label="TikTok" value={leadData.tiktok} onChange={v => handleFieldChange("tiktok", v)} placeholder="@usuario" />
              </div>
            </FormSection>

            <FormSection title="Dados do Responsável" icon={<User />} collapsible={true} defaultOpen={false}>
              <p className="text-xs text-muted-foreground mb-4">
                Esses são seus dados de contato.<br />
                Atualize se algo estiver errado para receber corretamente as informações de agenda.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField id="nomeResponsavel" label="Nome do Responsável Legal" value={leadData.nomeResponsavel} onChange={v => handleFieldChange("nomeResponsavel", v)} required />
                <div className="flex gap-2 items-end">
                  <FormField id="telefone" label="Telefone Principal" type="tel" value={leadData.telefone} onChange={v => handleFieldChange("telefone", v)} required disabled={!!leadId && !phoneEditable} />
                  {leadId && !phoneEditable && <Button type="button" variant="outline" size="sm" onClick={() => setPhoneEditable(true)} className="mb-1">
                      Alterar
                    </Button>}
                </div>
                <FormField id="cidade" label="Cidade" value={leadData.cidade} onChange={v => handleFieldChange("cidade", v)} required />
                <FormField id="estado" label="Estado" value={leadData.estado} onChange={v => handleFieldChange("estado", v)} required />
              </div>
            </FormSection>

            <Button onClick={handleSave} size="lg" disabled={saving} className="w-full md:w-auto bg-pink-500 hover:bg-pink-400">
              {saving ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />{saveStatus || 'Enviando...'}</> : <><Send className="h-5 w-5 mr-2" />Enviar mini currículo para análise</>}
            </Button>
          </div>
        </div>
      </div>
      
      <PreCadastroFooter />
    </div>;
};
export default PreCadastro;