# 🚀 Quick Start - Troubleshooting Data Issues

## ⚡ Quick Checks (3 minutos)

### 1. Ver Logs no Console
```
F12 → Console → Procurar por ❌ ou ⚠️
```

### 2. Verificar .env
```bash
cat .env | grep SUPABASE
# Deve mostrar URL e KEY
```

### 3. Testar Supabase
Abra o navegador console (F12) e cole:
```javascript
fetch('https://ngestyxtopvfeyenyvgt.supabase.co/rest/v1/').then(r => console.log('OK'))
```

## 🔥 Problemas Comuns

| Erro | Causa | Solução Rápida |
|------|-------|----------------|
| `ERR_BLOCKED_BY_CLIENT` | Ad blocker | Desabilite para localhost e *.supabase.co |
| `Failed to fetch` | Rede/CORS | Teste em modo anônimo |
| `0 fichas encontradas` | Sem dados | Execute SQL de inserção de teste |
| `Invalid API key` | Chave errada | Verifique .env e reinicie servidor |

## 🩺 Diagnóstico Completo

Ver: [SUPABASE_CONNECTION_GUIDE.md](./SUPABASE_CONNECTION_GUIDE.md)

## 💉 Inserir Dados de Teste

```sql
-- Cole no Supabase SQL Editor
INSERT INTO fichas (nome, scouter, projeto, etapa, criado) VALUES
  ('João Silva', 'Maria Santos', 'Projeto Alpha', 'Contato', NOW()),
  ('Ana Costa', 'Pedro Lima', 'Projeto Beta', 'Agendado', NOW() - INTERVAL '1 day'),
  ('Carlos Souza', 'Maria Santos', 'Projeto Alpha', 'Convertido', NOW() - INTERVAL '2 days');

SELECT COUNT(*) FROM fichas; -- Deve retornar 3 ou mais
```

## 📊 Verificar Status

### Via Interface
1. Abra http://localhost:8080
2. Vá para Dashboard
3. Veja se há mensagem de erro vermelha
4. Clique em "Tentar Novamente"

### Via Logs
```bash
# Terminal com npm run dev deve mostrar:
✅ [Supabase] Conexão estabelecida com sucesso
```

## 🎯 Próximos Passos

- [ ] Ver logs detalhados no console (F12)
- [ ] Verificar se tabela `fichas` tem dados
- [ ] Conferir políticas RLS no Supabase
- [ ] Testar em modo anônimo (sem extensões)
- [ ] Ler guia completo: SUPABASE_CONNECTION_GUIDE.md

## 📞 Precisa de Ajuda?

Abra uma issue com:
- Screenshot do erro no console
- Saída de `node scripts/test-connection.js`
- Resultado de `SELECT COUNT(*) FROM fichas;` no Supabase
