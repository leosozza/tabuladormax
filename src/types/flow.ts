import type { Json } from "@/integrations/supabase/types";

export type FlowVisibility = "private" | "org" | "public";

export type FlowNodeType = "tabular" | "http_call" | "delay";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  name?: string;
  params?: Record<string, any>;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  metadata?: Record<string, any>;
}

export interface Flow {
  id: string;
  name: string;
  definition: FlowDefinition;
  visibility: FlowVisibility;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type FlowRunStatus = "pending" | "running" | "success" | "failed";

export interface FlowRun {
  id: string;
  flow_id: string;
  status: FlowRunStatus;
  input: Json | null;
  output: Json | null;
  logs: Json | null;
  created_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface FlowExecutionResult {
  status: FlowRunStatus;
  output?: Record<string, any> | null;
  logs?: Array<Record<string, any>>;
  error?: string;
}
