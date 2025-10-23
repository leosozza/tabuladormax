# Checklist de Testes - PR: Correções de Configurações, Sincronização e Tinder

Este documento contém o checklist completo para validar todas as funcionalidades implementadas neste PR.

## 📋 Pré-requisitos

- [ ] Migrations aplicadas no banco de dados Supabase
- [ ] Edge Functions deployadas (`tabmax-sync`, `csv-import-leads`)
- [ ] Variáveis de ambiente configuradas para Edge Functions
- [ ] Aplicação rodando localmente (`npm run dev`)

---

## 1️⃣ Configurações de Usuários e Permissões

### 1.1 Gestão de Usuários

**Testes de Listagem:**
- [ ] Acessar página Configurações → Usuários
- [ ] Verificar se a lista de usuários é carregada
- [ ] Confirmar que todos os campos são exibidos (Nome, Email, Função, Scouter ID)
- [ ] Verificar se as funções (roles) são exibidas corretamente (Admin, Supervisor, Scouter)

**Testes de Criação:**
- [ ] Clicar em "Convidar Usuário"
- [ ] Preencher todos os campos obrigatórios:
  - Nome: "Teste Usuario"
  - Email: "teste@exemplo.com"
  - Senha: "senha123"
  - Função: "Scouter"
  - Scouter ID: 123 (opcional)
- [ ] Submeter o formulário
- [ ] Verificar se toast de sucesso aparece
- [ ] Confirmar que o novo usuário aparece na lista
- [ ] Verificar se email de confirmação foi enviado (checar logs do Supabase)

**Testes de Edição:**
- [ ] Clicar no botão de editar (ícone lápis) em um usuário
- [ ] Alterar a função de "Scouter" para "Supervisor"
- [ ] Alterar Scouter ID
- [ ] Submeter alterações
- [ ] Verificar toast de sucesso
- [ ] Confirmar que as alterações foram salvas (atualizar página)
- [ ] **SQL Validation:** 
  ```sql
  SELECT * FROM users WHERE email = 'teste@exemplo.com';
  -- Verificar se role_id e scouter_id foram atualizados
  ```

**Testes de Exclusão:**
- [ ] Clicar no botão de excluir (ícone lixeira)
- [ ] Confirmar exclusão no dialog
- [ ] Verificar toast de sucesso
- [ ] Confirmar que usuário foi removido da lista
- [ ] **SQL Validation:**
  ```sql
  SELECT * FROM users WHERE email = 'teste@exemplo.com';
  -- Deve retornar 0 resultados
  ```

**Testes de RPC:**
- [ ] Abrir DevTools → Console
- [ ] Executar no console do navegador:
  ```javascript
  supabase.rpc('list_users_admin').then(console.log)
  ```
- [ ] Verificar se retorna lista de usuários com role_name
- [ ] Verificar se apenas admins conseguem acessar (testar com usuário não-admin)

---

### 1.2 Matriz de Permissões

**Testes de Visualização:**
- [ ] Acessar página Configurações → Permissões
- [ ] Verificar se as abas de funções aparecem (Admin, Supervisor, Scouter)
- [ ] Clicar em cada aba e verificar matriz de permissões
- [ ] Confirmar que as permissões pré-configuradas estão corretas:
  - **Admin:** Todas as permissões marcadas
  - **Supervisor:** Maioria marcada (exceto configurações)
  - **Scouter:** Apenas leitura e criação de fichas/leads

**Testes de Edição:**
- [ ] Selecionar aba "Supervisor"
- [ ] Desmarcar permissão "Leads → Excluir"
- [ ] Verificar toast de sucesso
- [ ] Recarregar página
- [ ] Confirmar que alteração foi mantida
- [ ] **SQL Validation:**
  ```sql
  SELECT * FROM permissions 
  WHERE role_id = (SELECT id FROM roles WHERE name = 'supervisor')
    AND module = 'leads' 
    AND action = 'delete';
  -- allowed deve ser false
  ```

**Testes de RPC:**
- [ ] Executar no console:
  ```javascript
  supabase.rpc('list_permissions').then(console.log)
  ```
- [ ] Verificar se retorna todas as permissões com role_name
- [ ] Executar:
  ```javascript
  supabase.rpc('set_permission', {
    target_module: 'leads',
    target_action: 'export',
    target_role_id: 1, // ID do role scouter
    is_allowed: true
  }).then(console.log)
  ```
