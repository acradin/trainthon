import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Trace, RootCauseAnalysis, GeneratedTest } from "@/types/trace";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const SYSTEM_PROMPT = `You are an expert test engineer specializing in AI agent systems.
Your task is to generate regression tests based on failure analysis.

Given a trace of an AI agent execution and its root cause analysis, generate a test that would catch this specific failure mode in the future.

Output JSON in this exact format:
{
  "name": "test name in snake_case",
  "description": "Brief description of what this test validates",
  "testType": "unit" | "integration" | "e2e",
  "framework": "vitest",
  "code": "Complete test code as a string",
  "assertions": ["List of key assertions in plain English"],
  "coverageTargets": [
    {"spanName": "Name of span being tested", "condition": "What condition is being validated"}
  ]
}

Guidelines:
1. Focus on the ROOT CAUSE, not symptoms
2. Test should be deterministic and reproducible
3. Use mocks for external services
4. Include setup, execution, and assertion phases
5. Add comments explaining the test logic
6. Use TypeScript with Vitest syntax`;

export async function POST(request: NextRequest) {
  try {
    const { trace, analysis } = (await request.json()) as {
      trace: Trace;
      analysis: RootCauseAnalysis;
    };

    if (!trace || !analysis) {
      return NextResponse.json(
        { success: false, error: "Missing trace or analysis" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const userPrompt = `Generate a regression test for this AI agent failure:

## Trace Information
- Name: ${trace.name}
- Status: ${trace.status}
- Duration: ${trace.duration}ms

## Spans (execution flow):
${trace.spans
  .map(
    (s) =>
      `- ${s.name} (${s.type}): ${s.status}${s.error ? ` - Error: ${s.error}` : ""}`
  )
  .join("\n")}

## Root Cause Analysis
- Root Cause: ${analysis.rootCause}
- Confidence: ${analysis.confidence}%
- First Error Span: ${analysis.firstErrorSpan.name}
- Error Message: ${analysis.firstErrorSpan.error || "N/A"}

## Propagation Path
${analysis.propagationPath.join(" → ")}

## Evidence
${analysis.evidence.map((e) => `- ${e.spanName}: ${e.reason}`).join("\n")}

## Recommendation
${analysis.recommendation}

Generate a comprehensive regression test that would catch this specific failure mode.`;

    const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    const generatedTest = JSON.parse(content) as GeneratedTest;

    return NextResponse.json({
      success: true,
      test: generatedTest,
    });
  } catch (error) {
    console.error("Test generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
