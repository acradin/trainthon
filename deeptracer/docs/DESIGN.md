# DeepTracer DAG UI Design Guidelines

## 1. Design Goal

DeepTracer의 DAG UI는 단순한 workflow editor가 아니라 **AI Agent 실행 과정을 시각적으로 탐색하는 Observability Canvas**다.

핵심 원칙:

> **DAG = Execution Topology를 보여주는 지도**
>
> **Inspector = 선택한 Node의 상세 정보를 보여주는 공간**

DAG 내부에 너무 많은 정보를 넣지 않는다.
사용자가 그래프를 보고 "무엇이 실행되었고, 어떤 흐름으로 이어졌는지"를 빠르게 파악할 수 있어야 한다.

---

# 2. Reference Products

다음 제품의 장점을 조합한다.

### React Flow / XYFlow

참고:

* Canvas interaction
* Node UI
* Edge UI
* Zoom / Pan
* Minimap
* Background grid
* Node selection

### LangGraph Studio

참고:

* AI Agent execution graph
* Agent → Tool → Agent 구조
* Graph 중심의 execution visualization
* Node 선택 후 상세 정보 확인

### Apache Airflow

참고:

* DAG topology
* Task status visualization
* Success / Failed / Running 상태 표현
* Dependency visualization

### n8n

참고:

* Node-based canvas
* Node 내부 정보 밀도
* Branching
* Connection line
* Node interaction

---

# 3. Overall Layout

Run Detail 화면은 다음 구조를 기본으로 한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ ← Runs    research-agent / #8F29       ● Completed          │
├──────────────────────────────────────────────┬───────────────┤
│                                              │               │
│                                              │   Inspector   │
│                                              │               │
│                 DAG Canvas                   │               │
│                                              │               │
│                                              │               │
│                                              │               │
│                                              │               │
│                                              │               │
├──────────────────────────────────────────────┴───────────────┤
│ Timeline / Logs / Input / Output                             │
└──────────────────────────────────────────────────────────────┘
```

### 기본 상태

Inspector는 필요할 때만 표시한다.

```text
Canvas 100%
```

### Node 선택 상태

```text
Canvas 70~75%  |  Inspector 25~30%
```

Inspector가 열려도 DAG의 중심 구조가 최대한 유지되어야 한다.

---

# 4. DAG Canvas

## 4.1 Canvas

DAG는 별도의 독립적인 Canvas 영역으로 구현한다.

권장:

* 전체 화면의 가장 넓은 영역 사용
* Pan 지원
* Mouse wheel zoom 지원
* Zoom in / out 버튼
* Fit View 버튼
* 필요하면 Minimap 제공
* subtle background grid 사용

Canvas가 일반 Dashboard처럼 보이지 않도록 한다.

---

# 5. Graph Direction

기본 DAG 방향:

```text
Top
 ↓
Bottom
```

예:

```text
             ┌───────────┐
             │  Planner  │
             └─────┬─────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
    ┌───────────┐     ┌───────────┐
    │  Search   │     │  Browser  │
    └─────┬─────┘     └─────┬─────┘
          │                 │
          └────────┬────────┘
                   ▼
             ┌───────────┐
             │ Research  │
             └─────┬─────┘
                   ▼
             ┌───────────┐
             │  Writer   │
             └───────────┘
