import { readFileSync, statSync } from "node:fs";
import { basename, dirname } from "node:path";
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

function readJsonl(filePath: string): JsonRecord[] {
  const size = statSync(filePath).size;
  if (size > MAX_FILE_BYTES) return [];
  const text = readFileSync(filePath, "utf8");
  const rows: JsonRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") rows.push(parsed as JsonRecord);
    } catch {
      // skip malformed lines
    }
    if (rows.length >= MAX_LINES) break;
  }
  return rows;
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

function decodeProjectName(folder: string): string {
  return folder
    .replace(/^C--/, "C:/")
    .replace(/--/g, "/")
    .replace(/-/g, "/")
    .split("/")
    .filter(Boolean)
    .at(-1) || folder;
}

function sessionIdFromFile(filePath: string): string {
  return basename(filePath, ".jsonl").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
}

function pushSpan(spans: Span[], span: Span) {
  if (spans.length >= MAX_SPANS) return;
  spans.push(span);
}

function parseTranscript(filePath: string, events: JsonRecord[]): Trace | null {
  const spans: Span[] = [];
  const traceId = `cc_${sessionIdFromFile(filePath)}`;
  let title = "";
  let lastToolId: string | null = null;
  let index = 0;

  for (const event of events) {
    const type = String(event.type ?? "");
    const startedAt = String(event.timestamp || event.startedAt || new Date().toISOString());
    if (type === "user") {
      const content = truncate(textOf(event.content));
      if (!title && content) title = content;
      pushSpan(spans, {
        id: `${traceId}_${++index}`,
        traceId,
        parentId: null,
        name: "User Message",
        type: "agent",
        agent: "Claude Code",
        status: "success",
        startedAt,
        input: content ? { message: content } : undefined,
      });
    } else if (type === "tool_use") {
      const name = String(event.tool_name || event.name || "Tool");
      lastToolId = `${traceId}_${index + 1}`;
      pushSpan(spans, {
        id: lastToolId,
        traceId,
        parentId: spans[0]?.id ?? null,
        name,
        type: "tool",
        agent: "Claude Code",
        status: "running",
        startedAt,
        input: asRecord(event.tool_input) ?? (event.tool_input ? { input: event.tool_input } : undefined),
      });
      index += 1;
    } else if (type === "tool_result") {
      const isError = event.is_error === true || event.isError === true;
      const output = truncate(textOf(event.content ?? event.result ?? event.output));
      const target = lastToolId ? spans.find((span) => span.id === lastToolId) : undefined;
      if (target) {
        target.status = isError ? "error" : "success";
        target.output = output ? { result: output } : undefined;
        target.error = isError ? output || "Tool failed" : undefined;
        target.finishedAt = startedAt;
      } else {
        pushSpan(spans, {
          id: `${traceId}_${++index}`,
          traceId,
          parentId: spans[0]?.id ?? null,
          name: String(event.tool_name || "Tool Result"),
          type: "tool",
          agent: "Claude Code",
          status: isError ? "error" : "success",
          startedAt,
          output: output ? { result: output } : undefined,
          error: isError ? output || "Tool failed" : undefined,
        });
      }
    }
  }

  if (spans.length === 0) return null;
  return toTrace(traceId, title || `Claude Code · ${decodeProjectName(dirname(filePath))}`, spans, "transcript");
}

function parseProjectSession(filePath: string, events: JsonRecord[]): Trace | null {
  const spans: Span[] = [];
  const traceId = `cc_${sessionIdFromFile(filePath)}`;
  let title = "";
  let index = 0;
  const project = decodeProjectName(basename(dirname(filePath)));

  for (const event of events) {
    const type = String(event.type ?? "");
    const startedAt = String(event.timestamp || new Date().toISOString());
    const message = asRecord(event.message);
    const content = message?.content ?? event.content;

    if (type === "user") {
      if (Array.isArray(content)) {
        for (const part of content) {
          const rec = asRecord(part);
          if (!rec) continue;
          if (rec.type === "tool_result") {
            const isError = rec.is_error === true;
            const output = truncate(textOf(rec.content));
            const toolId = rec.tool_use_id || rec.tool_useId ? `${traceId}_${String(rec.tool_use_id || rec.tool_useId)}` : "";
            const target = toolId ? spans.find((span) => span.id === toolId) : undefined;
            if (target) {
              target.status = isError ? "error" : "success";
              target.output = output ? { result: output } : undefined;
              target.error = isError ? output || "Tool failed" : undefined;
              target.finishedAt = startedAt;
            }
          }
        }
      } else {
        const text = truncate(textOf(content));
        if (!text) continue;
        if (!title) title = text;
        pushSpan(spans, {
          id: `${traceId}_${++index}`,
          traceId,
          parentId: null,
          name: "User Message",
          type: "agent",
          agent: "Claude Code",
          status: "success",
          startedAt,
          input: { message: text },
        });
      }
    } else if (type === "assistant") {
      const parts = Array.isArray(content) ? content : [{ type: "text", text: content }];
      for (const part of parts) {
        const rec = asRecord(part) ?? { type: "text", text: part };
        if (rec.type === "tool_use") {
          const id = `${traceId}_${String(rec.id || index + 1)}`;
          pushSpan(spans, {
            id,
            traceId,
            parentId: spans[0]?.id ?? null,
            name: String(rec.name || "Tool"),
            type: "tool",
            agent: "Claude Code",
            status: "running",
            startedAt,
            input: asRecord(rec.input) ?? undefined,
          });
          index += 1;
        } else if (rec.type === "text" || typeof rec.text === "string") {
          const text = truncate(textOf(rec.text));
          if (!text) continue;
          pushSpan(spans, {
            id: `${traceId}_${++index}`,
            traceId,
            parentId: spans[0]?.id ?? null,
            name: "LLM Response",
            type: "llm",
            agent: "Claude Code",
            status: "success",
            startedAt,
            output: { response: text },
          });
        }
      }
    }
  }

  if (spans.length === 0) return null;
  return toTrace(traceId, title || `Claude Code · ${project}`, spans, project);
}

function toTrace(traceId: string, name: string, spans: Span[], _source: string): Trace {
  const finished = spans.map((span) => span.finishedAt || span.startedAt);
  const start = Math.min(...spans.map((span) => new Date(span.startedAt).getTime()));
  const end = Math.max(...finished.map((value) => new Date(value).getTime()));
  const hasError = spans.some((span) => span.status === "error");
  for (const span of spans) {
    if (span.status === "running") span.status = hasError ? "warning" : "success";
  }
  return {
    traceId,
    name: name.length > 88 ? `${name.slice(0, 88)}…` : name,
    status: hasError ? "failed" : "success",
    startedAt: new Date(start).toISOString(),
    finishedAt: new Date(end).toISOString(),
    duration: Math.max(0, end - start),
    spans,
  };
}

export function importClaudeSessionFile(filePath: string): Trace | null {
  try {
    const events = readJsonl(filePath);
    if (events.length === 0) return null;
    const types = new Set(events.map((event) => String(event.type ?? "")));
    if (types.has("tool_use") && !types.has("assistant")) {
      return parseTranscript(filePath, events);
    }
    if (types.has("user") || types.has("assistant")) {
      return parseProjectSession(filePath, events);
    }
    return null;
  } catch (error) {
    console.error("Failed to parse Claude session", filePath, error);
    return null;
  }
}
