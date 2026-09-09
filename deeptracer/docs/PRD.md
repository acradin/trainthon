# DeepTracer — Product Requirements Document

**Don't debug the output. Trace the cause.**

- Version: v0.3 MVP
- Status: MVP Complete (auth deferred)
- Product Type: Local-first AI Agent Debugging / Observability

---

## 1. Product Overview

### One-liner
이 컴퓨터에 설치된 AI Agent의 실행 로그를 찾아, 실패가 어디서 시작됐는지 자동으로 추적하는 디버깅 플랫폼

### Core Value
| Existing Observability | DeepTracer |
|------------------------|------------|
| What happened? | Why did it happen? |
| Trace를 직접 업로드 | 설치된 agent를 등록하면 로컬 로그를 자동 스캔 |
| 출력만 보고 추측 | Execution DAG에서 원인을 따라감 |

### Product Shift (v0.3)
사용자는 JSON/OTLP를 붙여넣는 대신 **에이전트를 등록**한다. DeepTracer는 같은 머신에 있는 Claude Code·Codex 세션 로그를 찾아 Runs로 만들고, 실패한 run은 root cause 분석을 돌린다.

수동 Import와 OTLP collector는 보조 경로로 남긴다. 기본 경로는 로컬 자동 탐색이다.

> DeepTracer는 **local-first**다. 로그는 이 앱이 실행 중인 컴퓨터에서만 읽을 수 있다. Vercel 같은 클라우드 배포본은 사용자 PC의 `~/.claude`, `~/.codex`에 접근하지 못한다.
>
> 설치 프로그램(Electron/Tauri)은 MVP에 필요 없다. 브라우저가 디스크를 여는 게 아니라, `npm run dev`로 띄운 Next 서버가 같은 머신의 세션 파일을 읽는다. 비개발자용 더블클릭 앱이나 클라우드 UI + sidecar는 이후 단계다.

---

## 2. Target Customer

**Primary ICP**: 5~20명 규모 AI 스타트업의 AI Engineer

**필수 조건:**
- AI가 제품의 핵심 기능
- Claude Code 또는 Codex를 로컬에서 사용
- Multi-step / Multi-Agent workflow를 디버깅해야 함

**Supported Agent Tools:**
- Claude Code Desktop / CLI — `~/.claude/projects`, `~/.claude/transcripts`
- Codex Desktop / CLI — `~/.codex/sessions` rollout JSONL
- 기타 OpenTelemetry 호환 Agent (보조: `/api/collect`)

---

## 3. MVP Features

### ✅ Feature 1: Agent Registration (First Run)
- 첫 화면에서 이 머신의 Claude Code / Codex 설치 여부를 탐지
- 사용자가 agent를 선택하고 등록
- 등록 즉시 최근 세션을 스캔하고 실패한 run을 분석
- 등록 정보는 `~/.deeptracer/registry.json`에 저장

### ✅ Feature 2: Local Session Scan
- 업로드 없이 로컬 세션 로그를 Trace로 변환
- Agent당 최근 유효 세션 최대 12개
- 6MB 초과 파일은 건너뜀 (내용 truncate, span 상한 80)
- credential / auth 파일은 읽지 않음
- 재스캔: Agents 페이지 또는 Runs의 Scan now

### ✅ Feature 3: Runs Dashboard
- 스캔된 run 목록
- 상태 필터 (All / Failed / Completed)
- 실패 run은 왼쪽 accent
- 클릭 시 Execution DAG

### ✅ Feature 4: Execution DAG Canvas
- React Flow 기반 observability canvas (트리 리스트가 아님)
- Top → Bottom dagre layout
- Pan / zoom / fit / minimap
- Node 선택 시에만 Inspector
- Timeline은 하단에 실행 순서만 표시
- Status color는 indicator와 왼쪽 accent에만 사용. Node type마다 색을 나누지 않음

