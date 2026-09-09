# DeepTracer — Product Requirements Document

**Remember what your agents already found.**

- Version: v0.4
- Status: Pivot in progress (ingest + meaning graph shipped; recall is next)
- Product Type: Local-first personal memory over desktop AI agent runs

---

## 1. Product Overview

### One-liner
이 컴퓨터에서 돌린 Claude, GPT/Codex, Cursor 세션을 원본으로 보관하고, 실행 로그를 의미 단위로 줄인 뒤, 다음 세션이 이미 알아낸 것과 결정한 것을 다시 묻지 않게 한다.

### Layers

| Layer | Job | What the user sees |
|-------|-----|--------------------|
| Archive | 원본 세션 JSONL을 불변으로 보관 | 스캔된 run, 원본 span |
| Compress | 도구 호출을 “얻어낸 것”으로 접음 | 의미 그래프 (파일, 소스, 페이지, 결정) |
| Recall | 에이전트 경계를 넘어 회수 | “X에 대해 이미 뭘 알아냈지?” + 영수증 |

DeepTracer는 **세컨드 브레인 앱이 아니다.** ChatGPT 메모리, Cursor memories, Notion이 못 보는 구멍 — **같은 PC의 서로 다른 데스크톱 에이전트 세션** — 을 채운다.

사람이 매일 여는 면은 Recall이다. DAG는 홈이 아니라, 기억이 틀렸거나 출처가 필요할 때 여는 **영수증**이다.

### Core Value

| Status quo | DeepTracer |
|------------|------------|
| 에이전트마다 기억이 끊김 | 이 머신의 Claude / GPT / Cursor를 한 아카이브로 |
| 원본 JSONL을 다시 읽음 | 의미 단위 그래프 + 원본은 보관 |
| 지난 주 결정을 다시 물어봄 | 쿼리 → 답 → 해당 run의 노드로 이동 |
| 출력만 보고 추측 | 필요하면 영수증 DAG에서 원인을 따라감 |

### Product Shift (v0.4)

v0.3은 “실패 run을 디버깅하는 observability”였다. v0.4는 그 파이프를 **개인 메모리의 엔진**으로 쓴다.

- 사용자는 JSON을 붙여넣는 대신 **에이전트를 등록**한다.
- 스캔은 원본 로그를 `~/.deeptracer`에 아카이브한다.
- 첫 열람 때 LLM(없으면 휴리스틱)이 의미 그래프를 만들어 저장한다.
- 다음 단계는 그 그래프를 인덱스로 **회수**하는 것이다. 디버그 DAG는 유지하되 홈이 아니다.

> DeepTracer는 **local-first**다. 로그는 이 앱이 실행 중인 컴퓨터에서만 읽는다. Vercel 같은 클라우드 배포본은 사용자 PC의 `~/.claude`, `~/.codex`, `~/.cursor`에 접근하지 못한다.
>
> 설치 프로그램(Electron/Tauri)은 이 단계에 필요 없다. `npm run dev`로 띄운 Next 서버가 같은 머신의 세션 파일을 읽는다.

### What we are not

- 모든 지식을 통합하는 범용 세컨드 브레인
- 클라우드로 원본 로그를 올리는 동기화 제품
- DAG / Inspector를 버리는 피벗
- 새 채팅 앱을 먼저 만드는 피벗

---

## 2. Target Customer

**Primary ICP**: 로컬에서 Claude, GPT/Codex, Cursor를 **같이** 쓰는 사람. 한 에이전트가 찾아낸 것을 다른 에이전트가 모른다.

초기 구체 사용자: AI가 제품의 핵심인 5~20명 스타트업의 엔지니어. 디버깅이 아니라 **회수**가 매일의 통증이다.

**필수 조건:**
- 데스크톱 에이전트를 이 컴퓨터에서 사용
- 세션이 디스크에 남음 (`~/.claude`, `~/.codex`, `~/.cursor`)
- “이거 저번에 찾아보지 않았나”가 반복됨

**Supported Agent Tools:**
- Claude Code Desktop / CLI — `~/.claude/projects`, `~/.claude/transcripts`
- Codex Desktop / CLI — `~/.codex/sessions` rollout JSONL
- Cursor Desktop — `~/.cursor/projects/*/agent-transcripts`
- 기타 OpenTelemetry 호환 Agent (보조: `/api/collect`)

---

## 3. Features

### ✅ Feature 1: Agent Registration
- 이 머신의 Claude / GPT / Cursor 설치 여부를 탐지
- 선택한 agent만 등록. 기존 registry에 merge
- 등록 정보는 `~/.deeptracer/registry.json`

### ✅ Feature 2: Local Session Archive
- 업로드 없이 로컬 세션을 Trace로 변환해 원본 span을 보관
- Agent당 최근 유효 세션 최대 12개
- 6MB 초과 파일은 건너뜀 (내용 truncate, span 상한 80)
- credential / auth / SQLite DB는 읽지 않음
- 재스캔: Agents 또는 Runs의 Scan now
- 스캔은 도구 패밀리로 뭉개지 않는다. 원본 실행 span을 저장한다

