import { Trace } from "@/types/trace";
import { buildConversationTrace, clipText, shortHash, titleOf, type ConversationMessage } from "@/lib/importers/conversation-trace";
import { isoFrom, jsonFetch, originOf, requireToken } from "@/lib/importers/http";
import type { RemoteConnector } from "@/lib/connectors/types";

const MAX_ROOMS = 8;
const MAX_MESSAGES = 40;

function tracesFromGroups(
  source: "mattermost" | "rocketchat" | "zulip" | "matrix",
  prefix: string,
  agent: string,
  groups: Array<{ key: string; title: string; messages: ConversationMessage[] }>
): Trace[] {
  const traces: Trace[] = [];
  for (const group of groups.slice(0, MAX_ROOMS)) {
    const messages = group.messages.filter((item) => item.text.trim()).slice(-MAX_MESSAGES);
    if (messages.length === 0) continue;
    const trace = buildConversationTrace({
      traceId: `${prefix}_${shortHash(group.key)}`,
      source,
      project: group.title,
      name: titleOf(group.title, agent),
      agent,
      messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importMattermost(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Mattermost");
  const origin = originOf(connector.url);
  const headers = { Authorization: `Bearer ${token}` };
  await jsonFetch(`${origin}/api/v4/users/me`, { headers });

  type Channel = { id?: string; display_name?: string; name?: string; last_viewed_at?: number; last_post_at?: number };
  const channels = (await jsonFetch<Channel[]>(`${origin}/api/v4/users/me/channels`, { headers }))
    .filter((item) => item.id)
    .sort((a, b) => (b.last_post_at || 0) - (a.last_post_at || 0))
    .slice(0, MAX_ROOMS);

  const groups: Array<{ key: string; title: string; messages: ConversationMessage[] }> = [];
  for (const channel of channels) {
    const payload = await jsonFetch<{
      order?: string[];
      posts?: Record<string, { message?: string; user_id?: string; create_at?: number }>;
    }>(`${origin}/api/v4/channels/${channel.id}/posts?per_page=${MAX_MESSAGES}`, { headers });
    const order = [...(payload.order ?? [])].reverse();
    const messages: ConversationMessage[] = [];
    for (const id of order) {
      const post = payload.posts?.[id];
      if (!post) continue;
      const text = post.message?.trim();
      if (!text) continue;
      messages.push({
        at: isoFrom(post.create_at),
        author: post.user_id || "Mattermost",
        text: clipText(text, 1500),
      });
    }
    groups.push({
      key: channel.id || channel.name || "channel",
      title: channel.display_name || channel.name || "channel",
      messages,
    });
  }
  return tracesFromGroups("mattermost", "mm", "Mattermost", groups);
}

export async function importRocketChat(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Rocket.Chat");
  const userId = connector.user?.trim();
  if (!userId) throw new Error("Rocket.Chat user id required.");
  const origin = originOf(connector.url);
  const headers = { "X-Auth-Token": token, "X-User-Id": userId };
  await jsonFetch(`${origin}/api/v1/me`, { headers });

  type Room = { _id?: string; name?: string; fname?: string; t?: string };
  const listed = await jsonFetch<{ update?: Room[]; channels?: Room[] }>(`${origin}/api/v1/rooms.get`, { headers });
  const rooms = (listed.update ?? listed.channels ?? []).filter((item) => item._id).slice(0, MAX_ROOMS);

  const groups: Array<{ key: string; title: string; messages: ConversationMessage[] }> = [];
  for (const room of rooms) {
    const history = await jsonFetch<{ messages?: Array<{ msg?: string; ts?: string; u?: { username?: string } }> }>(
      `${origin}/api/v1/channels.history?roomId=${encodeURIComponent(room._id || "")}&count=${MAX_MESSAGES}`,
      { headers }
    ).catch(async () =>
      jsonFetch<{ messages?: Array<{ msg?: string; ts?: string; u?: { username?: string } }> }>(
        `${origin}/api/v1/groups.history?roomId=${encodeURIComponent(room._id || "")}&count=${MAX_MESSAGES}`,
        { headers }
      )
    );
    const messages = [...(history.messages ?? [])].reverse().map((item) => ({
      at: isoFrom(item.ts),
      author: item.u?.username || "Rocket.Chat",
      text: clipText(item.msg || "", 1500),
    }));
    groups.push({
      key: room._id || room.name || "room",
      title: room.fname || room.name || "room",
      messages,
    });
  }
  return tracesFromGroups("rocketchat", "rc", "Rocket.Chat", groups);
}

export async function importZulip(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Zulip");
  const email = connector.user?.trim();
  if (!email) throw new Error("Zulip email required.");
  const origin = originOf(connector.url);
  const basic = Buffer.from(`${email}:${token}`).toString("base64");
  const headers = { Authorization: `Basic ${basic}` };
  const me = await jsonFetch<{ result?: string; msg?: string }>(`${origin}/api/v1/users/me`, { headers });
  if (me.result === "error") throw new Error(me.msg || "Zulip auth failed");

  const payload = await jsonFetch<{
    result?: string;
    msg?: string;
    messages?: Array<{
      timestamp?: number;
      sender_full_name?: string;
      content?: string;
      display_recipient?: string | Array<{ name?: string }>;
      subject?: string;
    }>;
  }>(`${origin}/api/v1/messages?anchor=newest&num_before=${MAX_MESSAGES * 4}&num_after=0&apply_markdown=false`, { headers });
  if (payload.result === "error") throw new Error(payload.msg || "Zulip messages failed");

  const grouped = new Map<string, ConversationMessage[]>();
  for (const item of payload.messages ?? []) {
    const stream = Array.isArray(item.display_recipient)
      ? item.display_recipient.map((part) => part.name).filter(Boolean).join(", ")
      : item.display_recipient || "Zulip";
    const title = item.subject ? `${stream} · ${item.subject}` : stream;
    const list = grouped.get(title) ?? [];
    list.push({
      at: isoFrom(item.timestamp),
      author: item.sender_full_name || email,
      text: clipText(item.content || "", 1500),
    });
    grouped.set(title, list);
  }
  const groups = [...grouped.entries()].map(([title, messages]) => ({ key: title, title, messages }));
  return tracesFromGroups("zulip", "zu", "Zulip", groups);
}

export async function importMatrix(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Matrix");
  const origin = originOf(connector.url, "https://matrix.org");
  const headers = { Authorization: `Bearer ${token}` };
  const joined = await jsonFetch<{ joined_rooms?: string[] }>(`${origin}/_matrix/client/v3/joined_rooms`, { headers });
  const rooms = (joined.joined_rooms ?? []).slice(0, MAX_ROOMS);

  const groups: Array<{ key: string; title: string; messages: ConversationMessage[] }> = [];
  for (const roomId of rooms) {
    let title = roomId;
    try {
      const named = await jsonFetch<{ name?: string }>(
        `${origin}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
        { headers }
      );
      if (named.name?.trim()) title = named.name.trim();
    } catch {
      // unnamed rooms keep the id
    }
    const page = await jsonFetch<{
      chunk?: Array<{
        type?: string;
        sender?: string;
        origin_server_ts?: number;
        content?: { body?: string; msgtype?: string };
      }>;
    }>(`${origin}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?dir=b&limit=${MAX_MESSAGES}`, { headers });
    const messages = [...(page.chunk ?? [])]
      .reverse()
      .filter((event) => event.type === "m.room.message" && event.content?.body)
      .map((event) => ({
        at: isoFrom(event.origin_server_ts),
        author: event.sender || "Matrix",
        text: clipText(event.content?.body || "", 1500),
      }));
    groups.push({ key: roomId, title, messages });
  }
  return tracesFromGroups("matrix", "mx", "Matrix", groups);
}
