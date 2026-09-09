"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import SourceLogo, { sourceShortLabel } from "@/components/SourceLogo";
import { RecallHit, RecallResult } from "@/types/trace";
import { inferTraceSource } from "@/lib/trace-source";

const EXAMPLES = [
  "What did we already find about Outstatic?",
  "What did we decide about auth?",
];

function relativeTime(iso: string): string {
  const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function RecallPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<RecallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const gate = async () => {
      try {
        const response = await fetch("/api/agents/discover");
        const data = await response.json();
        if (!data.registry?.agents?.length) {
          router.replace("/");
          return;
        }
        try {
          const tracesRes = await fetch("/api/traces");
          const tracesData = await tracesRes.json();
          setRunCount(Array.isArray(tracesData.traces) ? tracesData.traces.length : 0);
        } catch {
          setRunCount(0);
        }
        setReady(true);
      } catch {
        router.replace("/");
      }
    };
    void gate();
  }, [router]);

  const ask = async (value: string) => {
    const next = value.trim();
    if (next.length < 2 || asking) return;
    setQuery(next);
    setAsking(true);
    setError(null);
    try {
      const response = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: next }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(typeof data.error === "string" ? data.error : "Recall failed");
        setResult(null);
        return;
      }
      setResult({
        answer: data.answer,
        hits: (data.hits ?? []) as RecallHit[],
        mode: data.mode === "llm" ? "llm" : "lexical",
      });
    } catch {
      setError("Recall failed");
      setResult(null);
    } finally {
      setAsking(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(query);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0c] text-[13px] text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5">
        <div className="mb-5">
          <h1 className="text-[15px] font-medium">Ask this machine</h1>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            What Claude, GPT, and Cursor already found or decided. Open a receipt only if you need the source.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What did we already find about…"
            className="min-w-0 flex-1 rounded-md border border-zinc-800/80 bg-[#111113] px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={asking || query.trim().length < 2}
            className="rounded-md bg-[#e0783a] px-3 py-2 text-[13px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {asking ? "Looking…" : "Ask"}
          </button>
        </form>

        {!result && !error && runCount === 0 ? (
          <p className="mt-6 text-[13px] text-zinc-500">
            No runs in the archive yet.{" "}
            <Link href="/agents" className="text-zinc-300 hover:text-zinc-100">
              Scan sessions
            </Link>
            {" or "}
            <Link href="/dashboard" className="text-zinc-300 hover:text-zinc-100">
              open Runs
            </Link>
            .
          </p>
        ) : null}

        {!result && !error && runCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void ask(example)}
                className="rounded-md border border-zinc-800 px-2.5 py-1 text-[12px] text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 text-[13px] text-zinc-400">{error}</p>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-4">
            <article className="rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Already found
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">{result.answer}</p>
            </article>

            {result.hits.length === 0 ? (
              <p className="text-[13px] text-zinc-500">
                No receipts.{" "}
                <Link href="/dashboard" className="text-zinc-300 hover:text-zinc-100">
                  Open Runs
                </Link>
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border border-zinc-800/80 bg-[#111113]">
                <header className="border-b border-zinc-800/80 bg-[#17171a] px-4 py-2.5 text-[11px] text-zinc-500">
                  Receipts
                </header>
                {result.hits.map((hit) => {
                  const source = hit.source ?? inferTraceSource({ traceId: hit.traceId, source: hit.source });
                  return (
                    <Link
                      key={`${hit.traceId}:${hit.spanId}`}
                      href={`/trace/${hit.traceId}?span=${encodeURIComponent(hit.spanId)}`}
                      className="flex items-start gap-3 border-b border-zinc-800/50 px-4 py-2.5 last:border-b-0 hover:bg-zinc-900/40"
                    >
                      <SourceLogo source={source} className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-zinc-200">{hit.spanName}</div>
                        <div className="mt-0.5 truncate text-[12px] text-zinc-500">
                          {hit.traceName}
                          {hit.project ? ` · ${hit.project}` : ""}
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">{hit.reason}</p>
                      </div>
                      <div className="w-[6.5rem] shrink-0 pt-0.5 text-right text-[11px] leading-tight text-zinc-500">
                        <div>{sourceShortLabel(source)}</div>
                        <div className="mt-1 text-zinc-600">{relativeTime(hit.startedAt)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
