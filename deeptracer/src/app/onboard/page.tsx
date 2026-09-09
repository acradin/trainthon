"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AgentId, DiscoveredAgent, SyncResult } from "@/lib/agents/types";
import BrandLockup from "@/components/BrandLockup";
import SourceLogo from "@/components/SourceLogo";

interface DiscoverResponse {
  success: boolean;
  homeDir?: string;
  agents?: DiscoveredAgent[];
  registry?: { agents: Array<{ id: AgentId }>; lastSyncedAt?: string } | null;
  error?: string;
}

function formatWhen(iso?: string): string {
  if (!iso) return "No sessions yet";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Active just now";
  if (mins < 60) return `Last session ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last session ${hours}h ago`;
  return `Last session ${Math.floor(hours / 24)}d ago`;
}

export default function OnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homeDir, setHomeDir] = useState("");
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [selected, setSelected] = useState<AgentId[]>([]);
  const [sync, setSync] = useState<SyncResult | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/discover");
      const data: DiscoverResponse = await response.json();
      if (!data.success || !data.agents) {
        setError(data.error || "Could not scan this machine.");
        return;
      }
        if (data.registry?.agents.length) {
        router.replace("/agents");
        return;
      }
      setHomeDir(data.homeDir || "");
      const installed = data.agents.filter((agent) => agent.installed);
      setAgents(installed);
      setSelected(installed.map((agent) => agent.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discover failed");
    } finally {
      setLoading(false);
    }
  };

  const installedCount = agents.filter((agent) => agent.installed).length;
  const canRegister = selected.length > 0 && !registering;

  const statusText = useMemo(() => {
    if (loading) return "Scanning this machine…";
    if (installedCount === 0) return "No supported agents found";
    return `${installedCount} agent${installedCount === 1 ? "" : "s"} found`;
  }, [loading, installedCount]);

  const toggle = (id: AgentId) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const register = async () => {
    setRegistering(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds: selected, sync: true }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "Registration failed");
        return;
      }
      const result = data.sync as SyncResult | undefined;
      setSync(result ?? null);

      const failed = (result?.traces ?? []).filter((trace) => trace.status === "failed").slice(0, 3);
      void Promise.all(
        failed.map(async (item) => {
          const traceRes = await fetch(`/api/traces/${item.traceId}`);
          const traceData = await traceRes.json();
          if (!traceData.success || !traceData.trace) return;
          await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trace: traceData.trace }),
          });
        })
      );

      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <header className="flex h-12 items-center justify-between border-b border-zinc-800/80 px-4">
        <BrandLockup />
        <Link href="/" className="text-[12px] text-zinc-500 hover:text-zinc-200">
          ← About
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Get started</p>
        <h1 className="mt-2 text-[22px] font-medium tracking-tight">Register agents on this machine</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
          DeepTracer reads local Claude, GPT, and Cursor session logs. You don’t upload traces — register an agent,
          then we archive recent runs so you can ask what this machine already found.
        </p>
        <p className="mt-3 font-mono text-[11px] text-zinc-600">{statusText}{homeDir ? ` · ${homeDir}` : ""}</p>

        <div className="mt-8 space-y-2">
          {loading ? (
            <div className="rounded-md border border-zinc-800/80 px-4 py-8 text-center text-[13px] text-zinc-500">
              Looking for Claude, GPT, and Cursor desktop apps…
            </div>
          ) : agents.length === 0 ? (
            <div className="rounded-md border border-zinc-800/80 px-4 py-8 text-center text-[13px] text-zinc-500">
              No Claude, GPT, or Cursor desktop app found on this machine.
            </div>
          ) : (
            agents.map((agent) => {
              const checked = selected.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggle(agent.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                    checked
                      ? "border-zinc-600 bg-[#141416]"
                      : "border-zinc-800/80 bg-[#111113] hover:border-zinc-700"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <SourceLogo source={agent.id} className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <div>
                      <div className="text-[14px] font-medium">{agent.name}</div>
                      <div className="mt-0.5 text-[12px] text-zinc-500">
                        {agent.sessionCount} sessions · {formatWhen(agent.lastActivity)}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-zinc-600">{agent.path}</div>
                    </div>
                  </div>
                  <span className="text-[12px] text-emerald-400/80">{checked ? "Selected" : "Found"}</span>
                </button>
              );
            })
          )}
        </div>

        {error && <p className="mt-4 text-[13px] text-red-400">{error}</p>}
        {sync && (
          <p className="mt-4 text-[12px] text-zinc-500">
            Scanned {sync.scanned} · imported {sync.imported} · failed runs {sync.failed}
          </p>
        )}

        <button
          type="button"
          onClick={() => void register()}
          disabled={!canRegister}
          className="mt-8 rounded-md bg-[#e0783a] py-2.5 text-[13px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {registering ? "Scanning sessions…" : "Register and analyze"}
        </button>
        <p className="mt-3 text-[12px] text-zinc-600">
          Only session logs are read. Credentials and auth files are ignored. This has to run on the same computer as
          the agents — a hosted site cannot open ~/.claude, ~/.codex, or ~/.cursor.
        </p>
      </main>
    </div>
  );
}
