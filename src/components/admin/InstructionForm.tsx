import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useCreateInstruction } from '@/hooks/useAITraining';

const CATEGORIES = [
  { value: 'procedures', label: 'Procedimentos' },
  { value: 'product_knowledge', label: 'Conhecimento de Produto' },
  { value: 'responses', label: 'Tom de Resposta' },
  { value: 'business_rules', label: 'Regras de Negócio' },
  { value: 'other', label: 'Outros' },
];

export function InstructionForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('responses');
  const [priority, setPriority] = useState(5);

  const createInstruction = useCreateInstruction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      return;
    }

    await createInstruction.mutateAsync({
      title,
      content,
      type: 'text',
      category,
      priority,
      is_active: true,
    });

    // Reset form
    setTitle('');
    setContent('');
    setPriority(5);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="instruction-title">Título da Instrução</Label>
          <Input
            id="instruction-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Tom de Resposta Otimista"
            required
            disabled={createInstruction.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instruction-content">Conteúdo da Instrução</Label>
          <Textarea
            id="instruction-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva as instruções que o agente deve seguir. Exemplo:&#10;&#10;Sempre responda de forma entusiasta e use emojis quando apropriado. Seja otimista sobre resultados mas honesto sobre desafios. Ao falar de números, contextualize com comparações e insights."
            rows={10}
            required
            disabled={createInstruction.isPending}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Você pode usar markdown para formatar o texto
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instruction-category">Categoria</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={createInstruction.isPending}
            >
              <SelectTrigger id="instruction-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instruction-priority">Prioridade (0-10)</Label>
            <Input
              id="instruction-priority"
              type="number"
              min="0"
              max="10"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              disabled={createInstruction.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Maior = mais importante
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!title.trim() || !content.trim() || createInstruction.isPending}
          className="w-full"
        >
          {createInstruction.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4 mr-2" />
              Adicionar Instrução
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
