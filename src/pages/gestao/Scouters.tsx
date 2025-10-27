import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import GestaoSidebar from "@/components/gestao/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, Award } from "lucide-react";

interface ScouterData {
  name: string;
  leadsCount: number;
}

export default function GestaoScouters() {
  const { data: scoutersData, isLoading } = useQuery({
    queryKey: ["gestao-scouters"],
    queryFn: async () => {
      // Fetch all leads with pagination to ensure we get more than 1000 records
      const data = await fetchAllLeads<{ scouter: string }>(
        supabase,
        "scouter",
        (query) => query.not("scouter", "is", null)
      );
      
      // Agrupar por scouter e contar
      const scouterCounts = data.reduce((acc: Record<string, number>, lead) => {
        const scouter = lead.scouter || "Sem Scouter";
        if (!acc[scouter]) {
          acc[scouter] = 0;
        }
        acc[scouter]++;
        return acc;
      }, {});
      
      return Object.entries(scouterCounts)
        .map(([name, count]) => ({ name, leadsCount: count as number }))
        .sort((a, b) => b.leadsCount - a.leadsCount);
    },
  });

  const totalLeads = scoutersData?.reduce((sum: number, s: ScouterData) => sum + s.leadsCount, 0) || 0;
  const totalScouters = scoutersData?.length || 0;
  const avgLeadsPerScouter = totalScouters > 0 ? (totalLeads / totalScouters).toFixed(1) : "0";

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Scouters</h1>
          <p className="text-muted-foreground">Performance e estatísticas da equipe</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Scouters
              </CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalScouters}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Scouter
              </CardTitle>
              <Award className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgLeadsPerScouter}</div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando scouters...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Performance Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Nome do Scouter</TableHead>
                    <TableHead className="text-right">Leads Capturados</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoutersData?.map((scouter: ScouterData, index: number) => (
                    <TableRow key={scouter.name}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>{scouter.name}</TableCell>
                      <TableCell className="text-right font-semibold">{scouter.leadsCount}</TableCell>
                      <TableCell className="text-right">
                        {((scouter.leadsCount / totalLeads) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
