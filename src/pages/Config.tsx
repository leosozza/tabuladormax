import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ArrowLeft, Palette } from 'lucide-react';

interface ButtonConfig {
  id?: string;
  label: string;
  color: string;
  category: string;
  hotkey?: string;
  field: string;
  value?: string;
  field_type: string;
  action_type: string;
  sort: number;
}

export default function Config() {
  const navigate = useNavigate();
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadButtons();
  }, []);

  const loadButtons = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('button_config')
        .select('*')
        .order('sort');

      if (data) setButtons(data);
    } catch (error) {
      console.error('Erro ao carregar botões:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const saveButtons = async () => {
    try {
      // Deletar todos os botões existentes
      await supabase.from('button_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Inserir os novos
      const { error } = await supabase.from('button_config').insert(
        buttons.map((btn, i) => ({
          ...btn,
          sort: i,
          id: undefined // Remove ID para criar novos
        }))
      );

      if (error) throw error;

      toast.success('Configuração salva!');
      loadButtons();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const addButton = () => {
    setButtons([
      ...buttons,
      {
        label: 'Novo botão',
        color: '#3b82f6',
        category: 'NAO_AGENDADO',
        field: 'STATUS_ID',
        value: '',
        field_type: 'string',
        action_type: 'simple',
        sort: buttons.length
      }
    ]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: string, value: any) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ⚙️ Configuração de Botões
          </h1>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card className="p-8 shadow-[var(--shadow-card)]">
          <div className="space-y-6">
            {buttons.map((btn, index) => (
              <Card key={index} className="p-6 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome do botão</Label>
                    <Input
                      value={btn.label}
                      onChange={(e) => updateButton(index, 'label', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={btn.color}
                        onChange={(e) => updateButton(index, 'color', e.target.value)}
                        className="w-20 h-10 p-1"
                      />
                      <Input
                        value={btn.color}
                        onChange={(e) => updateButton(index, 'color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={btn.category}
                      onValueChange={(value) => updateButton(index, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NAO_AGENDADO">🟥 Não Agendado</SelectItem>
                        <SelectItem value="RETORNAR">🟨 Retornar</SelectItem>
                        <SelectItem value="AGENDAR">🟩 Agendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Atalho (ex: 1, Space, Ctrl+1)</Label>
                    <Input
                      value={btn.hotkey || ''}
                      onChange={(e) => updateButton(index, 'hotkey', e.target.value)}
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <Label>Campo Bitrix</Label>
                    <Input
                      value={btn.field}
                      onChange={(e) => updateButton(index, 'field', e.target.value)}
                      placeholder="STATUS_ID, UF_CRM_*"
                    />
                  </div>

                  <div>
                    <Label>Valor padrão</Label>
                    <Input
                      value={btn.value || ''}
                      onChange={(e) => updateButton(index, 'value', e.target.value)}
                      placeholder="Valor"
                    />
                  </div>

                  <div>
                    <Label>Tipo do campo</Label>
                    <Select
                      value={btn.field_type}
                      onValueChange={(value) => updateButton(index, 'field_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="datetime">DateTime</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de ação</Label>
                    <Select
                      value={btn.action_type}
                      onValueChange={(value) => updateButton(index, 'action_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simples</SelectItem>
                        <SelectItem value="schedule">Agendamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      onClick={() => removeButton(index)}
                      className="w-full gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex gap-4">
              <Button
                onClick={addButton}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Botão
              </Button>

              <Button
                onClick={saveButtons}
                className="flex-1 gap-2 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)]"
              >
                <Save className="h-4 w-4" />
                Salvar Configuração
              </Button>

              <Button
                onClick={() => navigate('/designer')}
                variant="secondary"
                className="flex-1 gap-2"
              >
                <Palette className="h-4 w-4" />
                Designer
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
