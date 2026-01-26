
# Adicionar Busca por Nome na Gestao de Templates

## Resumo
Adicionar um campo de busca que permite filtrar templates pelo nome (display_name) ou identificador (element_name) em tempo real.

---

## O Que Sera Implementado

### Campo de Busca
- Input de texto com icone de lupa posicionado entre o header e a lista de templates
- Placeholder: "Buscar template por nome..."
- Filtragem instantanea conforme o usuario digita (client-side)

### Comportamento
- Busca case-insensitive (ignora maiusculas/minusculas)
- Filtra por `display_name` OU `element_name`
- Mostra contador de resultados (ex: "Mostrando 5 de 23 templates")
- Botao de limpar busca (X) quando houver texto

---

## Detalhes Tecnicos

### Alteracoes no Arquivo
**`src/pages/admin/TemplateManagement.tsx`**

1. Adicionar estado para termo de busca:
```typescript
const [searchTerm, setSearchTerm] = useState('');
```

2. Criar lista filtrada com useMemo:
```typescript
const filteredTemplates = useMemo(() => {
  if (!templates) return [];
  if (!searchTerm.trim()) return templates;
  
  const term = searchTerm.toLowerCase();
  return templates.filter(t => 
    t.display_name.toLowerCase().includes(term) ||
    t.element_name.toLowerCase().includes(term)
  );
}, [templates, searchTerm]);
```

3. Adicionar campo de busca no JSX (entre header e lista):
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input
    placeholder="Buscar template por nome..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-10 pr-10"
  />
  {searchTerm && (
    <Button
      variant="ghost"
      size="sm"
      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
      onClick={() => setSearchTerm('')}
    >
      <X className="w-4 h-4" />
    </Button>
  )}
</div>
```

4. Mostrar contador de resultados quando filtrado:
```tsx
{searchTerm && (
  <p className="text-sm text-muted-foreground">
    Mostrando {filteredTemplates.length} de {templates?.length || 0} templates
  </p>
)}
```

5. Usar `filteredTemplates` no mapeamento ao inves de `templates`

### Imports Adicionais
```typescript
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
```

---

## Resultado Esperado
- Campo de busca visivel abaixo do titulo da pagina
- Digitando "boas", mostra apenas templates com "boas" no nome
- Limpar busca restaura lista completa
- UX fluida sem necessidade de clicar em botao de buscar
