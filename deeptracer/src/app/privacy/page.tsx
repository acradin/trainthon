import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy policy — DeepTracer",
  description: "How DeepTracer handles session logs and optional third-party keys.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy">
      <p>Last updated: September 9, 2026.</p>
      <p>
        DeepTracer is a local-first debugger. Session logs are read on the computer where you run the app. A hosted
        website cannot open <code className="font-mono text-[13px] text-zinc-300">~/.claude</code>,{" "}
        <code className="font-mono text-[13px] text-zinc-300">~/.codex</code>, or{" "}
        <code className="font-mono text-[13px] text-zinc-300">~/.cursor</code>.
      </p>
      <p>
        The scanner reads agent session transcripts only. Credentials, auth files, and chat databases are ignored.
        Traces stay in local storage on that machine by default (<code className="font-mono text-[13px] text-zinc-300">~/.deeptracer</code>
        ).
      </p>
      <p>
        Nothing is uploaded unless you add your own keys. If you set an OpenAI key, review-intent analysis is sent to
        OpenAI. If you set Supabase keys, traces may be stored in your project. Those services are governed by their
        own policies.
      </p>
      <p>
        This page describes the default product. If you host or fork DeepTracer, you are responsible for the privacy
        notice that applies to your deployment.
      </p>
    </LegalShell>
  );
}
