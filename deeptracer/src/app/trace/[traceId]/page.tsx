"use client";

import { useState, useMemo, useEffect, use } from "react";
import Link from "next/link";
import { Trace, Span, RootCauseAnalysis } from "@/types/trace";
import { MOCK_TRACES } from "@/data/mock-traces";
import ExecutionGraph from "@/components/ExecutionGraph";
import SpanDetail from "@/components/SpanDetail";
import TestGenerator from "@/components/TestGenerator";

interface PageProps {
  params: Promise<{ traceId: string }>;
}

function formatDuration(ms?: number): string {
  if (!ms) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function TraceDetailPage({ params }: PageProps) {
  const { traceId } = use(params);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [allTraces, setAllTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<"graph" | "test">("graph");

  useEffect(() => {
    fetchTrace();
    fetchAllTraces();
  }, [traceId]);

  const fetchTrace = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/traces/${traceId}`);
      const data = await response.json();
      if (data.success && data.trace) {
        setTrace(data.trace);
      } else {
        const mockTrace = Object.values(MOCK_TRACES).find((t) => t.traceId === traceId);
        setTrace(mockTrace || null);
      }
    } catch {
      const mockTrace = Object.values(MOCK_TRACES).find((t) => t.traceId === traceId);
      setTrace(mockTrace || null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTraces = async () => {
    try {
      const response = await fetch("/api/traces");
      const data = await response.json();
      if (data.success && data.traces) {
        setAllTraces(data.traces);
      } else {
        setAllTraces(Object.values(MOCK_TRACES));
      }
    } catch {
      setAllTraces(Object.values(MOCK_TRACES));
    }
  };

  const selectedSpan: Span | null = useMemo(() => {
    if (!trace || !selectedSpanId) return null;
    return trace.spans.find((s) => s.id === selectedSpanId) || null;
  }, [trace, selectedSpanId]);

  const analyzeTrace = async (): Promise<RootCauseAnalysis | null> => {
    if (!trace) return null;
    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trace }),
      });
      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setShowAnalysis(true);
        return data.analysis;
      }
      return null;
    } catch (error) {
      console.error("Analysis failed:", error);
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔍</div>
          <p className="text-slate-400">Loading trace...</p>
        </div>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">Trace Not Found</h1>
          <p className="text-slate-400 mb-6">The trace with ID &quot;{traceId}&quot; does not exist.</p>
          <Link href="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 transition-colors">← Dashboard</Link>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center gap-3">
              <span className={`text-xl ${trace.status === "failed" ? "text-red-400" : "text-green-400"}`}>{trace.status === "failed" ? "❌" : "✓"}</span>
              <div>
                <h1 className="font-semibold">{trace.name}</h1>
                <p className="text-sm text-slate-500 font-mono">{trace.traceId}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400"><span className="text-slate-500">Duration:</span> {formatDuration(trace.duration)}</div>
            <div className="text-sm text-slate-400"><span className="text-slate-500">Started:</span> {formatDateTime(trace.startedAt)}</div>
            {trace.status === "failed" && (
              <button onClick={analyzeTrace} disabled={analyzing} className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-700 rounded-lg text-sm font-medium transition-all">
                {analyzing ? "Analyzing..." : "🔍 Analyze Root Cause"}
              </button>
            )}
          </div>
        </div>
      </header>

      {analysis && showAnalysis && (
        <div className="bg-gradient-to-r from-red-950/50 to-orange-950/50 border-b border-red-900/50 px-4 py-4 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-red-400 font-semibold">🔴 Root Cause Detected</span>
                <span className={`px-2 py-0.5 rounded text-xs ${analysis.confidence >= 80 ? "bg-green-900/50 text-green-400" : analysis.confidence >= 70 ? "bg-slate-800 text-slate-300" : "bg-amber-900/50 text-amber-400"}`}>{analysis.confidence}% confidence</span>
              </div>
              <p className="text-slate-200 mb-3">{analysis.rootCause}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">First error span:</span>
                <button onClick={() => setSelectedSpanId(analysis.firstErrorSpan.id)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded font-mono text-xs transition-colors">{analysis.firstErrorSpan.name}</button>
              </div>
            </div>
            <button onClick={() => setShowAnalysis(false)} className="text-slate-500 hover:text-slate-300 transition-colors">✕</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-48 bg-slate-900/50 border-r border-slate-800 overflow-y-auto shrink-0">
          <div className="p-3 border-b border-slate-800"><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Traces</h3></div>
          <div className="divide-y divide-slate-800">
            {allTraces.map((t) => (
              <Link key={t.traceId} href={`/trace/${t.traceId}`} className={`block p-3 hover:bg-slate-800/50 transition-colors ${t.traceId === traceId ? "bg-slate-800/50 border-l-2 border-orange-500" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${t.status === "failed" ? "text-red-400" : "text-green-400"}`}>{t.status === "failed" ? "✗" : "✓"}</span>
                  <span className="text-sm truncate">{t.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("graph")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "graph"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📊 Execution Graph
              </button>
              {trace.status === "failed" && (
                <button
                  onClick={() => setActiveTab("test")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === "test"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🧪 Regression Test
                </button>
              )}
            </div>
            {activeTab === "graph" && (
              <p className="text-sm text-slate-400">{trace.spans.length} spans • Click a span to view details</p>
            )}
          </div>

          {activeTab === "graph" && (
            <ExecutionGraph spans={trace.spans} selectedSpanId={selectedSpanId} onSelectSpan={setSelectedSpanId} />
          )}

          {activeTab === "test" && trace.status === "failed" && (
            <TestGenerator trace={trace} analysis={analysis} onAnalyze={analyzeTrace} />
          )}
        </main>

        <aside className="w-96 bg-slate-900 border-l border-slate-800 shrink-0">
          <SpanDetail span={selectedSpan} />
        </aside>
      </div>
    </div>
  );
}
