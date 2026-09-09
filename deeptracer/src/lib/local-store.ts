import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Trace } from "@/types/trace";
import { AgentRegistry } from "@/lib/agents/types";
import { spanSourceHash } from "@/lib/semantic-spans";

const DIR = join(homedir(), ".deeptracer");
const TRACES_PATH = join(DIR, "traces.json");
const REGISTRY_PATH = join(DIR, "registry.json");

function ensureDir() {
  if (!existsSync(DIR)) {
    mkdirSync(DIR, { recursive: true });
  }
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function getLocalTraces(): Trace[] {
  return readJson<Trace[]>(TRACES_PATH, []);
}

export function saveLocalTrace(trace: Trace): void {
  ensureDir();
  const traces = getLocalTraces();
  const existing = traces.find((item) => item.traceId === trace.traceId);
  const next: Trace = { ...trace };
  if (!next.semanticGraph && existing?.semanticGraph) {
    if (existing.semanticGraph.sourceHash === spanSourceHash(next.spans)) {
      next.semanticGraph = existing.semanticGraph;
    }
  }
  writeFileSync(
    TRACES_PATH,
    JSON.stringify([next, ...traces.filter((item) => item.traceId !== next.traceId)], null, 2),
    "utf8"
  );
}

export function getLocalTraceById(traceId: string): Trace | null {
  return getLocalTraces().find((trace) => trace.traceId === traceId) ?? null;
}

export function getRegistry(): AgentRegistry | null {
  return readJson<AgentRegistry | null>(REGISTRY_PATH, null);
}

export function saveRegistry(registry: AgentRegistry): void {
  ensureDir();
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

export function mergeTraces(local: Trace[], remote: Trace[]): Trace[] {
  const map = new Map<string, Trace>();
  for (const trace of remote) map.set(trace.traceId, trace);
  for (const trace of local) map.set(trace.traceId, trace);
  return [...map.values()].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}
