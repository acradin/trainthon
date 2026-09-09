import { Trace } from "@/types/trace";
import { buildConversationTrace, clipText, shortHash, titleOf, type ConversationMessage } from "@/lib/importers/conversation-trace";
import { asList, isoFrom, jsonFetch, originOf, requireToken } from "@/lib/importers/http";
import type { RemoteConnector } from "@/lib/connectors/types";
import type { TraceSource } from "@/lib/trace-source";

const MAX_ITEMS = 12;

function docsTrace(
  prefix: string,
  source: TraceSource,
  agent: string,
  key: string,
  title: string,
  messages: ConversationMessage[]
): Trace | null {
  const filled =
    messages.length > 0
      ? messages
      : [{ at: new Date().toISOString(), author: agent, text: "No recent documents." }];
  return buildConversationTrace({
    traceId: `${prefix}_${shortHash(key)}`,
    source,
    project: title,
    name: titleOf(title, agent),
    agent,
    messages: filled,
  });
}

export async function importOutline(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Outline");
  const origin = originOf(connector.url, "https://app.getoutline.com");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const listed = await jsonFetch<{ data?: Array<{ id?: string; title?: string; updatedAt?: string; text?: string }> }>(
    `${origin}/api/documents.list`,
    { method: "POST", headers, body: JSON.stringify({ limit: MAX_ITEMS }) }
  );
  const traces: Trace[] = [];
  for (const doc of (listed.data ?? []).slice(0, MAX_ITEMS)) {
    if (!doc.id) continue;
    let text = doc.text || "";
    try {
      const info = await jsonFetch<{ data?: { text?: string; title?: string; updatedAt?: string } }>(
        `${origin}/api/documents.info`,
        { method: "POST", headers, body: JSON.stringify({ id: doc.id }) }
      );
      text = info.data?.text || text;
    } catch {
      // list payload is enough
    }
    const title = doc.title || "Untitled";
    const trace = docsTrace("ol", "outline", "Outline", doc.id, title, [
      {
        at: isoFrom(doc.updatedAt),
        author: "Outline",
        text: clipText(`${title}\n${text}`.trim(), 4000),
      },
    ]);
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importDiscourse(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Discourse");
  const username = connector.user?.trim();
  if (!username) throw new Error("Discourse API username required.");
  const origin = originOf(connector.url);
  const headers = { "Api-Key": token, "Api-Username": username };
  const latest = await jsonFetch<{
    topic_list?: { topics?: Array<{ id?: number; title?: string; last_posted_at?: string; excerpt?: string }> };
  }>(`${origin}/latest.json`, { headers });
  const traces: Trace[] = [];
  for (const topic of (latest.topic_list?.topics ?? []).slice(0, MAX_ITEMS)) {
    if (topic.id == null) continue;
    const thread = await jsonFetch<{
      title?: string;
      post_stream?: { posts?: Array<{ username?: string; cooked?: string; raw?: string; created_at?: string }> };
    }>(`${origin}/t/${topic.id}.json`, { headers });
    const messages: ConversationMessage[] = (thread.post_stream?.posts ?? []).slice(0, 20).map((post) => ({
      at: isoFrom(post.created_at),
      author: post.username || username,
      text: clipText((post.raw || post.cooked || "").replace(/<[^>]+>/g, " "), 1500),
    }));
    const title = thread.title || topic.title || `Topic ${topic.id}`;
    const trace = docsTrace("dc", "discourse", "Discourse", String(topic.id), title, messages);
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importBookStack(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "BookStack");
  if (!token.includes(":")) throw new Error("BookStack token must look like tokenId:secret.");
  const origin = originOf(connector.url);
  const headers = { Authorization: `Token ${token}` };
  const listed = await jsonFetch<{ data?: Array<{ id?: number; name?: string; updated_at?: string }> }>(
    `${origin}/api/pages?count=${MAX_ITEMS}`,
    { headers }
  );
  const traces: Trace[] = [];
  for (const page of (listed.data ?? []).slice(0, MAX_ITEMS)) {
    if (page.id == null) continue;
    const full = await jsonFetch<{ name?: string; html?: string; markdown?: string; updated_at?: string }>(
      `${origin}/api/pages/${page.id}`,
      { headers }
    );
    const body = full.markdown || (full.html || "").replace(/<[^>]+>/g, " ");
    const title = full.name || page.name || `Page ${page.id}`;
    const trace = docsTrace("bs", "bookstack", "BookStack", String(page.id), title, [
      {
        at: isoFrom(full.updated_at || page.updated_at),
        author: "BookStack",
        text: clipText(`${title}\n${body}`.trim(), 4000),
      },
    ]);
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importPlane(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Plane");
  const workspace = connector.project?.trim();
  if (!workspace) throw new Error("Plane workspace slug required.");
  const origin = originOf(connector.url, "https://api.plane.so");
  const headers = { "X-API-Key": token };
  const projects = asList<{ id?: string; name?: string; identifier?: string }>(
    await jsonFetch(`${origin}/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/`, { headers })
  );
  const traces: Trace[] = [];
  for (const project of projects.slice(0, 8)) {
    if (!project.id) continue;
    const items = asList<{
      id?: string;
      name?: string;
      sequence_id?: number;
      description_html?: string;
      updated_at?: string;
      created_at?: string;
    }>(
      await jsonFetch(
        `${origin}/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${project.id}/work-items/?per_page=20`,
        { headers }
      )
    );
    const messages: ConversationMessage[] = items.map((item) => ({
      at: isoFrom(item.updated_at || item.created_at),
      author: project.name || workspace,
      text: clipText(
        `${item.sequence_id ? `#${item.sequence_id} ` : ""}${item.name || ""}\n${(item.description_html || "").replace(/<[^>]+>/g, " ")}`.trim(),
        1500
      ),
    }));
    const title = project.name || project.identifier || project.id;
    const trace = docsTrace("pl", "plane", "Plane", `${workspace}:${project.id}`, title, messages);
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importOpenProject(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "OpenProject");
  const origin = originOf(connector.url);
  const basic = Buffer.from(`apikey:${token}`).toString("base64");
  const headers = { Authorization: `Basic ${basic}` };
  const payload = await jsonFetch<{
    _embedded?: {
      elements?: Array<{
        id?: number;
        subject?: string;
        description?: { raw?: string };
        updatedAt?: string;
        _links?: { project?: { title?: string; href?: string } };
      }>;
    };
  }>(`${origin}/api/v3/work_packages?pageSize=25&sortBy=${encodeURIComponent('[["updatedAt","desc"]]')}`, { headers });

  const grouped = new Map<string, ConversationMessage[]>();
  for (const item of payload._embedded?.elements ?? []) {
    const project = item._links?.project?.title || "OpenProject";
    const list = grouped.get(project) ?? [];
    list.push({
      at: isoFrom(item.updatedAt),
      author: project,
      text: clipText(`#${item.id ?? ""} ${item.subject || ""}\n${item.description?.raw || ""}`.trim(), 1500),
    });
    grouped.set(project, list);
  }
  const traces: Trace[] = [];
  for (const [title, messages] of grouped) {
    const trace = docsTrace("op", "openproject", "OpenProject", title, title, messages);
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importTaiga(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Taiga");
  const origin = originOf(connector.url, "https://api.taiga.io");
  const headers = { Authorization: `Bearer ${token}` };
  type Project = { id?: number; name?: string; slug?: string };
  let projects = asList<Project>(await jsonFetch(`${origin}/api/v1/projects?member=me`, { headers }));
  const selected = connector.project?.trim();
  if (selected) {
    projects = projects.filter((item) => item.slug === selected || String(item.id) === selected);
    if (projects.length === 0) {
      projects = [await jsonFetch<Project>(`${origin}/api/v1/projects/by_slug?slug=${encodeURIComponent(selected)}`, { headers })];
    }
  }
  const traces: Trace[] = [];
  for (const project of projects.slice(0, 8)) {
    if (project.id == null) continue;
    const stories = asList<{
      ref?: number;
      subject?: string;
      description?: string;
      modified_date?: string;
      created_date?: string;
    }>(await jsonFetch(`${origin}/api/v1/userstories?project=${project.id}`, { headers }));
    const messages: ConversationMessage[] = stories.slice(0, 20).map((story) => ({
      at: isoFrom(story.modified_date || story.created_date),
      author: project.name || "Taiga",
      text: clipText(`#${story.ref ?? ""} ${story.subject || ""}\n${story.description || ""}`.trim(), 1500),
    }));
    const title = project.name || project.slug || String(project.id);
    const trace = docsTrace("tg", "taiga", "Taiga", String(project.id), title, messages);
    if (trace) traces.push(trace);
  }
  return traces;
}
