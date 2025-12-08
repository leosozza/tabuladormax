import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleCreated: () => void;
}

const ROLE_COLORS = [
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
  '#16a34a', '#059669', '#0d9488', '#0891b2', '#0284c7',
  '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3',
  '#db2777', '#e11d48', '#6b7280',
];

export const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  open,
  onOpenChange,
  onRoleCreated,
}) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !label.trim()) {
      toast.error('Nome e rótulo são obrigatórios');
      return;
    }

    // Validate name format (lowercase, no spaces)
    const normalizedName = name.toLowerCase().replace(/\s+/g, '_');
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_roles')
        .insert({
          name: normalizedName,
          label: label.trim(),
          description: description.trim() || null,
          color,
          is_system: false,
        });

      if (error) throw error;

      toast.success('Função criada com sucesso!');
      onRoleCreated();
      onOpenChange(false);
      
      // Reset form
      setName('');
      setLabel('');
      setDescription('');
      setColor('#6b7280');
    } catch (error: any) {
      console.error('Erro ao criar função:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma função com este nome');
      } else {
        toast.error('Erro ao criar função');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Nova Função</DialogTitle>
            <DialogDescription>
              Crie uma nova função para atribuir permissões específicas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome (identificador)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: rh, financeiro, marketing"
                className="lowercase"
              />
              <p className="text-xs text-muted-foreground">
                Será convertido para minúsculas e sem espaços
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="label">Rótulo (exibição)</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Recursos Humanos"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da função..."
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Função
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
