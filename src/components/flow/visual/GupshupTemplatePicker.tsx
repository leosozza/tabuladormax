// ============================================
// Gupshup Template Picker - Select approved templates
// ============================================

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText } from 'lucide-react';
import { useAllGupshupTemplates, type GupshupTemplate } from '@/hooks/useGupshupTemplates';

interface GupshupTemplatePickerProps {
  selectedTemplateId?: string;
  onSelect: (template: GupshupTemplate | null) => void;
}

/**
 * Extract buttons from template_body format: | [Button Text] |
 */
export function extractButtonsFromTemplate(templateBody: string): string[] {
  const buttonRegex = /\| \[([^\]]+)\]/g;
  const matches = [...templateBody.matchAll(buttonRegex)];
  return matches.map(m => m[1]);
}

/**
 * Extract variable placeholders from template_body format: {{1}}, {{2}}, etc.
 */
export function extractVariablesFromTemplate(templateBody: string): number[] {
  const varRegex = /\{\{(\d+)\}\}/g;
  const matches = [...templateBody.matchAll(varRegex)];
  const indices = matches.map(m => parseInt(m[1]));
  return [...new Set(indices)].sort((a, b) => a - b);
}

export function GupshupTemplatePicker({ selectedTemplateId, onSelect }: GupshupTemplatePickerProps) {
  const { data: templates, isLoading } = useAllGupshupTemplates();
  const [search, setSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!search.trim()) return templates;
    
    const searchLower = search.toLowerCase();
    return templates.filter(t => 
      t.display_name?.toLowerCase().includes(searchLower) ||
      t.element_name?.toLowerCase().includes(searchLower) ||
      t.category?.toLowerCase().includes(searchLower)
    );
  }, [templates, search]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null;
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, templates]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">Carregando templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select 
        value={selectedTemplateId || ''} 
        onValueChange={(id) => {
          const template = templates?.find(t => t.id === id) || null;
          onSelect(template);
        }}
      >
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Selecione um template...">
            {selectedTemplate && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="truncate">{selectedTemplate.display_name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar template..."
                className="pl-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-64">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {templates?.length === 0 ? 'Nenhum template aprovado' : 'Nenhum resultado'}
              </div>
            ) : (
              filteredTemplates.map(t => {
                const buttons = extractButtonsFromTemplate(t.template_body);
                return (
                  <SelectItem key={t.id} value={t.id} className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.display_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {t.category}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {t.template_body.substring(0, 60)}...
                      </div>
                      {buttons.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {buttons.map((btn, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {btn}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
}
