const MAX_ERROR = 240;

function pickMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const rec = data as Record<string, unknown>;
  for (const key of ["message", "error", "errorMessage", "detail", "msg"]) {
    const value = rec[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, MAX_ERROR);
    if (value && typeof value === "object" && "message" in value && typeof (value as { message?: unknown }).message === "string") {
      return String((value as { message: string }).message).slice(0, MAX_ERROR);
    }
  }
  return fallback;
}

export function originOf(url: string | undefined, fallback?: string): string {
  const raw = (url || fallback || "").trim();
  if (!raw) throw new Error("Server URL required.");
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProto);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("bad protocol");
    }
    if (!parsed.hostname) throw new Error("bad host");
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    throw new Error("Server URL must look like https://host");
  }
}

export function isoFrom(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

export function requireToken(token: string | undefined, label: string): string {
  const cleaned = token?.trim() ?? "";
  if (!cleaned) throw new Error(`${label} token is empty.`);
  return cleaned;
}

export async function jsonFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("User-Agent")) headers.set("User-Agent", "deeptracer");
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_ERROR) };
    }
  }
  if (!response.ok) {
    throw new Error(pickMessage(data, `HTTP ${response.status}`));
  }
  return data as T;
}

export function asList<T>(value: unknown, keys: string[] = ["results", "data", "items", "documents", "messages"]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(rec[key])) return rec[key] as T[];
    }
  }
  return [];
}
