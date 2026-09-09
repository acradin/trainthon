"use client";

import { useState } from "react";
import Link from "next/link";
import { Trace } from "@/types/trace";

type ImportFormat = "auto" | "claude-code" | "codex";

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

      const result = await response.json();
      setResult(result);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setResult({ success: false, error: "Invalid JSON format" });
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
                attributes: [{ key: "user.prompt", value: { stringValue: "Help me debug this code" } }]
              },
              {
                traceId: "abc123",
                spanId: "span2",
                parentSpanId: "span1",
                name: "claude_code.llm_request",
                startTimeUnixNano: "1725840001000000000",
                endTimeUnixNano: "1725840010000000000",
                attributes: [{ key: "model", value: { stringValue: "claude-3-opus" } }]
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
                  { key: "tool.input", value: { stringValue: "{\"path\": \"src/main.py\"}" } }
                ],
                status: { code: 2, message: "File not found" }
              }
            ]
          }]
        }]
      }, null, 2));
    } else {
      setFormat("codex");
      setJsonInput(JSON.stringify({
        manifest: {
          trace_id: "trace_xyz",
          rollout_id: "rollout_123",
          created_at: "2026-09-09T10:00:00Z",
          model: "gpt-4o"
        },
        state: {
          inference_calls: [
            { id: "inf_1", model: "gpt-4o", input_tokens: 1500, output_tokens: 500, duration_ms: 3000, timestamp: "2026-09-09T10:00:01Z" }
          ],
          tool_calls: [
            { id: "tool_1", name: "shell", arguments: { command: "npm test" }, success: false, duration_ms: 5000, timestamp: "2026-09-09T10:00:05Z" },
            { id: "tool_2", name: "read_file", arguments: { path: "package.json" }, success: true, duration_ms: 100, timestamp: "2026-09-09T10:00:10Z" }
          ]
        }
      }, null, 2));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-xl">📥</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Import Trace</h1>
                <p className="text-slate-400 text-sm">Import from Claude Code or Codex</p>
              </div>
            </div>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
              ← Dashboard
            </Link>
          </div>
        </header>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Source Format</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFormat("auto")}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${format === "auto" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >
                Auto Detect
              </button>
              <button
                onClick={() => setFormat("claude-code")}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${format === "claude-code" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >
                Claude Code (OTEL)
              </button>
              <button
                onClick={() => setFormat("codex")}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${format === "codex" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >
                Codex CLI
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="flex gap-2">
            <button onClick={() => loadExample("claude-code")} className="px-3 py-1.5 bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 rounded-lg text-sm transition-colors">
              Load Claude Code Example
            </button>
            <button onClick={() => loadExample("codex")} className="px-3 py-1.5 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg text-sm transition-colors">
              Load Codex Example
            </button>
          </div>

          {/* JSON Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="font-semibold">Trace JSON</h2>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`Paste your ${format === "claude-code" ? "OpenTelemetry" : format === "codex" ? "Codex rollout bundle" : "trace"} JSON here...`}
              className="w-full h-80 p-4 bg-transparent font-mono text-sm resize-none focus:outline-none placeholder-slate-600"
            />
            <div className="px-4 py-3 border-t border-slate-800">
              <button
                onClick={handleImport}
                disabled={importing || !jsonInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {importing ? "Importing..." : "📥 Import Trace"}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 ${result.success ? "bg-green-950/50 border border-green-900/50" : "bg-red-950/50 border border-red-900/50"}`}>
              {result.success ? (
                <div>
                  <h3 className="font-semibold text-green-400 mb-2">✓ Import Successful</h3>
                  <div className="bg-slate-950 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Trace ID:</span> <span className="font-mono">{result.trace?.traceId}</span></div>
                      <div><span className="text-slate-500">Name:</span> {result.trace?.name}</div>
                      <div><span className="text-slate-500">Status:</span> <span className={result.trace?.status === "failed" ? "text-red-400" : "text-green-400"}>{result.trace?.status}</span></div>
                      <div><span className="text-slate-500">Spans:</span> {result.trace?.spans.length}</div>
                    </div>
                  </div>
                  <Link href={`/trace/${result.trace?.traceId}`} className="inline-block px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm transition-colors">
                    View Trace →
                  </Link>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-red-400 mb-2">✗ Import Failed</h3>
                  <p className="text-red-300 text-sm">{result.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">How to Export Traces</h3>
            <div className="space-y-4 text-sm text-slate-400">
              <div>
                <h4 className="text-purple-400 font-medium mb-1">Claude Code Desktop</h4>
                <p>Set environment variables:</p>
                <pre className="bg-slate-950 rounded p-2 mt-1 font-mono text-xs overflow-x-auto">
{`CLAUDE_CODE_ENABLE_TELEMETRY=1
CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
OTEL_TRACES_EXPORTER=console
OTEL_LOG_TOOL_CONTENT=1`}
                </pre>
              </div>
              <div>
                <h4 className="text-green-400 font-medium mb-1">Codex CLI</h4>
                <p>Set environment variable and run reduce command:</p>
                <pre className="bg-slate-950 rounded p-2 mt-1 font-mono text-xs overflow-x-auto">
{`CODEX_ROLLOUT_TRACE_ROOT=~/.codex/traces
codex debug trace-reduce <trace-bundle>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
