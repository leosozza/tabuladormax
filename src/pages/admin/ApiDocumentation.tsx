import { useState } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Copy, 
  Check, 
  ChevronDown, 
  ExternalLink,
  Key,
  Shield,
  Zap,
  FileText,
  Users,
  MessageSquare,
  Database,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: ('api_key' | 'jwt' | 'access_key')[];
  body?: Record<string, any>;
  response?: Record<string, any>;
}

interface ApiCategory {
  name: string;
  icon: React.ReactNode;
  description: string;
  endpoints: ApiEndpoint[];
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
};

const apiCategories: ApiCategory[] = [
  {
    name: 'Autenticação',
    icon: <Shield className="w-4 h-4" />,
    description: 'Gerenciamento de API Keys e autenticação',
    endpoints: [
      {
        method: 'POST',
        path: '/api-key-management',
        description: 'Gerar, revogar, rotacionar ou listar API Keys',
        auth: ['jwt'],
        body: { 
          action: 'generate | revoke | rotate | list | get_usage',
          name: 'Nome da chave (para generate)',
          scopes: ['*'],
          key_id: 'UUID (para revoke/rotate/get_usage)'
        },
        response: { 
          success: true, 
          data: { key_id: 'uuid', api_key: 'tmx_live_xxx...' } 
        }
      }
    ]
  },
  {
    name: 'Scouter App',
    icon: <Users className="w-4 h-4" />,
    description: 'API para o aplicativo Scouter',
    endpoints: [
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Login com chave de acesso',
        auth: ['api_key', 'access_key'],
        body: { action: 'login', access_key: 'CHAVE123' },
        response: { success: true, scouter: { id: 'uuid', name: 'Nome' } }
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Obter estatísticas do scouter',
        auth: ['api_key', 'access_key'],
        body: { action: 'get_stats', access_key: 'CHAVE123' },
        response: { success: true, stats: { total: 100, confirmados: 80 } }
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Ranking de scouters',
        auth: ['api_key', 'access_key'],
        body: { action: 'get_ranking', access_key: 'CHAVE123' },
        response: { success: true, ranking: [] }
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Listar projetos do scouter',
        auth: ['api_key', 'access_key'],
        body: { action: 'get_projects', access_key: 'CHAVE123' },
        response: { success: true, projects: [] }
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Listar leads do scouter',
        auth: ['api_key', 'access_key'],
        body: { action: 'get_leads', access_key: 'CHAVE123', project_id: 'uuid' },
        response: { success: true, leads: [] }
      }
    ]
  },
  {
    name: 'Flows',
    icon: <Zap className="w-4 h-4" />,
    description: 'Gerenciamento de fluxos de automação',
    endpoints: [
      {
        method: 'GET',
        path: '/flows-api',
        description: 'Listar todos os fluxos',
        auth: ['api_key', 'jwt'],
        response: { success: true, flows: [] }
      },
      {
        method: 'POST',
        path: '/flows-api',
        description: 'Criar novo fluxo',
        auth: ['api_key', 'jwt'],
        body: { name: 'Novo Fluxo', nodes: [], edges: [] },
        response: { success: true, flow: { id: 'uuid' } }
      },
      {
        method: 'PUT',
        path: '/flows-api/{id}',
        description: 'Atualizar fluxo existente',
        auth: ['api_key', 'jwt'],
        body: { name: 'Nome Atualizado', is_active: true },
        response: { success: true }
      },
      {
        method: 'DELETE',
        path: '/flows-api/{id}',
        description: 'Deletar fluxo',
        auth: ['api_key', 'jwt'],
        response: { success: true }
      }
    ]
  },
  {
    name: 'Bitrix24',
    icon: <Database className="w-4 h-4" />,
    description: 'Integração com Bitrix24 CRM',
    endpoints: [
      {
        method: 'POST',
        path: '/bitrix-webhook',
        description: 'Webhook para receber atualizações do Bitrix',
        auth: ['api_key'],
        body: { event: 'ONCRMLEADUPDATE', data: { FIELDS: { ID: 123 } } },
        response: { success: true }
      },
      {
        method: 'POST',
        path: '/bitrix-get-lead',
        description: 'Buscar lead no Bitrix por ID',
        auth: ['api_key', 'jwt'],
        body: { lead_id: 123 },
        response: { success: true, lead: {} }
      },
      {
        method: 'POST',
        path: '/sync-to-bitrix',
        description: 'Sincronizar lead para o Bitrix',
        auth: ['api_key', 'jwt'],
        body: { lead: { id: 123, name: 'Lead' } },
        response: { success: true }
      }
    ]
  },
  {
    name: 'Chatwoot',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Integração com Chatwoot',
    endpoints: [
      {
        method: 'POST',
        path: '/chatwoot-auth',
        description: 'Autenticar agente no Chatwoot',
        auth: ['jwt'],
        body: { email: 'agente@email.com' },
        response: { success: true, agent: { id: 1 } }
      },
      {
        method: 'POST',
        path: '/chatwoot-messages',
        description: 'Enviar mensagem via Chatwoot',
        auth: ['api_key', 'jwt'],
        body: { conversation_id: 1, message: 'Olá!' },
        response: { success: true }
      }
    ]
  },
  {
    name: 'Diagnósticos',
    icon: <RefreshCw className="w-4 h-4" />,
    description: 'Monitoramento e diagnósticos',
    endpoints: [
      {
        method: 'GET',
        path: '/metrics',
        description: 'Métricas do sistema',
        auth: ['api_key', 'jwt'],
        response: { uptime: 99.9, requests: 10000 }
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Health check do sistema',
        auth: [],
        response: { status: 'healthy' }
      }
    ]
  }
];

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-foreground">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

