"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { Trace } from "@/types/trace";

type ImportFormat = "auto" | "claude-code" | "codex";

const FORMATS: { id: ImportFormat; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
];

export default function ImportPage() {
  const [format, setFormat] = useState<ImportFormat>("auto");
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; trace?: Trace; error?: string } | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      const data = JSON.parse(jsonInput);
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, data }),
      });
      setResult(await response.json());
    } catch (error) {
      if (error instanceof SyntaxError) {
        setResult({ success: false, error: "Invalid JSON. Check the payload." });
      } else {
        setResult({ success: false, error: error instanceof Error ? error.message : "Import failed" });
      }
    } finally {
      setImporting(false);
    }
  };

  const loadExample = (type: "claude-code" | "codex") => {
    if (type === "claude-code") {
      setFormat("claude-code");
      setJsonInput(JSON.stringify({
        resourceSpans: [{
          resource: { attributes: [{ key: "service.name", value: { stringValue: "claude-code" } }] },
          scopeSpans: [{
            spans: [
              {
                traceId: "abc123",
                spanId: "span1",
                name: "claude_code.interaction",
                startTimeUnixNano: "1725840000000000000",
                endTimeUnixNano: "1725840030000000000",
                attributes: [{ key: "user.prompt", value: { stringValue: "Help me debug this code" } }],
              },
              {
                traceId: "abc123",
                spanId: "span2",
                parentSpanId: "span1",
                name: "claude_code.llm_request",
                startTimeUnixNano: "1725840001000000000",
                endTimeUnixNano: "1725840010000000000",
                attributes: [{ key: "model", value: { stringValue: "claude-3-opus" } }],
              },
              {
                traceId: "abc123",
                spanId: "span3",
                parentSpanId: "span1",
                name: "claude_code.tool",
                startTimeUnixNano: "1725840011000000000",
                endTimeUnixNano: "1725840020000000000",
                attributes: [
                  { key: "tool.name", value: { stringValue: "read_file" } },
                  { key: "tool.input", value: { stringValue: "{\"path\": \"src/main.py\"}" } },
                ],
                status: { code: 2, message: "File not found" },
              },
            ],
          }],
        }],
      }, null, 2));
    } else {
      setFormat("codex");
      setJsonInput(JSON.stringify({
        manifest: {
          trace_id: "trace_xyz",
          rollout_id: "rollout_123",
          created_at: "2026-09-09T10:00:00Z",
          model: "gpt-4o",
        },
        state: {
          inference_calls: [
            { id: "inf_1", model: "gpt-4o", input_tokens: 1500, output_tokens: 500, duration_ms: 3000, timestamp: "2026-09-09T10:00:01Z" },
          ],
          tool_calls: [
            { id: "tool_1", name: "shell", arguments: { command: "npm test" }, success: false, duration_ms: 5000, timestamp: "2026-09-09T10:00:05Z" },
            { id: "tool_2", name: "read_file", arguments: { path: "package.json" }, success: true, duration_ms: 100, timestamp: "2026-09-09T10:00:10Z" },
          ],
        },
      }, null, 2));
    }
    setResult(null);
  };

  return (
    <div className="flex h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="flex min-h-0 flex-col border-b border-zinc-800/80 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-2.5">
            <h1 className="text-[13px] font-medium">Import JSON</h1>
            <div className="flex items-center gap-1">
              {FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormat(item.id)}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                    format === item.id
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <span className="mx-1 h-3 w-px bg-zinc-800" />
              <button
                type="button"
                onClick={() => loadExample("claude-code")}
                className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              >
                Claude example
              </button>
              <button
                type="button"
                onClick={() => loadExample("codex")}
                className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              >
                Codex example
              </button>
            </div>
          </div>
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder="Paste OTEL JSON or a Codex rollout bundle…"
            className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[12px] leading-relaxed text-zinc-300 placeholder:text-zinc-700 focus:outline-none"
          />
          <div className="border-t border-zinc-800/80 px-4 py-3">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing || !jsonInput.trim()}
              className="w-full rounded-md bg-[#e0783a] py-2 text-[13px] font-medium text-zinc-950 hover:bg-[#ec8a4e] disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {importing ? "Importing…" : "Import trace"}
            </button>
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto bg-[#111113]">
          {result?.error && (
            <div className="border-b border-red-900/40 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-red-400/80">Error</div>
              <p className="mt-1 text-[13px] text-red-300">{result.error}</p>
            </div>
          )}

          {result?.success && result.trace ? (
            <div className="space-y-5 px-4 py-4">
              <Field label="Imported">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-zinc-200">{result.trace.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{result.trace.traceId}</p>
                  </div>
                  <span className={`shrink-0 text-[12px] ${result.trace.status === "failed" ? "text-red-400" : "text-emerald-400/80"}`}>
                    {result.trace.status === "failed" ? "× Failed" : "✓ Completed"}
                  </span>
                </div>
              </Field>
              <Field label="Spans">
                <p className="text-[13px] text-zinc-300">{result.trace.spans.length}</p>
              </Field>
              <Link
                href={`/trace/${result.trace.traceId}`}
                className="inline-block rounded-md bg-zinc-800 px-3 py-1.5 text-[12px] text-zinc-200 hover:bg-zinc-700"
              >
                Open canvas
              </Link>
            </div>
          ) : (
            !result?.error && (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <div>
                  <p className="text-[13px] text-zinc-400">Paste a trace JSON payload.</p>
                  <p className="mt-1 text-[12px] text-zinc-600">
                    Local sessions are scanned from{" "}
                    <Link href="/agents" className="text-zinc-400 hover:text-zinc-200">
                      Agents
                    </Link>
                    . This page is the manual fallback.
                  </p>
                </div>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      {children}
    </div>
  );
}
