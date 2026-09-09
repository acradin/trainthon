"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RootCauseAnalysis, Span, Trace } from "@/types/trace";
import { MOCK_TRACES } from "@/data/mock-traces";
import BrandLockup from "@/components/BrandLockup";
import ExecutionGraph from "@/components/ExecutionGraph";
import Inspector from "@/components/dag/Inspector";
import Timeline from "@/components/dag/Timeline";
import TestGenerator from "@/components/TestGenerator";
import SourceLogo, { sourceShortLabel } from "@/components/SourceLogo";
import { presentTrace, resolveDisplaySpan, semanticGraphMatches } from "@/lib/semantic-spans";
import { inferProject, inferTraceSource } from "@/lib/trace-source";

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
      return { label: "Off intent", className: "text-amber-400/90" };
    case "running":
      return { label: "Running", className: "text-sky-400" };
    default:
      return { label: "Ran", className: "text-zinc-500" };
  }
}

export default function TraceDetailPage({ params }: PageProps) {
  const { traceId } = use(params);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphStatus, setGraphStatus] = useState<"ready" | "building">("ready");
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
      const apply = (raw: Trace | null) => {
        if (!raw) {
          setTrace(null);
          setGraphStatus("ready");
          return;
        }
        setTrace(presentTrace(raw));
        setGraphStatus(semanticGraphMatches(raw) && raw.semanticGraph?.model !== "heuristic" ? "ready" : "building");
        const span = new URLSearchParams(window.location.search).get("span");
        if (span) setSelectedSpanId(span);
      };
      try {
        const response = await fetch(`/api/traces/${traceId}`);
        const data = await response.json();
        if (data.success && data.trace) {
          apply(data.trace as Trace);
        } else {
          const fallback = Object.values(MOCK_TRACES).find((item) => item.traceId === traceId) || null;
          apply(fallback);
        }
      } catch {
        const fallback = Object.values(MOCK_TRACES).find((item) => item.traceId === traceId) || null;
        apply(fallback);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [traceId]);

  useEffect(() => {
    if (!trace || graphStatus !== "building") return;
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/traces/${trace.traceId}/semantic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (cancelled) return;
        if (data.success && data.trace) {
          setTrace(presentTrace(data.trace as Trace));
        }
      } catch (error) {
        console.error("Semantic graph failed:", error);
      } finally {
        if (!cancelled) setGraphStatus("ready");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [trace?.traceId, graphStatus]);

  useEffect(() => {
    if (!trace || !selectedSpanId) return;
    const resolved = resolveDisplaySpan(trace.spans, selectedSpanId);
    if (resolved && resolved.id !== selectedSpanId) {
      setSelectedSpanId(resolved.id);
    }
  }, [trace, selectedSpanId]);

  const selectedSpan: Span | null = useMemo(() => {
    if (!trace || !selectedSpanId) return null;
    return resolveDisplaySpan(trace.spans, selectedSpanId);
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
        <Link href="/recall" className="mt-4 text-sm text-zinc-400 hover:text-zinc-200">
          ← Recall
        </Link>
      </div>
    );
  }

  const status = runStatus(trace.status);
  const shortId = trace.traceId.replace(/^trace_/, "#");
  const source = inferTraceSource(trace);
  const projectName = inferProject(trace);

  return (
    <div className="flex h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/80 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLockup compact />
          <span className="text-zinc-800">/</span>
          <Link href="/recall" className="text-[13px] text-zinc-500 hover:text-zinc-200">
            Recall
          </Link>
          <span className="text-zinc-800">/</span>
          <Link href="/dashboard" className="text-[13px] text-zinc-500 hover:text-zinc-200">
            Runs
          </Link>
          <span className="text-zinc-800">/</span>
          {projectName ? (
            <>
              <span className="shrink-0 text-[13px] text-zinc-400">{projectName}</span>
              <span className="text-zinc-800">/</span>
            </>
          ) : null}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-[14px] font-medium" title={trace.name}>
                {trace.name}
              </h1>
              <span className="shrink-0 font-mono text-[12px] text-zinc-500">{shortId}</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-zinc-500">
                <SourceLogo source={source} className="h-3.5 w-3.5" />
                {sourceShortLabel(source)}
              </span>
            </div>
          </div>
          <span className={`text-[12px] ${status.className}`}>● {status.label}</span>
          <span className="text-[12px] text-zinc-500">{formatDuration(trace.duration)}</span>
        </div>
        <div className="flex items-center gap-2">
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
            {analyzing ? "Reading…" : "Review intent"}
          </button>
        </div>
      </header>

      {analysis && showAnalysis && (
        <div className="shrink-0 border-b border-zinc-800/80 bg-[#111113] px-4 py-2.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[12px]">
                <span className="text-zinc-500">Intent check</span>
                <span className="text-zinc-600">{analysis.confidence}%</span>
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
            graphStatus === "building" ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-[13px] text-zinc-300">Building meaning graph</p>
                <p className="text-[12px] text-zinc-500">Collapsing tool calls into what each step obtained</p>
              </div>
            ) : (
              <ExecutionGraph
                spans={trace.spans}
                selectedSpanId={selectedSpanId}
                onSelectSpan={setSelectedSpanId}
              />
            )
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
        {view === "graph" && graphStatus === "ready" && selectedSpan && (
          <Inspector span={selectedSpan} onClose={() => setSelectedSpanId(null)} />
        )}
      </div>

      {view === "graph" && graphStatus === "ready" && (
        <Timeline
          spans={trace.spans}
          selectedSpanId={selectedSpanId}
          onSelectSpan={setSelectedSpanId}
        />
      )}
    </div>
  );
}
