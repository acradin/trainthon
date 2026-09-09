export type LandingCopy = {
  ctaRegister: string;
  ctaOpen: string;
  github: string;
  eyebrow: string;
  headline: [string, string];
  lead: string;
  installLabel: string;
  copyInstall: string;
  copied: string;
  localNote: string;
  whyTitle: string;
  whyBefore: string;
  whyOr: string;
  whyAfter: string;
  whoTitle: string;
  whoClaude: string;
  whoGpt: string;
  whoCursor: string;
  whoNote: string;
  howTitle: string;
  steps: Array<{ step: string; title: string; body: string }>;
  seeTitle: string;
  seeBody: string;
  sketchOrchestrator: string;
  sketchResearch: string;
  sketchSource: string;
  sketchBrowser: string;
  sketchTable: string;
  sketchCaption: string;
  footer: string;
};

export const landingCopy: LandingCopy = {
  ctaRegister: "Register agents",
  ctaOpen: "Open Runs",
  github: "GitHub",
  eyebrow: "Local agent debugger",
  headline: ["Don’t debug the output.", "Trace the cause."],
  lead: "DeepTracer reads Claude, GPT, and Cursor session logs on this computer and opens each run as an execution graph. You follow the branch that went off intent — not the last message the agent printed.",
  installLabel: "Install on this machine",
  copyInstall: "Copy install",
  copied: "Copied",
  localNote: "Requires Node.js. Open http://localhost:3000, then register the desktop agents on this PC.",
  whyTitle: "Why desktop",
  whyBefore:
    "Claude, Codex, and Cursor write sessions to disk. Vercel or Netlify cannot open ",
  whyOr: ", or ",
  whyAfter:
    ". DeepTracer has to sit next to those apps — first as a local server, then as a desktop app.",
  whoTitle: "Who it reads",
  whoClaude: "Claude desktop on this PC",
  whoGpt: "GPT / Codex desktop on this PC",
  whoCursor: "Cursor desktop on this PC",
  whoNote: "Only installed desktop agents are listed. Credentials and auth files are ignored.",
  howTitle: "How it works",
  steps: [
    {
      step: "01",
      title: "Register agents",
      body: "DeepTracer finds Claude, GPT, and Cursor desktop apps on this machine. You choose which logs to scan.",
    },
    {
      step: "02",
      title: "Runs by project",
      body: "Recent sessions become runs, grouped by agent and working directory. Search and sort without uploading JSON.",
    },
    {
      step: "03",
      title: "Follow the graph",
      body: "A run opens as a DAG. Nodes are what a step obtained, not which tool was called. Inspector shows the result; Review intent finds where it drifted.",
    },
  ],
  seeTitle: "What you see",
  seeBody:
    "The canvas is a map of the run. Sub-agents stay as branches. Repeated tools collapse into the thing they got — a pricing source, a file, a page — not Search ×4.",
  sketchOrchestrator: "Orchestrator",
  sketchResearch: "Research",
  sketchSource: "Vendor A pricing",
  sketchBrowser: "Browser",
  sketchTable: "Pricing table",
  sketchCaption: "Research obtained a source. Browser never got the table. That is the cause.",
  footer: "Clone the repo, run it on this computer, then register the desktop agents you already use.",
};
