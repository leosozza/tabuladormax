
# Plano: Sincronizar Departamentos e Funções Dinâmicas no Gerenciamento de Usuários

## Problema Identificado

Existe uma **inconsistência de arquitetura** entre as páginas de permissões e usuários:

| Página | Fonte de Dados | Valores Disponíveis |
|--------|----------------|---------------------|
| `/admin/permissions` | Tabelas dinâmicas (`departments`, `custom_roles`) | Cobrança, Central Atendimento (novos) |
| `/admin/users` | ENUMs hardcoded + tipos TypeScript | Apenas: telemarketing, scouters, administrativo, analise |

### Detalhes Técnicos

**Departamentos:**
- Tabela `departments` contém: Administrativo, Cobrança, Scouters, Telemarketing
- ENUM `app_department` no banco: telemarketing, scouters, administrativo, analise
- Tabela `user_departments.department` usa o tipo `app_department` (ENUM fixo)

**Funções:**
- Tabela `custom_roles` contém: admin, agent, central_de_atendimento, manager, supervisor
- ENUM `app_role` no banco: admin, manager, agent, supervisor
- Tabela `user_roles.role` usa o tipo `app_role` (ENUM fixo)

## Solução Proposta

Modificar a página `/admin/users` para buscar departamentos e funções **dinamicamente** das tabelas `departments` e `custom_roles`, em vez de usar valores hardcoded.

### Fase 1: Alterações no Banco de Dados

1. **Alterar coluna `user_departments.department`** de ENUM para TEXT (ou referência UUID)
2. **Alterar coluna `user_roles.role`** de ENUM para TEXT (ou referência UUID)
3. **Adicionar constraint** para validar que os valores existam nas tabelas dinâmicas

```sql
-- Alterar user_departments para usar TEXT com foreign key
ALTER TABLE public.user_departments 
  ALTER COLUMN department TYPE TEXT;

-- Adicionar FK para departments.code
ALTER TABLE public.user_departments
  ADD CONSTRAINT fk_user_department_code
  FOREIGN KEY (department) REFERENCES departments(code) ON UPDATE CASCADE;

-- Similar para user_roles -> custom_roles.name
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE TEXT;
```

### Fase 2: Alterações no Frontend (Users.tsx)

1. **Remover tipos hardcoded** das linhas 21-42, 50, 83, 121
2. **Adicionar states** para departamentos e funções dinâmicas
3. **Carregar dados** no useEffect das tabelas `departments` e `custom_roles`
4. **Substituir SelectItems hardcoded** por mapeamento dinâmico em:
   - Linha 1690-1701 (Create User - Department)
   - Linha 1653-1670 (Create User - Role)
   - Linha 1896-1904 (Edit Role Dialog)
   - Linha 2134-2144 (Batch Edit - Role)
   - Linha 2147-2158 (Batch Edit - Department)
   - Linha 2220-2225 (Edit Department Dialog)

### Fase 3: Código das Alterações

**Novos estados:**

```typescript
const [dynamicDepartments, setDynamicDepartments] = useState<Array<{id: string, name: string, code: string}>>([]);
const [dynamicRoles, setDynamicRoles] = useState<Array<{id: string, name: string, label: string}>>([]);
```

**Carregamento dinâmico:**

```typescript
const loadDynamicOptions = async () => {
  const [{ data: deps }, { data: roles }] = await Promise.all([
    supabase.from('departments').select('id, name, code').order('name'),
    supabase.from('custom_roles').select('id, name, label').order('name')
  ]);
  setDynamicDepartments(deps || []);
  setDynamicRoles(roles || []);
};
```

**Select dinâmico (exemplo):**

```tsx
<Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o departamento" />
  </SelectTrigger>
  <SelectContent>
    {dynamicDepartments.map(dept => (
      <SelectItem key={dept.id} value={dept.code}>
        {dept.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/Users.tsx` | Substituir hardcoded por dados dinâmicos |
| Migration SQL | Alterar colunas de ENUM para TEXT com FK |

## Impacto

- Departamentos e funções criados em `/admin/permissions` aparecerão automaticamente em `/admin/users`
- Dados existentes serão preservados (migração compatível)
- Sistema mais flexível para adicionar novos departamentos/funções

## Resumo das Mudanças

```text
1. Migration: ENUM -> TEXT com FK para departments/custom_roles
2. Users.tsx: Carregar options de departments e custom_roles
3. Users.tsx: Substituir 6+ SelectContent hardcoded por mapeamento dinâmico
4. Atualizar tipos TypeScript para aceitar strings dinâmicas
```
