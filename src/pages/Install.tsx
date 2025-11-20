import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Zap, Wifi } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useNavigate } from 'react-router-dom';

export default function Install() {
  const { canInstall, promptInstall, isInstalled } = useInstallPrompt();
  const navigate = useNavigate();

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      navigate('/scouter/leads');
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">App Já Instalado!</h2>
            <p className="text-muted-foreground mb-6">
              O app já está instalado no seu dispositivo.
            </p>
            <Button onClick={() => navigate('/scouter/leads')}>
              Ir para Leads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Instale o App Gestão Scouter
          </h1>
          <p className="text-xl text-muted-foreground">
            Análise de leads estilo Tinder, agora no seu celular
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Como um App Nativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Ícone na tela inicial</li>
                <li>✓ Tela cheia (sem barra do navegador)</li>
                <li>✓ Gestos de swipe nativos</li>
                <li>✓ Notificações push</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Rápido e Eficiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Carregamento instantâneo</li>
                <li>✓ Cache inteligente</li>
                <li>✓ Uso reduzido de dados</li>
                <li>✓ Atualizações automáticas</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Funciona Offline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Analise leads sem internet</li>
                <li>✓ Sincronização automática</li>
                <li>✓ Cache de mapas</li>
                <li>✓ Dados sempre disponíveis</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Instalação Simples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Sem App Store</li>
                <li>✓ Sem cadastros extras</li>
                <li>✓ Instala em 1 clique</li>
                <li>✓ Funciona em iOS e Android</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          {canInstall ? (
            <Button size="lg" onClick={handleInstall} className="gap-2">
              <Download className="w-5 h-5" />
              Instalar Agora
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Para instalar o app:
              </p>
              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto text-sm">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">iPhone/iPad</CardTitle>
                  </CardHeader>
                  <CardContent className="text-left">
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Abra no Safari</li>
                      <li>Toque em "Compartilhar"</li>
                      <li>Role e toque em "Adicionar à Tela Inicial"</li>
                      <li>Toque em "Adicionar"</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Android</CardTitle>
                  </CardHeader>
                  <CardContent className="text-left">
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Abra no Chrome</li>
                      <li>Toque no menu (⋮)</li>
                      <li>Toque em "Instalar app"</li>
                      <li>Toque em "Instalar"</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
