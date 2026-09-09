import { NextResponse } from "next/server";
import { MOCK_TRACES } from "@/data/mock-traces";
import { saveTrace } from "@/lib/traces";

export async function POST() {
  try {
    const results: { traceId: string; success: boolean }[] = [];

    for (const trace of Object.values(MOCK_TRACES)) {
      const success = await saveTrace(trace);
      results.push({ traceId: trace.traceId, success });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Seeded ${successCount} traces, ${failCount} failed`,
      results,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed data" },
      { status: 500 }
    );
  }
}
