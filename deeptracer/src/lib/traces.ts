import { supabase } from "./supabase";
import { Trace, Span } from "@/types/trace";

interface DbTrace {
  trace_id: string;
  name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration: number | null;
  root_cause: string | null;
  root_cause_confidence: number | null;
}

interface DbSpan {
  span_id: string;
  trace_id: string;
  parent_id: string | null;
  name: string;
  type: string;
  agent: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration: number | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
}

export async function getTraces(): Promise<Trace[]> {
  const { data: tracesData, error: tracesError } = await supabase
    .from("traces")
    .select("*")
    .order("created_at", { ascending: false });

  if (tracesError) {
    console.error("Error fetching traces:", tracesError);
    return [];
  }

  const traces: Trace[] = [];

  for (const t of (tracesData as DbTrace[]) || []) {
    const { data: spansData } = await supabase
      .from("spans")
      .select("*")
      .eq("trace_id", t.trace_id)
      .order("started_at", { ascending: true });

    const spans: Span[] = ((spansData as DbSpan[]) || []).map((s) => ({
      id: s.span_id,
      traceId: s.trace_id,
      parentId: s.parent_id,
      name: s.name,
      type: s.type as Span["type"],
      agent: s.agent || undefined,
      status: s.status as Span["status"],
      startedAt: s.started_at,
      finishedAt: s.finished_at || undefined,
      duration: s.duration || undefined,
      input: s.input as Span["input"],
      output: s.output as Span["output"],
      error: s.error || undefined,
    }));

    traces.push({
      traceId: t.trace_id,
      name: t.name,
      status: t.status as Trace["status"],
      startedAt: t.started_at,
      finishedAt: t.finished_at || undefined,
      duration: t.duration || undefined,
      spans,
    });
  }

  return traces;
}

export async function getTraceById(traceId: string): Promise<Trace | null> {
  const { data: traceData, error: traceError } = await supabase
    .from("traces")
    .select("*")
    .eq("trace_id", traceId)
    .single();

  if (traceError || !traceData) {
    return null;
  }

  const t = traceData as DbTrace;

  const { data: spansData } = await supabase
    .from("spans")
    .select("*")
    .eq("trace_id", traceId)
    .order("started_at", { ascending: true });

  const spans: Span[] = ((spansData as DbSpan[]) || []).map((s) => ({
    id: s.span_id,
    traceId: s.trace_id,
    parentId: s.parent_id,
    name: s.name,
    type: s.type as Span["type"],
    agent: s.agent || undefined,
    status: s.status as Span["status"],
    startedAt: s.started_at,
    finishedAt: s.finished_at || undefined,
    duration: s.duration || undefined,
    input: s.input as Span["input"],
    output: s.output as Span["output"],
    error: s.error || undefined,
  }));

  return {
    traceId: t.trace_id,
    name: t.name,
    status: t.status as Trace["status"],
    startedAt: t.started_at,
    finishedAt: t.finished_at || undefined,
    duration: t.duration || undefined,
    spans,
  };
}

export async function saveTrace(trace: Trace): Promise<boolean> {
  const { error: traceError } = await supabase.from("traces").upsert({
    trace_id: trace.traceId,
    name: trace.name,
    status: trace.status,
    started_at: trace.startedAt,
    finished_at: trace.finishedAt || null,
    duration: trace.duration || null,
  });

  if (traceError) {
    console.error("Error saving trace:", traceError);
    return false;
  }

  for (const span of trace.spans) {
    const { error: spanError } = await supabase.from("spans").upsert({
      span_id: span.id,
      trace_id: span.traceId,
      parent_id: span.parentId || null,
      name: span.name,
      type: span.type,
      agent: span.agent || null,
      status: span.status,
      started_at: span.startedAt,
      finished_at: span.finishedAt || null,
      duration: span.duration || null,
      input: span.input || null,
      output: span.output || null,
      error: span.error || null,
    });

    if (spanError) {
      console.error("Error saving span:", spanError);
    }
  }

  return true;
}

export async function updateTraceRootCause(
  traceId: string,
  rootCause: string,
  confidence: number
): Promise<boolean> {
  const { error } = await supabase
    .from("traces")
    .update({
      root_cause: rootCause,
      root_cause_confidence: confidence,
    })
    .eq("trace_id", traceId);

  if (error) {
    console.error("Error updating root cause:", error);
    return false;
  }

  return true;
}
