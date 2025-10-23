
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useNavigate } from "react-router-dom";

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigPanel = ({ isOpen, onClose }: ConfigPanelProps) => {
  const { settings, isLoading } = useAppSettings();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleOpenSettings = () => {
    navigate('/configuracoes');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl max-h-[90vh] overflow-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Acesso Rápido às Configurações
              </CardTitle>
              <Button variant="ghost" onClick={onClose}>×</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Para acessar todas as configurações do sistema, incluindo parâmetros IQS, 
                  pesos, limiares e classificações de tier, use a página de Configurações.
                </p>
                
                {!isLoading && settings && (
                  <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                    <p className="font-semibold">Configurações Atuais:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span>Valor Base Ficha:</span>
                      <span>R$ {settings.valor_base_ficha.toFixed(2)}</span>
                      
                      <span>Quality Threshold:</span>
                      <span>{settings.quality_threshold}%</span>
                      
                      <span>Peso Foto:</span>
                      <span>{settings.peso_foto}</span>
                      
                      <span>Peso Confirmada:</span>
                      <span>{settings.peso_confirmada}</span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleOpenSettings}
                  disabled={isLoading}
                >
                  Abrir Página de Configurações
                </Button>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
