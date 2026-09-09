"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import SourceLogo from "@/components/SourceLogo";
import ConnectorSources from "@/components/ConnectorSources";
import type { AgentId, DiscoveredAgent, SyncResult } from "@/lib/agents/types";
import type { PublicConnector } from "@/lib/connectors/types";

interface DiscoverResponse {
  success: boolean;
  agents?: DiscoveredAgent[];
  connectors?: PublicConnector[];
  registry?: {
    registeredAt: string;
    lastSyncedAt?: string;
    agents: Array<{ id: AgentId; enabled: boolean }>;
  } | null;
}

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AgentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState<AgentId | null>(null);
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [connectors, setConnectors] = useState<PublicConnector[]>([]);
  const [registry, setRegistry] = useState<DiscoverResponse["registry"]>(null);
  const [sync, setSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/agents/discover");
      const data: DiscoverResponse = await response.json();
      setAgents((data.agents ?? []).filter((agent) => agent.installed));
      setConnectors(data.connectors ?? []);
      setRegistry(data.registry ?? null);
      if (!data.registry?.agents.length && !data.connectors?.some((item) => item.connected)) {
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const addAgent = async (id: AgentId) => {
    setAdding(id);
    setError(null);
    try {
      const response = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds: [id], sync: true }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "Could not add agent");
        return;
      }
      setRegistry(data.registry);
      setSync(data.sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add agent");
    } finally {
      setAdding(null);
    }
  };

  const scan = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/sync", { method: "POST" });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "Scan failed");
        return;
      }
      setSync(data.sync);
      setRegistry(data.registry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-medium">Sources</h1>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Desktop agents plus open-source chat, git, docs, tickets, and local files.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void scan()}
            disabled={syncing}
            className="rounded-md bg-[#e0783a] px-3 py-1.5 text-[12px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {syncing ? "Scanning…" : "Scan now"}
          </button>
        </div>

        {loading ? (
          <p className="text-[13px] text-zinc-500">Loading…</p>
        ) : agents.length === 0 ? (
          <p className="text-[13px] text-zinc-500">No Claude, GPT, or Cursor desktop app found on this machine.</p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => {
              const registered = registry?.agents.some((item) => item.id === agent.id && item.enabled);
              return (
                <div
                  key={agent.id}
                  className="rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <SourceLogo source={agent.id} className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                      <div>
                        <div className="text-[14px]">{agent.name}</div>
                        <div className="mt-0.5 text-[12px] text-zinc-500">
                          {agent.sessionCount} sessions found
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-zinc-600">{agent.path}</div>
                      </div>
                    </div>
                    {registered ? (
                      <span className="text-[12px] text-emerald-400/80">Registered</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void addAgent(agent.id)}
                        disabled={adding !== null}
                        className="rounded-md bg-[#e0783a] px-2.5 py-1 text-[12px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
                      >
                        {adding === agent.id ? "Adding…" : "Add"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {registry?.lastSyncedAt && (
          <p className="mt-4 text-[12px] text-zinc-600">Last scan {formatWhen(registry.lastSyncedAt)}</p>
        )}
        {sync && (
          <p className="mt-2 text-[12px] text-zinc-500">
            Scanned {sync.scanned} · imported {sync.imported} · skipped {sync.skipped} · failed runs {sync.failed}
          </p>
        )}
        {sync?.errors?.length ? (
          <ul className="mt-2 space-y-1">
            {sync.errors.map((item) => (
              <li key={item} className="text-[12px] text-red-400">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
        <ConnectorSources
          connectors={connectors}
          onChange={(next, nextSync) => {
            setConnectors(next);
            if (nextSync) setSync(nextSync);
          }}
          onError={setError}
        />
        <p className="mt-6 text-[12px] text-zinc-600">
          Manual fallback:{" "}
          <Link href="/import" className="text-zinc-400 hover:text-zinc-200">
            Import JSON
          </Link>
          {" · "}
          <Link href="/setup" className="text-zinc-400 hover:text-zinc-200">
            Live collection
          </Link>
        </p>
      </div>
    </div>
  );
}
