import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { Span, Trace } from "@/types/trace";

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

function cwdName(cwd: unknown): string {
  if (typeof cwd !== "string" || !cwd) return "Codex";
  return cwd.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).at(-1) || "Codex";
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
    let project = "Codex";
    let startedAt = "";
    const callSpans = new Map<string, Span>();
    let index = 0;
    let rootId: string | null = null;

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
        project = cwdName(payload.cwd);
        continue;
      }

      if (type === "event_msg") {
        const eventType = String(payload.type ?? "");
        if (eventType === "error") {
          const message = truncate(textOf(payload.message ?? payload.error ?? payload));
          push({
          id: `${traceId}_${++index}`,
            traceId,
            parentId: rootId,
            name: "Error",
            type: "system",
            agent: "Codex",
            status: "error",
            startedAt: ts,
            error: message || "Codex error",
          });
        }
        continue;
      }

      if (type !== "response_item") continue;
      const itemType = String(payload.type ?? "");

      if (itemType === "message") {
        const role = String(payload.role ?? "assistant");
        const content = truncate(textOf(payload.content));
        if (!content) continue;
        if (role === "user" && !title) title = content;
        const id = `${traceId}_${++index}`;
        if (!rootId) rootId = id;
        push({
          id,
          traceId,
          parentId: role === "user" ? null : rootId,
          name: role === "user" ? "User Message" : "LLM Response",
          type: role === "user" ? "agent" : "llm",
          agent: "Codex",
          status: "success",
          startedAt: ts,
          input: role === "user" ? { message: content } : undefined,
          output: role !== "user" ? { response: content } : undefined,
        });
      } else if (itemType === "function_call" || itemType === "custom_tool_call" || itemType === "web_search_call") {
        const callId = `${traceId}_${String(payload.call_id || payload.id || index + 1)}`;
        const span: Span = {
          id: callId,
          traceId,
          parentId: rootId,
          name: String(payload.name || payload.action || itemType.replace(/_/g, " ")),
          type: "tool",
          agent: "Codex",
          status: "running",
          startedAt: ts,
          input: asRecord(payload.arguments)
            ?? (typeof payload.input === "string" ? { input: truncate(payload.input) } : asRecord(payload.action) ?? undefined),
        };
        callSpans.set(callId, span);
        push(span);
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

    const hasError = spans.some((span) => span.status === "error");
    for (const span of spans) {
      if (span.status === "running") span.status = "success";
    }
    const start = Math.min(...spans.map((span) => new Date(span.startedAt).getTime()));
    const end = Math.max(...spans.map((span) => new Date(span.finishedAt || span.startedAt).getTime()));
    const name = title || `Codex · ${project}`;

    return {
      traceId,
      name: name.length > 88 ? `${name.slice(0, 88)}…` : name,
      status: hasError ? "failed" : "success",
      startedAt: new Date(Number.isFinite(start) ? start : Date.now()).toISOString(),
      finishedAt: new Date(Number.isFinite(end) ? end : Date.now()).toISOString(),
      duration: Number.isFinite(end - start) ? Math.max(0, end - start) : undefined,
      spans,
    };
  } catch (error) {
    console.error("Failed to parse Codex session", filePath, error);
    return null;
  }
}