```

복잡한 graph에서는 자동 layout을 사용한다.

가능하면 DAG layout engine을 사용하여:

* node overlap 방지
* branch 정렬
* edge crossing 최소화
* 일정한 spacing

을 유지한다.

---

# 6. Node Design

Node는 너무 크거나 카드처럼 무겁게 만들지 않는다.

기본 형태:

```text
┌─────────────────────┐
│ ●  Planner          │
│    Agent            │
│                     │
│    ✓  1.24s         │
└─────────────────────┘
```

하지만 기본 상태에서는 정보를 최소화한다.

권장 기본 Node 정보:

```text
[status indicator] [name]
[type]
[status] [latency]
```

예:

```text
┌─────────────────────┐
│ ● Research Agent    │
│   Agent             │
│   ✓ 3.21s           │
└─────────────────────┘
```

Node 안에 다음 정보를 넣지 않는다:

* 긴 prompt
* 전체 LLM response
* 긴 log
* 전체 token breakdown
* JSON
* stack trace
* 긴 metadata

이런 정보는 Inspector에서 보여준다.

---

# 7. Node Types

Type을 구분하는 방법은:

* 작은 type label
* icon
* subtle shape difference

정도로 제한한다.

Node마다 지나치게 다른 색을 사용하지 않는다.

---

# 8. Node Status

Node status는 시각적으로 즉시 구분 가능해야 한다.

최소 상태:

```text
Running
Success
Failed
Skipped
Pending
```

표현 예:

```text
● Running
✓ Success
× Failed
– Skipped
○ Pending
```

Status color는 **작은 indicator와 border/accent 정도에만 사용**한다.

Node 전체를 강한 색으로 채우지 않는다.

---

# 9. Selected Node

Node를 클릭하면 선택 상태를 명확하게 보여준다.

기본:

```text
┌─────────────────────┐
│ ● Research Agent    │
│   Agent             │
│   ✓ 3.21s           │
└─────────────────────┘
```

선택:

```text
╔═════════════════════╗
║ ● Research Agent    ║
║   Agent             ║
║   ✓ 3.21s           ║
╚═════════════════════╝
```

선택된 Node는:

* border 강조
* subtle glow 또는 accent
* connected edge 강조

정도로 처리한다.

전체 graph를 흐리게 만들 필요는 없다.

---

# 10. Edge Design

Edge는 Node보다 시각적 우선순위가 낮아야 한다.

기본:

```text
Node
  │
  │
  ▼
Node
```

권장:

* thin line
* rounded / smooth edge
* directional arrow
* low contrast
* selected node와 연결된 edge만 강조

실행 순서를 보여주는 경우에는 edge animation을 사용할 수 있다.

단, 항상 움직이는 animation은 사용하지 않는다.

---

# 11. Branching

Agent workflow에서 branching은 매우 중요하다.

예:

```text
                Planner
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Search            Browser
          │                 │
          └────────┬────────┘
                   ▼
                Research
```

Branching이 발생하면 edge가 자연스럽게 분기되도록 한다.

Branch가 많아져도 node를 임의로 겹치지 않는다.

---

# 12. Failed Node

실패한 Node는 graph에서 빠르게 발견할 수 있어야 한다.

예:

```text
             ┌──────────────┐
             │ ✕ Search    │
             │   Tool      │
             │   31.4s     │
             └──────────────┘
```

실패 Node를 클릭하면 Inspector에서:

```text
Failure
────────────────────
Error
TimeoutError

Duration
31.4s

Retry
2

Error message
...

Stack trace
...
```

를 보여준다.

---

# 13. Inspector

Node를 선택하면 오른쪽 Inspector를 표시한다.

예:

```text
┌────────────────────────────┐
│ Research Agent          ×  │
├────────────────────────────┤
│                            │
│ Status                     │
│ ✓ Success                  │
│                            │
│ Duration                   │
│ 3.21s                      │
│                            │
│ Model                      │
│ GPT-5                      │
│                            │
│ Tokens                     │
│ 4,281                     │
│                            │
│ Cost                       │
│ $0.032                     │
│                            │
├────────────────────────────┤
│ Input                      │
│ ...                        │
│                            │
├────────────────────────────┤
│ Output                     │
│ ...                        │
│                            │
└────────────────────────────┘
```

Inspector는 **정보를 많이 보여줘도 괜찮다.**

즉:

```text
DAG → Overview
Inspector → Details
```

라는 역할을 명확하게 유지한다.

---

# 14. Graph Interaction

반드시 지원:

### Zoom

```text
+  -
```

### Fit View

전체 DAG가 화면에 들어오도록 자동 조정.

### Pan

Canvas를 드래그하여 이동.

### Node click

Node 선택 + Inspector open.

### Edge click

가능하다면 해당 dependency / transition 정보 표시.

### Double click

해당 Node의 상세 Trace로 이동.

---

# 15. Hover Interaction

Node hover 시 간단한 tooltip을 제공한다.

예:

```text
Research Agent

Status: Success
Duration: 3.21s
Tokens: 4,281
Cost: $0.032
```

Hover tooltip에는 상세 내용을 넣지 않는다.

---

# 16. Minimap

Graph가 커질 가능성이 있으므로 Minimap을 지원한다.

위치:

```text
                         ┌──────────────┐
                         │  ┌─┐         │
                         │  │ │         │
                         │  └─┘         │
                         └──────────────┘
