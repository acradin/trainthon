import { NextRequest, NextResponse } from "next/server";
import { AgentId, AgentRegistry, RegisteredAgent } from "@/lib/agents/types";
import { discoverAgents } from "@/lib/agents/discover";
import { getRegistry, saveRegistry } from "@/lib/local-store";
import { syncRegisteredAgents } from "@/lib/agents/sync";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ success: true, registry: getRegistry() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const selected = Array.isArray(body.agentIds) ? (body.agentIds as AgentId[]) : undefined;
    const discovered = discoverAgents();
    const now = new Date().toISOString();
    const previous = getRegistry();

    const incoming: RegisteredAgent[] = discovered.agents
      .filter((agent) => agent.installed)
      .filter((agent) => !selected || selected.includes(agent.id))
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        enabled: true,
        path: agent.path,
        registeredAt: now,
      }));

    if (incoming.length === 0) {
      return NextResponse.json(
        { success: false, error: "No installed agents selected." },
        { status: 400 }
      );
    }

    let agents: RegisteredAgent[];
    if (previous?.agents.length) {
      const byId = new Map(previous.agents.map((agent) => [agent.id, agent]));
      for (const agent of incoming) {
        const existing = byId.get(agent.id);
        byId.set(agent.id, {
          ...agent,
          registeredAt: existing?.registeredAt ?? agent.registeredAt,
          enabled: true,
        });
      }
      agents = [...byId.values()];
    } else {
      agents = incoming;
    }

    const registry: AgentRegistry = {
      registeredAt: previous?.registeredAt ?? now,
      lastSyncedAt: previous?.lastSyncedAt,
      agents,
    };
    saveRegistry(registry);

    const sync = body.sync === false ? null : await syncRegisteredAgents(agents);

    return NextResponse.json({
      success: true,
      registry,
      sync,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Register failed" },
      { status: 500 }
    );
  }
}
