# Migrations de Permissões - README

Este diretório contém as migrations SQL para habilitar a UI de Permissões/Admin do Tabuladormax.

## Arquivos de Migration

Os seguintes arquivos foram criados para suportar o sistema de permissões:

1. **20251025133700_create_permissions.sql** - Cria a tabela `permissions` para gerenciar permissões baseadas em recursos
2. **20251025133701_create_role_permissions.sql** - Cria a tabela `role_permissions` para associar permissões a cargos com escopos
3. **20251025133702_create_app_routes.sql** - Cria a tabela `app_routes` para gerenciar rotas/páginas da aplicação
4. **20251025133703_create_route_permissions.sql** - Cria a tabela `route_permissions` para controle de acesso por página
5. **20251025133704_seed_permissions_and_routes.sql** - Insere dados de exemplo para testes iniciais
6. **20251025133705_add_permissions_rls.sql** - Adiciona políticas de Row Level Security (RLS) para todas as tabelas
7. **20251025133706_add_permission_helper_functions.sql** - Adiciona funções auxiliares para verificação de permissões

## Estrutura das Tabelas

### permissions
- `id` (UUID): Identificador único
- `resource` (TEXT): Nome do recurso (ex: 'admin.users')
- `action` (TEXT): Ação permitida (ex: 'view', 'manage')
- `label` (TEXT): Rótulo legível
- `description` (TEXT): Descrição da permissão

### role_permissions
- `id` (UUID): Identificador único
- `role` (TEXT): Cargo (agent, supervisor, manager, admin)
- `permission_id` (UUID): Referência à permissão
- `scope` (TEXT): Escopo da permissão (global, department, own)

### app_routes
- `id` (UUID): Identificador único
- `path` (TEXT): Caminho da rota (ex: '/admin/users')
- `title` (TEXT): Título da página
- `module` (TEXT): Módulo da aplicação
- `active` (BOOLEAN): Status da rota
- `sort_order` (INT): Ordem de exibição
- `icon` (TEXT): Ícone da rota

### route_permissions
- `id` (UUID): Identificador único
- `route_id` (UUID): Referência à rota
- `department` (TEXT): Departamento (opcional)
- `role` (TEXT): Cargo (opcional)
- `allowed` (BOOLEAN): Permissão concedida

## Funções Auxiliares

O sistema inclui duas funções SQL úteis para verificação de permissões:

### `user_has_permission(user_id, resource, action)`
Verifica se um usuário tem uma permissão específica baseada em seu cargo.

```sql
-- Exemplo de uso
SELECT user_has_permission(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  'admin.users',
  'manage'
);
```

### `user_can_access_route(user_id, route_path)`
Verifica se um usuário pode acessar uma rota específica baseado nas permissões de rota.

```sql
-- Exemplo de uso
SELECT user_can_access_route(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  '/admin/permissions'
);
```

**Nota**: Usuários com cargo 'admin' sempre têm acesso total.

## Como Aplicar as Migrations

### Opção 1: Supabase CLI (Recomendado)

```bash
# Na raiz do projeto
supabase db push
```

### Opção 2: SQL Editor no Supabase Dashboard

1. Acesse o Supabase Dashboard do seu projeto
2. Vá para SQL Editor
3. Cole o conteúdo de cada arquivo na ordem (20251025133700 → 20251025133706)
4. Execute cada script sequencialmente

### Opção 3: Executar todos de uma vez

```bash
# Concatenar e executar todos os arquivos
cat supabase/migrations/20251025133700_create_permissions.sql \
    supabase/migrations/20251025133701_create_role_permissions.sql \
    supabase/migrations/20251025133702_create_app_routes.sql \
    supabase/migrations/20251025133703_create_route_permissions.sql \
    supabase/migrations/20251025133704_seed_permissions_and_routes.sql \
    supabase/migrations/20251025133705_add_permissions_rls.sql \
    supabase/migrations/20251025133706_add_permission_helper_functions.sql \
    | supabase db execute -
```

## Recarregar Schema Cache

**IMPORTANTE**: Após aplicar as migrations, o PostgREST precisa atualizar seu cache para reconhecer as novas tabelas.

### Método 1: Via Edge Function

Se você tem a função `reload-schema-cache` configurada:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/reload-schema-cache \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

### Método 2: Via SQL

Execute no SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

### Método 3: Via Supabase Dashboard

1. Vá para Settings → API
2. Clique em "Reload schema cache"

### Método 4: Reiniciar o projeto (desenvolvimento local)

```bash
supabase stop
supabase start
```

## Verificação

Após aplicar as migrations e recarregar o cache, verifique no Supabase Table Editor:

1. Acesse Table Editor
2. Verifique se as tabelas aparecem:
   - `permissions`
   - `role_permissions`
   - `app_routes`
   - `route_permissions`
3. Verifique se os dados de seed foram inseridos

## Testando a UI

1. Acesse a aplicação
2. Navegue para `/admin/permissions`
3. Você deve ver:
   - Aba "Por Recurso" com as permissões de exemplo
   - Aba "Por Página" com as rotas de exemplo
4. Teste criando/editando permissões

## Compatibilidade

As tabelas foram criadas para serem compatíveis com:
- `src/pages/admin/Permissions.tsx`
- `src/components/admin/RoutePermissionsManager.tsx`

Todos os campos esperados pelo frontend estão presentes e com os tipos corretos.

## Troubleshooting

### Erro: "relation does not exist"
- Execute o reload do schema cache conforme instruções acima

### Erro: "permission denied"
- As políticas RLS (Row Level Security) estão habilitadas por padrão
- Certifique-se de estar autenticado ao acessar a aplicação
- As políticas atuais permitem acesso para todos os usuários autenticados
- Para produção, considere restringir as políticas apenas para usuários admin

### Tabelas não aparecem no Table Editor
- Aguarde alguns segundos após reload do cache
- Recarregue a página do Dashboard
- Se persistir, reinicie o projeto Supabase (desenvolvimento local)

## Segurança - Row Level Security (RLS)

As políticas de RLS foram configuradas para permitir que usuários autenticados possam:
- **Ler** todas as tabelas (SELECT)
- **Modificar** todas as tabelas (INSERT, UPDATE, DELETE)

**⚠️ IMPORTANTE**: Em produção, você deve restringir as políticas para permitir modificações apenas por usuários com cargo de admin. Exemplo:

```sql
-- Exemplo de política mais restritiva (executar manualmente se necessário)
DROP POLICY IF EXISTS "Allow authenticated users to manage permissions" ON public.permissions;

CREATE POLICY "Allow only admins to manage permissions"
ON public.permissions
FOR ALL
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## Próximos Passos

Após aplicar as migrations, você pode:

1. Adicionar mais permissões e rotas via SQL ou pela UI
2. Ajustar as políticas RLS para restringir acesso apenas a admins (recomendado para produção)
3. Integrar o sistema de permissões com o middleware de autenticação
4. Adicionar mais seeds conforme necessário para seu ambiente

## Suporte

Para dúvidas ou problemas:
- Consulte a documentação do Supabase: https://supabase.com/docs
- Verifique os logs do PostgREST para erros de schema
