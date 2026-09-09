"use client";

import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Span } from "@/types/trace";
import { layoutSpans, styleEdges, type SpanFlowNode } from "@/lib/dag-layout";
import SpanNode from "@/components/dag/SpanNode";

import "@xyflow/react/dist/style.css";

interface ExecutionGraphProps {
  spans: Span[];
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string | null) => void;
}

const nodeTypes = { span: SpanNode };

function GraphCanvas({ spans, selectedSpanId, onSelectSpan }: ExecutionGraphProps) {
  const { fitView } = useReactFlow();
  const layout = useMemo(() => layoutSpans(spans), [spans]);

  const [nodes, setNodes, onNodesChange] = useNodesState<SpanFlowNode>(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layout.edges);

  useEffect(() => {
    setNodes(
      layout.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedSpanId,
      }))
    );
    setEdges(styleEdges(layout.edges, selectedSpanId));
  }, [layout, selectedSpanId, setEdges, setNodes]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fitView({ padding: 0.22, duration: 200 });
    });
    return () => cancelAnimationFrame(frame);
  }, [spans, Boolean(selectedSpanId), fitView]);

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      onSelectSpan(node.id);
    },
    [onSelectSpan]
  );

  const onNodeDoubleClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      onSelectSpan(node.id);
      fitView({ nodes: [{ id: node.id }], padding: 1.4, duration: 220 });
    },
    [fitView, onSelectSpan]
  );

  const onPaneClick = useCallback(() => {
    onSelectSpan(null);
  }, [onSelectSpan]);

  if (spans.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-zinc-500">
        No spans in this trace
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.22 }}
      minZoom={0.35}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      zoomOnScroll
      proOptions={{ hideAttribution: true }}
      className="dt-flow"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1}
        color="#27272a"
      />
      <Controls
        showInteractive={false}
        className="dt-flow-controls overflow-hidden rounded-md border border-zinc-800 bg-[#141416] shadow-none"
      />
      <MiniMap
        pannable
        zoomable
        maskColor="rgba(9,9,11,0.72)"
        className="dt-flow-minimap !bg-[#141416] !border-zinc-800"
        nodeColor={(node) => {
          const span = (node as SpanFlowNode).data?.span;
          if (span?.status === "error") return "#f87171";
          if (span?.status === "running") return "#38bdf8";
          return "#3f3f46";
        }}
      />
    </ReactFlow>
  );
}

export default function ExecutionGraph(props: ExecutionGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
