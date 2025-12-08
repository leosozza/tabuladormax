import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Save, Loader2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { PermissionCell, PermissionScope } from './PermissionCell';
import { CreateRoleDialog } from './CreateRoleDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CustomRole {
  id: string;
  name: string;
  label: string;
  color: string;
  is_system: boolean;
  sort_order: number;
}

interface AppRoute {
  id: string;
  path: string;
  name: string;
  module: string;
  active: boolean;
}

interface AppResource {
  id: string;
  name: string;
  code: string;
  module: string;
  description: string | null;
}

interface RoutePermission {
  route_id: string;
  role: string;
  department: string;
  can_access: boolean;
}

interface ResourcePermission {
  id: string;
  resource_id: string;
  role_id: string;
  scope: PermissionScope;
}

type RoutePermissionKey = `route_${string}_${string}`;
type ResourcePermissionKey = `resource_${string}_${string}`;

const MODULE_ICONS: Record<string, string> = {
  'admin': '🏠',
  'tabulador': '📋',
  'gestao': '📊',
  'scouter': '🔍',
  'whatsapp': '💬',
  'dashboard': '📈',
  'dialer': '📞',
  'leads': '👥',
  'Leads': '👥',
  'WhatsApp': '💬',
  'Scouters': '🔍',
};

