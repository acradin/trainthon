import OpenAI from "openai";
import { SemanticGraph, Trace } from "@/types/trace";
import {
  applySemanticPlan,
  collapseSemanticSpans,
  compactSpanForModel,
  prepareSpans,
  semanticGraphMatches,
  spanSourceHash,
  type SemanticFamily,
  type SemanticNodePlan,
} from "@/lib/semantic-spans";
import { getTraceById, saveTrace } from "@/lib/traces";

const DEFAULT_MODEL = "gpt-5.6-luna";
const FALLBACK_MODEL = "gpt-4o";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const FAMILIES = new Set<SemanticFamily>(["search", "browser", "read", "write", "shell", "llm"]);

const SYSTEM_PROMPT = `You rewrite an AI agent run into a semantic execution graph.

Each node is what a step obtained — a file, a page, a source, a decision — not which tool ran.

Rules:
- Keep "User Message" and "Context" as their own nodes. Do not merge them with tools. Keep those names.
- Merge retries and tool calls that served the SAME artifact or goal into one node.
- Do not merge unrelated artifacts. Reading auth.ts and writing README.md are two nodes.
- Consecutive reads/greps of the same file become one File node named after the file.
- Search + fetch that produced the same source become one node named after that source.
- Label in English, short noun phrase, max 42 characters. Never "Search ×4", "Grep", "Read", "Shell", "web_search", or a raw tool name.
- family must be one of: search, browser, read, write, shell, llm. Omit family for User Message and Context.
- parentId must be another node's id in your output, or null. Context parentId is always null.
- Cover every input span id exactly once via spanIds.
- Preserve the run's time order.
- If a step failed to obtain the thing, keep the intended artifact as the name and set status to error or warning.

Return JSON:
{
  "nodes": [
    {
      "id": "id of the first span in spanIds",
      "name": "Vendor A pricing",
      "family": "search",
      "parentId": "span-id-or-null",
      "spanIds": ["id1", "id2"],
      "status": "success"
    }
  ]
}`;

export type SemanticBuildMode = "llm" | "heuristic" | "cached";

export type SemanticBuildResult = {
  trace: Trace;
  mode: SemanticBuildMode;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return [429, 500, 502, 503, 504].includes(error.status);
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnreset")
    );
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseFamily(value: unknown): SemanticFamily | null {
  return typeof value === "string" && FAMILIES.has(value as SemanticFamily)
    ? (value as SemanticFamily)
    : null;
}

function parseStatus(value: unknown): SemanticNodePlan["status"] {
  if (value === "success" || value === "error" || value === "warning" || value === "running") {
    return value;
  }
  return undefined;
}

function parsePlan(content: string, knownIds: Set<string>): SemanticNodePlan[] {
  const parsed = JSON.parse(content) as unknown;
  const record = asRecord(parsed);
  const rawNodes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(record?.nodes)
      ? record?.nodes
      : Array.isArray(asRecord(record?.graph)?.nodes)
        ? asRecord(record?.graph)?.nodes
        : [];
  if (!Array.isArray(rawNodes)) return [];

  const nodes: SemanticNodePlan[] = [];
  for (const item of rawNodes) {
    const rec = asRecord(item);
    if (!rec) continue;
    const spanIds = (Array.isArray(rec.spanIds) ? rec.spanIds : [])
      .filter((id): id is string => typeof id === "string" && knownIds.has(id));
    if (spanIds.length === 0) continue;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) continue;
    const parentId =
      rec.parentId === null || rec.parentId === "null" || rec.parentId === ""
        ? null
        : typeof rec.parentId === "string"
          ? rec.parentId
          : null;
    nodes.push({
      id: typeof rec.id === "string" && knownIds.has(rec.id) ? rec.id : spanIds[0],
      name,
      family: parseFamily(rec.family),
      parentId,
      spanIds,
      status: parseStatus(rec.status),
    });
  }
  return nodes;
}

async function callModel(spans: ReturnType<typeof compactSpanForModel>[], model: string): Promise<{
  nodes: SemanticNodePlan[];
  model: string;
}> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const knownIds = new Set(spans.map((span) => String(span.id)));
  let currentModel = model;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const completion = await openai.chat.completions.create({
        model: currentModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Rewrite this run as a semantic execution graph.\n\n${JSON.stringify({ spans }, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No response from model");
      const nodes = parsePlan(content, knownIds);
      if (nodes.length === 0) throw new Error("Model returned no semantic nodes");
      return { nodes, model: currentModel };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof OpenAI.APIError && error.status === 404 && currentModel !== FALLBACK_MODEL) {
        currentModel = FALLBACK_MODEL;
        continue;
      }
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw lastError;
      }
      await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

function heuristicGraph(trace: Trace): SemanticGraph {
  const spans = collapseSemanticSpans(prepareSpans(trace.spans));
  return {
    version: 1,
    model: "heuristic",
    builtAt: new Date().toISOString(),
    sourceHash: spanSourceHash(trace.spans),
    spans,
  };
}

export async function buildSemanticGraph(
  trace: Trace
): Promise<{ graph: SemanticGraph; mode: Exclude<SemanticBuildMode, "cached"> }> {
  const structured = prepareSpans(trace.spans);
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const { nodes, model } = await callModel(
        structured.map(compactSpanForModel),
        process.env.OPENAI_MODEL || DEFAULT_MODEL
      );
      const spans = applySemanticPlan(structured, nodes);
      if (spans?.length) {
        return {
          mode: "llm",
          graph: {
            version: 1,
            model,
            builtAt: new Date().toISOString(),
            sourceHash: spanSourceHash(trace.spans),
            spans,
          },
        };
      }
    } catch (error) {
      console.error("Semantic graph LLM compile failed:", error);
    }
  }

  return { mode: "heuristic", graph: heuristicGraph(trace) };
}

const inflight = new Map<string, Promise<SemanticBuildResult>>();

export async function buildAndStoreSemanticGraph(
  traceId: string,
  rebuild = false
): Promise<SemanticBuildResult> {
  const key = `${traceId}:${rebuild ? "1" : "0"}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    const trace = await getTraceById(traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }

    const cached = trace.semanticGraph;
    const hasKey = Boolean(process.env.OPENAI_API_KEY);
    if (!rebuild && semanticGraphMatches(trace) && cached) {
      if (cached.model !== "heuristic") return { trace, mode: "cached" as const };
      if (!hasKey) return { trace, mode: "heuristic" as const };
    }

    const { graph, mode } = await buildSemanticGraph(trace);
    const next: Trace = { ...trace, semanticGraph: graph };
    if (mode === "llm" || !hasKey) {
      await saveTrace(next);
    }
    return { trace: next, mode };
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return job;
}
