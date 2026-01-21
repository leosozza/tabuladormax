import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TelemarketingOperatorData, isSupervisorCargo } from './TelemarketingAccessKeyForm';
import { TeleProfileHero } from './TeleProfileHero';
import { TeleKPICards } from './TeleKPICards';
import { TeleModuleGrid } from './TeleModuleGrid';

interface TelemarketingPortalLayoutProps {
  operatorData: TelemarketingOperatorData;
  onLogout: () => void;
}

export const TelemarketingPortalLayout = ({ operatorData, onLogout }: TelemarketingPortalLayoutProps) => {
  const [currentPhoto, setCurrentPhoto] = useState(operatorData.operator_photo);
  const isSupervisor = isSupervisorCargo(operatorData.cargo);
  const navigate = useNavigate();

  const handlePhotoUpdated = (newPhotoUrl: string) => {
    setCurrentPhoto(newPhotoUrl);
    
    // Update localStorage
    const storageKey = 'telemarketing_operator';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      data.operator_photo = newPhotoUrl;
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  };

  const handleTeamClick = () => {
    // Salvar contexto e navegar para página de equipe
    localStorage.setItem('telemarketing_context', JSON.stringify({
      bitrix_id: operatorData.bitrix_id,
      cargo: operatorData.cargo,
      name: operatorData.operator_name,
      commercial_project_id: operatorData.commercial_project_id
    }));
    navigate('/portal-telemarketing/equipe');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Profile Hero */}
      <TeleProfileHero
        operatorName={operatorData.operator_name}
        operatorPhoto={currentPhoto}
        operatorBitrixId={operatorData.bitrix_id}
        isSupervisor={isSupervisor}
        onLogout={onLogout}
        onPhotoUpdated={handlePhotoUpdated}
      />

      {/* KPI Cards */}
      <TeleKPICards
        commercialProjectId={operatorData.commercial_project_id}
        supervisorBitrixId={operatorData.bitrix_id}
        operatorCargo={operatorData.cargo}
        onTeamClick={isSupervisor ? handleTeamClick : undefined}
      />

      {/* Module Grid */}
      <TeleModuleGrid
        operatorData={operatorData}
        isSupervisor={isSupervisor}
      />
    </div>
  );
};
