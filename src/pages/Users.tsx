import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, User as UserIcon, Key, Copy, Check, Edit2, Plus, Building2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UserMenu from "@/components/UserMenu";
import { TelemarketingSelector } from "@/components/TelemarketingSelector";

interface UserWithRole {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  role: 'admin' | 'manager' | 'supervisor' | 'agent';
  telemarketing_name?: string;
  telemarketing_id?: number;
  department_name?: string;
  department_id?: string;
  project_name?: string;
  project_id?: string;
  supervisor_name?: string;
}

interface Department {
  id: string;
  name: string;
  commercial_project_id: string;
}

interface CommercialProject {
  id: string;
  name: string;
}

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'supervisor' | 'agent' | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  
  // Create user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'supervisor' | 'agent'>('agent');
  const [newUserProject, setNewUserProject] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [newUserSupervisor, setNewUserSupervisor] = useState("");
  const [newUserTelemarketing, setNewUserTelemarketing] = useState<number | undefined>();
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Password reset
  const [tempPassword, setTempPassword] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  // Edit name
  const [editingUserId, setEditingUserId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  
  // Edit role
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'supervisor' | 'agent'>('agent');
  
  // Data for dropdowns
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [supervisors, setSupervisors] = useState<UserWithRole[]>([]);
  
  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterRole, setFilterRole] = useState("");

  useEffect(() => {
    checkUserRole();
    loadProjects();
    loadUsers();
  }, []);

  useEffect(() => {
    if (newUserProject) {
      loadDepartments(newUserProject);
    }
  }, [newUserProject]);

  useEffect(() => {
    if (newUserDepartment) {
      loadSupervisors(newUserDepartment);
    }
  }, [newUserDepartment]);

  const checkUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const role = data?.role as 'admin' | 'manager' | 'supervisor' | 'agent' | null;
    setCurrentUserRole(role);

    if (role !== 'admin' && role !== 'manager' && role !== 'supervisor') {
      toast.error('Acesso negado. Apenas administradores e supervisores podem acessar esta página.');
      navigate('/dashboard');
    }
  };

  const loadProjects = async () => {
    // @ts-ignore - Tipos ainda não atualizados
    const { data } = await supabase
      .from('commercial_projects')
      .select('id, name')
      .eq('active', true)
      .order('name');

    setProjects(data as any || []);
  };

  const loadDepartments = async (projectId: string) => {
    // @ts-ignore - Tipos ainda não atualizados
    const { data } = await supabase
      .from('departments')
      .select('id, name, commercial_project_id')
      .eq('commercial_project_id', projectId)
      .eq('active', true)
      .order('name');

    setDepartments(data as any || []);
  };

  const loadSupervisors = async (departmentId: string) => {
    const { data: mappings } = await supabase
      .from('agent_telemarketing_mapping')
      .select('tabuladormax_user_id, supervisor_id')
      .eq('department_id', departmentId);

    if (!mappings) return;

    const supervisorIds = [...new Set(mappings.map(m => m.supervisor_id).filter(Boolean))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', supervisorIds);

    if (!profiles) return;

    const supervisorsData = profiles.map(p => ({
      ...p,
      role: 'supervisor' as const,
      created_at: '',
    }));

    setSupervisors(supervisorsData as any);
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Erro ao carregar usuários');
      setLoading(false);
      return;
    }

    // Buscar roles e mapeamentos de cada usuário
    const usersWithRoles: UserWithRole[] = [];
    for (const profile of profiles || []) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .maybeSingle();

      // Buscar mapeamento de telemarketing e departamento
      const { data: mappingData } = await supabase
        .from('agent_telemarketing_mapping')
        .select(`
          bitrix_telemarketing_name,
          bitrix_telemarketing_id,
          department_id,
          commercial_project_id,
          supervisor_id
        `)
        .eq('tabuladormax_user_id', profile.id)
        .maybeSingle();

      let departmentName, projectName, supervisorName;

      if (mappingData?.department_id) {
        // @ts-ignore
        const { data: dept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', mappingData.department_id)
          .maybeSingle();
        departmentName = dept?.name;
      }

      if (mappingData?.commercial_project_id) {
        // @ts-ignore
        const { data: proj } = await supabase
          .from('commercial_projects')
          .select('name')
          .eq('id', mappingData.commercial_project_id)
          .maybeSingle();
        projectName = proj?.name;
      }

      if (mappingData?.supervisor_id) {
        const { data: sup } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', mappingData.supervisor_id)
          .maybeSingle();
        supervisorName = sup?.display_name;
      }

      usersWithRoles.push({
        ...profile,
        role: roleData?.role as any || 'agent',
        telemarketing_name: (mappingData as any)?.bitrix_telemarketing_name,
        telemarketing_id: (mappingData as any)?.bitrix_telemarketing_id,
        department_name: departmentName,
        department_id: (mappingData as any)?.department_id,
        project_name: projectName,
        project_id: (mappingData as any)?.commercial_project_id,
        supervisor_name: supervisorName,
      });
    }

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserEmail || !newUserName) {
      toast.error("Email e nome são obrigatórios");
      return;
    }

    setCreatingUser(true);
    try {
      // Gerar senha temporária
      const tempPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

      // Criar agente no Chatwoot (se for agent)
      let chatwootAgentId = null;
      if (newUserRole === 'agent' && newUserTelemarketing) {
        const { data: chatwootData } = await supabase.functions.invoke('create-chatwoot-agent', {
          body: {
            name: newUserName,
            email: newUserEmail,
            password: tempPass,
            role: 'agent'
          }
        });

        if (chatwootData?.agent) {
          chatwootAgentId = chatwootData.agent.id;
        }
      }

      // Criar usuário no Supabase Auth (via função)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: tempPass,
        email_confirm: true,
        user_metadata: {
          display_name: newUserName,
          password_reset_required: true,
        }
      });

      if (authError) {
        // Tentar via função edge
        const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
          body: {
            email: newUserEmail,
            password: tempPass,
            displayName: newUserName,
            role: newUserRole,
            telemarketingId: newUserTelemarketing,
            departmentId: newUserDepartment,
            projectId: newUserProject,
            supervisorId: newUserSupervisor,
          }
        });

        if (createError) throw createError;
        if (!createData?.userId) throw new Error("Falha ao criar usuário");
      }

      const userId = authData?.user?.id;

      if (userId) {
        // Inserir profile
        await supabase.from('profiles').upsert({
          id: userId,
          email: newUserEmail,
          display_name: newUserName,
        });

        // Inserir role
        await supabase.from('user_roles').upsert({
          user_id: userId,
          role: newUserRole,
        });

        // Se for agent, criar mapeamento
        if (newUserRole === 'agent' && newUserTelemarketing) {
          await supabase.from('agent_telemarketing_mapping').insert({
            tabuladormax_user_id: userId,
            bitrix_telemarketing_id: newUserTelemarketing,
            department_id: newUserDepartment || null,
            commercial_project_id: newUserProject || null,
            supervisor_id: newUserSupervisor || null,
            chatwoot_agent_id: chatwootAgentId,
          });
        }
      }

      toast.success("Usuário criado com sucesso!");
      setTempPassword(tempPass);
      setSelectedUserEmail(newUserEmail);
      setCreateUserDialogOpen(false);
      setPasswordDialogOpen(true);
      resetCreateForm();
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setCreatingUser(false);
    }
  };

  const resetCreateForm = () => {
    setNewUserEmail("");
    setNewUserName("");
    setNewUserRole('agent');
    setNewUserProject("");
    setNewUserDepartment("");
    setNewUserSupervisor("");
    setNewUserTelemarketing(undefined);
  };

  const generateTempPassword = async (userId: string, userEmail: string) => {
    setGeneratingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId }
      });

      if (error) throw error;

      if (data.success) {
        setTempPassword(data.tempPassword);
        setSelectedUserEmail(userEmail);
        setPasswordDialogOpen(true);
        toast.success('Senha temporária gerada com sucesso');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erro ao gerar senha temporária:', error);
      toast.error('Erro ao gerar senha temporária: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGeneratingPassword(false);
    }
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopiedPassword(true);
    toast.success('Senha copiada para área de transferência');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const updateUserRole = async () => {
    setUpdatingName(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: editingUserId, role: newRole }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Role atualizada com sucesso');
      setEditRoleDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast.error('Erro ao atualizar role do usuário');
    } finally {
      setUpdatingName(false);
    }
  };

  const updateUserName = async () => {
    if (!newDisplayName.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    setUpdatingName(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName.trim() })
        .eq('id', editingUserId);

      if (profileError) throw profileError;

      toast.success('Nome atualizado com sucesso');
      setEditNameDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao atualizar nome:', error);
      toast.error('Erro ao atualizar nome: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUpdatingName(false);
    }
  };

  const openEditNameDialog = (userId: string, currentName: string) => {
    setEditingUserId(userId);
    setNewDisplayName(currentName || "");
    setEditNameDialogOpen(true);
  };

  const openEditRoleDialog = (userId: string, currentRole: any) => {
    setEditingUserId(userId);
    setNewRole(currentRole);
    setEditRoleDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    if (filterProject && user.project_id !== filterProject) return false;
    if (filterDepartment && user.department_id !== filterDepartment) return false;
    if (filterRole && user.role !== filterRole) return false;
    return true;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'manager': return 'secondary';
      case 'supervisor': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3 h-3" />;
      case 'manager': return <UsersIcon className="w-3 h-3" />;
      case 'supervisor': return <Building2 className="w-3 h-3" />;
      default: return <UserIcon className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  👥 Gerenciar Usuários
                </h1>
                <p className="text-muted-foreground mt-1">
                  Visualize e gerencie usuários do sistema
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Filtros e Botão Criar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {currentUserRole === 'admin' && (
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os projetos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos departamentos</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setCreateUserDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Total de {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} {filterProject || filterDepartment || filterRole ? 'filtrado(s)' : 'cadastrado(s)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando usuários...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Email</th>
                      <th className="p-3 text-left text-sm font-medium">Nome</th>
                      <th className="p-3 text-left text-sm font-medium">Projeto</th>
                      <th className="p-3 text-left text-sm font-medium">Departamento</th>
                      <th className="p-3 text-left text-sm font-medium">Supervisor</th>
                      <th className="p-3 text-left text-sm font-medium">Telemarketing</th>
                      <th className="p-3 text-left text-sm font-medium">Role</th>
                      <th className="p-3 text-left text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 text-sm">{user.email}</td>
                        <td 
                          className="p-3 text-sm cursor-pointer" 
                          onDoubleClick={() => openEditNameDialog(user.id, user.display_name)}
                          title="Duplo clique para editar"
                        >
                          {user.display_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </td>
                        <td className="p-3 text-sm">
                          {user.project_name || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="p-3 text-sm">
                          {user.department_name || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="p-3 text-sm">
                          {user.supervisor_name || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="p-3 text-sm">
                          {user.telemarketing_name || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td 
                          className="p-3 cursor-pointer" 
                          onDoubleClick={() => currentUserRole === 'admin' && openEditRoleDialog(user.id, user.role)}
                          title={currentUserRole === 'admin' ? "Duplo clique para editar" : ""}
                        >
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            <span className="flex items-center gap-1">
                              {getRoleIcon(user.role)}
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => generateTempPassword(user.id, user.email)}
                            disabled={generatingPassword}
                            className="gap-2"
                          >
                            <Key className="w-4 h-4" />
                            Senha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog: Criar Usuário */}
        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário. Uma senha temporária será gerada automaticamente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={newUserRole} onValueChange={(v: any) => setNewUserRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUserRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                    {(currentUserRole === 'admin' || currentUserRole === 'manager') && <SelectItem value="manager">Manager</SelectItem>}
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newUserRole === 'agent' && (
                <>
                  <div>
                    <Label htmlFor="project">Projeto Comercial *</Label>
                    <Select value={newUserProject} onValueChange={setNewUserProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o projeto" />
                      </SelectTrigger>
                      <SelectContent>
                      {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="department">Departamento *</Label>
                    <Select value={newUserDepartment} onValueChange={setNewUserDepartment} disabled={!newUserProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="supervisor">Supervisor</Label>
                    <Select value={newUserSupervisor || "none"} onValueChange={(val) => setNewUserSupervisor(val === "none" ? "" : val)} disabled={!newUserDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o supervisor (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {supervisors.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="telemarketing">Operador Bitrix *</Label>
                    <TelemarketingSelector
                      value={newUserTelemarketing}
                      onChange={setNewUserTelemarketing}
                      disabled={creatingUser}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingUser}>
                  {creatingUser ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: Resetar Senha */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Senha Temporária</DialogTitle>
              <DialogDescription>
                Senha temporária para o usuário <strong>{selectedUserEmail}</strong>.
                Esta senha deve ser utilizada para o primeiro acesso.
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                {tempPassword}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyPasswordToClipboard}
                  disabled={copiedPassword}
                >
                  {copiedPassword ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={() => setPasswordDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Editar Nome */}
        <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Nome</DialogTitle>
              <DialogDescription>
                Altere o nome do usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Novo nome
                </Label>
                <Input
                  id="name"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setEditNameDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateUserName} disabled={updatingName}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Editar Role */}
        <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Role</DialogTitle>
              <DialogDescription>
                Altere a role do usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Nova Role
                </Label>
                <Select value={newRole} onValueChange={setNewRole} >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateUserRole} disabled={updatingName}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
