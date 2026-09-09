import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { Span, Trace } from "@/types/trace";
import { inferRunStatus, prepareSpans } from "@/lib/semantic-spans";
import { pickRunTitle, isInjectedContext } from "@/lib/run-title";
import { folderFromPath } from "@/lib/trace-source";

const MAX_FILE_BYTES = 6_000_000;
const MAX_LINES = 2500;
const MAX_SPANS = 80;
const MAX_TEXT = 1600;

type JsonRecord = Record<string, unknown>;

function truncate(value: string, max = MAX_TEXT): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}…`;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        const rec = asRecord(part);
        if (!rec) return typeof part === "string" ? part : "";
        if (typeof rec.text === "string") return rec.text;
        if (typeof rec.content === "string") return rec.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (asRecord(value)) return JSON.stringify(value);
  return "";
}

function looksLikeError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("error:") ||
    lower.includes("exit_code") && lower.includes("\"exit_code\": 1") ||
    lower.includes("\"success\": false") ||
    lower.includes("command failed")
  );
}

function sessionIdFromFile(filePath: string): string {
  const name = basename(filePath, ".jsonl");
  const match = name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (match) return match[0].replace(/-/g, "").slice(0, 12);
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(-12);
}

function asToolName(payload: JsonRecord, fallback: string): string {
  if (typeof payload.name === "string" && payload.name.trim()) return payload.name.trim();
  const action = asRecord(payload.action);
  if (typeof action?.type === "string" && action.type.trim()) return action.type.trim();
  if (typeof action?.name === "string" && action.name.trim()) return action.name.trim();
  if (action && (action.query || action.url)) return "web_search";
  return fallback.replace(/_/g, " ");
}

function asToolInput(payload: JsonRecord): Span["input"] {
  const fromArgs = asRecord(payload.arguments);
  if (fromArgs) return fromArgs;
  if (typeof payload.arguments === "string") {
    try {
      const parsed = JSON.parse(payload.arguments);
      const rec = asRecord(parsed);
      if (rec) return rec;
      return { input: truncate(payload.arguments) };
    } catch {
      return { input: truncate(payload.arguments) };
    }
  }
  if (typeof payload.input === "string") return { input: truncate(payload.input) };
  return asRecord(payload.action) ?? undefined;
}

function cwdFromRows(rows: JsonRecord[]): string | undefined {
  for (const row of rows) {
    const payload = asRecord(row.payload);
    const cwd =
      folderFromPath(row.cwd) ||
      folderFromPath(payload?.cwd) ||
      folderFromPath(payload?.workdir) ||
      folderFromPath(payload?.working_directory);
    if (cwd) return cwd;
  }
  return undefined;
}

export function importCodexSessionFile(filePath: string): Trace | null {
  try {
    const size = statSync(filePath).size;
    if (size > MAX_FILE_BYTES) return null;

    const rows: JsonRecord[] = [];
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") rows.push(parsed as JsonRecord);
      } catch {
        // skip malformed lines
      }
      if (rows.length >= MAX_LINES) break;
    }
    if (rows.length === 0) return null;

    const spans: Span[] = [];
    const traceId = `cx_${sessionIdFromFile(filePath)}`;
    let title = "";
    let project = cwdFromRows(rows);
    let startedAt = "";
    const callSpans = new Map<string, Span>();
    let index = 0;
    let rootId: string | null = null;
    let lastId: string | null = null;

    const push = (span: Span) => {
      if (spans.length >= MAX_SPANS) return;
      spans.push(span);
    };

    for (const row of rows) {
      const type = String(row.type ?? "");
      const payload = asRecord(row.payload) ?? {};
      const ts = String(row.timestamp || payload.timestamp || payload.started_at || new Date().toISOString());
      if (!startedAt) startedAt = ts;

      if (type === "session_meta") {
        project = folderFromPath(payload.cwd) ?? project;
        continue;
      }

      if (type === "event_msg") {
        const eventType = String(payload.type ?? "");
        if (eventType === "error") {
          const message = truncate(textOf(payload.message ?? payload.error ?? payload));
          const id = `${traceId}_${++index}`;
          push({
            id,
            traceId,
            parentId: rootId ?? lastId,
            name: "Error",
            type: "system",
            agent: "Codex",
            status: "error",
            startedAt: ts,
            error: message || "Codex error",
          });
          lastId = id;
        }
        continue;
      }

      if (type !== "response_item") continue;
      const itemType = String(payload.type ?? "");

      if (itemType === "message") {
        const role = String(payload.role ?? "assistant");
        const content = truncate(textOf(payload.content));
        if (!content) continue;
        const injected = role === "user" || role === "developer" ? isInjectedContext(content) : false;
        if (role === "user" && !injected && !title) title = content;
        const id = `${traceId}_${++index}`;
        if (role === "developer" || (role === "user" && injected)) {
          push({
            id,
            traceId,
            parentId: lastId,
            name: "Context",
            type: "memory",
            agent: "Codex",
            status: "success",
            startedAt: ts,
            input: { message: content },
          });
          lastId = id;
        } else if (role === "user") {
          push({
            id,
            traceId,
            parentId: lastId,
            name: "User Message",
            type: "agent",
            agent: "Codex",
            status: "success",
            startedAt: ts,
            input: { message: content },
          });
          rootId = id;
          lastId = id;
        } else {
          if (!rootId) rootId = id;
          push({
            id,
            traceId,
            parentId: rootId,
            name: "LLM Response",
            type: "llm",
            agent: "Codex",
            status: "success",
            startedAt: ts,
            output: { response: content },
          });
          lastId = id;
        }
      } else if (itemType === "function_call" || itemType === "custom_tool_call" || itemType === "web_search_call") {
        const callId = `${traceId}_${String(payload.call_id || payload.id || index + 1)}`;
        const span: Span = {
          id: callId,
          traceId,
          parentId: rootId,
          name: asToolName(payload, itemType),
          type: "tool",
          agent: "Codex",
          status: "running",
          startedAt: ts,
          input: asToolInput(payload),
        };
        callSpans.set(callId, span);
        push(span);
        lastId = callId;
        index += 1;
      } else if (itemType === "function_call_output" || itemType === "custom_tool_call_output" || itemType === "tool_search_output") {
        const callId = `${traceId}_${String(payload.call_id || "")}`;
        const output = truncate(textOf(payload.output ?? payload));
        const isError = looksLikeError(output);
        const target = callSpans.get(callId) ?? spans.find((span) => span.id === callId);
        if (target) {
          target.status = isError ? "error" : "success";
          target.output = output ? { result: output } : undefined;
          target.error = isError ? output : undefined;
          target.finishedAt = ts;
        }
      }
    }

    if (spans.length === 0) return null;

    for (const span of spans) {
      if (span.status === "running") span.status = "success";
    }
    const prepared = prepareSpans(spans);
    const start = Math.min(...prepared.map((span) => new Date(span.startedAt).getTime()));
    const end = Math.max(...prepared.map((span) => new Date(span.finishedAt || span.startedAt).getTime()));
    const name = pickRunTitle({
      name: title || (project ? `Codex · ${project}` : "Codex"),
      project,
      spans: prepared,
    });

    return {
      traceId,
      name,
      source: "codex",
      project,
      status: inferRunStatus(prepared),
      startedAt: new Date(Number.isFinite(start) ? start : Date.now()).toISOString(),
      finishedAt: new Date(Number.isFinite(end) ? end : Date.now()).toISOString(),
      duration: Number.isFinite(end - start) ? Math.max(0, end - start) : undefined,
      spans: prepared,
    };
  } catch (error) {
    console.error("Failed to parse Codex session", filePath, error);
    return null;
  }
}
