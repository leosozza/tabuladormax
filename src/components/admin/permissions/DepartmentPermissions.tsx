import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Save, Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PermissionCell } from "./PermissionCell";
import { CreateDepartmentDialog } from "./CreateDepartmentDialog";

type PermissionScope = 'global' | 'department' | 'own' | 'none';

interface Department {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
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
  department_id: string;
  scope: PermissionScope;
  can_access: boolean;
}

export function DepartmentPermissions() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [resources, setResources] = useState<AppResource[]>([]);
  const [permissions, setPermissions] = useState<PermissionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { scope: PermissionScope; canAccess: boolean }>>(new Map());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadPermissions();
    }
  }, [selectedDepartment]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [deptRes, routesRes, resourcesRes] = await Promise.all([
        supabase.from('departments').select('*').eq('active', true).order('sort_order'),
        supabase.from('app_routes').select('*').eq('active', true).order('module, name'),
        supabase.from('app_resources').select('*').eq('active', true).order('module, sort_order')
      ]);

      if (deptRes.data) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0 && !selectedDepartment) {
          setSelectedDepartment(deptRes.data[0].id);
        }
      }
      if (routesRes.data) setRoutes(routesRes.data);
      if (resourcesRes.data) setResources(resourcesRes.data);

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

  async function loadPermissions() {
    if (!selectedDepartment) return;
    
    try {
      const { data, error } = await supabase
        .from('permission_assignments')
        .select('*')
        .eq('assign_type', 'department')
        .eq('department_id', selectedDepartment);

      if (error) throw error;
      setPermissions(data as PermissionAssignment[]);
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Error loading permissions:', error);
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
      canAccess: existing?.can_access ?? false
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
    if (pendingChanges.size === 0 || !selectedDepartment) return;

    try {
      for (const [key, change] of pendingChanges) {
        const [type, itemId] = key.split(':');
        const data = {
          ...(type === 'route' ? { route_id: itemId } : { resource_id: itemId }),
          assign_type: 'department' as const,
          department_id: selectedDepartment,
          scope: change.scope,
          can_access: change.canAccess
        };

        const filter = type === 'route'
          ? { route_id: itemId, department_id: selectedDepartment, assign_type: 'department' }
          : { resource_id: itemId, department_id: selectedDepartment, assign_type: 'department' };

        await supabase.from('permission_assignments').delete().match(filter);
        await supabase.from('permission_assignments').insert(data);
      }

      toast.success('Permissões do departamento salvas');
      setPendingChanges(new Map());
      loadPermissions();
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
  const currentDept = departments.find(d => d.id === selectedDepartment);

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Permissões por Departamento
            </CardTitle>
            <CardDescription>
              Configure o acesso de cada departamento às páginas e recursos
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <CreateDepartmentDialog onCreated={loadInitialData} />
            <Button onClick={handleSave} disabled={pendingChanges.size === 0}>
              <Save className="h-4 w-4 mr-2" />
              Salvar ({pendingChanges.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Selecionar Departamento</label>
          <Select value={selectedDepartment || ''} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Escolha um departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDepartment && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-3 border-b">
              <span className="font-medium">{currentDept?.name}</span>
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
      </CardContent>
    </Card>
  );
}
