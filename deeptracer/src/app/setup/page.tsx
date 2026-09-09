"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default function SetupPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const collectorUrl = `${baseUrl}/api/collect`;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const claudeCodeEnv = `export CLAUDE_CODE_ENABLE_TELEMETRY=1
export CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=${baseUrl}/api/collect
export OTEL_LOG_USER_PROMPTS=1
export OTEL_LOG_TOOL_DETAILS=1
export OTEL_LOG_TOOL_CONTENT=1`;

  const claudeDesktopSettings = `{
  "telemetry": {
    "otlpEnabled": true,
    "otlpTracesEnabled": true,
    "otlpEndpoint": "${baseUrl}/api/collect",
    "otlpProtocol": "http/json",
    "otlpContentCapture": ["user_prompt", "tool_details", "tool_content"]
  }
}`;

  const codexConfig = `[otel]
enabled = true
exporter = "otlp-http"
endpoint = "${baseUrl}/api/collect"
log_user_prompt = true`;

  const curlTest = `curl -X POST ${collectorUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"resourceSpans":[{"scopeSpans":[{"spans":[{"traceId":"test","spanId":"1","name":"test"}]}]}]}'`;

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0c] text-zinc-100">
      <AppHeader />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-[15px] font-medium">Live collection</h1>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Optional OTLP endpoint. Prefer{" "}
            <Link href="/agents" className="text-zinc-400 hover:text-zinc-200">
              local agent scan
            </Link>{" "}
            unless you need traces streamed while an agent runs.
          </p>
        </div>

        <section className="mb-4 rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Collector</div>
          <div className="mt-2 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-zinc-300">{collectorUrl || "…"}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(collectorUrl, "url")}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            >
              {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <div className="space-y-3">
          <Snippet
            title="Claude Code CLI"
            hint="Add to ~/.zshrc or ~/.bashrc"
            value={claudeCodeEnv}
            copied={copied === "claude-cli"}
            onCopy={() => copyToClipboard(claudeCodeEnv, "claude-cli")}
          />
          <Snippet
            title="Claude Desktop"
            hint="~/.claude/settings.json"
            value={claudeDesktopSettings}
            copied={copied === "claude-desktop"}
            onCopy={() => copyToClipboard(claudeDesktopSettings, "claude-desktop")}
          />
          <Snippet
            title="Codex CLI"
            hint="~/.codex/config.toml"
            value={codexConfig}
            copied={copied === "codex"}
            onCopy={() => copyToClipboard(codexConfig, "codex")}
          />
          <Snippet
            title="Test"
            hint="POST a dummy span"
            value={curlTest}
            copied={copied === "curl"}
            onCopy={() => copyToClipboard(curlTest, "curl")}
          />
        </div>

        <ol className="mt-6 space-y-1.5 text-[12px] text-zinc-500">
          <li>1. Point the agent at this collector</li>
          <li>2. Work in the agent as usual</li>
          <li>3. Open Runs to inspect the incoming trace</li>
        </ol>
      </div>
    </div>
  );
}

function Snippet({
  title,
  hint,
  value,
  copied,
  onCopy,
}: {
  title: string;
  hint: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-zinc-800/80 bg-[#111113]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-2.5">
        <div>
          <h2 className="text-[13px] font-medium">{title}</h2>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-400">{value}</pre>
    </section>
  );
}
