import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import { POICategory, POI_CATEGORIES } from "@/hooks/usePOIs";
import { cn } from "@/lib/utils";

interface POICategorySelectorProps {
  selectedCategories: POICategory[];
  onCategoriesChange: (categories: POICategory[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function POICategorySelector({
  selectedCategories,
  onCategoriesChange,
  isLoading = false,
  disabled = false,
}: POICategorySelectorProps) {
  const [open, setOpen] = useState(false);

  const handleToggleCategory = (categoryId: POICategory) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter(c => c !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const handleSelectAll = () => {
    onCategoriesChange(POI_CATEGORIES.map(c => c.id));
  };

  const handleClearAll = () => {
    onCategoriesChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
          className={cn(
            "h-7 sm:h-9 gap-1 px-2 sm:px-3",
            selectedCategories.length > 0 && "border-primary"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
          ) : (
            <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
          <span className="hidden sm:inline text-xs">POIs</span>
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 text-[10px] sm:text-xs">
              {selectedCategories.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 z-[1000]" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Pontos de Interesse</h4>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={handleSelectAll}
              >
                Todos
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={handleClearAll}
              >
                Limpar
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {POI_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                  selectedCategories.includes(category.id)
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-accent"
                )}
                onClick={() => handleToggleCategory(category.id)}
              >
                <Checkbox
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleToggleCategory(category.id)}
                  className="pointer-events-none"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base">{category.icon}</span>
                  <Label className="text-xs cursor-pointer truncate">
                    {category.label}
                  </Label>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Locais de alto fluxo de mães com crianças
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
