import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { Trace } from "@/types/trace";
import {
  buildConversationTrace,
  shortHash,
  titleOf,
  type ConversationMessage,
} from "@/lib/importers/conversation-trace";

const MAX_FILES = 40;
const MAX_MESSAGES = 80;

function listTxtFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (current: string, depth: number) => {
    if (depth > 3 || files.length >= MAX_FILES) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      if (files.length >= MAX_FILES) return;
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
      if (extname(name).toLowerCase() === ".txt") files.push(full);
    }
  };
  walk(root, 0);
  return files;
}

function parseKakaoDate(year: number, month: number, day: number, meridem: string, hour: number, minute: number): string {
  let hours = hour;
  if (meridem.includes("오후") || meridem.toLowerCase() === "pm") {
    if (hours < 12) hours += 12;
  } else if ((meridem.includes("오전") || meridem.toLowerCase() === "am") && hours === 12) {
    hours = 0;
  }
  return new Date(year, month - 1, day, hours, minute).toISOString();
}

function parseExport(filePath: string): ConversationMessage[] {
  const text = readFileSync(filePath, "utf8");
  const mtime = statSync(filePath).mtime.toISOString();
  const messages: ConversationMessage[] = [];
  let year = new Date(mtime).getFullYear();
  let month = new Date(mtime).getMonth() + 1;
  let day = new Date(mtime).getDate();

  const push = (author: string, at: string, body: string) => {
    const cleaned = body.replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    messages.push({ author, at, text: cleaned });
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const header = line.match(
      /-+ \s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/
    );
    if (header) {
      year = Number(header[1]);
      month = Number(header[2]);
      day = Number(header[3]);
      continue;
    }

    const classic = line.match(
      /^\[(.+?)\]\s*\[(오전|오후|AM|PM|am|pm)\s*(\d{1,2}):(\d{2})\]\s*(.*)$/
    );
    if (classic) {
      push(
        classic[1],
        parseKakaoDate(year, month, day, classic[2], Number(classic[3]), Number(classic[4])),
        classic[5]
      );
      continue;
    }

    const comma = line.match(
      /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후|AM|PM|am|pm)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*(.*)$/
    );
    if (comma) {
      push(
        comma[7],
        parseKakaoDate(
          Number(comma[1]),
          Number(comma[2]),
          Number(comma[3]),
          comma[4],
          Number(comma[5]),
          Number(comma[6])
        ),
        comma[8]
      );
      continue;
    }
  }

  if (messages.length === 0 && text.trim()) {
    messages.push({ author: basename(filePath, ".txt"), at: mtime, text: text.slice(0, 4000) });
  }
  return messages.slice(0, MAX_MESSAGES);
}

export function importKakaoExports(path: string): Trace[] {
  const root = resolve(path);
  if (!existsSync(root)) throw new Error("KakaoTalk export folder not found.");
  const files = statSync(root).isDirectory()
    ? listTxtFiles(root)
    : extname(root).toLowerCase() === ".txt"
      ? [root]
      : [];
  if (files.length === 0) {
    throw new Error("No KakaoTalk .txt exports in that folder. Use 대화 내용 내보내기.");
  }

  const traces: Trace[] = [];
  for (const file of files) {
    const messages = parseExport(file);
    const room = basename(file, ".txt").replace(/^KakaoTalk_/, "").replace(/_/g, " ");
    const trace = buildConversationTrace({
      traceId: `kk_${shortHash(file)}`,
      source: "kakao",
      project: titleOf(room, "KakaoTalk"),
      name: titleOf(room, "KakaoTalk"),
      agent: "KakaoTalk",
      messages,
    });
    if (trace) traces.push(trace);
  }
  return traces;
}
