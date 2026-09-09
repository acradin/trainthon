import { NextRequest, NextResponse } from "next/server";
import { importClaudeCodeTrace } from "@/lib/importers/claude-code";
import { importCodexTrace } from "@/lib/importers/codex";
import { saveTrace } from "@/lib/traces";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: unknown;

    if (contentType.includes("application/x-protobuf") || contentType.includes("application/protobuf")) {
      return NextResponse.json(
        { success: false, error: "Protobuf format not supported. Use HTTP JSON (http/json)" },
        { status: 415 }
      );
    }

    data = await request.json();

    let trace = null;
    let format = "unknown";

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      if (obj.resourceSpans || obj.resource_spans) {
        format = "otel";
        const otelData = obj.resourceSpans ? obj : { resourceSpans: obj.resource_spans };
        trace = importClaudeCodeTrace(otelData as unknown as Parameters<typeof importClaudeCodeTrace>[0]);
      }
      else if (obj.manifest || obj.rollout_id || obj.trace_id) {
        format = "codex";
        const bundle = obj.manifest 
          ? obj as unknown as Parameters<typeof importCodexTrace>[0]
          : { manifest: obj, events: obj.events, state: obj.state } as unknown as Parameters<typeof importCodexTrace>[0];
        trace = importCodexTrace(bundle);
      }
      else if (Array.isArray(obj.spans)) {
        format = "deeptracer";
        trace = obj as unknown as Parameters<typeof saveTrace>[0];
      }
    }

    if (!trace) {
      console.log("Unrecognized format. Received data keys:", data ? Object.keys(data as object) : "null");
      return NextResponse.json(
        { success: false, error: "Unrecognized trace format" },
        { status: 400 }
      );
    }

    const saved = await saveTrace(trace);

    console.log(`[Collector] Received ${format} trace: ${trace.traceId} (${trace.spans.length} spans) - saved: ${saved}`);

    return NextResponse.json({
      success: true,
      traceId: trace.traceId,
      format,
      spans: trace.spans.length,
      saved,
    });
  } catch (error) {
    console.error("Collector error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Collection failed" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Stream-Name",
    },
  });
}