```

Minimap은 작은 크기로 유지한다.

Graph navigation을 보조하는 용도로만 사용한다.

---

# 17. Background

배경은 매우 subtle한 grid를 사용한다.

예:

```text
·  ·  ·  ·  ·  ·  ·
  ·  ·  ·  ·  ·  ·
·  ·  ·  ·  ·  ·  ·
```

Grid가 디자인 요소처럼 눈에 띄면 안 된다.

목적은 Canvas의 공간감을 제공하는 것뿐이다.

---

# 18. Visual Style

전체적인 방향:

> Modern developer infrastructure / observability tool

참고:

* Linear
* Vercel
* LangGraph Studio
* React Flow

### 색상

Dark theme을 기본으로 한다.

```text
Background
→ near-black / dark gray

Surface
→ slightly lighter dark gray

Border
→ subtle gray

Text
→ white / light gray

Secondary text
→ muted gray

Accent
→ 하나의 primary accent

Success
→ subtle green

Error
→ subtle red

Warning
→ subtle yellow
```

색상을 많이 사용하지 않는다.

특히 Node마다 서로 다른 색을 사용하는 것은 피한다.

---

# 19. Typography

정보 밀도가 높은 개발자 도구이므로 typography는 compact하게 한다.

권장 hierarchy:

```text
Page title
16~20px

Section title
13~14px

Node name
12~14px

Metadata
11~12px

Secondary information
10~11px
```

Node 내부 typography는 너무 크지 않게 한다.

---

# 20. What NOT to Do

다음 스타일은 피한다.

### ❌ 과도한 카드 디자인

```text
╭────────────────────────╮
│       🤖               │
│                        │
│    Research Agent      │
│                        │
│  AI-powered research   │
│                        │
│     $0.034 / 4.2s      │
╰────────────────────────╯
```

DAG Node가 너무 큰 카드처럼 보이면 안 된다.

### ❌ 과도한 색상

Agent = blue
Tool = green
LLM = purple
Retriever = orange
Evaluator = pink

처럼 모든 Node를 강하게 색칠하지 않는다.

### ❌ 정보 과밀

Prompt / response / token / cost / metadata / logs 등을 Node 안에 모두 표시하지 않는다.

### ❌ 과도한 animation

Graph가 계속 움직이면 observability UI의 가독성이 떨어진다.

---

# 21. Recommended Final Visual Direction

DeepTracer DAG의 최종적인 인상은 다음과 같아야 한다.

```text
             DeepTracer

        ┌─────────────────────┐
        │ ● Planner           │
        │   Agent   ✓ 1.2s    │
        └──────────┬──────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
   ┌─────────────┐   ┌─────────────┐
   │ ● Search    │   │ ● Browser   │
   │   Tool      │   │   Tool      │
   │   ✓ 0.8s    │   │   ✓ 1.4s    │
   └──────┬──────┘   └──────┬──────┘
          │                 │
          └────────┬────────┘
                   ▼
            ╔═══════════════╗
            ║ ● Research    ║
            ║   Agent       ║
            ║   ✓ 3.2s      ║
            ╚═══════════════╝
                   │
                   ▼
            ┌───────────────┐
            │ ● Writer      │
            │   Agent       │
            │   ✓ 1.1s      │
            └───────────────┘
```

**전체적인 느낌은 “workflow builder”보다 “execution debugger / observability canvas”에 가깝게 만든다.**

---

# 22. Implementation Priority

MVP에서는 아래 순서로 구현한다.

### P0

1. DAG Canvas
2. Node
3. Edge
4. Auto layout
5. Zoom / Pan
6. Fit View
7. Node selection
8. Inspector
9. Success / Failed / Running status

### P1

10. Minimap
11. Edge animation
12. Hover tooltip
13. Timeline 연동
14. Node ↔ Trace 연동

### P2

15. Graph filtering
16. Graph collapse / expand
17. Aggregated / Expanded view
18. Critical path highlighting
19. Failure path highlighting

---

# Final Design Principle

DeepTracer의 DAG UI에서 가장 중요한 원칙은 다음 한 문장이다.

> **“Make the graph easy to read, not impressive to look at.”**

그래프는 화려한 visualization이 아니라 **Agent execution을 빠르게 이해하고 문제의 원인을 찾기 위한 인터페이스**여야 한다.

따라서:

**Topology → DAG**

**Details → Inspector**

**Execution order → Timeline**

**Raw data → Logs / Input / Output**

으로 역할을 분리한다.
