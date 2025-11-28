import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Camera, User, Ruler, Instagram as InstagramIcon, Sparkles, Save, MapPin, Loader2 } from "lucide-react";
import { FormSection } from "@/components/cadastro/FormSection";
import { FormField } from "@/components/cadastro/FormField";
import { MultiSelect } from "@/components/cadastro/MultiSelect";
import { DateSelectField } from "@/components/cadastro/DateSelectField";
import { estadosBrasileiros, estadoCivil, sexoOptions, corPele, corCabelo, corOlhos, tipoCabelo, tamanhoCamisa, tamanhoCalca, tamanhoSapato, tipoModelo, cursosOptions, habilidadesOptions, caracteristicasEspeciais } from "@/data/preCadastroOptions";
import { supabase } from "@/integrations/supabase/client";
import { getLeadPhotoUrl } from "@/lib/leadPhotoUtils";
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
  busto: string;
  cintura: string;
  quadril: string;
  corPele: string;
  corCabelo: string;
  corOlhos: string;
  tipoCabelo: string;
  tamanhoCamisa: string;
  tamanhoCalca: string;
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
const PreCadastro = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('lead');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
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
    busto: "",
    cintura: "",
    quadril: "",
    corPele: "",
    corCabelo: "",
    corOlhos: "",
    tipoCabelo: "",
    tamanhoCamisa: "",
    tamanhoCalca: "",
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
      if (!leadId) {
        toast.error("ID do lead não fornecido");
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
            estadoCivil: rawData.UF_CRM_ESTADO_CIVIL || "",
            telefone: lead.celular || lead.telefone_casa || "",
            cidade: rawData.UF_CRM_CIDADE || "",
            estado: rawData.UF_CRM_ESTADO || "",
            nomeModelo: lead.nome_modelo || lead.name || "",
            dataNascimento: rawData.UF_CRM_DATA_NASCIMENTO || "",
            sexo: rawData.UF_CRM_SEXO || "",
            altura: rawData.UF_CRM_ALTURA || "",
            peso: rawData.UF_CRM_PESO || "",
            busto: rawData.UF_CRM_BUSTO || "",
            cintura: rawData.UF_CRM_CINTURA || "",
            quadril: rawData.UF_CRM_QUADRIL || "",
            corPele: rawData.UF_CRM_COR_PELE || "",
            corCabelo: rawData.UF_CRM_COR_CABELO || "",
            corOlhos: rawData.UF_CRM_COR_OLHOS || "",
            tipoCabelo: rawData.UF_CRM_TIPO_CABELO || "",
            tamanhoCamisa: rawData.UF_CRM_TAMANHO_CAMISA || "",
            tamanhoCalca: rawData.UF_CRM_TAMANHO_CALCA || "",
            tamanhoSapato: rawData.UF_CRM_TAMANHO_SAPATO || "",
            instagram: rawData.UF_CRM_INSTAGRAM || "",
            instagramSeguidores: rawData.UF_CRM_INSTAGRAM_SEGUIDORES || "",
            facebook: rawData.UF_CRM_FACEBOOK || "",
            facebookSeguidores: rawData.UF_CRM_FACEBOOK_SEGUIDORES || "",
            youtube: rawData.UF_CRM_YOUTUBE || "",
            youtubeSeguidores: rawData.UF_CRM_YOUTUBE_SEGUIDORES || "",
            tiktok: rawData.UF_CRM_TIKTOK || "",
            tiktokSeguidores: rawData.UF_CRM_TIKTOK_SEGUIDORES || "",
            tiposModelo: rawData.UF_CRM_TIPOS_MODELO || [],
            cursos: rawData.UF_CRM_CURSOS || [],
            habilidades: rawData.UF_CRM_HABILIDADES || [],
            caracteristicas: rawData.UF_CRM_CARACTERISTICAS || []
          });
          const photoUrls: string[] = [];
          if (lead.photo_url) photoUrls.push(getLeadPhotoUrl(lead.photo_url));
          if (rawData.additional_photos && Array.isArray(rawData.additional_photos)) {
            photoUrls.push(...rawData.additional_photos);
          }
          if (photoUrls.length === 0) photoUrls.push(getLeadPhotoUrl(null));
          setImages(photoUrls);
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
  const handleAddPhoto = () => {
    if (images.length >= 10) {
      toast.error("Máximo de 10 fotos");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${leadId}/${fileName}`;
          const {
            error
          } = await supabase.storage.from('lead-photos').upload(filePath, file);
          if (error) throw error;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('lead-photos').getPublicUrl(filePath);
          setImages([...images, publicUrl]);
          toast.success("Foto adicionada!");
        } catch (error: any) {
          toast.error("Erro ao fazer upload");
        }
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
          const fileExt = file.name.split('.').pop();
          const filePath = `${leadId}/${Date.now()}.${fileExt}`;
          const {
            error
          } = await supabase.storage.from('lead-photos').upload(filePath, file);
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
          toast.error("Erro ao substituir foto");
        }
      }
    };
    input.click();
  };
  const handleRemovePhoto = (index: number) => {
    if (images.length <= 1) {
      toast.error("Você precisa ter pelo menos uma foto!");
      return;
    }
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (activeImageIndex >= newImages.length) setActiveImageIndex(newImages.length - 1);
    toast.success("Foto removida!");
  };
  const handleFieldChange = (field: keyof LeadData, value: any) => {
    setLeadData(prev => ({
      ...prev,
      [field]: value
    }));
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
      const updateData = {
        nome_modelo: leadData.nomeModelo,
        name: leadData.nomeModelo,
        nome_responsavel_legal: leadData.nomeResponsavel,
        celular: leadData.telefone,
        photo_url: images[0] || null,
        updated_at: new Date().toISOString(),
        raw: {
          UF_CRM_ESTADO_CIVIL: leadData.estadoCivil,
          UF_CRM_CIDADE: leadData.cidade,
          UF_CRM_ESTADO: leadData.estado,
          UF_CRM_DATA_NASCIMENTO: leadData.dataNascimento,
          UF_CRM_SEXO: leadData.sexo,
          UF_CRM_ALTURA: leadData.altura,
          UF_CRM_PESO: leadData.peso,
          UF_CRM_BUSTO: leadData.busto,
          UF_CRM_CINTURA: leadData.cintura,
          UF_CRM_QUADRIL: leadData.quadril,
          UF_CRM_COR_PELE: leadData.corPele,
          UF_CRM_COR_CABELO: leadData.corCabelo,
          UF_CRM_COR_OLHOS: leadData.corOlhos,
          UF_CRM_TIPO_CABELO: leadData.tipoCabelo,
          UF_CRM_TAMANHO_CAMISA: leadData.tamanhoCamisa,
          UF_CRM_TAMANHO_CALCA: leadData.tamanhoCalca,
          UF_CRM_TAMANHO_SAPATO: leadData.tamanhoSapato,
          UF_CRM_INSTAGRAM: leadData.instagram,
          UF_CRM_INSTAGRAM_SEGUIDORES: leadData.instagramSeguidores,
          UF_CRM_FACEBOOK: leadData.facebook,
          UF_CRM_FACEBOOK_SEGUIDORES: leadData.facebookSeguidores,
          UF_CRM_YOUTUBE: leadData.youtube,
          UF_CRM_YOUTUBE_SEGUIDORES: leadData.youtubeSeguidores,
          UF_CRM_TIKTOK: leadData.tiktok,
          UF_CRM_TIKTOK_SEGUIDORES: leadData.tiktokSeguidores,
          UF_CRM_TIPOS_MODELO: leadData.tiposModelo,
          UF_CRM_CURSOS: leadData.cursos,
          UF_CRM_HABILIDADES: leadData.habilidades,
          UF_CRM_CARACTERISTICAS: leadData.caracteristicas,
          additional_photos: images.slice(1)
        }
      };
      const {
        error: supabaseError
      } = await supabase.from('leads').update(updateData).eq('id', parseInt(leadId!));
      if (supabaseError) throw supabaseError;
      try {
        await supabase.functions.invoke('bitrix-entity-update', {
          body: {
            entityType: 'lead',
            entityId: leadId,
            fields: {
              NAME: leadData.nomeModelo,
              PHONE: [{
                VALUE: leadData.telefone,
                VALUE_TYPE: "MOBILE"
              }],
              ...updateData.raw
            }
          }
        });
      } catch (bitrixError) {
        console.error('Erro Bitrix:', bitrixError);
      }
      toast.success("Cadastro atualizado com sucesso!");
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
  if (!leadId) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">ID do lead não fornecido</p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Maxfama</h1>
          <p className="text-muted-foreground">Pré analise de Pefil.
Complete suas informações</p>
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

            <FormSection title="Dados Cadastrais" icon={<User />}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="nomeResponsavel" label="Nome do Responsável" value={leadData.nomeResponsavel} onChange={v => handleFieldChange("nomeResponsavel", v)} required />
                  <FormField id="estadoCivil" label="Estado Civil" type="select" value={leadData.estadoCivil} onChange={v => handleFieldChange("estadoCivil", v)} options={estadoCivil} />
                  <FormField id="telefone" label="Telefone" type="tel" value={leadData.telefone} onChange={v => handleFieldChange("telefone", v)} required />
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

            <FormSection title="Dados do Modelo" icon={<Ruler />}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="nomeModelo" label="Nome Completo" value={leadData.nomeModelo} onChange={v => handleFieldChange("nomeModelo", v)} required />
                  <DateSelectField id="dataNascimento" label="Data de Nascimento" value={leadData.dataNascimento} onChange={v => handleFieldChange("dataNascimento", v)} />
                </div>
                <FormField id="sexo" label="Sexo" type="select" value={leadData.sexo} onChange={v => handleFieldChange("sexo", v)} options={sexoOptions} />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <FormField id="altura" label="Altura (cm)" type="number" value={leadData.altura} onChange={v => handleFieldChange("altura", v)} />
                  <FormField id="peso" label="Peso (kg)" type="number" value={leadData.peso} onChange={v => handleFieldChange("peso", v)} />
                  <FormField id="busto" label="Busto (cm)" type="number" value={leadData.busto} onChange={v => handleFieldChange("busto", v)} />
                  <FormField id="cintura" label="Cintura (cm)" type="number" value={leadData.cintura} onChange={v => handleFieldChange("cintura", v)} />
                  <FormField id="quadril" label="Quadril (cm)" type="number" value={leadData.quadril} onChange={v => handleFieldChange("quadril", v)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField id="corPele" label="Cor da Pele" type="select" value={leadData.corPele} onChange={v => handleFieldChange("corPele", v)} options={corPele} />
                  <FormField id="corCabelo" label="Cor do Cabelo" type="select" value={leadData.corCabelo} onChange={v => handleFieldChange("corCabelo", v)} options={corCabelo} />
                  <FormField id="corOlhos" label="Cor dos Olhos" type="select" value={leadData.corOlhos} onChange={v => handleFieldChange("corOlhos", v)} options={corOlhos} />
                  <FormField id="tipoCabelo" label="Tipo de Cabelo" type="select" value={leadData.tipoCabelo} onChange={v => handleFieldChange("tipoCabelo", v)} options={tipoCabelo} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField id="tamanhoCamisa" label="Tamanho Camisa" type="select" value={leadData.tamanhoCamisa} onChange={v => handleFieldChange("tamanhoCamisa", v)} options={tamanhoCamisa} />
                  <FormField id="tamanhoCalca" label="Tamanho Calça" type="select" value={leadData.tamanhoCalca} onChange={v => handleFieldChange("tamanhoCalca", v)} options={tamanhoCalca} />
                  <FormField id="tamanhoSapato" label="Tamanho Sapato" type="select" value={leadData.tamanhoSapato} onChange={v => handleFieldChange("tamanhoSapato", v)} options={tamanhoSapato} />
                </div>
              </div>
            </FormSection>

            <FormSection title="Redes Sociais" icon={<InstagramIcon />}>
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

            <FormSection title="Habilidades e Experiência" icon={<Sparkles />}>
              <div className="space-y-4">
                <MultiSelect id="tiposModelo" label="Tipos de Modelo" value={leadData.tiposModelo} onChange={v => handleFieldChange("tiposModelo", v)} options={tipoModelo} />
                <MultiSelect id="cursos" label="Cursos Realizados" value={leadData.cursos} onChange={v => handleFieldChange("cursos", v)} options={cursosOptions} />
                <MultiSelect id="habilidades" label="Habilidades" value={leadData.habilidades} onChange={v => handleFieldChange("habilidades", v)} options={habilidadesOptions} />
                <MultiSelect id="caracteristicas" label="Características Especiais" value={leadData.caracteristicas} onChange={v => handleFieldChange("caracteristicas", v)} options={caracteristicasEspeciais} />
              </div>
            </FormSection>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} size="lg" disabled={saving}>
                {saving ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Salvando...</> : <><Save className="h-5 w-5 mr-2" />Salvar Alterações</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default PreCadastro;