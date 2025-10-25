import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, BarChart3 } from 'lucide-react';

interface TelemarketingAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TelemarketingAccessModal: React.FC<TelemarketingAccessModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Telemarketing</DialogTitle>
          <DialogDescription>
            Escolha sua área de trabalho
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Gestão de Leads */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500/50 group"
            onClick={() => handleNavigate('/lead')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gestão de Leads</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Trabalhe com seus leads
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Importação de leads
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Gestão operacional
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Ações em tempo real
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Dashboard */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-500/50 group"
            onClick={() => handleNavigate('/dashboard')}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Dashboard</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Métricas e estatísticas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Estatísticas gerais
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Análise de performance
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Relatórios de ações
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
