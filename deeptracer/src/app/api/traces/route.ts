import { NextRequest, NextResponse } from "next/server";
import { getTraces, saveTrace } from "@/lib/traces";
import { Trace } from "@/types/trace";

export async function GET() {
  try {
    const traces = await getTraces();
    return NextResponse.json({ success: true, traces });
  } catch (error) {
    console.error("Error fetching traces:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch traces" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trace: Trace = body.trace;

    if (!trace || !trace.traceId) {
      return NextResponse.json(
        { success: false, error: "Invalid trace data" },
        { status: 400 }
      );
    }

    const success = await saveTrace(trace);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to save trace" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error saving trace:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save trace" },
      { status: 500 }
    );
  }
}