export const UnifiedPermissionsManager: React.FC = () => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [resources, setResources] = useState<AppResource[]>([]);
  const [routePermissions, setRoutePermissions] = useState<Map<RoutePermissionKey, boolean>>(new Map());
  const [resourcePermissions, setResourcePermissions] = useState<Map<ResourcePermissionKey, PermissionScope>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routeChanges, setRouteChanges] = useState<Map<RoutePermissionKey, boolean>>(new Map());
  const [resourceChanges, setResourceChanges] = useState<Map<ResourcePermissionKey, PermissionScope>>(new Map());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, routesRes, resourcesRes, routePermsRes, resourcePermsRes] = await Promise.all([
        supabase.from('custom_roles').select('*').order('sort_order'),
        supabase.from('app_routes').select('*').eq('active', true).order('module, name'),
        supabase.from('app_resources').select('*').eq('active', true).order('module, sort_order'),
        supabase.from('route_permissions').select('*'),
        supabase.from('resource_permissions').select('*'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (routesRes.error) throw routesRes.error;
      if (resourcesRes.error) throw resourcesRes.error;
      if (routePermsRes.error) throw routePermsRes.error;
      if (resourcePermsRes.error) throw resourcePermsRes.error;

      setRoles(rolesRes.data || []);
      setRoutes(routesRes.data || []);
      setResources(resourcesRes.data || []);

      // Build route permissions map
      const routePermMap = new Map<RoutePermissionKey, boolean>();
      (routePermsRes.data || []).forEach((p: RoutePermission) => {
        const key: RoutePermissionKey = `route_${p.route_id}_${p.role}`;
        routePermMap.set(key, p.can_access);
      });
      setRoutePermissions(routePermMap);

      // Build resource permissions map
      const resourcePermMap = new Map<ResourcePermissionKey, PermissionScope>();
      (resourcePermsRes.data || []).forEach((p) => {
        const key: ResourcePermissionKey = `resource_${p.resource_id}_${p.role_id}`;
        resourcePermMap.set(key, p.scope as PermissionScope);
      });
      setResourcePermissions(resourcePermMap);

      // Expand all modules by default
      const routeModules = (routesRes.data || []).map((r: AppRoute) => r.module);
      const resourceModules = (resourcesRes.data || []).map((r: AppResource) => r.module);
      setExpandedModules(new Set([...routeModules, ...resourceModules]));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getRoutePermissionKey = (routeId: string, roleName: string): RoutePermissionKey => {
    return `route_${routeId}_${roleName}`;
  };

  const getResourcePermissionKey = (resourceId: string, roleId: string): ResourcePermissionKey => {
    return `resource_${resourceId}_${roleId}`;
  };

  const isRouteAllowed = (routeId: string, roleName: string): boolean => {
    const key = getRoutePermissionKey(routeId, roleName);
    if (routeChanges.has(key)) return routeChanges.get(key)!;
    return routePermissions.get(key) ?? false;
  };

  const getResourceScope = (resourceId: string, roleId: string): PermissionScope => {
    const key = getResourcePermissionKey(resourceId, roleId);
    if (resourceChanges.has(key)) return resourceChanges.get(key)!;
    return resourcePermissions.get(key) ?? 'none';
  };

  const handleRouteChange = (routeId: string, roleName: string, value: boolean | PermissionScope) => {
    const key = getRoutePermissionKey(routeId, roleName);
    const newValue = typeof value === 'boolean' ? value : value === 'global';
    setRouteChanges(prev => new Map(prev).set(key, newValue));
  };

  const handleResourceChange = (resourceId: string, roleId: string, value: PermissionScope) => {
    const key = getResourcePermissionKey(resourceId, roleId);
    setResourceChanges(prev => new Map(prev).set(key, value));
  };

  const hasChanges = routeChanges.size > 0 || resourceChanges.size > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      // Save route permission changes
      for (const [key, canAccess] of routeChanges.entries()) {
        const parts = key.split('_');
        const routeId = parts[1];
        const roleName = parts.slice(2).join('_');
        
        const departments = ['telemarketing', 'scouter', 'gestao'];
        
        for (const dept of departments) {
          const { error } = await supabase
            .from('route_permissions')
            .upsert({
              route_id: routeId,
              role: roleName as any,
              department: dept as any,
              can_access: canAccess,
            }, {
              onConflict: 'route_id,role,department',
            });

          if (error) throw error;
        }
      }

      // Save resource permission changes
      for (const [key, scope] of resourceChanges.entries()) {
        const parts = key.split('_');
        const resourceId = parts[1];
        const roleId = parts.slice(2).join('_');
        
        const { error } = await supabase
          .from('resource_permissions')
          .upsert({
            resource_id: resourceId,
            role_id: roleId,
            scope: scope,
          }, {
            onConflict: 'resource_id,role_id',
          });

        if (error) throw error;
      }

      toast.success('Permissões salvas com sucesso!');
      setRouteChanges(new Map());
      setResourceChanges(new Map());
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleToDelete.id);

      if (error) throw error;

      toast.success('Função excluída com sucesso!');
      setRoleToDelete(null);
      loadData();
    } catch (error) {
      console.error('Erro ao excluir função:', error);
      toast.error('Erro ao excluir função');
    }
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  // Group routes by module
  const routesByModule = routes.reduce((acc, route) => {
    if (!acc[route.module]) acc[route.module] = [];
    acc[route.module].push(route);
    return acc;
  }, {} as Record<string, AppRoute[]>);

  // Group resources by module
  const resourcesByModule = resources.reduce((acc, resource) => {
    if (!acc[resource.module]) acc[resource.module] = [];
    acc[resource.module].push(resource);
    return acc;
  }, {} as Record<string, AppResource[]>);

  // Get all unique modules
  const allModules = [...new Set([...Object.keys(routesByModule), ...Object.keys(resourcesByModule)])];

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div>
          <h3 className="font-semibold">Matriz de Permissões</h3>
          <p className="text-sm text-muted-foreground">
            Configure o acesso de cada função às páginas e recursos do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateRoleOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Função
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="w-full">
        <div className="min-w-[800px]">
          {/* Table Header */}
          <div className="flex border-b bg-muted/50 sticky top-0 z-10">
            <div className="w-[250px] min-w-[250px] p-3 font-medium text-sm border-r">
              Página / Recurso
            </div>
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex-1 min-w-[130px] p-3 text-center border-r last:border-r-0"
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="font-medium text-sm">{role.label}</span>
                  {!role.is_system && (
                    <button
                      onClick={() => setRoleToDelete(role)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table Body */}
          <div>
            {allModules.map((module) => {
              const moduleRoutes = routesByModule[module] || [];
              const moduleResources = resourcesByModule[module] || [];
              const totalItems = moduleRoutes.length + moduleResources.length;

              return (
                <Collapsible
                  key={module}
                  open={expandedModules.has(module)}
                  onOpenChange={() => toggleModule(module)}
                >
                  {/* Module Header */}
                  <CollapsibleTrigger asChild>
                    <div className="flex border-b bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                      <div className="w-[250px] min-w-[250px] p-3 font-medium text-sm border-r flex items-center gap-2">
                        {expandedModules.has(module) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>{MODULE_ICONS[module] || '📁'}</span>
                        <span className="capitalize">{module}</span>
                        <span className="text-muted-foreground text-xs">
                          ({totalItems})
                        </span>
                      </div>
                      {roles.map((role) => (
                        <div
                          key={role.id}
                          className="flex-1 min-w-[130px] p-3 border-r last:border-r-0"
                        />
                      ))}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {/* Routes Section */}
                    {moduleRoutes.length > 0 && (
                      <>
                        <div className="flex border-b bg-muted/10">
                          <div className="w-[250px] min-w-[250px] p-2 pl-8 text-xs font-medium text-muted-foreground uppercase tracking-wider border-r">
                            Páginas
                          </div>
                          {roles.map((role) => (
                            <div
                              key={role.id}
                              className="flex-1 min-w-[130px] p-2 border-r last:border-r-0"
                            />
                          ))}
                        </div>
                        {moduleRoutes.map((route) => (
                          <div
                            key={route.id}
                            className="flex border-b hover:bg-muted/10 transition-colors"
                          >
                            <div className="w-[250px] min-w-[250px] p-3 text-sm border-r pl-10">
                              <div className="font-medium">{route.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {route.path}
                              </div>
                            </div>
                            {roles.map((role) => (
                              <div
                                key={role.id}
                                className="flex-1 min-w-[130px] p-2 border-r last:border-r-0 flex items-center justify-center"
                              >
                                <PermissionCell
                                  type="route"
                                  value={isRouteAllowed(route.id, role.name)}
                                  onChange={(value) => handleRouteChange(route.id, role.name, value)}
                                  isSystemAdmin={role.name === 'admin'}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Resources Section */}
                    {moduleResources.length > 0 && (
                      <>
                        <div className="flex border-b bg-muted/10">
                          <div className="w-[250px] min-w-[250px] p-2 pl-8 text-xs font-medium text-muted-foreground uppercase tracking-wider border-r">
                            Recursos
                          </div>
                          {roles.map((role) => (
                            <div
                              key={role.id}
                              className="flex-1 min-w-[130px] p-2 border-r last:border-r-0"
                            />
                          ))}
                        </div>
                        {moduleResources.map((resource) => (
                          <div
                            key={resource.id}
                            className="flex border-b hover:bg-muted/10 transition-colors"
                          >
                            <div className="w-[250px] min-w-[250px] p-3 text-sm border-r pl-10">
                              <div className="font-medium">{resource.name}</div>
                              {resource.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {resource.description}
                                </div>
                              )}
                            </div>
                            {roles.map((role) => (
                              <div
                                key={role.id}
                                className="flex-1 min-w-[130px] p-2 border-r last:border-r-0 flex items-center justify-center"
                              >
                                <PermissionCell
                                  type="resource"
                                  value={getResourceScope(resource.id, role.id)}
                                  onChange={(value) => handleResourceChange(resource.id, role.id, value as PermissionScope)}
                                  isSystemAdmin={role.name === 'admin'}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onRoleCreated={loadData}
      />

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Função</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a função "{roleToDelete?.label}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};