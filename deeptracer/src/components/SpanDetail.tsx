"use client";

import { Span } from "@/types/trace";

interface SpanDetailProps {
  span: Span | null;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusBadge(status: Span["status"]): { text: string; className: string } {
  switch (status) {
    case "success": return { text: "SUCCESS", className: "bg-green-900/50 text-green-400" };
    case "error": return { text: "ERROR", className: "bg-red-900/50 text-red-400" };
    case "warning": return { text: "WARNING", className: "bg-amber-900/50 text-amber-400" };
    case "running": return { text: "RUNNING", className: "bg-blue-900/50 text-blue-400" };
  }
}

function getTypeBadge(type: Span["type"]): { text: string; className: string } {
  switch (type) {
    case "llm": return { text: "LLM", className: "bg-purple-900/50 text-purple-400" };
    case "tool": return { text: "TOOL", className: "bg-blue-900/50 text-blue-400" };
    case "agent": return { text: "AGENT", className: "bg-orange-900/50 text-orange-400" };
    case "memory": return { text: "MEMORY", className: "bg-cyan-900/50 text-cyan-400" };
    case "retrieval": return { text: "RETRIEVAL", className: "bg-green-900/50 text-green-400" };
    case "system": return { text: "SYSTEM", className: "bg-slate-900/50 text-slate-400" };
  }
}

function JsonView({ data, label }: { data: unknown; label: string }) {
  if (data === null || data === undefined) {
    return <div className="text-slate-500 text-sm italic">No {label.toLowerCase()}</div>;
  }
  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm overflow-x-auto max-h-60 overflow-y-auto font-mono text-slate-300">
      {jsonString}
    </pre>
  );
}

export default function SpanDetail({ span }: SpanDetailProps) {
  if (!span) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-4xl mb-3">👆</div>
          <p>Select a span to view details</p>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(span.status);
  const typeBadge = getTypeBadge(span.type);

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 z-10">
        <h3 className="font-semibold text-lg mb-2">{span.name}</h3>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>{statusBadge.text}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeBadge.className}`}>{typeBadge.text}</span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {span.error && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2"><span>⚠️</span> Error</h4>
            <p className="text-red-300 text-sm font-mono">{span.error}</p>
          </div>
        )}

        <div>
          <h4 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wider">Metadata</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-500 text-xs mb-1">Span ID</div>
              <div className="font-mono text-slate-300 truncate" title={span.id}>{span.id}</div>
            </div>
            {span.agent && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Agent</div>
                <div className="text-slate-300">{span.agent}</div>
              </div>
            )}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="text-slate-500 text-xs mb-1">Duration</div>
              <div className="text-slate-300">{formatDuration(span.duration)}</div>
            </div>
            {span.parentId && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Parent ID</div>
                <div className="font-mono text-slate-300 truncate" title={span.parentId}>{span.parentId}</div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wider">Timing</h4>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Started</span>
              <span className="text-slate-300 font-mono">{formatDateTime(span.startedAt)}</span>
            </div>
            {span.finishedAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Finished</span>
                <span className="text-slate-300 font-mono">{formatDateTime(span.finishedAt)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wider">Input</h4>
          <JsonView data={span.input} label="Input" />
        </div>

        <div>
          <h4 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wider">Output</h4>
          <JsonView data={span.output} label="Output" />
        </div>
      </div>
    </div>
  );
}
