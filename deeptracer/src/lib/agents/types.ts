export type AgentId = "claude-code" | "codex";

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
    source: AgentId;
    spanCount: number;
  }>;
  errors: string[];
}
