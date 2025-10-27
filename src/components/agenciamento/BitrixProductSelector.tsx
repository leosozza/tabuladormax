// Bitrix Product Selector Component
// Allows selecting products from Bitrix24 catalog

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { listProducts, getProduct, type BitrixProduct } from '@/lib/bitrix';
import { toast } from 'sonner';

interface BitrixProductSelectorProps {
  value?: string; // Product ID
  onChange: (product: BitrixProduct | null) => void;
  onPriceChange?: (price: number) => void;
}

export function BitrixProductSelector({
  value,
  onChange,
  onPriceChange,
}: BitrixProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(value || null);

  // Fetch products from Bitrix24
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['bitrix-products'],
    queryFn: () => listProducts({ limit: 100 }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  // Fetch selected product details
  const { data: selectedProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['bitrix-product', selectedProductId],
    queryFn: () => selectedProductId ? getProduct(selectedProductId) : null,
    enabled: !!selectedProductId,
    staleTime: 5 * 60 * 1000,
  });

  // Notify parent when product changes
  useEffect(() => {
    if (selectedProduct) {
      onChange(selectedProduct);
      if (onPriceChange) {
        onPriceChange(selectedProduct.PRICE);
      }
    } else {
      onChange(null);
      if (onPriceChange) {
        onPriceChange(0);
      }
    }
  }, [selectedProduct, onChange, onPriceChange]);

  // Filter products by search term
  const filteredProducts = products.filter((product) =>
    product.NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.ID.includes(searchTerm)
  );

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
  };

  const handleClearSelection = () => {
    setSelectedProductId(null);
    setSearchTerm('');
  };

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Produto do Bitrix24</Label>
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Erro ao carregar produtos</p>
              <p className="text-sm text-red-500">
                {error instanceof Error ? error.message : 'Não foi possível conectar ao Bitrix24'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="product-search">Produto do Bitrix24</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Selecione um produto do catálogo Bitrix24
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 p-4 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando produtos...</span>
          </div>
        ) : selectedProduct ? (
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">{selectedProduct.NAME}</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-green-700">
                    <strong>ID:</strong> {selectedProduct.ID}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Preço:</strong> {selectedProduct.CURRENCY_ID} {selectedProduct.PRICE.toFixed(2)}
                  </p>
                  {selectedProduct.DESCRIPTION && (
                    <p className="text-sm text-green-700">
                      <strong>Descrição:</strong> {selectedProduct.DESCRIPTION}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="mt-2 border-green-600 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Produto selecionado
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearSelection}
                className="shrink-0"
              >
                Alterar
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="Buscar produto por nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredProducts.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                </p>
              </Card>
            ) : (
              <Select value={selectedProductId || ''} onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.ID} value={product.ID}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="font-medium">{product.NAME}</span>
                        <Badge variant="secondary" className="ml-2">
                          {product.CURRENCY_ID} {product.PRICE.toFixed(2)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {isLoadingProduct && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando detalhes do produto...</span>
        </div>
      )}
    </div>
  );
}
