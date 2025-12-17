import { useState, useEffect, useRef } from 'react';
import { ScrollText, ChevronDown, ChevronUp, Sparkles, X, Minus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTelemarketingScripts, TelemarketingScript } from '@/hooks/useTelemarketingScripts';
import { cn } from '@/lib/utils';
import { useDrag } from '@use-gesture/react';

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

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;
const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 450;

export function ScriptViewer({ projectId, className }: ScriptViewerProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('telemarketing_script_visible');
    return saved === 'true';
  });
  
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('telemarketing_script_minimized');
    return saved === 'true';
  });
  
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('telemarketing_script_position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: window.innerWidth - DEFAULT_WIDTH - 20, y: 100 };
      }
    }
    return { x: window.innerWidth - DEFAULT_WIDTH - 20, y: 100 };
  });
  
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem('telemarketing_script_size');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
      }
    }
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });
  
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  
  const { data: scripts, isLoading } = useTelemarketingScripts(projectId);
  
  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('telemarketing_script_visible', String(isOpen));
  }, [isOpen]);
  
  useEffect(() => {
    localStorage.setItem('telemarketing_script_minimized', String(isMinimized));
  }, [isMinimized]);
  
  useEffect(() => {
    localStorage.setItem('telemarketing_script_position', JSON.stringify(position));
  }, [position]);
  
  useEffect(() => {
    localStorage.setItem('telemarketing_script_size', JSON.stringify(size));
  }, [size]);
  
  // Drag handler for moving the panel
  const bindDrag = useDrag(({ movement: [mx, my], first, memo }) => {
    if (first) memo = { ...position };
    const newX = Math.max(0, Math.min(memo.x + mx, window.innerWidth - size.width));
    const newY = Math.max(0, Math.min(memo.y + my, window.innerHeight - 50));
    setPosition({ x: newX, y: newY });
    return memo;
  }, { filterTaps: true });
  
  // Drag handler for resizing the panel
  const bindResize = useDrag(({ movement: [mx, my], first, memo }) => {
    if (first) memo = { ...size };
    const newWidth = Math.max(MIN_WIDTH, Math.min(memo.width + mx, window.innerWidth * 0.8));
    const newHeight = Math.max(MIN_HEIGHT, Math.min(memo.height + my, window.innerHeight * 0.8));
    setSize({ width: newWidth, height: newHeight });
    return memo;
  }, { filterTaps: true });
  
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
  
  // Calculate font size based on panel width
  const fontSize = Math.max(12, Math.min(14, size.width / 30));
  
  return (
    <>
      {/* Toggle Button */}
      <Button 
        variant={isOpen ? "default" : "ghost"} 
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
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
      
      {/* Floating Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
          style={{
            left: position.x,
            top: position.y,
            width: size.width,
            height: isMinimized ? 'auto' : size.height,
          }}
        >
          {/* Header - Draggable Area */}
          <div
            {...bindDrag()}
            className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-move select-none"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <ScrollText className="w-4 h-4" />
              <span className="font-medium text-sm">Scripts de Atendimento</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          {!isMinimized && (
            <div className="relative" style={{ height: size.height - 45 }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : !hasScripts ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <ScrollText className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-center">Nenhum script disponível</p>
                  <p className="text-sm text-center">Peça ao supervisor para criar scripts</p>
                </div>
              ) : (
                <Tabs defaultValue="abertura" className="h-full flex flex-col">
                  <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
                    {CATEGORIES.map(cat => (
                      <TabsTrigger 
                        key={cat.value} 
                        value={cat.value}
                        className="text-xs py-1.5 data-[state=active]:bg-background"
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
                    <TabsContent 
                      key={cat.value} 
                      value={cat.value} 
                      className="flex-1 mt-0 overflow-hidden"
                    >
                      <ScrollArea className="h-full">
                        <div className="space-y-2 p-3" style={{ fontSize }}>
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
                                <div className="border rounded-lg p-2 bg-background">
                                  <CollapsibleTrigger className="w-full">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium truncate">{script.title}</span>
                                        {script.ai_score && (
                                          <Badge variant="outline" className={cn("text-xs shrink-0", getScoreColor(script.ai_score))}>
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            {script.ai_score}
                                          </Badge>
                                        )}
                                      </div>
                                      {expandedScripts.has(script.id) ? (
                                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                      )}
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div 
                                      className="whitespace-pre-wrap text-muted-foreground bg-muted/50 rounded p-2"
                                      style={{ fontSize: fontSize - 1 }}
                                    >
                                      {script.content}
                                    </div>
                                    {script.ai_analysis && (
                                      <div className="mt-2 text-muted-foreground" style={{ fontSize: fontSize - 2 }}>
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
              
              {/* Resize Handle */}
              <div
                {...bindResize()}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M9 1v8H1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M9 5v4H5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
