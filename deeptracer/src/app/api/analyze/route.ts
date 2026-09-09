import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Trace, RootCauseAnalysis, AnalysisResponse } from "@/types/trace";

const DEFAULT_MODEL = "gpt-5";
const FALLBACK_MODEL = "gpt-4o";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

const SYSTEM_PROMPT = `You are an AI Agent debugging expert. Your job is to analyze execution traces from AI agents and identify the root cause of failures.

Given a trace with multiple spans (execution steps), you must:
1. Identify the FIRST span where something went wrong
2. Explain WHY that span caused the failure
3. Trace how the error propagated through subsequent spans
4. Provide a confidence score (0-100)
5. Give a specific recommendation to fix the issue

Respond in JSON format:
{
  "rootCause": "One sentence explaining the primary cause",
  "confidence": 85,
  "firstErrorSpan": {
    "id": "span_id",
    "name": "Span Name",
    "error": "Error message if any"
  },
  "propagationPath": ["span_1", "span_2", "span_3"],
  "evidence": [
    {
      "spanId": "span_id",
      "spanName": "Span Name",
      "reason": "Why this span is evidence of the root cause"
    }
  ],
  "recommendation": "Specific action to fix this issue"
}

Focus on:
- Temporal relationships (what happened first)
- Input/output relationships between spans
- Error propagation patterns
- Logical errors (wrong decisions even without explicit errors)`;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    const retryableCodes = [429, 500, 502, 503, 504];
    return retryableCodes.includes(error.status);
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnreset")
    );
  }
  return false;
}

async function callOpenAIWithRetry(
  openai: OpenAI,
  traceContext: string,
  model: string
): Promise<RootCauseAnalysis> {
  let lastError: Error | null = null;
  let currentModel = model;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: currentModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze this AI Agent execution trace and identify the root cause of the failure:\n\n${traceContext}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI model");
      }

      return JSON.parse(content) as RootCauseAnalysis;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1}/${MAX_RETRIES} failed:`, lastError.message);

      if (error instanceof OpenAI.APIError && error.status === 404 && currentModel === DEFAULT_MODEL) {
        console.warn(`Model ${DEFAULT_MODEL} not available, falling back to ${FALLBACK_MODEL}`);
        currentModel = FALLBACK_MODEL;
        continue;
      }

      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw lastError;
      }

      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse>> {
  try {
    const body = await request.json();
    const trace: Trace = body.trace;

    if (!trace || !trace.spans || trace.spans.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid trace data. Please provide a valid trace with spans.",
      }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const traceContext = formatTraceForAnalysis(trace);
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

    const analysis = await callOpenAIWithRetry(openai, traceContext, model);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    
    let errorMessage = "Unknown error occurred";
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (error.status >= 500) {
        errorMessage = "OpenAI service is temporarily unavailable. Please try again later.";
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

function formatTraceForAnalysis(trace: Trace): string {
  const lines: string[] = [
    `Trace ID: ${trace.traceId}`,
    `Name: ${trace.name}`,
    `Status: ${trace.status}`,
    `Duration: ${trace.duration}ms`,
    "",
    "=== EXECUTION TIMELINE ===",
    "",
  ];

  const sortedSpans = [...trace.spans].sort((a, b) => 
    new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  for (const span of sortedSpans) {
    lines.push(`[${span.id}] ${span.name}`);
    lines.push(`  Type: ${span.type}`);
    lines.push(`  Status: ${span.status}`);
    if (span.agent) lines.push(`  Agent: ${span.agent}`);
    if (span.duration) lines.push(`  Duration: ${span.duration}ms`);
    if (span.parentId) lines.push(`  Parent: ${span.parentId}`);
    
    if (span.input) {
      const inputStr = typeof span.input === "string" 
        ? span.input 
        : JSON.stringify(span.input, null, 2);
      lines.push(`  Input: ${truncate(inputStr, 500)}`);
    }
    
    if (span.output) {
      const outputStr = typeof span.output === "string" 
        ? span.output 
        : JSON.stringify(span.output, null, 2);
      lines.push(`  Output: ${truncate(outputStr, 500)}`);
    }
    
    if (span.error) {
      lines.push(`  ⚠️ ERROR: ${span.error}`);
    }
    
    lines.push("");
  }

  return lines.join("\n");
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "... [truncated]";
}
