import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Camera, User, Ruler, Instagram as InstagramIcon, Sparkles, Save, MapPin, Loader2, Phone } from "lucide-react";
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
  fotoUrl: 'UF_CRM_LEAD_1733231445171',        // Campo de upload (array de arquivos)
  fotoIds: 'UF_CRM_1764358561',                 // IDs públicos das fotos (múltiplo, separado por vírgula)
  clienteAtualizaFoto: 'UF_CRM_CLIENTEATUALIZAFOTO', // Contador de atualizações de foto
  sexo: 'sexo_local',
  instagram: 'instagram_local',
  instagramSeguidores: 'instagram_seg_local',
  facebook: 'facebook_local',
  facebookSeguidores: 'facebook_seg_local',
  youtube: 'youtube_local',
  youtubeSeguidores: 'youtube_seg_local',
  tiktok: 'tiktok_local',
  tiktokSeguidores: 'tiktok_seg_local',
} as const;

// ========================================================================
// OPÇÕES COM IDs DO BITRIX
// ========================================================================
const ESTADO_CIVIL_OPTIONS = [
  { value: '9418', label: 'Casado(a)' },
  { value: '9420', label: 'Divorciado(a)' },
  { value: '9422', label: 'Solteiro(a)' },
  { value: '9424', label: 'Viúvo(a)' }
];

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' }
];

const COR_PELE_OPTIONS = [
  { value: '9446', label: 'Branca' },
  { value: '9448', label: 'Negra' },
  { value: '9450', label: 'Oriental' },
  { value: '9452', label: 'Parda' }
];

const COR_CABELO_OPTIONS = [
  { value: '9440', label: 'Loiro' },
  { value: '10298', label: 'Castanho Claro' },
  { value: '10300', label: 'Castanho Médio' },
  { value: '10302', label: 'Castanho Escuro' },
  { value: '9442', label: 'Preto' },
  { value: '10304', label: 'Ruivo' }
];

const COR_OLHOS_OPTIONS = [
  { value: '434', label: 'Azul' },
  { value: '438', label: 'Castanho' },
  { value: '440', label: 'Cinza' },
  { value: '442', label: 'Preto' },
  { value: '436', label: 'Verde' }
];

const TIPO_CABELO_OPTIONS = [
  { value: '444', label: 'Liso' },
  { value: '446', label: 'Ondulado' },
  { value: '448', label: 'Cacheado' },
  { value: '450', label: 'Crespo' },
  { value: '2258', label: 'Natural' },
  { value: '2260', label: 'Outros' }
];

const MANEQUIM_OPTIONS = [
  { value: '9374', label: '6' },
  { value: '9376', label: '8' },
  { value: '9378', label: '10' },
  { value: '9380', label: '12' },
  { value: '9382', label: '14' },
  { value: '9384', label: '16' },
  { value: '9386', label: '18' },
  { value: '9388', label: '20' },
  { value: '9390', label: '22' },
  { value: '9392', label: '24' },
  { value: '9394', label: '26' },
  { value: '9396', label: '28' },
  { value: '9398', label: '30' },
  { value: '9400', label: '32' },
  { value: '9402', label: '34' },
  { value: '9404', label: '36' },
  { value: '452', label: '38' },
  { value: '454', label: '40' },
  { value: '3946', label: '42' },
  { value: '9406', label: '44' },
  { value: '9408', label: '46' },
  { value: '9410', label: '48' },
  { value: '9412', label: '50' },
  { value: '9414', label: '52' },
  { value: '9416', label: '54' }
];

const TIPO_MODELO_OPTIONS = [
  { value: '9300', label: 'Gêmeos' },
  { value: '9302', label: 'Fashion' },
  { value: '9304', label: 'Publicidade' },
  { value: '9306', label: 'Elenco' },
  { value: '9308', label: 'Figuração' },
  { value: '9310', label: 'Feira & Eventos' },
  { value: '9312', label: 'Promo Girl' },
  { value: '9314', label: 'Hostess' },
  { value: '9316', label: 'Baby' }
];