### ✅ Feature 5: Root Cause Analysis
- LLM 기반 실패 원인 분석 (OpenAI GPT-5, fallback gpt-4o)
- 신뢰도 점수, first error span, propagation path, recommendation
- 등록/스캔 직후 실패한 run 최대 3개를 자동 분석
- Analyze 페이지에서 수동 JSON 분석도 가능 (보조)
- 예제: Rate limit, Hallucination, Logic error, **Sub-agents** (`trace_004`)
  - Orchestrator → Research / Browser 분기를 DAG에서 확인할 수 있다

### ✅ Feature 6: Regression Test 생성
- Root Cause → Test Case 자동 변환
- Copy / Download

### ✅ Feature 7: Live OTLP Collection (보조)
- `/api/collect` 엔드포인트
- `/setup` 가이드 (design system 정렬: 이모지/타입 색 없음)
- `/import` 수동 JSON (Analyze와 같은 split layout)
- 기본 UX가 아님. Agents 페이지에서 보조 링크로 진입

### ◻ Feature 8: 사용자 인증
- 미구현. 로컬 사용이 기본이라 MVP에서 후순위

---

## 4. Primary User Flow

```text
Open DeepTracer (localhost)
        ↓
Agent 등록 화면
  - Claude Code 탐지 / Codex 탐지
  - 선택할 agent 확인
        ↓
Register and analyze
  - ~/.claude, ~/.codex 세션 스캔
  - Trace 저장 (~/.deeptracer/traces.json, Supabase 있으면 mirror)
  - 실패 run 자동 분석
        ↓
Runs dashboard
  - 실패한 run 선택
        ↓
Execution DAG + Inspector
  - root cause / timeline / I/O
```

재방문 시 등록 정보가 있으면 바로 Runs로 이동한다. Agents에서 다시 스캔할 수 있다.

---

## 5. Local Log Sources

### Claude Code
경로:

- `%USERPROFILE%\.claude\projects\<project>\*.jsonl` — conversation / tool_use
- `%USERPROFILE%\.claude\transcripts\ses_*.jsonl` — user / tool_use / tool_result

읽지 않음: `.credentials.json`, `settings.json` 안의 시크릿, auth 파일

### Codex
경로:

- `%USERPROFILE%\.codex\sessions\YYYY\MM\DD\rollout-*.jsonl`
- `%USERPROFILE%\.codex\archived_sessions\rollout-*.jsonl` (크기 제한 적용)

이벤트: `session_meta`, `response_item` (`message`, `function_call`, `function_call_output`, `custom_tool_call`), `event_msg` (`error`)

읽지 않음: `auth.json`, sqlite 로그 DB, credentials

### 보조 포맷 (수동)
- Claude Code OTLP JSON (`resourceSpans`)
- Codex rollout bundle (`manifest` + events/state)

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`), dagre |
| Backend | Next.js API Routes (Node runtime, 로컬 파일시스템) |
| Local store | `~/.deeptracer/registry.json`, `~/.deeptracer/traces.json` |
| Database | Supabase PostgreSQL (설정 시 mirror, 없어도 로컬 동작) |
| AI | OpenAI GPT-5, fallback gpt-4o |
| Brand | `public/logo-dark.png` 헤더, `public/favicon.svg` |

### Design
- Dark theme only. Background `#0b0b0c`, accent `#e0783a`
- 상세 규칙은 `docs/design-system.md`, DAG 규칙은 `docs/DESIGN.md`
- 원칙: easy to read, not impressive. Emoji hero / type-colored nodes 금지
- Import / Setup / Agents / Runs / Onboard 모두 동일 토큰 (`#0b0b0c`, accent `#e0783a`)

---

## 7. Data Model

