import { NextResponse } from "next/server";
import { discoverAgents } from "@/lib/agents/discover";
import { getRegistry } from "@/lib/local-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const discovered = discoverAgents();
    return NextResponse.json({
      success: true,
      ...discovered,
      registry: getRegistry(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Discover failed" },
      { status: 500 }
    );
  }
}
