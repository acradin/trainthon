import type { TraceSource } from "@/lib/trace-source";

export const DESKTOP_AGENT_IDS = ["claude-code", "codex", "cursor"] as const;
export type AgentId = (typeof DESKTOP_AGENT_IDS)[number];

export function isDesktopAgentId(value: string): value is AgentId {
  return (DESKTOP_AGENT_IDS as readonly string[]).includes(value);
}

export interface DiscoveredAgent {
  id: AgentId;
  name: string;
  installed: boolean;
  path: string;
  sessionCount: number;
  lastActivity?: string;
}

export interface RegisteredAgent {
  id: AgentId;
  name: string;
  enabled: boolean;
  path: string;
  registeredAt: string;
}

export interface AgentRegistry {
  registeredAt: string;
  lastSyncedAt?: string;
  agents: RegisteredAgent[];
}

export interface SyncResult {
  scanned: number;
  imported: number;
  failed: number;
  skipped: number;
  traces: Array<{
    traceId: string;
    name: string;
    status: string;
    source: TraceSource;
    spanCount: number;
  }>;
  errors: string[];
}