- [ ] Verificar se permissão foi atualizada
- [ ] Testar com usuário não-admin (deve falhar com exceção)

---

## 2️⃣ Sincronização com TabuladorMax

### 2.1 Configuração

**Setup Inicial:**
- [ ] Verificar se tabela `tabulador_config` existe:
  ```sql
  SELECT * FROM tabulador_config;
  ```
- [ ] Criar configuração de teste se não existir:
  ```sql
  INSERT INTO tabulador_config (project_id, url, publishable_key, enabled)
  VALUES ('test-project', 'https://tabmax.supabase.co', 'your-key', true);
  ```

**Testes de Views Públicas:**
- [ ] Verificar se views foram criadas:
  ```sql
  SELECT * FROM fichas_sync LIMIT 10;
  SELECT * FROM leads_sync LIMIT 10;
  SELECT * FROM tabulador_config_sync LIMIT 1;
  ```
- [ ] Verificar se `get_table_columns` funciona:
  ```sql
  SELECT * FROM get_table_columns('fichas');
  ```

---

### 2.2 Sincronização

**Testes da Edge Function:**
- [ ] Acessar página Configurações → Integrações → Sincronização
- [ ] Clicar em "Sincronizar Agora" ou similar
- [ ] Verificar loading state durante sincronização
- [ ] Aguardar conclusão
- [ ] Verificar toast de sucesso com estatísticas
- [ ] **Logs Validation:**
  ```sql
  SELECT * FROM sync_logs 
  WHERE endpoint = 'tabmax-sync' 
  ORDER BY created_at DESC 
  LIMIT 1;
  -- Verificar status, records_count e response_data
  ```

**Teste Manual da Edge Function:**
- [ ] Executar via curl ou Postman:
  ```bash
  curl -X POST \
    https://your-project.supabase.co/functions/v1/tabmax-sync \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json"
  ```
- [ ] Verificar response JSON com stats
- [ ] Verificar logs da função:
  ```bash
  supabase functions logs tabmax-sync --tail
  ```

**Testes de Dados:**
- [ ] Verificar se novos registros foram inseridos em `fichas`:
  ```sql
  SELECT COUNT(*) FROM fichas WHERE raw->>'sync_source' = 'tabulador_max';
  ```
- [ ] Verificar integridade dos dados sincronizados
- [ ] Confirmar que campo `updated_at` foi atualizado

**Testes de Paginação:**
- [ ] Modificar `pageSize` na Edge Function para 10 (teste)
- [ ] Re-deploy a função
- [ ] Executar sincronização
- [ ] Verificar nos logs se paginação ocorreu corretamente
- [ ] Restaurar `pageSize` para 1000

---

## 3️⃣ Migração Inicial e Importação de CSV

### 3.1 Importação de CSV

**Preparação de Arquivos de Teste:**
- [ ] Criar CSV UTF-8 com BOM:
  ```csv
  nome,idade,scouter,projeto,telefone,email
  João Silva,25,Scouter1,Projeto A,11999999999,joao@test.com
  Maria Santos,30,Scouter2,Projeto B,11888888888,maria@test.com
  ```
- [ ] Criar CSV com separador ponto-e-vírgula (`;`)
- [ ] Criar CSV com encoding ISO-8859-1 (Latin-1)
- [ ] Criar XLSX com os mesmos dados

**Testes de Upload:**
- [ ] Acessar Configurações → Integrações → Importação CSV
- [ ] Fazer upload do CSV UTF-8 com BOM
- [ ] Verificar detecção automática de separador
- [ ] Verificar normalização de cabeçalhos
- [ ] Confirmar importação bem-sucedida
- [ ] Verificar estatísticas (total, inserted, failed)

**Testes de Encoding:**
- [ ] Fazer upload do CSV ISO-8859-1
- [ ] Verificar se acentos são preservados corretamente
- [ ] Confirmar que BOM foi removido se presente

**Testes de Separadores:**
- [ ] Upload CSV com separador `;`
- [ ] Verificar detecção automática
- [ ] Confirmar parse correto
- [ ] Upload CSV com separador `\t` (tab)
- [ ] Verificar funcionamento

