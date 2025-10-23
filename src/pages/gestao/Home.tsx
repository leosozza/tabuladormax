import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, FileText, TrendingUp } from "lucide-react";

export default function GestaoHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestão de Leads</h1>
          <p className="text-gray-600">Dashboard de gestão e análise de scouts</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/scouter/leads')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Visualize e gerencie todos os leads capturados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/scouter/scouters')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Scouters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Gerencie a equipe de scouters e seu desempenho</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Métricas e relatórios de performance</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button onClick={() => navigate('/')} variant="outline">
            ← Voltar para Home
          </Button>
        </div>
      </div>
    </div>
  );
}
