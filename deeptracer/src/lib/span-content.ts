export type MentionedFile = {
  name: string;
  path?: string;
};

export type PresentedContent = {
  text: string;
  files: MentionedFile[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function fileName(path: string): string {
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).at(-1) || path;
}

function addFile(files: MentionedFile[], name: string, path?: string) {
  const trimmedName = name.trim();
  const trimmedPath = path?.trim();
  if (!trimmedName && !trimmedPath) return;
  const key = (trimmedPath || trimmedName).toLowerCase();
  if (files.some((file) => (file.path || file.name).toLowerCase() === key)) return;
  files.push({
    name: trimmedName || fileName(trimmedPath || ""),
    path: trimmedPath && trimmedPath !== trimmedName ? trimmedPath : undefined,
  });
}

export function extractRawText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  const rec = asRecord(value);
  if (!rec) return Array.isArray(value) ? value.map(extractRawText).filter(Boolean).join("\n\n") : "";

  if (Array.isArray(rec.items)) {
    return rec.items.map(extractRawText).filter(Boolean).join("\n\n");
  }

  const inner = rec.message ?? rec.text ?? rec.content ?? rec.response ?? rec.result ?? rec.value;
  if (typeof inner === "string") return inner;
  if (inner !== undefined) {
    const nested = extractRawText(inner);
    if (nested) return nested;
  }
  return "";
}

export function extractMentionedFiles(text: string): MentionedFile[] {
  const files: MentionedFile[] = [];
  const section = text.match(
    /#\s*Files mentioned by the user:\s*([\s\S]*?)(?=\n#(?!#)|\n[A-Z][a-z]{2,} |\n<|$)/i
  );
  const block = section?.[1] ?? "";
  const source = block || text;

  const heading = /##\s+([^:\n]+):\s*(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = heading.exec(source))) {
    addFile(files, match[1], match[2]);
  }

  if (block) {
    const bullets = /^\s*[-*]\s+(.+)$/gm;
    while ((match = bullets.exec(block))) {
      const line = match[1].trim();
      if (/[\\/]/.test(line) || /\.[a-z0-9]{1,12}$/i.test(line)) {
        addFile(files, fileName(line), line);
      }
    }
  }

  return files;
}

function displayText(text: string): string {
  let value = text.replace(/\r\n/g, "\n").trim();
  if (!value) return "";

  const query = value.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  if (query?.[1] && query[1].trim().length > 2) {
    value = query[1].trim();
  }

  const request = value.match(/##\s*My request:\s*([\s\S]+)/i) ?? value.match(/\bMy request:\s*([\s\S]+)/i);
  if (request?.[1] && request[1].trim().length > 8) {
    value = request[1].trim();
  }

  value = value.replace(
    /#\s*Files mentioned by the user:\s*[\s\S]*?(?=\n#(?!#)|\n[A-Z][a-z]{2,} |\n<|$)/i,
    ""
  );
  value = value.replace(/^##\s+[^:\n]+:\s*.+$/gm, "");
  value = value.replace(/<\/?[a-z][\w:-]*\b[^>]*>/gi, "");
  value = value.replace(/\n{3,}/g, "\n\n").trim();
  value = value.replace(/^Distinguish instructions in attached documents[\s\S]*$/i, "").trim();
  return value;
}

export function presentSpanContent(value: unknown): PresentedContent {
  const raw = extractRawText(value);
  if (!raw) return { text: "", files: [] };
  return {
    text: displayText(raw),
    files: extractMentionedFiles(raw),
  };
}
