import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Building2, Users, ChevronRight, ChevronDown, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Department {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  commercial_project_id: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  project?: { name: string; code: string };
  agents_count?: number;
  children?: Department[];
}

interface CommercialProject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    commercial_project_id: "",
    parent_id: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar projetos comerciais
      // @ts-ignore - Tipos ainda não atualizados após migração
      const { data: projectsData, error: projectsError } = await supabase
        .from("commercial_projects")
        .select("*")
        .eq("active", true)
        .order("name");

      if (projectsError) throw projectsError;
      setProjects(projectsData as any || []);

      // Carregar departamentos com contagem de agentes
      // @ts-ignore - Tipos ainda não atualizados após migração
      const { data: deptsData, error: deptsError } = await supabase
        .from("departments")
        .select(`
          *,
          project:commercial_projects(name, code)
        `)
        .eq("active", true)
        .order("sort_order");

      if (deptsError) throw deptsError;

      // Contar agentes por departamento
      const { data: agentsCount } = await supabase
        .from("agent_telemarketing_mapping")
        .select("department_id");

      const counts = (agentsCount as any)?.reduce((acc: any, curr: any) => {
        if (curr.department_id) {
          acc[curr.department_id] = (acc[curr.department_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const enrichedDepts = (deptsData as any)?.map((dept: any) => ({
        ...dept,
        agents_count: counts[dept.id] || 0
      })) || [];

      setDepartments(buildTree(enrichedDepts as Department[]));
    } catch (error) {
      console.error("Erro ao carregar departamentos:", error);
      toast.error("Erro ao carregar departamentos");
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (depts: Department[]): Department[] => {
    const map = new Map<string, Department>();
    const roots: Department[] = [];

    depts.forEach(dept => {
      map.set(dept.id, { ...dept, children: [] });
    });

    depts.forEach(dept => {
      const node = map.get(dept.id)!;
      if (dept.parent_id) {
        const parent = map.get(dept.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpand = (deptId: string) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code || !formData.commercial_project_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      if (editingDept) {
        // @ts-ignore - Tipos ainda não atualizados após migração
        const { error } = await supabase
          .from("departments")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingDept.id);

        if (error) throw error;
        toast.success("Departamento atualizado com sucesso");
      } else {
        // @ts-ignore - Tipos ainda não atualizados após migração
        const { error } = await supabase
          .from("departments")
          .insert({
            name: formData.name,
            code: formData.code.toUpperCase(),
            commercial_project_id: formData.commercial_project_id,
            parent_id: formData.parent_id || null,
            description: formData.description || null,
          });

        if (error) throw error;
        toast.success("Departamento criado com sucesso");
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar departamento:", error);
      toast.error(error.message || "Erro ao salvar departamento");
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Deseja realmente excluir o departamento "${dept.name}"?`)) return;

    try {
      // @ts-ignore - Tipos ainda não atualizados após migração
      const { error } = await supabase
        .from("departments")
        .update({ active: false })
        .eq("id", dept.id);

      if (error) throw error;
      toast.success("Departamento excluído com sucesso");
      loadData();
    } catch (error: any) {
      console.error("Erro ao excluir departamento:", error);
      toast.error(error.message || "Erro ao excluir departamento");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      commercial_project_id: "",
      parent_id: "",
      description: "",
    });
    setEditingDept(null);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      commercial_project_id: dept.commercial_project_id,
      parent_id: dept.parent_id || "",
      description: dept.description || "",
    });
    setIsDialogOpen(true);
  };

  const renderDepartment = (dept: Department, level: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedDepts.has(dept.id);

    return (
      <div key={dept.id} style={{ marginLeft: `${level * 24}px` }}>
        <div className="flex items-center gap-2 p-3 hover:bg-accent/50 rounded-lg group">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleExpand(dept.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          
          <Building2 className="h-5 w-5 text-muted-foreground" />
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{dept.name}</span>
              <span className="text-xs text-muted-foreground">({dept.code})</span>
            </div>
            {dept.description && (
              <p className="text-sm text-muted-foreground">{dept.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{dept.agents_count || 0}</span>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDialog(dept)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(dept)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {dept.children?.map(child => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">Gerencie a estrutura de departamentos por filial</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Departamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDept ? "Editar Departamento" : "Novo Departamento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Telemarketing"
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: TELEMARKETING"
                  disabled={!!editingDept}
                  required
                />
              </div>

              <div>
                <Label htmlFor="project">Projeto Comercial *</Label>
                <Select
                  value={formData.commercial_project_id}
                  onValueChange={(value) => setFormData({ ...formData, commercial_project_id: value })}
                  disabled={!!editingDept}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="parent">Departamento Pai (opcional)</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                  disabled={!!editingDept}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum (departamento raiz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do departamento"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingDept ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum departamento encontrado</p>
            <p className="text-sm text-muted-foreground">Crie seu primeiro departamento</p>
          </div>
        ) : (
          <div className="space-y-1">
            {departments.map(dept => renderDepartment(dept))}
          </div>
        )}
      </Card>
    </div>
  );
}
