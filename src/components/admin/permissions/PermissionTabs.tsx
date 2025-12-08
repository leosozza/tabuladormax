import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, UserCircle } from "lucide-react";
import { RolePermissions } from "./RolePermissions";
import { DepartmentPermissions } from "./DepartmentPermissions";
import { UserPermissions } from "./UserPermissions";

export function PermissionTabs() {
  return (
    <Tabs defaultValue="role" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="role" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Por Função
        </TabsTrigger>
        <TabsTrigger value="department" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Por Departamento
        </TabsTrigger>
        <TabsTrigger value="user" className="flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          Por Usuário
        </TabsTrigger>
      </TabsList>

      <TabsContent value="role">
        <RolePermissions />
      </TabsContent>

      <TabsContent value="department">
        <DepartmentPermissions />
      </TabsContent>

      <TabsContent value="user">
        <UserPermissions />
      </TabsContent>
    </Tabs>
  );
}