**Testes de Validação:**
- [ ] Upload CSV sem coluna "nome" (deve falhar parcialmente)
- [ ] Upload CSV com linhas vazias (devem ser ignoradas)
- [ ] Upload CSV com valores inválidos em campos numéricos
- [ ] Verificar que erros são reportados no response

**Testes de Edge Function Direta:**
- [ ] Usar curl para testar:
  ```bash
  curl -X POST \
    https://your-project.supabase.co/functions/v1/csv-import-leads \
    -H "Authorization: Bearer YOUR_KEY" \
    -F "file=@test.csv" \
    -F "table=fichas"
  ```
- [ ] Verificar response com stats detalhadas

**Validação de Dados:**
- [ ] Consultar registros importados:
  ```sql
  SELECT * FROM fichas 
  WHERE raw->>'nome' IN ('João Silva', 'Maria Santos');
  ```
- [ ] Verificar se todos os campos foram mapeados corretamente
- [ ] Verificar `raw` JSONB contém dados originais

---

### 3.2 Importação de Excel (XLSX)

**Testes:**
- [ ] Upload arquivo XLSX
- [ ] Verificar se processa localmente (não usa Edge Function)
- [ ] Confirmar importação bem-sucedida
- [ ] Validar dados importados

---

## 4️⃣ Tinder de Leads

### 4.1 Verificação de Schema

