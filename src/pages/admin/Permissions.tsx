import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Permission, RolePermission, PermissionScope, AppRole } from "@/types/database-extensions";
import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";

const SCOPE_LABELS: Record<PermissionScope, string> = {
  global: "Global (Todos)",
  department: "Departamento",
  own: "Próprio",
};

const SCOPE_OPTIONS: PermissionScope[] = ["global", "department", "own"];

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Map<string, PermissionScope>>(new Map());

  const roles: AppRole[] = ["admin", "manager", "supervisor", "agent"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: permsData, error: permsError } = await supabase
        .from("permissions" as any)
        .select("*")
        .order("resource, action");

      if (permsError) throw permsError;

      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from("role_permissions" as any)
        .select("*");

      if (rolePermsError) throw rolePermsError;

      setPermissions(permsData as any || []);
      setRolePermissions(rolePermsData as any || []);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast.error("Erro ao carregar permissões");
    } finally {
      setLoading(false);
    }
  };

  const getScopeForRolePermission = (role: AppRole, permissionId: string): PermissionScope => {
    const key = `${role}-${permissionId}`;
    
    if (changes.has(key)) {
      return changes.get(key)!;
    }

    const rolePerm = rolePermissions.find(
      rp => rp.role === role && rp.permission_id === permissionId
    );

    return rolePerm?.scope || "own";
  };

  const handleScopeChange = (role: AppRole, permissionId: string, scope: PermissionScope) => {
    const key = `${role}-${permissionId}`;
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
        // ✅ FIX: Correção do split de UUID
        const parts = key.split("-");
        const role = parts[0];
        const permissionId = parts.slice(1).join("-");

        const existingRolePerm = rolePermissions.find(
          rp => rp.role === role && rp.permission_id === permissionId
        );

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
              role,
              permission_id: permissionId,
              scope,
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

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getScopeColor = (scope: PermissionScope): string => {
    const colors: Record<PermissionScope, string> = {
      global: "text-green-600 dark:text-green-400",
      department: "text-purple-600 dark:text-purple-400",
      own: "text-orange-600 dark:text-orange-400",
    };
    return colors[scope];
  };

  return (
    <AdminPageLayout
      title="Permissões por Role"
      description="Configure o escopo de acesso para cada role"
      backTo="/admin"
      actions={
        <Button onClick={handleSave} disabled={saving || changes.size === 0}>
          <Save className="h-4 w-4 mr-2" />
          Salvar {changes.size > 0 && `(${changes.size})`}
        </Button>
      }
    >
      <Card className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource}>
                <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {resource}
                </h3>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Permissão</TableHead>
                        {roles.map(role => (
                          <TableHead key={role} className="text-center capitalize">
                            {role}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perms.map(perm => (
                        <TableRow key={perm.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{perm.label}</div>
                              {perm.description && (
                                <div className="text-xs text-muted-foreground">{perm.description}</div>
                              )}
                            </div>
                          </TableCell>
                          {roles.map(role => {
                            const currentScope = getScopeForRolePermission(role, perm.id);
                            return (
                              <TableCell key={role} className="text-center">
                                <Select
                                  value={currentScope}
                                  onValueChange={(value) => 
                                    handleScopeChange(role, perm.id, value as PermissionScope)
                                  }
                                >
                                  <SelectTrigger className={getScopeColor(currentScope)}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
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
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold mb-2">Legenda de Escopos</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {SCOPE_OPTIONS.map(scope => (
            <div key={scope} className="flex items-center gap-2">
              <span className={getScopeColor(scope)}>●</span>
              <span className="font-medium">{SCOPE_LABELS[scope]}</span>
            </div>
          ))}
        </div>
      </Card>
    </AdminPageLayout>
  );
}
