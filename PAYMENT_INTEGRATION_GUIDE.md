# Guia de Integração: Pagamento com Produtos do Bitrix24

Este documento descreve a nova funcionalidade de integração de pagamento com produtos do Bitrix24, implementada para melhorar o fluxo de negociações comerciais.

## Visão Geral

A integração permite que o sistema busque informações de produtos diretamente do Bitrix24, eliminando a necessidade de cálculos locais e garantindo que os preços e descontos estejam sempre atualizados com o catálogo oficial.

## Funcionalidades Principais

### 1. Integração com Catálogo Bitrix24

#### API de Produtos
- **Listar Produtos**: Busca todos os produtos disponíveis no catálogo
- **Buscar Produto**: Obtém detalhes de um produto específico
- **Obter Preço**: Recupera preço atualizado com descontos aplicáveis
- **Produtos de Pedido**: Lista produtos vinculados a deals/leads

#### Componente BitrixProductSelector
```typescript
<BitrixProductSelector
  value={selectedProductId}
  onChange={(product) => handleProductChange(product)}
  onPriceChange={(price) => updateBaseValue(price)}
/>
```

**Características:**
- Busca em tempo real por nome ou ID
- Cache de 5 minutos para otimização de performance
- Feedback visual quando produto é selecionado
- Exibição de detalhes completos (nome, preço, descrição)
- Tratamento de erros com mensagens claras

### 2. Configuração Avançada de Pagamento

#### Componente EnhancedPaymentConfig

O novo componente oferece uma experiência completa de configuração de pagamento:

```typescript
<EnhancedPaymentConfig
  value={paymentMethods}
  onChange={setPaymentMethods}
  totalValue={totalValue}
/>
```

#### Entrada (Down Payment)
- Toggle para ativar/desativar entrada
- Seleção de método: PIX, Dinheiro, Transferência Bancária
- Valor configurável com validação em tempo real
- Cálculo automático de saldo restante

#### Múltiplos Métodos de Pagamento
- Adicionar métodos por valor absoluto (R$)
- Editar valores individuais de cada método
- Remover métodos facilmente
- Distribuição automática de saldo restante entre métodos

#### Validação em Tempo Real
- **Verde**: Configuração completa (100% do valor)
- **Amarelo**: Falta valor a ser configurado
- **Vermelho**: Valor excede o total

### 3. Fluxo de Uso

#### Passo 1: Selecionar Produto do Bitrix24
1. Abra o formulário de nova negociação
2. Na seção "Produto (Bitrix24)", clique no seletor
3. Busque o produto desejado por nome ou ID
4. Selecione o produto
5. O valor base será preenchido automaticamente

#### Passo 2: Configurar Entrada (Opcional)
1. Ative o toggle "Entrada (PIX ou Dinheiro)"
2. Selecione o método de pagamento da entrada
3. Defina o valor da entrada
4. O sistema calculará o saldo restante automaticamente

#### Passo 3: Adicionar Métodos de Pagamento
1. Selecione um método de pagamento (Cartão, PIX, etc.)
2. Digite o valor para este método
3. Clique em "+" para adicionar
4. Repita para outros métodos conforme necessário
5. Use "Distribuir saldo restante" para preencher automaticamente

#### Passo 4: Finalizar
1. Verifique o status de validação
2. Certifique-se de que o indicador está verde
3. Complete os demais campos do formulário
4. Salve a negociação

## Estrutura de Dados

### BitrixProduct
```typescript
interface BitrixProduct {
  ID: string;
  NAME: string;
  PRICE: number;
  CURRENCY_ID: string;
  DESCRIPTION?: string;
  SECTION_ID?: string;
  CATALOG_ID?: string;
  VAT_INCLUDED?: 'Y' | 'N';
  VAT_ID?: string;
  MEASURE?: number;
  ACTIVE?: 'Y' | 'N';
}
```

### SelectedPaymentMethod
```typescript
interface SelectedPaymentMethod {
  method: PaymentMethod;
  percentage: number;
  amount?: number;
  notes?: string;
}
```

### Negotiation (Atualizado)
```typescript
interface Negotiation {
  // ... campos existentes
  bitrix_product_id?: string | null; // Novo campo
  // ... demais campos
}
```

## API do Bitrix24

### Endpoint Base
```
https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/
```

### Métodos Disponíveis

#### crm.product.list
Lista todos os produtos do catálogo.

**Exemplo de Uso:**
```typescript
const products = await listProducts({ 
  limit: 50,
  filter: { ACTIVE: 'Y' }
});
```