### ✅ Feature 3: Runs
- 프로젝트별로 묶인 run 목록
- Agent / Date / Project / Sort / 검색. 탭 안에서 필터 유지
- 클릭 시 의미 그래프 (영수증)

### ✅ Feature 4: Meaning graph (Compress)
- 노드는 도구 이름이 아니라 **그 스텝이 얻어낸 것** (소스, 파일, 페이지, 결정)
- 런을 처음 열면 LLM이 의미 단위로 묶고 `semanticGraph`로 저장. 다음은 저장된 그래프를 연다
- API 키가 없으면 파일·URL·쿼리 기준 휴리스틱
- Context(주입된 AGENTS.md, 플러그인, 하네스)는 DAG에서 분리
- React Flow canvas, Inspector, Timeline. DAG는 영수증이지 워크플로 에디터가 아님

### ✅ Feature 5: Intent review (영수증 보조)
- 런이 의도에서 벗어난 지점을 LLM이 짚음
- Analyze 페이지의 수동 JSON 분석은 보조

### ✅ Feature 6: Regression Test 생성
- Root Cause → Test Case (디버그 경로 유지)

### ✅ Feature 7: Live OTLP / 수동 Import (보조)
- `/api/collect`, `/import`, `/setup`
- 기본 UX가 아님

### ◻ Feature 8: Recall (다음)
- 질문: 이 머신의 런을 상대로 “X에 대해 이미 뭘 알아냈지 / 뭘 결정했지”
- 답은 의미 노드와 원본 span으로 연결 (영수증)
- Claude에서 찾은 소스를 Cursor가 다시 검색하지 않게 하는 것이 성공
- 범용 채팅 메모리 UI가 아님. 쿼리 → 근거 run

### ◻ Feature 9: 사용자 인증
- 미구현. 로컬 사용이 기본이라 후순위

---

## 4. Primary User Flow

```text
Open DeepTracer (localhost)
        ↓
Agent 등록
  - Claude / GPT / Cursor 탐지
        ↓
Scan
  - 원본 세션 → Trace archive (~/.deeptracer)
        ↓
Runs
  - 프로젝트별 목록. 필터 유지
        ↓
Meaning graph (영수증)
  - 첫 열람: 의미 단위로 압축해 저장
  - Inspector = 얻어낸 결과
        ↓
(다음) Recall
  - “X는 이미 다뤘나” → 답 + 해당 노드
```

재방문 시 등록이 있으면 Runs로 간다. Recall이 붙으면 홈은 쿼리가 되고 Runs/DAG는 근거로 남는다.

---

## 5. Local Log Sources

### Claude Code
- `%USERPROFILE%\.claude\projects\<project>\*.jsonl`
- `%USERPROFILE%\.claude\transcripts\ses_*.jsonl`
- 읽지 않음: `.credentials.json`, settings 시크릿, auth

### Codex
- `%USERPROFILE%\.codex\sessions\YYYY\MM\DD\rollout-*.jsonl`
- `%USERPROFILE%\.codex\archived_sessions\rollout-*.jsonl`
- 읽지 않음: `auth.json`, sqlite 로그 DB, credentials

### Cursor
- `%USERPROFILE%\.cursor\projects\*\agent-transcripts\*.jsonl`
- 읽지 않음: 자격 증명, 에디터 DB

### 보조
- Claude Code OTLP JSON, Codex rollout bundle, 수동 JSON

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS, React Flow, dagre |
| Backend | Next.js API Routes (Node, 로컬 파일시스템) |
| Archive | `~/.deeptracer/registry.json`, `~/.deeptracer/traces.json` |
| Compress | `semanticGraph` on each Trace (LLM, fallback heuristic) |
| Database | Supabase PostgreSQL (optional mirror) |
| AI | OpenAI (`OPENAI_MODEL`, default gpt-5.6-luna, fallback gpt-4o) |
| Brand | `public/icon-192.png`, wordmark via BrandLockup |

### Design
- Dark only. Background `#0b0b0c`, accent `#e0783a`
- `docs/design-system.md`, DAG: `docs/DESIGN.md`
- easy to read, not impressive. Emoji / type-colored nodes 금지

---

## 7. Data Model

### Trace
```typescript
{
  traceId: string
  name: string
  status: "success" | "failed" | "running"
  source?: "claude-code" | "codex" | "cursor" | "example"
  project?: string
  startedAt: string
  finishedAt?: string
  duration?: number
  spans: Span[]                 // archive: execution spans
  semanticGraph?: SemanticGraph // compress: meaning graph, persisted
}
```

### SemanticGraph
```typescript
{
  version: 1
  model: string          // LLM id, or "heuristic"
  builtAt: string
  sourceHash: string     // invalidates when raw spans change
  spans: Span[]          // nodes labeled by what was obtained
}
```

원본 `spans`는 덮어쓰지 않는다. 그래프는 옆에 저장한다. 스캔이 원본을 바꿔 hash가 달라지면 다시 압축한다.

