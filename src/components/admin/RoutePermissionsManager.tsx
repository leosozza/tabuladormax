import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppRole, Department } from "@/types/database-extensions";

interface AppRoute {
  id: string;
  path: string;
  name: string;
  description: string | null;
  module: string;
  icon: string | null;
  sort_order: number;
}

interface RoutePermission {
  id: string;
  route_id: string;
  department: Department | null;
  role: AppRole | null;
  allowed: boolean;
}

interface PermissionKey {
  routeId: string;
  department: Department | null;
  role: AppRole | null;
}

const DEPARTMENTS = ["telemarketing", "scouters", "administrativo"] as const;
const ROLES: AppRole[] = ["agent", "supervisor", "manager", "admin"];

const ROLE_LABELS: Record<AppRole, string> = {
  agent: "Ag",
  supervisor: "Su",
  manager: "Mg",
  admin: "Ad",
};

const DEPT_LABELS: Record<string, string> = {
  telemarketing: "Telemarketing",
  scouters: "Scouters",
  administrativo: "Administrativo",
};

const MODULE_COLORS: Record<string, string> = {
  telemarketing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  scouter: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  geral: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function RoutePermissionsManager() {
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [permissions, setPermissions] = useState<RoutePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());
  const [filterModule, setFilterModule] = useState<string>("all");

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
          .order("module, sort_order"),
        supabase
          .from("route_permissions" as any)
          .select("*"),
      ]);

      if (routesRes.error) throw routesRes.error;
      if (permsRes.error) throw permsRes.error;

      setRoutes(routesRes.data as any || []);
      setPermissions(permsRes.data as any || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar permissões de rota");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionKey = (routeId: string, dept: Department | null, role: AppRole | null): string => {
    return `${routeId}-${dept || 'null'}-${role || 'null'}`;
  };

  const isPermissionAllowed = (routeId: string, dept: Department | null, role: AppRole | null): boolean => {
    const key = getPermissionKey(routeId, dept, role);
    
    if (changes.has(key)) {
      return changes.get(key)!;
    }

    const perm = permissions.find(
      p => p.route_id === routeId && 
           p.department === dept && 
           p.role === role
    );

    return perm?.allowed || false;
  };

  const handlePermissionChange = (routeId: string, dept: Department | null, role: AppRole | null, allowed: boolean) => {
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
        const dept = parts[1] === 'null' ? null : parts[1];
        const role = parts[2] === 'null' ? null : parts[2];

        const existingPerm = permissions.find(
          p => p.route_id === routeId && 
               p.department === (dept as unknown as Department | null) && 
               p.role === (role as unknown as AppRole | null)
        );

        if (existingPerm) {
          const { error } = await supabase
            .from("route_permissions" as any)
            .update({ allowed })
            .eq("id", existingPerm.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("route_permissions" as any)
            .insert({
              route_id: routeId,
              department: dept,
              role: role,
              allowed,
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Módulos</SelectItem>
              <SelectItem value="telemarketing">Telemarketing</SelectItem>
              <SelectItem value="scouter">Scouter</SelectItem>
              <SelectItem value="admin">Administrativo</SelectItem>
              <SelectItem value="geral">Geral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving || changes.size === 0}>
          <Save className="h-4 w-4 mr-2" />
          Salvar {changes.size > 0 && `(${changes.size})`}
        </Button>
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="text-sm space-y-2">
          <p className="font-semibold">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Marcar checkbox</strong> = Permitir acesso para esse departamento/cargo</li>
            <li><strong>Departamento inteiro</strong> = Usar coluna "Todos" do departamento</li>
            <li><strong>Cargo específico</strong> = Usar coluna do cargo (Ag, Su, Mg)</li>
            <li><strong>Admin</strong> sempre tem acesso a todas as páginas</li>
          </ul>
        </div>
      </Card>

      <div className="space-y-6">
        {modules.map(module => (
          <div key={module}>
            <div className="flex items-center gap-2 mb-3">
              <Badge className={MODULE_COLORS[module] || MODULE_COLORS.geral}>
                {module.charAt(0).toUpperCase() + module.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({groupedRoutes[module].length} página{groupedRoutes[module].length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Página</TableHead>
                    {DEPARTMENTS.map(dept => (
                      <TableHead key={dept} className="text-center" colSpan={ROLES.length}>
                        {DEPT_LABELS[dept as string]}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableHead></TableHead>
                    {DEPARTMENTS.map(dept => (
                      ROLES.map(role => (
                        <TableHead key={`${dept}-${role}`} className="text-center text-xs">
                          {ROLE_LABELS[role]}
                        </TableHead>
                      ))
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRoutes[module].map(route => (
                    <TableRow key={route.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{route.name}</div>
                          <div className="text-xs text-muted-foreground">{route.path}</div>
                        </div>
                      </TableCell>
                      {DEPARTMENTS.map(dept =>
                        ROLES.map(role => {
                          const isAllowed = isPermissionAllowed(route.id, dept as unknown as Department, role);
                          const isAdmin = role === 'admin';
                          
                          return (
                            <TableCell key={`${dept}-${role}`} className="text-center">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={isAllowed}
                                  disabled={isAdmin}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(route.id, dept as unknown as Department, role, checked === true)
                                  }
                                />
                              </div>
                            </TableCell>
                          );
                        })
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold mb-2 text-sm">Legenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {ROLES.map(role => (
            <div key={role} className="flex items-center gap-2">
              <span className="font-mono font-semibold">{ROLE_LABELS[role]}</span>
              <span className="text-muted-foreground capitalize">{role}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
