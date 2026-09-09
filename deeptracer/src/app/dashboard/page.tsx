"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trace } from "@/types/trace";
import { MOCK_TRACES } from "@/data/mock-traces";

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function DashboardPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "success">("all");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchTraces();
  }, []);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/traces");
      const data = await response.json();
      if (data.success && data.traces) {
        setTraces(data.traces);
      } else {
        setTraces(Object.values(MOCK_TRACES));
      }
    } catch {
      setTraces(Object.values(MOCK_TRACES));
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/seed", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        await fetchTraces();
      }
    } catch (error) {
      console.error("Seed failed:", error);
    } finally {
      setSeeding(false);
    }
  };
  
  const filteredTraces = traces.filter((trace) => {
    if (filter === "all") return true;
    if (filter === "failed") return trace.status === "failed";
    return trace.status === "success";
  });

  const failedCount = traces.filter((t) => t.status === "failed").length;
  const successCount = traces.filter((t) => t.status === "success").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <span className="text-xl">🔍</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">DeepTracer</h1>
                <p className="text-slate-400 text-sm">Agent Failure Debugging Platform</p>
              </div>
            </div>
            <div className="flex gap-2">
              {traces.length === 0 && !loading && (
                <button
                  onClick={seedData}
                  disabled={seeding}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 rounded-lg text-sm transition-colors"
                >
                  {seeding ? "Loading..." : "📥 Load Sample Data"}
                </button>
              )}
              <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">Quick Analyze</Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-slate-400 text-sm mb-1">Total Traces</div>
            <div className="text-2xl font-bold">{loading ? "..." : traces.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-slate-400 text-sm mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-400">{loading ? "..." : failedCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-slate-400 text-sm mb-1">Success</div>
            <div className="text-2xl font-bold text-green-400">{loading ? "..." : successCount}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "all" ? "bg-slate-700 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>All</button>
          <button onClick={() => setFilter("failed")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "failed" ? "bg-red-900/50 text-red-400" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>Failed</button>
          <button onClick={() => setFilter("success")} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "success" ? "bg-green-900/50 text-green-400" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>Success</button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold">Recent Traces</h2>
            <button onClick={fetchTraces} className="text-slate-400 hover:text-slate-200 text-sm">↻ Refresh</button>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading traces...</div>
          ) : filteredTraces.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-4xl mb-3">📭</div>
              <p>No traces found</p>
              <button onClick={seedData} disabled={seeding} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
                {seeding ? "Loading..." : "Load Sample Data"}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredTraces.map((trace) => (
                <Link key={trace.traceId} href={`/trace/${trace.traceId}`} className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={`text-xl ${trace.status === "failed" ? "text-red-400" : "text-green-400"}`}>{trace.status === "failed" ? "❌" : "✓"}</span>
                    <div>
                      <div className="font-medium">{trace.name}</div>
                      <div className="text-sm text-slate-500 font-mono">{trace.traceId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-slate-400">{trace.spans.length} spans</div>
                    <div className="text-slate-400">{trace.duration ? formatDuration(trace.duration) : "N/A"}</div>
                    <div className="text-slate-500 w-20 text-right">{getRelativeTime(trace.startedAt)}</div>
                    <span className="text-slate-600">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>DeepTracer v0.1.0 — Don&apos;t debug the output. Trace the cause.</p>
        </footer>
      </div>
    </div>
  );
}
