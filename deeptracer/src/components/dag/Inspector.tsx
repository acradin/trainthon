"use client";

import { type ReactNode } from "react";
import { Span } from "@/types/trace";

interface InspectorProps {
  span: Span;
  onClose: () => void;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusLabel(status: Span["status"]): { text: string; className: string } {
  switch (status) {
    case "success":
      return { text: "✓ Success", className: "text-emerald-400" };
    case "error":
      return { text: "× Failed", className: "text-red-400" };
    case "warning":
      return { text: "– Warning", className: "text-amber-400" };
    case "running":
      return { text: "● Running", className: "text-sky-400" };
  }
}

function typeLabel(type: Span["type"]): string {
  return type === "llm" ? "LLM" : type.charAt(0).toUpperCase() + type.slice(1);
}

function JsonBlock({ data, empty }: { data: unknown; empty: string }) {
  if (data === null || data === undefined) {
    return <p className="text-[12px] italic text-zinc-600">{empty}</p>;
  }
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="max-h-52 overflow-auto rounded-md bg-[#0b0b0c] p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
      {text}
    </pre>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-[13px] text-zinc-200">{children}</div>
    </div>
  );
}

export default function Inspector({ span, onClose }: InspectorProps) {
  const status = statusLabel(span.status);

  return (
    <aside className="flex h-full w-[28%] min-w-[280px] max-w-[380px] flex-col border-l border-zinc-800/80 bg-[#111113]">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-medium text-zinc-100">{span.name}</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">{typeLabel(span.type)}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-[13px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {span.error && (
          <div className="rounded-md border border-red-900/40 bg-red-950/20 p-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-red-400/80">
              Failure
            </div>
            <p className="font-mono text-[12px] leading-relaxed text-red-300">{span.error}</p>
          </div>
        )}

        <Field label="Status">
          <span className={status.className}>{status.text}</span>
        </Field>
        <Field label="Duration">{formatDuration(span.duration)}</Field>
        {span.agent && <Field label="Agent">{span.agent}</Field>}
        <Field label="Span ID">
          <span className="font-mono text-[12px] text-zinc-400">{span.id}</span>
        </Field>
        <Field label="Started">{formatDateTime(span.startedAt)}</Field>
        {span.finishedAt && <Field label="Finished">{formatDateTime(span.finishedAt)}</Field>}

        <div className="border-t border-zinc-800/80 pt-4">
          <Field label="Input">
            <JsonBlock data={span.input} empty="No input" />
          </Field>
        </div>
        <div>
          <Field label="Output">
            <JsonBlock data={span.output} empty="No output" />
          </Field>
        </div>
      </div>
    </aside>
  );
}
