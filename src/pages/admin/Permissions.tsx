import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";
import { UnifiedPermissionsManager } from "@/components/admin/permissions/UnifiedPermissionsManager";

export default function Permissions() {
  return (
    <AdminPageLayout
      title="Gerenciar Permissões"
      description="Configure o acesso de cada função às páginas e recursos do sistema"
      backTo="/admin"
    >
      <UnifiedPermissionsManager />
    </AdminPageLayout>
  );
}
