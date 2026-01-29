import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { AIAgentTraining } from '@/hooks/useAIAgents';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  category: z.string().default('geral'),
  priority: z.number().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AIAgentTrainingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training: AIAgentTraining | null;
  agentId: string;
  onSave: (data: FormData) => Promise<void>;
  saving: boolean;
}

const CATEGORIES = [
  { value: 'saudacao', label: 'Saudação', description: 'Formas de cumprimentar o cliente' },
  { value: 'produtos', label: 'Produtos', description: 'Informações sobre produtos/serviços' },
  { value: 'objecoes', label: 'Objeções', description: 'Como responder objeções comuns' },
  { value: 'fechamento', label: 'Fechamento', description: 'Técnicas de fechamento de venda' },
  { value: 'faq', label: 'FAQ', description: 'Perguntas frequentes' },
  { value: 'geral', label: 'Geral', description: 'Instruções gerais' },
  { value: 'conversas', label: 'Conversas', description: 'Gerado a partir de conversas de operadores' },
];

export function AIAgentTrainingFormDialog({
  open,
  onOpenChange,
  training,
  agentId,
  onSave,
  saving,
}: AIAgentTrainingFormDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agent_id: agentId,
      title: '',
      content: '',
      category: 'geral',
      priority: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (training) {
      form.reset({
        agent_id: training.agent_id,
        title: training.title,
        content: training.content,
        category: training.category,
        priority: training.priority,
        is_active: training.is_active,
      });
    } else {
      form.reset({
        agent_id: agentId,
        title: '',
        content: '',
        category: 'geral',
        priority: 0,
        is_active: true,
      });
    }
  }, [training, agentId, form]);

  const handleSubmit = async (data: FormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{training ? 'Editar Treinamento' : 'Novo Treinamento'}</DialogTitle>
          <DialogDescription>
            Adicione instruções e conhecimentos específicos para o agente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Como apresentar o produto X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex flex-col">
                              <span>{cat.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {CATEGORIES.find(c => c.value === field.value)?.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade (0-100)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maior prioridade = aparece primeiro no contexto
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instruções detalhadas para o agente..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Este conteúdo será adicionado ao contexto do agente quando gerar respostas
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
                    <FormLabel>Treinamento Ativo</FormLabel>
                    <FormDescription>
                      Apenas treinamentos ativos são usados pelo agente
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
                {training ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
