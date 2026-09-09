import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of use — DeepTracer",
  description: "Terms for using DeepTracer, a local agent debugger.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use">
      <p>Last updated: September 9, 2026.</p>
      <p>
        DeepTracer is provided by Acradin as an open project for debugging local Claude, GPT/Codex, and Cursor agent
        runs. It is offered as-is, without warranties of any kind, including fitness for a particular purpose or
        non-infringement.
      </p>
      <p>
        You run DeepTracer on your own machine. You are responsible for the agents you register, the logs you scan,
        and any keys you add. Do not use the software to access data you are not allowed to read.
      </p>
      <p>
        Acradin is not liable for lost data, incorrect analysis, or damages arising from use of the software. Review
        intent and other model features depend on third-party APIs when you enable them.
      </p>
      <p>
        Source code is available on GitHub. Additional license terms in the repository, if any, also apply. These
        terms may change as the product changes.
      </p>
    </LegalShell>
  );
}
