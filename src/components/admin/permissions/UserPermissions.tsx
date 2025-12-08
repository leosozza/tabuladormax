import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Save, Search, UserCircle, Shield, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PermissionCell } from "./PermissionCell";

type PermissionScope = 'global' | 'department' | 'own' | 'none';

interface Profile {
  id: string;
  email: string;
  display_name: string;
}

interface UserRole {
  role: string;
}

interface UserDepartment {
  department: string;
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
  user_id: string;
  scope: PermissionScope;
  can_access: boolean;
}

export function UserPermissions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [resources, setResources] = useState<AppResource[]>([]);
  const [permissions, setPermissions] = useState<PermissionAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { scope: PermissionScope; canAccess: boolean }>>(new Map());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRoutesAndResources();
  }, []);

  async function loadRoutesAndResources() {
    const [routesRes, resourcesRes] = await Promise.all([
      supabase.from('app_routes').select('*').eq('active', true).order('module, name'),
      supabase.from('app_resources').select('*').eq('active', true).order('module, sort_order')
    ]);

    if (routesRes.data) setRoutes(routesRes.data);
    if (resourcesRes.data) setResources(resourcesRes.data);

    const allModules = new Set([
      ...(routesRes.data?.map(r => r.module) || []),
      ...(resourcesRes.data?.map(r => r.module) || [])
    ]);
    setExpandedModules(allModules);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Erro ao buscar usuários');
    } finally {
      setSearching(false);
    }
  }

  async function selectUser(user: Profile) {
    setSelectedUser(user);
    setLoading(true);
    setPendingChanges(new Map());

    try {
      const [roleRes, deptRes, permRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
        supabase.from('user_departments').select('department').eq('user_id', user.id).single(),
        supabase.from('permission_assignments').select('*').eq('assign_type', 'user').eq('user_id', user.id)
      ]);

      setUserRole(roleRes.data?.role || null);
      setUserDepartment(deptRes.data?.department || null);
      setPermissions((permRes.data as PermissionAssignment[]) || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getPermissionKey(type: 'route' | 'resource', itemId: string) {
    return `${type}:${itemId}`;
  }

  function getCurrentPermission(type: 'route' | 'resource', itemId: string) {
    const key = getPermissionKey(type, itemId);
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }

    const existing = permissions.find(p => 
      type === 'route' ? p.route_id === itemId : p.resource_id === itemId
    );

    return {
      scope: (existing?.scope || 'none') as PermissionScope,
      canAccess: existing?.can_access ?? false,
      hasCustom: !!existing
    };
  }

  function handlePermissionChange(type: 'route' | 'resource', itemId: string, value: boolean | PermissionScope) {
    const key = getPermissionKey(type, itemId);
    
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
    if (pendingChanges.size === 0 || !selectedUser) return;

    try {
      for (const [key, change] of pendingChanges) {
        const [type, itemId] = key.split(':');
        const data = {
          ...(type === 'route' ? { route_id: itemId } : { resource_id: itemId }),
          assign_type: 'user' as const,
          user_id: selectedUser.id,
          scope: change.scope,
          can_access: change.canAccess
        };

        const filter = type === 'route'
          ? { route_id: itemId, user_id: selectedUser.id, assign_type: 'user' }
          : { resource_id: itemId, user_id: selectedUser.id, assign_type: 'user' };

        await supabase.from('permission_assignments').delete().match(filter);
        await supabase.from('permission_assignments').insert(data);
      }

      toast.success('Permissões do usuário salvas');
      setPendingChanges(new Map());
      selectUser(selectedUser);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Erro ao salvar permissões');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Permissões por Usuário
        </CardTitle>
        <CardDescription>
          Configure permissões individuais para usuários específicos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {/* Search Results */}
        {users.length > 0 && !selectedUser && (
          <div className="border rounded-lg divide-y mb-6">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className="w-full p-3 text-left hover:bg-muted/50 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{user.display_name || 'Sem nome'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected User */}
        {selectedUser && (
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-lg">{selectedUser.display_name || 'Sem nome'}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userRole && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {userRole}
                  </Badge>
                )}
                {userDepartment && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {userDepartment}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                ← Voltar à busca
              </Button>
              <Button onClick={handleSave} disabled={pendingChanges.size === 0}>
                <Save className="h-4 w-4 mr-2" />
                Salvar ({pendingChanges.size})
              </Button>
            </div>

            {/* Permissions */}
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-3 border-b">
                  <span className="font-medium">Permissões Personalizadas</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    (sobrescrevem função e departamento)
                  </span>
                </div>
                <div className="divide-y">
                  {allModules.map(module => (
                    <Collapsible key={module} open={expandedModules.has(module)}>
                      <CollapsibleTrigger 
                        className="w-full p-3 flex items-center gap-2 hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleModule(module)}
                      >
                        {expandedModules.has(module) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium uppercase text-xs tracking-wider">{module}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="divide-y border-t">
                          {routesByModule[module]?.map(route => {
                            const perm = getCurrentPermission('route', route.id);
                            return (
                              <div key={route.id} className="flex items-center justify-between p-3 pl-10 hover:bg-muted/20">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                                    Página
                                  </span>
                                  <span>{route.name}</span>
                                  {(perm as any).hasCustom && (
                                    <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                                  )}
                                </div>
                                <PermissionCell
                                  type="route"
                                  value={perm.canAccess}
                                  onChange={(val) => handlePermissionChange('route', route.id, val)}
                                />
                              </div>
                            );
                          })}
                          {resourcesByModule[module]?.map(resource => {
                            const perm = getCurrentPermission('resource', resource.id);
                            return (
                              <div key={resource.id} className="flex items-center justify-between p-3 pl-10 hover:bg-muted/20">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">
                                    Recurso
                                  </span>
                                  <span>{resource.name}</span>
                                  {(perm as any).hasCustom && (
                                    <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                                  )}
                                </div>
                                <PermissionCell
                                  type="resource"
                                  value={perm.scope}
                                  onChange={(val) => handlePermissionChange('resource', resource.id, val)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
