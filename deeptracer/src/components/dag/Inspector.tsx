"use client";

import { type ReactNode } from "react";
import { Span } from "@/types/trace";
import { evidenceCalls, evidenceResult, isUserTurn, spanKindLabel } from "@/lib/semantic-spans";
import { presentSpanContent, type MentionedFile } from "@/lib/span-content";

interface InspectorProps {
  span: Span;
  onClose: () => void;
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

function typeLabel(span: Span): string {
  return spanKindLabel(span);
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

function TextBlock({ text, empty }: { text: string; empty: string }) {
  if (!text) {
    return <p className="text-[12px] italic text-zinc-600">{empty}</p>;
  }
  return (
    <p className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-300">
      {text}
    </p>
  );
}

function FileList({ files }: { files: MentionedFile[] }) {
  if (files.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {files.map((file) => (
        <li key={file.path || file.name} className="min-w-0">
          <div className="truncate text-[13px] text-zinc-200">{file.name}</div>
          {file.path ? (
            <div className="truncate font-mono text-[11px] text-zinc-500" title={file.path}>
              {file.path}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function isProseSpan(span: Span): boolean {
  return (
    isUserTurn(span) ||
    span.name === "Context" ||
    span.name === "LLM Response" ||
    span.type === "memory" ||
    span.type === "agent" ||
    span.type === "llm"
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
  const calls = evidenceCalls(span);
  const result = evidenceResult(span);
  const prose = isProseSpan(span);
  const asked = presentSpanContent(span.input);
  const got = presentSpanContent(result);
  const askedLabel = span.name === "Context" || span.type === "memory" ? "Context" : "Asked";

  return (
    <aside className="flex h-full w-[28%] min-w-[280px] max-w-[380px] flex-col border-l border-zinc-800/80 bg-[#111113]">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-medium text-zinc-100">{span.name}</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">{typeLabel(span)}</p>
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
        {calls.length > 1 ? (
          <Field label="Calls">
            <ul className="space-y-1">
              {calls.map((call, index) => (
                <li key={`${call.name}-${index}`} className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="min-w-0 truncate text-zinc-400">{call.name}</span>
                  <span className="shrink-0 text-zinc-600">{call.status}</span>
                </li>
              ))}
            </ul>
          </Field>
        ) : null}

        <div className="space-y-5 border-t border-zinc-800/80 pt-4">
          {prose ? (
            <>
              {asked.text || asked.files.length === 0 ? (
                <Field label={askedLabel}>
                  <TextBlock text={asked.text} empty="No input" />
                </Field>
              ) : null}
              {asked.files.length > 0 ? (
                <Field label="Files">
                  <FileList files={asked.files} />
                </Field>
              ) : null}
              {got.text || got.files.length > 0 || span.type === "llm" ? (
                <>
                  <Field label="Got">
                    <TextBlock text={got.text} empty="No result" />
                  </Field>
                  {got.files.length > 0 ? (
                    <Field label="Files">
                      <FileList files={got.files} />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <>
              <Field label="Asked">
                <JsonBlock data={span.input} empty="No input" />
              </Field>
              <Field label="Got">
                <JsonBlock data={result} empty="No result" />
              </Field>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
