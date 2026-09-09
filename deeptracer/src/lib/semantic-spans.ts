import { Span, Trace } from "@/types/trace";
import { inferTraceSource, inferProject } from "@/lib/trace-source";
import { pickRunTitle, isInjectedContext, spanMessage } from "@/lib/run-title";

export type SemanticFamily = "search" | "browser" | "read" | "write" | "shell" | "llm";

const KIND_LABEL: Record<SemanticFamily, string> = {
  search: "Search",
  browser: "Page",
  read: "File",
  write: "Edit",
  shell: "Shell",
  llm: "LLM",
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[_-]+/g, " ").trim();
}

export function semanticFamily(span: Span): SemanticFamily | null {
  const stored = evidenceFamily(span);
  if (stored) return stored;
  if (span.type === "agent" || span.type === "system" || span.type === "memory") return null;
  if (span.type === "llm") return "llm";
  const name = normalize(span.name);
  if (/(web )?search|websearch|tavily|exa|brave|google|bing|duckduckgo|tool search|^grep\b/.test(name)) {
    return "search";
  }
  if (/browser|navigate|click|extract|screenshot|playwright|puppeteer|computer use|webfetch|web fetch/.test(name)) {
    return "browser";
  }
  if (/^(read|read file|readfile|glob)\b/.test(name) || name === "cat") return "read";
  if (/write|edit|apply patch|applypatch|strreplace|search replace/.test(name)) return "write";
  if (/shell|bash|zsh|powershell|exec|command|terminal/.test(name)) return "shell";
  if (span.type === "tool" || span.type === "retrieval") return null;
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function evidenceFamily(span: Span): SemanticFamily | null {
  const family = asRecord(span.output)?.family;
  if (
    family === "search" ||
    family === "browser" ||
    family === "read" ||
    family === "write" ||
    family === "shell" ||
    family === "llm"
  ) {
    return family;
  }
  return null;
}

export function spanKindLabel(span: Span): string {
  const family = semanticFamily(span);
  if (family) return KIND_LABEL[family];
  if (span.name === "Context" || span.type === "memory") return "Context";
  if (span.type === "llm") return "LLM";
  return span.type.charAt(0).toUpperCase() + span.type.slice(1);
}

export function attemptCount(span: Span): number {
  const attempts = asRecord(span.output)?.attempts;
  return typeof attempts === "number" && attempts > 0 ? attempts : 1;
}

export function evidenceCalls(span: Span): Array<{ name: string; status: Span["status"]; error?: string }> {
  const calls = asRecord(span.output)?.calls;
  if (!Array.isArray(calls)) return [];
  return calls
    .map((item) => {
      const rec = asRecord(item);
      if (!rec || typeof rec.name !== "string") return null;
      const status = rec.status;
      if (status !== "success" && status !== "error" && status !== "warning" && status !== "running") {
        return { name: rec.name, status: "success" as const };
      }
      return {
        name: rec.name,
        status,
        error: typeof rec.error === "string" ? rec.error : undefined,
      };
    })
    .filter((item): item is { name: string; status: Span["status"]; error?: string } => Boolean(item));
}

export function evidenceResult(span: Span): unknown {
  const output = asRecord(span.output);
  if (!output?.family) return span.output;
  if (output.last !== undefined) return output.last;
  return undefined;
}

export function softenToolErrors(spans: Span[]): Span[] {
  return spans.map((span) => {
    if (span.type === "tool" && span.status === "error") {
      return { ...span, status: "warning" };
    }
    return span;
  });
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text || undefined;
}

function clip(value: string, max = 42): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function fileName(value: string): string {
  return value.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).at(-1) || value;
}

function pageName(value: string): string {
  try {
    const url = new URL(value);
    const last = url.pathname.replace(/\/$/, "").split("/").filter(Boolean).at(-1);
    return last || url.hostname;
  } catch {
    return fileName(value);
  }
}

function pick(record: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = str(record[key]);
    if (value) return value;
  }
  return undefined;
}

function firstTitle(value: unknown): string | undefined {
  if (!Array.isArray(value) || !value[0]) return undefined;
  if (typeof value[0] === "string") return str(value[0]);
  return pick(asRecord(value[0]), ["title", "name", "url", "snippet", "text"]);
}

