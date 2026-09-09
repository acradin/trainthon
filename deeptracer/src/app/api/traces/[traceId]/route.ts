import { NextRequest, NextResponse } from "next/server";
import { getTraceById } from "@/lib/traces";

interface RouteParams {
  params: Promise<{ traceId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { traceId } = await params;
    const trace = await getTraceById(traceId);

    if (!trace) {
      return NextResponse.json(
        { success: false, error: "Trace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, trace });
  } catch (error) {
    console.error("Error fetching trace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trace" },
      { status: 500 }
    );
  }
}
