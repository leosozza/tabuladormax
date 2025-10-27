# Recomendações de Segurança - Integração Bitrix24

## ⚠️ Aviso Importante

Este documento descreve as melhores práticas de segurança para a integração com o Bitrix24.

## Credenciais de API

### Situação Atual
O código atualmente utiliza credenciais hardcoded no arquivo `src/lib/bitrix.ts`:
```typescript
`https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/...`
```

### ⚠️ Risco
- **Severidade**: Alta
- **Impacto**: Exposição de credenciais sensíveis no código fonte
- **Probabilidade**: Alta (código em repositório público)

### ✅ Solução Recomendada

#### 1. Mover para Variáveis de Ambiente

**Criar arquivo `.env.local`:**
```env
VITE_BITRIX_BASE_URL=https://maxsystem.bitrix24.com.br
VITE_BITRIX_USER_ID=7
VITE_BITRIX_WEBHOOK_TOKEN=338m945lx9ifjjnr
```

**Adicionar ao `.gitignore`:**
```
.env.local
.env.*.local
```

**Atualizar `src/lib/bitrix.ts`:**
```typescript
const BITRIX_BASE_URL = import.meta.env.VITE_BITRIX_BASE_URL;
const BITRIX_USER_ID = import.meta.env.VITE_BITRIX_USER_ID;
const BITRIX_WEBHOOK_TOKEN = import.meta.env.VITE_BITRIX_WEBHOOK_TOKEN;

const getBitrixUrl = (endpoint: string) => {
  return `${BITRIX_BASE_URL}/rest/${BITRIX_USER_ID}/${BITRIX_WEBHOOK_TOKEN}/${endpoint}`;
};

// Uso
const response = await fetch(getBitrixUrl('crm.product.list.json'));
```

#### 2. Configuração no Backend (Recomendado)

Para maior segurança, considere criar um backend que:
- Armazene as credenciais de forma segura
- Faça as chamadas ao Bitrix24
- Exponha endpoints internos para o frontend

**Exemplo de arquitetura:**
```
Frontend → Backend (Node.js/Deno) → Bitrix24 API
          ↓
      Variáveis de Ambiente
      (não expostas ao cliente)
```

#### 3. Rotação de Credenciais

- **Frequência**: Recomendado rotacionar a cada 90 dias
- **Processo**:
  1. Gerar novo webhook no Bitrix24
  2. Atualizar variáveis de ambiente
  3. Testar em ambiente de staging
  4. Deploy para produção
  5. Revogar webhook antigo após 24h

## Checklist de Segurança

### Implementação Imediata (Crítico)
- [ ] Mover credenciais para variáveis de ambiente
- [ ] Adicionar `.env.local` ao `.gitignore`
- [ ] Remover credenciais hardcoded do código
- [ ] Revisar histórico do Git para exposição de credenciais

### Curto Prazo (Alta Prioridade)
- [ ] Implementar backend proxy para chamadas Bitrix24
- [ ] Adicionar rate limiting nas chamadas à API
- [ ] Implementar logs de auditoria para acessos
- [ ] Configurar alertas para falhas de autenticação

### Médio Prazo (Prioridade Média)
- [ ] Implementar OAuth2 em vez de webhook
- [ ] Configurar IP whitelist no Bitrix24
- [ ] Adicionar monitoramento de uso da API
- [ ] Criar processo de rotação automática de credenciais

### Longo Prazo (Boas Práticas)
- [ ] Implementar criptografia de dados em trânsito
- [ ] Adicionar assinatura de requisições
- [ ] Configurar WAF (Web Application Firewall)
- [ ] Realizar pentest periódicos

## Configuração Recomendada para Produção

### 1. Variáveis de Ambiente
```bash
# .env.production
VITE_BITRIX_BASE_URL=https://yourinstance.bitrix24.com.br
VITE_BITRIX_USER_ID=${BITRIX_USER_ID}
VITE_BITRIX_WEBHOOK_TOKEN=${BITRIX_WEBHOOK_TOKEN}
```

### 2. CI/CD
Configure secrets no GitHub Actions / GitLab CI:
```yaml
env:
  VITE_BITRIX_BASE_URL: ${{ secrets.BITRIX_BASE_URL }}
  VITE_BITRIX_USER_ID: ${{ secrets.BITRIX_USER_ID }}
  VITE_BITRIX_WEBHOOK_TOKEN: ${{ secrets.BITRIX_WEBHOOK_TOKEN }}
```

### 3. Validação de Ambiente
```typescript
// src/config/bitrix.ts
export const bitrixConfig = {
  baseUrl: import.meta.env.VITE_BITRIX_BASE_URL,
  userId: import.meta.env.VITE_BITRIX_USER_ID,
  webhookToken: import.meta.env.VITE_BITRIX_WEBHOOK_TOKEN,
};

// Validar configuração no início da aplicação
if (!bitrixConfig.baseUrl || !bitrixConfig.userId || !bitrixConfig.webhookToken) {
  throw new Error('Bitrix24 configuration is missing. Please check environment variables.');
}
```

## Monitoramento e Alertas

### Métricas para Monitorar
- Taxa de erro nas chamadas à API
- Tempo de resposta do Bitrix24
- Tentativas de autenticação falhadas
- Volume de requisições por minuto

### Alertas Recomendados
- Taxa de erro > 5%
- Tempo de resposta > 5 segundos
- Mais de 10 falhas de autenticação em 1 minuto
- Picos incomuns de requisições

## Resposta a Incidentes

### Se Credenciais Forem Comprometidas

1. **Ação Imediata** (0-15 minutos)
   - Revogar webhook comprometido no Bitrix24
   - Gerar novo webhook
   - Atualizar variáveis de ambiente em produção

2. **Ações de Curto Prazo** (15 minutos - 1 hora)
   - Revisar logs de acesso suspeito
   - Notificar time de segurança
   - Avaliar impacto (dados acessados, modificados)

3. **Ações de Médio Prazo** (1-24 horas)
   - Investigar como credenciais foram expostas
   - Implementar melhorias de segurança
   - Documentar incidente e lições aprendidas

4. **Ações de Longo Prazo** (24+ horas)
   - Revisar todas as práticas de segurança
   - Implementar melhorias no processo
   - Treinar equipe em melhores práticas

## Recursos Adicionais

- [Bitrix24 API Security Best Practices](https://dev.bitrix24.com/rest_help/general/security.php)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## Contato

Para reportar problemas de segurança, entre em contato com o time de segurança através do canal apropriado (nunca por issues públicas).
