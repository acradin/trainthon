import { Trace, Span, SpanType, SpanStatus } from "@/types/trace";

interface CodexEvent {
  seq: number;
  ts: string;
  event_type: string;
  payload_ref?: string;
  span_id?: string;
  parent_span_id?: string;
  data?: Record<string, unknown>;
}

interface CodexManifest {
  trace_id: string;
  rollout_id: string;
  created_at: string;
  codex_version?: string;
  model?: string;
}

interface CodexState {
  conversation_items?: Array<{
    id: string;
    role: string;
    content?: string;
    timestamp?: string;
  }>;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments?: Record<string, unknown>;
    result?: unknown;
    success?: boolean;
    duration_ms?: number;
    timestamp?: string;
  }>;
  inference_calls?: Array<{
    id: string;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    duration_ms?: number;
    timestamp?: string;
  }>;
}

interface CodexBundle {
  manifest: CodexManifest;
  events?: CodexEvent[];
  state?: CodexState;
}

function mapEventToSpanType(eventType: string): SpanType {
  const lower = eventType.toLowerCase();
  if (lower.includes("inference") || lower.includes("llm") || lower.includes("model")) {
    return "llm";
  }
  if (lower.includes("tool") || lower.includes("execute") || lower.includes("shell")) {
    return "tool";
  }
  if (lower.includes("conversation") || lower.includes("message")) {
    return "agent";
  }
  if (lower.includes("memory") || lower.includes("context")) {
    return "memory";
  }
  if (lower.includes("search") || lower.includes("retrieve")) {
    return "retrieval";
  }
  return "system";
}

export function importCodexTrace(bundle: CodexBundle): Trace | null {
  try {
    const { manifest, events, state } = bundle;
    const spans: Span[] = [];
    const traceId = `codex_${manifest.rollout_id.slice(0, 8)}`;
    let spanCounter = 0;
    
    if (state?.inference_calls) {
      for (const call of state.inference_calls) {
        spans.push({
          id: call.id || `span_llm_${++spanCounter}`,
          traceId,
          parentId: null,
          name: `LLM Request${call.model ? ` (${call.model})` : ""}`,
          type: "llm",
          status: "success",
          startedAt: call.timestamp || manifest.created_at,
          duration: call.duration_ms,
          input: call.input_tokens ? { tokens: call.input_tokens } : undefined,
          output: call.output_tokens ? { tokens: call.output_tokens } : undefined,
        });
      }
    }
    
    if (state?.tool_calls) {
      for (const call of state.tool_calls) {
        const status: SpanStatus = call.success === false ? "error" : "success";
        spans.push({
          id: call.id || `span_tool_${++spanCounter}`,
          traceId,
          parentId: spans.length > 0 ? spans[0].id : null,
          name: call.name || "Tool Call",
          type: "tool",
          status,
          startedAt: call.timestamp || manifest.created_at,
          duration: call.duration_ms,
          input: call.arguments,
          output: call.result ? { result: call.result } : undefined,
          error: status === "error" ? "Tool execution failed" : undefined,
        });
      }
    }
    
    if (state?.conversation_items) {
      for (const item of state.conversation_items) {
        if (item.role === "user" || item.role === "assistant") {
          spans.push({
            id: item.id || `span_conv_${++spanCounter}`,
            traceId,
            parentId: null,
            name: item.role === "user" ? "User Message" : "Assistant Response",
            type: "agent",
            status: "success",
            startedAt: item.timestamp || manifest.created_at,
            input: item.role === "user" ? { message: item.content } : undefined,
            output: item.role === "assistant" ? { response: item.content } : undefined,
          });
        }
      }
    }
    
    if (events && events.length > 0) {
      const eventsByType = new Map<string, CodexEvent[]>();
      for (const event of events) {
        const existing = eventsByType.get(event.event_type) || [];
        existing.push(event);
        eventsByType.set(event.event_type, existing);
      }
      
      for (const [eventType, typeEvents] of eventsByType) {
        if (eventType === "session_start" || eventType === "session_end") continue;
        
        for (const event of typeEvents) {
          const existingSpan = spans.find((s) => s.id === event.span_id);
          if (existingSpan) continue;
          
          spans.push({
            id: event.span_id || `span_event_${++spanCounter}`,
            traceId,
            parentId: event.parent_span_id || null,
            name: eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            type: mapEventToSpanType(eventType),
            status: "success",
            startedAt: event.ts,
            input: event.data,
          });
        }
      }
    }
    
    if (spans.length === 0) {
      spans.push({
        id: `span_root_1`,
        traceId,
        parentId: null,
        name: "Codex Session",
        type: "agent",
        status: "success",
        startedAt: manifest.created_at,
      });
    }
    
    spans.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    
    const hasError = spans.some((s) => s.status === "error");
    const startTime = new Date(spans[0].startedAt).getTime();
    const lastSpan = spans[spans.length - 1];
    const endTime = lastSpan.finishedAt 
      ? new Date(lastSpan.finishedAt).getTime()
      : new Date(lastSpan.startedAt).getTime() + (lastSpan.duration || 0);
    
    return {
      traceId,
      name: `Codex Session${manifest.model ? ` (${manifest.model})` : ""}`,
      status: hasError ? "failed" : "success",
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date(endTime).toISOString(),
      duration: endTime - startTime,
      spans,
    };
  } catch (error) {
    console.error("Failed to import Codex trace:", error);
    return null;
  }
}

export function parseCodexBundle(manifestJson: string, traceJsonl?: string, stateJson?: string): CodexBundle | null {
  try {
    const manifest: CodexManifest = JSON.parse(manifestJson);
    
    let events: CodexEvent[] | undefined;
    if (traceJsonl) {
      events = traceJsonl
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    }
    
    let state: CodexState | undefined;
    if (stateJson) {
      state = JSON.parse(stateJson);
    }
    
    return { manifest, events, state };
  } catch (error) {
    console.error("Failed to parse Codex bundle:", error);
    return null;
  }
}
