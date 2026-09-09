export type SpanStatus = "success" | "error" | "warning" | "running";
export type SpanType = "llm" | "tool" | "agent" | "memory" | "retrieval" | "system";

export interface Span {
  id: string;
  traceId: string;
  parentId: string | null;
  name: string;
  type: SpanType;
  agent?: string;
  status: SpanStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  input?: Record<string, unknown> | string | null;
  output?: Record<string, unknown> | string | null;
  error?: string;
}

export interface Trace {
  traceId: string;
  name: string;
  status: "success" | "failed" | "running";
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  spans: Span[];
}

export interface Evidence {
  spanId: string;
  spanName: string;
  reason: string;
}

export interface RootCauseAnalysis {
  rootCause: string;
  confidence: number;
  firstErrorSpan: {
    id: string;
    name: string;
    error?: string;
  };
  propagationPath: string[];
  evidence: Evidence[];
  recommendation: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: RootCauseAnalysis;
  error?: string;
}
