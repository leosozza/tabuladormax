import { supabase } from "@/integrations/supabase/client";

export interface LiveMetrics {
  cpu: number;
  memory: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  source: string;
}

export interface HealthStatus {
  status: "healthy" | "warning" | "critical";
  services: {
    database: boolean;
    cache: boolean;
    api: boolean;
  };
  lastCheck: string;
}

export interface AutoFixIssue {
  id: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  canAutoFix: boolean;
}

/**
 * Fetch live metrics from Edge Function
 */
export async function fetchLiveMetrics(): Promise<LiveMetrics> {
  const { data, error } = await supabase.functions.invoke(
    "diagnostics/metrics",
    { method: "GET" }
  );

  if (error) throw error;
  return data;
}

/**
 * Fetch logs from Edge Function
 */
export async function fetchLogs(
  level?: string,
  limit: number = 100
): Promise<LogEntry[]> {
  const params = new URLSearchParams();
  if (level) params.append("level", level);
  params.append("limit", limit.toString());

  const { data, error } = await supabase.functions.invoke(
    "diagnostics/logs?" + params.toString(),
    { method: "GET" }
  );

  if (error) throw error;
  return data || [];
}

/**
 * Fetch health status from Edge Function
 */
export async function fetchHealthStatus(): Promise<HealthStatus> {
  const { data, error } = await supabase.functions.invoke(
    "diagnostics/health",
    { method: "GET" }
  );

  if (error) throw error;
  return data;
}

/**
 * Trigger auto-fix for a specific issue
 */
export async function triggerAutoFix(issueId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke(
    "diagnostics/auto-fix",
    {
      method: "POST",
      body: { issueId },
    }
  );

  if (error) throw error;
  return data?.success || false;
}
