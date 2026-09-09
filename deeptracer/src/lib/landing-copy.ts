import type { LandingLocale } from "@/lib/locale";

export type LandingCopy = {
  runs: string;
  ctaRegister: string;
  ctaOpen: string;
  github: string;
  eyebrow: string;
  headline: [string, string];
  lead: string;
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

export const landingCopy: Record<LandingLocale, LandingCopy> = {
  en: {
    runs: "Runs",
    ctaRegister: "Register agents",
    ctaOpen: "Open Runs",
    github: "GitHub",
    eyebrow: "Local agent debugger",
    headline: ["Don’t debug the output.", "Trace the cause."],
    lead: "DeepTracer reads Claude, GPT, and Cursor session logs on this computer and opens each run as an execution graph. You follow the branch that went off intent — not the last message the agent printed.",
    localNote: "Runs on this machine. A hosted site cannot read your agent logs.",
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
    footer: "Start on this computer. Register the desktop agents you already use, then open the first run.",
  },
  ko: {
    runs: "Runs",
    ctaRegister: "에이전트 등록",
    ctaOpen: "Runs 열기",
    github: "GitHub",
    eyebrow: "로컬 에이전트 디버거",
    headline: ["출력을 디버깅하지 마세요.", "원인을 추적하세요."],
    lead: "DeepTracer는 이 컴퓨터의 Claude, GPT, Cursor 세션 로그를 읽어 각 실행을 그래프로 엽니다. 에이전트가 마지막에 출력한 메시지가 아니라, 의도를 벗어난 가지를 따라갑니다.",
    localNote: "이 컴퓨터에서 실행됩니다. 호스팅된 사이트는 에이전트 로그를 읽을 수 없습니다.",
    whyTitle: "왜 데스크톱인가",
    whyBefore:
      "Claude, Codex, Cursor는 세션을 디스크에 씁니다. Vercel이나 Netlify는 ",
    whyOr: ", ",
    whyAfter:
      "를 열 수 없습니다. DeepTracer는 그 앱 옆에 있어야 합니다. 지금은 로컬 서버, 이후에는 데스크톱 앱입니다.",
    whoTitle: "무엇을 읽나",
    whoClaude: "이 PC의 Claude 데스크톱",
    whoGpt: "이 PC의 GPT / Codex 데스크톱",
    whoCursor: "이 PC의 Cursor 데스크톱",
    whoNote: "설치된 데스크톱 에이전트만 표시합니다. 자격 증명과 인증 파일은 읽지 않습니다.",
    howTitle: "작동 방식",
    steps: [
      {
        step: "01",
        title: "에이전트 등록",
        body: "이 컴퓨터의 Claude, GPT, Cursor 데스크톱 앱을 찾습니다. 스캔할 로그를 고르면 됩니다.",
      },
      {
        step: "02",
        title: "프로젝트별 Runs",
        body: "최근 세션이 run이 되고, 에이전트와 작업 폴더로 묶입니다. JSON을 올리지 않고 검색·정렬합니다.",
      },
      {
        step: "03",
        title: "그래프를 따라가기",
        body: "run은 DAG로 열립니다. 노드는 어떤 도구를 불렀는지가 아니라, 그 단계가 얻은 결과입니다. Inspector가 결과를 보여주고, Review intent가 의도가 꺾인 지점을 찾습니다.",
      },
    ],
    seeTitle: "화면에 보이는 것",
    seeBody:
      "캔버스는 실행의 지도입니다. 서브에이전트는 가지로 남습니다. 반복된 도구는 Search ×4가 아니라, 가격 출처·파일·페이지처럼 얻은 것으로 합쳐집니다.",
    sketchOrchestrator: "Orchestrator",
    sketchResearch: "Research",
    sketchSource: "Vendor A 가격",
    sketchBrowser: "Browser",
    sketchTable: "가격표",
    sketchCaption: "Research는 출처를 얻었습니다. Browser는 표를 가져오지 못했습니다. 그게 원인입니다.",
    footer: "이 컴퓨터에서 시작하세요. 이미 쓰는 데스크톱 에이전트를 등록한 뒤, 첫 번째 run을 여세요.",
  },
};
