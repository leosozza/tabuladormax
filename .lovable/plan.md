
# Plano: Sincronizar Departamentos e Funções Dinâmicas no Gerenciamento de Usuários

## ✅ CONCLUÍDO

## Problema Identificado

Existia uma **inconsistência de arquitetura** entre as páginas de permissões e usuários:

| Página | Fonte de Dados | Valores Disponíveis |
|--------|----------------|---------------------|
| `/admin/permissions` | Tabelas dinâmicas (`departments`, `custom_roles`) | Cobrança, Central Atendimento (novos) |
| `/admin/users` | ENUMs hardcoded + tipos TypeScript | Apenas: telemarketing, scouters, administrativo, analise |

## Solução Implementada

### Fase 1: Banco de Dados ✅

Migração executada para:
1. **Adicionar novos valores aos ENUMs** (abordagem escolhida para não quebrar dependências existentes):
   - `app_role`: + `supervisor_adjunto`, `control_desk`, `central_de_atendimento`
   - `app_department`: + `cobranca`
2. **Sincronizar tabelas dinâmicas** com novos registros em `custom_roles` e `departments`

### Fase 2: Frontend (Users.tsx) ✅

1. **Tipos dinâmicos** substituem hardcoded (linhas 21-44)
2. **Estados dinâmicos** adicionados:
   - `dynamicDepartments: DynamicDepartment[]`
   - `dynamicRoles: DynamicRole[]`
3. **Carregamento dinâmico** via `loadDynamicOptions()` no useEffect
4. **Todos os SelectContent** atualizados para usar mapeamento dinâmico:
   - Create User - Função (linha 1673)
   - Create User - Departamento (linha 1710)
   - Edit Role Dialog (linha 1916)
   - Batch Edit - Role (linha 2154)
   - Batch Edit - Department (linha 2168)
   - Edit Department Dialog (linha 2236)

## Impacto

- ✅ Departamentos e funções criados em `/admin/permissions` aparecem automaticamente em `/admin/users`
- ✅ Dados existentes foram preservados
- ✅ Sistema mais flexível para adicionar novos departamentos/funções
