import { isDesktopAgentId, type AgentId } from "@/lib/agents/types";
import { isConnectorSourceId, type ConnectorSourceId } from "@/lib/trace-source";

export type RunsRangeKey = "today" | "7d" | "all";
export type RunsAgentKey = "all" | AgentId | "example" | ConnectorSourceId;
export type RunsSortKey = "newest" | "oldest" | "duration" | "intent" | "name";

export type RunsFilters = {
  range: RunsRangeKey;
  agent: RunsAgentKey;
  project: string;
  sort: RunsSortKey;
  query: string;
};

const STORAGE_KEY = "deeptracer.runs.filters";

export const DEFAULT_RUNS_FILTERS: RunsFilters = {
  range: "today",
  agent: "all",
  project: "all",
  sort: "newest",
  query: "",
};

let cached: RunsFilters | null = null;

function isRangeKey(value: unknown): value is RunsRangeKey {
  return value === "today" || value === "7d" || value === "all";
}

function isSortKey(value: unknown): value is RunsSortKey {
  return (
    value === "newest" ||
    value === "oldest" ||
    value === "duration" ||
    value === "intent" ||
    value === "name"
  );
}

function isAgentKey(value: unknown): value is RunsAgentKey {
  return (
    value === "all" ||
    value === "example" ||
    (typeof value === "string" && (isDesktopAgentId(value) || isConnectorSourceId(value)))
  );
}

function parseFilters(value: unknown): RunsFilters {
  const rec = value && typeof value === "object" ? (value as Partial<RunsFilters>) : {};
  return {
    range: isRangeKey(rec.range) ? rec.range : DEFAULT_RUNS_FILTERS.range,
    agent: isAgentKey(rec.agent) ? rec.agent : DEFAULT_RUNS_FILTERS.agent,
    project: typeof rec.project === "string" && rec.project.trim() ? rec.project : DEFAULT_RUNS_FILTERS.project,
    sort: isSortKey(rec.sort) ? rec.sort : DEFAULT_RUNS_FILTERS.sort,
    query: typeof rec.query === "string" ? rec.query : DEFAULT_RUNS_FILTERS.query,
  };
}

function readSession(): RunsFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseFilters(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function peekRunsFilters(): RunsFilters {
  return cached ?? DEFAULT_RUNS_FILTERS;
}

export function restoreRunsFilters(): RunsFilters {
  if (cached) return cached;
  cached = readSession() ?? DEFAULT_RUNS_FILTERS;
  return cached;
}

export function writeRunsFilters(filters: RunsFilters): void {
  cached = filters;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // private mode / quota
  }
}
