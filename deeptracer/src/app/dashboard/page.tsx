"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trace } from "@/types/trace";
import AppHeader from "@/components/AppHeader";

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusMark(status: Trace["status"]): { icon: string; label: string; className: string } {
  if (status === "failed") return { icon: "×", label: "Failed", className: "text-red-400" };
  if (status === "running") return { icon: "●", label: "Running", className: "text-sky-400" };
  return { icon: "✓", label: "Completed", className: "text-emerald-400/80" };
}

export default function DashboardPage() {
  const router = useRouter();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "success">("all");
  const [scanning, setScanning] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const registryRes = await fetch("/api/agents/discover");
      const registryData = await registryRes.json();
      if (!registryData.registry?.agents?.length) {
        router.replace("/");
        return;
      }
      setRegistered(true);
    } catch {
      router.replace("/");
      return;
    }
    await fetchTraces();
  };

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/traces");
      const data = await response.json();
      if (data.success && data.traces) {
        setTraces(data.traces);
      } else {
        setTraces([]);
      }
    } catch {
      setTraces([]);
    } finally {
      setLoading(false);
    }
  };

  const scanNow = async () => {
    setScanning(true);
    try {
      await fetch("/api/agents/sync", { method: "POST" });
      await fetchTraces();
    } finally {
      setScanning(false);
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
    <div className="flex min-h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-medium">Runs</h1>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {loading
                ? "Loading…"
                : `${traces.length} runs · ${failedCount} failed · ${successCount} completed`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["all", "failed", "success"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-2.5 py-1 text-[12px] capitalize transition-colors ${
                  filter === key
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                {key === "success" ? "Completed" : key}
              </button>
            ))}
            <button
              onClick={() => void scanNow()}
              disabled={scanning || !registered}
              className="rounded-md px-2.5 py-1 text-[12px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 disabled:text-zinc-700"
            >
              {scanning ? "Scanning…" : "Scan now"}
            </button>
            <button
              onClick={() => void fetchTraces()}
              className="rounded-md px-2.5 py-1 text-[12px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-zinc-800/80 bg-[#111113]">
          <div className="min-w-[760px]">
          <div className="grid grid-cols-[minmax(0,1.4fr)_88px_72px_72px_88px_96px] gap-3 border-b border-zinc-800/80 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            <span>Run</span>
            <span>ID</span>
            <span>Spans</span>
            <span>Duration</span>
            <span>When</span>
            <span className="text-right">Status</span>
          </div>

          {loading ? (
            <div className="px-4 py-16 text-center text-[13px] text-zinc-600">Loading runs…</div>
          ) : filteredTraces.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-[13px] text-zinc-400">No runs yet. Scan local agent sessions.</p>
              <button
                onClick={() => void scanNow()}
                disabled={scanning}
                className="mt-3 rounded-md border border-zinc-800 px-3 py-1.5 text-[12px] text-zinc-300 hover:border-zinc-700"
              >
                {scanning ? "Scanning…" : "Scan now"}
              </button>
            </div>
          ) : (
            <div>
              {filteredTraces.map((trace) => {
                const status = statusMark(trace.status);
                return (
                  <Link
                    key={trace.traceId}
                    href={`/trace/${trace.traceId}`}
                    className={`grid grid-cols-[minmax(0,1.4fr)_88px_72px_72px_88px_96px] items-center gap-3 border-b border-zinc-800/60 px-4 py-2.5 last:border-b-0 hover:bg-zinc-900/50 ${
                      trace.status === "failed" ? "border-l-2 border-l-red-500/70" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <span className="truncate text-[13px] text-zinc-100">{trace.name}</span>
                    <span className="truncate font-mono text-[11px] text-zinc-500">
                      {trace.traceId.replace(/^trace_/, "#")}
                    </span>
                    <span className="text-[12px] text-zinc-400">{trace.spans.length}</span>
                    <span className="text-[12px] text-zinc-400">{formatDuration(trace.duration)}</span>
                    <span className="text-[12px] text-zinc-500">{getRelativeTime(trace.startedAt)}</span>
                    <span className={`text-right text-[12px] ${status.className}`}>
                      {status.icon} {status.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
