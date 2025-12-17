import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuickTexts, useIncrementQuickTextUsage, QUICK_TEXT_CATEGORIES } from '@/hooks/useTelemarketingQuickTexts';

interface QuickTextSelectorProps {
  projectId?: string;
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function QuickTextSelector({ projectId, onSelect, disabled }: QuickTextSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: quickTexts = [], isLoading } = useQuickTexts(projectId);
  const incrementUsage = useIncrementQuickTextUsage();

  const filteredTexts = useMemo(() => {
    if (!search.trim()) return quickTexts;
    const searchLower = search.toLowerCase();
    return quickTexts.filter(
      qt => qt.title.toLowerCase().includes(searchLower) || 
            qt.content.toLowerCase().includes(searchLower) ||
            (qt.shortcut && qt.shortcut.toLowerCase().includes(searchLower))
    );
  }, [quickTexts, search]);

  const groupedTexts = useMemo(() => {
    const groups: Record<string, typeof quickTexts> = {};
    
    filteredTexts.forEach(qt => {
      const category = qt.category || 'geral';
      if (!groups[category]) groups[category] = [];
      groups[category].push(qt);
    });
    
    return groups;
  }, [filteredTexts]);

  const handleSelect = (quickText: typeof quickTexts[0]) => {
    onSelect(quickText.content);
    incrementUsage.mutate(quickText.id);
    setOpen(false);
    setSearch('');
  };

  const getCategoryInfo = (categoryValue: string) => {
    return QUICK_TEXT_CATEGORIES.find(c => c.value === categoryValue) || 
           { value: categoryValue, label: categoryValue, emoji: '📝' };
  };

  if (quickTexts.length === 0 && !isLoading) {
    return null; // Don't show button if no quick texts
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          disabled={disabled || isLoading}
          className="h-9 w-9 shrink-0"
          title="Textos rápidos"
        >
          <Zap className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar texto rápido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-3">
            {Object.entries(groupedTexts).map(([category, texts]) => {
              const categoryInfo = getCategoryInfo(category);
              return (
                <div key={category}>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase flex items-center gap-1.5">
                    <span>{categoryInfo.emoji}</span>
                    <span>{categoryInfo.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {texts.map((qt) => (
                      <Button
                        key={qt.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2 px-2"
                        onClick={() => handleSelect(qt)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{qt.title}</p>
                            {qt.shortcut && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {qt.shortcut}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {qt.content.substring(0, 60)}{qt.content.length > 60 ? '...' : ''}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {filteredTexts.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                {search ? 'Nenhum texto encontrado' : 'Nenhum texto rápido cadastrado'}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
