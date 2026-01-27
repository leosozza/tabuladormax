

# Envio de Templates WhatsApp com Branching no Flow Builder

## Resumo

Adicionar um novo tipo de step `gupshup_send_template` no Flow Builder que permite:
1. Selecionar um template aprovado do Gupshup
2. Preencher as variaveis do template
3. Configurar branching baseado nos botoes do template (quando aplicavel)
4. Continuar o fluxo de acordo com a resposta do usuario

---

## Arquitetura da Solucao

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLOW BUILDER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Start]                                                                │
│     │                                                                   │
│     ▼                                                                   │
│  ┌─────────────────────────────────────────┐                           │
│  │  📋 Enviar Template                      │                           │
│  │  Template: "Confirmar Presenca"          │                           │
│  │  Variaveis: {{name}}, {{event}}          │                           │
│  │  ┌────────────────────────────────────┐ │                           │
│  │  │ Branches:                          │ │                           │
│  │  │ ├─ [Confirmo presenca] → Step A   │ │                           │
│  │  │ ├─ [Nao vou]          → Step B   │ │                           │
│  │  │ └─ [Mais informacoes] → Step C   │ │                           │
│  │  └────────────────────────────────────┘ │                           │
│  └─────────────────────────────────────────┘                           │
│     │          │          │                                             │
│     ▼          ▼          ▼                                             │
│  [Step A]   [Step B]   [Step C]                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/flow/visual/nodes/TemplateNode.tsx` | Componente visual do no de template |
| `src/components/flow/visual/GupshupTemplatePicker.tsx` | Componente para selecionar template |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/flow.ts` | Adicionar tipo `FlowStepGupshupSendTemplate` e interface de branching |
| `src/components/flow/visual/NodePalette.tsx` | Adicionar opcao "WhatsApp: Template" |
| `src/components/flow/visual/NodeConfigPanel.tsx` | Adicionar `GupshupSendTemplateConfig` |
| `src/components/flow/visual/VisualFlowEditor.tsx` | Registrar `gupshup_send_template` no nodeTypes |
| `src/lib/hooks/use-flow-builder.ts` | Adicionar config padrao para template |
| `supabase/functions/flows-executor/index.ts` | Adicionar handler `executeGupshupSendTemplate` |

---

## Detalhes de Implementacao

### 1. Novo Tipo de Step

```typescript
// Em src/types/flow.ts

export interface TemplateButton {
  id: string;
  text: string;
  nextStepId?: string; // ID do proximo step quando este botao for clicado
}

export interface FlowStepGupshupSendTemplate extends FlowStepBase {
  type: 'gupshup_send_template';
  config: {
    template_id: string;              // ID do template no banco
    template_name?: string;           // Nome para exibicao
    variables: Array<{
      index: number;
      value: string;                  // Suporta {{variaveis}}
    }>;
    buttons?: TemplateButton[];       // Botoes do template com branching
    wait_for_response?: boolean;      // Se true, aguarda resposta antes de continuar
    timeout_seconds?: number;         // Timeout para resposta (default: 86400 = 24h)
    timeout_step_id?: string;         // Step a executar em caso de timeout
  };
}
```

### 2. Paleta de Nos

Adicionar no `NodePalette.tsx`:

```typescript
{
  type: 'gupshup_send_template' as const,
  label: 'WhatsApp: Template',
  description: 'Envia template HSM com botoes',
  icon: FileText, // import de lucide-react
}
```

### 3. Componente de Selecao de Template

```tsx
// GupshupTemplatePicker.tsx

export function GupshupTemplatePicker({
  selectedTemplateId,
  onSelect
}: {
  selectedTemplateId?: string;
  onSelect: (template: GupshupTemplate | null) => void;
}) {
  const { data: templates, isLoading } = useAllGupshupTemplates();
  
  // Extrair botoes do template_body (formato: | [Texto] |)
  const extractButtons = (templateBody: string): string[] => {
    const buttonRegex = /\| \[([^\]]+)\]/g;
    const matches = [...templateBody.matchAll(buttonRegex)];
    return matches.map(m => m[1]);
  };
  
  return (
    <Select value={selectedTemplateId} onValueChange={(id) => {
      const template = templates?.find(t => t.id === id);
      onSelect(template || null);
    }}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um template..." />
      </SelectTrigger>
      <SelectContent>
        {templates?.map(t => (
          <SelectItem key={t.id} value={t.id}>
            {t.display_name} ({t.category})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 4. Painel de Configuracao

```tsx
// Em NodeConfigPanel.tsx

