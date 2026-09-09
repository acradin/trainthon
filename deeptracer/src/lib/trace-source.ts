import { Trace } from "@/types/trace";

export type TraceSource = "claude-code" | "codex" | "cursor" | "example";

export const OTHER_PROJECT = "Other";

export function inferTraceSource(trace: Pick<Trace, "traceId" | "source">): TraceSource {
  if (
    trace.source === "claude-code" ||
    trace.source === "codex" ||
    trace.source === "cursor" ||
    trace.source === "example"
  ) {
    return trace.source;
  }
  if (trace.traceId.startsWith("cc_") || trace.traceId.startsWith("ccsess_")) return "claude-code";
  if (trace.traceId.startsWith("cx_") || trace.traceId.startsWith("codex_")) return "codex";
  if (trace.traceId.startsWith("cu_") || trace.traceId.startsWith("cursor_")) return "cursor";
  return "example";
}

export function sourceLabel(source: TraceSource): string {
  switch (source) {
    case "claude-code":
      return "Claude Code";
    case "codex":
      return "Codex";
    case "cursor":
      return "Cursor";
    default:
      return "Example";
  }
}

export function folderFromPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/[\\/]+$/, "").replace(/[`'"]/g, "");
  if (!cleaned) return undefined;
  const last = cleaned.split(/[\\/]/).filter(Boolean).at(-1);
  if (!last || last === "transcripts" || last === "." || last === "..") return undefined;
  return last;
}

export function projectFromCursorSlug(slug: string): string | undefined {
  const cleaned = slug.trim();
  if (!cleaned || cleaned === "projects" || cleaned === "agent-transcripts") return undefined;
  if (/^(?:[A-Za-z]-Users-|[A-Za-z]--Users-|Users-|home-)/i.test(cleaned)) {
    const last = cleaned.split("-").filter(Boolean).at(-1);
    if (last && last.length > 1) return last;
  }
  return folderFromPath(cleaned.replace(/--+/g, "/")) ?? cleaned;
}

export function inferProject(trace: Pick<Trace, "name" | "project">): string | undefined {
  const stored = folderFromPath(trace.project);
  if (stored && stored !== "Codex") return stored;

  const named = trace.name.match(/(?:Claude Code|Codex|Cursor) · (.+)$/);
  if (named?.[1]) {
    const fromName = folderFromPath(named[1]) ?? named[1].trim();
    if (fromName && fromName !== "Codex") return fromName;
  }

  const labeled = trace.name.match(/(?:Project root|Working directory)\s*:\s*([^\n]+)/i);
  if (labeled?.[1]) {
    const fromLabel = folderFromPath(labeled[1]);
    if (fromLabel) return fromLabel;
  }

  const fromWinPath = [...trace.name.matchAll(/[A-Za-z]:\\[^\s`'"<>|]+/g)]
    .map((match) => folderFromPath(match[0]))
    .find(Boolean);
  if (fromWinPath) return fromWinPath;

  const fromUnixPath = [...trace.name.matchAll(/(?:^|[\s`])(\/(?:Users|home)\/[^\s`'"<>|]+)/g)]
    .map((match) => folderFromPath(match[1]))
    .find(Boolean);
  if (fromUnixPath) return fromUnixPath;

  return undefined;
}

export function projectKey(trace: Pick<Trace, "name" | "project">): string {
  return inferProject(trace) ?? OTHER_PROJECT;
}