**SQL Validation:**
- [ ] Verificar se colunas foram adicionadas:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'fichas' 
    AND column_name IN ('match_analisado_por', 'match_analisado_em');
  ```
- [ ] Repetir para tabela `leads`

---

### 4.2 Análise Tinder

**Preparação:**
- [ ] Garantir que existem leads com `aprovado = NULL`:
  ```sql
  UPDATE fichas SET aprovado = NULL WHERE id IN (
    SELECT id FROM fichas LIMIT 10
  );
  ```

**Testes de Carregamento:**
- [ ] Acessar página de Leads
- [ ] Buscar botão/modal para "Análise Tinder" ou similar
- [ ] Abrir modal de análise
- [ ] Verificar se leads não analisados são carregados
- [ ] Confirmar que contador mostra "X de Y"

**Testes de Swipe (Deslize):**
- [ ] **Aprovar (swipe right):**
  - [ ] Deslizar lead para direita
  - [ ] Verificar animação de aprovação (ícone coração verde)
  - [ ] Confirmar toast "Lead aprovado!"
  - [ ] Verificar que próximo lead aparece
- [ ] **Rejeitar (swipe left):**
  - [ ] Deslizar lead para esquerda
  - [ ] Verificar animação de rejeição (X vermelho)
  - [ ] Confirmar toast "Lead rejeitado"
  - [ ] Verificar que próximo lead aparece

**Testes de Botões:**
- [ ] Clicar no botão de rejeitar (X vermelho)
- [ ] Verificar se funciona igual ao swipe left
- [ ] Clicar no botão de aprovar (coração verde)
- [ ] Verificar se funciona igual ao swipe right

**Testes de Rastreamento:**
- [ ] Aprovar um lead
- [ ] **SQL Validation:**
  ```sql
  SELECT 
    id,
    aprovado,
    match_analisado_por,
    match_analisado_em
  FROM fichas 
  WHERE id = 'ID_DO_LEAD_TESTADO';
  ```
- [ ] Verificar que:
  - `aprovado = true`
  - `match_analisado_por` = UUID do usuário atual
  - `match_analisado_em` = timestamp recente

**Testes de RPC:**
- [ ] Executar no console:
  ```javascript
  supabase.rpc('get_pending_tinder_leads', {
    limit_count: 10,
    table_name: 'fichas'
  }).then(console.log)
  ```
- [ ] Verificar se retorna apenas leads com `aprovado = NULL`
- [ ] Executar:
  ```javascript
  supabase.rpc('set_lead_match', {
    lead_id: 'ID_DO_LEAD',
    is_approved: true,
    table_name: 'fichas'
  }).then(console.log)
  ```
- [ ] Verificar se lead foi atualizado

**Teste de Conclusão:**
- [ ] Analisar todos os leads restantes
- [ ] Verificar toast "Análise concluída!" ao finalizar
- [ ] Confirmar que modal fecha automaticamente
- [ ] Verificar que callback `onComplete` foi executado (se houver)

---

## 5️⃣ Testes de Integração

### 5.1 Fluxo Completo: CSV → Tinder → Aprovação

- [ ] Importar CSV com 5 novos leads
- [ ] Abrir Tinder de Leads
- [ ] Aprovar 3 leads
- [ ] Rejeitar 2 leads
- [ ] Verificar no banco:
  ```sql
  SELECT 
    COUNT(*) FILTER (WHERE aprovado = true) as aprovados,
    COUNT(*) FILTER (WHERE aprovado = false) as rejeitados,
    COUNT(*) FILTER (WHERE aprovado IS NULL) as pendentes
  FROM fichas 
  WHERE id IN ('IDs dos leads importados');
  ```
- [ ] Confirmar: 3 aprovados, 2 rejeitados, 0 pendentes

---

### 5.2 Fluxo Completo: Sync → Permissions → Users

- [ ] Sincronizar dados do TabuladorMax
- [ ] Criar novo usuário "Supervisor"
- [ ] Configurar permissões para Supervisor poder visualizar leads sincronizados
- [ ] Fazer login com usuário Supervisor
- [ ] Verificar se consegue visualizar leads sincronizados
- [ ] Verificar se não consegue excluir leads (permissão não concedida)

---

## 6️⃣ Testes de Regressão

**Funcionalidades Existentes que NÃO devem quebrar:**
- [ ] Dashboard principal carrega sem erros
- [ ] Visualização de fichas funciona
- [ ] Criação manual de leads funciona
- [ ] Filtros de dados funcionam
- [ ] Exportação de relatórios funciona
- [ ] Mapas de leads funcionam
- [ ] Gráficos carregam corretamente

---

## 7️⃣ Testes de Performance

- [ ] Importar CSV com 10.000+ linhas
  - [ ] Tempo de importação < 2 minutos
  - [ ] Sem erros de timeout
  - [ ] Estatísticas corretas
- [ ] Sincronizar 5.000+ registros do TabuladorMax
  - [ ] Paginação funciona
  - [ ] Sem timeout
  - [ ] Todos os registros sincronizados

---

## 8️⃣ Testes de Segurança

**RLS (Row Level Security):**
- [ ] Usuário Scouter não consegue ver usuários de outros scouters
- [ ] Usuário não-admin não consegue acessar `list_users_admin`
- [ ] Usuário não-admin não consegue executar `set_permission`
- [ ] Edge Functions validam autenticação corretamente

**SQL Injection:**
- [ ] Tentar injetar SQL via campos do CSV
- [ ] Tentar injetar SQL via formulário de usuários
- [ ] Verificar que todas as queries usam prepared statements

---

## 9️⃣ Testes de Error Handling

**Cenários de Erro:**
- [ ] Upload de arquivo não-CSV/não-XLSX
- [ ] Upload de arquivo corrompido
- [ ] CSV com encoding inválido
- [ ] Sincronização sem configuração do TabuladorMax
- [ ] Sincronização com credenciais inválidas
- [ ] Criação de usuário com email duplicado
- [ ] Criação de permissão com role_id inválido
- [ ] Análise Tinder sem leads disponíveis

**Para cada cenário:**
- [ ] Verificar que erro é tratado gracefully
- [ ] Toast de erro é exibido com mensagem clara
- [ ] Aplicação não trava
- [ ] Estado é revertido/rollback quando necessário

---

## 🎯 Checklist Final

- [ ] Todos os testes acima passaram
- [ ] Não há regressões em funcionalidades existentes
- [ ] Performance está adequada
- [ ] Segurança foi validada
- [ ] Documentação está atualizada
- [ ] Logs estão funcionando corretamente
- [ ] Edge Functions deployadas em produção
- [ ] Migrations aplicadas em produção
- [ ] README atualizado com instruções de uso

---

## 📝 Notas

- Registrar aqui quaisquer problemas encontrados durante os testes
- Documentar workarounds ou ajustes necessários
- Anotar sugestões de melhorias futuras

---

**Data do Teste:** ___/___/______  
**Testado por:** ___________________  
**Ambiente:** [ ] Local [ ] Staging [ ] Production  
**Status Geral:** [ ] ✅ Aprovado [ ] ⚠️ Aprovado com ressalvas [ ] ❌ Reprovado