function GupshupSendTemplateConfig({
  step,
  updateConfig
}: {
  step: FlowStepGupshupSendTemplate;
  updateConfig: (key: string, value: any) => void;
}) {
  const { data: templates } = useAllGupshupTemplates();
  const selectedTemplate = templates?.find(t => t.id === step.config.template_id);
  
  // Extrair variaveis do template
  const templateVariables = selectedTemplate?.variables || [];
  
  // Extrair botoes do template_body
  const extractedButtons = useMemo(() => {
    if (!selectedTemplate) return [];
    const regex = /\| \[([^\]]+)\]/g;
    const matches = [...selectedTemplate.template_body.matchAll(regex)];
    return matches.map((m, i) => ({ id: `btn_${i}`, text: m[1] }));
  }, [selectedTemplate]);
  
  return (
    <div className="space-y-4">
      {/* Seletor de Template */}
      <div>
        <Label>Template *</Label>
        <GupshupTemplatePicker
          selectedTemplateId={step.config.template_id}
          onSelect={(template) => {
            updateConfig('template_id', template?.id || '');
            updateConfig('template_name', template?.display_name || '');
            // Auto-preencher variaveis vazias
            if (template?.variables) {
              updateConfig('variables', template.variables.map(v => ({
                index: v.index,
                value: ''
              })));
            }
            // Auto-preencher botoes
            if (template) {
              const btns = extractButtons(template.template_body);
              updateConfig('buttons', btns.map((text, i) => ({
                id: `btn_${i}`,
                text,
                nextStepId: ''
              })));
            }
          }}
        />
      </div>
      
      {/* Preview do Template */}
      {selectedTemplate && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <pre className="whitespace-pre-wrap">{selectedTemplate.template_body}</pre>
        </div>
      )}
      
      {/* Variaveis */}
      {templateVariables.length > 0 && (
        <div>
          <Label>Variaveis</Label>
          {templateVariables.map((v, i) => (
            <div key={i} className="flex gap-2 mt-2">
              <Badge variant="outline">{`{{${v.index}}}`}</Badge>
              <Input
                value={step.config.variables?.[i]?.value || ''}
                onChange={(e) => {
                  const vars = [...(step.config.variables || [])];
                  vars[i] = { index: v.index, value: e.target.value };
                  updateConfig('variables', vars);
                }}
                placeholder={v.example || v.name}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Branching por Botoes */}
      {extractedButtons.length > 0 && (
        <div>
          <Label>Branching por Resposta</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Configure qual step executar quando o cliente clicar em cada botao
          </p>
          {extractedButtons.map((btn, i) => (
            <Card key={i} className="p-3 mt-2">
              <div className="flex items-center gap-2">
                <Badge className="whitespace-nowrap">{btn.text}</Badge>
                <Input
                  value={step.config.buttons?.[i]?.nextStepId || ''}
                  onChange={(e) => {
                    const btns = [...(step.config.buttons || [])];
                    btns[i] = { ...btns[i], id: btn.id, text: btn.text, nextStepId: e.target.value };
                    updateConfig('buttons', btns);
                  }}
                  placeholder="ID do proximo step (ou vazio)"
                  className="text-sm"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Opcoes de Espera */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={step.config.wait_for_response || false}
          onCheckedChange={(checked) => updateConfig('wait_for_response', checked)}
        />
        <Label className="text-sm">Aguardar resposta do cliente</Label>
      </div>
    </div>
  );
}
```

### 5. Edge Function - Executor

Adicionar no `flows-executor/index.ts`:

```typescript
// Adicionar ao switch case
case 'gupshup_send_template':
  stepResult = await executeGupshupSendTemplate(
    step, leadId, context, supabaseAdmin, supabaseUrl, supabaseServiceKey
  );
  break;

// Nova funcao
async function executeGupshupSendTemplate(
  step: FlowStep,
  leadId: number | undefined,
  context: Record<string, any>,
  supabaseAdmin: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { template_id, variables = [], buttons = [], wait_for_response } = step.config;
  
  if (!template_id) {
    throw new Error('template_id e obrigatorio');
  }
  
  // Obter telefone
  let targetPhone = context.phone_number;
  if (!targetPhone && leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('celular, telefone_casa, phone_normalized')
      .eq('id', leadId)
      .single();
    targetPhone = lead?.phone_normalized || lead?.celular || lead?.telefone_casa;
  }
  
  if (!targetPhone) {
    throw new Error('Nao foi possivel determinar o telefone');
  }
  
  // Resolver variaveis
  const resolvedVariables = variables.map(v => 
    replacePlaceholders(v.value || '', leadId, context)
  );
  
  console.log(`📤 Enviando template ${template_id} para ${targetPhone}`);
  
  // Chamar gupshup-send-message com action send_template
  const response = await fetch(`${supabaseUrl}/functions/v1/gupshup-send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({
      action: 'send_template',
      phone_number: targetPhone,
      template_id: template_id,
      variables: resolvedVariables,
      bitrix_id: leadId?.toString(),
      source: 'flow_executor'
    })
  });
  
  const result = await response.json();
  
  if (!response.ok || result.error) {
    throw new Error(result.error || `Erro ao enviar template: ${response.status}`);
  }
  
  console.log(`✅ Template enviado: ${result.messageId}`);
  
  return {
    messageId: result.messageId,
    phone: targetPhone,
    template_id,
    variables: resolvedVariables,
    buttons: buttons.map(b => b.text),
    waiting_for_response: wait_for_response
  };
}
```

### 6. Branching - Fase Futura (Webhook)

Para implementar o branching completo onde o fluxo aguarda a resposta do cliente:

1. O step `gupshup_send_template` com `wait_for_response: true` salva o estado do fluxo na tabela `flows_pending_responses`
2. O webhook `gupshup-webhook` ao receber resposta de botao:
   - Busca se existe fluxo pendente para aquele telefone
   - Identifica qual botao foi clicado
   - Retoma o fluxo a partir do `nextStepId` configurado

Esta fase requer:
- Nova tabela `flows_pending_responses`
- Modificacao no `gupshup-webhook` para detectar respostas de botao
- Modificacao no `flows-executor` para pausar/retomar fluxos

---

## Resultado Esperado

1. **Nova opcao no painel**: "WhatsApp: Template" aparece na paleta de nos
2. **Selecao de template**: Usuario seleciona template aprovado via dropdown
3. **Preview visual**: Mostra o corpo do template com placeholders
4. **Variaveis**: Campos para preencher cada `{{1}}`, `{{2}}`, etc.
5. **Botoes detectados**: Sistema extrai automaticamente botoes do template
6. **Branching configuravel**: Usuario pode definir qual step executar para cada resposta

---

## Fluxo de Uso

1. Arrasta "WhatsApp: Template" para o canvas
2. Seleciona template "Confirmar Presenca"
3. Preenche variaveis: `{{1}} = {{lead.nome}}`, `{{2}} = Ribeirao Preto`
4. Ve os botoes extraidos: [Confirmo presenca], [Nao vou]
5. Configura branching:
   - "Confirmo presenca" → vai para step "Atualizar Bitrix para Confirmado"
   - "Nao vou" → vai para step "Atualizar Bitrix para Cancelado"
6. Salva o flow

---

## Resumo Tecnico das Alteracoes

| Componente | Alteracao |
|------------|-----------|
| **Tipos** | Novo `FlowStepGupshupSendTemplate` com config de template, variaveis e botoes |
| **UI** | Novo no na paleta + configurador com picker de template e branching |
| **Visual** | Novo componente `TemplateNode.tsx` para exibir preview no canvas |
| **Executor** | Nova funcao `executeGupshupSendTemplate` que envia via edge function |
| **Hook** | Novo default config para `gupshup_send_template` |