### Trace
```typescript
{
  traceId: string
  name: string
  status: "success" | "failed" | "running"
  startedAt: string
  finishedAt?: string
  duration?: number
  spans: Span[]
}
```

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
  input?: object
  output?: object
  error?: string
}
```

### Agent Registry
```typescript
{
  registeredAt: string
  lastSyncedAt?: string
  agents: Array<{
    id: "claude-code" | "codex"
    name: string
    enabled: boolean
    path: string
    registeredAt: string
  }>
}
```

---

## 8. Implementation Status

### Phase 0: Core Analysis ✅
- [x] Root Cause Analysis API
- [x] Mock / example traces (Analyze 보조 화면)
  - Rate limit, Hallucination, Logic error
  - Sub-agents 분기 예제 (`trace_004`, Orchestrator → Research / Browser)
- [x] Analyze 페이지 (`/analyze`)

### Phase 1: Observability UI ✅
- [x] Runs dashboard
- [x] React Flow Execution DAG
- [x] Inspector + Timeline
- [x] Trace 상세 페이지
- [x] 공통 AppHeader + 워드마크 로고

### Phase 2: Storage ✅
- [x] 로컬 store (`~/.deeptracer`)
- [x] Supabase Trace/Span CRUD (optional mirror)
- [x] 타입 안전한 쿼리

### Phase 3: Agent Integration ✅
- [x] 로컬 Claude Code / Codex 탐지
- [x] Agent 등록 화면 (첫 진입)
- [x] 세션 로그 자동 스캔 → Trace
- [x] 실패 run 자동 분석
- [x] 수동 Import / OTLP collect (보조, design system 정렬)

### Phase 4: Platform
- [x] Regression Test 생성
- [x] Vercel 배포 (앱 호스팅). 로컬 로그 스캔은 localhost에서만 동작
- [ ] 사용자 인증

---

## 9. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/discover` | 이 머신의 Claude Code / Codex 탐지 |
| POST | `/api/agents/register` | Agent 등록 후 기본 스캔 |
| POST | `/api/agents/sync` | 등록된 agent 재스캔 |
| GET | `/api/traces` | Trace 목록 (로컬 + Supabase merge) |
| POST | `/api/traces` | Trace 저장 |
| GET | `/api/traces/[traceId]` | Trace 상세 |
| POST | `/api/analyze` | Root Cause 분석 |
| POST | `/api/collect` | OTLP Collector (보조) |
| POST | `/api/import` | 수동 Import (보조) |
| POST | `/api/seed` | 샘플 데이터 |
| POST | `/api/generate-test` | Regression Test 생성 |

---

## 10. Pages

| Path | Description |
|------|-------------|
| `/` | Agent 등록 (미등록 시). 이미 등록되어 있으면 `/dashboard`로 이동 |
| `/dashboard` | Runs 목록. 미등록이면 `/`로 이동 |
| `/agents` | 등록된 agent 상태 + Scan now |
| `/trace/[id]` | Execution DAG + Inspector + Timeline |
| `/analyze` | JSON 붙여넣기 분석 (보조). Sub-agents 예제 포함 |
| `/import` | 수동 Import (보조). Agents에서 링크 |
| `/setup` | OTLP live collection 가이드 (보조). Agents에서 링크 |

기본 내비: **Runs / Agents / Analyze**

---

## 11. Environment Variables

```env
# Optional. 없으면 로컬 ~/.deeptracer store만 사용
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Root Cause Analysis
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5  # optional, defaults to gpt-5 with gpt-4o fallback
```

로컬 개발:

```bash
cd deeptracer
npm run dev
# http://localhost:3000 에서 agent 등록
```

저장소 루트 README: 프로젝트 소개와 실행 방법. 앱 README: `deeptracer/README.md`.

---

## 12. Success Metrics

**Primary Metric**: Agent 실패 원인 파악 시간
- 기존: 10~30분+ (로그 찾아 붙이고 읽기)
- 목표: 등록 후 < 5분 (스캔 → 실패 run → DAG → root cause)

**Activation**: 첫 방문에서 agent 등록 + 최소 1개 run 표시

---

## 13. Non-goals (this MVP)

- 클라우드에서 사용자 PC 로그를 원격 수집하는 백그라운드 에이전트
- 데스크톱 설치 패키지 (Electron / Tauri). 로컬 `npm run dev`면 충분
- 모든 과거 세션의 전체 인제스트 (최근 N개만)
- Node type별 색상, workflow builder UX
- 멀티유저 인증 / 팀 워크스페이스

---

*Last Updated: 2026-09-09*
