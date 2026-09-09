import { NextRequest, NextResponse } from "next/server";
import { importClaudeCodeTrace } from "@/lib/importers/claude-code";
import { importCodexTrace, parseCodexBundle } from "@/lib/importers/codex";
import { saveTrace } from "@/lib/traces";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, data } = body;

    if (!format || !data) {
      return NextResponse.json(
        { success: false, error: "Missing format or data" },
        { status: 400 }
      );
    }

    let trace = null;

    switch (format) {
      case "claude-code":
      case "otel":
        trace = importClaudeCodeTrace(data);
        break;

      case "codex":
      case "codex-bundle":
        if (typeof data === "object" && data.manifest) {
          trace = importCodexTrace(data);
        } else if (typeof data === "object") {
          const bundle = parseCodexBundle(
            JSON.stringify(data.manifest || data),
            data.trace,
            data.state ? JSON.stringify(data.state) : undefined
          );
          if (bundle) {
            trace = importCodexTrace(bundle);
          }
        }
        break;

      case "auto":
        if (data.resourceSpans) {
          trace = importClaudeCodeTrace(data);
        } else if (data.manifest || data.rollout_id || data.trace_id) {
          const bundle = data.manifest 
            ? data 
            : { manifest: data, events: data.events, state: data.state };
          trace = importCodexTrace(bundle);
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown format: ${format}` },
          { status: 400 }
        );
    }

    if (!trace) {
      return NextResponse.json(
        { success: false, error: "Failed to parse trace data" },
        { status: 400 }
      );
    }

    const saved = await saveTrace(trace);

    return NextResponse.json({
      success: true,
      trace,
      saved,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
