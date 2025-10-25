import { useState, useEffect } from "react";
import { fetchLiveMetrics, type LiveMetrics } from "@/utils/diagnosticsApi";
import { toast } from "sonner";

interface UseLiveMetricsReturn {
  metrics: LiveMetrics | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useLiveMetrics(pollInterval: number = 5000): UseLiveMetricsReturn {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLiveMetrics();
      setMetrics(data);
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching live metrics:", error);
      setError(error);
      toast.error("Erro ao carregar métricas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Set up polling
    const interval = setInterval(refresh, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return { metrics, loading, error, refresh };
}
