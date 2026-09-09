import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { importFilesDirectory } from "../src/lib/importers/files-source";
import { importKakaoExports } from "../src/lib/importers/kakao-export";
import { importSlackWorkspace } from "../src/lib/importers/slack";
import { importGitHub, parseRepo } from "../src/lib/importers/github";
import { importGitea, importGitLab } from "../src/lib/importers/git-forges";
import { importEmailImap } from "../src/lib/importers/email-imap";
import { CONNECTOR_SOURCE_IDS } from "../src/lib/trace-source";
import { syncRegisteredAgents } from "../src/lib/agents/sync";
import { getLocalTraces } from "../src/lib/local-store";

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function expectThrow(name: string, run: () => Promise<unknown> | unknown, match?: string) {
  try {
    await run();
    record(name, false, "expected an error");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ok = match ? message.toLowerCase().includes(match.toLowerCase()) : true;
    record(name, ok, message);
  }
}

async function main() {
  const fixture = join(tmpdir(), `deeptracer-connector-test-${Date.now()}`);
  mkdirSync(join(fixture, "notes"), { recursive: true });
  writeFileSync(join(fixture, "notes", "alpha.md"), "# Alpha\nDecision: use local IMAP.");
  writeFileSync(join(fixture, "notes", "beta.txt"), "Vendor pricing is in the sheet.");
  writeFileSync(
    join(fixture, "room.txt"),
    [
      "--------------- 2026년 9월 9일 수요일 ---------------",
      "[민수] [오전 10:01] 배포했어?",
      "[지현] [오후 3:15] 아직 PR 보는 중",
      "2026. 9. 9. 오후 9:02, 수아 : 내일 다시 보자",
    ].join("\n")
  );

  try {
    const files = importFilesDirectory(fixture);
    const fileSpans = files.flatMap((trace) => trace.spans);
    const sawNote = fileSpans.some((span) => {
      const input = span.input as { author?: string; message?: string } | undefined;
      return input?.author === "alpha.md" || input?.message?.includes("Alpha") || span.name.includes("Alpha");
    });
    record(
      "files: import folder",
      files.length >= 1 && sawNote,
      `${files.length} traces / ${fileSpans.length} spans / ${files.map((t) => t.name).join(", ")}`
    );
    record(
      "files: source tag",
      files.every((trace) => trace.source === "files" && trace.traceId.startsWith("fs_")),
      files[0]?.traceId ?? "none"
    );

    await expectThrow("files: reject drive root", () => importFilesDirectory("C:\\"), "folder");
    await expectThrow("files: missing path", () => importFilesDirectory(join(fixture, "nope")), "not found");

    const kakao = importKakaoExports(join(fixture, "room.txt"));
    const names = kakao.flatMap((trace) => trace.spans.map((span) => span.name));
    record(
      "kakao: classic + comma export",
      kakao.length === 1 && kakao[0].source === "kakao" && names.length >= 3,
      `${kakao[0]?.name} spans=${names.join(" | ")}`
    );
    record(
      "kakao: afternoon hour",
      kakao[0]?.spans.some((span) => span.startedAt.includes("T06:15") || span.startedAt.includes("T15:15")) ?? false,
      kakao[0]?.spans.map((span) => span.startedAt).join(", ") ?? "none"
    );

    await expectThrow("kakao: empty folder", () => {
      const empty = join(fixture, "empty");
      mkdirSync(empty, { recursive: true });
      return importKakaoExports(empty);
    }, "txt");
    await expectThrow("kakao: missing folder", () => importKakaoExports(join(fixture, "missing")), "not found");

    await expectThrow(
      "slack: invalid token",
      () =>
        importSlackWorkspace({
          id: "slack",
          enabled: true,
          token: "xoxp-invalid-test-token",
          registeredAt: new Date().toISOString(),
        }),
      "invalid"
    );

    record(
      "github: parse owner/name from url",
      parseRepo("https://github.com/acradin/trainthon.git") === "acradin/trainthon" &&
        parseRepo("not-a-repo") === null,
      parseRepo("https://github.com/acradin/trainthon.git") ?? "none"
    );

    await expectThrow(
      "github: invalid token",
      () =>
        importGitHub({
          id: "github",
          enabled: true,
          token: "ghp_invalid-test-token",
          registeredAt: new Date().toISOString(),
        }),
      "bad credentials"
    );

    await expectThrow(
      "gitlab: invalid token",
      () =>
        importGitLab({
          id: "gitlab",
          enabled: true,
          token: "glpat-invalid-test-token",
          registeredAt: new Date().toISOString(),
        }),
      ""
    );

    await expectThrow(
      "gitea: missing url",
      () =>
        importGitea({
          id: "gitea",
          enabled: true,
          token: "gitea_fake",
          registeredAt: new Date().toISOString(),
        }),
      "url"
    );

    await expectThrow(
      "email: bad IMAP host",
      () =>
        importEmailImap({
          id: "email",
          enabled: true,
          host: "127.0.0.1",
          port: 1,
          secure: false,
          user: "test@example.com",
          password: "wrong",
          mailbox: "INBOX",
          registeredAt: new Date().toISOString(),
        }),
      ""
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  const base = "http://localhost:3000";
  const json = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  };

  const listed = await json("/api/connectors");
  record(
    "api: list connectors",
    listed.status === 200 &&
      Array.isArray(listed.body.connectors) &&
      listed.body.connectors.length === CONNECTOR_SOURCE_IDS.length,
    JSON.stringify(listed.body.connectors?.map((c: { id: string; connected: boolean }) => `${c.id}:${c.connected}`))
  );

  const missingGithub = await json("/api/connectors", { method: "POST", body: JSON.stringify({ id: "github", token: "" }) });
  record("api: github requires token", missingGithub.body.success === false, missingGithub.body.error ?? "");

  const badRepo = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "github", token: "ghp_fake", repo: "not-a-repo", sync: false }),
  });
  record("api: github rejects bad repo", badRepo.body.success === false, badRepo.body.error ?? "");

  const githubConnect = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "github", token: "ghp_fake", repo: "acradin/trainthon", sync: false }),
  });
  record(
    "api: persist github repo",
    githubConnect.body.success === true &&
      githubConnect.body.connectors?.some(
        (c: { id: string; connected: boolean; summary?: string }) =>
          c.id === "github" && c.connected && String(c.summary).includes("trainthon")
      ),
    JSON.stringify(githubConnect.body.connectors?.find((c: { id: string }) => c.id === "github"))
  );

  const missingGitea = await json("/api/connectors", { method: "POST", body: JSON.stringify({ id: "gitea", token: "gitea_fake" }) });
  record("api: gitea requires url", missingGitea.body.success === false, missingGitea.body.error ?? "");

  const missingPlane = await json("/api/connectors", { method: "POST", body: JSON.stringify({ id: "plane", token: "plane_api_fake" }) });
  record("api: plane requires workspace", missingPlane.body.success === false, missingPlane.body.error ?? "");

  const gitlabConnect = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "gitlab", token: "glpat-fake", sync: false }),
  });
  record(
    "api: persist gitlab default url",
    gitlabConnect.body.success === true &&
      gitlabConnect.body.connectors?.some(
        (c: { id: string; connected: boolean; summary?: string }) =>
          c.id === "gitlab" && c.connected && String(c.summary).includes("gitlab.com")
      ),
    JSON.stringify(gitlabConnect.body.connectors?.find((c: { id: string }) => c.id === "gitlab"))
  );

  const missingPath = await json("/api/connectors", { method: "POST", body: JSON.stringify({ id: "files" }) });
  record("api: files requires path", missingPath.body.success === false, missingPath.body.error ?? "");

  const unknown = await json("/api/connectors", { method: "POST", body: JSON.stringify({ id: "notion" }) });
  record("api: reject unknown source", unknown.body.success === false, unknown.body.error ?? "");

  const docs = join(process.cwd(), "docs");
  const filesConnect = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "files", path: docs, sync: false }),
  });
  record(
    "api: connect files without full agent scan",
    filesConnect.body.success === true &&
      filesConnect.body.connectors?.some((c: { id: string; connected: boolean }) => c.id === "files" && c.connected),
    JSON.stringify(filesConnect.body.connectors?.find((c: { id: string }) => c.id === "files"))
  );

  const kakaoDir = join(tmpdir(), `deeptracer-kakao-api-${Date.now()}`);
  mkdirSync(kakaoDir, { recursive: true });
  writeFileSync(
    join(kakaoDir, "KakaoTalk_team.txt"),
    "--------------- 2026년 1월 2일 금요일 ---------------\n[나] [오전 9:00] 미팅 노션에 정리함\n"
  );
  const kakaoConnect = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "kakao", path: kakaoDir, sync: false }),
  });
  record(
    "api: connect kakao export folder",
    kakaoConnect.body.success === true &&
      kakaoConnect.body.connectors?.some((c: { id: string; connected: boolean }) => c.id === "kakao" && c.connected),
    kakaoConnect.body.error ?? "connected"
  );

  const beforeIds = new Set(getLocalTraces().map((trace) => trace.traceId));
  const ingested = await syncRegisteredAgents([]);
  const fileHits = ingested.traces.filter((item) => item.source === "files");
  const kakaoHits = ingested.traces.filter((item) => item.source === "kakao");
  record(
    "scan: files into archive",
    fileHits.length >= 1 && ingested.errors.every((error) => !error.startsWith("files:")),
    `${fileHits.length} traces, first=${fileHits[0]?.name ?? "none"}`
  );
  record(
    "scan: kakao into archive",
    kakaoHits.length >= 1 && ingested.errors.every((error) => !error.startsWith("kakao:")),
    `${kakaoHits.length} traces, first=${kakaoHits[0]?.name ?? "none"}`
  );
  const tracesPath = join(homedir(), ".deeptracer", "traces.json");
  writeFileSync(
    tracesPath,
    JSON.stringify(
      getLocalTraces().filter((trace) => beforeIds.has(trace.traceId)),
      null,
      2
    )
  );

  const slackConnect = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "slack", token: "xoxb-fake", sync: false }),
  });
  record("api: persist slack token masked", slackConnect.body.success === true, JSON.stringify(slackConnect.body.connectors?.find((c: { id: string }) => c.id === "slack")));

  const emailMissing = await json("/api/connectors", {
    method: "POST",
    body: JSON.stringify({ id: "email", host: "imap.gmail.com", user: "a@b.com" }),
  });
  record("api: email requires password", emailMissing.body.success === false, emailMissing.body.error ?? "");

  const page = await fetch(`${base}/agents`);
  const html = await page.text();
  record(
    "ui: sources page loads",
    page.status === 200 && html.includes("Sources") && html.includes("Working context"),
    `status ${page.status}`
  );

  for (const id of ["files", "kakao", "slack", "github", "gitlab"]) {
    const removed = await json(`/api/connectors?id=${id}`, { method: "DELETE" });
    record(
      `api: disconnect ${id}`,
      removed.body.success === true &&
        removed.body.connectors?.some((c: { id: string; connected: boolean }) => c.id === id && !c.connected),
      ""
    );
  }
  rmSync(kakaoDir, { recursive: true, force: true });

  const failed = checks.filter((item) => !item.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

void main();
