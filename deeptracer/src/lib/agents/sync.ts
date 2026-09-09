import { statSync } from "node:fs";
import { AgentId, RegisteredAgent, SyncResult } from "@/lib/agents/types";
import { filesForAgent } from "@/lib/agents/discover";
import { importClaudeSessionFile } from "@/lib/importers/claude-session";
import { importCodexSessionFile } from "@/lib/importers/codex-session";
import { importCursorSessionFile } from "@/lib/importers/cursor-session";
import { saveTrace } from "@/lib/traces";
import { getRegistry, saveRegistry } from "@/lib/local-store";
import { syncConnectors } from "@/lib/connectors/sync";
import { Trace } from "@/types/trace";

const MAX_SESSIONS_PER_AGENT = 12;
const MAX_CANDIDATE_FILES = 40;

function newestFiles(paths: string[], limit: number): string[] {
  return paths
    .map((filePath) => {
      try {
        return { filePath, mtime: statSync(filePath).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter((item): item is { filePath: string; mtime: number } => Boolean(item))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((item) => item.filePath);
}

function parseFile(id: AgentId, filePath: string): Trace | null {
  if (id === "claude-code") return importClaudeSessionFile(filePath);
  if (id === "cursor") return importCursorSessionFile(filePath);
  return importCodexSessionFile(filePath);
}

export async function syncRegisteredAgents(agents?: RegisteredAgent[]): Promise<SyncResult> {
  const registry = getRegistry();
  const selected = (agents ?? registry?.agents ?? []).filter((agent) => agent.enabled);
  const result: SyncResult = {
    scanned: 0,
    imported: 0,
    failed: 0,
    skipped: 0,
    traces: [],
    errors: [],
  };

  for (const agent of selected) {
    const files = newestFiles(filesForAgent(agent.id), MAX_CANDIDATE_FILES);
    let importedForAgent = 0;
    for (const filePath of files) {
      if (importedForAgent >= MAX_SESSIONS_PER_AGENT) break;
      result.scanned += 1;
      try {
        const trace = parseFile(agent.id, filePath);
        if (!trace) {
          result.skipped += 1;
          continue;
        }
        await saveTrace(trace);
        result.imported += 1;
        importedForAgent += 1;
        result.traces.push({
          traceId: trace.traceId,
          name: trace.name,
          status: trace.status,
          source: agent.id,
          spanCount: trace.spans.length,
        });
        if (trace.status === "failed") result.failed += 1;
      } catch (error) {
        result.skipped += 1;
        result.errors.push(`${agent.id}: ${error instanceof Error ? error.message : "parse failed"}`);
      }
    }
  }

  if (registry) {
    saveRegistry({ ...registry, lastSyncedAt: new Date().toISOString() });
  }

  await syncConnectors(result);
  return result;
}
