import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface LogEntry {
  id: string;
  lead_id: number;
  action_label: string;
  payload: any;
  status: string;
  error?: string;
  created_at: string;
}

const Logs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('actions_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Erro ao carregar logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <Button
          variant="outline"
          onClick={() => navigate(`/lead/1`)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">🧾 Logs de Ações</h1>
            <Button onClick={loadLogs} variant="outline">
              Atualizar
            </Button>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum log encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>{log.lead_id}</TableCell>
                      <TableCell className="font-medium">{log.action_label}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.status === 'OK'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <details className="cursor-pointer">
                          <summary className="text-xs text-blue-600 hover:underline">
                            Ver payload
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto max-w-md">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                          {log.error && (
                            <p className="text-xs text-red-600 mt-1">Erro: {log.error}</p>
                          )}
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Logs;
