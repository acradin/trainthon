import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ConnectorSourceId } from "@/lib/trace-source";
import { CONNECTOR_SOURCE_IDS, sourceLabel } from "@/lib/trace-source";
import type { ConnectorConfig, ConnectorRegistry, PublicConnector } from "@/lib/connectors/types";

const DIR = join(homedir(), ".deeptracer");
const CONNECTORS_PATH = join(DIR, "connectors.json");

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function getConnectorRegistry(): ConnectorRegistry {
  const stored = readJson<ConnectorRegistry | null>(CONNECTORS_PATH, null);
  if (!stored || !Array.isArray(stored.connectors)) {
    return { connectors: [] };
  }
  return stored;
}

export function saveConnectorRegistry(registry: ConnectorRegistry): void {
  ensureDir();
  writeFileSync(CONNECTORS_PATH, JSON.stringify(registry, null, 2), "utf8");
}

export function upsertConnector(connector: ConnectorConfig): ConnectorRegistry {
  const registry = getConnectorRegistry();
  const next = registry.connectors.filter((item) => item.id !== connector.id);
  next.push(connector);
  const updated = { ...registry, connectors: next };
  saveConnectorRegistry(updated);
  return updated;
}

export function removeConnector(id: ConnectorSourceId): ConnectorRegistry {
  const registry = getConnectorRegistry();
  const updated = {
    ...registry,
    connectors: registry.connectors.filter((item) => item.id !== id),
  };
  saveConnectorRegistry(updated);
  return updated;
}

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "connected";
  return `…${trimmed.slice(-4)}`;
}

export function publicConnectors(): PublicConnector[] {
  const registry = getConnectorRegistry();
  const byId = new Map(registry.connectors.map((item) => [item.id, item]));
  const ids = CONNECTOR_SOURCE_IDS;
  return ids.map((id) => {
    const connected = byId.get(id);
    return {
      id,
      name: sourceLabel(id),
      connected: Boolean(connected),
      enabled: connected?.enabled !== false,
      summary: connected ? summarizeConnector(connected) : "Not connected",
    };
  });
}

function summarizeConnector(connector: ConnectorConfig): string {
  if (connector.id === "kakao" || connector.id === "files") return connector.path;
  if (connector.id === "email") return `${connector.user} @ ${connector.host}`;
  if (connector.id === "github") return connector.repo?.trim() || `Token ${maskSecret(connector.token)}`;
  if (connector.id === "slack") return `Token ${maskSecret(connector.token)}`;
  return (
    connector.project?.trim() ||
    connector.url?.trim() ||
    connector.user?.trim() ||
    `Token ${maskSecret(connector.token)}`
  );
}

export function hasConnectors(): boolean {
  return getConnectorRegistry().connectors.some((item) => item.enabled);
}
