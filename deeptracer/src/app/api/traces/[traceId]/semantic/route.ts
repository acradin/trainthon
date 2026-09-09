import { NextRequest, NextResponse } from "next/server";
import { buildAndStoreSemanticGraph } from "@/lib/semantic-graph";

export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ traceId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { traceId } = await params;
    const body = await request.json().catch(() => ({}));
    const rebuild = body?.rebuild === true;
    const result = await buildAndStoreSemanticGraph(traceId, rebuild);
    return NextResponse.json({
      success: true,
      trace: result.trace,
      mode: result.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build semantic graph";
    const status = message === "Trace not found" ? 404 : 500;
    console.error("Semantic graph error:", error);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
