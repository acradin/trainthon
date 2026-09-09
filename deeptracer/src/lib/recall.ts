import OpenAI from "openai";
import { RecallHit, RecallResult, Span, Trace } from "@/types/trace";
import { getTraces } from "@/lib/traces";
import {
  displaySpans,
  isContextSpan,
  isUserTurn,
  presentTrace,
  semanticFamily,
  spanKindLabel,
} from "@/lib/semantic-spans";
import { inferProject, inferTraceSource } from "@/lib/trace-source";

const DEFAULT_MODEL = "gpt-5.6-luna";
const FALLBACK_MODEL = "gpt-4o";
const STOP = new Set([
  "a",
  "an",
  "the",
  "about",
  "what",
  "did",
  "we",
  "already",
  "find",
  "found",
  "decide",
  "decided",
  "know",
  "knew",
  "this",
  "that",
  "for",
  "from",
  "with",
  "into",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "how",
  "why",
  "who",
]);

type IndexedNode = {
  trace: Trace;
  span: Span;
  text: string;
  obtained: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function looksLikeRawJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function wordMatch(hay: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "iu").test(hay);
}

function obtainedOf(span: Span): string {
  const stored = asRecord(span.output)?.obtained;
  if (typeof stored === "string" && stored.trim() && !looksLikeRawJson(stored)) {
    return stored.trim();
  }
  if (span.name && !looksLikeRawJson(span.name)) return span.name;
  return spanKindLabel(span);
}

function nodeText(trace: Trace, span: Span): string {
  const obtained = obtainedOf(span);
  const input = typeof span.input === "string" ? span.input : "";
  const inputBit = looksLikeRawJson(input) ? "" : input.slice(0, 160);
  return [trace.name, trace.project, span.name, obtained, inputBit].filter(Boolean).join(" ");
}

function indexTraces(traces: Trace[]): IndexedNode[] {
  const nodes: IndexedNode[] = [];
  for (const raw of traces) {
    const trace = presentTrace(raw);
    const spans = displaySpans(raw);
    for (const span of spans) {
      if (isContextSpan(span)) continue;
      if (looksLikeRawJson(span.name) && looksLikeRawJson(obtainedOf(span))) continue;
      nodes.push({
        trace,
        span,
        text: nodeText(trace, span),
        obtained: obtainedOf(span),
      });
    }
  }
  return nodes;
}

function scoreNode(queryTokens: string[], node: IndexedNode): number {
  if (queryTokens.length === 0) return 0;
  const title = [node.obtained, node.span.name, node.trace.name, node.trace.project ?? ""].join(" ");
  const hay = node.text;
  let titleHits = 0;
  let allHits = 0;
  for (const token of queryTokens) {
    if (wordMatch(title, token)) titleHits += 1;
    if (wordMatch(hay, token)) allHits += 1;
  }
  if (allHits === 0) return 0;
  if (titleHits === 0 && queryTokens.length < 2) return 0;
  let score = (titleHits * 1.4 + allHits * 0.35) / queryTokens.length;
  const family = semanticFamily(node.span);
  if (family === "search" || family === "read" || family === "browser" || family === "write") {
    score += 0.15;
  }
  if (isUserTurn(node.span)) score += 0.05;
  if (node.span.type === "llm") score -= 0.08;
  return score;
}

function shortLabel(value: string, max = 56): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function toHit(node: IndexedNode, reason: string): RecallHit {
  return {
    traceId: node.trace.traceId,
    traceName: node.trace.name,
    project: node.trace.project ?? inferProject(node.trace),
    source: inferTraceSource(node.trace),
    startedAt: node.trace.startedAt,
    spanId: node.span.id,
    spanName: shortLabel(node.obtained || node.span.name),
    reason,
  };
}

