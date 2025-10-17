# Sistema de Controle de Sincronização CSV → Bitrix

## 📋 Visão Geral

Este sistema permite controlar se os dados importados via CSV serão sincronizados com o Bitrix ou não.

## 🎯 Casos de Uso

### Cenário 1: Importação do Bitrix → Supabase (Carga Inicial)
- **Checkbox**: ❌ Desmarcado
- **Comportamento**: Dados são importados apenas no Supabase
- **sync_source**: `'bitrix'`
- **Sincronização**: NÃO dispara trigger para Bitrix

### Cenário 2: Importação do Discador → Supabase + Bitrix
- **Checkbox**: ✅ Marcado
- **Comportamento**: Dados são importados no Supabase E sincronizados com Bitrix
- **sync_source**: `null`
- **Sincronização**: Dispara trigger `trigger_sync_to_bitrix`

## 🔄 Fluxo Técnico

```
CSV Upload → Parse → Upsert no Supabase → Trigger verifica sync_source
                                           ↓
                        sync_source = 'bitrix' → ❌ IGNORA sincronização
                        sync_source = null → ✅ SINCRONIZA com Bitrix
```

## 🛡️ Proteção Contra Loops

O trigger `trigger_sync_to_bitrix` verifica:
```sql
IF NEW.sync_source = 'bitrix' OR NEW.sync_source = 'supabase' THEN
  RETURN NEW; -- Ignora sincronização
END IF;
```

## 📊 Rastreamento

Todas as sincronizações são registradas na tabela `sync_events` com:
- `direction`: 'supabase_to_bitrix'
- `lead_id`: ID do lead sincronizado
- `status`: 'success' ou 'error'
- `sync_duration_ms`: Tempo de sincronização

## ✅ Validação

Para testar o sistema:
1. Importar CSV com checkbox desmarcado → Verificar que não há eventos em `sync_events`
2. Importar CSV com checkbox marcado → Verificar eventos em `sync_events` e logs em Edge Function
