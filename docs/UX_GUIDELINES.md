# Diretrizes de UX do Sistema

## REGRA #1: Sempre Mostrar Labels Legíveis para Campos

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

### Checklist para Novos Componentes
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
