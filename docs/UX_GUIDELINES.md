# Diretrizes de UX do Sistema

## REGRA #1: Sempre Mostrar Labels Legíveis para Campos e Valores

### Problema
Campos do Bitrix24 possuem IDs técnicos como `UF_CRM_1745431662`, que são incompreensíveis para usuários finais.

### Solução Obrigatória
**NUNCA** exibir IDs técnicos de campos sem um label legível associado.

### Como Implementar

#### 1. Use o Helper Centralizado
```typescript
import { getBitrixFieldLabel } from '@/lib/fieldLabelUtils';

const label = getBitrixFieldLabel({
  field_id: 'UF_CRM_1745431662',
  display_name: 'Cadastro Existe Foto?', // preferencial
  listLabel: 'Cadastro Existe Foto?',    // fallback
  field_title: 'UF_CRM_1745431662'       // último recurso
});
```

#### 2. Padrão de Exibição
```tsx
<div>
  <span className="font-medium">{label}</span>
  <code className="text-xs text-muted-foreground ml-2">
    ({field_id})
  </code>
</div>
```

#### 3. Prioridade de Labels
1. **`display_name`** - Customizado pelo admin (melhor)
2. **`listLabel`** - Do metadata do Bitrix
3. **`field_title`** - Título do Bitrix
4. **`formatFieldId()`** - Último recurso (formata o ID)

### Onde Aplicar
- ✅ Monitor de sincronização
- ✅ Tabelas de mapeamento de campos
- ✅ Páginas de configuração
- ✅ Diálogos de seleção de campos
- ✅ Mensagens de erro
- ✅ Logs e relatórios
- ✅ Tooltips e hints

---

## REGRA #1B: Resolver Valores de Enum/Lista

### Problema
Campos de enum do Bitrix mostram IDs técnicos ao invés de labels legíveis:
- `UC_DDVFX3` ao invés de "Lead a Qualificar"
- `CALL` ao invés de "Scouter - Fichas"
- `5494` ao invés de "NAO"

### Solução Obrigatória
Use o **Bitrix Enum Resolver** para resolver automaticamente valores de enum.

### Como Implementar

#### 1. Usar Hook React (Recomendado)
```typescript
import { useBitrixEnums } from '@/hooks/useBitrixEnums';

// Preparar requests
const enumRequests = formattedMappings
  .filter(m => m.bitrixField && m.rawValue)
  .map(m => ({
    bitrixField: m.bitrixField!,
    value: m.rawValue,
    bitrixFieldType: m.bitrixFieldType,
  }));

// Resolver com cache
const { getResolution } = useBitrixEnums(enumRequests);

// Usar resolução
const resolution = getResolution('STATUS_ID', 'UC_DDVFX3');
if (resolution) {
  console.log(resolution.formatted); // "Lead a Qualificar (UC_DDVFX3)"
}
```

#### 2. Resolver Manualmente (Advanced)
```typescript
import { resolveBitrixEnumValue, resolveBitrixEnumValues } from '@/lib/bitrixEnumResolver';

// Single value
const resolution = await resolveBitrixEnumValue('STATUS_ID', 'UC_DDVFX3', 'crm_status');

// Batch (mais eficiente)
const results = await resolveBitrixEnumValues([
  { bitrixField: 'STATUS_ID', value: 'UC_DDVFX3', bitrixFieldType: 'crm_status' },
  { bitrixField: 'SOURCE_ID', value: 'CALL', bitrixFieldType: 'enumeration' }
]);
```

### Formato de Exibição
```tsx
// Exibir como "Label (ID)"
<span>{resolution ? resolution.formatted : rawValue}</span>

// Ou com tooltip
<span title={resolution?.id}>
  {resolution?.label || rawValue}
</span>
```

### Performance
- ✅ Cache automático em memória
- ✅ Batch resolution para múltiplos valores
- ✅ React Query com staleTime de 5 min
- ✅ Busca única por campo (não por valor)

### Quando Aplicar
- ✅ Monitor de sincronização (valores de campos)
- ✅ Dashboards e relatórios
- ✅ Tabelas de dados
- ✅ Filtros e seletores
- ✅ Qualquer exibição de valor de enum Bitrix

### Checklist para Novos Componentes
- [ ] Uso `useBitrixEnums` para resolver valores de enum?
- [ ] Exibo valores como "Label (ID)" quando resolvidos?
- [ ] Testei com valores não resolvidos (fallback para ID)?

### Checklist para Campos
- [ ] Importei `getBitrixFieldLabel` do `fieldLabelUtils`?
- [ ] Estou mostrando o label legível **antes** do ID técnico?
- [ ] O ID técnico está em `<code>` ou badge secundário?
- [ ] Testei com campos que não têm `display_name`?

## Exemplos de Implementação

### Monitor de Sincronização
```tsx
import { getBitrixFieldLabel } from '@/lib/fieldLabelUtils';

{mapping.bitrix_field && (
  <div className="text-sm">
    <span className="font-medium">
      {getBitrixFieldLabel({
        field_id: mapping.bitrix_field,
        display_name: mapping.display_name
      })}
    </span>
    <code className="text-xs text-muted-foreground ml-2">
      ({mapping.bitrix_field})
    </code>
  </div>
)}
```

### Seletor de Campos
```tsx
{bitrixFields.map((bf) => (
  <SelectItem key={bf.field_id} value={bf.field_id}>
    <div className="flex items-center justify-between gap-2">
      <span>{getBitrixFieldLabel(bf)}</span>
      <code className="text-xs text-muted-foreground">{bf.field_id}</code>
    </div>
  </SelectItem>
))}
```

### Mensagens de Erro
```tsx
<Badge variant="destructive">
  {getBitrixFieldLabel({
    field_id: error.bitrix_field,
    display_name: error.display_name
  })}
</Badge>
<span className="text-xs text-muted-foreground">
  ({error.bitrix_field})
</span>
```
