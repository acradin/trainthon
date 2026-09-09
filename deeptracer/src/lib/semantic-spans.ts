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
  return name
    .toLowerCase()
    .replace(/^functions\./, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function semanticFamily(span: Span): SemanticFamily | null {
  const stored = evidenceFamily(span);
  if (stored) return stored;
  if (span.type === "agent" || span.type === "system" || span.type === "memory") return null;
  if (span.type === "llm") return "llm";
  const name = normalize(span.name);
  if (/\b(web ?search|websearch|tavily|exa|brave|google|bing|duckduckgo)\b/.test(name)) {
    return "search";
  }
  if (
    /browser|navigate|click|extract|screenshot|playwright|puppeteer|computer use|webfetch|web fetch/.test(
      name
    )
  ) {
    return "browser";
  }
  if (
    /\b(grep|glob|ripgrep|codebase search|grep search|glob file|list dir|read file|readfile|^read\b)\b/.test(
      name
    ) ||
    name === "cat" ||
    name === "ls" ||
    name === "rg"
  ) {
    return "read";
  }
  if (/\b(write|edit|apply ?patch|strreplace|search replace|delete file|edit file)\b/.test(name)) {
    return "write";
  }
  if (
    /\b(shell command|exec command|run terminal|powershell|zsh|bash|shell|terminal)\b/.test(name) ||
    name === "exec" ||
    name === "command"
  ) {
    return "shell";
  }
  const input =
    span.input && typeof span.input === "object" && !Array.isArray(span.input)
      ? (span.input as Record<string, unknown>)
      : null;
  if (input) {
    const kind = typeof input.type === "string" ? input.type.toLowerCase() : "";
    if (kind === "search" || typeof input.query === "string") return "search";
    if (kind === "open_page" || kind === "find" || typeof input.url === "string") return "browser";
  }
  if (span.type === "tool" || span.type === "retrieval") return null;
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isSemanticSpan(span: Span): boolean {
  return asRecord(span.output)?.semantic === true;
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
  return /^(web ?search|websearch|web fetch|webfetch|read( file)?|write|edit|bash|shell( command)?|zsh|grep|glob|navigate|click|screenshot|browse(r)?|tool|function call|llm response|assistant|cat|ls|exec( command)?|command|apply patch|run terminal( cmd)?|search ×\d+|browser ×\d+|read ×\d+|edit ×\d+|shell ×\d+|llm ×\d+|file|page|search|\[object object\])$/i.test(
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
    const path =
      pick(input, ["file_path", "path", "file", "target_file"]) ||
      pick(output, ["file_path", "path", "file", "target_file"]);
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
  const semantic = items.some(isSemanticSpan);

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
          attempts: items.reduce((total, item) => total + attemptCount(item), 0),
          spanIds: flattenSpanIds(items),
          calls: items.map((item) => ({
            id: item.id,
            name: labelOne(item, family) || item.name,
            status: item.status,
            error: item.error,
          })),
          last: lastOutput?.last ?? last.output ?? null,
          ...(semantic ? { semantic: true } : {}),
        }
      : last.output,
  };
}

function flattenSpanIds(items: Span[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const nested = asRecord(item.output)?.spanIds;
    const group = Array.isArray(nested)
      ? nested.filter((id): id is string => typeof id === "string")
      : [];
    for (const id of group.length > 0 ? group : [item.id]) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function artifactTarget(span: Span, family: SemanticFamily): string | undefined {
  const stored = str(asRecord(span.output)?.obtained);
  const { input, output } = ioOf(span);

  if (family === "read" || family === "write") {
    const path =
      pick(input, ["file_path", "path", "file", "target_file"]) ||
      pick(output, ["file_path", "path", "file"]);
    if (path) return `path:${normalizePath(path)}`;
  }
  if (family === "browser") {
    const url = pick(input, ["url"]) || pick(output, ["url"]);
    if (url) {
      try {
        const parsed = new URL(url);
        return `url:${parsed.hostname}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
      } catch {
        return `url:${url.toLowerCase()}`;
      }
    }
  }
  if (family === "search") {
    const query = pick(input, ["query", "q", "pattern", "search_term"]) || pick(output, ["query"]);
    if (query) return `q:${query.toLowerCase().replace(/\s+/g, " ").slice(0, 80)}`;
  }
  if (family === "shell") {
    const command =
      pick(input, ["command", "cmd", "input", "value"]) ||
      (Array.isArray(input?.command)
        ? input.command.filter((part): part is string => typeof part === "string").join(" ")
        : undefined);
    if (command) {
      const tokens = command.trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
      return tokens ? `sh:${tokens}` : undefined;
    }
  }
  if (stored && !isGenericName(stored)) return `got:${stored.toLowerCase()}`;
  return undefined;
}

function collapseKey(span: Span): string {
  if (isUserTurn(span) || isContextSpan(span)) return `id:${span.id}`;
  if (span.type === "agent" || span.type === "system" || span.type === "memory") return `id:${span.id}`;
  const family = semanticFamily(span);
  if (!family) return `id:${span.id}`;
  if (family === "llm") return `llm:${span.parentId ?? "root"}`;
  const target = artifactTarget(span, family);
  if (!target) return `id:${span.id}`;
  return `${family}:${target}`;
}

export function collapseSemanticSpans(spans: Span[]): Span[] {
  if (spans.length <= 1) return spans;
  if (spans.some(isSemanticSpan)) return spans;

  const byId = new Map(spans.map((span) => [span.id, span]));
  const sorted = byTime(spans);
  const groups: Span[][] = [];

  for (const span of sorted) {
    const key = collapseKey(span);
    const previous = groups.at(-1);
    const previousKey = previous ? collapseKey(previous[0]) : null;
    if (previous && previousKey === key && !key.startsWith("id:")) {
      previous.push(span);
    } else {
      groups.push([span]);
    }
  }

  const idMap = new Map<string, string>();
  const merged: Span[] = [];

  for (const items of groups) {
    const family = semanticFamily(items[0]);
    const node = mergeGroup(items, family);
    merged.push(node);
    for (const item of items) idMap.set(item.id, node.id);
  }

  const ids = new Set(merged.map((span) => span.id));
  return collapseParallelWaves(remapCollapsedParents(merged, byId, idMap, ids));
}

function isParallelFamily(family: SemanticFamily | null): family is SemanticFamily {
  return family === "write" || family === "read" || family === "search";
}

function sameParent(left: Span, right: Span): boolean {
  return (left.parentId ?? "") === (right.parentId ?? "");
}

function sameTimestampWave(left: Span, right: Span): boolean {
  const start = new Date(left.startedAt).getTime();
  const next = new Date(right.startedAt).getTime();
  return Number.isFinite(start) && Number.isFinite(next) && Math.abs(next - start) <= 250;
}

function canCollapseParallel(previous: Span, span: Span): boolean {
  if (isUserTurn(span) || isContextSpan(span) || span.type === "agent" || span.type === "system") {
    return false;
  }
  const family = semanticFamily(span);
  const previousFamily = semanticFamily(previous);
  if (!family || family !== previousFamily) return false;
  if (!isParallelFamily(family) && !sameTimestampWave(previous, span)) return false;
  return sameParent(previous, span) || span.parentId === previous.id;
}

function remapCollapsedParents(
  merged: Span[],
  byId: Map<string, Span>,
  idMap: Map<string, string>,
  ids: Set<string>
): Span[] {
  return merged.map((span) => {
    if (!span.parentId) return span;
    let mapped: string | null = idMap.get(span.parentId) ?? span.parentId;
    if (mapped === span.id) mapped = byId.get(span.id)?.parentId ?? null;
    if (mapped) mapped = idMap.get(mapped) ?? mapped;
    if (!mapped || mapped === span.id || !ids.has(mapped)) {
      return { ...span, parentId: null };
    }
    return { ...span, parentId: mapped };
  });
}

export function collapseParallelWaves(spans: Span[]): Span[] {
  if (spans.length <= 1) return spans;
  const sorted = byTime(spans);
  const batches: Span[][] = [];

  for (const span of sorted) {
    const previous = batches.at(-1);
    if (previous && canCollapseParallel(previous[previous.length - 1], span)) {
      previous.push(span);
      continue;
    }
    batches.push([span]);
  }

  const byId = new Map(spans.map((span) => [span.id, span]));
  const idMap = new Map<string, string>();
  const merged: Span[] = [];

  for (const items of batches) {
    const family = semanticFamily(items[0]);
    const node = items.length === 1 ? items[0] : mergeGroup(items, family);
    merged.push(node);
    for (const item of items) idMap.set(item.id, node.id);
  }

  const ids = new Set(merged.map((span) => span.id));
  return remapCollapsedParents(merged, byId, idMap, ids);
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

export function isContextSpan(span: Span): boolean {
  return span.name === "Context";
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
    if (isContextSpan(span) || (isUserTurn(span) && isInjectedContext(spanMessage(span)))) {
      return { ...span, name: "Context", type: "memory" as const };
    }
    return span;
  });

  const contextIds = new Set(ordered.filter(isContextSpan).map((span) => span.id));
  if (contextIds.size === 0) return ordered;

  const realUsers = ordered.filter(isUserTurn);
  const parentOf = new Map(ordered.map((span) => [span.id, span.parentId] as const));

  for (const span of ordered) {
    if (isContextSpan(span)) {
      parentOf.set(span.id, null);
      continue;
    }
    const parent = parentOf.get(span.id);
    if (!parent || !contextIds.has(parent)) continue;
    const nextUser = realUsers.find(
      (user) => new Date(user.startedAt).getTime() >= new Date(span.startedAt).getTime()
    );
    const previousUser = [...realUsers].reverse().find(
      (user) => new Date(user.startedAt).getTime() <= new Date(span.startedAt).getTime()
    );
    parentOf.set(span.id, isUserTurn(span) ? null : nextUser?.id ?? previousUser?.id ?? null);
  }

  const contextSpans = ordered.filter(isContextSpan);
  const flow = ordered.filter((span) => !isContextSpan(span));
  const first = contextSpans[0];
  const messages = contextSpans.map(spanMessage).filter(Boolean);
  const merged = asContextSpan(
    first,
    null,
    messages.length <= 1 ? first.input : { items: messages }
  );
  const dropped = new Set(contextSpans.slice(1).map((span) => span.id));

  return [merged, ...flow].map((span) => {
    let parent = isContextSpan(span) ? null : parentOf.get(span.id) ?? span.parentId;
    if (parent && dropped.has(parent)) parent = null;
    if (parent === span.id) parent = null;
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
  const byId = new Map(spans.map((span) => [span.id, span] as const));

  for (let turn = 0; turn < userIndexes.length; turn += 1) {
    const start = userIndexes[turn];
    const end = userIndexes[turn + 1] ?? ordered.length;
    const user = ordered[start];
    const turnIds = new Set(
      ordered.slice(start, end).filter((span) => !isContextSpan(span)).map((span) => span.id)
    );

    if (turn === 0) {
      parentOf.set(user.id, null);
    } else {
      const previous = ordered
        .slice(userIndexes[turn - 1], start)
        .filter((span) => !isContextSpan(span));
      parentOf.set(user.id, previous[previous.length - 1]?.id ?? null);
    }

    for (let index = start + 1; index < end; index += 1) {
      const span = ordered[index];
      if (isContextSpan(span)) {
        parentOf.set(span.id, null);
        continue;
      }
      const current = parentOf.get(span.id);
      const currentSpan = current ? byId.get(current) : undefined;
      if (
        !current ||
        current === span.id ||
        !turnIds.has(current) ||
        (currentSpan && isContextSpan(currentSpan))
      ) {
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
  return linkConversationTurns(rehomeInjectedContext(softenToolErrors(spans)));
}

export function spanSourceHash(spans: Span[]): string {
  let hash = 5381;
  const payload = spans.map((span) => `${span.id}\0${span.name}\0${span.type}`).join("\n");
  for (let index = 0; index < payload.length; index += 1) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

export function semanticGraphMatches(trace: Trace): boolean {
  const graph = trace.semanticGraph;
  if (!graph?.spans?.length || graph.version !== 1) return false;
  const current = spanSourceHash(trace.spans);
  return graph.sourceHash === current || spanSourceHash(graph.spans) === current;
}

export type SemanticNodePlan = {
  id?: string;
  name: string;
  family?: SemanticFamily | null;
  parentId: string | null;
  spanIds: string[];
  status?: Span["status"];
};

function markSemantic(span: Span, obtained: string, family: SemanticFamily | null): Span {
  const output = asRecord(span.output) ?? (span.output === undefined ? {} : { last: span.output });
  return {
    ...span,
    name: obtained,
    output: {
      ...output,
      ...(family ? { family } : {}),
      obtained,
      semantic: true,
    },
  };
}

export function applySemanticPlan(spans: Span[], nodes: SemanticNodePlan[]): Span[] | null {
  if (nodes.length === 0) return null;

  const byId = new Map(spans.map((span) => [span.id, span]));
  const used = new Set<string>();
  const idMap = new Map<string, string>();
  const merged: Span[] = [];
  const takenIds = new Set<string>();

  for (const node of nodes) {
    const items = [...new Set(node.spanIds)]
      .map((id) => byId.get(id))
      .filter((span): span is Span => Boolean(span))
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    if (items.length === 0) continue;

    const family = node.family ?? semanticFamily(items[0]);
    const preferred = node.id && byId.has(node.id) && !takenIds.has(node.id) ? node.id : items[0].id;
    const obtained = clip(node.name);
    const group = markSemantic(mergeGroup(items, family), obtained, family);
    const next: Span = {
      ...group,
      id: preferred,
      parentId: node.parentId,
      status: node.status ?? group.status,
    };
    merged.push(next);
    takenIds.add(next.id);
    for (const item of items) {
      used.add(item.id);
      idMap.set(item.id, next.id);
    }
    idMap.set(next.id, next.id);
  }

  for (const span of spans) {
    if (used.has(span.id)) continue;
    const extra = collapseSemanticSpans([span])[0] ?? span;
    merged.push(extra);
    idMap.set(span.id, extra.id);
  }

  if (merged.length === 0) return null;

  const ids = new Set(merged.map((span) => span.id));
  const remapped = merged.map((span) => {
    if (isContextSpan(span)) return { ...span, parentId: null };
    let parent = span.parentId ? (idMap.get(span.parentId) ?? span.parentId) : null;
    if (parent === span.id || (parent && !ids.has(parent))) parent = null;
    return { ...span, parentId: parent };
  });

  const byMerged = new Map(remapped.map((span) => [span.id, span]));
  return collapseParallelWaves(
    remapped
      .map((span) => {
        const seen = new Set<string>();
        let current = span.parentId;
        while (current) {
          if (current === span.id || seen.has(current)) {
            return { ...span, parentId: null };
          }
          seen.add(current);
          current = byMerged.get(current)?.parentId ?? null;
        }
        return span;
      })
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  );
}

export function compactSpanForModel(span: Span): Record<string, unknown> {
  const family = semanticFamily(span);
  const hint = labelOne(span, family);
  const { input, output } = ioOf(span);
  const clipText = (value: unknown, max = 220) => {
    if (value === undefined || value === null) return undefined;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.length > max ? `${compact.slice(0, max)}…` : compact;
  };
  return {
    id: span.id,
    name: span.name,
    type: span.type,
    status: span.status,
    parentId: span.parentId,
    family,
    obtainedHint: hint,
    input: clipText(input ?? span.input),
    output: clipText(output ?? span.output),
    calls: evidenceCalls(span)
      .map((call) => call.name)
      .slice(0, 16),
    error: span.error ? clipText(span.error, 160) : undefined,
  };
}

export function displaySpans(trace: Trace): Span[] {
  const spans = semanticGraphMatches(trace)
    ? trace.semanticGraph!.spans
    : collapseSemanticSpans(prepareSpans(trace.spans));
  return collapseParallelWaves(spans);
}

export function resolveDisplaySpan(spans: Span[], spanId: string | null): Span | null {
  if (!spanId) return null;
  const direct = spans.find((span) => span.id === spanId);
  if (direct) return direct;
  return (
    spans.find((span) => {
      const output = asRecord(span.output);
      const ids = output?.spanIds;
      if (Array.isArray(ids) && ids.some((id) => id === spanId)) return true;
      const calls = output?.calls;
      if (
        Array.isArray(calls) &&
        calls.some((call) => asRecord(call)?.id === spanId)
      ) {
        return true;
      }
      return false;
    }) ?? null
  );
}

export function presentTrace(trace: Trace): Trace {
  const spans = displaySpans(trace);
  return {
    ...trace,
    name: pickRunTitle({ ...trace, spans }),
    source: inferTraceSource(trace),
    project: inferProject(trace),
    status: inferRunStatus(spans),
    spans,
  };
}
