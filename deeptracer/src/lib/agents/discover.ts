import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AgentId, DiscoveredAgent } from "@/lib/agents/types";

export function claudeHome(): string {
  return join(homedir(), ".claude");
}

export function codexHome(): string {
  return join(homedir(), ".codex");
}

function listFiles(dir: string, ext: string, maxDepth = 4): string[] {
  const results: string[] = [];

  const walk = (current: string, depth: number) => {
    if (depth > maxDepth || !existsSync(current)) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(current, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full, depth + 1);
      } else if (name.endsWith(ext)) {
        results.push(full);
      }
    }
  };

  walk(dir, 0);
  return results;
}

function newestMtime(files: string[]): string | undefined {
  let latest = 0;
  for (const file of files) {
    try {
      latest = Math.max(latest, statSync(file).mtimeMs);
    } catch {
      // skip unreadable files
    }
  }
  return latest ? new Date(latest).toISOString() : undefined;
}

export function listClaudeSessionFiles(): string[] {
  const projectFiles = listFiles(join(claudeHome(), "projects"), ".jsonl", 3);
  const transcriptFiles = listFiles(join(claudeHome(), "transcripts"), ".jsonl", 2);
  return [...projectFiles, ...transcriptFiles];
}

export function listCodexSessionFiles(): string[] {
  const live = listFiles(join(codexHome(), "sessions"), ".jsonl", 5);
  const archived = listFiles(join(codexHome(), "archived_sessions"), ".jsonl", 2);
  return [...live, ...archived];
}

export function discoverAgents(): { localAccess: true; homeDir: string; agents: DiscoveredAgent[] } {
  const claudePath = claudeHome();
  const codexPath = codexHome();
  const claudeFiles = existsSync(claudePath) ? listClaudeSessionFiles() : [];
  const codexFiles = existsSync(codexPath) ? listCodexSessionFiles() : [];

  const agents: DiscoveredAgent[] = [
    {
      id: "claude-code",
      name: "Claude Code",
      installed: existsSync(claudePath) && (existsSync(join(claudePath, "settings.json")) || claudeFiles.length > 0),
      path: claudePath,
      sessionCount: claudeFiles.length,
      lastActivity: newestMtime(claudeFiles),
    },
    {
      id: "codex",
      name: "Codex",
      installed: existsSync(codexPath) && (existsSync(join(codexPath, "config.toml")) || codexFiles.length > 0),
      path: codexPath,
      sessionCount: codexFiles.length,
      lastActivity: newestMtime(codexFiles),
    },
  ];

  return {
    localAccess: true,
    homeDir: homedir(),
    agents,
  };
}

export function filesForAgent(id: AgentId): string[] {
  if (id === "claude-code") return listClaudeSessionFiles();
  return listCodexSessionFiles();
}
