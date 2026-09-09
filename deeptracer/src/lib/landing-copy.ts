export type LandingCopy = {
  ctaRegister: string;
  github: string;
  eyebrow: string;
  headline: [string, string];
  lead: string;
  installLabel: string;
  copyInstall: string;
  copied: string;
  localNote: string;
  whyTitle: string;
  whyBody: string;
  whoTitle: string;
  whoClaude: string;
  whoGpt: string;
  whoCursor: string;
  howTitle: string;
  howLead: string;
  steps: Array<{ step: string; title: string; body: string }>;
  recallLabel: string;
  recallQuery: string;
  recallAsk: string;
  alreadyFound: string;
  recallAnswer: string;
  receiptsLabel: string;
  recallHit1: string;
  recallHit1Meta: string;
  recallHit2: string;
  recallHit2Meta: string;
  sketchCaption: string;
  footer: string;
};

export const landingCopy: LandingCopy = {
  ctaRegister: "Register agents",
  github: "GitHub",
  eyebrow: "Local agent memory",
  headline: ["Remember what your agents", "already found."],
  lead: "Claude, GPT, and Cursor on this PC do not share a memory. Ask what they already found or decided. Open a receipt only when you need the source.",
  installLabel: "Run on this machine",
  copyInstall: "Copy install",
  copied: "Copied",
  localNote: "Requires Node.js. After you register, the home is a question — not a log list.",
  whyTitle: "Why this machine",
  whyBody: "A hosted site cannot open these folders. Memory stays here.",
  whoTitle: "Who",
  whoClaude: "Claude",
  whoGpt: "GPT",
  whoCursor: "Cursor",
  howTitle: "Underneath the question",
  howLead: "You ask. Archive and compress stay in the background. The graph is a receipt, not the home.",
  steps: [
    {
      step: "01",
      title: "Archive",
      body: "Register Claude, GPT, and Cursor. Recent sessions are kept on this machine so the next question has something to search.",
    },
    {
      step: "02",
      title: "Compress",
      body: "Tool calls collapse into what a step obtained: a source, a file, a page, a decision. Not Search ×4.",
    },
    {
      step: "03",
      title: "Recall",
      body: "That is the daily surface. The answer points at a node. Open the DAG only when the memory needs a source.",
    },
  ],
  recallLabel: "Ask this machine",
  recallQuery: "What did we already find about Outstatic?",
  recallAsk: "Ask",
  alreadyFound: "Already found",
  recallAnswer:
    "Claude already pulled the Outstatic docs. Cursor treated it as a git-based CMS. You do not need to search it again.",
  receiptsLabel: "Receipts",
  recallHit1: "Outstatic docs",
  recallHit1Meta: "Claude · 2d ago",
  recallHit2: "Git-based CMS",
  recallHit2Meta: "Cursor · receipt",
  sketchCaption: "Same machine. Different agents. One answer.",
  footer: "Clone the repo, run it here, register the agents you already use, then ask. Memory stays on this computer.",
};
