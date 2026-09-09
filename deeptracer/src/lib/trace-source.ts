import { Trace } from "@/types/trace";

export const CONNECTOR_SOURCE_IDS = [
  "slack",
  "mattermost",
  "rocketchat",
  "zulip",
  "matrix",
  "github",
  "gitlab",
  "gitea",
  "outline",
  "discourse",
  "plane",
  "openproject",
  "bookstack",
  "taiga",
  "kakao",
  "email",
  "files",
] as const;

export type ConnectorSourceId = (typeof CONNECTOR_SOURCE_IDS)[number];

export type TraceSource =
  | "claude-code"
  | "codex"
  | "cursor"
  | "example"
  | ConnectorSourceId;

export const OTHER_PROJECT = "Other";

const KNOWN_SOURCES = new Set<string>([
  "claude-code",
  "codex",
  "cursor",
  "example",
  ...CONNECTOR_SOURCE_IDS,
]);

const TRACE_PREFIXES: Array<[string, TraceSource]> = [
  ["ccsess_", "claude-code"],
  ["cc_", "claude-code"],
  ["codex_", "codex"],
  ["cx_", "codex"],
  ["cursor_", "cursor"],
  ["cu_", "cursor"],
  ["sl_", "slack"],
  ["mm_", "mattermost"],
  ["rc_", "rocketchat"],
  ["zu_", "zulip"],
  ["mx_", "matrix"],
  ["gh_", "github"],
  ["gl_", "gitlab"],
  ["gt_", "gitea"],
  ["ol_", "outline"],
  ["dc_", "discourse"],
  ["pl_", "plane"],
  ["op_", "openproject"],
  ["bs_", "bookstack"],
  ["tg_", "taiga"],
  ["kk_", "kakao"],
  ["em_", "email"],
  ["fs_", "files"],
];

export function isConnectorSourceId(value: string): value is ConnectorSourceId {
  return (CONNECTOR_SOURCE_IDS as readonly string[]).includes(value);
}

export function inferTraceSource(trace: Pick<Trace, "traceId" | "source">): TraceSource {
  if (trace.source && KNOWN_SOURCES.has(trace.source)) return trace.source as TraceSource;
  for (const [prefix, source] of TRACE_PREFIXES) {
    if (trace.traceId.startsWith(prefix)) return source;
  }
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
    case "slack":
      return "Slack";
    case "mattermost":
      return "Mattermost";
    case "rocketchat":
      return "Rocket.Chat";
    case "zulip":
      return "Zulip";
    case "matrix":
      return "Matrix";
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "gitea":
      return "Gitea";
    case "outline":
      return "Outline";
    case "discourse":
      return "Discourse";
    case "plane":
      return "Plane";
    case "openproject":
      return "OpenProject";
    case "bookstack":
      return "BookStack";
    case "taiga":
      return "Taiga";
    case "kakao":
      return "KakaoTalk";
    case "email":
      return "Email";
    case "files":
      return "Files";
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
