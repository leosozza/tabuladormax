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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UserMenu from "@/components/UserMenu";
import { TelemarketingSelector } from "@/components/TelemarketingSelector";
import { CommercialProjectBitrixSelector } from "@/components/CommercialProjectBitrixSelector";

interface UserWithRole {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  role: 'admin' | 'manager' | 'supervisor' | 'agent';
  telemarketing_name?: string;
  telemarketing_id?: number;
  project_name?: string;
  project_id?: string;
  supervisor_name?: string;
  supervisor_id?: string;
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
  
  // Edit supervisor
  const [editSupervisorDialogOpen, setEditSupervisorDialogOpen] = useState(false);
  const [editingSupervisorUserId, setEditingSupervisorUserId] = useState("");
  const [editingSupervisorProjectId, setEditingSupervisorProjectId] = useState("");
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [editSupervisorOptions, setEditSupervisorOptions] = useState<UserWithRole[]>([]);
  const [updatingSupervisor, setUpdatingSupervisor] = useState(false);
  
  // Edit project
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
  const [editingProjectUserId, setEditingProjectUserId] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null);
  
  // Data for dropdowns
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [supervisors, setSupervisors] = useState<UserWithRole[]>([]);
  
  // Filters
  const [filterProject, setFilterProject] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Batch edit
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false);
  const [batchEditField, setBatchEditField] = useState<'project' | 'supervisor'>('project');
  const [batchEditValue, setBatchEditValue] = useState("");
  const [batchEditLoading, setBatchEditLoading] = useState(false);
  const [batchEditSupervisors, setBatchEditSupervisors] = useState<UserWithRole[]>([]);

  useEffect(() => {
    checkUserRole();
    loadCommercialProjects();
    loadUsers();
  }, []);

  useEffect(() => {
    if (newUserRole === 'agent' && newUserProject) {
      loadSupervisors(newUserProject);
    } else {
      setSupervisors([]);
    }
  }, [newUserProject, newUserRole]);

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

  const loadCommercialProjects = async () => {
    const { data } = await supabase
      .from('commercial_projects')
      .select('id, name')
      .eq('active', true)
      .order('name');

    setProjects(data || []);
  };

  const loadSupervisors = async (projectId: string) => {
    if (!projectId) {
      setSupervisors([]);
      return;
    }

    // Buscar mappings de supervisores do projeto (supervisor_id = null indica que é supervisor)
    const { data: mappings } = await supabase
      .from('agent_telemarketing_mapping')
      .select('tabuladormax_user_id')
      .eq('commercial_project_id', projectId)
      .is('supervisor_id', null);

    if (!mappings || mappings.length === 0) {
      setSupervisors([]);
      return;
    }

    const userIds = [...new Set(mappings.map(m => m.tabuladormax_user_id).filter(Boolean))];

    // Buscar apenas usuários com role 'supervisor'
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'supervisor')
      .in('user_id', userIds);

    if (!userRoles || userRoles.length === 0) {
      setSupervisors([]);
      return;
    }

    const supervisorIds = userRoles.map(ur => ur.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', supervisorIds);

    if (!profiles) {
      setSupervisors([]);
      return;
    }

    const supervisorsData = profiles.map(p => ({
      ...p,
      role: 'supervisor' as const,
      created_at: '',
    }));

    setSupervisors(supervisorsData as any);
  };

  const loadSupervisorsForEdit = async (projectId: string) => {
    console.log('🔍 [loadSupervisorsForEdit] Iniciando com projectId:', projectId);
    
    if (!projectId) {
      console.log('❌ [loadSupervisorsForEdit] Sem projeto selecionado');
      setEditSupervisorOptions([]);
      return;
    }

    // PASSO 1: Buscar mappings de supervisores do projeto
    console.log('📋 [loadSupervisorsForEdit] Buscando mappings no projeto:', projectId);
    const { data: mappings, error: mappingsError } = await supabase
      .from('agent_telemarketing_mapping')
      .select('tabuladormax_user_id')
      .eq('commercial_project_id', projectId)
      .is('supervisor_id', null);

    console.log('📋 [loadSupervisorsForEdit] Mappings encontrados:', mappings);
    console.log('📋 [loadSupervisorsForEdit] Erro nos mappings:', mappingsError);

    if (!mappings || mappings.length === 0) {
      console.log('❌ [loadSupervisorsForEdit] Nenhum mapping encontrado');
      setEditSupervisorOptions([]);
      return;
    }

    // PASSO 2: Extrair user IDs únicos
    const userIds = [...new Set(mappings.map(m => m.tabuladormax_user_id).filter(Boolean))];
    console.log('👥 [loadSupervisorsForEdit] User IDs extraídos:', userIds);

    // PASSO 3: Buscar apenas usuários com role 'supervisor'
    console.log('👔 [loadSupervisorsForEdit] Buscando user_roles com role=supervisor');
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'supervisor')
      .in('user_id', userIds);

    console.log('👔 [loadSupervisorsForEdit] User roles encontrados:', userRoles);
    console.log('👔 [loadSupervisorsForEdit] Erro nos roles:', rolesError);

    if (!userRoles || userRoles.length === 0) {
      console.log('❌ [loadSupervisorsForEdit] Nenhum supervisor encontrado');
      setEditSupervisorOptions([]);
      return;
    }

    // PASSO 4: Extrair IDs dos supervisores
    const supervisorIds = userRoles.map(ur => ur.user_id);
    console.log('✅ [loadSupervisorsForEdit] Supervisor IDs:', supervisorIds);

    // PASSO 5: Buscar perfis dos supervisores
    console.log('📇 [loadSupervisorsForEdit] Buscando profiles');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', supervisorIds);

    console.log('📇 [loadSupervisorsForEdit] Profiles carregados:', profiles);
    console.log('📇 [loadSupervisorsForEdit] Erro nos profiles:', profilesError);

    if (!profiles) {
      console.log('❌ [loadSupervisorsForEdit] Erro ao carregar profiles');
      setEditSupervisorOptions([]);
      return;
    }

    // PASSO 6: Formatar dados
    const supervisorsData = profiles.map(p => ({
      ...p,
      role: 'supervisor' as const,
      created_at: '',
    }));

    console.log('✅ [loadSupervisorsForEdit] setSupervisors chamado com:', supervisorsData);
    console.log('✅ [loadSupervisorsForEdit] Total de supervisores:', supervisorsData.length);
    setEditSupervisorOptions(supervisorsData as any);
  };

  const handleSyncProjects = async () => {
    const loading = toast.loading('Sincronizando projetos do Bitrix...');
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-bitrix-commercial-projects');
      
      if (error) throw error;
      
      toast.success(`✅ ${data.processed} projetos sincronizados com sucesso!`, { id: loading });
      
      // Recarregar projetos após sincronização
      await loadCommercialProjects();
    } catch (error) {
      toast.error('Erro ao sincronizar projetos', { id: loading });
      console.error(error);
    }
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

      // Buscar mapeamento de telemarketing e projeto comercial
      const { data: mappingData } = await supabase
        .from('agent_telemarketing_mapping')
        .select(`
          bitrix_telemarketing_name,
          bitrix_telemarketing_id,
          commercial_project_id,
          supervisor_id
        `)
        .eq('tabuladormax_user_id', profile.id)
        .maybeSingle();

      let projectName, supervisorName;

      if (mappingData?.commercial_project_id) {
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
        project_name: projectName,
        project_id: (mappingData as any)?.commercial_project_id,
        supervisor_name: supervisorName,
        supervisor_id: (mappingData as any)?.supervisor_id,
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

    // Validação para supervisor criando agente
    if (currentUserRole === 'supervisor' && newUserRole === 'agent') {
      if (!newUserProject) {
        toast.error("Selecione um Projeto Comercial para o agente");
        return;
      }
      if (!newUserTelemarketing) {
        toast.error("Selecione um Operador Bitrix para o agente");
        return;
      }
    }

    // Validação para supervisor
    if (newUserRole === 'supervisor' && !newUserProject) {
      toast.error("Selecione um Projeto Comercial para o supervisor");
      return;
    }

    // Validação para agent criado por admin
    if (currentUserRole === 'admin' && newUserRole === 'agent') {
      if (!newUserProject) {
        toast.error("Selecione um Projeto Comercial para o agente");
        return;
      }
      if (!newUserSupervisor) {
        toast.error("Selecione um Supervisor para o agente");
        return;
      }
      if (!newUserTelemarketing) {
        toast.error("Selecione um Operador Bitrix para o agente");
        return;
      }
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

        // Criar mapeamento para SUPERVISOR
        if (newUserRole === 'supervisor' && newUserProject) {
          const { error: mappingError } = await supabase
            .from('agent_telemarketing_mapping')
            .insert({
              tabuladormax_user_id: userId,
              bitrix_telemarketing_id: 0,
              bitrix_telemarketing_name: newUserName,
              commercial_project_id: newUserProject,
              supervisor_id: null, // Supervisor não tem supervisor
            });

          if (mappingError) {
            console.error('Erro ao criar mapeamento do supervisor:', mappingError);
            toast.error('Erro ao vincular supervisor ao projeto');
          }
        }

        // Criar mapeamento para AGENT
        if (newUserRole === 'agent' && newUserTelemarketing && newUserProject) {
          // Se supervisor está criando, usar seu próprio ID automaticamente
          let supervisorId = newUserSupervisor;
          
          if (currentUserRole === 'supervisor') {
            const { data: { user } } = await supabase.auth.getUser();
            supervisorId = user?.id || '';
          }

          if (!supervisorId) {
            toast.error('Supervisor não definido');
            setCreatingUser(false);
            return;
          }

          const { error: mappingError } = await supabase
            .from('agent_telemarketing_mapping')
            .insert({
              tabuladormax_user_id: userId,
              bitrix_telemarketing_id: newUserTelemarketing,
              commercial_project_id: newUserProject,
              supervisor_id: supervisorId,
              chatwoot_agent_id: chatwootAgentId,
            });

          if (mappingError) {
            console.error('Erro ao criar mapeamento do agente:', mappingError);
            toast.error('Erro ao vincular agente ao supervisor');
          }
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
    // Inicializar como 'agent' se for supervisor
    setNewUserRole(currentUserRole === 'supervisor' ? 'agent' : 'agent');
    setNewUserProject("");
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja deletar o usuário ${userEmail}?\n\nEsta ação irá:\n- Remover o usuário do sistema\n- Remover todos os mapeamentos\n- Esta ação é IRREVERSÍVEL!`)) {
      return;
    }

    const loading = toast.loading('Deletando usuário...');
    
    try {
      // 1. Deletar mapeamento
      const { error: mappingError } = await supabase
        .from('agent_telemarketing_mapping')
        .delete()
        .eq('tabuladormax_user_id', userId);

      if (mappingError) console.warn('Aviso ao deletar mapeamento:', mappingError);

      // 2. Deletar role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) console.warn('Aviso ao deletar role:', roleError);

      // 3. Deletar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) console.warn('Aviso ao deletar profile:', profileError);

      // 4. Deletar do Auth (via admin API)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;

      toast.success('✅ Usuário deletado com sucesso', { id: loading });
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário: ' + (error.message || 'Erro desconhecido'), { id: loading });
    }
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

  const updateUserSupervisor = async () => {
    if (!newSupervisorId) {
      toast.error('Selecione um supervisor');
      return;
    }

    setUpdatingSupervisor(true);
    try {
      const { error } = await supabase
        .from('agent_telemarketing_mapping')
        .update({ supervisor_id: newSupervisorId })
        .eq('tabuladormax_user_id', editingSupervisorUserId);

      if (error) throw error;
      
      toast.success('Supervisor atualizado com sucesso');
      setEditSupervisorDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar supervisor:', error);
      toast.error('Erro ao atualizar supervisor do agente');
    } finally {
      setUpdatingSupervisor(false);
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

  const openEditProjectDialog = (user: UserWithRole) => {
    console.log('🚀 [openEditProjectDialog] Usuário:', user);

    if (!['agent', 'supervisor'].includes(user.role)) {
      toast.error('Apenas agentes e supervisores têm projeto vinculado');
      return;
    }

    setEditingProjectUserId(user.id);
    setNewProjectId(user.project_id || "");
    setPendingProjectName(null);
    setEditProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    // Se tem um projeto pendente de criação
    if (pendingProjectName && newProjectId === '-1') {
      console.log('✨ Criando novo projeto no Bitrix:', pendingProjectName);
      
      try {
        const { data, error } = await supabase.functions.invoke('create-bitrix-commercial-project', {
          body: { title: pendingProjectName }
        });

        if (error) throw error;
        if (!data?.result?.id) throw new Error('Bitrix não retornou ID do projeto');

        const bitrixId = data.result.id;
        
        // Buscar o projeto recém-criado no Supabase
        const { data: projectData } = await supabase
          .from('commercial_projects')
          .select('id')
          .eq('code', bitrixId.toString())
          .maybeSingle();

        if (!projectData) {
          toast.error('Erro ao vincular projeto criado');
          return;
        }

        // Atualizar com o ID real do Supabase
        const { error: mappingError } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: projectData.id })
          .eq('tabuladormax_user_id', editingProjectUserId);

        if (mappingError) throw mappingError;

        toast.success(`✅ Projeto "${pendingProjectName}" criado e vinculado!`);
        setEditProjectDialogOpen(false);
        setPendingProjectName(null);
        loadUsers();
        loadCommercialProjects();
        return;
      } catch (error) {
        console.error('Erro ao criar projeto:', error);
        toast.error('Erro ao criar projeto no Bitrix');
        return;
      }
    }

    // Projeto existente
    if (!newProjectId || newProjectId === '-1') {
      toast.error('Selecione um projeto válido');
      return;
    }

    try {
      // Buscar informações do usuário que está sendo editado
      const { data: userData, error: userError } = await supabase
        .from('agent_telemarketing_mapping')
        .select('supervisor_id, tabuladormax_user_id')
        .eq('tabuladormax_user_id', editingProjectUserId)
        .single();

      if (userError) throw userError;

      const userRole = users.find(u => u.id === editingProjectUserId)?.role;

      if (userRole === 'agent' && userData.supervisor_id) {
        // Atualizar o agente
        const { error: agentError } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: newProjectId })
          .eq('tabuladormax_user_id', editingProjectUserId);

        if (agentError) throw agentError;

        // Atualizar todos os agentes do mesmo supervisor
        const { error: teamError } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: newProjectId })
          .eq('supervisor_id', userData.supervisor_id);

        if (teamError) throw teamError;

        // Atualizar o supervisor
        const { error: supervisorError } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: newProjectId })
          .eq('tabuladormax_user_id', userData.supervisor_id);

        if (supervisorError) throw supervisorError;

        toast.success('✅ Projeto atualizado para toda a equipe!');
      } else if (userRole === 'supervisor') {
        // Atualizar o supervisor
        const { error: supervisorError } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: newProjectId })
          .eq('tabuladormax_user_id', editingProjectUserId);

        if (supervisorError) throw supervisorError;

        // Atualizar todos os agentes deste supervisor
        const { error: agentsError } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: newProjectId })
          .eq('supervisor_id', editingProjectUserId);

        if (agentsError) throw agentsError;

        toast.success('✅ Projeto atualizado para toda a equipe!');
      } else {
        // Fallback para outros casos (admin, manager, etc.)
        const { error } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: newProjectId })
          .eq('tabuladormax_user_id', editingProjectUserId);

        if (error) throw error;

        toast.success('✅ Projeto atualizado com sucesso!');
      }

      setEditProjectDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      toast.error('Erro ao atualizar projeto');
    }
  };

  const openEditSupervisorDialog = async (user: UserWithRole) => {
    console.log('🚀 [openEditSupervisorDialog] Iniciando para usuário:', {
      id: user.id,
      name: user.display_name,
      role: user.role,
      project_id: user.project_id,
      supervisor_id: user.supervisor_id
    });

    // Só permitir editar supervisor de agentes
    if (user.role !== 'agent') {
      console.log('❌ [openEditSupervisorDialog] Usuário não é agent');
      toast.error('Apenas agentes podem ter supervisor alterado');
      return;
    }

    if (!user.project_id) {
      console.log('❌ [openEditSupervisorDialog] Agente sem projeto vinculado');
      toast.error('Agente sem projeto vinculado');
      return;
    }

    setEditingSupervisorUserId(user.id);
    setEditingSupervisorProjectId(user.project_id);
    setNewSupervisorId(user.supervisor_id || "");
    setEditSupervisorDialogOpen(true);
    
    console.log('🔄 [openEditSupervisorDialog] Chamando loadSupervisorsForEdit...');
    await loadSupervisorsForEdit(user.project_id);
    console.log('✅ [openEditSupervisorDialog] loadSupervisorsForEdit concluído');
  };

  const filteredUsers = users.filter(user => {
    if (filterProject && filterProject !== "all" && user.project_id !== filterProject) return false;
    if (filterRole && filterRole !== "all" && user.role !== filterRole) return false;
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

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const openBatchEditDialog = () => {
    if (selectedUserIds.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }
    setBatchEditField('project');
    setBatchEditValue("");
    setBatchEditSupervisors([]);
    setBatchEditDialogOpen(true);
  };

  const handleBatchEditFieldChange = async (field: 'project' | 'supervisor') => {
    setBatchEditField(field);
    setBatchEditValue("");
    
    // Se escolheu supervisor, carregar supervisores disponíveis
    if (field === 'supervisor') {
      // Verificar se todos usuários selecionados são agents e tem o mesmo projeto
      const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
      const allAgents = selectedUsers.every(u => u.role === 'agent');
      
      if (!allAgents) {
        toast.error('Apenas agentes podem ter supervisor alterado');
        return;
      }

      const projects = new Set(selectedUsers.map(u => u.project_id).filter(Boolean));
      if (projects.size !== 1) {
        toast.error('Todos os usuários selecionados devem estar no mesmo projeto');
        return;
      }

      const projectId = Array.from(projects)[0] as string;
      await loadSupervisorsForBatchEdit(projectId);
    }
  };

  const loadSupervisorsForBatchEdit = async (projectId: string) => {
    if (!projectId) {
      setBatchEditSupervisors([]);
      return;
    }

    const { data: mappings } = await supabase
      .from('agent_telemarketing_mapping')
      .select('tabuladormax_user_id')
      .eq('commercial_project_id', projectId)
      .is('supervisor_id', null);

    if (!mappings || mappings.length === 0) {
      setBatchEditSupervisors([]);
      return;
    }

    const userIds = [...new Set(mappings.map(m => m.tabuladormax_user_id).filter(Boolean))];

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'supervisor')
      .in('user_id', userIds);

    if (!userRoles || userRoles.length === 0) {
      setBatchEditSupervisors([]);
      return;
    }

    const supervisorIds = userRoles.map(ur => ur.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', supervisorIds);

    if (!profiles) {
      setBatchEditSupervisors([]);
      return;
    }

    const supervisorsData = profiles.map(p => ({
      ...p,
      role: 'supervisor' as const,
      created_at: '',
    }));

    setBatchEditSupervisors(supervisorsData as UserWithRole[]);
  };

  const handleBatchEdit = async () => {
    if (!batchEditValue) {
      toast.error('Selecione um valor');
      return;
    }

    // Verificar permissões
    if (batchEditField === 'supervisor' && currentUserRole !== 'admin' && currentUserRole !== 'manager') {
      toast.error('Apenas administradores e gerentes podem alterar supervisores em lote');
      return;
    }

    if (batchEditField === 'project') {
      if (currentUserRole !== 'admin' && currentUserRole !== 'manager' && currentUserRole !== 'supervisor') {
        toast.error('Sem permissão para alterar projetos');
        return;
      }
    }

    setBatchEditLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      
      if (batchEditField === 'project') {
        const { error } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ commercial_project_id: batchEditValue })
          .in('tabuladormax_user_id', userIds);

        if (error) throw error;
        
        toast.success(`✅ Projeto atualizado para ${userIds.length} usuário(s)`);
      } else if (batchEditField === 'supervisor') {
        const { error } = await supabase
          .from('agent_telemarketing_mapping')
          .update({ supervisor_id: batchEditValue })
          .in('tabuladormax_user_id', userIds);

        if (error) throw error;
        
        toast.success(`✅ Supervisor atualizado para ${userIds.length} usuário(s)`);
      }

      setBatchEditDialogOpen(false);
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao editar em lote:', error);
      toast.error('Erro ao editar em lote: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setBatchEditLoading(false);
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
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSyncProjects}
                variant="outline"
                className="flex items-center gap-2"
              >
                🔄 Sincronizar Projetos
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Filtros e Botão Criar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {currentUserRole === 'admin' && (
              <Select value={filterProject || "all"} onValueChange={(v) => setFilterProject(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterRole || "all"} onValueChange={(v) => setFilterRole(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as funções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            {selectedUserIds.size > 0 && (
              <Button onClick={openBatchEditDialog} variant="secondary">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar em lote ({selectedUserIds.size})
              </Button>
            )}
            <Button onClick={() => setCreateUserDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Total de {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} {filterProject || filterRole ? 'filtrado(s)' : 'cadastrado(s)'}
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
                      <th className="p-3 text-left w-12">
                        <Checkbox
                          checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="p-3 text-left text-sm font-medium">Email</th>
                      <th className="p-3 text-left text-sm font-medium">Nome</th>
                      <th className="p-3 text-left text-sm font-medium">Projeto</th>
                      <th className="p-3 text-left text-sm font-medium">Supervisor</th>
                      <th className="p-3 text-left text-sm font-medium">Telemarketing</th>
                      <th className="p-3 text-left text-sm font-medium">Função</th>
                      <th className="p-3 text-left text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </td>
                        <td className="p-3 text-sm">{user.email}</td>
                        <td 
                          className="p-3 text-sm cursor-pointer" 
                          onDoubleClick={() => openEditNameDialog(user.id, user.display_name)}
                          title="Duplo clique para editar"
                        >
                          {user.display_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </td>
                         <td 
                           className="p-3 text-sm cursor-pointer hover:bg-muted/30" 
                           onDoubleClick={() => ['agent', 'supervisor'].includes(user.role) && openEditProjectDialog(user)}
                           title={['agent', 'supervisor'].includes(user.role) ? "Duplo clique para editar" : ""}
                         >
                           {user.project_name || <span className="text-muted-foreground">-</span>}
                         </td>
                         <td 
                           className="p-3 text-sm cursor-pointer" 
                           onDoubleClick={() => user.role === 'agent' && openEditSupervisorDialog(user)}
                           title={user.role === 'agent' ? "Duplo clique para editar" : ""}
                         >
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
                          <div className="flex gap-2">
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
                            {/* ✅ FASE 4: Adicionar botão de deletar usuário */}
                            {currentUserRole === 'admin' && (
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                title="Deletar usuário permanentemente"
                                className="gap-2"
                              >
                                <UserIcon className="w-4 h-4" />
                                Deletar
                              </Button>
                            )}
                          </div>
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
                <Label htmlFor="role">Função *</Label>
                <Select 
                  value={newUserRole} 
                  onValueChange={(v: any) => setNewUserRole(v)}
                  disabled={currentUserRole === 'supervisor'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUserRole === 'supervisor' ? (
                      <SelectItem value="agent">Agent</SelectItem>
                    ) : (
                      <>
                        {currentUserRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                        {(currentUserRole === 'admin' || currentUserRole === 'manager') && <SelectItem value="manager">Manager</SelectItem>}
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Projeto para SUPERVISOR e AGENT */}
              {(newUserRole === 'supervisor' || newUserRole === 'agent') && (
                <div>
                  <Label htmlFor="project">
                    Projeto Comercial (Bitrix) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={newUserProject} onValueChange={setNewUserProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seleção de Supervisor e Operador apenas para AGENT */}
              {newUserRole === 'agent' && (
                <>
                  {/* Seleção de Supervisor (apenas para Admin) */}
                  {currentUserRole === 'admin' && (
                    <div>
                      <Label htmlFor="supervisor">
                        Supervisor <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={newUserSupervisor} 
                        onValueChange={setNewUserSupervisor}
                        disabled={!newUserProject || supervisors.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !newUserProject 
                              ? "Selecione primeiro um projeto" 
                              : supervisors.length === 0 
                              ? "Nenhum supervisor neste projeto" 
                              : "Selecione o supervisor"
                          } />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          {supervisors.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.display_name || s.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Info para Supervisor criando Agent */}
                  {currentUserRole === 'supervisor' && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      ℹ️ O agente será automaticamente vinculado a você como supervisor
                    </div>
                  )}

                  <div>
                    <Label htmlFor="telemarketing">
                      Operador Bitrix <span className="text-red-500">*</span>
                    </Label>
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

        {/* Dialog: Editar Função (Role) */}
        <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Função</DialogTitle>
              <DialogDescription>
                Altere a função (role) do usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Nova Função
                </Label>
                <Select value={newRole} onValueChange={(value: any) => setNewRole(value)} >
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

        {/* Dialog: Editar Supervisor */}
        <Dialog open={editSupervisorDialogOpen} onOpenChange={setEditSupervisorDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>✏️ Editar Supervisor</DialogTitle>
              <DialogDescription>
                Selecione o novo supervisor para este agente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Debug info */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <strong>Debug Info:</strong>
                <div>Projeto: {editingSupervisorProjectId}</div>
                <div>Supervisor atual: {newSupervisorId || 'Nenhum'}</div>
                <div>Supervisores disponíveis: {editSupervisorOptions.length}</div>
                {editSupervisorOptions.length > 0 && (
                  <div>Supervisores: {editSupervisorOptions.map(s => s.display_name || s.email).join(', ')}</div>
                )}
                {editSupervisorOptions.length > 0 && (
                  <div className="mt-2">
                    <strong>IDs disponíveis:</strong>
                    {editSupervisorOptions.map(s => (
                      <div key={s.id} className="ml-2">- {s.id}: {s.display_name}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supervisor" className="text-right">
                  Novo Supervisor
                </Label>
                <Select 
                  key={`supervisor-select-${editSupervisorOptions.length}`}
                  value={newSupervisorId} 
                  onValueChange={(value) => {
                    console.log('🎯 [Select] onValueChange:', value);
                    setNewSupervisorId(value);
                  }}
                  disabled={editSupervisorOptions.length === 0}
                  open={editSupervisorOptions.length > 0 ? undefined : false}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={
                      editSupervisorOptions.length === 0
                        ? "Nenhum supervisor disponível"
                        : "Selecione o supervisor"
                    } />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-card border border-border"
                    style={{ zIndex: 9999 }}
                    position="popper"
                    sideOffset={4}
                  >
                    {editSupervisorOptions.map((s, idx) => {
                      console.log(`📝 [Select] Renderizando item ${idx}:`, s.id, s.display_name);
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.display_name || s.email}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditSupervisorDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={updateUserSupervisor} 
                disabled={updatingSupervisor || !newSupervisorId}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Editar Projeto Comercial */}
        <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>✏️ Editar Projeto Comercial</DialogTitle>
              <DialogDescription>
                Busque e selecione o novo projeto comercial no Bitrix.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">
                  Novo Projeto
                </Label>
                <div className="col-span-3">
                  <CommercialProjectBitrixSelector
                    value={newProjectId}
                    onChange={setNewProjectId}
                    onPendingCreate={setPendingProjectName}
                    placeholder="Buscar projeto no Bitrix"
                  />
                </div>
              </div>
              
              {pendingProjectName && (
                <Alert>
                  <AlertDescription>
                    ✨ Novo projeto <strong>"{pendingProjectName}"</strong> será criado no Bitrix ao salvar.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditProjectDialogOpen(false);
                  setPendingProjectName(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveProject}
                disabled={!newProjectId}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edição em Lote */}
        <Dialog open={batchEditDialogOpen} onOpenChange={setBatchEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>📝 Editar em Lote</DialogTitle>
              <DialogDescription>
                Selecione o campo e o novo valor para aplicar em {selectedUserIds.size} usuário(s) selecionado(s).
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campo a editar</Label>
                <Select 
                  value={batchEditField} 
                  onValueChange={(v: 'project' | 'supervisor') => handleBatchEditFieldChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Projeto Comercial</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Novo valor</Label>
                {batchEditField === 'project' ? (
                  <Select value={batchEditValue} onValueChange={setBatchEditValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select 
                    value={batchEditValue} 
                    onValueChange={setBatchEditValue}
                    disabled={batchEditSupervisors.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        batchEditSupervisors.length === 0
                          ? "Nenhum supervisor disponível"
                          : "Selecione o supervisor"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {batchEditSupervisors.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.display_name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {batchEditField === 'supervisor' && batchEditSupervisors.length === 0 && (
                <Alert>
                  <AlertDescription>
                    ⚠️ Todos os usuários selecionados devem ser agentes do mesmo projeto para editar supervisor em lote.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setBatchEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleBatchEdit}
                disabled={batchEditLoading || !batchEditValue}
              >
                {batchEditLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
