"use client";

import { useState } from "react";
import Link from "next/link";
import { Trace, RootCauseAnalysis } from "@/types/trace";
import { MOCK_TRACES, EXAMPLE_TRACE_JSON } from "@/data/mock-traces";

export default function Home() {
  const [traceInput, setTraceInput] = useState("");
  const [analysis, setAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [parsedTrace, setParsedTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExample = (key: string) => {
    const trace = MOCK_TRACES[key];
    if (trace) {
      setTraceInput(JSON.stringify(trace, null, 2));
      setAnalysis(null);
      setError(null);
    }
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
        setError("Invalid JSON format. Please check your trace data.");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <span className="text-xl">🔍</span>
              </div>
              <h1 className="text-3xl font-bold">DeepTracer</h1>
            </div>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
              Dashboard →
            </Link>
          </div>
          <p className="text-slate-400 text-lg">
            Don&apos;t debug the output. <span className="text-orange-400">Trace the cause.</span>
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold">Trace JSON</h2>
                <div className="flex gap-2">
                  <button onClick={() => loadExample("rate-limit")} className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md transition-colors">Rate Limit</button>
                  <button onClick={() => loadExample("hallucination")} className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md transition-colors">Hallucination</button>
                  <button onClick={() => loadExample("logic-error")} className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md transition-colors">Logic Error</button>
                </div>
              </div>
              <textarea
                value={traceInput}
                onChange={(e) => setTraceInput(e.target.value)}
                placeholder={EXAMPLE_TRACE_JSON}
                className="w-full h-96 p-4 bg-transparent font-mono text-sm resize-none focus:outline-none placeholder-slate-600"
              />
              <div className="px-4 py-3 border-t border-slate-800">
                <button
                  onClick={analyzeTrace}
                  disabled={loading || !traceInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : "🔍 Analyze Root Cause"}
                </button>
              </div>
            </div>

            {parsedTrace && (
              <div className="mt-4 bg-slate-900 rounded-xl border border-slate-800 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span className={parsedTrace.status === "failed" ? "text-red-400" : "text-green-400"}>
                    {parsedTrace.status === "failed" ? "❌" : "✓"}
                  </span>
                  {parsedTrace.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Trace ID</span><p className="font-mono text-slate-300">{parsedTrace.traceId}</p></div>
                  <div><span className="text-slate-500">Duration</span><p className="text-slate-300">{parsedTrace.duration ? `${parsedTrace.duration}ms` : "N/A"}</p></div>
                  <div><span className="text-slate-500">Spans</span><p className="text-slate-300">{parsedTrace.spans.length}</p></div>
                  <div><span className="text-slate-500">Status</span><p className={parsedTrace.status === "failed" ? "text-red-400" : "text-green-400"}>{parsedTrace.status.toUpperCase()}</p></div>
                </div>
              </div>
            )}
          </section>

          <section>
            {error && (
              <div className="bg-red-950/50 border border-red-900 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-red-400 mb-2">⚠️ Error</h3>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {analysis && (
              <div className="space-y-4">
                {analysis.confidence < 70 && (
                  <div className="bg-amber-950/50 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-1">Low Confidence Analysis</h4>
                      <p className="text-amber-200/80 text-sm">신뢰도가 {analysis.confidence}%로 낮습니다. 추가 검토를 권장합니다.</p>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-red-950/50 to-orange-950/50 border border-red-900/50 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-red-400 flex items-center gap-2">🔴 Root Cause</h3>
                    <span className={`px-2 py-1 rounded text-xs ${analysis.confidence >= 80 ? "bg-green-900/50 text-green-400" : analysis.confidence >= 70 ? "bg-slate-800 text-slate-300" : "bg-amber-900/50 text-amber-400"}`}>
                      {analysis.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-lg leading-relaxed">{analysis.rootCause}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="font-semibold text-orange-400 mb-3 flex items-center gap-2">📍 First Error Span</h3>
                  <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-500">[{analysis.firstErrorSpan.id}]</span>
                      <span className="text-slate-200">{analysis.firstErrorSpan.name}</span>
                    </div>
                    {analysis.firstErrorSpan.error && (
                      <p className="text-red-400 text-xs mt-2 pl-4 border-l-2 border-red-800">{analysis.firstErrorSpan.error}</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">🔗 Error Propagation</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {analysis.propagationPath.map((spanId, i) => (
                      <div key={spanId} className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-sm font-mono">{spanId}</span>
                        {i < analysis.propagationPath.length - 1 && <span className="text-slate-600">→</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">🔎 Evidence</h3>
                  <div className="space-y-3">
                    {analysis.evidence.map((ev, i) => (
                      <div key={i} className="bg-slate-950 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-slate-500 font-mono text-xs">[{ev.spanId}]</span>
                          <span className="text-slate-300 text-sm">{ev.spanName}</span>
                        </div>
                        <p className="text-slate-400 text-sm pl-4">{ev.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 border border-green-900/50 rounded-xl p-5">
                  <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">💡 Recommendation</h3>
                  <p className="text-slate-200">{analysis.recommendation}</p>
                </div>
              </div>
            )}

            {!analysis && !error && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">Paste your Trace JSON</h3>
                <p className="text-slate-400 mb-4">Or try one of the example traces above</p>
                <div className="text-sm text-slate-500"><p>Supports: Langfuse, LangSmith, custom formats</p></div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>DeepTracer v0.1.0 — AI Agent Failure Debugging Platform</p>
          <p className="mt-1">Find the first wrong decision.</p>
        </footer>
      </div>
    </main>
  );
}
