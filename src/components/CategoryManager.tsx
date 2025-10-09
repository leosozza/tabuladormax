import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Edit2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  label: string;
  sort_order: number;
}

interface CategoryManagerProps {
  categories: Category[];
  onCategoriesChange: () => void;
}

export function CategoryManager({ categories, onCategoriesChange }: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCategory = async () => {
    if (!newLabel.trim()) {
      toast.error("Digite um nome para a categoria");
      return;
    }

    const name = newLabel
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

    const { error } = await supabase
      .from("button_categories")
      .insert({
        name,
        label: newLabel.trim(),
        sort_order: categories.length + 1,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe uma categoria com este nome");
      } else {
        toast.error("Erro ao criar categoria");
      }
      return;
    }

    toast.success("Categoria criada com sucesso");
    setNewLabel("");
    setIsAdding(false);
    onCategoriesChange();
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editLabel.trim()) {
      toast.error("Digite um nome para a categoria");
      return;
    }

    const { error } = await supabase
      .from("button_categories")
      .update({ label: editLabel.trim() })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar categoria");
      return;
    }

    toast.success("Categoria atualizada com sucesso");
    setEditingId(null);
    setEditLabel("");
    onCategoriesChange();
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    // Verificar se existem botões nesta categoria
    const { count } = await supabase
      .from("button_config")
      .select("*", { count: "exact", head: true })
      .eq("category", name);

    if (count && count > 0) {
      toast.error(`Não é possível excluir. Existem ${count} botões nesta categoria.`);
      return;
    }

    const { error } = await supabase
      .from("button_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir categoria");
      return;
    }

    toast.success("Categoria excluída com sucesso");
    onCategoriesChange();
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditLabel(category.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">🏷️ Gerenciar Categorias</h2>
          <p className="text-sm text-muted-foreground">
            Adicione, edite ou remova categorias de botões
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            
            {editingId === category.id ? (
              <>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateCategory(category.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleUpdateCategory(category.id)}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="font-medium">{category.label}</div>
                  <div className="text-xs text-muted-foreground">{category.name}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(category)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent/20">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nome da nova categoria"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewLabel("");
                }
              }}
            />
            <Button size="sm" onClick={handleAddCategory}>
              Adicionar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setNewLabel("");
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
