"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Span } from "@/types/trace";
import { SpanNodeData } from "@/lib/dag-layout";

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusMark(status: Span["status"]): { icon: string; className: string } {
  switch (status) {
    case "success":
      return { icon: "✓", className: "text-emerald-400/80" };
    case "error":
      return { icon: "×", className: "text-red-400" };
    case "warning":
      return { icon: "–", className: "text-amber-400/80" };
    case "running":
      return { icon: "●", className: "text-sky-400 animate-pulse" };
  }
}

function typeLabel(type: Span["type"]): string {
  switch (type) {
    case "llm":
      return "LLM";
    case "tool":
      return "Tool";
    case "agent":
      return "Agent";
    case "memory":
      return "Memory";
    case "retrieval":
      return "Retrieval";
    case "system":
      return "System";
  }
}

export default function SpanNode({ data, selected }: NodeProps<Node<SpanNodeData>>) {
  const { span } = data;
  const mark = statusMark(span.status);
  const failed = span.status === "error";

  return (
    <div className="group relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !border-0 !bg-zinc-500"
      />
      <div
        className={`w-[188px] rounded-md border bg-[#141416] px-2.5 py-2 shadow-none transition-[border-color,box-shadow] ${
          selected
            ? "border-[#e0783a] shadow-[0_0_0_1px_rgba(224,120,58,0.35)]"
            : failed
              ? "border-zinc-800 border-l-red-500/70"
              : "border-zinc-800"
        }`}
      >
        <div className="flex items-start gap-1.5">
          <span className={`mt-px text-[11px] leading-none ${mark.className}`}>{mark.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium leading-tight text-zinc-100">
              {span.name}
            </div>
            <div className="mt-0.5 text-[11px] leading-tight text-zinc-500">
              {typeLabel(span.type)}
            </div>
            <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] leading-none ${mark.className}`}>
              <span>{mark.icon}</span>
              <span className="text-zinc-400">{formatDuration(span.duration)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-44 -translate-x-1/2 rounded-md border border-zinc-800 bg-[#121214] px-2.5 py-2 text-[11px] text-zinc-300 shadow-xl group-hover:block">
        <div className="mb-1 font-medium text-zinc-100">{span.name}</div>
        <div className="flex justify-between text-zinc-500">
          <span>Status</span>
          <span className="text-zinc-300 capitalize">{span.status === "error" ? "Failed" : span.status}</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span>Duration</span>
          <span className="text-zinc-300">{formatDuration(span.duration)}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !border-0 !bg-zinc-500"
      />
    </div>
  );
}
