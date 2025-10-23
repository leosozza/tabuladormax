import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";

export default function GestaoScouters() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button onClick={() => navigate('/scouter')} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Scouters</h1>
            <p className="text-gray-600">Gerencie sua equipe de scouters</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipe de Scouters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Funcionalidade de scouters em desenvolvimento</p>
              <p className="text-sm mt-2">A gestão de scouters será exibida aqui em breve</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