### Span
```typescript
{
  id: string
  traceId: string
  parentId: string | null
  name: string
  type: "llm" | "tool" | "agent" | "memory" | "retrieval" | "system"
  agent?: string
  status: "success" | "error" | "warning" | "running"
  input?: object | string
  output?: object | string  // family, obtained, semantic, calls
  error?: string
}
```

### Agent Registry
```typescript
{
  registeredAt: string
  lastSyncedAt?: string
  agents: Array<{
    id: "claude-code" | "codex" | "cursor"
    name: string
    enabled: boolean
    path: string
    registeredAt: string
  }>
}
```

---

## 8. Implementation Status

### Phase 0–2: Archive + receipt UI
- [x] 로컬 Claude / Codex / Cursor 탐지와 등록
- [x] 세션 스캔 → 원본 Trace
- [x] Runs (프로젝트, 필터 유지)
- [x] React Flow DAG, Inspector, Timeline
- [x] Context 분리, 의미 단위 라벨
- [x] Intent review / Analyze (보조)
- [x] `~/.deeptracer` + optional Supabase mirror

### Phase 3: Compress
- [x] 원본 span 유지 (import 시 패밀리 collapse 하지 않음)
- [x] LLM 의미 그래프 컴파일 + 저장 (`POST /api/traces/[id]/semantic`)
- [x] 휴리스틱 fallback (파일 / URL / 쿼리)
- [ ] 스캔 직후 백그라운드 압축 (지금은 런을 처음 열 때)

### Phase 4: Recall (다음)
- [ ] 의미 그래프 인덱스
- [ ] “이미 알아낸 것 / 결정한 것” 쿼리
- [ ] 답 → 런/노드 영수증
- [ ] 홈을 Recall로 둘지, Runs를 유지할지는 쿼리가 쓰인 뒤에 정한다

### Phase 5: Platform
- [x] Regression Test 생성
- [x] Privacy / Terms
- [ ] 사용자 인증
- [ ] 데스크톱 패키지

---

## 9. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/discover` | Claude / GPT / Cursor 탐지 |
| POST | `/api/agents/register` | 등록 후 스캔 |
| POST | `/api/agents/sync` | 재스캔 (원본 archive) |
| GET | `/api/traces` | Trace 목록 |
| POST | `/api/traces` | Trace 저장 |
| GET | `/api/traces/[traceId]` | 원본 Trace |
| POST | `/api/traces/[traceId]/semantic` | 의미 그래프 빌드·저장 |
| POST | `/api/analyze` | Intent review |
| POST | `/api/collect` | OTLP (보조) |
| POST | `/api/import` | 수동 Import (보조) |
| POST | `/api/seed` | 샘플 |
| POST | `/api/generate-test` | Regression Test |

---

## 10. Pages

| Path | Description |
|------|-------------|
| `/` | 랜딩. 등록되어 있으면 Open Runs |
| `/onboard` | 데스크톱 agent 등록 |
| `/dashboard` | Runs. 미등록이면 랜딩 |
| `/trace/[id]` | 의미 그래프 영수증 + Inspector + Timeline |
| `/agents` | 상태 + Scan now |
| `/analyze` | JSON 분석 (보조) |
| `/import`, `/setup` | 수동 / OTLP (보조) |
| `/privacy`, `/terms` | 법적 고지 |

기본 내비: **Runs / Agents / Analyze**. Recall이 붙으면 내비의 첫 항목이 쿼리가 된다.

---

## 11. Environment Variables

```env
# Optional. 없으면 ~/.deeptracer 만 사용
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# 의미 그래프 압축 + intent review
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
```

키 없이 스캔과 휴리스틱 그래프는 동작한다. 의미 단위 압축과 Review intent는 키가 있을 때 품질이 난다.

```bash
cd deeptracer
npm run dev
# http://localhost:3000
```

---

## 12. Success Metrics

**Primary (v0.4 목표):** 다른 에이전트에서 이미 다룬 사실을 다시 찾는 시간
- 기존: 세션 파일을 열어보거나 에이전트에게 다시 물어봄
- 목표: 한 쿼리로 근거 run까지

**Activation:** 첫 방문에서 agent 등록 + 최소 1개 run이 의미 그래프로 열림

**Guardrail:** 사람들이 Recall 없이 Runs만 스크롤하면 아직 디버거다. 쿼리가 반복되면 피벗이 맞다.

---

## 13. Non-goals

- 클라우드에서 사용자 PC 로그를 원격 수집
- 원본 세션을 외부 메모리 SaaS로 업로드
- 범용 세컨드 브레인 / 일기 / 북마크 통합
- 데스크톱 설치 패키지 (지금은 `npm run dev`)
- 모든 과거 세션 전체 인제스트 (최근 N개)
- Node type별 색상, workflow builder
- 멀티유저 / 팀 워크스페이스
- 채팅 UI를 메모리보다 먼저 만드는 것

---

*Last Updated: 2026-09-09*
