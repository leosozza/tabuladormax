import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  User, 
  Cake, 
  MapPin, 
  Compass, 
  Edit, 
  Save, 
  Phone,
  Settings,
  BookText
} from 'lucide-react';
import HotkeyListener from '@/components/HotkeyListener';

interface ButtonConfig {
  id: string;
  label: string;
  color: string;
  category: string;
  hotkey?: string;
  field: string;
  value?: string;
  action_type: string;
  sub_buttons?: Array<{
    subLabel: string;
    subHotkey?: string;
    subField: string;
    subValue: string;
  }>;
}

interface LeadProfile {
  RESPONSAVEL: string;
  MODELO: string;
  IDADE: string;
  LOCAL: string;
  SCOUTER: string;
  PHOTO: string;
}

export default function Lead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<LeadProfile>({
    RESPONSAVEL: '',
    MODELO: '',
    IDADE: '',
    LOCAL: '',
    SCOUTER: '',
    PHOTO: ''
  });
  const [rawBitrix, setRawBitrix] = useState<any>({});
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Carregar cache do Supabase
      const { data: cached } = await supabase
        .from('leads')
        .select('*')
        .eq('id', Number(id))
        .single();

      if (cached) {
        setProfile({
          RESPONSAVEL: cached.responsible || '',
          MODELO: cached.name || '',
          IDADE: String(cached.age || ''),
          LOCAL: cached.address || '',
          SCOUTER: cached.scouter || '',
          PHOTO: cached.photo_url || ''
        });
        setRawBitrix(cached.raw || {});
      }

      // Carregar botões
      const { data: btnData } = await supabase
        .from('button_config')
        .select('*')
        .order('sort');

      if (btnData) {
        setButtons(btnData.map(btn => ({
          id: btn.id,
          label: btn.label,
          color: btn.color,
          category: btn.category,
          hotkey: btn.hotkey || undefined,
          field: btn.field,
          value: btn.value || undefined,
          action_type: btn.action_type,
          sub_buttons: Array.isArray(btn.sub_buttons) ? btn.sub_buttons as any : []
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar lead');
    } finally {
      setLoading(false);
    }
  };

  const updateCache = async () => {
    if (!id) return;

    try {
      await supabase.from('leads').upsert({
        id: Number(id),
        name: profile.MODELO,
        responsible: profile.RESPONSAVEL,
        age: profile.IDADE ? Number(profile.IDADE) : null,
        address: profile.LOCAL,
        scouter: profile.SCOUTER,
        photo_url: profile.PHOTO,
        raw: rawBitrix,
        updated_at: new Date().toISOString()
      });

      toast.success('Perfil atualizado no cache!');
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao atualizar cache:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const executeAction = async (button: ButtonConfig, subButton?: any) => {
    if (!id) return;

    try {
      const actionLabel = subButton 
        ? `${button.label} / ${subButton.subLabel}`
        : button.label;

      const field = subButton ? subButton.subField : button.field;
      const value = subButton ? subButton.subValue : button.value;

      // Log da ação
      await supabase.from('actions_log').insert([{
        lead_id: Number(id),
        action_label: actionLabel,
        payload: { field, value, profile } as any,
        status: 'OK'
      }]);

      toast.success(`Ação executada: ${actionLabel}`);
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      toast.error('Erro ao executar ação');
    }
  };

  const handleButtonClick = (button: ButtonConfig) => {
    if (button.sub_buttons && button.sub_buttons.length > 0) {
      // Mostrar sub-botões (simplificado - você pode melhorar com modal)
      const choices = button.sub_buttons.map((sub, i) => 
        `${i + 1}. ${sub.subLabel}`
      ).join('\n');
      
      const choice = window.prompt(
        `${button.label} - Selecione o motivo:\n\n${choices}\n\nDigite o número:`
      );
      
      if (choice) {
        const index = Number(choice) - 1;
        if (button.sub_buttons[index]) {
          executeAction(button, button.sub_buttons[index]);
        }
      }
    } else if (button.action_type === 'schedule') {
      const datetime = window.prompt('Digite a data/hora (YYYY-MM-DD HH:MM):');
      if (datetime) {
        executeAction(button);
      }
    } else {
      executeAction(button);
    }
  };

  const hotkeyMapping = buttons.flatMap(b => {
    const main = b.hotkey ? [{ id: b.id, key: b.hotkey }] : [];
    const subs = (b.sub_buttons || [])
      .filter(s => s.subHotkey)
      .map(s => ({ id: `${b.id}::${s.subLabel}`, key: s.subHotkey! }));
    return [...main, ...subs];
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  const categorizedButtons = {
    NAO_AGENDADO: buttons.filter(b => b.category === 'NAO_AGENDADO'),
    RETORNAR: buttons.filter(b => b.category === 'RETORNAR'),
    AGENDAR: buttons.filter(b => b.category === 'AGENDAR')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 p-8">
      <HotkeyListener mapping={hotkeyMapping} disabled={editMode} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Tabulação Lead #{id}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/config')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Config
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/logs')}
              className="gap-2"
            >
              <BookText className="h-4 w-4" />
              Logs
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Perfil */}
          <Card className="p-8 shadow-[var(--shadow-card)] bg-gradient-to-br from-card to-card/80">
            <div className="flex flex-col gap-6">
              {/* Foto */}
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={profile.PHOTO || '/placeholder.svg'}
                    alt="Foto"
                    className="w-32 h-32 rounded-full border-4 border-primary shadow-[var(--shadow-button)] object-cover"
                  />
                </div>
              </div>

              {!editMode ? (
                <>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-center">{profile.MODELO}</h2>
                    
                    <div className="space-y-3 text-lg">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <User className="h-5 w-5 text-primary" />
                        <span>Responsável: <strong>{profile.RESPONSAVEL}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Cake className="h-5 w-5 text-primary" />
                        <span>Idade: <strong>{profile.IDADE}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span>Local: <strong>{profile.LOCAL}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Compass className="h-5 w-5 text-primary" />
                        <span>Scouter: <strong>{profile.SCOUTER}</strong></span>
                      </div>
                    </div>

                    {profile.LOCAL && (
                      <div className="mt-6">
                        <iframe
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=-46.66,-23.55,-46.64,-23.53&layer=mapnik&marker=-23.54,-46.65`}
                          className="w-full h-48 rounded-xl border-2 border-border"
                          title="Mapa"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => setEditMode(true)}
                      className="flex-1 gap-2 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)]"
                    >
                      <Edit className="h-4 w-4" />
                      Editar Perfil
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowHelp(!showHelp)}
                      className="gap-2"
                    >
                      {showHelp ? '✕' : '❓'} Atalhos
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Responsável</Label>
                    <Input
                      value={profile.RESPONSAVEL}
                      onChange={(e) => setProfile({ ...profile, RESPONSAVEL: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      value={profile.MODELO}
                      onChange={(e) => setProfile({ ...profile, MODELO: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Idade</Label>
                    <Input
                      value={profile.IDADE}
                      onChange={(e) => setProfile({ ...profile, IDADE: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Local</Label>
                    <Input
                      value={profile.LOCAL}
                      onChange={(e) => setProfile({ ...profile, LOCAL: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Scouter</Label>
                    <Input
                      value={profile.SCOUTER}
                      onChange={(e) => setProfile({ ...profile, SCOUTER: e.target.value })}
                    />
                  </div>
                  <Button
                    onClick={updateCache}
                    className="w-full gap-2 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)]"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Cache
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Botões por Categoria */}
          <div className="space-y-6">
            {showHelp && (
              <Card className="p-4 bg-gray-900/95 text-white">
                <h3 className="font-bold mb-2">⌨️ Atalhos disponíveis</h3>
                <div className="space-y-1 text-sm">
                  {hotkeyMapping.map((hk, i) => (
                    <div key={i}>{hk.id} — {hk.key}</div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-6">
              {/* Não Agendado */}
              <Card className="p-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <h3 className="text-lg font-bold mb-4 text-red-700 dark:text-red-300">
                  🟥 Não Agendado
                </h3>
                <div className="space-y-3">
                  {categorizedButtons.NAO_AGENDADO.map((btn) => (
                    <Button
                      key={btn.id}
                      data-btn-id={btn.id}
                      onClick={() => handleButtonClick(btn)}
                      style={{ backgroundColor: btn.color }}
                      className="w-full text-white text-lg py-6 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)] hover:scale-105 transition-all"
                    >
                      {btn.label} {btn.hotkey && `[${btn.hotkey}]`}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Retornar */}
              <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <h3 className="text-lg font-bold mb-4 text-amber-700 dark:text-amber-300">
                  🟨 Retornar o Contato
                </h3>
                <div className="space-y-3">
                  {categorizedButtons.RETORNAR.map((btn) => (
                    <Button
                      key={btn.id}
                      data-btn-id={btn.id}
                      onClick={() => handleButtonClick(btn)}
                      style={{ backgroundColor: btn.color }}
                      className="w-full text-white text-lg py-6 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)] hover:scale-105 transition-all"
                    >
                      {btn.label} {btn.hotkey && `[${btn.hotkey}]`}
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Agendar */}
              <Card className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                <h3 className="text-lg font-bold mb-4 text-emerald-700 dark:text-emerald-300">
                  🟩 Agendar
                </h3>
                <div className="space-y-3">
                  {categorizedButtons.AGENDAR.map((btn) => (
                    <Button
                      key={btn.id}
                      data-btn-id={btn.id}
                      onClick={() => handleButtonClick(btn)}
                      style={{ backgroundColor: btn.color }}
                      className="w-full text-white text-lg py-6 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)] hover:scale-105 transition-all"
                    >
                      {btn.label} {btn.hotkey && `[${btn.hotkey}]`}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
