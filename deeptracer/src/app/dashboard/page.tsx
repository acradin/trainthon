"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trace } from "@/types/trace";
import AppHeader from "@/components/AppHeader";
import SourceLogo, { sourceShortLabel } from "@/components/SourceLogo";
import { presentTrace } from "@/lib/semantic-spans";
import {
  inferTraceSource,
  OTHER_PROJECT,
  projectKey,
  sourceLabel,
} from "@/lib/trace-source";
import FilterSelect from "@/components/FilterSelect";
import { DESKTOP_AGENT_IDS, isDesktopAgentId, type AgentId } from "@/lib/agents/types";
import {
  peekRunsFilters,
  restoreRunsFilters,
  writeRunsFilters,
  type RunsAgentKey,
  type RunsRangeKey,
  type RunsSortKey,
} from "@/lib/runs-filters";

type RangeKey = RunsRangeKey;
type AgentKey = RunsAgentKey;
type ProjectFilter = "all" | string;
type SortKey = RunsSortKey;

const RANGE_OPTIONS: Array<{ id: RangeKey; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "all", label: "All time" },
];

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "duration", label: "Longest" },
  { id: "intent", label: "Off intent" },
  { id: "name", label: "Name" },
];

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

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

function inRange(iso: string, range: RangeKey): boolean {
  const time = new Date(iso).getTime();
  if (range === "all") return true;
  if (range === "today") return time >= startOfToday();
  return time >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function compareTraces(a: Trace, b: Trace, sort: SortKey): number {
  switch (sort) {
    case "oldest":
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    case "duration":
      return (b.duration ?? 0) - (a.duration ?? 0);
    case "intent": {
      if (a.status === "failed" && b.status !== "failed") return -1;
      if (b.status === "failed" && a.status !== "failed") return 1;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    }
    case "name":
      return a.name.localeCompare(b.name);
    default:
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>(() => peekRunsFilters().range);
  const [agent, setAgent] = useState<AgentKey>(() => peekRunsFilters().agent);
  const [project, setProject] = useState<ProjectFilter>(() => peekRunsFilters().project);
  const [sort, setSort] = useState<SortKey>(() => peekRunsFilters().sort);
  const [query, setQuery] = useState(() => peekRunsFilters().query);
  const [filtersReady, setFiltersReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [installedSources, setInstalledSources] = useState<AgentId[]>([]);

  useEffect(() => {
    const stored = restoreRunsFilters();
    setRange(stored.range);
    setAgent(stored.agent);
    setProject(stored.project);
    setSort(stored.sort);
    setQuery(stored.query);
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    writeRunsFilters({ range, agent, project, sort, query });
  }, [filtersReady, range, agent, project, sort, query]);

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
      const found = ((registryData.agents ?? []) as Array<{ id: string; installed?: boolean }>)
        .filter((item): item is { id: AgentId; installed?: boolean } =>
          item.installed !== false && isDesktopAgentId(item.id)
        )
        .map((item) => item.id);
      setInstalledSources(found);
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
        setTraces((data.traces as Trace[]).map(presentTrace));
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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return traces
      .filter((trace) => {
        const source = inferTraceSource(trace);
        const key = projectKey(trace);
        if (agent !== "all" && source !== agent) return false;
        if (project !== "all" && key !== project) return false;
        if (!inRange(trace.startedAt, range)) return false;
        if (!needle) return true;
        return (
          trace.name.toLowerCase().includes(needle) ||
          trace.traceId.toLowerCase().includes(needle) ||
          sourceLabel(source).toLowerCase().includes(needle) ||
          key.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => compareTraces(a, b, sort));
  }, [traces, range, query, agent, project, sort]);

  const projects = useMemo(() => {
    const names = new Set<string>();
    for (const trace of traces) {
      if (agent !== "all" && inferTraceSource(trace) !== agent) continue;
      if (!inRange(trace.startedAt, range)) continue;
      names.add(projectKey(trace));
    }
    return [...names].sort((a, b) => {
      if (a === OTHER_PROJECT) return 1;
      if (b === OTHER_PROJECT) return -1;
      return a.localeCompare(b);
    });
  }, [traces, agent, range]);

  useEffect(() => {
    if (project !== "all" && projects.length > 0 && !projects.includes(project)) {
      setProject("all");
    }
  }, [project, projects]);

  const agentFilters = useMemo(() => {
    const installed = DESKTOP_AGENT_IDS.filter((id) => installedSources.includes(id));
    if (installed.length <= 1) return installed;
    return ["all", ...installed] as Array<"all" | AgentId>;
  }, [installedSources]);

  useEffect(() => {
    if (agent !== "all" && isDesktopAgentId(agent) && installedSources.length > 0 && !installedSources.includes(agent)) {
      setAgent("all");
    }
  }, [agent, installedSources]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, Trace[]>();
    for (const trace of visible) {
      const key = projectKey(trace);
      const list = buckets.get(key);
      if (list) list.push(trace);
      else buckets.set(key, [trace]);
    }

    const keys = [...buckets.keys()];
    if (sort === "name") {
      keys.sort((a, b) => {
        if (a === OTHER_PROJECT) return 1;
        if (b === OTHER_PROJECT) return -1;
        return a.localeCompare(b);
      });
    }

    return keys.map((key) => ({
      key,
      traces: buckets.get(key) ?? [],
    }));
  }, [visible, sort]);

  const rangeLabel = range === "today" ? "today" : range === "7d" ? "in 7 days" : "total";

  const agentOptions = useMemo(
    () =>
      agentFilters.map((key) =>
        key === "all"
          ? { id: "all" as const, label: "All agents" }
          : {
              id: key,
              label: sourceShortLabel(key),
              icon: <SourceLogo source={key} className="h-3.5 w-3.5 text-zinc-400" />,
            }
      ),
    [agentFilters]
  );

  const projectOptions = useMemo(
    () => [
      { id: "all", label: "All projects" },
      ...projects.map((name) => ({ id: name, label: name })),
    ],
    [projects]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-medium">Runs</h1>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {loading
                ? "Loading…"
                : `${visible.length} ${visible.length === 1 ? "run" : "runs"} ${rangeLabel}${
                    grouped.length > 1 ? ` · ${grouped.length} projects` : ""
                  }${agent === "all" ? "" : ` · ${sourceShortLabel(agent)}`}${
                    project === "all" ? "" : ` · ${project}`
                  }`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void scanNow()}
            disabled={scanning || !registered}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-[12px] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 disabled:border-zinc-900 disabled:text-zinc-700"
          >
            {scanning ? "Scanning…" : "Scan now"}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search intent or project…"
            className="min-w-0 flex-1 rounded-md border border-zinc-800/80 bg-[#111113] px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          {agentOptions.length > 1 ? (
            <FilterSelect
              label="Agent"
              value={agent === "example" ? "all" : agent}
              options={agentOptions}
              onChange={setAgent}
            />
          ) : null}
          <FilterSelect
            label="Date"
            value={range}
            options={RANGE_OPTIONS}
            onChange={setRange}
          />
          {projects.length > 1 ? (
            <FilterSelect
              label="Project"
              value={project}
              options={projectOptions}
              onChange={setProject}
            />
          ) : null}
          <FilterSelect
            label="Sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={setSort}
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-16 text-center text-[13px] text-zinc-600">
              Loading runs…
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-16 text-center">
              <p className="text-[13px] text-zinc-400">
                {query
                  ? "No runs match that search."
                  : project !== "all"
                    ? `No ${project} runs ${range === "today" ? "today" : "in this range"}.`
                    : agent !== "all"
                    ? `No ${sourceShortLabel(agent)} runs ${range === "today" ? "today" : "in this range"}.`
                    : range === "today"
                      ? "No runs today."
                      : "No runs in this range."}
              </p>
              {range === "today" && !query ? (
                <button
                  type="button"
                  onClick={() => setRange("7d")}
                  className="mt-3 text-[12px] text-zinc-500 hover:text-zinc-200"
                >
                  Show last 7 days
                </button>
              ) : null}
            </div>
          ) : (
            grouped.map((bucket) => (
              <section
                key={bucket.key}
                className="overflow-hidden rounded-md border border-zinc-800/80 bg-[#111113]"
              >
                <header className="flex items-baseline justify-between gap-3 border-b border-zinc-800/80 bg-[#17171a] px-4 py-2.5">
                  <h2 className="min-w-0 truncate text-[14px] font-medium tracking-tight text-zinc-100">
                    {bucket.key}
                  </h2>
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                    {bucket.traces.length} {bucket.traces.length === 1 ? "run" : "runs"}
                  </span>
                </header>
                <div>
                  {bucket.traces.map((trace) => (
                    <Link
                      key={trace.traceId}
                      href={`/trace/${trace.traceId}`}
                      title={trace.name}
                      className={`flex items-start gap-3 border-b border-zinc-800/50 py-2.5 pr-4 last:border-b-0 hover:bg-zinc-900/40 ${
                        trace.status === "failed"
                          ? "border-l-2 border-l-amber-500/70 pl-[14px]"
                          : "pl-4"
                      }`}
                    >
                      <SourceLogo
                        source={inferTraceSource(trace)}
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[13px] leading-snug text-zinc-300">
                          {trace.name}
                        </div>
                      </div>
                      <div className="w-[7.5rem] shrink-0 pt-0.5 text-right text-[11px] leading-tight tabular-nums text-zinc-500">
                        <div>{getRelativeTime(trace.startedAt)}</div>
                        <div className="mt-1 text-zinc-600">
                          {formatDuration(trace.duration)}
                          <span className="text-zinc-700"> · </span>
                          {trace.spans.length}
                        </div>
                        {trace.status === "failed" ? (
                          <div className="mt-1 text-amber-400/90">off intent</div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
