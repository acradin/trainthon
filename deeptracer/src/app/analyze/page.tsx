"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { RootCauseAnalysis, Trace } from "@/types/trace";
import { MOCK_TRACES, EXAMPLE_TRACE_JSON } from "@/data/mock-traces";
import AppHeader from "@/components/AppHeader";

const EXAMPLES = [
  { key: "rate-limit", label: "Rate limit" },
  { key: "hallucination", label: "Hallucination" },
  { key: "logic-error", label: "Logic error" },
  { key: "sub-agents", label: "Sub-agents" },
] as const;

export default function AnalyzePage() {
  const [traceInput, setTraceInput] = useState("");
  const [analysis, setAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [parsedTrace, setParsedTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExample = (key: string) => {
    const trace = MOCK_TRACES[key];
    if (!trace) return;
    setTraceInput(JSON.stringify(trace, null, 2));
    setAnalysis(null);
    setError(null);
    setParsedTrace(null);
  };

  const analyzeTrace = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const trace: Trace = JSON.parse(traceInput);
      setParsedTrace(trace);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trace }),
      });
      const data = await response.json();

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON. Check the trace payload.");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="flex min-h-0 flex-col border-b border-zinc-800/80 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2.5">
            <h1 className="text-[13px] font-medium">Trace JSON</h1>
            <div className="flex flex-wrap justify-end gap-1">
              {EXAMPLES.map((example) => (
                <button
                  key={example.key}
                  onClick={() => loadExample(example.key)}
                  className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={traceInput}
            onChange={(event) => setTraceInput(event.target.value)}
            placeholder={EXAMPLE_TRACE_JSON}
            className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[12px] leading-relaxed text-zinc-300 placeholder:text-zinc-700 focus:outline-none"
          />
          <div className="border-t border-zinc-800/80 px-4 py-3">
            <button
              onClick={() => void analyzeTrace()}
              disabled={loading || !traceInput.trim()}
              className="w-full rounded-md bg-[#e0783a] py-2 text-[13px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {loading ? "Analyzing…" : "Analyze root cause"}
            </button>
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto bg-[#111113]">
          {error && (
            <div className="border-b border-red-900/40 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-red-400/80">Error</div>
              <p className="mt-1 text-[13px] text-red-300">{error}</p>
            </div>
          )}

          {parsedTrace && (
            <div className="border-b border-zinc-800/80 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{parsedTrace.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{parsedTrace.traceId}</div>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-zinc-500">
                  <span>{parsedTrace.spans.length} spans</span>
                  <span className={parsedTrace.status === "failed" ? "text-red-400" : "text-emerald-400/80"}>
                    {parsedTrace.status === "failed" ? "× Failed" : "✓ Completed"}
                  </span>
                  <Link
                    href={`/trace/${parsedTrace.traceId}`}
                    className="text-zinc-300 hover:text-zinc-100"
                  >
                    Open canvas
                  </Link>
                </div>
              </div>
            </div>
          )}

          {analysis ? (
            <div className="space-y-5 px-4 py-4">
              {analysis.confidence < 70 && (
                <p className="text-[12px] text-amber-400/90">
                  Low confidence ({analysis.confidence}%). Review the evidence before acting.
                </p>
              )}

              <Field label="Root cause">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-relaxed text-zinc-200">{analysis.rootCause}</p>
                  <span className="shrink-0 text-[11px] text-zinc-500">{analysis.confidence}%</span>
                </div>
              </Field>

              <Field label="First error span">
                <p className="font-mono text-[12px] text-zinc-300">
                  [{analysis.firstErrorSpan.id}] {analysis.firstErrorSpan.name}
                </p>
                {analysis.firstErrorSpan.error && (
                  <p className="mt-2 border-l-2 border-red-500/60 pl-2.5 font-mono text-[12px] text-red-300">
                    {analysis.firstErrorSpan.error}
                  </p>
                )}
              </Field>

              <Field label="Propagation">
                <p className="font-mono text-[12px] text-zinc-400">
                  {analysis.propagationPath.join(" → ")}
                </p>
              </Field>

              <Field label="Evidence">
                <div className="space-y-3">
                  {analysis.evidence.map((item) => (
                    <div key={`${item.spanId}-${item.spanName}`}>
                      <div className="font-mono text-[11px] text-zinc-500">
                        [{item.spanId}] {item.spanName}
                      </div>
                      <p className="mt-0.5 text-[13px] text-zinc-300">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label="Recommendation">
                <p className="text-[13px] leading-relaxed text-zinc-200">{analysis.recommendation}</p>
              </Field>
            </div>
          ) : (
            !error && (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <div>
                  <p className="text-[13px] text-zinc-400">Paste a trace, or load an example.</p>
                  <p className="mt-1 text-[12px] text-zinc-600">
                    Topology stays on the canvas. Details land here.
                  </p>
                </div>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      {children}
    </div>
  );
}
