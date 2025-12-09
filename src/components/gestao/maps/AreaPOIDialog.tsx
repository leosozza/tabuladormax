import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Search, Building2 } from "lucide-react";
import { POI_CATEGORIES, POICategory } from "@/hooks/usePOIs";
import { DrawnArea } from "./UnifiedAreaMap";

interface AreaPOIDialogProps {
  area: DrawnArea | null;
  isOpen: boolean;
  onClose: () => void;
  onSearchPOIs: (areaId: string, categories: POICategory[]) => Promise<void>;
  isLoading?: boolean;
}

// Categorias focadas em locais com fluxo de mães com crianças
const RECOMMENDED_CATEGORIES: POICategory[] = ['shopping', 'mall', 'school', 'park', 'pedestrian'];

export function AreaPOIDialog({
  area,
  isOpen,
  onClose,
  onSearchPOIs,
  isLoading = false,
}: AreaPOIDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<POICategory[]>(RECOMMENDED_CATEGORIES);

  const toggleCategory = (categoryId: POICategory) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSearch = async () => {
    if (!area || selectedCategories.length === 0) return;
    await onSearchPOIs(area.id, selectedCategories);
    onClose();
  };

  const selectAll = () => {
    setSelectedCategories(POI_CATEGORIES.map(c => c.id));
  };

  const selectRecommended = () => {
    setSelectedCategories(RECOMMENDED_CATEGORIES);
  };

  const clearAll = () => {
    setSelectedCategories([]);
  };

  if (!area) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Pontos de Interesse
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Área: <strong>{area.name}</strong></span>
              <Badge variant="secondary">
                <MapPin className="w-3 h-3 mr-1" />
                {area.leadCount} leads
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione os tipos de POIs para buscar dentro desta área
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Botões de ação rápida */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectRecommended}
              className="text-xs"
            >
              🎯 Recomendados
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
              className="text-xs"
            >
              Todos
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAll}
              className="text-xs"
            >
              Limpar
            </Button>
          </div>

          {/* Lista de categorias */}
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {POI_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              const isRecommended = RECOMMENDED_CATEGORIES.includes(category.id);

              return (
                <div
                  key={category.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'hover:bg-muted/50 border-transparent'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <Checkbox
                    id={category.id}
                    checked={isSelected}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label 
                    htmlFor={category.id} 
                    className="flex-1 cursor-pointer flex items-center gap-1"
                  >
                    <span>{category.icon}</span>
                    <span className="text-sm">{category.label}</span>
                    {isRecommended && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                        ⭐
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>

          {selectedCategories.length === 0 && (
            <p className="text-xs text-destructive mt-2 text-center">
              Selecione pelo menos uma categoria
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSearch} 
            disabled={selectedCategories.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Buscar POIs ({selectedCategories.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
