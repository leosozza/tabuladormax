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

  // Listener para dados do Bitrix via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const eventData = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;

        // Atualizar perfil com dados recebidos
        if (eventData && typeof eventData === 'object') {
          setRawBitrix(eventData);
          
          setProfile({
            RESPONSAVEL: eventData.UF_RESPONSAVEL || eventData.RESPONSAVEL || '',
            MODELO: eventData.NAME || eventData.MODELO || '',
            IDADE: String(eventData.UF_IDADE || eventData.IDADE || ''),
            LOCAL: eventData.ADDRESS || eventData.LOCAL || '',
            SCOUTER: eventData.UF_SCOUTER || eventData.SCOUTER || '',
            PHOTO: eventData.PHOTO || eventData.PHOTO_URL || ''
          });

          // Atualizar cache automaticamente
          if (id) {
            supabase.from('leads').upsert({
              id: Number(id),
              name: eventData.NAME || '',
              responsible: eventData.UF_RESPONSAVEL || null,
              age: eventData.UF_IDADE ? Number(eventData.UF_IDADE) : null,
              address: eventData.ADDRESS || null,
              scouter: eventData.UF_SCOUTER || null,
              photo_url: eventData.PHOTO || null,
              date_modify: eventData.DATE_MODIFY || null,
              raw: eventData,
              updated_at: new Date().toISOString()
            }).then(() => {
              toast.success('Dados recebidos do Bitrix!');
            });
          }
        }
      } catch (error) {
        console.error('Erro ao processar postMessage:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
    <div className="min-h-screen bg-background">
      <HotkeyListener mapping={hotkeyMapping} disabled={editMode} />

      {/* Header com botão Voltar */}
      <div className="bg-card border-b border-border p-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          ← Voltar
        </Button>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna Esquerda - Perfil */}
          <Card className="p-8 bg-card">
            <div className="flex flex-col items-center gap-6">
              {/* Foto com borda verde */}
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-4 border-success bg-muted flex items-center justify-center overflow-hidden">
                  {profile.PHOTO ? (
                    <img
                      src={profile.PHOTO}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-20 w-20 text-muted-foreground" />
                  )}
                </div>
              </div>

              {!editMode ? (
                <>
                  {/* Nome */}
                  <h2 className="text-2xl font-bold text-center text-foreground">
                    {profile.MODELO || 'Lead sem nome'}
                  </h2>

                  {/* Informações */}
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <User className="h-5 w-5" />
                      <span>Responsável: {profile.RESPONSAVEL || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Cake className="h-5 w-5" />
                      <span>Idade: {profile.IDADE || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="h-5 w-5" />
                      <span>Local: {profile.LOCAL || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Compass className="h-5 w-5" />
                      <span>Scouter: {profile.SCOUTER || '—'}</span>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="w-full flex gap-2 pt-4">
                    <Button
                      onClick={() => setEditMode(true)}
                      className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <Edit className="h-4 w-4" />
                      Editar Perfil
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowHelp(!showHelp)}
                    >
                      Atalhos
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-4">
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
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Cache
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Coluna Direita - Ações */}
          <div className="space-y-6">
            <Card className="p-6 bg-card">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="h-5 w-5" />
                <h3 className="text-xl font-bold text-foreground">Ações de Tabulação</h3>
              </div>

              {showHelp && (
                <Card className="p-4 bg-muted mb-4">
                  <h4 className="font-bold mb-2">⌨️ Atalhos disponíveis</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {hotkeyMapping.map((hk, i) => (
                      <div key={i}>{hk.id} — {hk.key}</div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Grid de Botões 2x3 */}
              <div className="grid grid-cols-2 gap-4">
                {buttons.slice(0, 7).map((btn) => (
                  <Button
                    key={btn.id}
                    data-btn-id={btn.id}
                    onClick={() => handleButtonClick(btn)}
                    style={{ backgroundColor: btn.color }}
                    className="h-24 text-white text-base font-semibold rounded-2xl hover:scale-105 transition-all flex flex-col items-center justify-center gap-1 shadow-lg"
                  >
                    <span>{btn.label}</span>
                    {btn.hotkey && (
                      <span className="text-xs opacity-80">[{btn.hotkey}]</span>
                    )}
                  </Button>
                ))}
              </div>

              {/* Botões extras em uma linha */}
              {buttons.length > 7 && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {buttons.slice(7).map((btn) => (
                    <Button
                      key={btn.id}
                      data-btn-id={btn.id}
                      onClick={() => handleButtonClick(btn)}
                      style={{ backgroundColor: btn.color }}
                      className="h-20 text-white text-base font-semibold rounded-2xl hover:scale-105 transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <span>{btn.label}</span>
                      {btn.hotkey && (
                        <span className="text-xs opacity-80">[{btn.hotkey}]</span>
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {/* Botões de navegação */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => navigate('/config')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurar Botões
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/logs')}
                  className="gap-2"
                >
                  <BookText className="h-4 w-4" />
                  Ver Logs
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
