# Flow Builder (MVP)

Este recurso permite encadear ações avançadas ("flows") que podem ser disparadas pelos botões configuráveis da tela de tabulação. O modo simples continua disponível; o modo avançado usa os fluxos persistidos no Supabase e executados via Edge Functions.

## Estrutura de dados

- **Tabela `public.flows`**: guarda metadados do fluxo (nome, definição em JSON e visibilidade).
- **Tabela `public.flows_runs`**: registra cada execução do fluxo e o status resultante.
- **Edge Function `flows-api`**: expõe rotas para criar, listar, obter e executar flows.
- **Edge Function `flows-executor`**: processa cada run, executando nós sequencialmente (`tabular`, `http_call` e `delay`).
- **Cache de tabulação (`runTabular`)**: reutilizado tanto no front quanto no executor para preservar regras de RLS e logs.

## Como criar um fluxo

1. Acesse **Configurações → seção “Flows”**.
2. No card **“Criar novo fluxo”**, informe:
   - **Nome** do fluxo.
   - **Visibilidade** (privado, organização ou público).
   - **Definição JSON** (veja exemplo abaixo).
3. Clique em **“Salvar fluxo”**. O fluxo aparece na lista ao lado.

### Exemplo de definição JSON

```json
{
  "nodes": [
    {
      "id": "step-tabular",
      "type": "tabular",
      "name": "Atualizar status",
      "params": {
        "field": "STATUS_ID",
        "value": "NOVO_STATUS",
        "actionLabel": "Atualização automática"
      }
    },
    {
      "id": "delay-500",
      "type": "delay",
      "params": {
        "ms": 500
      }
    },
    {
      "id": "notificar",
      "type": "http_call",
      "params": {
        "url": "https://example.com/webhook",
        "method": "POST",
        "headers": {
          "content-type": "application/json"
        },
        "body": {
          "leadId": "{{input.leadId}}",
          "status": "NOVO_STATUS"
        }
      }
    }
  ]
}
```

## Associar um fluxo a um botão

1. Na lista de flows, clique em **“Associar”** para escolher o fluxo desejado.
2. Abra o botão que deve executar o fluxo (duplo clique no card do botão).
3. Em **“Tipo de Ação”**, selecione **“Fluxo (avançado)”**.
4. Escolha o fluxo no seletor **“Fluxo associado”** e salve.

> Dica: ao escolher “Associar”, um lembrete aparece na tela do botão para aplicar rapidamente o fluxo sugerido.

## Executar manualmente um fluxo

1. Clique em **“Executar”** na lista de flows.
2. Ajuste o payload JSON de entrada conforme necessário.
3. Clique em **“Executar”** – o run ID é exibido e pode ser acompanhado na aba de logs/execuções.

## Nós suportados

- `tabular`: reutiliza a lógica do botão tradicional (`runTabular`).
- `http_call`: faz chamadas HTTP simples (GET/POST).
- `delay`: aguarda o tempo especificado em milissegundos.

## Logs e acompanhamento

- Cada execução insere registros na tabela `flows_runs` e no `actions_log` padrão.
- Em caso de erro, o status é marcado como `failed`, com detalhes em `flows_runs.logs`.

## Segurança

- RLS limita acesso às tabelas de flows conforme visibilidade e papel do usuário.
- O executor sempre usa o `runTabular` compartilhado, garantindo que regras existentes (Bitrix, Supabase, logs) sejam respeitadas.
- Segredos devem ser armazenados server-side; o frontend nunca expõe credenciais.

## Testes recomendados

1. Criar um fluxo simples (tabular + delay).
2. Associar a um botão no modo avançado e executar via Chatwoot.
3. Verificar, via DevTools, que o botão chama apenas `actions_log` e a função `flows-api`.
4. Testar o modo manual executando via modal.
5. Validar como usuário não-admin para confirmar o respeito às políticas de RLS.

