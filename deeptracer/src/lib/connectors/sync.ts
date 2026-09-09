import { saveTrace } from "@/lib/traces";
import { getConnectorRegistry, saveConnectorRegistry } from "@/lib/connectors/store";
import type { ConnectorConfig } from "@/lib/connectors/types";
import { importSlackWorkspace } from "@/lib/importers/slack";
import { importKakaoExports } from "@/lib/importers/kakao-export";
import { importEmailImap } from "@/lib/importers/email-imap";
import { importFilesDirectory } from "@/lib/importers/files-source";
import { importGitHub } from "@/lib/importers/github";
import { importRemoteConnector } from "@/lib/importers/remote";
import { isRemoteConnector } from "@/lib/connectors/types";
import type { SyncResult } from "@/lib/agents/types";
import { Trace } from "@/types/trace";

async function tracesFor(connector: ConnectorConfig): Promise<Trace[]> {
  if (isRemoteConnector(connector)) return importRemoteConnector(connector);
  switch (connector.id) {
    case "slack":
      return importSlackWorkspace(connector);
    case "kakao":
      return importKakaoExports(connector.path);
    case "email":
      return importEmailImap(connector);
    case "files":
      return importFilesDirectory(connector.path);
    case "github":
      return importGitHub(connector);
  }
}

export async function syncConnectors(result: SyncResult): Promise<void> {
  const registry = getConnectorRegistry();
  const selected = registry.connectors.filter((item) => item.enabled);
  for (const connector of selected) {
    try {
      const traces = await tracesFor(connector);
      for (const trace of traces) {
        result.scanned += 1;
        await saveTrace(trace);
        result.imported += 1;
        result.traces.push({
          traceId: trace.traceId,
          name: trace.name,
          status: trace.status,
          source: trace.source ?? connector.id,
          spanCount: trace.spans.length,
        });
      }
      if (traces.length === 0) result.skipped += 1;
    } catch (error) {
      result.skipped += 1;
      result.errors.push(
        `${connector.id}: ${error instanceof Error ? error.message : "sync failed"}`
      );
    }
  }
  saveConnectorRegistry({ ...registry, lastSyncedAt: new Date().toISOString() });
}
