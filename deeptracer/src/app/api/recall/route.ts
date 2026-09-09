import { NextRequest, NextResponse } from "next/server";
import { recallFromArchive } from "@/lib/recall";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query : "";
    const result = await recallFromArchive(query);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Recall error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Recall failed",
      },
      { status: 500 }
    );
  }
}
