"use client";

import { useState } from "react";
import { Trace, RootCauseAnalysis, GeneratedTest } from "@/types/trace";

interface TestGeneratorProps {
  trace: Trace;
  analysis: RootCauseAnalysis | null;
  onAnalyze: () => Promise<RootCauseAnalysis | null>;
}

export default function TestGenerator({
  trace,
  analysis,
  onAnalyze,
}: TestGeneratorProps) {
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateTest = async () => {
    setLoading(true);
    setError(null);

    try {
      let currentAnalysis = analysis;

      if (!currentAnalysis) {
        currentAnalysis = await onAnalyze();
        if (!currentAnalysis) {
          setError("Failed to analyze trace. Please try again.");
          setLoading(false);
          return;
        }
      }

      const response = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trace, analysis: currentAnalysis }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to generate test");
        return;
      }

      setGeneratedTest(data.test);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedTest) return;

    await navigator.clipboard.writeText(generatedTest.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTest = () => {
    if (!generatedTest) return;

    const blob = new Blob([generatedTest.code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedTest.name}.test.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Regression Test Generator
        </h3>
        {!generatedTest && (
          <button
            onClick={generateTest}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Test
              </>
            )}
          </button>
        )}
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {!generatedTest && !loading && (
          <div className="text-center py-8 text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mb-2">No test generated yet</p>
            <p className="text-sm text-gray-500">
              Click &quot;Generate Test&quot; to create a regression test based on the
              failure analysis
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-gray-400">
            <svg
              className="animate-spin h-8 w-8 mx-auto mb-3 text-purple-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p>Analyzing failure and generating test...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
          </div>
        )}

        {generatedTest && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-white font-medium">{generatedTest.name}</h4>
                <p className="text-gray-400 text-sm mt-1">
                  {generatedTest.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    generatedTest.testType === "unit"
                      ? "bg-blue-500/20 text-blue-400"
                      : generatedTest.testType === "integration"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-purple-500/20 text-purple-400"
                  }`}
                >
                  {generatedTest.testType}
                </span>
                <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                  {generatedTest.framework}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">
                Key Assertions
              </h5>
              <ul className="space-y-1">
                {generatedTest.assertions.map((assertion, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-green-400 mt-0.5">✓</span>
                    {assertion}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">
                Coverage Targets
              </h5>
              <div className="flex flex-wrap gap-2">
                {generatedTest.coverageTargets.map((target, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs bg-gray-800 rounded text-gray-300"
                    title={target.condition}
                  >
                    {target.spanName}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                  Test Code
                </h5>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg
                          className="w-4 h-4 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadTest}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
              <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-300">{generatedTest.code}</code>
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={generateTest}
                disabled={loading}
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
