# Análise de Leads Estilo Tinder

## Visão Geral

Este recurso permite analisar leads de forma rápida e intuitiva usando uma interface estilo Tinder com gestos de swipe. Os usuários podem aprovar ou rejeitar leads deslizando cartões para a direita (aprovar) ou esquerda (rejeitar).

## Funcionalidades

### 1. Seleção de Leads para Análise

- Na página de Leads, os usuários podem selecionar múltiplos leads usando checkboxes na tabela
- O botão **"Iniciar Análise"** é habilitado apenas quando há leads selecionados
- O botão mostra o número de leads selecionados (ex: "Iniciar Análise (5)")

### 2. Interface de Análise (Modal Tinder)

Ao clicar em "Iniciar Análise", um modal fullscreen é aberto com:

#### Cabeçalho
- Título "Análise de Leads"
- Contador de progresso mostrando posição atual (ex: "3 de 10")

#### Card do Lead
Cada card exibe:
- **Foto**: Imagem do lead (se disponível) ou inicial do nome
- **Badge "Foto Cadastrada"**: Se o lead possui foto no cadastro
- **Nome**: Nome completo do lead
- **Idade**: Idade em anos
- **Informações do Projeto**:
  - Scouter responsável
  - Local da abordagem
  - Projeto associado
  - Supervisor
- **Badges de Status**:
  - Ficha Confirmada
  - Presença Confirmada
  - Etapa atual

#### Controles de Swipe
- **Swipe para direita**: Aprova o lead (salva `aprovado = true`)
- **Swipe para esquerda**: Rejeita o lead (salva `aprovado = false`)
- **Swipe vertical**: Bloqueado (não faz nada)

#### Botões Manuais
- **Botão ✖ (vermelho)**: Rejeitar o lead
- **Botão ❤ (verde)**: Aprovar o lead
- Ambos os botões disparam swipe programaticamente

#### Feedback Visual
Durante o swipe, aparece uma animação:
- **Coração verde pulsante**: Para aprovação
- **X vermelho pulsante**: Para rejeição

### 3. Persistência no Banco de Dados

- Cada decisão (aprovar/rejeitar) é salva **imediatamente** no Supabase
- Campo atualizado: `fichas.aprovado` (boolean)
- Toast de confirmação é exibido após cada ação
- Se houver erro na gravação, toast de erro é exibido

### 4. Atualização da Tabela de Leads

A tabela principal possui:
- **Coluna "Aprovado"**: Nova coluna mostrando status
  - Badge verde com ❤ + "Sim" para leads aprovados
  - Badge cinza "Não" para leads não aprovados
- **Refetch automático**: Após concluir a análise, a tabela é atualizada
- **Limpeza de seleção**: Checkboxes são desmarcados automaticamente

### 5. Fluxo Completo

1. Usuário acessa página "Leads"
2. Seleciona um ou mais leads usando checkboxes
3. Clica em "Iniciar Análise (X)"
4. Modal abre mostrando primeiro lead
5. Para cada lead:
   - Usuário desliza direita (aprovar) ou esquerda (rejeitar)
   - OU clica nos botões ❤ ou ✖
   - Decisão é salva no banco imediatamente
   - Feedback visual é exibido
   - Próximo lead é mostrado
6. Ao terminar todos os leads:
   - Toast "Análise concluída!" é exibido
   - Modal fecha automaticamente
   - Tabela de leads é atualizada
   - Seleção é limpa

## Estrutura Técnica

### Componentes Criados

#### `src/components/leads/TinderAnalysisModal.tsx`
Modal principal que gerencia a análise de leads:
- Recebe array de leads selecionados
- Controla estado atual do card
- Gerencia swipe com react-tinder-card
- Salva decisões no Supabase
- Emite eventos de conclusão

#### Atualizações em `src/components/shared/DataTable.tsx`
- Adicionado prop `onSelectionChange?: (selected: any[]) => void`
- Notifica componente pai quando seleção muda
- Mantém estado interno de seleção

#### Atualizações em `src/pages/Leads.tsx`
- Gerencia estado de leads selecionados
- Controla abertura/fechamento do modal
- Implementa refetch após análise
- Adiciona coluna "Aprovado" na tabela

### Banco de Dados

#### Migração: `supabase/migrations/20251016230108_add_aprovado_field.sql`
```sql
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fichas_aprovado ON public.fichas(aprovado);
```

#### Tipo Atualizado: `src/repositories/types.ts`
```typescript
export interface Ficha {
  // ... campos existentes
  aprovado?: boolean;
}
```

### Dependências Instaladas

```json
{
  "react-tinder-card": "^1.6.4",
  "@react-spring/web": "^9.7.5"
}
```

## Configuração de Campos (Futuro)

Atualmente, o modal exibe campos fixos do lead. Uma futura implementação pode permitir configurar quais campos exibir via:

1. Página de Configurações → Aba "Mapeamento de Campos"
2. Interface para selecionar campos da tabela `fichas`
3. Mapeamento salvo em `field_mappings` (já existe no banco)

Campos configuráveis sugeridos:
- nome (obrigatório)
- foto
- idade
- scouter
- local_da_abordagem
- projeto
- supervisor_do_scouter
- etapa
- ficha_confirmada
- presenca_confirmada

## UX e Responsividade

### Desktop
- Cards em tamanho médio (max-width: 28rem)
- Botões grandes e clicáveis
- Animações suaves

### Mobile
- Swipe natural com toque
- Botões grandes para fácil acesso
- Layout adaptado para telas pequenas

### Acessibilidade
- Botões com ícones e texto
- Contraste adequado nos badges
- Feedback sonoro via toasts

## Melhorias Futuras

1. **Lazy Loading**: Para lotes muito grandes (>50 leads), carregar cards sob demanda
2. **Desfazer**: Botão para voltar última decisão
3. **Filtros avançados**: Filtrar leads por critérios antes da análise
4. **Estatísticas**: Mostrar taxa de aprovação em tempo real
5. **Exportação**: Exportar apenas leads aprovados
6. **Integração com Bitrix**: Sincronizar status de aprovação com CRM

## Troubleshooting

### Problema: Modal não abre
- Verificar se há leads selecionados
- Verificar console do navegador para erros

### Problema: Swipe não funciona
- Verificar se `@react-spring/web` está instalado
- Limpar cache do navegador e recarregar

### Problema: Decisões não são salvas
- Verificar conexão com Supabase
- Verificar permissões RLS na tabela `fichas`
- Verificar console para erros de API

### Problema: Coluna "Aprovado" não aparece
- Verificar se migração foi executada
- Rodar: `supabase migration up`
- Verificar se campo existe: `SELECT aprovado FROM fichas LIMIT 1`

## Exemplos de Uso

### Aprovar leads de um projeto específico
1. Filtrar leads por projeto na tabela
2. Selecionar todos (checkbox do cabeçalho)
3. Iniciar análise
4. Revisar e aprovar/rejeitar cada um

### Revisar leads pendentes
1. Filtrar por `Aprovado = Não`
2. Selecionar leads desejados
3. Iniciar análise
4. Fazer revisão rápida

### Análise de qualidade
1. Filtrar leads por período
2. Analisar qualidade de fotos e informações
3. Aprovar apenas leads de alta qualidade
4. Exportar leads aprovados para processamento

## Suporte

Para questões ou problemas:
1. Verificar documentação acima
2. Consultar logs no console do navegador
3. Verificar status da conexão Supabase
4. Contatar equipe de desenvolvimento