function isGenericName(name: string): boolean {
  return /^(web ?search|websearch|web fetch|webfetch|read( file)?|write|edit|bash|shell|zsh|grep|glob|navigate|click|screenshot|browse(r)?|tool|function call|llm response|assistant|cat|ls|exec|command|apply patch|search ×\d+|browser ×\d+|read ×\d+|edit ×\d+|shell ×\d+|llm ×\d+)$/i.test(
    normalize(name)
  );
}

function stripVerb(name: string): string {
  const stripped = name.replace(
    /^(extract|navigate|read|write|edit|search|fetch|open|get|run|browse)\s+/i,
    ""
  ).trim();
  return stripped || name;
}

function ioOf(span: Span): { input: Record<string, unknown> | null; output: Record<string, unknown> | null } {
  const output = asRecord(span.output);
  const last = asRecord(output?.last) ?? output;
  const input = typeof span.input === "string" ? { value: span.input } : asRecord(span.input);
  return { input, output: last };
}

function labelOne(span: Span, family: SemanticFamily | null): string | undefined {
  if (span.type === "agent" || span.type === "system" || span.type === "memory") return span.name;

  const stored = str(asRecord(span.output)?.obtained);
  if (stored) return stored;
  if (family === "llm" && !isGenericName(span.name)) return span.name;

  const { input, output } = ioOf(span);
  const fromOutput =
    pick(output, ["title", "summary", "result", "response", "obtained"]) ||
    firstTitle(output?.results) ||
    firstTitle(output?.files);
  const fromInput =
    pick(input, ["query", "q", "pattern", "description", "url", "file_path", "path", "file", "command", "cmd", "selector", "input", "value", "message"]);

  if (family === "read" || family === "write") {
    const path = pick(input, ["file_path", "path", "file"]) || pick(output, ["file_path", "path", "file"]);
    if (path) return fileName(path);
  }
  if (family === "browser") {
    if (!isGenericName(span.name)) return stripVerb(span.name);
    if (fromOutput && !/^https?:/i.test(fromOutput)) return fromOutput;
    const url = pick(input, ["url"]) || pick(output, ["url"]);
    if (url) return pageName(url);
    const selector = pick(input, ["selector"]);
    if (selector) return selector.replace(/^[#.]/, "");
  }
  if (family === "search") {
    if (fromOutput) return fromOutput;
    if (fromInput) return fromInput;
  }
  if (family === "shell") {
    const command = pick(input, ["command", "cmd", "input", "value"]);
    if (command) return command;
  }
  if (fromOutput) return fromOutput;
  if (fromInput) {
    if (family === "browser" && /^https?:/i.test(fromInput)) return pageName(fromInput);
    if ((family === "read" || family === "write") && /[\\/]/.test(fromInput)) return fileName(fromInput);
    return fromInput;
  }
  if (!isGenericName(span.name)) return stripVerb(span.name);
  return undefined;
}

function outcomeLabel(items: Span[], family: SemanticFamily | null): string {
  if (items[0]?.type === "agent" || items[0]?.type === "system" || items[0]?.type === "memory") {
    return items[0].name;
  }

  const labels: string[] = [];
  for (const item of items) {
    const label = labelOne(item, family);
    if (!label) continue;
    const compact = clip(label);
    if (!labels.some((existing) => existing.toLowerCase() === compact.toLowerCase())) {
      labels.push(compact);
    }
  }
  const distinct = labels.filter(
    (label, index) =>
      !labels.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.toLowerCase().includes(label.toLowerCase()) &&
          other.length > label.length
      )
  );

  if (distinct.length === 1) return distinct[0];
  if (distinct.length === 2) return clip(`${distinct[0]}, ${distinct[1]}`);
  if (distinct.length > 2) return clip(`${distinct[0]} +${distinct.length - 1}`);
  return family ? KIND_LABEL[family] : items[0]?.name || "Step";
}

function mergeGroup(items: Span[], family: SemanticFamily | null): Span {
  if (items.length === 1 && evidenceFamily(items[0]) && str(asRecord(items[0].output)?.obtained)) {
    return items[0];
  }
  const first = items[0];
  const last = items[items.length - 1];
  const start = new Date(first.startedAt).getTime();
  const end = Math.max(
    ...items.map((item) => new Date(item.finishedAt || item.startedAt).getTime())
  );
  const allFailed = items.every((item) => item.status === "error");
  const anyIssue = items.some((item) => item.status === "error" || item.status === "warning");
  const lastOutput = asRecord(last.output);
  const obtained = outcomeLabel(items, family);

  return {
    ...first,
    name: obtained,
    status: allFailed ? "error" : anyIssue ? "warning" : first.status === "running" ? "success" : "success",
    finishedAt: last.finishedAt || last.startedAt,
    duration: Math.max(0, end - start),
    error: items.find((item) => item.error)?.error,
    output: family
      ? {
          family,
          obtained,
          attempts: items.length,
          calls: items.map((item) => ({
            name: item.name,
            status: item.status,
            error: item.error,
          })),
          last: lastOutput?.last ?? last.output ?? null,
        }
      : last.output,
  };
}

export function collapseSemanticSpans(spans: Span[]): Span[] {
  if (spans.length <= 1) return spans;

  const byId = new Map(spans.map((span) => [span.id, span]));

  function nearestAnchor(span: Span): string {
    let current = span.parentId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const parent = byId.get(current);
      if (!parent) break;
      if (!semanticFamily(parent)) return parent.id;
      current = parent.parentId;
    }
    return span.parentId ?? "root";
  }

  const sorted = [...spans].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const groups = new Map<string, Span[]>();
  const order: string[] = [];

  for (const span of sorted) {
    const family = semanticFamily(span);
    const key = family ? `${nearestAnchor(span)}:${family}` : `unique:${span.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(span);
  }

  const idMap = new Map<string, string>();
  const merged: Span[] = [];

  for (const key of order) {
    const items = groups.get(key)!;
    const family = semanticFamily(items[0]);
    const node = mergeGroup(items, family);
    merged.push(node);
    for (const item of items) idMap.set(item.id, node.id);
  }

  return merged.map((span) => {
    if (!span.parentId) return span;
    const mapped = idMap.get(span.parentId) ?? span.parentId;
    if (mapped === span.id) {
      const original = byId.get(span.id);
      const anchor = original ? nearestAnchor(original) : "root";
      return { ...span, parentId: anchor === span.id ? null : idMap.get(anchor) ?? anchor };
    }
    return { ...span, parentId: mapped };
  });
}

export function inferRunStatus(spans: Span[]): Trace["status"] {
  const blocking = spans.some(
    (span) => span.status === "error" && span.type !== "tool"
  );
  return blocking ? "failed" : "success";
}

export function isUserTurn(span: Span): boolean {
  return span.name === "User Message" || /^user(\s+message)?$/i.test(span.name);
}

function byTime(spans: Span[]): Span[] {
  return spans
    .map((span, index) => ({ span, index }))
    .sort((a, b) => {
      const delta = new Date(a.span.startedAt).getTime() - new Date(b.span.startedAt).getTime();
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((item) => item.span);
}

function asContextSpan(span: Span, parentId: string | null, input: Span["input"]): Span {
  return {
    ...span,
    name: "Context",
    type: "memory",
    parentId,
    input,
  };
}

export function rehomeInjectedContext(spans: Span[]): Span[] {
  if (spans.length === 0) return spans;

  const ordered = byTime(spans).map((span) => {
    if (span.name === "Context") return { ...span, type: "memory" as const };
    if (isUserTurn(span) && isInjectedContext(spanMessage(span))) {
      return { ...span, name: "Context", type: "memory" as const };
    }
    return span;
  });

  const realUsers = ordered.filter(isUserTurn);
  const contextIds = new Set(
    ordered.filter((span) => span.name === "Context").map((span) => span.id)
  );

  const ownerOf = new Map<string, string | null>();
  for (let index = 0; index < ordered.length; index += 1) {
    const span = ordered[index];
    if (span.name !== "Context") continue;
    const nextUser = ordered.slice(index + 1).find(isUserTurn);
    const previousUser = [...realUsers].reverse().find((user) => {
      return new Date(user.startedAt).getTime() <= new Date(span.startedAt).getTime();
    });
    ownerOf.set(span.id, nextUser?.id ?? previousUser?.id ?? null);
  }

  const parentOf = new Map(ordered.map((span) => [span.id, span.parentId] as const));
  for (const span of ordered) {
    if (span.name === "Context") {
      parentOf.set(span.id, ownerOf.get(span.id) ?? null);
      continue;
    }
    const parent = parentOf.get(span.id);
    if (parent && contextIds.has(parent)) {
      parentOf.set(span.id, isUserTurn(span) ? null : ownerOf.get(parent) ?? null);
    }
  }

  const collapsed: Span[] = [];
  const dropped = new Set<string>();
  let pending: Span[] = [];

  const flush = () => {
    if (pending.length === 0) return;
    const first = pending[0];
    const owner = parentOf.get(first.id) ?? null;
    const messages = pending.map(spanMessage).filter(Boolean);
    collapsed.push(
      asContextSpan(
        first,
        owner,
        messages.length <= 1
          ? first.input
          : { items: messages }
      )
    );
    for (const extra of pending.slice(1)) dropped.add(extra.id);
    pending = [];
  };

  for (const span of ordered) {
    if (span.name === "Context") {
      const owner = parentOf.get(span.id) ?? null;
      const currentOwner = pending[0] ? parentOf.get(pending[0].id) ?? null : null;
      if (pending.length > 0 && currentOwner !== owner) flush();
      pending.push(span);
      continue;
    }
    flush();
    collapsed.push({
      ...span,
      parentId: parentOf.has(span.id) ? parentOf.get(span.id) ?? null : span.parentId,
    });
  }
  flush();

  return collapsed.map((span) => {
    let parent = span.parentId;
    if (parent && dropped.has(parent)) {
      parent = parentOf.get(parent) ?? null;
    }
    if (parent === span.id || (parent && dropped.has(parent))) parent = null;
    return { ...span, parentId: parent };
  });
}

export function linkConversationTurns(spans: Span[]): Span[] {
  if (spans.length <= 1) return spans;

  const ordered = spans
    .map((span, index) => ({ span, index }))
    .sort((a, b) => {
      const delta = new Date(a.span.startedAt).getTime() - new Date(b.span.startedAt).getTime();
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((item) => item.span);

  const userIndexes = ordered
    .map((span, index) => (isUserTurn(span) ? index : -1))
    .filter((index) => index >= 0);
  if (userIndexes.length <= 1) return spans;

  const parentOf = new Map(spans.map((span) => [span.id, span.parentId] as const));

  for (let turn = 0; turn < userIndexes.length; turn += 1) {
    const start = userIndexes[turn];
    const end = userIndexes[turn + 1] ?? ordered.length;
    const user = ordered[start];
    const turnIds = new Set(ordered.slice(start, end).map((span) => span.id));

    if (turn === 0) {
      parentOf.set(user.id, null);
    } else {
      const previous = ordered.slice(userIndexes[turn - 1], start);
      parentOf.set(user.id, previous[previous.length - 1]?.id ?? null);
    }

    for (let index = start + 1; index < end; index += 1) {
      const span = ordered[index];
      const current = parentOf.get(span.id);
      if (!current || current === span.id || !turnIds.has(current)) {
        parentOf.set(span.id, user.id);
      }
    }
  }

  return spans.map((span) => ({
    ...span,
    parentId: parentOf.get(span.id) ?? span.parentId,
  }));
}

export function prepareSpans(spans: Span[]): Span[] {
  return linkConversationTurns(
    rehomeInjectedContext(collapseSemanticSpans(softenToolErrors(spans)))
  );
}

export function presentTrace(trace: Trace): Trace {
  const spans = prepareSpans(trace.spans);
  return {
    ...trace,
    name: pickRunTitle({ ...trace, spans }),
    source: inferTraceSource(trace),
    project: inferProject(trace),
    status: inferRunStatus(spans),
    spans,
  };
}
