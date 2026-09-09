import { NextResponse } from "next/server";
import { getRegistry } from "@/lib/local-store";
import { hasConnectors } from "@/lib/connectors/store";
import { syncRegisteredAgents } from "@/lib/agents/sync";
import { scheduleCompressMissing } from "@/lib/semantic-graph";

export const runtime = "nodejs";

export async function POST() {
  try {
    const registry = getRegistry();
    if (!registry?.agents.length && !hasConnectors()) {
      return NextResponse.json(
        { success: false, error: "No sources registered." },
        { status: 400 }
      );
    }

    const sync = await syncRegisteredAgents(registry?.agents);
    scheduleCompressMissing();
    return NextResponse.json({ success: true, sync, registry: getRegistry() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
