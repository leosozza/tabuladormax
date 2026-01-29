import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AIAgent } from '@/hooks/useAIAgents';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AIProviderModel {
  id: string;
  name: string;
  description?: string;
}

interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  models: AIProviderModel[];
  default_model: string | null;
  is_active: boolean;
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().nullable(),
  system_prompt: z.string().min(10, 'Prompt de sistema deve ter pelo menos 10 caracteres'),
  personality: z.string().default('profissional'),
  ai_provider: z.string().default('groq'),
  ai_model: z.string().default('llama-3.3-70b-versatile'),
  is_active: z.boolean().default(true),
  commercial_project_id: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface AIAgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AIAgent | null;
  onSave: (data: FormData) => Promise<void>;
  saving: boolean;
}

const PERSONALITIES = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'amigavel', label: 'Amigável' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'atencioso', label: 'Atencioso' },
];

function useAIProviders() {
  return useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('id, name, display_name, models, default_model, is_active')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      
      // Parse models from JSON
      return (data || []).map((provider) => ({
        ...provider,
        models: (provider.models as unknown as AIProviderModel[]) || [],
      })) as AIProvider[];
    },
  });
}

const DEFAULT_PROMPT = `Você é um assistente de atendimento ao cliente via WhatsApp. Seu papel é ajudar agentes de telemarketing a responder mensagens de clientes.

Regras importantes:
- Seja cordial e profissional
- Use linguagem informal mas respeitosa (você ao invés de tu)
- Respostas curtas e objetivas (máximo 2-3 frases)
- NÃO use emojis em excesso (máximo 1 por mensagem)
- NÃO faça promessas que não pode cumprir
- Se não souber algo, sugira encaminhar para um especialista
- Use português brasileiro`;

export function AIAgentFormDialog({
  open,
  onOpenChange,
  agent,
  onSave,
  saving,
}: AIAgentFormDialogProps) {
  const { data: providers = [] } = useAIProviders();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      system_prompt: DEFAULT_PROMPT,
      personality: 'profissional',
      ai_provider: 'groq',
      ai_model: 'llama-3.3-70b-versatile',
      is_active: true,
      commercial_project_id: null,
    },
  });

  const watchProvider = form.watch('ai_provider');
  
  // Get current provider and its models
  const currentProvider = useMemo(() => 
    providers.find((p) => p.name === watchProvider),
    [providers, watchProvider]
  );
  
  const models = useMemo(() => 
    currentProvider?.models || [],
    [currentProvider]
  );

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || '',
        system_prompt: agent.system_prompt,
        personality: agent.personality,
        ai_provider: agent.ai_provider,
        ai_model: agent.ai_model,
        is_active: agent.is_active,
        commercial_project_id: agent.commercial_project_id,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        system_prompt: DEFAULT_PROMPT,
        personality: 'profissional',
        ai_provider: 'groq',
        ai_model: 'llama-3.3-70b-versatile',
        is_active: true,
        commercial_project_id: null,
      });
    }
  }, [agent, form]);

  const handleSubmit = async (data: FormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? 'Editar Agente' : 'Novo Agente'}</DialogTitle>
          <DialogDescription>
            Configure as características e comportamento do agente de IA
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Agente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Vendas SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personalidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERSONALITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Breve descrição do objetivo do agente"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="ai_provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provedor de IA</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedProvider = providers.find((p) => p.name === value);
                        const defaultModel = selectedProvider?.default_model || selectedProvider?.models?.[0]?.id;
                        if (defaultModel) {
                          form.setValue('ai_model', defaultModel);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ai_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt de Sistema</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instruções base para o agente..."
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Este é o prompt base. Treinamentos adicionais serão anexados automaticamente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Agente Ativo</FormLabel>
                    <FormDescription>
                      Apenas agentes ativos podem ser usados
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {agent ? 'Salvar' : 'Criar Agente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
