import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, TrendingUp } from "lucide-react";

export default function GestaoAreaDeAbordagem() {
  const { data: areasData, isLoading } = useQuery({
    queryKey: ["gestao-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("local_abordagem, address")
        .not("local_abordagem", "is", null);
      
      if (error) throw error;
      
      // Agrupar por local de abordagem
      const areaCounts = data.reduce((acc: any, lead) => {
        const area = lead.local_abordagem || "Sem localização";
        if (!acc[area]) {
          acc[area] = { count: 0, addresses: new Set() };
        }
        acc[area].count++;
        if (lead.address) {
          acc[area].addresses.add(lead.address);
        }
        return acc;
      }, {});
      
      return Object.entries(areaCounts)
        .map(([area, data]: [string, any]) => ({
          area,
          count: data.count,
          uniqueAddresses: data.addresses.size
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const totalAreas = areasData?.length || 0;
  const totalLeads = areasData?.reduce((sum, a) => sum + a.count, 0) || 0;
  const avgLeadsPerArea = totalAreas > 0 ? (totalLeads / totalAreas).toFixed(1) : "0";

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Área de Abordagem</h1>
          <p className="text-muted-foreground">Análise geográfica de captação</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Áreas
              </CardTitle>
              <MapPin className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAreas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <Users className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Área
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgLeadsPerArea}</div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando áreas...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Área</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {areasData?.map((area, index) => (
                  <div
                    key={area.area}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{area.area}</div>
                        <div className="text-sm text-muted-foreground">
                          {area.uniqueAddresses} endereço(s) único(s)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{area.count}</div>
                      <div className="text-sm text-muted-foreground">leads</div>
                    </div>
                  </div>
                ))}
                {areasData?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma área registrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Calor (Em Desenvolvimento)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Visualização de mapa em breve</p>
                  <p className="text-sm mt-2">Integração com mapas será adicionada</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
