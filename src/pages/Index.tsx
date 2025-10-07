import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Phone, Settings, BarChart3, Palette } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [leadId, setLeadId] = useState('');

  const openLead = () => {
    if (leadId) {
      navigate(`/lead/${leadId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/10 to-accent/20 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-12 shadow-[var(--shadow-card)] bg-gradient-to-br from-card to-card/80">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-block p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-[var(--shadow-button)]">
              <Phone className="h-16 w-16 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Tabulador Telemarketing PRO
            </h1>
            <p className="text-xl text-muted-foreground">
              Sistema completo de tabulação com sincronização Bitrix24
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="ID do Lead (ex: 123)"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && openLead()}
                className="text-lg"
              />
              <Button
                onClick={openLead}
                disabled={!leadId}
                size="lg"
                className="shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)]"
              >
                Abrir Lead
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
              <Button
                variant="outline"
                onClick={() => navigate('/config')}
                className="h-20 flex flex-col gap-2"
              >
                <Settings className="h-6 w-6" />
                Configurar Botões
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/designer')}
                className="h-20 flex flex-col gap-2"
              >
                <Palette className="h-6 w-6" />
                Designer
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/logs')}
                className="h-20 flex flex-col gap-2"
              >
                <BarChart3 className="h-6 w-6" />
                Ver Logs
              </Button>
            </div>
          </div>

          <div className="pt-8 border-t text-sm text-muted-foreground space-y-2">
            <p>✨ Perfil editável com minimapa</p>
            <p>⌨️ Hotkeys configuráveis</p>
            <p>🎨 Designer visual de botões</p>
            <p>🔄 Sincronização automática com Bitrix24</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Index;
