import { Trace } from "@/types/trace";
import { buildConversationTrace, shortHash, titleOf } from "@/lib/importers/conversation-trace";
import type { SlackConnector } from "@/lib/connectors/types";

const MAX_CHANNELS = 12;
const MAX_MESSAGES = 40;

type SlackOk<T> = T & { ok: boolean; error?: string };

async function slackGet<T>(token: string, method: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as SlackOk<T>;
  if (!data.ok) {
    throw new Error(data.error || `Slack ${method} failed`);
  }
  return data;
}

export async function importSlackWorkspace(connector: SlackConnector): Promise<Trace[]> {
  const token = connector.token.trim();
  if (!token) throw new Error("Slack token is empty.");

  const users = await slackGet<{ members?: Array<{ id: string; name?: string; real_name?: string }> }>(
    token,
    "users.list",
    { limit: "200" }
  );
  const names = new Map<string, string>();
  for (const member of users.members ?? []) {
    names.set(member.id, member.real_name || member.name || member.id);
  }

  const channels = await slackGet<{
    channels?: Array<{ id: string; name?: string; is_im?: boolean }>;
  }>(token, "conversations.list", {
    types: "public_channel,private_channel",
    exclude_archived: "true",
    limit: String(MAX_CHANNELS),
  });

  const traces: Trace[] = [];
  for (const channel of (channels.channels ?? []).slice(0, MAX_CHANNELS)) {
    if (!channel.id) continue;
    const history = await slackGet<{
      messages?: Array<{ ts?: string; user?: string; bot_id?: string; text?: string }>;
    }>(token, "conversations.history", {
      channel: channel.id,
      limit: String(MAX_MESSAGES),
    });
    const messages = [...(history.messages ?? [])].reverse().map((item) => {
      const at = item.ts ? new Date(Number(item.ts) * 1000).toISOString() : new Date().toISOString();
      const author = (item.user && names.get(item.user)) || item.user || item.bot_id || "Slack";
      return { at, author, text: (item.text || "").trim() };
    });
    const label = channel.name ? `#${channel.name}` : channel.id;
    const trace = buildConversationTrace({
      traceId: `sl_${shortHash(channel.id)}`,
      source: "slack",
      project: label,
      name: titleOf(label, "Slack"),
      agent: "Slack",
      messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}
