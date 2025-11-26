# Plano: VPS Proxy com IP Fixo para Syscall

## 🎯 Objetivo
Criar um proxy intermediário com IP fixo para conectar o TabuladorMax (hospedado no Cloudflare) ao Syscall API, que exige IP fixo para acesso.

## 📋 Arquitetura

```
Frontend (Cloudflare)
    ↓
Supabase Edge Functions
    ↓
VPS Proxy (IP Fixo) ← Syscall libera este IP
    ↓
Syscall API (http://maxfama.syscall.com.br/crm)
```

## 🛠️ Requisitos

### VPS
- **Provedor**: DigitalOcean, Vultr, Contabo ou similar
- **Specs mínimas**: 1 vCPU, 1GB RAM, 25GB SSD
- **Sistema**: Ubuntu 22.04 LTS
- **Custo**: ~$5-10/mês
- **IP Fixo**: Incluído por padrão

### Software
- Node.js 20 LTS
- Nginx (opcional, para HTTPS)
- PM2 (gerenciador de processos)

## 📦 Implementação

### Passo 1: Configurar VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx (opcional)
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Passo 2: Criar Proxy Server

Criar arquivo `/home/ubuntu/syscall-proxy/server.js`:

```javascript
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Syscall
const SYSCALL_BASE_URL = 'http://maxfama.syscall.com.br/crm';
const SYSCALL_TOKEN = process.env.SYSCALL_TOKEN;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy genérico para Syscall
app.all('/api/syscall/*', async (req, res) => {
  try {
    const syscallPath = req.params[0];
    const syscallUrl = `${SYSCALL_BASE_URL}/${syscallPath}`;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${syscallUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SYSCALL_TOKEN}`,
      ...req.headers
    };
    
    // Remove headers que não devem ser enviados
    delete headers.host;
    delete headers['content-length'];
    
    const response = await axios({
      method: req.method,
      url: syscallUrl,
      data: req.body,
      params: req.query,
      headers,
      timeout: 30000,
      validateStatus: () => true // Aceita qualquer status
    });
    
    // Log da resposta
    console.log(`[${new Date().toISOString()}] Response: ${response.status}`);
    
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Syscall Proxy running on port ${PORT}`);
  console.log(`Target: ${SYSCALL_BASE_URL}`);
});
```

Criar arquivo `package.json`:

```json
{
  "name": "syscall-proxy",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "cors": "^2.8.5"
  }
}
```

### Passo 3: Configurar Variáveis de Ambiente

Criar arquivo `.env`:

```bash
PORT=3000
SYSCALL_TOKEN=seu_token_aqui
NODE_ENV=production
```

### Passo 4: Iniciar com PM2

```bash
# Instalar dependências
cd /home/ubuntu/syscall-proxy
npm install

# Iniciar com PM2
pm2 start server.js --name syscall-proxy
pm2 startup
pm2 save

# Ver logs
pm2 logs syscall-proxy
```

### Passo 5: Configurar Nginx (Opcional - para HTTPS)

Criar arquivo `/etc/nginx/sites-available/syscall-proxy`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/syscall-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configurar SSL (se tiver domínio)
sudo certbot --nginx -d seu-dominio.com
```

### Passo 6: Atualizar Supabase Edge Function

Modificar `supabase/functions/syscall-integration/index.ts`:

```typescript
// Trocar chamadas diretas para o Syscall por chamadas ao proxy
const PROXY_URL = Deno.env.get('SYSCALL_PROXY_URL') || 'http://IP_DO_VPS:3000';
const PROXY_SECRET = Deno.env.get('SYSCALL_PROXY_SECRET');

async function callSyscall(path: string, options: RequestInit = {}) {
  const url = `${PROXY_URL}/api/syscall/${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Proxy-Secret': PROXY_SECRET, // Para autenticar no proxy
      ...options.headers,
    },
  });
  
  return response.json();
}

// Exemplo de uso
const result = await callSyscall('revo/login', {
  method: 'POST',
  body: JSON.stringify({ agent_code: '123' }),
});
```

### Passo 7: Adicionar Secrets no Supabase

Usar o painel do Lovable Cloud para adicionar:
- `SYSCALL_PROXY_URL`: URL do proxy (ex: `http://123.45.67.89:3000` ou `https://seu-dominio.com`)
- `SYSCALL_PROXY_SECRET`: Chave secreta para autenticar no proxy

## 🔒 Segurança

### 1. Firewall no VPS

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Autenticação no Proxy

Adicionar middleware no `server.js`:

```javascript
// Middleware de autenticação
const authenticate = (req, res, next) => {
  const secret = req.headers['x-proxy-secret'];
  
  if (!secret || secret !== process.env.PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

app.use('/api/syscall', authenticate);
```

### 3. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: 'Too many requests'
});

app.use('/api/syscall', limiter);
```

## 📊 Monitoramento

### Logs do PM2
```bash
# Ver logs em tempo real
pm2 logs syscall-proxy

# Ver logs salvos
pm2 logs syscall-proxy --lines 100
```

### Status do serviço
```bash
pm2 status
pm2 monit
```

### Testes
```bash
# Testar health check
curl http://IP_DO_VPS:3000/health

# Testar proxy
curl -X POST http://IP_DO_VPS:3000/api/syscall/revo/login \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Secret: sua_secret_aqui" \
  -d '{"agent_code": "123"}'
```

## 💰 Custos Estimados

| Item | Custo Mensal |
|------|--------------|
| VPS (1GB RAM) | $5-10 |
| Domínio (opcional) | $1-2 |
| SSL (Let's Encrypt) | Grátis |
| **Total** | **$5-12/mês** |

## ✅ Checklist de Implementação

- [ ] Contratar VPS
- [ ] Anotar IP fixo do VPS
- [ ] Enviar IP para Syscall liberar
- [ ] Instalar Node.js e PM2 no VPS
- [ ] Fazer upload do código do proxy
- [ ] Configurar variáveis de ambiente
- [ ] Iniciar proxy com PM2
- [ ] Testar conexão VPS → Syscall
- [ ] Adicionar secrets no Supabase
- [ ] Atualizar edge function para usar proxy
- [ ] Testar fluxo completo
- [ ] Configurar Nginx + SSL (opcional)
- [ ] Configurar monitoramento

## 🚀 Próximos Passos

1. **Contratar VPS** e obter IP fixo
2. **Enviar IP para Syscall** para liberação
3. **Implementar proxy** seguindo os passos acima
4. **Atualizar edge functions** para usar o proxy
5. **Testar integração completa**

## 📝 Notas

- O proxy adiciona ~50-100ms de latência
- Mantenha logs por pelo menos 7 dias para debugging
- Configure backups automáticos do VPS
- Monitore uso de CPU/RAM do proxy
- Considere usar Docker para facilitar deploy futuro