#### crm.product.get
Busca um produto específico por ID.

**Exemplo de Uso:**
```typescript
const product = await getProduct('123');
```

#### crm.product.productrows.get
Busca produtos vinculados a um deal ou lead.

**Exemplo de Uso:**
```typescript
const products = await getProductRows('deal', '456');
```

## Tratamento de Erros

### BitrixError
Classe personalizada para erros da API do Bitrix24.

```typescript
try {
  const product = await getProduct(productId);
} catch (error) {
  if (error instanceof BitrixError) {
    toast.error(error.message);
  }
}
```

### Mensagens de Erro Comuns
- "Falha ao buscar produtos do Bitrix" - Erro de rede
- "Não foi possível conectar ao Bitrix" - Timeout ou conexão perdida
- "Produto não encontrado" - ID inválido
- "Acesso negado" - Problema de autenticação

## Validações

### Validação de Pagamento
1. **Métodos obrigatórios**: Pelo menos um método deve ser configurado
2. **Total correto**: Soma dos métodos deve ser igual ao valor total
3. **Valores positivos**: Todos os valores devem ser maiores que zero
4. **Saldo zero**: Não pode haver saldo restante ou excedente

### Feedback Visual
- ✅ **Verde**: Tudo OK, pode salvar
- ⚠️ **Amarelo**: Falta configurar métodos
- ❌ **Vermelho**: Valor excede o total

## Performance e Cache

### React Query
- Cache de 5 minutos para lista de produtos
- Refetch automático quando necessário
- Stale time configurado para reduzir chamadas à API

### Otimizações
- Lista de produtos carregada apenas uma vez
- Detalhes do produto buscados sob demanda
- Cache compartilhado entre componentes

## Responsividade Mobile

### Layout Adaptativo
- Grid flexível que se adapta ao tamanho da tela
- Inputs otimizados para dispositivos touch
- Botões de tamanho adequado (mínimo 44x44px)
- Rolagem suave em telas pequenas

### Breakpoints
- **Mobile**: < 640px - Layout vertical
- **Tablet**: 640px - 1024px - Layout adaptável
- **Desktop**: > 1024px - Layout em duas colunas

## Testes

### Cobertura de Testes
- ✅ API do Bitrix24 (11 testes)
- ✅ Listagem de produtos
- ✅ Busca de produto específico
- ✅ Cálculo de preços
- ✅ Normalização de dados
- ✅ Tratamento de erros

### Executar Testes
```bash
# Todos os testes
npm test

# Apenas testes do Bitrix
npm test -- src/__tests__/lib/bitrix-products.test.ts
```

## Exemplo Completo de Uso

```typescript
import { useState } from 'react';
import { BitrixProductSelector } from '@/components/agenciamento/BitrixProductSelector';
import { EnhancedPaymentConfig } from '@/components/agenciamento/EnhancedPaymentConfig';
import type { BitrixProduct, SelectedPaymentMethod } from '@/types';

function NegotiationExample() {
  const [selectedProduct, setSelectedProduct] = useState<BitrixProduct | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<SelectedPaymentMethod[]>([]);

  return (
    <>
      {/* Seleção de Produto */}
      <BitrixProductSelector
        value={selectedProduct?.ID}
        onChange={setSelectedProduct}
      />

      {/* Configuração de Pagamento */}
      {selectedProduct && (
        <EnhancedPaymentConfig
          value={paymentMethods}
          onChange={setPaymentMethods}
          totalValue={selectedProduct.PRICE}
        />
      )}
    </>
  );
}
```

## Solução de Problemas

### Problema: Produtos não carregam
**Solução**: Verifique a conexão com o Bitrix24 e as credenciais de API.

### Problema: Preço não atualiza
**Solução**: Limpe o cache do React Query ou recarregue a página.

### Problema: Validação não funciona
**Solução**: Certifique-se de que todos os valores são números válidos.

### Problema: Erro "BitrixError"
**Solução**: Verifique os logs do console para detalhes específicos do erro.

## Próximas Melhorias

- [ ] Suporte para descontos personalizados do Bitrix24
- [ ] Histórico de preços do produto
- [ ] Integração com estoque do Bitrix24
- [ ] Suporte para variações de produto
- [ ] Cálculo de impostos baseado no produto
- [ ] Geração automática de contratos

## Suporte e Contribuição

Para reportar problemas ou sugerir melhorias, abra uma issue no repositório do projeto.

### Links Úteis
- [Documentação do Bitrix24 API](https://dev.bitrix24.com/)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