const CURSOS_OPTIONS = [
  { value: '9262', label: 'Canto' },
  { value: '9264', label: 'Dança' },
  { value: '9266', label: 'Espanhol' },
  { value: '9268', label: 'Inglês' },
  { value: '9270', label: 'Interpretação' },
  { value: '9272', label: 'Locução' },
  { value: '9274', label: 'Passarela' },
  { value: '9276', label: 'Fotografia' },
  { value: '9278', label: 'Teatro Musical' },
  { value: '9280', label: 'Libras' },
  { value: '9282', label: 'Música' },
  { value: '9284', label: 'Artes Marciais' }
];

const HABILIDADES_OPTIONS = [
  { value: '9228', label: 'Atua' },
  { value: '9230', label: 'Bilíngue' },
  { value: '9232', label: 'Canta' },
  { value: '9234', label: 'Dança' },
  { value: '9236', label: 'Esportes' },
  { value: '9238', label: 'Instrumentos' },
  { value: '9240', label: 'Malabarismo' },
  { value: '9242', label: 'Trilíngue' },
  { value: '9244', label: 'Violão' },
  { value: '9246', label: 'CNH A' },
  { value: '9248', label: 'CNH B' },
  { value: '9250', label: 'CNH AB' },
  { value: '9252', label: 'Moto' },
  { value: '9254', label: 'Libras' },
  { value: '9256', label: 'Piano' },
  { value: '9258', label: 'Violino' },
  { value: '9260', label: 'Artes Marciais' }
];

const CARACTERISTICAS_OPTIONS = [
  { value: '9286', label: 'Comunicativo' },
  { value: '9288', label: 'Desinibida' },
  { value: '9290', label: 'Gestante' },
  { value: '9292', label: 'Melhor Idade' },
  { value: '9294', label: 'Plus Size' },
  { value: '9296', label: 'Tatuado(a)' },
  { value: '9298', label: 'Cabelo Colorido' }
];

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
  instagram: string;
  instagramSeguidores: string;
  facebook: string;
  facebookSeguidores: string;
  youtube: string;
  youtubeSeguidores: string;
  tiktok: string;
  tiktokSeguidores: string;
  tiposModelo: string[];
  cursos: string[];
  habilidades: string[];
  caracteristicas: string[];
}
// ========================================================================
// HELPER FUNCTIONS
// ========================================================================
const normalizeEnumerationValue = (value: unknown): string | string[] => {
  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }
  return String(value || '');
};

// Converte qualquer imagem para JPEG antes do upload
const convertImageToJpeg = async (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto do canvas'));
        return;
      }
      
      // Desenhar imagem no canvas (converte qualquer formato)
      ctx.drawImage(img, 0, 0);
      
      // Converter para JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao converter imagem'));
        },
        'image/jpeg',
        0.85 // Qualidade 85%
      );
    };
    
    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};

const urlToBase64 = async (url: string): Promise<{ filename: string; base64: string } | null> => {
  try {
    if (!url || url.includes('no-photo-placeholder')) {
      return null;
    }
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    const filename = `foto_${Date.now()}.jpg`;
    
    // Converter blob para base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));
    
    return { filename, base64 };
  } catch (error) {
    console.error('Erro ao converter URL para base64:', error);
    return null;
  }
};

