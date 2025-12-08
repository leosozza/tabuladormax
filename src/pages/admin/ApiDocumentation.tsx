import { useState } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  RefreshCw,
  Info
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
  notes?: string;
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
    description: 'API para o Portal e Aplicativo Scouter (não requer API Key)',
    endpoints: [
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Login com chave de acesso do scouter',
        auth: [],
        body: { 
          action: 'login', 
          access_key: '722797' 
        },
        response: { 
          success: true, 
          data: { 
            scouter_id: '8ef9d4b8-51b5-45b7-af80-4592b7cff9ff', 
            bitrix_id: 1356,
            scouter_name: 'Ramon Mello',
            scouter_photo: 'https://...'
          } 
        },
        notes: 'Retorna bitrix_id para usar nas demais ações'
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Obter estatísticas do scouter (fichas, confirmados, etc)',
        auth: [],
        body: { 
          action: 'get_stats', 
          bitrix_id: 1356,
          params: {
            date_preset: 'month'
          }
        },
        response: { 
          success: true, 
          data: { 
            total: 150, 
            confirmados: 120, 
            compareceram: 80,
            pendentes: 30,
            com_foto: 140,
            agendados: 50,
            reagendar: 10
          } 
        },
        notes: 'date_preset: today | yesterday | week | month'
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Obter posição do scouter no ranking',
        auth: [],
        body: { 
          action: 'get_ranking', 
          bitrix_id: 1356,
          params: {
            date_preset: 'month'
          }
        },
        response: { 
          success: true, 
          data: { 
            rank_position: 3,
            total_scouters: 25,
            scouter_fichas: 45,
            first_place_name: 'Maria Santos',
            first_place_fichas: 62
          } 
        }
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Listar projetos vinculados ao scouter',
        auth: [],
        body: { 
          action: 'get_projects', 
          bitrix_id: 1356
        },
        response: { 
          success: true, 
          data: [
            { id: 'uuid', name: 'Projeto Alpha', code: 'ALPHA', active: true }
          ] 
        }
      },
      {
        method: 'POST',
        path: '/scouter-app-api',
        description: 'Listar leads/fichas do scouter',
        auth: [],
        body: { 
          action: 'get_leads', 
          bitrix_id: 1356,
          params: {
            date_preset: 'week',
            project_id: 'uuid-do-projeto'
          }
        },
        response: { 
          success: true, 
          data: [
            { 
              id: 123, 
              name: 'Lead 1', 
              ficha_confirmada: true, 
              compareceu: false,
              data_agendamento: '2025-12-08',
              horario_agendamento: '10:00'
            }
          ] 
        }
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

const scouterApiParams = [
  { param: 'action', type: 'string', required: true, description: 'Ação a executar: login, get_stats, get_ranking, get_projects, get_leads' },
  { param: 'access_key', type: 'string', required: false, description: 'Chave de acesso do scouter (apenas para login)' },
  { param: 'bitrix_id', type: 'number', required: false, description: 'ID do Bitrix do scouter (obrigatório para todas ações exceto login)' },
  { param: 'params.date_preset', type: 'string', required: false, description: 'Período: today, yesterday, week, month' },
  { param: 'params.project_id', type: 'string', required: false, description: 'UUID do projeto para filtrar resultados' },
  { param: 'params.start_date', type: 'string', required: false, description: 'Data inicial customizada (ISO 8601: 2025-12-01)' },
  { param: 'params.end_date', type: 'string', required: false, description: 'Data final customizada (ISO 8601: 2025-12-08)' },
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
        <code className="text-foreground whitespace-pre-wrap">{code}</code>
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

  const generateCurl = () => {
    const lines = [`curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" \\`];
    lines.push('  -H "Content-Type: application/json" \\');
    
    if (endpoint.auth.includes('api_key')) {
      lines.push('  -H "X-API-Key: tmx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\');
    }
    if (endpoint.auth.includes('jwt')) {
      lines.push('  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \\');
    }
    
    if (endpoint.body) {
      const bodyStr = JSON.stringify(endpoint.body, null, 2)
        .split('\n')
        .map((line, i) => i === 0 ? line : '  ' + line)
        .join('\n');
      lines.push(`  -d '${bodyStr}'`);
    } else {
      // Remove trailing backslash from last line
      lines[lines.length - 1] = lines[lines.length - 1].replace(' \\', '');
    }
    
    return lines.join('\n');
  };

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
          {endpoint.notes && (
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{endpoint.notes}</p>
            </div>
          )}
          
          <div>
            <h4 className="font-medium mb-2 text-sm">cURL Example</h4>
            <CodeBlock code={generateCurl()} />
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
          <TabsTrigger value="scouter-params">Parâmetros Scouter</TabsTrigger>
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

        <TabsContent value="scouter-params" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Parâmetros da API Scouter
              </CardTitle>
              <CardDescription>
                Referência completa dos parâmetros aceitos pela API do Portal Scouter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parâmetro</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scouterApiParams.map((param) => (
                    <TableRow key={param.param}>
                      <TableCell className="font-mono text-sm">{param.param}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{param.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={param.required ? 'default' : 'secondary'}>
                          {param.required ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{param.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Uso Típico</CardTitle>
              <CardDescription>
                Como usar a API Scouter corretamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">1</Badge>
                  <span className="font-medium">Login com access_key</span>
                </div>
                <CodeBlock code={`curl -X POST "${baseUrl}/scouter-app-api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "login",
    "access_key": "722797"
  }'

# Resposta:
# { "success": true, "data": { "bitrix_id": 1356, "scouter_name": "Ramon Mello" } }`} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">2</Badge>
                  <span className="font-medium">Usar bitrix_id nas demais chamadas</span>
                </div>
                <CodeBlock code={`curl -X POST "${baseUrl}/scouter-app-api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "get_stats",
    "bitrix_id": 1356,
    "params": {
      "date_preset": "month"
    }
  }'`} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">3</Badge>
                  <span className="font-medium">Filtrar por projeto (opcional)</span>
                </div>
                <CodeBlock code={`curl -X POST "${baseUrl}/scouter-app-api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "get_leads",
    "bitrix_id": 1356,
    "params": {
      "date_preset": "week",
      "project_id": "uuid-do-projeto"
    }
  }'`} />
              </div>
            </CardContent>
          </Card>
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
  -d '{
    "action": "get_stats",
    "bitrix_id": 12345,
    "params": {
      "date_preset": "month"
    }
  }'`} />
              
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
                Access Key (Apenas Login)
              </CardTitle>
              <CardDescription>
                Usado exclusivamente para autenticação inicial do scouter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A chave de acesso é enviada no corpo da requisição apenas na ação de login.
                Após o login, use o <code className="bg-muted px-1 rounded">bitrix_id</code> retornado.
              </p>
              <CodeBlock code={`curl -X POST "${baseUrl}/scouter-app-api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "login",
    "access_key": "SCTR123456"
  }'

# Resposta:
{
  "success": true,
  "data": {
    "scouter_id": "uuid-do-scouter",
    "bitrix_id": 12345,
    "scouter_name": "João Silva",
    "scouter_photo": "https://..."
  }
}`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>JavaScript / TypeScript</CardTitle>
              <CardDescription>Exemplo completo com fluxo de login e consulta</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`// Instalação
npm install axios

// Uso
import axios from 'axios';

const BASE_URL = '${baseUrl}';

// 1. Login com Access Key
async function loginScouter(accessKey: string) {
  const response = await axios.post(\`\${BASE_URL}/scouter-app-api\`, {
    action: 'login',
    access_key: accessKey
  });
  
  if (response.data.success) {
    const { bitrix_id, scouter_name } = response.data.data;
    console.log(\`Logado como \${scouter_name} (Bitrix ID: \${bitrix_id})\`);
    return bitrix_id;
  }
  throw new Error(response.data.error);
}

// 2. Buscar estatísticas
async function getStats(bitrixId: number, datePreset = 'month') {
  const response = await axios.post(\`\${BASE_URL}/scouter-app-api\`, {
    action: 'get_stats',
    bitrix_id: bitrixId,
    params: { date_preset: datePreset }
  });
  
  return response.data.data;
}

// 3. Listar leads do dia
async function getLeadsToday(bitrixId: number, projectId?: string) {
  const response = await axios.post(\`\${BASE_URL}/scouter-app-api\`, {
    action: 'get_leads',
    bitrix_id: bitrixId,
    params: { 
      date_preset: 'today',
      ...(projectId && { project_id: projectId })
    }
  });
  
  return response.data.data;
}

// Exemplo de uso
const bitrixId = await loginScouter('722797');
const stats = await getStats(bitrixId, 'month');
console.log('Estatísticas:', stats);

const leads = await getLeadsToday(bitrixId);
console.log('Leads de hoje:', leads);`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Python</CardTitle>
              <CardDescription>Exemplo completo com fluxo de login e consulta</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`# Instalação
pip install requests

# Uso
import requests

BASE_URL = '${baseUrl}'

def login_scouter(access_key: str) -> int:
    """Login com access_key, retorna bitrix_id"""
    response = requests.post(
        f'{BASE_URL}/scouter-app-api',
        json={
            'action': 'login',
            'access_key': access_key
        }
    )
    data = response.json()
    
    if data['success']:
        bitrix_id = data['data']['bitrix_id']
        print(f"Logado como {data['data']['scouter_name']}")
        return bitrix_id
    raise Exception(data['error'])

def get_stats(bitrix_id: int, date_preset: str = 'month') -> dict:
    """Buscar estatísticas do scouter"""
    response = requests.post(
        f'{BASE_URL}/scouter-app-api',
        json={
            'action': 'get_stats',
            'bitrix_id': bitrix_id,
            'params': {'date_preset': date_preset}
        }
    )
    return response.json()['data']

def get_leads(bitrix_id: int, date_preset: str = 'today', project_id: str = None) -> list:
    """Listar leads do scouter"""
    params = {'date_preset': date_preset}
    if project_id:
        params['project_id'] = project_id
    
    response = requests.post(
        f'{BASE_URL}/scouter-app-api',
        json={
            'action': 'get_leads',
            'bitrix_id': bitrix_id,
            'params': params
        }
    )
    return response.json()['data']

# Exemplo de uso
if __name__ == '__main__':
    bitrix_id = login_scouter('722797')
    
    stats = get_stats(bitrix_id, 'month')
    print(f"Total de fichas: {stats['total']}")
    print(f"Confirmadas: {stats['confirmados']}")
    
    leads = get_leads(bitrix_id, 'today')
    print(f"Leads de hoje: {len(leads)}")`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Janela</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>API Key</TableCell>
                    <TableCell>60 requisições</TableCell>
                    <TableCell>1 minuto</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>JWT</TableCell>
                    <TableCell>120 requisições</TableCell>
                    <TableCell>1 minuto</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Access Key (login)</TableCell>
                    <TableCell>10 requisições</TableCell>
                    <TableCell>1 minuto</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Headers de Rate Limit</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  As respostas incluem headers com informações sobre o limite:
                </p>
                <CodeBlock code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1702070400`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
