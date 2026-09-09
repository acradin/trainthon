import { Trace, Span, SpanType, SpanStatus } from "@/types/trace";

interface OtelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  startTimeUnixNano: string;
  endTimeUnixNano?: string;
  attributes?: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }>;
  status?: { code?: number; message?: string };
  events?: Array<{ name: string; timeUnixNano: string; attributes?: Array<{ key: string; value: unknown }> }>;
}

interface OtelTrace {
  resourceSpans: Array<{
    resource?: { attributes?: Array<{ key: string; value: { stringValue?: string } }> };
    scopeSpans: Array<{
      scope?: { name?: string };
      spans: OtelSpan[];
    }>;
  }>;
}

function getAttributeValue(attrs: OtelSpan["attributes"], key: string): string | undefined {
  const attr = attrs?.find((a) => a.key === key);
  return attr?.value?.stringValue || attr?.value?.intValue?.toString();
}

function mapSpanType(name: string, attrs: OtelSpan["attributes"]): SpanType {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("llm") || lowerName.includes("model") || lowerName.includes("api_request")) {
    return "llm";
  }
  if (lowerName.includes("tool")) {
    return "tool";
  }
  if (lowerName.includes("interaction") || lowerName.includes("agent")) {
    return "agent";
  }
  if (lowerName.includes("memory") || lowerName.includes("cache")) {
    return "memory";
  }
  if (lowerName.includes("retrieval") || lowerName.includes("search")) {
    return "retrieval";
  }
  
  const spanKind = getAttributeValue(attrs, "span.kind");
  if (spanKind === "client" || spanKind === "producer") {
    return "tool";
  }
  
  return "system";
}

function mapSpanStatus(status?: OtelSpan["status"], attrs?: OtelSpan["attributes"]): SpanStatus {
  if (status?.code === 2 || status?.message) {
    return "error";
  }
  
  const errorAttr = getAttributeValue(attrs, "error");
  if (errorAttr === "true") {
    return "error";
  }
  
  const statusAttr = getAttributeValue(attrs, "status");
  if (statusAttr === "error" || statusAttr === "failed") {
    return "error";
  }
  if (statusAttr === "warning") {
    return "warning";
  }
  
  return "success";
}

function nanoToIso(nanoTimestamp: string): string {
  const ms = parseInt(nanoTimestamp) / 1_000_000;
  return new Date(ms).toISOString();
}

function nanoDuration(start: string, end?: string): number | undefined {
  if (!end) return undefined;
  return Math.round((parseInt(end) - parseInt(start)) / 1_000_000);
}

export function importClaudeCodeTrace(otelJson: OtelTrace): Trace | null {
  try {
    const allSpans: OtelSpan[] = [];
    let serviceName = "Claude Code";
    
    for (const resourceSpan of otelJson.resourceSpans || []) {
      const serviceAttr = resourceSpan.resource?.attributes?.find((a) => a.key === "service.name");
      if (serviceAttr?.value?.stringValue) {
        serviceName = serviceAttr.value.stringValue;
      }
      
      for (const scopeSpan of resourceSpan.scopeSpans || []) {
        allSpans.push(...scopeSpan.spans);
      }
    }
    
    if (allSpans.length === 0) return null;
    
    const rootSpan = allSpans.find((s) => !s.parentSpanId) || allSpans[0];
    const traceId = rootSpan.traceId;
    
    const spans: Span[] = allSpans.map((otelSpan) => {
      const attrs = otelSpan.attributes;
      const error = otelSpan.status?.message || getAttributeValue(attrs, "error.message");
      
      let input: Record<string, unknown> | undefined;
      let output: Record<string, unknown> | undefined;
      
      const promptText = getAttributeValue(attrs, "user.prompt") || getAttributeValue(attrs, "llm.input");
      if (promptText) {
        input = { prompt: promptText };
      }
      
      const responseText = getAttributeValue(attrs, "llm.output") || getAttributeValue(attrs, "response");
      if (responseText) {
        output = { response: responseText };
      }
      
      const toolInput = getAttributeValue(attrs, "tool.input") || getAttributeValue(attrs, "tool.arguments");
      if (toolInput) {
        try {
          input = JSON.parse(toolInput);
        } catch {
          input = { arguments: toolInput };
        }
      }
      
      const toolOutput = getAttributeValue(attrs, "tool.output") || getAttributeValue(attrs, "tool.result");
      if (toolOutput) {
        try {
          output = JSON.parse(toolOutput);
        } catch {
          output = { result: toolOutput };
        }
      }
      
      return {
        id: otelSpan.spanId,
        traceId: traceId,
        parentId: otelSpan.parentSpanId || null,
        name: otelSpan.name.replace("claude_code.", "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        type: mapSpanType(otelSpan.name, attrs),
        agent: getAttributeValue(attrs, "agent.name") || getAttributeValue(attrs, "claude_code.agent"),
        status: mapSpanStatus(otelSpan.status, attrs),
        startedAt: nanoToIso(otelSpan.startTimeUnixNano),
        finishedAt: otelSpan.endTimeUnixNano ? nanoToIso(otelSpan.endTimeUnixNano) : undefined,
        duration: nanoDuration(otelSpan.startTimeUnixNano, otelSpan.endTimeUnixNano),
        input,
        output,
        error,
      };
    });
    
    const hasError = spans.some((s) => s.status === "error");
    const startTime = Math.min(...spans.map((s) => new Date(s.startedAt).getTime()));
    const endTime = Math.max(...spans.filter((s) => s.finishedAt).map((s) => new Date(s.finishedAt!).getTime()));
    
    return {
      traceId: `cc_${traceId.slice(0, 8)}`,
      name: `${serviceName} Session`,
      status: hasError ? "failed" : "success",
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date(endTime).toISOString(),
      duration: endTime - startTime,
      spans,
    };
  } catch (error) {
    console.error("Failed to import Claude Code trace:", error);
    return null;
  }
}