function EndpointCard({ endpoint, baseUrl }: { endpoint: ApiEndpoint; baseUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const curlExample = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" \\
  -H "Content-Type: application/json" \\
  ${endpoint.auth.includes('api_key') ? '-H "X-API-Key: tmx_live_xxxxx..." \\' : ''}
  ${endpoint.auth.includes('jwt') ? '-H "Authorization: Bearer eyJhbG..." \\' : ''}
  ${endpoint.body ? `-d '${JSON.stringify(endpoint.body, null, 2)}'` : ''}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={methodColors[endpoint.method]}>
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono">{endpoint.path}</code>
              </div>
              <div className="flex items-center gap-2">
                {endpoint.auth.map((auth) => (
                  <Badge key={auth} variant="secondary" className="text-xs">
                    {auth === 'api_key' ? 'API Key' : auth === 'jwt' ? 'JWT' : 'Access Key'}
                  </Badge>
                ))}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <CardDescription className="mt-2 text-left">{endpoint.description}</CardDescription>
          </CardHeader>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-4 p-4 border rounded-lg bg-muted/20">
          <div>
            <h4 className="font-medium mb-2 text-sm">cURL Example</h4>
            <CodeBlock code={curlExample} />
          </div>
          
          {endpoint.body && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Request Body</h4>
              <CodeBlock code={JSON.stringify(endpoint.body, null, 2)} language="json" />
            </div>
          )}
          
          {endpoint.response && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Response Example</h4>
              <CodeBlock code={JSON.stringify(endpoint.response, null, 2)} language="json" />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocumentation() {
  const navigate = useNavigate();
  const baseUrl = 'https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1';

  return (
    <AdminPageLayout
      title="Documentação da API"
      description="Referência completa da API REST do TabuladorMax"
    >
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate('/admin/api-keys')} className="gap-2">
          <Key className="w-4 h-4" />
          Gerenciar API Keys
        </Button>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="auth">Autenticação</TabsTrigger>
          <TabsTrigger value="sdks">SDKs & Exemplos</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-6">
          {apiCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {category.icon}
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.endpoints.map((endpoint, idx) => (
                  <EndpointCard 
                    key={`${endpoint.method}-${endpoint.path}-${idx}`} 
                    endpoint={endpoint} 
                    baseUrl={baseUrl}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key (Recomendado)
              </CardTitle>
              <CardDescription>
                Método mais seguro para integrações externas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione o header <code className="bg-muted px-1 rounded">X-API-Key</code> com sua chave de API.
              </p>
              <CodeBlock code={`curl -X POST "${baseUrl}/scouter-app-api" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tmx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{"action": "get_stats"}'`} />
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-1">Importante</h4>
                <p className="text-sm text-muted-foreground">
                  A chave de API só é exibida uma vez no momento da criação. Guarde-a em local seguro.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                JWT Bearer Token
              </CardTitle>
              <CardDescription>
                Para usuários autenticados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use o token JWT obtido após login no sistema.
              </p>
              <CodeBlock code={`curl -X POST "${baseUrl}/flows-api" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -d '{"name": "Novo Fluxo"}'`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Access Key (Legacy)
              </CardTitle>
              <CardDescription>
                Apenas para o app Scouter - depreciado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Envie a chave de acesso no corpo da requisição. Este método será descontinuado.
              </p>
              <CodeBlock code={`curl -X POST "${baseUrl}/scouter-app-api" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "login", "access_key": "SCTR123456"}'`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>JavaScript / TypeScript</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`// Instalação
npm install axios

// Uso
import axios from 'axios';

const api = axios.create({
  baseURL: '${baseUrl}',
  headers: {
    'X-API-Key': 'tmx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  }
});

// Exemplo: Buscar estatísticas
const response = await api.post('/scouter-app-api', {
  action: 'get_stats'
});

console.log(response.data);`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Python</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`# Instalação
pip install requests

# Uso
import requests

API_KEY = 'tmx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
BASE_URL = '${baseUrl}'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Exemplo: Buscar estatísticas
response = requests.post(
    f'{BASE_URL}/scouter-app-api',
    headers=headers,
    json={'action': 'get_stats'}
)

print(response.json())`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">API Key</h4>
                  <p className="text-2xl font-bold text-primary">60 req/min</p>
                  <p className="text-xs text-muted-foreground">Customizável por chave</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">JWT Token</h4>
                  <p className="text-2xl font-bold text-primary">120 req/min</p>
                  <p className="text-xs text-muted-foreground">Por usuário autenticado</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">Access Key</h4>
                  <p className="text-2xl font-bold text-primary">30 req/min</p>
                  <p className="text-xs text-muted-foreground">Legacy - será removido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
