import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AgentId, DiscoveredAgent } from "@/lib/agents/types";

export function claudeHome(): string {
  return join(homedir(), ".claude");
}

export function cursorHome(): string {
  return join(homedir(), ".cursor");
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

export function listCursorSessionFiles(): string[] {
  return listFiles(join(cursorHome(), "projects"), ".jsonl", 6).filter((filePath) => {
    const normalized = filePath.replace(/\\/g, "/").toLowerCase();
    return normalized.includes("/agent-transcripts/") && !normalized.includes("/subagents/");
  });
}

function localAppData(): string {
  return process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
}

function appData(): string {
  return process.env.APPDATA || join(homedir(), "AppData", "Roaming");
}

function hasNamedPackage(prefix: string): boolean {
  if (process.platform !== "win32") return false;
  const packages = join(localAppData(), "Packages");
  if (!existsSync(packages)) return false;
  try {
    return readdirSync(packages).some((name) => name.toLowerCase().startsWith(prefix.toLowerCase()));
  } catch {
    return false;
  }
}

function hasClaudeDesktop(): boolean {
  if (process.platform === "darwin") {
    return existsSync("/Applications/Claude.app") || existsSync("/Applications/Claude Code.app");
  }
  if (process.platform === "win32") {
    const local = localAppData();
    return (
      hasNamedPackage("Claude_") ||
      existsSync(join(local, "AnthropicClaude")) ||
      existsSync(join(local, "Programs", "Claude")) ||
      existsSync(join(local, "Programs", "Claude Code"))
    );
  }
  return existsSync("/usr/share/applications/claude.desktop");
}

function hasCursorDesktop(): boolean {
  if (process.platform === "darwin") {
    return existsSync("/Applications/Cursor.app");
  }
  if (process.platform === "win32") {
    const local = localAppData();
    const roaming = appData();
    return (
      existsSync(join(roaming, "Cursor")) ||
      existsSync(join(local, "Programs", "cursor")) ||
      existsSync(join(local, "Programs", "Cursor")) ||
      existsSync(join(local, "cursor")) ||
      existsSync("C:\\Program Files\\Cursor")
    );
  }
  return (
    existsSync("/usr/share/applications/cursor.desktop") ||
    existsSync(join(homedir(), ".local", "share", "applications", "cursor.desktop"))
  );
}

function hasCodexDesktop(): boolean {
  if (process.platform === "darwin") {
    return existsSync("/Applications/ChatGPT.app") || existsSync("/Applications/Codex.app");
  }
  if (process.platform === "win32") {
    const local = localAppData();
    return (
      existsSync(join(local, "Programs", "OpenAI", "Codex")) ||
      existsSync(join(local, "Programs", "OpenAI", "ChatGPT")) ||
      existsSync(join(local, "Programs", "ChatGPT")) ||
      existsSync(join(local, "ChatGPT")) ||
      hasNamedPackage("ChatGPT") ||
      hasNamedPackage("OpenAI")
    );
  }
  return existsSync("/usr/share/applications/chatgpt.desktop");
}

export function discoverAgents(): { localAccess: true; homeDir: string; agents: DiscoveredAgent[] } {
  const claudePath = claudeHome();
  const codexPath = codexHome();
  const cursorPath = cursorHome();
  const claudeFiles = existsSync(claudePath) ? listClaudeSessionFiles() : [];
  const codexFiles = existsSync(codexPath) ? listCodexSessionFiles() : [];
  const cursorFiles = existsSync(cursorPath) ? listCursorSessionFiles() : [];
  const agents: DiscoveredAgent[] = [];

  if (hasClaudeDesktop()) {
    agents.push({
      id: "claude-code",
      name: "Claude",
      installed: true,
      path: claudePath,
      sessionCount: claudeFiles.length,
      lastActivity: newestMtime(claudeFiles),
    });
  }

  if (hasCodexDesktop()) {
    agents.push({
      id: "codex",
      name: "GPT",
      installed: true,
      path: codexPath,
      sessionCount: codexFiles.length,
      lastActivity: newestMtime(codexFiles),
    });
  }

  if (hasCursorDesktop()) {
    agents.push({
      id: "cursor",
      name: "Cursor",
      installed: true,
      path: cursorPath,
      sessionCount: cursorFiles.length,
      lastActivity: newestMtime(cursorFiles),
    });
  }

  return {
    localAccess: true,
    homeDir: homedir(),
    agents,
  };
}

export function filesForAgent(id: AgentId): string[] {
  if (id === "claude-code") return listClaudeSessionFiles();
  if (id === "cursor") return listCursorSessionFiles();
  return listCodexSessionFiles();
}
