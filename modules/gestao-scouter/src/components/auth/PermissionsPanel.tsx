import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-helper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Permission {
  id: number;
  module: string;
  action: string;
  role_id: number;
  allowed: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

const MODULES = [
  { name: 'fichas', label: 'Fichas' },
  { name: 'leads', label: 'Leads' },
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'pagamentos', label: 'Pagamentos' },
  { name: 'configuracoes', label: 'Configurações' },
];

const ACTIONS = [
  { name: 'read', label: 'Visualizar' },
  { name: 'create', label: 'Criar' },
  { name: 'update', label: 'Editar' },
  { name: 'delete', label: 'Excluir' },
  { name: 'export', label: 'Exportar' },
];

export function PermissionsPanel() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchRoles(), fetchPermissions()]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      // @ts-ignore - Supabase types will be generated after migration
      const response: any = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (response.error) throw response.error;
      
      const rolesData = (response.data || []) as Role[];
      setRoles(rolesData);
      
      // Set first role as selected
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Erro ao carregar funções');
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase.rpc('list_permissions');

      if (error) throw error;
      
      const permsData = (data || []) as Permission[];
      setPermissions(permsData);
      
      console.log('Permissions loaded via RPC:', permsData.length);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Erro ao carregar permissões');
    }
  };

  const hasPermission = (module: string, action: string, roleId: string): boolean => {
    return permissions.some(
      (p) => p.module === module && p.action === action && p.role_id === parseInt(roleId) && p.allowed
    );
  };

  const togglePermission = async (module: string, action: string, roleId: string) => {
    try {
      const roleIdNum = parseInt(roleId);
      const existingPermission = permissions.find(
        (p) => p.module === module && p.action === action && p.role_id === roleIdNum
      );

      const newAllowed = existingPermission ? !existingPermission.allowed : true;

      console.log('🔐 [Permissions] Atualizando permissão:', {
        module,
        action,
        role_id: roleIdNum,
        allowed: newAllowed,
      });

      // Use RPC to set permission
      const { error } = await supabase.rpc('set_permission', {
        p_module: module,
        p_action: action,
        p_role_id: roleIdNum,
        p_allowed: newAllowed
      });

      if (error) {
        console.error('❌ [Permissions] Erro ao atualizar:', error);
        throw error;
      }

      console.log('✅ [Permissions] Permissão atualizada com sucesso');

      // Refresh permissions
      await fetchPermissions();
      
      toast.success(`✅ ${module} - ${action}: ${newAllowed ? 'Permitido' : 'Negado'}`);
    } catch (error: any) {
      console.error('❌ [Permissions] Exceção ao atualizar permissão:', error);
      
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorDetails = error?.details || '';
      const errorHint = error?.hint || '';
      
      toast.error(
        `❌ Erro: ${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}${errorHint ? `\n💡 ${errorHint}` : ''}`
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">Carregando permissões...</div>
        </CardContent>
      </Card>
    );
  }

  if (roles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">
            Nenhuma função encontrada. Execute a migration primeiro.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões de Acesso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as permissões por função, similar ao Bitrix24
        </p>
      </CardHeader>
      <CardContent>
        {selectedRole && (
          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="mb-4">
              {roles.map((role) => (
                <TabsTrigger key={role.id} value={role.id.toString()} className="capitalize">
                  {role.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {roles.map((role) => (
              <TabsContent key={role.id} value={role.id.toString()}>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        {ACTIONS.map((action) => (
                          <TableHead key={action.name} className="text-center">
                            {action.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MODULES.map((module) => (
                        <TableRow key={module.name}>
                          <TableCell className="font-medium">{module.label}</TableCell>
                          {ACTIONS.map((action) => (
                            <TableCell key={action.name} className="text-center">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={hasPermission(module.name, action.name, role.id.toString())}
                                  onCheckedChange={() =>
                                    togglePermission(module.name, action.name, role.id.toString())
                                  }
                                />
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
