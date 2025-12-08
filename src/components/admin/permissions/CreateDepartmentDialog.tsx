import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface CreateDepartmentDialogProps {
  onCreated: () => void;
}

export function CreateDepartmentDialog({ onCreated }: CreateDepartmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim() || !code.trim()) {
      toast.error('Nome e código são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('departments').insert({
        name: name.trim(),
        code: code.trim().toLowerCase().replace(/\s+/g, '_'),
        description: description.trim() || null
      });

      if (error) throw error;

      toast.success('Departamento criado com sucesso');
      setOpen(false);
      setName("");
      setCode("");
      setDescription("");
      onCreated();
    } catch (error: any) {
      console.error('Error creating department:', error);
      if (error.code === '23505') {
        toast.error('Já existe um departamento com este código');
      } else {
        toast.error('Erro ao criar departamento');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Novo Departamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Departamento</DialogTitle>
          <DialogDescription>
            Adicione um novo departamento para organizar usuários e permissões
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Recursos Humanos"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: rh"
            />
            <p className="text-xs text-muted-foreground">
              Identificador único do departamento (sem espaços)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do departamento..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Departamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
