"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const collectorUrl = `${baseUrl}/api/collect`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="text-xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Auto Collection Setup</h1>
                <p className="text-slate-400 text-sm">Configure your agents to send traces automatically</p>
              </div>
            </div>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* Collector URL */}
        <div className="bg-gradient-to-r from-green-950/50 to-emerald-950/50 border border-green-900/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-green-400 mb-2">Your Collector Endpoint</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-950 px-4 py-3 rounded-lg font-mono text-sm break-all">
              {collectorUrl}
            </code>
            <button
              onClick={() => copyToClipboard(collectorUrl, "url")}
              className="px-4 py-3 bg-green-700 hover:bg-green-600 rounded-lg text-sm transition-colors shrink-0"
            >
              {copied === "url" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Claude Code CLI */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
              <span className="text-2xl">🟣</span>
              <div>
                <h3 className="font-semibold">Claude Code CLI</h3>
                <p className="text-sm text-slate-400">Add to your shell profile (~/.zshrc or ~/.bashrc)</p>
              </div>
            </div>
            <div className="relative">
              <pre className="p-4 bg-slate-950 font-mono text-sm overflow-x-auto text-green-400">
                {claudeCodeEnv}
              </pre>
              <button
                onClick={() => copyToClipboard(claudeCodeEnv, "claude-cli")}
                className="absolute top-2 right-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
              >
                {copied === "claude-cli" ? "✓" : "Copy"}
              </button>
            </div>
          </div>

          {/* Claude Desktop */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div>
                <h3 className="font-semibold">Claude Desktop</h3>
                <p className="text-sm text-slate-400">Add to ~/.claude/settings.json</p>
              </div>
            </div>
            <div className="relative">
              <pre className="p-4 bg-slate-950 font-mono text-sm overflow-x-auto text-purple-400">
                {claudeDesktopSettings}
              </pre>
              <button
                onClick={() => copyToClipboard(claudeDesktopSettings, "claude-desktop")}
                className="absolute top-2 right-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
              >
                {copied === "claude-desktop" ? "✓" : "Copy"}
              </button>
            </div>
          </div>

          {/* Codex CLI */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
              <span className="text-2xl">🟢</span>
              <div>
                <h3 className="font-semibold">Codex CLI</h3>
                <p className="text-sm text-slate-400">Add to ~/.codex/config.toml</p>
              </div>
            </div>
            <div className="relative">
              <pre className="p-4 bg-slate-950 font-mono text-sm overflow-x-auto text-emerald-400">
                {codexConfig}
              </pre>
              <button
                onClick={() => copyToClipboard(codexConfig, "codex")}
                className="absolute top-2 right-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
              >
                {copied === "codex" ? "✓" : "Copy"}
              </button>
            </div>
          </div>

          {/* Test Connection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Test Connection</h3>
            <p className="text-sm text-slate-400 mb-3">Run this command to verify the collector is working:</p>
            <div className="relative">
              <pre className="p-3 bg-slate-950 font-mono text-xs overflow-x-auto text-slate-300">
{`curl -X POST ${collectorUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"resourceSpans":[{"scopeSpans":[{"spans":[{"traceId":"test","spanId":"1","name":"test"}]}]}]}'`}
              </pre>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">How It Works</h3>
            <ol className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-3">
                <span className="text-green-400">1.</span>
                Configure your agent to send OTLP traces to DeepTracer
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">2.</span>
                Agent automatically sends traces as you work
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">3.</span>
                DeepTracer converts and stores traces in real-time
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">4.</span>
                View and analyze traces in Dashboard
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
