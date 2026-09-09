# DeepTracer Design System

제품 화면의 공통 시각 언어다. DAG 레이아웃·인터랙션 상세는 [`DESIGN.md`](./DESIGN.md)를 따른다.

핵심 한 줄:

> **Make the graph easy to read, not impressive to look at.**

---

## 1. Philosophy

DeepTracer는 workflow builder가 아니라 **execution debugger / observability canvas**다.

역할을 섞지 않는다.

| Surface | 역할 | 넣어도 되는 것 | 넣으면 안 되는 것 |
|---------|------|----------------|-------------------|
| DAG | Execution topology | 이름, type, status, latency | prompt, response, JSON, stack trace |
| Inspector | 선택한 node의 상세 | error, input, output, metadata | 그래프 조작 UI |
| Timeline | 실행 순서 | span 이름, 짧은 duration, status dot | 긴 로그 |
| Logs / I/O | Raw data | 전체 payload | 노드 카드 안에 복제 |

기본 상태에서는 Canvas가 화면의 거의 전부다. Inspector는 node를 선택했을 때만 연다.

```text
기본     Canvas 100%
선택 시  Canvas 70~75%  |  Inspector 25~30%
```

Inspector가 열려도 그래프 topology를 다시 그리지 않는다. 공간만 줄어든다.

---

## 2. References

장점만 가져온다. 복제하지 않는다.

- **React Flow / XYFlow** — canvas, zoom/pan, minimap, selection
- **LangGraph Studio** — agent execution graph, node → inspector
- **Apache Airflow** — DAG topology, task status
- **n8n** — node density, branching, connections
- **Linear / Vercel** — compact dark infrastructure UI

---

## 3. Color

Dark theme only. Accent는 **하나**다. Node type마다 색을 나누지 않는다.

Status color는 indicator와 얇은 accent에만 쓴다. Node 면을 가득 채우지 않는다.

| Token | Hex | 용도 |
|-------|-----|------|
| `--dt-bg` | `#0b0b0c` | page / canvas background |
| `--dt-surface` | `#141416` | node, controls, inspector chrome |
| `--dt-surface-2` | `#111113` | inspector panel |
| `--dt-border` | `#27272a` | borders, grid |
| `--dt-text` | `#f4f4f5` | primary text |
| `--dt-text-2` | `#a1a1aa` | secondary |
| `--dt-text-3` | `#71717a` | metadata, type label |
| `--dt-accent` | `#e0783a` | selection, primary action |
| `--dt-success` | `#34d399` | success indicator |
| `--dt-error` | `#f87171` | failed indicator |
| `--dt-warning` | `#fbbf24` | warning indicator |
| `--dt-running` | `#38bdf8` | running indicator |

### Status marks

```text
● Running
✓ Success
× Failed
– Skipped / Warning
○ Pending
```

실패 node는 면 전체가 아니라 **왼쪽 border accent**만 강하게 둔다.

선택 node는 orange border + 약한 glow. 나머지 그래프를 dim 처리하지 않는다. 연결된 edge만 accent로 강조한다.

---

## 4. Typography

개발자 도구이므로 compact하다. Node 안 글자는 크게 만들지 않는다.

| Role | Size | Weight |
|------|------|--------|
| Page title | 14–16px | medium |
| Section title | 13–14px | medium |
| Node name | 13px | medium |
| Inspector body | 13px | regular |
| Metadata / latency | 11px | regular |
| Type label / timeline | 10–11px | regular / medium |
| Raw JSON | 11px mono | regular |

Font: Geist Sans / Geist Mono.

---

## 5. Layout

Run Detail 기본 골격:

```text
┌──────────────────────────────────────────────────────────┐
│ Header  ← Runs    name / #id    ● status    Analyze      │
├────────────────────────────────────────────┬─────────────┤
│                                            │ Inspector   │
│              DAG Canvas                    │ (on select) │
│                                            │             │
├────────────────────────────────────────────┴─────────────┤
│ Timeline                                                 │
└──────────────────────────────────────────────────────────┘
```

- Header height: 48px
- Inspector width: 28%, min 280px, max 380px
- Canvas: remaining space, not a dashboard card
- Timeline: compact bar, not a second graph

---

## 6. Node

Node는 작은 surface다. 카드가 아니다.

```text
┌─────────────────────┐
│ ● Research Agent    │
│   Agent             │
│   ✓ 3.21s           │
└─────────────────────┘
```

권장 크기: **188 × 70**.

Node에 넣는 것:

- status indicator
- name
- type label
- status + latency

Node에 넣지 않는 것:

- 긴 prompt / response
- token breakdown
- cost
- JSON
- stack trace
- 장식 아이콘, 설명 문장

Type 구분은 작은 label만 사용한다. Agent=blue, Tool=green, LLM=purple 같은 type coloring은 금지.

---

## 7. Edge & Canvas

- thin, low-contrast line
- smooth / rounded
- directional arrow
- default stroke `#3f3f46`
- selected connection만 `#e0783a`
- 상시 움직이는 edge animation 금지
- background: subtle dot grid, 장식이 되지 않을 만큼만
- pan, wheel zoom, Fit View 필수
- node drag는 하지 않는다. 이건 editor가 아니라 debugger다
- graph가 커지면 minimap으로 navigation만 보조

방향은 기본 **Top → Bottom**. 자동 layout으로 overlap과 crossing을 줄인다.

---

## 8. Inspector

DAG는 overview, Inspector는 details.

보여줄 수 있는 것:

- status, duration, agent, ids, timestamps
- failure / error message
- input / output

닫기 버튼으로 선택 해제. 선택 해제 시 Inspector는 사라지고 Canvas가 다시 100%가 된다.

---

## 9. Interaction

| Action | Result |
|--------|--------|
| Click node | select + open Inspector |
| Click pane | deselect + close Inspector |
| Hover node | short tooltip (status, duration). payload 금지 |
| Double click | focus that node |
| Timeline chip | select the same node |
| Zoom / Fit View | canvas controls |

---

## 10. Do not

- 큰 카드형 node, 이모지 히어로, 마케팅 카피
- type별 강한 색면
- node 안에 prompt/response/token/cost를 전부 넣기
- 그래프가 계속 움직이는 animation
- Inspector를 항상 열어두기

---

## 11. Code map

구현이 이 문서를 어기면 코드를 고친다. 문서를 코드에 맞추지 않는다. 예외가 필요하면 이 파일에 먼저 적는다.

| Piece | File |
|-------|------|
| Tokens / canvas chrome | `src/app/globals.css` |
| Layout engine | `src/lib/dag-layout.ts` |
| Canvas | `src/components/ExecutionGraph.tsx` |
| Node | `src/components/dag/SpanNode.tsx` |
| Inspector | `src/components/dag/Inspector.tsx` |
| Timeline | `src/components/dag/Timeline.tsx` |
| Run Detail | `src/app/trace/[traceId]/page.tsx` |

DAG feature spec: [`DESIGN.md`](./DESIGN.md)
Product spec: [`PRD.md`](./PRD.md)
