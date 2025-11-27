import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Shield, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AppRole, Permission, RolePermission, PermissionScope } from "@/types/database-extensions";

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

const SCOPE_LABELS: Record<PermissionScope, string> = {
  global: "Global (Todos)",
  department: "Departamento",
  own: "Próprio",
};

const SCOPE_OPTIONS: PermissionScope[] = ["global", "department", "own"];

const RESOURCE_COLORS: Record<string, string> = {
  leads: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  users: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  settings: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  reports: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function ResourcePermissionsManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, PermissionScope | null>>(new Map());
  const [selectedRole, setSelectedRole] = useState<AppRole>("agent");
  const [selectedDepartment, setSelectedDepartment] = useState<typeof DEPARTMENTS[number]>("telemarketing");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [permsRes, rolePermsRes] = await Promise.all([
        supabase
          .from("permissions" as any)
          .select("*")
          .order("resource, action"),
        supabase
          .from("role_permissions" as any)
          .select("*"),
      ]);

      if (permsRes.error) throw permsRes.error;
      if (rolePermsRes.error) throw rolePermsRes.error;

      setPermissions(permsRes.data as any || []);
      setRolePermissions(rolePermsRes.data as any || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar permissões de recurso");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionKey = (permissionId: string, dept: string, role: string): string => {
    return `${permissionId}|${dept}|${role}`;
  };

  const getPermissionScope = (permissionId: string, dept: string, role: string): PermissionScope | null => {
    const key = getPermissionKey(permissionId, dept, role);
    
    if (changes.has(key)) {
      return changes.get(key)!;
    }

    const rolePerm = rolePermissions.find(
      rp => rp.permission_id === permissionId && 
           rp.role === role
    );

    return rolePerm?.scope || null;
  };

  const handleScopeChange = (permissionId: string, dept: string, role: string, scope: PermissionScope | null) => {
    const key = getPermissionKey(permissionId, dept, role);
    setChanges(prev => new Map(prev).set(key, scope));
  };

  const handleSave = async () => {
    if (changes.size === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }

    try {
      setSaving(true);

      for (const [key, scope] of changes.entries()) {
        const parts = key.split('|');
        const permissionId = parts[0];
        const dept = parts[1];
        const role = parts[2];

        const existingRolePerm = rolePermissions.find(
          rp => rp.permission_id === permissionId && 
               rp.role === role
        );

        if (scope === null) {
          // Remove permissão se existe
          if (existingRolePerm) {
            const { error } = await supabase
              .from("role_permissions" as any)
              .delete()
              .eq("id", existingRolePerm.id);

            if (error) throw error;
          }
        } else {
          // Atualiza ou cria permissão
          if (existingRolePerm) {
            const { error } = await supabase
              .from("role_permissions" as any)
              .update({ scope })
              .eq("id", existingRolePerm.id);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("role_permissions" as any)
              .insert({
                permission_id: permissionId,
                role: role,
                scope: scope,
              } as any);

            if (error) throw error;
          }
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

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const resources = Object.keys(groupedPermissions).sort();

  const getScopeColor = (scope: PermissionScope | null): string => {
    if (!scope) return "text-muted-foreground";
    const colors: Record<PermissionScope, string> = {
      global: "text-green-600 dark:text-green-400",
      department: "text-purple-600 dark:text-purple-400",
      own: "text-orange-600 dark:text-orange-400",
    };
    return colors[scope];
  };

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
      <Card className="p-4 bg-muted/50">
        <div className="text-sm space-y-2">
          <p className="font-semibold">Permissões por Função e Departamento</p>
          <p className="text-muted-foreground">
            Selecione a <strong>função</strong> e o <strong>departamento</strong>, depois defina o escopo de acesso para cada recurso.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400">●</span>
              <span>Global: Acesso total</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-600 dark:text-purple-400">●</span>
              <span>Departamento: Apenas do dept.</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-orange-600 dark:text-orange-400">●</span>
              <span>Próprio: Apenas seus dados</span>
            </div>
          </div>
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
        </div>

        <Button onClick={handleSave} disabled={saving || changes.size === 0}>
          <Save className="h-4 w-4 mr-2" />
          Salvar {changes.size > 0 && `(${changes.size})`}
        </Button>
      </div>

      <div className="space-y-6">
        {resources.map(resource => (
          <Card key={resource}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className={RESOURCE_COLORS[resource] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({groupedPermissions[resource].length} permiss{groupedPermissions[resource].length !== 1 ? 'ões' : 'ão'})
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {groupedPermissions[resource].map(permission => {
                  const currentScope = getPermissionScope(permission.id, selectedDepartment, selectedRole);
                  const isAdmin = selectedRole === 'admin';
                  
                  return (
                    <div 
                      key={permission.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{permission.label}</div>
                        <div className="text-xs text-muted-foreground">{permission.action}</div>
                        {permission.description && (
                          <div className="text-xs text-muted-foreground mt-1">{permission.description}</div>
                        )}
                      </div>
                      <Select
                        value={currentScope || "none"}
                        disabled={isAdmin}
                        onValueChange={(value) => 
                          handleScopeChange(
                            permission.id, 
                            selectedDepartment, 
                            selectedRole, 
                            value === "none" ? null : value as PermissionScope
                          )
                        }
                      >
                        <SelectTrigger className={`w-[180px] ${getScopeColor(currentScope)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem acesso</SelectItem>
                          {SCOPE_OPTIONS.map(scope => (
                            <SelectItem 
                              key={scope} 
                              value={scope}
                              className={getScopeColor(scope)}
                            >
                              {SCOPE_LABELS[scope]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
            <strong>Nota:</strong> Administradores têm acesso global automático a todos os recursos do sistema.
          </p>
        </Card>
      )}
    </div>
  );
}
