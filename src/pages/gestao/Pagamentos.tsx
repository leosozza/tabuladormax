import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GestaoSidebar from "@/components/gestao/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function GestaoPagamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: payments, isLoading } = useQuery({
    queryKey: ["gestao-payments", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .not("valor_ficha", "is", null)
        .order("data_confirmacao_ficha", { ascending: false });
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,scouter.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalValue = payments?.reduce((sum, p) => sum + (Number(p.valor_ficha) || 0), 0) || 0;
  const paidCount = payments?.filter(p => p.ficha_confirmada).length || 0;
  const pendingCount = (payments?.length || 0) - paidCount;

  return (
    <div className="flex min-h-screen bg-background">
      <GestaoSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pagamentos</h1>
          <p className="text-muted-foreground">Controle financeiro de fichas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
              <DollarSign className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">R$ {totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Confirmados
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{paidCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
              <Clock className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <Input
                placeholder="Buscar por nome ou scouter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">Carregando pagamentos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Confirmação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.name || "-"}</TableCell>
                        <TableCell>{payment.scouter || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          R$ {Number(payment.valor_ficha || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {payment.ficha_confirmada ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Confirmado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600">
                              <AlertCircle className="w-4 h-4" />
                              Pendente
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.data_confirmacao_ficha
                            ? format(new Date(payment.data_confirmacao_ficha), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
