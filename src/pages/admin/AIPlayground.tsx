import { useState, useRef } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Clock, Trash2, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Fast preview, balanced speed' },
  { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', description: 'Next-gen pro model' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Top-tier, complex reasoning' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced cost & quality' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Fastest, simple tasks' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Powerful all-rounder' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', description: 'Lower cost, good performance' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', description: 'Speed & cost optimized' },
  { value: 'openai/gpt-5.2', label: 'GPT-5.2', description: 'Enhanced reasoning' },
];

interface HistoryEntry {
  id: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  response: string;
  responseTime: number;
  timestamp: Date;
}

export default function AIPlayground() {
  const [model, setModel] = useState('google/gemini-3-flash-preview');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState([0.7]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Erro', description: 'Digite um prompt', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setResponse('');
    setResponseTime(null);
    const startTime = Date.now();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-playground`;
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          systemPrompt: systemPrompt || undefined,
          temperature: temperature[0],
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${resp.status}`);
      }

      // Handle streaming response
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      const elapsed = (Date.now() - startTime) / 1000;
      setResponseTime(elapsed);

      // Add to history
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        model,
        prompt,
        systemPrompt,
        response: fullResponse,
        responseTime: elapsed,
        timestamp: new Date(),
      };
      setHistory(prev => [entry, ...prev].slice(0, 20));

    } catch (error) {
      console.error('AI Playground error:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao chamar o modelo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    toast({ title: 'Histórico limpo' });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setModel(entry.model);
    setPrompt(entry.prompt);
    setSystemPrompt(entry.systemPrompt);
    setResponse(entry.response);
    setResponseTime(entry.responseTime);
  };

  return (
    <AdminPageLayout
      title="Playground IA"
      description="Testar e experimentar modelos de IA"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Configuration */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Model Selector */}
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <Label>Temperature: {temperature[0].toFixed(2)}</Label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Menor = mais focado, Maior = mais criativo
                  </p>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label>System Prompt (opcional)</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Você é um assistente especializado em..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* User Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Digite sua pergunta ou instrução..."
                  rows={4}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Pressione Ctrl+Enter para enviar
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Response */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Resposta</CardTitle>
              <div className="flex items-center gap-2">
                {responseTime !== null && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {responseTime.toFixed(2)}s
                  </Badge>
                )}
                {response && (
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={responseRef}
                className="min-h-[200px] max-h-[400px] overflow-auto rounded-md border bg-muted/30 p-4"
              >
                {isLoading && !response ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : response ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {response}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    A resposta do modelo aparecerá aqui
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Histórico</CardTitle>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Nenhuma interação ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => loadFromHistory(entry)}
                        className="w-full text-left p-3 rounded-md border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {AI_MODELS.find(m => m.value === entry.model)?.label || entry.model}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {entry.responseTime.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-sm truncate">{entry.prompt}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {entry.response.slice(0, 80)}...
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageLayout>
  );
}
