"use client";

import { Span } from "@/types/trace";

interface TimelineProps {
  spans: Span[];
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

function formatDuration(ms?: number): string {
  if (!ms) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusDot(status: Span["status"]): string {
  switch (status) {
    case "success":
      return "bg-emerald-400/80";
    case "error":
      return "bg-red-400";
    case "warning":
      return "bg-amber-400/80";
    case "running":
      return "bg-sky-400";
  }
}

export default function Timeline({ spans, selectedSpanId, onSelectSpan }: TimelineProps) {
  const ordered = [...spans].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  return (
    <div className="shrink-0 border-t border-zinc-800/80 bg-[#0f0f11]">
      <div className="flex items-center gap-3 overflow-x-auto px-4 py-2">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Timeline
        </span>
        {ordered.map((span, index) => {
          const selected = span.id === selectedSpanId;
          return (
            <button
              key={span.id}
              onClick={() => onSelectSpan(span.id)}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors ${
                selected
                  ? "border-[#e0783a]/70 bg-[#e0783a]/10"
                  : "border-zinc-800 bg-[#141416] hover:border-zinc-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot(span.status)}`} />
              <span className="text-[11px] text-zinc-300">{span.name}</span>
              {span.duration ? (
                <span className="text-[10px] text-zinc-500">{formatDuration(span.duration)}</span>
              ) : null}
              {index < ordered.length - 1 ? (
                <span className="sr-only">then</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
