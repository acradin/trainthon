"use client";

import { useMemo } from "react";
import { Span } from "@/types/trace";

interface ExecutionGraphProps {
  spans: Span[];
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
}

interface TreeNode {
  span: Span;
  children: TreeNode[];
  depth: number;
}

function buildTree(spans: Span[]): TreeNode[] {
  const spanMap = new Map<string, Span>();
  const childrenMap = new Map<string, Span[]>();
  
  spans.forEach((span) => {
    spanMap.set(span.id, span);
    if (!childrenMap.has(span.parentId || "root")) {
      childrenMap.set(span.parentId || "root", []);
    }
    childrenMap.get(span.parentId || "root")!.push(span);
  });

  function buildNode(span: Span, depth: number): TreeNode {
    const children = childrenMap.get(span.id) || [];
    children.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    return {
      span,
      children: children.map((child) => buildNode(child, depth + 1)),
      depth,
    };
  }

  const rootSpans = childrenMap.get("root") || [];
  rootSpans.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return rootSpans.map((span) => buildNode(span, 0));
}

function getStatusIcon(status: Span["status"]): string {
  switch (status) {
    case "success": return "✓";
    case "error": return "✗";
    case "warning": return "⚠";
    case "running": return "◐";
  }
}

function getStatusColor(status: Span["status"]): string {
  switch (status) {
    case "success": return "text-green-400 border-green-700 bg-green-950/30";
    case "error": return "text-red-400 border-red-700 bg-red-950/30";
    case "warning": return "text-amber-400 border-amber-700 bg-amber-950/30";
    case "running": return "text-blue-400 border-blue-700 bg-blue-950/30";
  }
}

function getTypeColor(type: Span["type"]): string {
  switch (type) {
    case "llm": return "bg-purple-500/20 text-purple-400";
    case "tool": return "bg-blue-500/20 text-blue-400";
    case "agent": return "bg-orange-500/20 text-orange-400";
    case "memory": return "bg-cyan-500/20 text-cyan-400";
    case "retrieval": return "bg-green-500/20 text-green-400";
    case "system": return "bg-slate-500/20 text-slate-400";
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SpanNode({
  node,
  selectedSpanId,
  onSelectSpan,
  isLast,
}: {
  node: TreeNode;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
  isLast: boolean;
}) {
  const { span, children } = node;
  const isSelected = selectedSpanId === span.id;

  return (
    <div className="relative">
      {node.depth > 0 && (
        <div
          className="absolute left-[-20px] top-0 w-[20px] h-[24px] border-l-2 border-b-2 border-slate-700 rounded-bl-lg"
          style={{ borderColor: isLast ? "transparent" : undefined }}
        />
      )}
      
      <button
        onClick={() => onSelectSpan(span.id)}
        className={`w-full text-left p-3 rounded-lg border transition-all ${
          isSelected
            ? "border-orange-500 bg-orange-950/20 ring-2 ring-orange-500/30"
            : `${getStatusColor(span.status)} hover:border-slate-600`
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-lg ${getStatusColor(span.status).split(" ")[0]}`}>
              {getStatusIcon(span.status)}
            </span>
            <div className="min-w-0">
              <div className="font-medium truncate">{span.name}</div>
              {span.agent && (
                <div className="text-xs text-slate-500">{span.agent}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(span.type)}`}>
              {span.type.toUpperCase()}
            </span>
            {span.duration && (
              <span className="text-xs text-slate-500">{formatDuration(span.duration)}</span>
            )}
          </div>
        </div>
        {span.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-950/30 px-2 py-1 rounded truncate">
            {span.error}
          </div>
        )}
      </button>

      {children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 relative">
          <div className="absolute left-[-20px] top-0 bottom-0 w-0.5 bg-slate-700" />
          {children.map((child, idx) => (
            <SpanNode
              key={child.span.id}
              node={child}
              selectedSpanId={selectedSpanId}
              onSelectSpan={onSelectSpan}
              isLast={idx === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExecutionGraph({ spans, selectedSpanId, onSelectSpan }: ExecutionGraphProps) {
  const tree = useMemo(() => buildTree(spans), [spans]);

  if (spans.length === 0) {
    return <div className="text-center py-8 text-slate-500">No spans in this trace</div>;
  }

  return (
    <div className="space-y-2">
      {tree.map((node, idx) => (
        <SpanNode
          key={node.span.id}
          node={node}
          selectedSpanId={selectedSpanId}
          onSelectSpan={onSelectSpan}
          isLast={idx === tree.length - 1}
        />
      ))}
    </div>
  );
}
