import { readFileSync, statSync } from "node:fs";
import { basename, dirname } from "node:path";
import { Span, Trace } from "@/types/trace";
import { inferRunStatus, prepareSpans } from "@/lib/semantic-spans";
import { pickRunTitle } from "@/lib/run-title";
import { folderFromPath, projectFromCursorSlug } from "@/lib/trace-source";

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

function contentBlocks(value: unknown): JsonRecord[] {
  const rec = asRecord(value);
  const content = rec?.content ?? rec?.message ?? value;
  const nested = asRecord(content);
  const inner = nested?.content ?? content;
  if (Array.isArray(inner)) {
    return inner.map((part) => asRecord(part) ?? { type: "text", text: part }).filter(Boolean);
  }
  if (typeof inner === "string" && inner.trim()) return [{ type: "text", text: inner }];
  if (nested && typeof nested.text === "string") return [{ type: "text", text: nested.text }];
  return [];
}

function extractUserQuery(text: string): string {
  const match = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  if (match?.[1]) return match[1].trim();
  return text.trim();
}

function isHarnessOnly(text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  if (/<user_query>\s*<\/user_query>/i.test(value) && extractUserQuery(value).length < 2) return true;
  if (/<(task-notification|system_reminder|agent_transcripts)\b/i.test(value) && !/<user_query>/i.test(value)) {
    return true;
  }
  return false;
}

function sessionIdFromFile(filePath: string): string {
  const name = basename(filePath, ".jsonl");
  const match = name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (match) return match[0].replace(/-/g, "").slice(0, 12);
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

function projectFromFile(filePath: string, events: JsonRecord[]): string | undefined {
  for (const event of events) {
    const message = asRecord(event.message);
    const payload = asRecord(event.payload);
    const cwd =
      folderFromPath(event.cwd) ||
      folderFromPath(event.workspace) ||
      folderFromPath(message?.cwd) ||
      folderFromPath(payload?.cwd);
    if (cwd) return cwd;
  }

  const normalized = filePath.replace(/\\/g, "/");
  const marker = "/agent-transcripts/";
  const index = normalized.toLowerCase().lastIndexOf(marker);
  if (index > 0) {
    const before = normalized.slice(0, index);
    const slug = before.split("/").filter(Boolean).at(-1);
    if (slug) return projectFromCursorSlug(slug);
  }
  return projectFromCursorSlug(basename(dirname(dirname(filePath)))) ?? folderFromPath(dirname(filePath));
}

function pushSpan(spans: Span[], span: Span) {
  if (spans.length >= MAX_SPANS) return;
  spans.push(span);
}

export function importCursorSessionFile(filePath: string): Trace | null {
  try {
    const events = readJsonl(filePath);
    if (events.length === 0) return null;

    const mtime = statSync(filePath).mtimeMs;
    const spans: Span[] = [];
    const traceId = `cu_${sessionIdFromFile(filePath)}`;
    const project = projectFromFile(filePath, events);
    let index = 0;
    let currentUserId: string | null = null;
    let lastSpanId: string | null = null;

    const stamp = (offset: number) => new Date(mtime - Math.max(0, events.length - offset) * 1000).toISOString();

    for (const event of events) {
      const role = String(event.role ?? event.type ?? "").toLowerCase();
      const startedAt = String(
        event.timestamp || event.createdAt || event.ts || event.time || stamp(index + 1)
      );
      const message = event.message ?? event;
      const blocks = contentBlocks(message);
      const toolFromRow = asRecord(event.tool_call) ?? asRecord(event.toolCall) ?? asRecord(event.tool_use);

      if (role === "user" || role === "human") {
        const raw = extractUserQuery(textOf(blocks.length ? blocks : message));
        if (isHarnessOnly(raw) || !raw) continue;
        const id = `${traceId}_${++index}`;
        pushSpan(spans, {
          id,
          traceId,
          parentId: lastSpanId,
          name: "User Message",
          type: "agent",
          agent: "Cursor",
          status: "success",
          startedAt,
          input: { message: truncate(raw) },
        });
        currentUserId = id;
        lastSpanId = id;
        continue;
      }

      if (toolFromRow && (role.includes("tool") || toolFromRow.name)) {
        const id = `${traceId}_${++index}`;
        pushSpan(spans, {
          id,
          traceId,
          parentId: currentUserId ?? lastSpanId,
          name: String(toolFromRow.name || toolFromRow.toolName || "Tool"),
          type: "tool",
          agent: "Cursor",
          status: "success",
          startedAt,
          input: asRecord(toolFromRow.input ?? toolFromRow.arguments ?? toolFromRow.params) ?? undefined,
        });
        lastSpanId = id;
        continue;
      }

      if (role === "assistant" || role === "ai" || role === "model" || blocks.length > 0) {
        for (const block of blocks.length ? blocks : [asRecord(event) ?? event]) {
          const rec = asRecord(block) ?? {};
          const blockType = String(rec.type ?? "");
          if (blockType === "tool_use" || blockType === "tool_call" || Boolean(rec.name && rec.input)) {
            const id = `${traceId}_${++index}`;
            pushSpan(spans, {
              id,
              traceId,
              parentId: currentUserId ?? lastSpanId,
              name: String(rec.name || rec.toolName || "Tool"),
              type: "tool",
              agent: "Cursor",
              status: "success",
              startedAt,
              input: asRecord(rec.input) ?? asRecord(rec.arguments) ?? undefined,
            });
            lastSpanId = id;
            continue;
          }

          const text = truncate(
            textOf(typeof rec.text === "string" || typeof rec.content === "string" ? rec.text ?? rec.content : "")
          );
          if (!text) continue;
          const id = `${traceId}_${++index}`;
          pushSpan(spans, {
            id,
            traceId,
            parentId: currentUserId ?? lastSpanId,
            name: "LLM Response",
            type: "llm",
            agent: "Cursor",
            status: "success",
            startedAt,
            output: { response: text },
          });
          lastSpanId = id;
        }
      }
    }

    if (spans.length === 0) return null;

    const prepared = prepareSpans(spans);
    for (const span of prepared) {
      if (span.status === "running") span.status = "success";
    }
    const start = Math.min(...prepared.map((span) => new Date(span.startedAt).getTime()));
    const end = Math.max(...prepared.map((span) => new Date(span.finishedAt || span.startedAt).getTime()));
    const fallback = project ? `Cursor · ${project}` : "Cursor";

    return {
      traceId,
      name: pickRunTitle({ name: fallback, project, spans: prepared }),
      source: "cursor",
      project,
      status: inferRunStatus(prepared),
      startedAt: new Date(Number.isFinite(start) ? start : mtime).toISOString(),
      finishedAt: new Date(Number.isFinite(end) ? end : mtime).toISOString(),
      duration: Number.isFinite(end - start) ? Math.max(0, end - start) : undefined,
      spans: prepared,
    };
  } catch (error) {
    console.error("Failed to parse Cursor session", filePath, error);
    return null;
  }
}
