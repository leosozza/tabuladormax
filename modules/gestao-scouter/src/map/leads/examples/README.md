# Exemplos do Módulo Fichas

Este diretório contém exemplos práticos de como usar o módulo fichas.

## FichasModuleExample.tsx

Componente React completo demonstrando todas as funcionalidades:

- ✅ Carregamento de dados do Google Sheets
- ✅ Heatmap persistente em todos os níveis de zoom
- ✅ Seleção espacial por retângulo (clique e arraste)
- ✅ Seleção espacial por polígono (cliques + duplo clique)
- ✅ Resumo estatístico por projeto e scouter
- ✅ Painel de controles interativo
- ✅ Gerenciamento de estado com React hooks

### Como Usar

Para integrar este exemplo em sua aplicação:

```typescript
import { FichasModuleExample } from '@/map/fichas/examples/FichasModuleExample';

function MyPage() {
  return (
    <div className="h-screen p-4">
      <FichasModuleExample />
    </div>
  );
}
```

### Funcionalidades Demonstradas

1. **Inicialização do Mapa**
   - Configuração automática de tiles
   - Centro em São Paulo
   - Limpeza adequada no unmount

2. **Carregamento de Dados**
   - Loading states
   - Error handling
   - Feedback visual

3. **Heatmap**
   - Criação e atualização dinâmica
   - Fit bounds automático
   - Persistência em todos os zooms

4. **Seleção Espacial**
   - Retângulo: clique e arraste
   - Polígono: cliques individuais + duplo clique
   - Cancelamento de seleção
   - Limpeza de seleção

5. **Resumo Estatístico**
   - Atualização automática após seleção
   - Exibição por projeto e scouter
   - Percentuais calculados
   - Indicador de seleção ativa

### Estilos e UI

O exemplo usa componentes shadcn/ui:
- `Card` para containers
- `Button` para ações
- `CardHeader` e `CardTitle` para títulos
- Ícones do `lucide-react`

### Próximos Passos

Para adicionar este exemplo à sua aplicação:

1. Importe o componente onde necessário
2. Ajuste estilos conforme seu design system
3. Adicione filtros adicionais se necessário
4. Customize o painel de resumo conforme suas necessidades

Para mais informações, consulte o README principal em `src/map/fichas/README.md`.
