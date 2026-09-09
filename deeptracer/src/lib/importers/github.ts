import { Trace } from "@/types/trace";
import { buildConversationTrace, clipText, shortHash, titleOf, type ConversationMessage } from "@/lib/importers/conversation-trace";
import type { GitHubConnector } from "@/lib/connectors/types";

const MAX_REPOS = 8;
const MAX_ISSUES = 20;

type GitHubRepo = {
  full_name?: string;
  name?: string;
  description?: string;
  pushed_at?: string;
  updated_at?: string;
};

type GitHubIssue = {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  pull_request?: unknown;
  user?: { login?: string };
};

async function githubGet<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "deeptracer",
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || `GitHub ${path} failed (${response.status})`);
  }
  return data;
}

export function parseRepo(value: string): string | null {
  const cleaned = value
    .trim()
    .replace(/^(https?:\/\/)?github\.com\//i, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const match = cleaned.match(/^[\w.-]+\/[\w.-]+$/);
  return match ? match[0] : null;
}

export async function importGitHub(connector: GitHubConnector): Promise<Trace[]> {
  const token = connector.token.trim();
  if (!token) throw new Error("GitHub token is empty.");

  await githubGet<{ login?: string }>(token, "/user");

  let repos: GitHubRepo[] = [];
  const selected = connector.repo ? parseRepo(connector.repo) : null;
  if (connector.repo && !selected) {
    throw new Error("Repo must look like owner/name.");
  }
  if (selected) {
    repos = [await githubGet<GitHubRepo>(token, `/repos/${selected}`)];
  } else {
    repos = await githubGet<GitHubRepo[]>(
      token,
      `/user/repos?sort=pushed&affiliation=owner,collaborator&per_page=${MAX_REPOS}`
    );
  }

  const traces: Trace[] = [];
  for (const repo of repos.slice(0, MAX_REPOS)) {
    const fullName = repo.full_name;
    if (!fullName) continue;
    const issues = await githubGet<GitHubIssue[]>(
      token,
      `/repos/${fullName}/issues?state=all&sort=updated&per_page=${MAX_ISSUES}`
    );
    const messages: ConversationMessage[] = [];
    if (repo.description?.trim()) {
      messages.push({
        at: repo.pushed_at || repo.updated_at || new Date().toISOString(),
        author: fullName,
        text: repo.description.trim(),
      });
    }
    for (const issue of issues) {
      const kind = issue.pull_request ? "PR" : "Issue";
      const title = issue.title?.trim() || `${kind} #${issue.number ?? ""}`;
      const body = clipText(issue.body || "", 1200);
      messages.push({
        at: issue.updated_at || issue.created_at || new Date().toISOString(),
        author: issue.user?.login || fullName,
        text: `${kind} #${issue.number ?? ""} ${title}${body ? `\n${body}` : ""}${
          issue.html_url ? `\n${issue.html_url}` : ""
        }`,
      });
    }
    if (messages.length === 0) {
      messages.push({
        at: repo.pushed_at || repo.updated_at || new Date().toISOString(),
        author: fullName,
        text: "No recent issues or pull requests.",
      });
    }
    const trace = buildConversationTrace({
      traceId: `gh_${shortHash(fullName)}`,
      source: "github",
      project: repo.name || fullName,
      name: titleOf(fullName, "GitHub"),
      agent: "GitHub",
      messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}
