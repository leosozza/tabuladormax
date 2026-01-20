import { TelemarketingOperatorData, isSupervisorCargo } from './TelemarketingAccessKeyForm';
import { TeleHeader } from './TeleHeader';
import { TeleKPICards } from './TeleKPICards';
import { TeleModuleGrid } from './TeleModuleGrid';
import { TeleBottomNav } from './TeleBottomNav';

interface TelemarketingPortalLayoutProps {
  operatorData: TelemarketingOperatorData;
  onLogout: () => void;
}

export const TelemarketingPortalLayout = ({ operatorData, onLogout }: TelemarketingPortalLayoutProps) => {
  const isSupervisor = isSupervisorCargo(operatorData.cargo);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <TeleHeader
        operatorName={operatorData.operator_name}
        operatorPhoto={operatorData.operator_photo}
        isSupervisor={isSupervisor}
        onLogout={onLogout}
      />

      {/* KPI Cards */}
      <TeleKPICards
        commercialProjectId={operatorData.commercial_project_id}
        supervisorBitrixId={operatorData.bitrix_id}
        operatorCargo={operatorData.cargo}
      />

      {/* Module Grid */}
      <TeleModuleGrid
        operatorData={operatorData}
        isSupervisor={isSupervisor}
      />

      {/* Bottom Navigation */}
      <TeleBottomNav isSupervisor={isSupervisor} />
    </div>
  );
};
