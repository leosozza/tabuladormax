import { AdminPageLayout } from "@/components/layouts/AdminPageLayout";
import { PermissionTabs } from "@/components/admin/permissions/PermissionTabs";

export default function Permissions() {
  return (
    <AdminPageLayout
      title="Gerenciar Permissões"
      description="Configure o acesso por função, departamento ou usuário específico"
      backTo="/admin"
    >
      <PermissionTabs />
    </AdminPageLayout>
  );
}
