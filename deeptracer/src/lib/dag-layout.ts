import { Graph, layout } from "@dagrejs/dagre";
import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { Span } from "@/types/trace";
import { isUserTurn } from "@/lib/semantic-spans";

export const SPAN_NODE_WIDTH = 188;
export const SPAN_NODE_HEIGHT = 70;

export type SpanNodeData = {
  span: Span;
  isStart?: boolean;
};

export type SpanFlowNode = Node<SpanNodeData, "span">;

const ACCENT = "#e0783a";
const EDGE = "#3f3f46";

function conversationOrder(spans: Span[]): Span[] {
  return spans
    .map((span, index) => ({ span, index }))
    .sort((a, b) => {
      const delta = new Date(a.span.startedAt).getTime() - new Date(b.span.startedAt).getTime();
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((item) => item.span);
}

export function layoutSpans(spans: Span[]): {
  nodes: SpanFlowNode[];
  edges: Edge[];
} {
  const graph = new Graph({ directed: true });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    nodesep: 48,
    ranksep: 72,
    edgesep: 24,
    marginx: 24,
    marginy: 24,
  });

  const ids = new Set(spans.map((span) => span.id));

  spans.forEach((span) => {
    graph.setNode(span.id, { width: SPAN_NODE_WIDTH, height: SPAN_NODE_HEIGHT });
  });

  const edgePairs: Array<{ source: string; target: string }> = [];
  spans.forEach((span) => {
    if (span.parentId && ids.has(span.parentId)) {
      graph.setEdge(span.parentId, span.id);
      edgePairs.push({ source: span.parentId, target: span.id });
    }
  });

  const ordered = conversationOrder(spans);
  const userIndexes = ordered
    .map((span, index) => (isUserTurn(span) ? index : -1))
    .filter((index) => index >= 0);

  for (let turn = 0; turn < userIndexes.length - 1; turn += 1) {
    const nextUser = ordered[userIndexes[turn + 1]];
    const turnSpans = ordered.slice(userIndexes[turn], userIndexes[turn + 1]);
    for (const span of turnSpans) {
      if (span.id === nextUser.id || nextUser.parentId === span.id) continue;
      if (!graph.hasEdge(span.id, nextUser.id)) {
        graph.setEdge(span.id, nextUser.id);
      }
    }
  }

  layout(graph);

  const roots = spans.filter((span) => !span.parentId || !ids.has(span.parentId));
  const startId =
    roots.find((span) => isUserTurn(span))?.id ??
    roots[0]?.id ??
    spans[0]?.id;

  const nodes: SpanFlowNode[] = spans.map((span) => {
    const positioned = graph.node(span.id);
    return {
      id: span.id,
      type: "span",
      position: {
        x: (positioned?.x ?? 0) - SPAN_NODE_WIDTH / 2,
        y: (positioned?.y ?? 0) - SPAN_NODE_HEIGHT / 2,
      },
      data: { span, isStart: span.id === startId },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edges: Edge[] = edgePairs.map(({ source, target }) => ({
    id: `${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: EDGE,
    },
    style: {
      stroke: EDGE,
      strokeWidth: 1.25,
    },
  }));

  return { nodes, edges };
}

export function styleEdges(edges: Edge[], selectedSpanId: string | null): Edge[] {
  return edges.map((edge) => {
    const connected =
      selectedSpanId !== null &&
      (edge.source === selectedSpanId || edge.target === selectedSpanId);
    const color = connected ? ACCENT : EDGE;

    return {
      ...edge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color,
      },
      style: {
        stroke: color,
        strokeWidth: connected ? 1.8 : 1.25,
      },
    };
  });
}
