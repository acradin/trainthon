export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      traces: {
        Row: {
          id: string;
          trace_id: string;
          name: string;
          status: "success" | "failed" | "running";
          started_at: string;
          finished_at: string | null;
          duration: number | null;
          root_cause: string | null;
          root_cause_confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trace_id: string;
          name: string;
          status: "success" | "failed" | "running";
          started_at: string;
          finished_at?: string | null;
          duration?: number | null;
          root_cause?: string | null;
          root_cause_confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trace_id?: string;
          name?: string;
          status?: "success" | "failed" | "running";
          started_at?: string;
          finished_at?: string | null;
          duration?: number | null;
          root_cause?: string | null;
          root_cause_confidence?: number | null;
          created_at?: string;
        };
      };
      spans: {
        Row: {
          id: string;
          span_id: string;
          trace_id: string;
          parent_id: string | null;
          name: string;
          type: "llm" | "tool" | "agent" | "memory" | "retrieval" | "system";
          agent: string | null;
          status: "success" | "error" | "warning" | "running";
          started_at: string;
          finished_at: string | null;
          duration: number | null;
          input: Json | null;
          output: Json | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          span_id: string;
          trace_id: string;
          parent_id?: string | null;
          name: string;
          type: "llm" | "tool" | "agent" | "memory" | "retrieval" | "system";
          agent?: string | null;
          status: "success" | "error" | "warning" | "running";
          started_at: string;
          finished_at?: string | null;
          duration?: number | null;
          input?: Json | null;
          output?: Json | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          span_id?: string;
          trace_id?: string;
          parent_id?: string | null;
          name?: string;
          type?: "llm" | "tool" | "agent" | "memory" | "retrieval" | "system";
          agent?: string | null;
          status?: "success" | "error" | "warning" | "running";
          started_at?: string;
          finished_at?: string | null;
          duration?: number | null;
          input?: Json | null;
          output?: Json | null;
          error?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
