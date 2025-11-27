import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Filter, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReloadSchemaCacheButton } from "./ReloadSchemaCacheButton";
import type { AppRole, Department } from "@/types/database-extensions";

interface AppRoute {
  id: string;
  path: string;
  name: string;
  description: string | null;
  module: string;
  active: boolean;
}

interface RoutePermission {
  id: string;
  route_id: string;
  department: string;
  role: string;
  can_access: boolean;
}

const DEPARTMENTS = ["telemarketing", "scouters", "administrativo"] as const;
const ROLES: AppRole[] = ["agent", "supervisor", "manager", "admin"];

const ROLE_LABELS: Record<AppRole, string> = {
  agent: "Agente",
  supervisor: "Supervisor",
  manager: "Gerente",
  admin: "Administrador",
};

const DEPT_LABELS: Record<string, string> = {
  telemarketing: "Telemarketing",
  scouters: "Scouters",
  administrativo: "Administrativo",
};

const MODULE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  tabulador: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  gestao: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  discador: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function RoutePermissionsManager() {
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [permissions, setPermissions] = useState<RoutePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());
  const [selectedRole, setSelectedRole] = useState<AppRole>("agent");
  const [selectedDepartment, setSelectedDepartment] = useState<typeof DEPARTMENTS[number]>("telemarketing");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [schemaCacheError, setSchemaCacheError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [routesRes, permsRes] = await Promise.all([
        supabase
          .from("app_routes" as any)
          .select("*")
          .eq("active", true)
          .order("module, name"),
        supabase
          .from("route_permissions" as any)
          .select("*"),
      ]);

      if (routesRes.error) throw routesRes.error;
      if (permsRes.error) throw permsRes.error;

      setRoutes(routesRes.data as any || []);
      setPermissions(permsRes.data as any || []);
      setSchemaCacheError(false);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      
      if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
        setSchemaCacheError(true);
        toast.error("Tabelas não encontradas no cache. Clique em 'Recarregar Schema Cache'");
      } else {
        toast.error("Erro ao carregar permissões de rota");
      }
    } finally {
      setLoading(false);
    }
  };

  const getPermissionKey = (routeId: string, dept: string, role: string): string => {
    return `${routeId}-${dept}-${role}`;
  };

  const isPermissionAllowed = (routeId: string, dept: string, role: string): boolean => {
    const key = getPermissionKey(routeId, dept, role);
    
    if (changes.has(key)) {
      return changes.get(key)!;
    }

    const perm = permissions.find(
      p => p.route_id === routeId && 
           p.department === dept && 
           p.role === role
    );

    return perm?.can_access || false;
  };

  const handlePermissionChange = (routeId: string, dept: string, role: string, allowed: boolean) => {
    const key = getPermissionKey(routeId, dept, role);
    setChanges(prev => new Map(prev).set(key, allowed));
  };

  const handleSave = async () => {
    if (changes.size === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    try {
      setSaving(true);

      for (const [key, allowed] of changes.entries()) {
        const parts = key.split('-');
        const routeId = parts[0];
        const dept = parts[1];
        const role = parts[2];

        const existingPerm = permissions.find(
          p => p.route_id === routeId && 
               p.department === dept && 
               p.role === role
        );

        if (existingPerm) {
          const { error } = await supabase
            .from("route_permissions" as any)
            .update({ can_access: allowed })
            .eq("id", existingPerm.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("route_permissions" as any)
            .insert({
              route_id: routeId,
              department: dept,
              role: role,
              can_access: allowed,
            } as any);

          if (error) throw error;
        }
      }

      toast.success("Permissões salvas com sucesso");
      setChanges(new Map());
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar permissões:", error);
      toast.error(error.message || "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoutes = filterModule === "all" 
    ? routes 
    : routes.filter(r => r.module === filterModule);

  const groupedRoutes = filteredRoutes.reduce((acc, route) => {
    if (!acc[route.module]) {
      acc[route.module] = [];
    }
    acc[route.module].push(route);
    return acc;
  }, {} as Record<string, AppRoute[]>);

  const modules = Object.keys(groupedRoutes).sort();

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schemaCacheError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Schema Cache</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              As tabelas <code>app_routes</code> e <code>route_permissions</code> não foram encontradas no cache do Supabase.
              Isso acontece após criar novas tabelas. Clique no botão ao lado para recarregar.
            </span>
            <ReloadSchemaCacheButton />
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 bg-muted/50">
        <div className="text-sm space-y-2">
          <p className="font-semibold">Permissões por Função e Departamento</p>
          <p className="text-muted-foreground">
            Selecione a <strong>função</strong> e o <strong>departamento</strong>, depois escolha quais páginas podem ser acessadas. 
            Uma mesma função em um departamento pode ter acesso a páginas de qualquer módulo.
          </p>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium whitespace-nowrap">Função:</span>
            <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as AppRole)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium whitespace-nowrap">Departamento:</span>
            <Select value={selectedDepartment} onValueChange={(val) => setSelectedDepartment(val as typeof DEPARTMENTS[number])}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {DEPT_LABELS[dept]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4" />
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Módulos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tabulador">Tabulador</SelectItem>
                <SelectItem value="gestao">Gestão Scouter</SelectItem>
                <SelectItem value="discador">Discador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || changes.size === 0}>
          <Save className="h-4 w-4 mr-2" />
          Salvar {changes.size > 0 && `(${changes.size})`}
        </Button>
      </div>

      <div className="space-y-6">
        {modules.map(module => (
          <Card key={module}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className={MODULE_COLORS[module] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"}>
                  {module.charAt(0).toUpperCase() + module.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({groupedRoutes[module].length} página{groupedRoutes[module].length !== 1 ? 's' : ''})
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {groupedRoutes[module].map(route => {
                  const isAllowed = isPermissionAllowed(route.id, selectedDepartment, selectedRole);
                  const isAdmin = selectedRole === 'admin';
                  
                  return (
                    <div 
                      key={route.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        id={`${route.id}-${selectedDepartment}-${selectedRole}`}
                        checked={isAllowed}
                        disabled={isAdmin}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(route.id, selectedDepartment, selectedRole, checked === true)
                        }
                        className="mt-1"
                      />
                      <label 
                        htmlFor={`${route.id}-${selectedDepartment}-${selectedRole}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium text-sm">{route.name}</div>
                        <div className="text-xs text-muted-foreground">{route.path}</div>
                        {route.description && (
                          <div className="text-xs text-muted-foreground mt-1">{route.description}</div>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRole === 'admin' && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Nota:</strong> Administradores têm acesso automático a todas as páginas do sistema.
          </p>
        </Card>
      )}
    </div>
  );
}