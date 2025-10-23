import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-helper';
import { getUsersWithRolesSafe, getRoles, type User, type Role } from '@/repositories/usersRepo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    scouter_id: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('🔍 Buscando usuários via RPC...');
      const { data, error } = await supabase.rpc('list_users_admin');
      
      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }
      
      const usersData = (data || []) as User[];
      console.log('✅ Usuários carregados via RPC:', usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('🔍 Buscando roles...');
      const rolesData = await getRoles();
      console.log('✅ Roles carregados:', rolesData.length);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update existing user using RPC
        const { error } = await supabase.rpc('update_user_role', {
          p_user_id: editingUser.id,
          p_role_id: parseInt(formData.role_id),
          p_scouter_id: formData.scouter_id ? parseInt(formData.scouter_id) : null,
          p_supervisor_id: null
        });

        if (error) throw error;
        toast.success('Usuário atualizado com sucesso');
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create user profile
          const profileResponse = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              name: formData.name,
              email: formData.email,
              role_id: parseInt(formData.role_id),
              scouter_id: formData.scouter_id ? parseInt(formData.scouter_id) : null,
            })
            .select();

          if (profileResponse.error) {
            console.error('Erro ao criar perfil:', profileResponse.error);
            throw profileResponse.error;
          }
          
          console.log('✅ Usuário criado com sucesso:', profileResponse.data);
          toast.success('Usuário criado com sucesso. Um email de confirmação foi enviado.');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      
      // Force refresh of users list
      console.log('🔄 Recarregando lista de usuários...');
      await fetchUsers();
      
    } catch (error: unknown) {
      console.error('Erro ao salvar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(errorMessage || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      console.log('🗑️ Excluindo usuário:', userId);
      const response = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .select();

      if (response.error) {
        console.error('❌ Erro ao excluir usuário:', response.error);
        throw response.error;
      }

      console.log('✅ Usuário excluído com sucesso');
      toast.success('Usuário excluído com sucesso');
      
      // Refresh users list
      await fetchUsers();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role_id: '',
      scouter_id: '',
    });
    setEditingUser(null);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role_id.toString(),
      scouter_id: user.scouter_id?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const loadUsers = async () => {
    setLoading(true);
    await fetchUsers();
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando usuários...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestão de Usuários</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <UserPlus className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                A tabela de usuários está vazia. Verifique se a migration foi executada.
              </p>
              <Button onClick={loadUsers} variant="outline">
                Recarregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestão de Usuários</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Convidar Novo Usuário'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Altere as informações do usuário abaixo.'
                  : 'Preencha os dados para criar um novo usuário no sistema.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingUser}
                />
              </div>
              {!editingUser && (
                <div>
                  <Label htmlFor="password">Senha Inicial</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="role">Função</Label>
                <Select
                  value={formData.role_id}
                  onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scouter_id">ID do Scouter (opcional)</Label>
                <Input
                  id="scouter_id"
                  type="number"
                  value={formData.scouter_id}
                  onChange={(e) => setFormData({ ...formData, scouter_id: e.target.value })}
                  placeholder="Vincular a um scouter específico"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingUser ? 'Atualizar' : 'Criar Usuário'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Scouter ID</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">
                  {user.role_name || user.role?.name || 'N/A'}
                </TableCell>
                <TableCell>{user.scouter_id || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