function lexicalRecall(query: string, nodes: IndexedNode[]): RecallResult {
  const queryTokens = tokens(query);
  const ranked = nodes
    .map((node) => ({ node, score: scoreNode(queryTokens, node) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (ranked.length === 0) {
    return {
      answer: "Nothing in the archive matches that yet. Scan more sessions, or try a file, source, or decision name.",
      hits: [],
      mode: "lexical",
    };
  }

  const runs = new Set(ranked.map((item) => item.node.trace.traceId));
  const names = ranked
    .slice(0, 3)
    .map((item) => shortLabel(item.node.obtained, 48))
    .join("; ");
  return {
    answer: `Already on this machine: ${names}. ${ranked.length} receipt${ranked.length === 1 ? "" : "s"} across ${runs.size} run${runs.size === 1 ? "" : "s"}.`,
    hits: ranked.map((item) =>
      toHit(item.node, "Matched the query against what this step obtained.")
    ),
    mode: "lexical",
  };
}

function compactIndex(nodes: IndexedNode[]): Array<Record<string, unknown>> {
  return nodes.slice(0, 80).map((node) => ({
    traceId: node.trace.traceId,
    run: node.trace.name,
    project: node.trace.project ?? inferProject(node.trace),
    source: inferTraceSource(node.trace),
    spanId: node.span.id,
    obtained: node.obtained,
    type: node.span.type,
    family: semanticFamily(node.span),
  }));
}

async function llmRecall(query: string, candidates: IndexedNode[]): Promise<RecallResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || candidates.length === 0) return null;

  const openai = new OpenAI({ apiKey });
  let model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const known = new Map(candidates.map((node) => [`${node.trace.traceId}:${node.span.id}`, node]));

  try {
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You recall what AI agents on this computer already found or decided. Use only the index. Do not invent sources.
Answer in 2-4 sentences. Cite receipts by traceId and spanId from the index.
Prefer obtained artifacts (files, pages, sources, decisions) over raw tool names.
If the index does not contain the answer, say so.

Return JSON:
{
  "answer": "string",
  "hits": [{ "traceId": "", "spanId": "", "reason": "why this is the receipt" }]
}
Max 6 hits.`,
          },
          {
            role: "user",
            content: `Question: ${query}\n\nIndex:\n${JSON.stringify(compactIndex(candidates), null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      });
    } catch (error) {
      if (error instanceof OpenAI.APIError && error.status === 404 && model !== FALLBACK_MODEL) {
        model = FALLBACK_MODEL;
        completion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "Recall what agents already found. JSON { answer, hits: [{ traceId, spanId, reason }] }.",
            },
            {
              role: "user",
              content: `Question: ${query}\n\nIndex:\n${JSON.stringify(compactIndex(candidates), null, 2)}`,
            },
          ],
          response_format: { type: "json_object" },
        });
      } else {
        throw error;
      }
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { answer?: unknown; hits?: unknown };
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    const rawHits = Array.isArray(parsed.hits) ? parsed.hits : [];
    const hits: RecallHit[] = [];
    for (const item of rawHits) {
      if (!item || typeof item !== "object") continue;
      const rec = item as { traceId?: unknown; spanId?: unknown; reason?: unknown };
      if (typeof rec.traceId !== "string" || typeof rec.spanId !== "string") continue;
      const node = known.get(`${rec.traceId}:${rec.spanId}`);
      if (!node) continue;
      hits.push(
        toHit(node, typeof rec.reason === "string" && rec.reason.trim() ? rec.reason.trim() : "Cited as the receipt.")
      );
      if (hits.length >= 6) break;
    }
    if (!answer && hits.length === 0) return null;
    return {
      answer: answer || lexicalRecall(query, candidates).answer,
      hits,
      mode: "llm",
    };
  } catch (error) {
    console.error("Recall LLM failed:", error);
    return null;
  }
}

export async function recallFromArchive(query: string): Promise<RecallResult> {
  const trimmed = query.replace(/\s+/g, " ").trim();
  if (trimmed.length < 2) {
    return {
      answer: "Ask what this machine already found or decided.",
      hits: [],
      mode: "lexical",
    };
  }

  const traces = await getTraces();
  const nodes = indexTraces(traces);
  if (nodes.length === 0) {
    return {
      answer: "No runs in the archive yet. Register agents and scan sessions first.",
      hits: [],
      mode: "lexical",
    };
  }

  const queryTokens = tokens(trimmed);
  const ranked = nodes
    .map((node) => ({ node, score: scoreNode(queryTokens, node) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.node);

  if (ranked.length === 0) {
    return lexicalRecall(trimmed, nodes);
  }

  const fromModel = await llmRecall(trimmed, ranked.slice(0, 80));
  if (fromModel) return fromModel;
  return lexicalRecall(trimmed, nodes);
}
