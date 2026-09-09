import { createHash } from "node:crypto";
import { Span, Trace } from "@/types/trace";
import type { TraceSource } from "@/lib/trace-source";

export function shortHash(value: string, size = 12): string {
  return createHash("sha1").update(value).digest("hex").slice(0, size);
}

export function clipText(value: string, max = 4000): string {
  const text = value.replace(/\u0000/g, "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function titleOf(value: string, fallback: string, max = 72): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

export type ConversationMessage = {
  at: string;
  author: string;
  text: string;
};

export function buildConversationTrace(opts: {
  traceId: string;
  source: TraceSource;
  project?: string;
  name: string;
  agent: string;
  messages: ConversationMessage[];
}): Trace | null {
  const messages = opts.messages.filter((item) => item.text.trim());
  if (messages.length === 0) return null;

  const spans: Span[] = [];
  let parent: string | null = null;
  for (const [index, message] of messages.entries()) {
    const id = `${opts.traceId}_${index + 1}`;
    const obtained = titleOf(message.text, message.author, 42);
    spans.push({
      id,
      traceId: opts.traceId,
      parentId: parent,
      name: obtained,
      type: index === 0 ? "agent" : "memory",
      agent: opts.agent,
      status: "success",
      startedAt: message.at,
      finishedAt: message.at,
      input: { author: message.author, message: clipText(message.text) },
      output: { obtained, family: "llm", semantic: true },
    });
    parent = id;
  }

  const start = new Date(spans[0].startedAt).getTime();
  const end = new Date(spans[spans.length - 1].startedAt).getTime();
  return {
    traceId: opts.traceId,
    name: opts.name,
    source: opts.source,
    project: opts.project,
    status: "success",
    startedAt: spans[0].startedAt,
    finishedAt: spans[spans.length - 1].startedAt,
    duration: Number.isFinite(end - start) ? Math.max(0, end - start) : undefined,
    spans,
  };
}
