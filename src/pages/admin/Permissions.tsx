import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Route } from "lucide-react";
import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";
import RoutePermissionsManager from "@/components/admin/RoutePermissionsManager";
import ResourcePermissionsManager from "@/components/admin/ResourcePermissionsManager";

export default function Permissions() {

  return (
    <AdminPageLayout
      title="Gerenciar Permissões"
      description="Configure permissões por recurso ou por página"
      backTo="/admin"
    >
      <Tabs defaultValue="resources" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Por Recurso
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Por Página
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          <ResourcePermissionsManager />
        </TabsContent>

        <TabsContent value="routes">
          <RoutePermissionsManager />
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
