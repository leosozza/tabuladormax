import { useState, useEffect } from 'react';
import { ScrollText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTelemarketingScripts, TelemarketingScript } from '@/hooks/useTelemarketingScripts';
import { cn } from '@/lib/utils';

interface ScriptViewerProps {
  projectId?: string | null;
  className?: string;
}

const CATEGORIES = [
  { value: 'abertura', label: 'Abertura' },
  { value: 'objecoes', label: 'Objeções' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'geral', label: 'Geral' },
];

export function ScriptViewer({ projectId, className }: ScriptViewerProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('telemarketing_script_visible');
    return saved === 'true';
  });
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  
  const { data: scripts, isLoading } = useTelemarketingScripts(projectId);
  
  useEffect(() => {
    localStorage.setItem('telemarketing_script_visible', String(isOpen));
  }, [isOpen]);
  
  const scriptsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = scripts?.filter(s => s.category === cat.value) || [];
    return acc;
  }, {} as Record<string, TelemarketingScript[]>);
  
  const toggleExpanded = (id: string) => {
    setExpandedScripts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const totalScripts = scripts?.length || 0;
  const hasScripts = totalScripts > 0;
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant={isOpen ? "default" : "ghost"} 
          size="sm"
          className={cn("gap-2", className)}
        >
          <ScrollText className="w-4 h-4" />
          Script
          {hasScripts && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {totalScripts}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Scripts de Atendimento
          </SheetTitle>
        </SheetHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !hasScripts ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <ScrollText className="w-12 h-12 mb-2 opacity-50" />
            <p>Nenhum script disponível</p>
            <p className="text-sm">Peça ao supervisor para criar scripts</p>
          </div>
        ) : (
          <Tabs defaultValue="abertura" className="mt-4">
            <TabsList className="w-full grid grid-cols-4">
              {CATEGORIES.map(cat => (
                <TabsTrigger 
                  key={cat.value} 
                  value={cat.value}
                  className="text-xs"
                >
                  {cat.label}
                  {scriptsByCategory[cat.value].length > 0 && (
                    <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px]">
                      {scriptsByCategory[cat.value].length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {CATEGORIES.map(cat => (
              <TabsContent key={cat.value} value={cat.value} className="mt-4">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-3 pr-4">
                    {scriptsByCategory[cat.value].length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum script nesta categoria
                      </p>
                    ) : (
                      scriptsByCategory[cat.value].map(script => (
                        <Collapsible
                          key={script.id}
                          open={expandedScripts.has(script.id)}
                          onOpenChange={() => toggleExpanded(script.id)}
                        >
                          <div className="border rounded-lg p-3 bg-card">
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{script.title}</span>
                                  {script.ai_score && (
                                    <Badge variant="outline" className={cn("text-xs", getScoreColor(script.ai_score))}>
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      {script.ai_score}
                                    </Badge>
                                  )}
                                </div>
                                {expandedScripts.has(script.id) ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3">
                              <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 rounded p-3">
                                {script.content}
                              </div>
                              {script.ai_analysis && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <p className="font-medium text-foreground">Análise IA:</p>
                                  <p>{(script.ai_analysis as any)?.summary || 'Análise disponível'}</p>
                                </div>
                              )}
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
