
# Plano de Ajustes para o Módulo de Agenciamento

## Entendimento do Fluxo Desejado

O usuário descreveu o seguinte fluxo completo:

1. **Lead chega na agência** → se torna um **Deal**
2. Deal começa na etapa **"Recepção - Cadastro de atendimento"**
3. Cliente preenche o cadastro → muda para **"Ficha Preenchida"**
4. Ao mover para **"Atendimento Produtor"** → vincula automaticamente ao produtor da **"Fila da Vez"**
   - Exibe mensagem: "Atendimento com Produtor X, confirma ou escolher outro produtor"
5. Ao confirmar → produtor recebe o deal no **`/portal-produtor`**
6. Produtor escolhe o deal e clica em **"Agenciar"**
7. Preenche formas de pagamento e clica em **"Concluir"**
8. Atualiza o deal no Bitrix com:
   - Formas de pagamento escolhidas
   - Se fechou negócio ou não

---

## Análise do Estado Atual

### O que já funciona:

| Funcionalidade | Status |
|----------------|--------|
| Pipeline Kanban com etapas corretas | ✅ Implementado |
| Fila da Vez (ProducerQueueHeaderBar) | ✅ Implementado |
| ProducerSelectDialog para escolher produtor | ✅ Implementado |
| Portal do Produtor com lista de deals | ✅ Implementado |
| Formulário de Agenciamento (ProducerAgenciarForm) | ✅ Implementado |
| Sincronização de status com Bitrix | ✅ Implementado |

### O que precisa ser ajustado:

| Problema Identificado | Ajuste Necessário |
|-----------------------|-------------------|
| Ao mover para "Atendimento Produtor", não mostra o produtor da fila como sugestão | Mostrar o próximo da fila automaticamente no diálogo |
| Não há confirmação com o nome do produtor sugerido | Adicionar diálogo de confirmação com produtor pré-selecionado |
| Formas de pagamento não são enviadas para o Bitrix | Incluir payment_methods no sync-deal-to-bitrix |
| Status "negocios_fechados" vs "contrato_nao_fechado" não é claramente escolhido | Adicionar opção de escolher resultado no fluxo de conclusão |

---

## Implementação Proposta

### 1. Melhorar ProducerSelectDialog com Sugestão Automática

**Arquivo:** `src/components/agenciamento/ProducerSelectDialog.tsx`

Alterações:
- Adicionar prop `suggestedProducer` (opcional)
- Quando fornecido, mostrar mensagem de confirmação
- Pré-selecionar o produtor sugerido
- Exibir: "Atendimento com **[Nome do Produtor]**, confirma ou escolher outro"

```text
┌─────────────────────────────────────────────┐
│  Atribuir Atendimento                       │
├─────────────────────────────────────────────┤
│                                             │
│  Próximo da Fila:                           │
│  ┌─────────────────────────────────────┐   │
│  │ 👤 João Silva                       │   │
│  │    Posição #1 na fila               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Confirmar João]  [Escolher Outro]         │
│                                             │
│  ─────────────────────────────────────────  │
│  Ou selecione outro produtor:               │
│  🔍 Buscar produtor...                      │
│  ┌─────────────────────────────────────┐   │
│  │ Lista de produtores disponíveis     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Integrar Fila da Vez no Fluxo de Transição

**Arquivo:** `src/components/agenciamento/NegotiationPipeline.tsx`

Alterações:
- Importar `useProducerQueueView` para obter `nextProducer`
- Passar `suggestedProducer={nextProducer}` para o ProducerSelectDialog
- Ao confirmar, marcar produtor como "EM_ATENDIMENTO" na fila

### 3. Adicionar Escolha de Resultado ao Concluir

**Arquivo:** `src/components/portal-produtor/ProducerAgenciarForm.tsx`

Alterações:
- Substituir botão único "Concluir" por dois botões:
  - "Fechou Negócio" → status `negocios_fechados`
  - "Não Fechou" → status `contrato_nao_fechado`
- Ou adicionar um diálogo de confirmação perguntando o resultado

### 4. Enviar Formas de Pagamento para o Bitrix

**Arquivo:** `supabase/functions/sync-deal-to-bitrix/index.ts`

Alterações:
- Buscar `payment_methods` da tabela `negotiations`
- Mapear para campos customizados do Bitrix (se existirem)
- Ou armazenar como JSON em um campo de observações

Campos sugeridos para enviar:
- `UF_CRM_PAYMENT_METHODS`: JSON com formas de pagamento
- `UF_CRM_TOTAL_VALUE`: Valor total negociado
- `UF_CRM_DISCOUNT_PERCENT`: Percentual de desconto aplicado

---

## Detalhes Técnicos

### Mudanças no ProducerSelectDialog

```typescript
interface ProducerSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producer: Producer) => void;
  title?: string;
  suggestedProducer?: ProducerInQueueView | null; // NOVO
}
```

### Mudanças no NegotiationPipeline

```typescript
// Importar hook da fila
import { useProducerQueueView } from '@/hooks/useProducerQueueView';

// Dentro do componente
const { nextProducer } = useProducerQueueView();

// No handleStatusChange para atendimento_produtor
<ProducerSelectDialog
  suggestedProducer={nextProducer}
  // ... outras props
/>
```

### Mudanças no sync-deal-to-bitrix

```typescript
// Buscar dados da negociação incluindo payment_methods
const { data: negotiation } = await supabase
  .from('negotiations')
  .select('payment_methods, total_value, discount_percentage')
  .eq('id', negotiation_id)
  .single();

// Incluir nos campos do update
updateFields.UF_CRM_PAYMENT_DATA = JSON.stringify(negotiation.payment_methods);
updateFields.OPPORTUNITY = negotiation.total_value;
```

---

## Resumo das Tarefas

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|------------|
| 1 | Adicionar sugestão de produtor da fila no diálogo | ProducerSelectDialog.tsx | Alta |
| 2 | Integrar nextProducer no NegotiationPipeline | NegotiationPipeline.tsx | Alta |
| 3 | Adicionar botões de resultado (Fechou/Não Fechou) | ProducerAgenciarForm.tsx | Alta |
| 4 | Enviar payment_methods para Bitrix | sync-deal-to-bitrix/index.ts | Média |
| 5 | Atualizar status do produtor na fila ao iniciar atendimento | NegotiationPipeline.tsx | Média |

---

## Resultado Esperado

Após implementação:

1. Usuário move card para "Atendimento Produtor"
2. Aparece: "Atendimento com **Maria Santos** (próxima da fila). Confirmar ou escolher outro?"
3. Ao confirmar, deal aparece no portal do produtor Maria
4. Maria preenche formas de pagamento e escolhe "Fechou Negócio" ou "Não Fechou"
5. Bitrix é atualizado com status correto e dados de pagamento
