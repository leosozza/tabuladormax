import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PermissionCell } from "./PermissionCell";
import { CreateRoleDialog } from "./CreateRoleDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type PermissionScope = 'global' | 'department' | 'own' | 'none';

interface CustomRole {
  id: string;
  name: string;
  label: string;
  is_system: boolean;
  color: string;
}

interface AppRoute {
  id: string;
  name: string;
  path: string;
  module: string;
}

interface AppResource {
  id: string;
  name: string;
  code: string;
  module: string;
}

interface PermissionAssignment {
  id: string;
  route_id: string | null;
  resource_id: string | null;
  role_id: string;
  scope: PermissionScope;
  can_access: boolean;
}

export function RolePermissions() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [resources, setResources] = useState<AppResource[]>([]);
  const [permissions, setPermissions] = useState<PermissionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { scope: PermissionScope; canAccess: boolean }>>(new Map());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rolesRes, routesRes, resourcesRes, permissionsRes] = await Promise.all([
        supabase.from('custom_roles').select('*').order('sort_order'),
        supabase.from('app_routes').select('*').eq('active', true).order('module, name'),
        supabase.from('app_resources').select('*').eq('active', true).order('module, sort_order'),
        supabase.from('permission_assignments').select('*').eq('assign_type', 'role')
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (routesRes.data) setRoutes(routesRes.data);
      if (resourcesRes.data) setResources(resourcesRes.data);
      if (permissionsRes.data) {
        setPermissions(permissionsRes.data as PermissionAssignment[]);
      }

      // Expand all modules by default
      const allModules = new Set([
        ...(routesRes.data?.map(r => r.module) || []),
        ...(resourcesRes.data?.map(r => r.module) || [])
      ]);
      setExpandedModules(allModules);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function getPermissionKey(type: 'route' | 'resource', itemId: string, roleId: string) {
    return `${type}:${itemId}:${roleId}`;
  }

  function getCurrentPermission(type: 'route' | 'resource', itemId: string, roleId: string) {
    const key = getPermissionKey(type, itemId, roleId);
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }

    const existing = permissions.find(p => 
      p.role_id === roleId && 
      (type === 'route' ? p.route_id === itemId : p.resource_id === itemId)
    );

    return {
      scope: (existing?.scope || 'none') as PermissionScope,
      canAccess: existing?.can_access ?? false
    };
  }

  function handlePermissionChange(type: 'route' | 'resource', itemId: string, roleId: string, value: boolean | PermissionScope) {
    const key = getPermissionKey(type, itemId, roleId);
    const current = getCurrentPermission(type, itemId, roleId);
    
    if (type === 'route') {
      setPendingChanges(prev => new Map(prev).set(key, {
        scope: value ? 'global' : 'none',
        canAccess: value as boolean
      }));
    } else {
      setPendingChanges(prev => new Map(prev).set(key, {
        scope: value as PermissionScope,
        canAccess: value !== 'none'
      }));
    }
  }

  async function handleSave() {
    if (pendingChanges.size === 0) return;

    try {
      const upserts: any[] = [];

      pendingChanges.forEach((change, key) => {
        const [type, itemId, roleId] = key.split(':');
        upserts.push({
          ...(type === 'route' ? { route_id: itemId } : { resource_id: itemId }),
          assign_type: 'role',
          role_id: roleId,
          scope: change.scope,
          can_access: change.canAccess
        });
      });

      // Delete existing and insert new (simpler than complex upsert)
      for (const upsert of upserts) {
        const filter = upsert.route_id 
          ? { route_id: upsert.route_id, role_id: upsert.role_id, assign_type: 'role' }
          : { resource_id: upsert.resource_id, role_id: upsert.role_id, assign_type: 'role' };

        await supabase.from('permission_assignments').delete().match(filter);
        await supabase.from('permission_assignments').insert(upsert);
      }

      toast.success('Permissões salvas com sucesso');
      setPendingChanges(new Map());
      loadData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Erro ao salvar permissões');
    }
  }

  async function handleDeleteRole(role: CustomRole) {
    try {
      const { error } = await supabase.from('custom_roles').delete().eq('id', role.id);
      if (error) throw error;
      toast.success(`Função "${role.label}" excluída`);
      setRoleToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Erro ao excluir função');
    }
  }

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const routesByModule = routes.reduce((acc, route) => {
    if (!acc[route.module]) acc[route.module] = [];
    acc[route.module].push(route);
    return acc;
  }, {} as Record<string, AppRoute[]>);

  const resourcesByModule = resources.reduce((acc, resource) => {
    if (!acc[resource.module]) acc[resource.module] = [];
    acc[resource.module].push(resource);
    return acc;
  }, {} as Record<string, AppResource[]>);

  const allModules = [...new Set([...Object.keys(routesByModule), ...Object.keys(resourcesByModule)])].sort();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Permissões por Função</CardTitle>
          <CardDescription>
            Configure o acesso de cada função às páginas e recursos
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateRoleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Função
          </Button>
          <Button onClick={handleSave} disabled={pendingChanges.size === 0}>
            <Save className="h-4 w-4 mr-2" />
            Salvar ({pendingChanges.size})
          </Button>
          <CreateRoleDialog 
            open={createRoleOpen} 
            onOpenChange={setCreateRoleOpen} 
            onRoleCreated={loadData} 
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 min-w-[200px] bg-muted/50">Item</th>
                {roles.map(role => (
                  <th key={role.id} className="p-3 min-w-[120px] bg-muted/50">
                    <div className="flex flex-col items-center gap-1">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ backgroundColor: role.color + '20', color: role.color }}
                      >
                        {role.label}
                      </span>
                      {!role.is_system && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setRoleToDelete(role)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir função?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso removerá a função "{role.label}" e todas as permissões associadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteRole(role)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allModules.map(module => (
                <Collapsible key={module} open={expandedModules.has(module)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <tr 
                        className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleModule(module)}
                      >
                        <td colSpan={roles.length + 1} className="p-3">
                          <div className="flex items-center gap-2 font-medium uppercase text-xs tracking-wider">
                            {expandedModules.has(module) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {module}
                          </div>
                        </td>
                      </tr>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <>
                        {/* Routes (pages) */}
                        {routesByModule[module]?.map(route => (
                          <tr key={`route-${route.id}`} className="border-b hover:bg-muted/20">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                                  Página
                                </span>
                                {route.name}
                              </div>
                            </td>
                            {roles.map(role => {
                              const perm = getCurrentPermission('route', route.id, role.id);
                              return (
                                <td key={role.id} className="p-3 text-center">
                                  <PermissionCell
                                    type="route"
                                    value={perm.canAccess}
                                    onChange={(val) => handlePermissionChange('route', route.id, role.id, val)}
                                    isSystemAdmin={role.name === 'admin'}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* Resources */}
                        {resourcesByModule[module]?.map(resource => (
                          <tr key={`resource-${resource.id}`} className="border-b hover:bg-muted/20">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">
                                  Recurso
                                </span>
                                {resource.name}
                              </div>
                            </td>
                            {roles.map(role => {
                              const perm = getCurrentPermission('resource', resource.id, role.id);
                              return (
                                <td key={role.id} className="p-3 text-center">
                                  <PermissionCell
                                    type="resource"
                                    value={perm.scope}
                                    onChange={(val) => handlePermissionChange('resource', resource.id, role.id, val)}
                                    isSystemAdmin={role.name === 'admin'}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
