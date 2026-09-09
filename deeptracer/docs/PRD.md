# DeepTracer — Product Requirements Document

**Don't debug the output. Trace the cause.**

- Version: v0.2 MVP
- Status: In Development
- Product Type: AI Agent Debugging / Observability

---

## 1. Product Overview

### One-liner
AI Agent가 실패했을 때 어디서 문제가 시작되었는지 자동으로 찾아주는 Agent Debugging Platform

### Core Value
| Existing Observability | DeepTracer |
|------------------------|------------|
| What happened? | Why did it happen? |

---

## 2. Target Customer

**Primary ICP**: 5~20명 규모 AI 스타트업의 AI Engineer

**필수 조건:**
- AI가 제품의 핵심 기능
- Production Agent 운영 중
- Multi-step 또는 Multi-Agent workflow 사용

**Supported Agent Tools:**
- Claude Code Desktop / CLI
- Codex Desktop / CLI
- 기타 OpenTelemetry 호환 Agent

---

## 3. MVP Features

### ✅ Feature 1: Trace Dashboard
- Trace 목록 보기
- 상태별 필터링 (All / Failed / Success)
- 통계 카드

### ✅ Feature 2: Execution Graph
- 트리 구조 시각화
- Span 상태별 색상 표시
- 클릭으로 상세 보기

### ✅ Feature 3: Root Cause Analysis
- LLM 기반 실패 원인 분석
- 신뢰도 점수
- Error Propagation Path
- 구체적 권장 사항

### ✅ Feature 4: Agent Trace Import
- Claude Code Desktop (OpenTelemetry OTLP)
- Codex CLI (Rollout Bundle)
- 자동 형식 감지

### ✅ Feature 5: Auto Collection
- OTLP Collector 엔드포인트 (`/api/collect`)
- 실시간 Trace 수집
- Setup 가이드 페이지

### ⏳ Feature 6: Regression Test 생성
- Root Cause → Test Case 변환
- MVP 후반 구현 예정

---

## 4. Supported Agent Formats

### Claude Code Desktop / CLI
```bash
# 환경 변수 설정
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=<DEEPTRACER_URL>/api/collect
export OTEL_LOG_USER_PROMPTS=1
export OTEL_LOG_TOOL_DETAILS=1
export OTEL_LOG_TOOL_CONTENT=1
```

**Span Types:**
- `claude_code.interaction` - 사용자 턴
- `claude_code.llm_request` - 모델 호출
- `claude_code.tool` - 도구 실행

### Codex Desktop / CLI
```toml
# ~/.codex/config.toml
[otel]
enabled = true
exporter = "otlp-http"
endpoint = "<DEEPTRACER_URL>/api/collect"
log_user_prompt = true
```

**Span Types:**
- `inference_calls` - LLM 호출
- `tool_calls` - 도구 실행
- `conversation_items` - 대화 메시지

---

## 5. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| AI | OpenAI GPT-5/4o |
| Protocol | OpenTelemetry (OTLP HTTP/JSON) |

---

## 6. Data Model

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
  status: "success" | "error" | "warning" | "running"
  input?: object
  output?: object
  error?: string
}
```

---

## 7. Implementation Status

### Phase 0: Core Analysis ✅
- [x] Root Cause Analysis API
- [x] Mock Trace 데이터
- [x] Quick Analyze 페이지

### Phase 1: MVP UI ✅
- [x] Dashboard 페이지
- [x] Execution Graph 컴포넌트
- [x] Span 상세 패널
- [x] Trace 상세 페이지

### Phase 2: Database ✅
- [x] Supabase 연동
- [x] Trace/Span CRUD API
- [x] 타입 안전한 쿼리

### Phase 3: Agent Integration ✅
- [x] Claude Code Desktop Import
- [x] Codex CLI Import
- [x] Auto Collection Endpoint (`/api/collect`)
- [x] Setup 가이드 페이지

### Phase 4: Enhancement (Next)
- [ ] Regression Test 생성
- [ ] 사용자 인증
- [ ] 배포 (Vercel)

---

## 8. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/traces` | Trace 목록 조회 |
| POST | `/api/traces` | Trace 저장 |
| GET | `/api/traces/[traceId]` | Trace 상세 조회 |
| POST | `/api/analyze` | Root Cause 분석 |
| POST | `/api/collect` | OTLP Collector (자동 수집) |
| POST | `/api/import` | 수동 Import |
| POST | `/api/seed` | 샘플 데이터 로드 |

---

## 9. Pages

| Path | Description |
|------|-------------|
| `/` | Quick Analyze (JSON 붙여넣기) |
| `/dashboard` | Trace 목록 |
| `/trace/[id]` | Trace 상세 + Execution Graph |
| `/import` | 수동 Import |
| `/setup` | Auto Collection 설정 가이드 |

---

## 10. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# OpenAI (Root Cause Analysis)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5  # optional, defaults to gpt-5 with gpt-4o fallback
```

---

## 11. Success Metrics

**Primary Metric**: Agent 실패 원인 파악 시간
- 기존: 10~30분+
- 목표: < 5분

---

*Last Updated: 2026-09-09*