const PreCadastro = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('lead');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
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
    instagram: "",
    instagramSeguidores: "",
    facebook: "",
    facebookSeguidores: "",
    youtube: "",
    youtubeSeguidores: "",
    tiktok: "",
    tiktokSeguidores: "",
    tiposModelo: [],
    cursos: [],
    habilidades: [],
    caracteristicas: []
  });
  useEffect(() => {
    const loadLeadData = async () => {
      // Se não tem leadId, iniciar novo cadastro vazio
      if (!leadId) {
        setImages([getLeadPhotoUrl(null)]);
        setLoading(false);
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
            dataNascimento: rawData[BITRIX_LEAD_FIELD_MAPPING.dataNascimento] || "",
            sexo: rawData[BITRIX_LEAD_FIELD_MAPPING.sexo] || "",
            altura: rawData[BITRIX_LEAD_FIELD_MAPPING.altura] || "",
            peso: rawData[BITRIX_LEAD_FIELD_MAPPING.peso] || "",
            manequim: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.manequim]) as string,
            corPele: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.corPele]) as string,
            corCabelo: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.corCabelo]) as string,
            corOlhos: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.corOlhos]) as string,
            tipoCabelo: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.tipoCabelo]) as string,
            tamanhoSapato: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.tamanhoSapato]) as string,
            instagram: rawData[BITRIX_LEAD_FIELD_MAPPING.instagram] || "",
            instagramSeguidores: rawData[BITRIX_LEAD_FIELD_MAPPING.instagramSeguidores] || "",
            facebook: rawData[BITRIX_LEAD_FIELD_MAPPING.facebook] || "",
            facebookSeguidores: rawData[BITRIX_LEAD_FIELD_MAPPING.facebookSeguidores] || "",
            youtube: rawData[BITRIX_LEAD_FIELD_MAPPING.youtube] || "",
            youtubeSeguidores: rawData[BITRIX_LEAD_FIELD_MAPPING.youtubeSeguidores] || "",
            tiktok: rawData[BITRIX_LEAD_FIELD_MAPPING.tiktok] || "",
            tiktokSeguidores: rawData[BITRIX_LEAD_FIELD_MAPPING.tiktokSeguidores] || "",
            tiposModelo: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.tipoModelo]) as string[],
            cursos: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.cursos]) as string[],
            habilidades: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.habilidades]) as string[],
            caracteristicas: normalizeEnumerationValue(rawData[BITRIX_LEAD_FIELD_MAPPING.caracteristicas]) as string[]
          });
          // Carregar fotos - suporta múltiplos formatos
          const photoUrls: string[] = [];
          
          if (lead.photo_url) {
            try {
              const parsed = JSON.parse(lead.photo_url);
              
              if (Array.isArray(parsed)) {
                // Verificar se é array de URLs do Storage ou objetos do Bitrix
                if (parsed.length > 0 && typeof parsed[0] === 'string') {
                  // Já são URLs públicas do Storage
                  photoUrls.push(...parsed);
                  console.log(`✅ Carregadas ${parsed.length} fotos do Storage`);
                } else if (parsed.length > 0 && parsed[0].id) {
                  // São objetos do Bitrix - precisa sincronizar
                  console.log(`📸 Detectadas ${parsed.length} fotos do Bitrix, sincronizando...`);
                  const fileIds = parsed.map((p: any) => p.id).filter(Boolean);
                  
                  toast.loading(`Sincronizando ${fileIds.length} fotos do Bitrix...`);
                  
                  const { data, error } = await supabase.functions.invoke('bitrix-photo-sync', {
                    body: { leadId: parseInt(leadId), fileIds }
                  });
                  
                  toast.dismiss();
                  
                  if (error) {
                    console.error('Erro ao sincronizar fotos:', error);
                    toast.error('Erro ao sincronizar fotos do Bitrix');
                  } else if (data?.publicUrls && data.publicUrls.length > 0) {
                    photoUrls.push(...data.publicUrls);
                    toast.success(`${data.publicUrls.length} fotos sincronizadas!`);
                    console.log(`✅ ${data.publicUrls.length} fotos sincronizadas do Bitrix`);
                  }
                }
              }
            } catch {
              // Não é JSON - é URL simples do Storage
              if (lead.photo_url.includes('supabase.co') || lead.photo_url.includes('storage')) {
                photoUrls.push(lead.photo_url);
              } else {
                // URL legada - usar helper
                photoUrls.push(getLeadPhotoUrl(lead.photo_url));
              }
            }
          }
          
          // Fotos adicionais do rawData (legado)
          if (rawData.additional_photos && Array.isArray(rawData.additional_photos)) {
            photoUrls.push(...rawData.additional_photos);
          }
          
          // Garantir pelo menos uma imagem (placeholder)
          if (photoUrls.length === 0) {
            photoUrls.push(getLeadPhotoUrl(null));
          }
          
          setImages(photoUrls);
          
          // Carregar telefones adicionais
          if (rawData.additional_phones && Array.isArray(rawData.additional_phones)) {
            setAdditionalPhones(rawData.additional_phones);
          }
        }
      } catch (error: any) {
        console.error('Erro:', error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    loadLeadData();
  }, [leadId]);

  // Auto-detect location if empty
  useEffect(() => {
    const detectLocation = async () => {
      if (!leadData.cidade && !leadData.estado) {
        try {
          const {
            data,
            error
          } = await supabase.functions.invoke('get-location');
          if (error) throw error;
          if (data?.success && data.cidade && data.estado) {
            console.log('Location detected:', data);
            setLeadData(prev => ({
              ...prev,
              cidade: data.cidade,
              estado: data.estado
            }));
            toast.success(`Localização detectada: ${data.cidade}, ${data.estado}`);
          }
        } catch (error) {
          console.error('Failed to detect location:', error);
          // Silently fail - location detection is optional
        }
      }
    };
    // Detectar localização após carregar (ou para novo cadastro)
    if (!loading) {
      detectLocation();
    }
  }, [loading, leadData.nomeModelo]);
  const handleAddPhoto = () => {
    // Verificar quantas fotos ainda podem ser adicionadas
    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      toast.error("Máximo de 10 fotos");
      return;
    }
    
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true; // Permitir múltiplas seleções
    
    input.onchange = async e => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      // Limitar ao número de slots disponíveis
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      if (files.length > remainingSlots) {
        toast.warning(`Apenas ${remainingSlots} fotos foram adicionadas (limite de 10)`);
      }
      
      try {
        setLoading(true);
        const newImageUrls: string[] = [];
        
        // Processar todas as imagens selecionadas
        for (const file of filesToProcess) {
          // Converter para JPEG antes de fazer upload
          const jpegBlob = await convertImageToJpeg(file);
          
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
          const tempId = leadId || `temp_${Date.now()}`;
          const filePath = `${tempId}/${fileName}`;
          
          const {
            error
          } = await supabase.storage.from('lead-photos').upload(filePath, jpegBlob, {
            contentType: 'image/jpeg'
          });
          
          if (error) {
            console.error('Erro no upload:', error);
            continue; // Continuar com as próximas imagens
          }
          
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('lead-photos').getPublicUrl(filePath);
          
          newImageUrls.push(publicUrl);
        }
        
        if (newImageUrls.length > 0) {
          // Adicionar todas as novas URLs ao array de imagens
          setImages(prevImages => {
            // Remover placeholder se existir
            const filteredImages = prevImages.filter(img => !img.includes('no-photo-placeholder'));
            return [...filteredImages, ...newImageUrls];
          });
          
          toast.success(`${newImageUrls.length} foto(s) adicionada(s)!`);
        }
      } catch (error: any) {
        console.error('Error uploading photos:', error);
        toast.error("Erro ao fazer upload das fotos");
      } finally {
        setLoading(false);
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
      if (file) {
        try {
          setLoading(true);
          
          // Delete old photo if it exists
          const oldUrl = images[index];
          if (oldUrl && !oldUrl.includes('no-photo-placeholder')) {
            const pathMatch = oldUrl.match(/lead-photos\/(.+)$/);
            if (pathMatch) {
              await supabase.storage.from('lead-photos').remove([pathMatch[1]]);
            }
          }
          
          // Converter para JPEG antes de fazer upload
          const jpegBlob = await convertImageToJpeg(file);
          
          const fileName = `${Date.now()}.jpg`;
          const tempId = leadId || `temp_${Date.now()}`;
          const filePath = `${tempId}/${fileName}`;
          
          const {
            error
          } = await supabase.storage.from('lead-photos').upload(filePath, jpegBlob, {
            contentType: 'image/jpeg'
          });
          
          if (error) throw error;
          
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('lead-photos').getPublicUrl(filePath);
          
          const newImages = [...images];
          newImages[index] = publicUrl;
          setImages(newImages);
          toast.success("Foto substituída!");
        } catch (error) {
          console.error('Error replacing photo:', error);
          toast.error("Erro ao substituir foto");
        } finally {
          setLoading(false);
        }
      }
    };
    input.click();
  };
  const handleRemovePhoto = (index: number) => {
    // Para leads existentes, exigir pelo menos 1 foto
    // Para novos cadastros, permitir remover todas
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
      
      // Converter TODAS as fotos para base64
      const fotosBase64 = [];
      for (const imageUrl of images) {
        if (imageUrl && !imageUrl.includes('no-photo-placeholder')) {
          const base64Result = await urlToBase64(imageUrl);
          if (base64Result) {
            fotosBase64.push({ fileData: [base64Result.filename, base64Result.base64] });
          }
        }
      }
      
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
        [BITRIX_LEAD_FIELD_MAPPING.habilidades]: leadData.habilidades,
        [BITRIX_LEAD_FIELD_MAPPING.cursos]: leadData.cursos,
        [BITRIX_LEAD_FIELD_MAPPING.caracteristicas]: leadData.caracteristicas,
        [BITRIX_LEAD_FIELD_MAPPING.tipoModelo]: leadData.tiposModelo,
        [BITRIX_LEAD_FIELD_MAPPING.fotoUrl]: fotosBase64,
        [BITRIX_LEAD_FIELD_MAPPING.sexo]: leadData.sexo,
        [BITRIX_LEAD_FIELD_MAPPING.instagram]: leadData.instagram,
        [BITRIX_LEAD_FIELD_MAPPING.instagramSeguidores]: leadData.instagramSeguidores,
        [BITRIX_LEAD_FIELD_MAPPING.facebook]: leadData.facebook,
        [BITRIX_LEAD_FIELD_MAPPING.facebookSeguidores]: leadData.facebookSeguidores,
        [BITRIX_LEAD_FIELD_MAPPING.youtube]: leadData.youtube,
        [BITRIX_LEAD_FIELD_MAPPING.youtubeSeguidores]: leadData.youtubeSeguidores,
        [BITRIX_LEAD_FIELD_MAPPING.tiktok]: leadData.tiktok,
        [BITRIX_LEAD_FIELD_MAPPING.tiktokSeguidores]: leadData.tiktokSeguidores,
        additional_photos: images.slice(1),
        additional_phones: additionalPhones.filter(p => p.trim() !== '')
      };

      if (leadId) {
        // UPDATE: Lead existente
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
        
        const { error: supabaseError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', parseInt(leadId));
        
        if (supabaseError) throw supabaseError;
        
        try {
          // Primeiro update: Enviar fotos para o Bitrix
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
          
          // Segundo update: Buscar IDs das fotos e atualizar campos específicos
          try {
            const { data: leadDataBitrix } = await supabase.functions.invoke('bitrix-get-lead', {
              body: { leadId }
            });

            if (leadDataBitrix?.result) {
              // Extrair IDs das fotos do campo de upload
              const photoObjects = leadDataBitrix.result.UF_CRM_LEAD_1733231445171 || [];
              const photoIds = Array.isArray(photoObjects) 
                ? photoObjects.map((p: any) => p.id).filter(Boolean)
                : [];

              // Buscar contador atual
              const currentCount = parseInt(leadDataBitrix.result.UF_CRM_CLIENTEATUALIZAFOTO || '0');

              if (photoIds.length > 0) {
                console.log(`Atualizando campo de IDs com ${photoIds.length} fotos`);
                
                // Atualizar campos específicos: IDs das fotos e contador
                await supabase.functions.invoke('bitrix-entity-update', {
                  body: {
                    entityType: 'lead',
                    entityId: leadId,
                    fields: {
                      [BITRIX_LEAD_FIELD_MAPPING.fotoIds]: photoIds.join(','),
                      [BITRIX_LEAD_FIELD_MAPPING.clienteAtualizaFoto]: currentCount + 1
                    }
                  }
                });
                
                console.log(`IDs das fotos salvos: ${photoIds.join(',')}. Contador: ${currentCount + 1}`);
              }
            }
          } catch (photoUpdateError) {
            console.error('Erro ao atualizar IDs das fotos:', photoUpdateError);
            // Não bloqueia o fluxo principal
          }
        } catch (bitrixError) {
          console.error('Erro Bitrix:', bitrixError);
        }
        
        toast.success("Cadastro atualizado com sucesso!");
      } else {
        // INSERT: Novo lead
        // Gerar novo ID
        const { data: maxIdResult } = await supabase
          .from('leads')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        const newId = (maxIdResult?.id || 0) + 1;
        
        const insertData = {
          id: newId,
          nome_modelo: leadData.nomeModelo,
          name: leadData.nomeModelo,
          nome_responsavel_legal: leadData.nomeResponsavel,
          celular: leadData.telefone,
          photo_url: images[0] || null,
          additional_photos: images.slice(1),
          criado: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_source: 'manual',
          raw: rawData
        };
        
        const { error: insertError } = await supabase
          .from('leads')
          .insert(insertData);
        
        if (insertError) throw insertError;
        
        toast.success("Novo cadastro criado com sucesso!");
      }
      
      navigate('/precadastro/sucesso');
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Max Fama</h1>
          <p className="text-muted-foreground">Pré analise de pefil</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
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
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold">{leadData.nomeModelo || "Sem nome"}</h2>
                <p className="text-muted-foreground">{leadData.cidade && leadData.estado ? `${leadData.cidade}, ${leadData.estado}` : "Localização não informada"}</p>
              </CardContent>
            </Card>

            <FormSection title="Dados Cadastrais" icon={<User className="h-5 w-5" />} defaultOpen={true}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="nomeResponsavel" label="Nome do Responsável" value={leadData.nomeResponsavel} onChange={v => handleFieldChange("nomeResponsavel", v)} required />
                  <FormField id="estadoCivil" label="Estado Civil" type="select" value={leadData.estadoCivil} onChange={v => handleFieldChange("estadoCivil", v)} options={ESTADO_CIVIL_OPTIONS} />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Telefones</span>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddPhone}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Telefone
                    </Button>
                  </div>
                  
                  <FormField 
                    id="telefone" 
                    label="Telefone Principal" 
                    type="tel" 
                    value={leadData.telefone} 
                    onChange={v => handleFieldChange("telefone", v)} 
                    required 
                    disabled={!!leadId}
                    placeholder={leadId ? "Não pode ser alterado" : "Digite o telefone"}
                  />
                  
                  {additionalPhones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <FormField 
                        id={`phone-${index}`} 
                        label={`Telefone ${index + 2}`} 
                        type="tel" 
                        value={phone} 
                        onChange={v => handlePhoneChange(index, v)} 
                        placeholder="Digite o telefone adicional"
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleRemovePhone(index)}
                        className="mt-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Localização</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField id="cidade" label="Cidade" value={leadData.cidade} onChange={v => handleFieldChange("cidade", v)} />
                    <FormField id="estado" label="Estado" type="select" value={leadData.estado} onChange={v => handleFieldChange("estado", v)} options={estadosBrasileiros} />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Dados do Modelo" icon={<Ruler className="h-5 w-5" />} defaultOpen={false}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="nomeModelo" label="Nome Completo" value={leadData.nomeModelo} onChange={v => handleFieldChange("nomeModelo", v)} required />
                  <DateSelectField id="dataNascimento" label="Data de Nascimento" value={leadData.dataNascimento} onChange={v => handleFieldChange("dataNascimento", v)} />
                </div>
                <FormField id="sexo" label="Sexo" type="select" value={leadData.sexo} onChange={v => handleFieldChange("sexo", v)} options={SEXO_OPTIONS} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField id="altura" label="Altura (cm)" type="number" value={leadData.altura} onChange={v => handleFieldChange("altura", v)} />
                  <FormField id="peso" label="Peso (kg)" type="number" value={leadData.peso} onChange={v => handleFieldChange("peso", v)} />
                  <FormField id="manequim" label="Manequim" type="select" value={leadData.manequim} onChange={v => handleFieldChange("manequim", v)} options={MANEQUIM_OPTIONS} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="corPele" label="Cor da Pele" type="select" value={leadData.corPele} onChange={v => handleFieldChange("corPele", v)} options={COR_PELE_OPTIONS} />
                  <FormField id="corCabelo" label="Cor do Cabelo" type="select" value={leadData.corCabelo} onChange={v => handleFieldChange("corCabelo", v)} options={COR_CABELO_OPTIONS} />
                  <FormField id="corOlhos" label="Cor dos Olhos" type="select" value={leadData.corOlhos} onChange={v => handleFieldChange("corOlhos", v)} options={COR_OLHOS_OPTIONS} />
                  <FormField id="tipoCabelo" label="Tipo de Cabelo" type="select" value={leadData.tipoCabelo} onChange={v => handleFieldChange("tipoCabelo", v)} options={TIPO_CABELO_OPTIONS} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="tamanhoSapato" label="Tamanho Sapato" type="select" value={leadData.tamanhoSapato} onChange={v => handleFieldChange("tamanhoSapato", v)} options={tamanhoSapato} />
                </div>
              </div>
            </FormSection>

            <FormSection title="Redes Sociais" icon={<InstagramIcon className="h-5 w-5" />} defaultOpen={false}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="instagram" label="Instagram" value={leadData.instagram} onChange={v => handleFieldChange("instagram", v)} placeholder="@usuario" />
                  <FormField id="instagramSeguidores" label="Seguidores" type="number" value={leadData.instagramSeguidores} onChange={v => handleFieldChange("instagramSeguidores", v)} />
                  <FormField id="facebook" label="Facebook" value={leadData.facebook} onChange={v => handleFieldChange("facebook", v)} />
                  <FormField id="facebookSeguidores" label="Seguidores" type="number" value={leadData.facebookSeguidores} onChange={v => handleFieldChange("facebookSeguidores", v)} />
                  <FormField id="youtube" label="YouTube" value={leadData.youtube} onChange={v => handleFieldChange("youtube", v)} placeholder="@canal" />
                  <FormField id="youtubeSeguidores" label="Inscritos" type="number" value={leadData.youtubeSeguidores} onChange={v => handleFieldChange("youtubeSeguidores", v)} />
                  <FormField id="tiktok" label="TikTok" value={leadData.tiktok} onChange={v => handleFieldChange("tiktok", v)} placeholder="@usuario" />
                  <FormField id="tiktokSeguidores" label="Seguidores" type="number" value={leadData.tiktokSeguidores} onChange={v => handleFieldChange("tiktokSeguidores", v)} />
                </div>
              </div>
            </FormSection>

            <FormSection title="Habilidades e Experiência" icon={<Sparkles className="h-5 w-5" />} defaultOpen={false}>
              <div className="space-y-4">
                <MultiSelect id="tiposModelo" label="Tipos de Modelo" value={leadData.tiposModelo} onChange={v => handleFieldChange("tiposModelo", v)} options={TIPO_MODELO_OPTIONS} />
                <MultiSelect id="cursos" label="Cursos Realizados" value={leadData.cursos} onChange={v => handleFieldChange("cursos", v)} options={CURSOS_OPTIONS} />
                <MultiSelect id="habilidades" label="Habilidades" value={leadData.habilidades} onChange={v => handleFieldChange("habilidades", v)} options={HABILIDADES_OPTIONS} />
                <MultiSelect id="caracteristicas" label="Características Especiais" value={leadData.caracteristicas} onChange={v => handleFieldChange("caracteristicas", v)} options={CARACTERISTICAS_OPTIONS} />
              </div>
            </FormSection>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} size="lg" disabled={saving} className="bg-pink-500 hover:bg-pink-400">
                {saving ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Salvando...</> : <><Save className="h-5 w-5 mr-2" />Salvar Alterações</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <PreCadastroFooter />
    </div>;
};
export default PreCadastro;