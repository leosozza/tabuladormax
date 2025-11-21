import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, Settings, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GupshupTemplate {
  id: string;
  template_id: string;
  element_name: string;
  display_name: string;
  category: string;
  status: string;
  template_body: string;
  variables: any[];
  synced_at: string;
}

interface User {
  id: string;
  display_name: string;
  email: string;
}

interface Permission {
  user_id: string;
  template_id: string;
}

export default function TemplateManagement() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<GupshupTemplate | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Buscar todos os templates
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['all-gupshup-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gupshup_templates')
        .select('*')
        .order('display_name');

      if (error) throw error;
      return data as GupshupTemplate[];
    }
  });

  // Buscar todos os usuários
  const { data: users } = useQuery({
    queryKey: ['users-for-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');

      if (error) throw error;
      return data as User[];
    }
  });

  // Buscar permissões do template selecionado
  const { data: permissions } = useQuery({
    queryKey: ['template-permissions', selectedTemplate?.id],
    enabled: !!selectedTemplate?.id,
    queryFn: async () => {
      if (!selectedTemplate?.id) return [];

      const { data, error } = await supabase
        .from('agent_template_permissions')
        .select('user_id, template_id')
        .eq('template_id', selectedTemplate.id);

      if (error) throw error;
      return data as Permission[];
    }
  });

  // Mutation para sincronizar templates
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-gupshup-templates');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.synced} templates sincronizados!`);
      refetchTemplates();
    },
    onError: (error: any) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    }
  });

  // Mutation para alterar permissões
  const permissionMutation = useMutation({
    mutationFn: async ({ userId, templateId, grant }: { userId: string; templateId: string; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase
          .from('agent_template_permissions')
          .insert({ user_id: userId, template_id: templateId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agent_template_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('template_id', templateId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-permissions'] });
      toast.success('Permissão atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    }
  });

  const hasPermission = (userId: string, templateId: string) => {
    return permissions?.some(p => p.user_id === userId && p.template_id === templateId) || false;
  };

  const handleTogglePermission = (userId: string, templateId: string, currentValue: boolean) => {
    permissionMutation.mutate({ userId, templateId, grant: !currentValue });
  };

  const handleGrantAllDepartment = async (department: 'telemarketing' | 'scouters') => {
    if (!selectedTemplate) return;

    // Buscar usuários do departamento
    const { data: deptUsers } = await supabase
      .from('user_departments')
      .select('user_id')
      .eq('department', department);

    if (!deptUsers) return;

    // Conceder permissão para todos
    const promises = deptUsers.map(user => 
      supabase
        .from('agent_template_permissions')
        .upsert({ 
          user_id: user.user_id, 
          template_id: selectedTemplate.id 
        }, {
          onConflict: 'user_id,template_id'
        })
    );

    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ['template-permissions'] });
    toast.success(`Permissão concedida para ${department}!`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Templates WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Configure os templates Gupshup disponíveis para os agentes
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", syncMutation.isPending && "animate-spin")} />
          Sincronizar Agora
        </Button>
      </div>

      {/* Lista de templates */}
      <div className="grid gap-4">
        {templatesLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Carregando templates...</p>
          </div>
        ) : templates && templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.display_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{template.element_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={template.status === 'APPROVED' ? 'default' : 'secondary'}>
                      {template.status}
                    </Badge>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {template.variables?.length || 0} variáveis • 
                    Sincronizado: {new Date(template.synced_at).toLocaleString('pt-BR')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setPreviewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setPermissionsDialogOpen(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Permissões
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum template encontrado. Clique em "Sincronizar Agora" para buscar templates do Gupshup.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Permissões */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configurar Acesso: {selectedTemplate?.display_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Ações em massa */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGrantAllDepartment('telemarketing')}
              >
                Liberar para Telemarketing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGrantAllDepartment('scouters')}
              >
                Liberar para Scouters
              </Button>
            </div>

            {/* Lista de usuários */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {users?.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={hasPermission(user.id, selectedTemplate?.id || '')}
                      onCheckedChange={() => 
                        handleTogglePermission(
                          user.id, 
                          selectedTemplate?.id || '', 
                          hasPermission(user.id, selectedTemplate?.id || '')
                        )
                      }
                    />
                    <Label
                      htmlFor={`user-${user.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{user.display_name || user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-mono whitespace-pre-wrap">
                {selectedTemplate?.template_body}
              </p>
            </div>
            {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
              <div>
                <Label className="text-sm font-semibold">Variáveis:</Label>
                <ul className="mt-2 space-y-1">
                  {selectedTemplate.variables.map((variable: any, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {variable.name || `Variável ${index + 1}`}
                      {variable.example && ` (ex: ${variable.example})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}