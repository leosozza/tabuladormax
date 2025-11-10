import { useState } from 'react';
import { GestaoPageLayout } from '@/components/layouts/GestaoPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Save, User, FileText, MapPin, Phone, Calendar } from 'lucide-react';

export default function FichaCadastral() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    celular: '',
    telefone_casa: '',
    telefone_trabalho: '',
    address: '',
    age: '',
    fonte: '',
    local_abordagem: '',
    scouter: '',
    gestao_scouter: '',
    etapa: 'Cadastro Inicial',
    status_tabulacao: 'Novo Cadastro',
    photo_url: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `model-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));

      toast({
        title: 'Foto carregada',
        description: 'Foto do modelo carregada com sucesso.',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Erro ao carregar foto',
        description: 'Não foi possível fazer upload da foto.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      
      const leadData: any = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        criado: new Date().toISOString(),
        data_criacao_ficha: new Date().toISOString(),
        sync_source: 'cadastro_manual',
        sync_status: 'pending',
        responsible: user.user?.id || null,
      };

      const { error } = await supabase
        .from('leads')
        .insert([leadData]);

      if (error) throw error;

      toast({
        title: 'Cadastro realizado',
        description: 'Ficha cadastral criada com sucesso.',
      });

      // Reset form
      setFormData({
        name: '',
        celular: '',
        telefone_casa: '',
        telefone_trabalho: '',
        address: '',
        age: '',
        fonte: '',
        local_abordagem: '',
        scouter: '',
        gestao_scouter: '',
        etapa: 'Cadastro Inicial',
        status_tabulacao: 'Novo Cadastro',
        photo_url: ''
      });
      setPhotoUrl('');

    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Erro ao cadastrar',
        description: 'Não foi possível criar a ficha cadastral.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GestaoPageLayout
      title="Ficha Cadastral"
      description="Cadastro de novos modelos"
    >
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Foto do Modelo
              </CardTitle>
              <CardDescription>
                Adicione uma foto do modelo para identificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {photoUrl ? (
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-primary">
                    <img src={photoUrl} alt="Modelo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="Idade"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => handleInputChange('celular', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone_casa">Telefone Residencial</Label>
                  <Input
                    id="telefone_casa"
                    value={formData.telefone_casa}
                    onChange={(e) => handleInputChange('telefone_casa', e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone_trabalho">Telefone Trabalho</Label>
                  <Input
                    id="telefone_trabalho"
                    value={formData.telefone_trabalho}
                    onChange={(e) => handleInputChange('telefone_trabalho', e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Digite o endereço completo"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informações Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fonte">Fonte</Label>
                  <Select
                    value={formData.fonte}
                    onValueChange={(value) => handleInputChange('fonte', value)}
                  >
                    <SelectTrigger id="fonte">
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Abordagem de Rua">Abordagem de Rua</SelectItem>
                      <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                      <SelectItem value="Evento">Evento</SelectItem>
                      <SelectItem value="Site">Site</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="local_abordagem">Local de Abordagem</Label>
                  <Input
                    id="local_abordagem"
                    value={formData.local_abordagem}
                    onChange={(e) => handleInputChange('local_abordagem', e.target.value)}
                    placeholder="Local onde foi abordado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scouter">Scouter</Label>
                  <Input
                    id="scouter"
                    value={formData.scouter}
                    onChange={(e) => handleInputChange('scouter', e.target.value)}
                    placeholder="Nome do scouter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gestao_scouter">Gestão Scouter</Label>
                  <Input
                    id="gestao_scouter"
                    value={formData.gestao_scouter}
                    onChange={(e) => handleInputChange('gestao_scouter', e.target.value)}
                    placeholder="Gestor responsável"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  celular: '',
                  telefone_casa: '',
                  telefone_trabalho: '',
                  address: '',
                  age: '',
                  fonte: '',
                  local_abordagem: '',
                  scouter: '',
                  gestao_scouter: '',
                  etapa: 'Cadastro Inicial',
                  status_tabulacao: 'Novo Cadastro',
                  photo_url: ''
                });
                setPhotoUrl('');
              }}
            >
              Limpar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Cadastro'}
            </Button>
          </div>
        </form>
      </div>
    </GestaoPageLayout>
  );
}
