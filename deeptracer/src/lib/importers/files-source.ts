import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, parse, resolve } from "node:path";
import { Trace } from "@/types/trace";
import { buildConversationTrace, clipText, shortHash, titleOf } from "@/lib/importers/conversation-trace";

const TEXT_EXT = new Set([
  ".md",
  ".txt",
  ".json",
  ".jsonl",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".csv",
  ".log",
  ".rst",
  ".xml",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "__pycache__",
]);

const MAX_FILE_BYTES = 200_000;
const MAX_FILES = 80;
const MAX_DEPTH = 4;

function assertScanDirectory(path: string): string {
  const resolved = resolve(path);
  const root = parse(resolved).root;
  if (!resolved || resolved === root) {
    throw new Error("Choose a folder on this machine, not a drive root.");
  }
  if (!existsSync(resolved)) {
    throw new Error("Folder not found.");
  }
  try {
    if (!statSync(resolved).isDirectory()) {
      throw new Error("Path is not a folder.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Path is not a folder.") throw error;
    throw new Error("Folder not found.");
  }
  return resolved;
}

function collectFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (current: string, depth: number) => {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      if (files.length >= MAX_FILES) return;
      if (name.startsWith(".") && name !== ".env" && name !== ".env.local") continue;
      if (SKIP_DIRS.has(name)) continue;
      const full = join(current, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!TEXT_EXT.has(extname(name).toLowerCase())) continue;
      if (stat.size === 0 || stat.size > MAX_FILE_BYTES) continue;
      files.push(full);
    }
  };
  walk(root, 0);
  return files;
}

export function importFilesDirectory(path: string): Trace[] {
  const root = assertScanDirectory(path);
  const files = collectFiles(root);
  const grouped = new Map<string, string[]>();
  for (const file of files) {
    const dir = file.slice(0, file.length - basename(file).length).replace(/[\\/]+$/, "") || root;
    const list = grouped.get(dir) ?? [];
    list.push(file);
    grouped.set(dir, list);
  }

  const traces: Trace[] = [];
  for (const [dir, group] of grouped) {
    const project = basename(dir) || "Files";
    const messages = group.map((file) => {
      const mtime = statSync(file).mtime.toISOString();
      let text = "";
      try {
        text = clipText(readFileSync(file, "utf8"), 6000);
      } catch {
        text = "";
      }
      return {
        at: mtime,
        author: basename(file),
        text: `${basename(file)}\n${text}`.trim(),
      };
    });
    const trace = buildConversationTrace({
      traceId: `fs_${shortHash(dir)}`,
      source: "files",
      project,
      name: titleOf(project, "Files"),
      agent: "Files",
      messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}
