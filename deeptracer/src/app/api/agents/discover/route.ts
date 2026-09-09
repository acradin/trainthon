import { NextResponse } from "next/server";
import { discoverAgents } from "@/lib/agents/discover";
import { getRegistry } from "@/lib/local-store";
import { publicConnectors } from "@/lib/connectors/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const discovered = discoverAgents();
    return NextResponse.json({
      success: true,
      ...discovered,
      registry: getRegistry(),
      connectors: publicConnectors(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Discover failed" },
      { status: 500 }
    );
  }
}
