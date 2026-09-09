"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RootCauseAnalysis, Span, Trace } from "@/types/trace";
import { MOCK_TRACES } from "@/data/mock-traces";
import ExecutionGraph from "@/components/ExecutionGraph";
import Inspector from "@/components/dag/Inspector";
import Timeline from "@/components/dag/Timeline";
import TestGenerator from "@/components/TestGenerator";

interface PageProps {
  params: Promise<{ traceId: string }>;
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function runStatus(status: Trace["status"]): { label: string; className: string } {
  switch (status) {
    case "failed":
      return { label: "Failed", className: "text-red-400" };
    case "running":
      return { label: "Running", className: "text-sky-400" };
    default:
      return { label: "Completed", className: "text-emerald-400" };
  }
}

export default function TraceDetailPage({ params }: PageProps) {
  const { traceId } = use(params);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [view, setView] = useState<"graph" | "test">("graph");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSelectedSpanId(null);
      setView("graph");
      try {
        const response = await fetch(`/api/traces/${traceId}`);
        const data = await response.json();
        if (data.success && data.trace) {
          setTrace(data.trace);
        } else {
          setTrace(Object.values(MOCK_TRACES).find((item) => item.traceId === traceId) || null);
        }
      } catch {
        setTrace(Object.values(MOCK_TRACES).find((item) => item.traceId === traceId) || null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [traceId]);

  const selectedSpan: Span | null = useMemo(() => {
    if (!trace || !selectedSpanId) return null;
    return trace.spans.find((span) => span.id === selectedSpanId) || null;
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
        if (data.analysis.firstErrorSpan?.id) {
          setSelectedSpanId(data.analysis.firstErrorSpan.id);
        }
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
      <div className="flex h-screen items-center justify-center bg-[#0b0b0c] text-zinc-400">
        Loading run…
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0b0b0c] text-zinc-200">
        <h1 className="text-lg font-medium">Run not found</h1>
        <p className="mt-1 text-sm text-zinc-500">{traceId}</p>
        <Link href="/dashboard" className="mt-4 text-sm text-zinc-400 hover:text-zinc-200">
          ← Runs
        </Link>
      </div>
    );
  }

  const status = runStatus(trace.status);
  const shortId = trace.traceId.replace(/^trace_/, "#");

  return (
    <div className="flex h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="flex items-center" aria-label="deeptracer">
            <Image
              src="/logo-dark.png"
              alt="deeptracer"
              width={154}
              height={40}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <span className="text-zinc-800">/</span>
          <Link href="/dashboard" className="text-[13px] text-zinc-500 hover:text-zinc-200">
            Runs
          </Link>
          <span className="text-zinc-800">/</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[14px] font-medium">{trace.name}</h1>
              <span className="font-mono text-[12px] text-zinc-500">{shortId}</span>
            </div>
          </div>
          <span className={`text-[12px] ${status.className}`}>● {status.label}</span>
          <span className="text-[12px] text-zinc-500">{formatDuration(trace.duration)}</span>
        </div>
        <div className="flex items-center gap-2">
          {trace.status === "failed" && (
            <>
              <button
                onClick={() => setView("test")}
                className={`rounded-md px-3 py-1.5 text-[12px] transition-colors ${
                  view === "test"
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                Test
              </button>
              <button
                onClick={() => void analyzeTrace()}
                disabled={analyzing}
                className="rounded-md bg-[#e0783a] px-3 py-1.5 text-[12px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {analyzing ? "Analyzing…" : "Analyze Root Cause"}
              </button>
            </>
          )}
        </div>
      </header>

      {analysis && showAnalysis && (
        <div className="shrink-0 border-b border-red-900/30 bg-red-950/20 px-4 py-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[12px]">
                <span className="text-red-400">Root cause</span>
                <span className="text-zinc-500">{analysis.confidence}% confidence</span>
              </div>
              <p className="text-[13px] text-zinc-200">{analysis.rootCause}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => {
                  setSelectedSpanId(analysis.firstErrorSpan.id);
                  setView("graph");
                }}
                className="rounded-md border border-zinc-800 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-zinc-700"
              >
                {analysis.firstErrorSpan.name}
              </button>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {view === "graph" ? (
            <ExecutionGraph
              spans={trace.spans}
              selectedSpanId={selectedSpanId}
              onSelectSpan={setSelectedSpanId}
            />
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <button
                onClick={() => setView("graph")}
                className="mb-3 text-[12px] text-zinc-500 hover:text-zinc-200"
              >
                ← Back to canvas
              </button>
              <TestGenerator trace={trace} analysis={analysis} onAnalyze={analyzeTrace} />
            </div>
          )}
        </div>
        {view === "graph" && selectedSpan && (
          <Inspector span={selectedSpan} onClose={() => setSelectedSpanId(null)} />
        )}
      </div>

      {view === "graph" && (
        <Timeline
          spans={trace.spans}
          selectedSpanId={selectedSpanId}
          onSelectSpan={setSelectedSpanId}
        />
      )}
    </div>
  );
}
