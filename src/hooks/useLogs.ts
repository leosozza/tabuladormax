import { useState, useEffect } from "react";
import { fetchLogs, type LogEntry } from "@/utils/diagnosticsApi";
import { toast } from "sonner";

interface UseLogsReturn {
  logs: LogEntry[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useLogs(level?: string, limit: number = 100): UseLogsReturn {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLogs(level, limit);
      setLogs(data);
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching logs:", error);
      setError(error);
      toast.error("Erro ao carregar logs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [level, limit]);

  return { logs, loading, error, refresh };
}
