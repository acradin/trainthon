import { Trace } from "@/types/trace";
import {
  buildConversationTrace,
  clipText,
  shortHash,
  titleOf,
  type ConversationMessage,
} from "@/lib/importers/conversation-trace";
import { isoFrom, jsonFetch, originOf, requireToken } from "@/lib/importers/http";
import type { RemoteConnector } from "@/lib/connectors/types";
import type { TraceSource } from "@/lib/trace-source";

const MAX_REPOS = 8;
const MAX_ISSUES = 20;

type ForgeIssue = {
  number?: number;
  iid?: number;
  title?: string;
  body?: string | null;
  description?: string | null;
  updated_at?: string;
  created_at?: string;
  html_url?: string;
  web_url?: string;
  pull_request?: unknown;
  user?: { login?: string; username?: string };
  author?: { username?: string };
};

function forgeTrace(opts: {
  prefix: string;
  source: TraceSource;
  agent: string;
  fullName: string;
  project: string;
  description?: string;
  issues: ConversationMessage[];
}): Trace | null {
  const messages: ConversationMessage[] = [];
  if (opts.description?.trim()) {
    messages.push({
      at: opts.issues[0]?.at || new Date().toISOString(),
      author: opts.fullName,
      text: opts.description.trim(),
    });
  }
  messages.push(...opts.issues);
  if (messages.length === 0) {
    messages.push({
      at: new Date().toISOString(),
      author: opts.fullName,
      text: "No recent issues or merge requests.",
    });
  }
  return buildConversationTrace({
    traceId: `${opts.prefix}_${shortHash(opts.fullName)}`,
    source: opts.source,
    project: opts.project,
    name: titleOf(opts.fullName, opts.agent),
    agent: opts.agent,
    messages,
  });
}

function gitlabHeaders(token: string): HeadersInit {
  return { "PRIVATE-TOKEN": token };
}

export async function importGitLab(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "GitLab");
  const origin = originOf(connector.url, "https://gitlab.com");
  await jsonFetch(`${origin}/api/v4/user`, { headers: gitlabHeaders(token) });

  type Project = {
    id?: number;
    path_with_namespace?: string;
    name?: string;
    description?: string | null;
  };

  let projects: Project[] = [];
  const selected = connector.project?.trim();
  if (selected) {
    const encoded = encodeURIComponent(selected);
    projects = [await jsonFetch<Project>(`${origin}/api/v4/projects/${encoded}`, { headers: gitlabHeaders(token) })];
  } else {
    projects = await jsonFetch<Project[]>(
      `${origin}/api/v4/projects?membership=true&simple=true&order_by=last_activity_at&per_page=${MAX_REPOS}`,
      { headers: gitlabHeaders(token) }
    );
  }

  const traces: Trace[] = [];
  for (const project of projects.slice(0, MAX_REPOS)) {
    if (project.id == null) continue;
    const fullName = project.path_with_namespace || String(project.id);
    const issues = await jsonFetch<ForgeIssue[]>(
      `${origin}/api/v4/projects/${project.id}/issues?state=all&order_by=updated_at&per_page=${MAX_ISSUES}`,
      { headers: gitlabHeaders(token) }
    );
    const mrs = await jsonFetch<ForgeIssue[]>(
      `${origin}/api/v4/projects/${project.id}/merge_requests?state=all&order_by=updated_at&per_page=10`,
      { headers: gitlabHeaders(token) }
    );
    const messages: ConversationMessage[] = [];
    for (const issue of issues) {
      const number = issue.iid ?? issue.number;
      const body = clipText(issue.description || issue.body || "", 1200);
      messages.push({
        at: isoFrom(issue.updated_at || issue.created_at),
        author: issue.author?.username || fullName,
        text: `Issue #${number ?? ""} ${issue.title?.trim() || ""}${body ? `\n${body}` : ""}${
          issue.web_url ? `\n${issue.web_url}` : ""
        }`,
      });
    }
    for (const mr of mrs) {
      const number = mr.iid ?? mr.number;
      const body = clipText(mr.description || mr.body || "", 800);
      messages.push({
        at: isoFrom(mr.updated_at || mr.created_at),
        author: mr.author?.username || fullName,
        text: `MR !${number ?? ""} ${mr.title?.trim() || ""}${body ? `\n${body}` : ""}${
          mr.web_url ? `\n${mr.web_url}` : ""
        }`,
      });
    }
    const trace = forgeTrace({
      prefix: "gl",
      source: "gitlab",
      agent: "GitLab",
      fullName,
      project: project.name || fullName,
      description: project.description || undefined,
      issues: messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}

export async function importGitea(connector: RemoteConnector): Promise<Trace[]> {
  const token = requireToken(connector.token, "Gitea");
  const origin = originOf(connector.url);
  const headers = { Authorization: `token ${token}` };
  await jsonFetch(`${origin}/api/v1/user`, { headers });

  type Repo = { full_name?: string; name?: string; description?: string | null };
  let repos: Repo[] = [];
  const selected = connector.project?.trim();
  if (selected) {
    repos = [await jsonFetch<Repo>(`${origin}/api/v1/repos/${selected}`, { headers })];
  } else {
    repos = await jsonFetch<Repo[]>(`${origin}/api/v1/user/repos?sort=updated&limit=${MAX_REPOS}`, { headers });
  }

  const traces: Trace[] = [];
  for (const repo of repos.slice(0, MAX_REPOS)) {
    const fullName = repo.full_name;
    if (!fullName) continue;
    const issues = await jsonFetch<ForgeIssue[]>(
      `${origin}/api/v1/repos/${fullName}/issues?state=all&limit=${MAX_ISSUES}&type=all`,
      { headers }
    );
    const messages: ConversationMessage[] = issues.map((issue) => {
      const kind = issue.pull_request ? "PR" : "Issue";
      const number = issue.number ?? issue.iid;
      const body = clipText(issue.body || issue.description || "", 1200);
      return {
        at: isoFrom(issue.updated_at || issue.created_at),
        author: issue.user?.login || issue.user?.username || fullName,
        text: `${kind} #${number ?? ""} ${issue.title?.trim() || ""}${body ? `\n${body}` : ""}${
          issue.html_url || issue.web_url ? `\n${issue.html_url || issue.web_url}` : ""
        }`,
      };
    });
    const trace = forgeTrace({
      prefix: "gt",
      source: "gitea",
      agent: "Gitea",
      fullName,
      project: repo.name || fullName,
      description: repo.description || undefined,
      issues: messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}
