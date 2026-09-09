import { Span, Trace } from "@/types/trace";
import { inferProject } from "@/lib/trace-source";

const TITLE_MAX = 96;

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function spanMessage(span: Span): string {
  if (typeof span.input === "string") return span.input;
  if (!span.input || typeof span.input !== "object") return "";
  const rec = span.input as Record<string, unknown>;
  if (Array.isArray(rec.items)) {
    return rec.items
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join("\n");
  }
  const value = rec.message ?? rec.text ?? rec.content;
  return typeof value === "string" ? value : "";
}

export function isInjectedContext(text: string): boolean {
  const value = compact(text);
  if (!value) return false;
  if (/<user_query>\s*[\s\S]{3,}?<\/user_query>/i.test(value)) return false;
  if (/\[1\]\s*user:/i.test(value) && /transcript/i.test(value)) return false;

  if (
    /<(recommended_plugins|app-context|environment_context|INSTRUCTIONS|collaboration)\b/i.test(
      value
    )
  ) {
    return true;
  }
  if (/^#\s+AGENTS\.md instructions/i.test(value)) return true;
  if (/^#\s+Codex desktop context/i.test(value)) return true;
  if (/^\[Execution environment\]/i.test(value)) return true;
  if (/^here is a list of plugins that are available/i.test(value)) return true;
  if (/files mentioned by the user:/i.test(value)) return true;
  if (/these AGENTS\.md instructions replace/i.test(value)) return true;
  if (/you have oh-my-codex installed/i.test(value)) return true;
  if (/AUTONOMY DIRECTIVE/i.test(value) && /operating contract/i.test(value)) return true;
  return false;
}

function isUserMessage(span: Span): boolean {
  return span.name === "User Message" || /^user(\s+message)?$/i.test(span.name);
}

function unwrap(text: string): string {
  let value = text.trim();
  if (!value) return "";

  const query = value.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  if (query?.[1] && compact(query[1]).length > 2) {
    value = query[1];
  }

  const args = value.match(/<command-args>([\s\S]*?)(?:<\/command-args>|$)/i);
  if (args?.[1] && compact(args[1]).length > 12) {
    value = args[1];
  }

  const request = value.match(/##\s*My request:\s*([\s\S]+)/i) ?? value.match(/\bMy request:\s*([\s\S]+)/i);
  if (request?.[1] && compact(request[1]).length > 8) {
    value = request[1];
  }

  value = value
    .replace(/<\/?[a-z][\w:-]*\b[^>]*>/gi, " ")
    .replace(/^Project root:\s*`?[^`.]+`?\.?\s*/i, "")
    .replace(/^Working directory:\s*`?[^`.]+`?\.?\s*/i, "")
    .replace(/^#\s+AGENTS\.md instructions(?:\s+for\s+\S+)?\s*/i, "")
    .replace(/^#\s+CLAUDE\.md[^\n]*\n?/i, "")
    .replace(/^#+\s+/, "")
    .replace(/\s+for workspace\s+[^.]+/gi, "")
    .replace(/\*\*/g, "")
    .replace(/^>\s+/, "");

  const beforeQuote = compact(value).split(/\s+>\s+/)[0];
  if (beforeQuote.length >= 10) value = beforeQuote;

  return compact(value);
}

function isNoise(text: string): boolean {
  const value = compact(text);
  if (value.length < 8) return true;
  if (isInjectedContext(value)) return true;
  if (/^['"`]?--[a-z0-9-]+['"`]?$/i.test(value)) return true;
  if (/AGENTS\.md|CLAUDE\.md|AUTONOMY DIRECTIVE/i.test(value)) return true;
  if (/you are an autonomous coding agent/i.test(value)) return true;
  if (/<(task-notification|local-command)\b/i.test(value)) return true;
  if (/codex agent history/i.test(value)) return true;
  if (/you are working inside orca/i.test(value)) return true;
  if (/you are a dispatched worker/i.test(value)) return true;
  return false;
}

function headline(text: string): string {
  const cleaned = unwrap(text);
  if (!cleaned) return "";

  const sentenceMatch = cleaned.match(/^(.+?[.?!])(?:\s|$)/);
  const sentence = sentenceMatch?.[1] ?? cleaned;
  const source = sentence.length >= 12 && sentence.length <= 140 ? sentence : cleaned;
  if (source.length <= TITLE_MAX) return source.replace(/\.$/, "");

  const slice = source.slice(0, TITLE_MAX);
  const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("、"), slice.lastIndexOf(","));
  const clipped = (breakAt > 48 ? slice.slice(0, breakAt) : slice).replace(/[.,;:]+$/, "");
  return `${clipped}…`;
}

export function pickRunTitle(trace: Pick<Trace, "name" | "project" | "spans">): string {
  const users = [...trace.spans]
    .filter(isUserMessage)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  for (const span of users) {
    const raw = spanMessage(span);
    if (!raw || isInjectedContext(raw)) continue;
    const title = headline(raw);
    if (title && !isNoise(title)) return title;
  }

  const stored = headline(trace.name || "");
  if (stored && !isNoise(trace.name || "") && !isNoise(stored)) return stored;

  const project = inferProject(trace);
  return project ? `${project} run` : "Untitled run";
}
