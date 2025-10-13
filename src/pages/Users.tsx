import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UserMenu from "@/components/UserMenu";
import { getChatwootAgents, type ChatwootAgent } from "@/lib/chatwoot";
import { getBitrixOperators, type BitrixOperator } from "@/lib/bitrix";

interface UserWithRole {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  role: 'admin' | 'agent';
  chatwoot_agent_id?: number | null;
  bitrix_operator_id?: string | null;
}

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatwootAgents, setChatwootAgents] = useState<ChatwootAgent[]>([]);
  const [bitrixOperators, setBitrixOperators] = useState<BitrixOperator[]>([]);

  useEffect(() => {
    checkUserRole();
    loadUsers();
    loadChatwootAgents();
    loadBitrixOperators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .single();

    const userIsAdmin = data?.role === 'admin';
    setIsAdmin(userIsAdmin);

    if (!userIsAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta página.');
      navigate('/dashboard');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at, chatwoot_agent_id, bitrix_operator_id')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Erro ao carregar usuários');
      setLoading(false);
      return;
    }

    // Buscar roles de cada usuário
    const usersWithRoles: UserWithRole[] = [];
    for (const profile of profiles || []) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .maybeSingle();

      usersWithRoles.push({
        ...profile,
        role: (roleData?.role as 'admin' | 'agent') || 'agent',
        chatwoot_agent_id: profile.chatwoot_agent_id,
        bitrix_operator_id: profile.bitrix_operator_id
      });
    }

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'agent') => {
    try {
      // Deletar role antiga
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Inserir nova role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      toast.success('Role atualizada com sucesso');
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast.error('Erro ao atualizar role do usuário');
    }
  };

  const loadChatwootAgents = async () => {
    try {
      const agents = await getChatwootAgents();
      setChatwootAgents(agents);
    } catch (error) {
      console.error('Erro ao carregar agentes do Chatwoot:', error);
      toast.error('Erro ao carregar agentes do Chatwoot');
    }
  };

  const loadBitrixOperators = async () => {
    try {
      const operators = await getBitrixOperators();
      setBitrixOperators(operators);
    } catch (error) {
      console.error('Erro ao carregar operadores do Bitrix:', error);
      toast.error('Erro ao carregar operadores do Bitrix');
    }
  };

  const updateUserChatwootAgent = async (userId: string, agentId: number | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chatwoot_agent_id: agentId })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Agente Chatwoot vinculado com sucesso');
      loadUsers();
    } catch (error) {
      console.error('Erro ao vincular agente Chatwoot:', error);
      toast.error('Erro ao vincular agente Chatwoot');
    }
  };

  const updateUserBitrixOperator = async (userId: string, operatorId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bitrix_operator_id: operatorId })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Operador Bitrix vinculado com sucesso');
      loadUsers();
    } catch (error) {
      console.error('Erro ao vincular operador Bitrix:', error);
      toast.error('Erro ao vincular operador Bitrix');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
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
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando usuários...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Email</th>
                      <th className="p-3 text-left text-sm font-medium">Nome</th>
                      <th className="p-3 text-left text-sm font-medium">Role</th>
                      <th className="p-3 text-left text-sm font-medium">Agente Chatwoot</th>
                      <th className="p-3 text-left text-sm font-medium">Operador Bitrix</th>
                      <th className="p-3 text-left text-sm font-medium">Cadastro</th>
                      <th className="p-3 text-left text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3 text-sm">{user.email}</td>
                        <td className="p-3 text-sm">
                          {user.display_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </td>
                        <td className="p-3">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? (
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                Agente
                              </span>
                            )}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {isAdmin ? (
                            <Select 
                              value={user.chatwoot_agent_id?.toString() || "none"} 
                              onValueChange={(val) => updateUserChatwootAgent(user.id, val === "none" ? null : parseInt(val))}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Sem vínculo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem vínculo</SelectItem>
                                {chatwootAgents.map(agent => (
                                  <SelectItem key={agent.id} value={agent.id.toString()}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {user.chatwoot_agent_id 
                                ? chatwootAgents.find(a => a.id === user.chatwoot_agent_id)?.name || `ID: ${user.chatwoot_agent_id}`
                                : '-'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isAdmin ? (
                            <Select 
                              value={user.bitrix_operator_id || "none"} 
                              onValueChange={(val) => updateUserBitrixOperator(user.id, val === "none" ? null : val)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Sem vínculo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem vínculo</SelectItem>
                                {bitrixOperators.map(operator => (
                                  <SelectItem key={operator.id} value={operator.id}>
                                    {operator.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {user.bitrix_operator_id 
                                ? bitrixOperators.find(o => o.id === user.bitrix_operator_id)?.title || `ID: ${user.bitrix_operator_id}`
                                : '-'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3">
                          {isAdmin && (
                            <Select 
                              value={user.role} 
                              onValueChange={(val) => updateUserRole(user.id, val as 'admin' | 'agent')}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="agent">Agente</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
