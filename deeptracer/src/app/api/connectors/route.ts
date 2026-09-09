import { NextRequest, NextResponse } from "next/server";
import type { ConnectorSourceId } from "@/lib/trace-source";
import { isConnectorSourceId, sourceLabel } from "@/lib/trace-source";
import {
  getConnectorRegistry,
  publicConnectors,
  removeConnector,
  upsertConnector,
} from "@/lib/connectors/store";
import type { ConnectorConfig, RemoteConnector } from "@/lib/connectors/types";
import { isRemoteConnectorId } from "@/lib/connectors/types";
import { CONNECTOR_SPEC_BY_ID } from "@/lib/connectors/catalog";
import { syncRegisteredAgents } from "@/lib/agents/sync";
import { parseRepo } from "@/lib/importers/github";
import { originOf } from "@/lib/importers/http";
import { scheduleCompressMissing } from "@/lib/semantic-graph";

export const runtime = "nodejs";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseRemote(id: RemoteConnector["id"], body: Record<string, unknown>, existing?: ConnectorConfig): RemoteConnector {
  const spec = CONNECTOR_SPEC_BY_ID[id];
  const prev = existing && existing.id === id ? (existing as RemoteConnector) : null;
  const urlDefault = spec.fields.find((field) => field.key === "url")?.defaultValue ?? "";
  const token = asString(body.token) || prev?.token || "";
  const url = asString(body.url) || prev?.url || urlDefault;
  const user = asString(body.user) || prev?.user || "";
  const project = asString(body.project) || prev?.project || "";
  const values: Record<string, string> = { token, url, user, project };
  for (const field of spec.fields) {
    if (field.optional) continue;
    if (!values[field.key]?.trim()) {
      throw new Error(`${sourceLabel(id)} ${field.key} required.`);
    }
  }
  if (url) originOf(url);
  return {
    id,
    enabled: true,
    token,
    ...(url ? { url } : {}),
    ...(user ? { user } : {}),
    ...(project ? { project } : {}),
    registeredAt: prev?.registeredAt ?? new Date().toISOString(),
  };
}

function parseConnector(body: Record<string, unknown>): ConnectorConfig {
  const id = asString(body.id);
  if (!isConnectorSourceId(id)) throw new Error("Unknown source.");
  const now = new Date().toISOString();
  const existing = getConnectorRegistry().connectors.find((item) => item.id === id);

  if (id === "slack") {
    const token = asString(body.token) || (existing?.id === "slack" ? existing.token : "");
    if (!token) throw new Error("Slack token required (xoxp- or xoxb-).");
    return { id, enabled: true, token, registeredAt: existing?.registeredAt ?? now };
  }
  if (id === "kakao") {
    const path = asString(body.path) || (existing?.id === "kakao" ? existing.path : "");
    if (!path) throw new Error("KakaoTalk export folder required.");
    return { id, enabled: true, path, registeredAt: existing?.registeredAt ?? now };
  }
  if (id === "files") {
    const path = asString(body.path) || (existing?.id === "files" ? existing.path : "");
    if (!path) throw new Error("Folder path required.");
    return { id, enabled: true, path, registeredAt: existing?.registeredAt ?? now };
  }
  if (id === "github") {
    const token = asString(body.token) || (existing?.id === "github" ? existing.token : "");
    if (!token) throw new Error("GitHub token required (ghp_ or github_pat_).");
    const repo = asString(body.repo) || (existing?.id === "github" ? existing.repo ?? "" : "");
    const parsedRepo = repo ? parseRepo(repo) : null;
    if (repo && !parsedRepo) throw new Error("Repo must look like owner/name.");
    return {
      id,
      enabled: true,
      token,
      ...(parsedRepo ? { repo: parsedRepo } : {}),
      registeredAt: existing?.registeredAt ?? now,
    };
  }
  if (id === "email") {
    const prev = existing?.id === "email" ? existing : null;
    const host = asString(body.host) || prev?.host || "";
    const user = asString(body.user) || prev?.user || "";
    const password = asString(body.password) || prev?.password || "";
    if (!host || !user || !password) throw new Error("IMAP host, user, and password required.");
    return {
      id: "email",
      enabled: true,
      host,
      port: asNumber(body.port, prev?.port ?? 993),
      secure: body.secure === false ? false : true,
      user,
      password,
      mailbox: asString(body.mailbox) || prev?.mailbox || "INBOX",
      registeredAt: prev?.registeredAt ?? now,
    };
  }
  if (isRemoteConnectorId(id)) {
    return parseRemote(id, body, existing);
  }
  throw new Error("Unknown source.");
}

export async function GET() {
  return NextResponse.json({
    success: true,
    connectors: publicConnectors(),
    lastSyncedAt: getConnectorRegistry().lastSyncedAt,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const connector = parseConnector(body);
    upsertConnector(connector);
    const sync = body.sync === false ? null : await syncRegisteredAgents();
    if (sync) scheduleCompressMissing();
    return NextResponse.json({
      success: true,
      connectors: publicConnectors(),
      sync,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not save source" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!isConnectorSourceId(id)) {
    return NextResponse.json({ success: false, error: "Unknown source." }, { status: 400 });
  }
  removeConnector(id as ConnectorSourceId);
  return NextResponse.json({ success: true, connectors: publicConnectors() });
}
