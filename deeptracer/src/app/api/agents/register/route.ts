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

    const agents: RegisteredAgent[] = discovered.agents
      .filter((agent) => agent.installed)
      .filter((agent) => !selected || selected.includes(agent.id))
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        enabled: true,
        path: agent.path,
        registeredAt: now,
      }));

    if (agents.length === 0) {
      return NextResponse.json(
        { success: false, error: "No installed agents selected." },
        { status: 400 }
      );
    }

    const registry: AgentRegistry = {
      registeredAt: now,
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
