import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Database,
  CheckCircle,
  AlertCircle,
  Save,
  TestTube2,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { getTabuladorConfig, saveTabuladorConfig, testTabuladorConnection } from '@/repositories/tabuladorConfigRepo';
import type { TabuladorMaxConfig } from '@/repositories/types';

export function TabuladorMaxConfigPanel() {
  const [config, setConfig] = useState<TabuladorMaxConfig>({
    project_id: '',
    url: '',
    publishable_key: '',
    enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Determinar status da conexão
  const getConnectionStatus = () => {
    if (testResult?.success) return { color: 'bg-green-500', label: 'Conectado' };
    if (testResult?.success === false) return { color: 'bg-yellow-500', label: 'Erro' };
    if (!config.project_id || !config.url || !config.publishable_key) {
      return { color: 'bg-red-500', label: 'Desconectado' };
    }
    return { color: 'bg-gray-400', label: 'Não testado' };
  };

  const status = getConnectionStatus();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await getTabuladorConfig();
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!config.project_id || !config.url || !config.publishable_key) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      console.log('💾 [TabuladorMaxConfigPanel] Iniciando salvamento...');
      
      const saved = await saveTabuladorConfig({
        project_id: config.project_id,
        url: config.url,
        publishable_key: config.publishable_key,
        enabled: config.enabled,
      });

      if (saved && saved.project_id) {
        console.log('✅ [TabuladorMaxConfigPanel] Salvamento confirmado:', saved.project_id);
        toast.success('✅ Configuração salva com sucesso', {
          description: `Projeto: ${saved.project_id} | URL: ${saved.url}`
        });
        setConfig(saved); // Atualizar estado com dados completos
        setTestResult(null); // Clear previous test results
      } else {
        console.error('⚠️ [TabuladorMaxConfigPanel] Salvou mas retornou sem ID:', saved);
        toast.error('⚠️ Configuração parcialmente salva', {
          description: 'Dados salvos no navegador mas não sincronizados com o banco'
        });
      }
    } catch (error) {
      console.error('❌ [TabuladorMaxConfigPanel] Erro crítico ao salvar:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('❌ Erro ao salvar configuração', {
        description: errorMessage,
        duration: 10000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.project_id || !config.url || !config.publishable_key) {
      toast.error('Configure os dados do TabuladorMax antes de testar');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testTabuladorConnection(config);
      setTestResult(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Database className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6" />
              <div className="text-left">
                <CardTitle className="flex items-center gap-2">
                  Configuração do TabuladorMax
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${status.color} animate-pulse`} />
                    <span className="text-xs font-normal text-muted-foreground">{status.label}</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Configure a conexão com o banco de dados do TabuladorMax
                </CardDescription>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Estas configurações permitem que o sistema se conecte ao Supabase do TabuladorMax
            para sincronizar dados de leads. As credenciais são armazenadas de forma segura.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="project_id">Project ID</Label>
              <Badge variant={config.enabled ? 'default' : 'secondary'}>
                {config.enabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <Input
              id="project_id"
              value={config.project_id}
              onChange={(e) => setConfig({ ...config, project_id: e.target.value })}
              placeholder="gkvvtfqfggddzotxltxf"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              ID do projeto Supabase do TabuladorMax
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL do Supabase</Label>
            <Input
              id="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://gkvvtfqfggddzotxltxf.supabase.co"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              URL completa do projeto Supabase
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishable_key">Publishable Key (anon)</Label>
            <div className="flex gap-2">
              <Input
                id="publishable_key"
                type={showKey ? 'text' : 'password'}
                value={config.publishable_key}
                onChange={(e) => setConfig({ ...config, publishable_key: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                disabled={isSaving}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Chave pública (anon key) do projeto TabuladorMax
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Habilitar Integração</Label>
              <p className="text-xs text-muted-foreground">
                Ativar sincronização automática com TabuladorMax
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              disabled={isSaving}
            />
          </div>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>{testResult.success ? 'Sucesso!' : 'Erro:'}</strong> {testResult.message}
              {testResult.count !== undefined && (
                <span className="block mt-1 text-xs">
                  Total de leads encontrados: {testResult.count.toLocaleString('pt-BR')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="flex-1"
          >
            <Save className={`h-4 w-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
          <Button
            onClick={handleTest}
            disabled={isTesting || isSaving}
            variant="outline"
            className="flex-1"
          >
            <TestTube2 className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Dados Padrão (Recomendados)</h4>
          <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded-lg">
            <div>Project ID: gkvvtfqfggddzotxltxf</div>
            <div>URL: https://gkvvtfqfggddzotxltxf.supabase.co</div>
            <div className="break-all">
              Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU
            </div>
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
