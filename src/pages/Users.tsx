import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, User as UserIcon, Key, Copy, Check, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UserMenu from "@/components/UserMenu";
interface UserWithRole {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  role: 'admin' | 'agent';
  telemarketing_name?: string;
  telemarketing_id?: number;
}
export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'agent'>('agent');
  useEffect(() => {
    checkUserRole();
    loadUsers();
  }, []);
  const checkUserRole = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    const {
      data
    } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
    const userIsAdmin = data?.role === 'admin';
    setIsAdmin(userIsAdmin);
    if (!userIsAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/dashboard');
    }
  };
  const loadUsers = async () => {
    setLoading(true);
    const {
      data: profiles,
      error: profilesError
    } = await supabase.from('profiles').select('id, email, display_name, created_at').order('created_at', {
      ascending: false
    });
    if (profilesError) {
      toast.error('Erro ao carregar usuários');
      setLoading(false);
      return;
    }

    // Buscar roles e mapeamentos de cada usuário
    const usersWithRoles: UserWithRole[] = [];
    for (const profile of profiles || []) {
      const {
        data: roleData
      } = await supabase.from('user_roles').select('role').eq('user_id', profile.id).maybeSingle();

      // Buscar mapeamento de telemarketing
      const {
        data: mappingData
      } = await supabase.from('agent_telemarketing_mapping').select('bitrix_telemarketing_name, bitrix_telemarketing_id').eq('tabuladormax_user_id', profile.id).maybeSingle();
      usersWithRoles.push({
        ...profile,
        role: roleData?.role as 'admin' | 'agent' || 'agent',
        telemarketing_name: mappingData?.bitrix_telemarketing_name,
        telemarketing_id: mappingData?.bitrix_telemarketing_id
      });
    }
    setUsers(usersWithRoles);
    setLoading(false);
  };
  const updateUserRole = async () => {
    setUpdatingName(true);
    try {
      // UPSERT em vez de DELETE + INSERT para evitar duplicatas
      const {
        error
      } = await supabase.from('user_roles').upsert({
        user_id: editingUserId,
        role: newRole
      }, {
        onConflict: 'user_id'
      });
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
  const generateTempPassword = async (userId: string, userEmail: string) => {
    setGeneratingPassword(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId
        }
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
  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setTempPassword("");
    setSelectedUserEmail("");
    setCopiedPassword(false);
  };
  const openEditNameDialog = (userId: string, currentName: string) => {
    setEditingUserId(userId);
    setNewDisplayName(currentName || "");
    setEditNameDialogOpen(true);
  };

  const openEditRoleDialog = (userId: string, currentRole: 'admin' | 'agent') => {
    setEditingUserId(userId);
    setNewRole(currentRole);
    setEditRoleDialogOpen(true);
  };
  const updateUserName = async () => {
    if (!newDisplayName.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }
    setUpdatingName(true);
    try {
      // Atualizar tabela profiles
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        display_name: newDisplayName.trim()
      }).eq('id', editingUserId);
      if (profileError) throw profileError;

      // Sincronizar nome com Chatwoot
      try {
        const { data: mappingData } = await supabase
          .from('agent_telemarketing_mapping')
          .select('chatwoot_agent_id')
          .eq('tabuladormax_user_id', editingUserId)
          .maybeSingle();
        
        if (mappingData?.chatwoot_agent_id) {
          console.log('📝 Atualizando nome no Chatwoot');
          
          const { error: chatwootError } = await supabase.functions.invoke(
            'update-chatwoot-agent',
            {
              body: {
                agentId: mappingData.chatwoot_agent_id,
                name: newDisplayName.trim()
              }
            }
          );
          
          if (chatwootError) {
            console.warn('⚠️ Erro ao atualizar nome no Chatwoot:', chatwootError);
            toast.warning('Nome atualizado no TabuladorMax, mas falhou no Chatwoot');
          } else {
            console.log('✅ Nome atualizado no Chatwoot');
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao sincronizar nome com Chatwoot:', error);
      }

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
  return <div className="min-h-screen bg-background">
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
                  Visualize e edite roles dos usuários cadastrados
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Total de {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : users.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p> : <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Email</th>
                      <th className="p-3 text-left text-sm font-medium">Nome </th>
                      <th className="p-3 text-left text-sm font-medium">Telemarketing</th>
                      <th className="p-3 text-left text-sm font-medium">Role</th>
                      <th className="p-3 text-left text-sm font-medium">Cadastro</th>
                      
                      <th className="p-3 text-left text-sm font-medium">Senha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3 text-sm">{user.email}</td>
                        <td className="p-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => isAdmin && openEditNameDialog(user.id, user.display_name)} title={isAdmin ? "Duplo clique para editar" : ""}>
                          {user.display_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </td>
                        <td className="p-3 text-sm">
                          {user.telemarketing_name ? <span className="text-foreground">{user.telemarketing_name}</span> : <span className="text-muted-foreground italic">Não vinculado</span>}
                        </td>
                        <td className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => isAdmin && openEditRoleDialog(user.id, user.role)} title={isAdmin ? "Duplo clique para editar" : ""}>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span> : <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                Agente
                              </span>}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          {isAdmin && <Button size="sm" variant="outline" onClick={() => generateTempPassword(user.id, user.email)} disabled={generatingPassword} className="gap-2">
                              <Key className="w-4 h-4" />
                              Gerar Senha
                            </Button>}
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}
          </CardContent>
        </Card>

        <Dialog open={passwordDialogOpen} onOpenChange={closePasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Senha Temporária Gerada
              </DialogTitle>
              <DialogDescription>
                Esta senha é válida apenas uma vez. O usuário deverá alterá-la no primeiro login.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Usuário: {selectedUserEmail}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md text-lg font-mono select-all">
                        {tempPassword}
                      </code>
                      <Button size="sm" variant="outline" onClick={copyPasswordToClipboard} className="gap-2">
                        {copiedPassword ? <>
                            <Check className="w-4 h-4" />
                            Copiado
                          </> : <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  <strong>⚠️ Importante:</strong> Guarde esta senha em local seguro. 
                  Ela não poderá ser visualizada novamente após fechar esta janela.
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>📋 Instruções para o usuário:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Faça login com esta senha temporária</li>
                    <li>O sistema solicitará que você crie uma nova senha</li>
                    <li>Defina uma senha segura de sua escolha</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={closePasswordDialog}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Editar Nome do Usuário
              </DialogTitle>
              <DialogDescription>
                Atualize o nome de exibição do usuário. Esta alteração será refletida em todo o sistema.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Novo Nome</label>
                <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="Digite o novo nome" className="mt-2" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateUserName} disabled={updatingName}>
                {updatingName ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Editar Role do Usuário
              </DialogTitle>
              <DialogDescription>
                Altere a função do usuário no sistema. Admins têm acesso completo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nova Role</label>
                <select 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value as 'admin' | 'agent')}
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                >
                  <option value="admin">Admin</option>
                  <option value="agent">Agente</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateUserRole} disabled={updatingName}>
                {updatingName ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>;
}