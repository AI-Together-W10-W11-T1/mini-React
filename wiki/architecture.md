# 아키텍처

> 우리 코드 기준으로 적는다. 실제 React와의 차이는 「실제 React와 차이」 절에만 둔다. 각 항목 끝의 `(출처: …)`는 근거 기록이다.

## 패키지 구조

| 패키지 | 맡는 것 | DOM 접근 | 대표 파일 |
| --- | --- | --- | --- |
| `packages/shared` | VNode · Patch · 이력 타입, 공통 상수 (`HISTORY_LIMIT = 50` · `NESTED_RENDER_LIMIT = 50`, `DOM_PROP_ELEMENTS`) | ✕ | `src/types.ts`, `src/index.ts` |
| `packages/react` | `h()`, Hook 공개 API `useState` · `useEffect` · `useMemo` (렌더 밖 호출은 오류) | ✕ | `src/h.ts`, `src/hooks.ts` |
| `packages/react-reconciler` | `diff` · `invertPatches` (Phase 1), `FunctionComponent` (`hooks` · `mount()` · `update()` · `unmount()` · `lastPatches`), `resolveComponents`, Hook 정책 | ✕ | `src/diff.ts`, `src/invertPatches.ts`, `src/FunctionComponent.ts`, `src/resolveComponents.ts`, `src/deps.ts` |
| `packages/react-dom-bindings` | `domToVNode` · `readAreaChildren` · `renderVNode` · `renderAreaChildren` · `patch` · `vnodesToHtml` · `setAreaHtml` · `checkHtml` · `setEventHandler` · `applyDomProp` | ○ (유일) | `src/client/domToVNode.ts`, `renderVNode.ts`, `patch.ts`, `sanitize.ts`, `checkHtml.ts`, `htmlScan.ts`, `vnodesToHtml.ts`, `events.ts`, `domProps.ts` |
| `packages/react-dom` | `render(component, container, options?)`, `History` (양방향 연결 리스트), `createVDomRoot` (`snapshot` · `update` · `back` · `forward`) | 바인딩 경유 | `src/render.ts`, `src/history.ts`, `src/createVDomRoot.ts` |
| `packages/scheduler` | `scheduleRender(task)` — 지금은 즉시 동기 실행 + 중첩 깊이 셈 (Batching 미구현) | ✕ | `src/scheduler.ts` |
| `fixtures/phase1-vdom-playground` | Phase 1 검증 페이지: 실제 영역 · 테스트 영역(편집창 + 미리보기), Patch · 뒤로 · 앞으로, 시각화 오버레이 | ○ | `main.ts`, `overlay.ts`, `patchErrorMessage.ts` |
| `fixtures/phase2-app` | Phase 2 검증 페이지: 루트 `App` + 칸 4개 | ○ | `App.ts`, `components/*.ts`, `todoOps.ts`, `counts.ts`, `main.ts` |
| `fixtures/perf-bench` (확장 1) | 성능 대시보드: 시나리오 B-01~B-07 반복 측정 | ○ | `scenarios.ts`, `runner.ts`, `stats.ts`, `format.ts` |

(출처: CLAUDE.md 「패키지 역할」 · task_001 `01_request_spec.md` · task_002 `03_development/dev_todo.md` 「공개 API 이름」 · task_002 `01_request_spec.md`)

### 의존 방향

- DOM 조작은 `react-dom-bindings`에서만 한다. 다른 패키지에서 `document` · `window`를 쓰지 않는다. (출처: CLAUDE.md 「패키지 역할」 · task_001 `03_development/code_review_log.md` 1회차 「확인한 것」)
- `react` · `react-reconciler` · `scheduler` · `shared`는 DOM을 만지지 않는다. (출처: task_002 `01_request_spec.md` §7)
- 탭 제목 바꾸기 · 기록판 글 쓰기는 `fixtures/phase2-app`의 effect 안에서 한다. (출처: task_002 `03_development/dev_todo.md` 공통 약속)
- `types.ts`는 마스터만 고치고 `types_changelog.md`에 남긴다. (출처: CLAUDE.md 「에이전트 워크플로」 · task_002 `03_development/types_changelog.md`)
- 자식 컴포넌트는 Hook · state 없이 props만 받는 순수 함수다. (출처: CLAUDE.md 「과제 제약」 · task_002 `01_request_spec.md` P2-09)

## 동작 흐름

### Phase 1: VDOM → Diff → Patch

```
[Patch] 테스트 영역 DOM ─readAreaChildren→ 새 VNode ─diff(저장된 마지막 기록 VNode, 새 VNode)→ 패치 목록 ─patch→ 실제 영역 DOM
                                                                                      └→ History 기록: VNode · 패치 · 역패치
```

- 비교는 실제 DOM이 아니라 저장한 VNode 두 개로 한다 (P1-33). 테스트 「저장한 VNode만 기준」으로 확인. (출처: task_001 `03_development/dev_todo.md` Dev-12)
- 패치 한 줄 = 종류 · 경로 · 전 · 후. 삭제 · 교체는 원본 VNode 통째로 넣는다. (출처: task_001 `01_request_spec.md` 결정 3)
- 경로 = 영역 상자 안 자식부터 번호를 센 배열. 목록 순서대로 하나씩 적용하고, 경로는 그 순간의 트리 기준이다. (출처: task_001 `01_request_spec.md` 결정 4)
- diff 순서: 겹치는 자리는 재귀 → 남는 옛 자식은 뒤에서부터 REMOVE → 남는 새 자식은 앞에서부터 INSERT. (출처: task_001 `03_development/dev_todo.md` 공통 약속)
- 뒤로 · 앞으로: 실제 영역은 역패치(`invertPatches`, 이미 역순)를 적용하고, 테스트 영역 · 편집창은 저장한 VNode로 다시 그린다 (`renderAreaChildren` · `vnodesToHtml`). (출처: task_001 `01_request_spec.md` 결정 7 · `03_development/dev_todo.md` Dev-13)
- Patch 전 검사: 편집창 글을 `checkHtml`로 훑어 위험 코드 · 태그 짝 · 구조 불일치 · SVG를 찾고, 문제가 있으면 alert로 막는다. 기록은 그대로. (출처: task_001 `01_request_spec.md` 정책 · `03_development/dev_todo.md` Dev-9 · Dev-10)
- Patch 도중 예외: 기록은 그대로 두고, 실제 영역을 마지막 기록 VNode로 다시 그린 뒤 예외를 알린다. (출처: task_001 `03_development/dev_todo.md` 공통 약속 C2)

### Phase 2: FunctionComponent · Hooks

```
setter 호출 → 즉시 동기 렌더 (App() 재실행 → 새 VNode) → resolveComponents (자식 컴포넌트를 그 자리에서 풀기)
            → diff(저장한 이전 VNode, 새 VNode) → patch (바뀐 곳만) → effect (의존성 기준)
```

- 이전 VNode는 `mount()` · `update()` 때 만든 VNode 자체를 저장하고, DOM에서 다시 읽지 않는다. (출처: task_002 `01_request_spec.md` 묶음 5)
- `hooks` 배열에 Hook을 부른 순서대로 저장하고, 렌더마다 0번부터 센다. (출처: task_002 `01_request_spec.md` 정책 · `00_master_dialogue.md` CheckPoint)
- `if` · `for` 안 Hook은 금지. Hook 개수가 달라지면 오류, 자식 컴포넌트 실행 중 Hook 호출은 오류. (출처: task_002 `01_request_spec.md` 정책)
- effect는 patch 직후 실행한다. 의존성 생략 = 매 렌더 뒤 · `[]` = 처음 한 번 · `[a, b]` = 항목별 `Object.is` (길이가 다르면 바뀐 것). cleanup은 다시 실행 직전과 `unmount()` 때. 렌더가 연달아 50번 넘으면 오류. (출처: task_002 `01_request_spec.md` 정책)
- 같은 값(`Object.is`)이면 다시 그리지 않는다. 함수형 setter · 지연 초기화 `useState(() => …)` 지원. (출처: task_002 `01_request_spec.md` 정책)
- 입력창 요소는 새로 만들지 않고 그 자리에서 고친다 → 포커스 · 커서 유지. `value` · `checked`는 실제 값과 다를 때만 프로퍼티로 넣는다. (출처: task_002 `01_request_spec.md` §4.3)
- 이벤트: 요소마다 이벤트 이름당 리스너를 한 번만 등록하고, 다시 렌더할 때는 저장된 핸들러만 바꾼다. (출처: task_002 `01_request_spec.md` 결정 8)

### 검증 페이지 (task_002 `fixtures/phase2-app`)

| 칸 | 컴포넌트 | 동작 | 확인하는 것 |
| --- | --- | --- | --- |
| ① 카운터 | `CounterPanel` | [+1] · [+3] (함수형 setter 3번) · [그대로] (같은 값) | useState 초기값 · 유지 · 함수형 setter · 같은 값 정책 |
| ② 입력창 | `GreetingPanel` | 이름 입력 → "안녕하세요, ○○님" | `value` · `input`, 포커스 · 커서 유지 |
| ③ 목록 | `TodoPanel` · `TodoRow` | 추가 · 체크 · [위로] · [아래로] · [삭제], "전체 n개 · 완료 m개" (`useMemo`). key = 항목 id (`todo-1` …, 지운 번호 재사용 안 함) | [위로] · [아래로] 뒤 같은 key 노드 유지 (MOVE), `checked` · `click`, D-03 · D-04 |
| ④ 기록판 | `LogPanel` | 렌더 · effect · memo 횟수, 마지막 update의 patch 줄 수, 탭 제목에 카운터 값 | effect 실행 조건 · DOM 반영 뒤 실행 · 부분 갱신 |

(출처: task_002 `01_request_spec.md` 「검증 페이지」) 횟수는 상태가 아닌 바깥 변수로 센다. [+3]은 렌더 3번이 된다 (정책으로 기록, PRD §4.2). (출처: task_002 `01_request_spec.md` 4절)

## 알고리즘 결정 요약

| 결정 | 선택 | 이유 (사용자 말) | 버린 후보 · 이유 | 기록 |
| --- | --- | --- | --- | --- |
| 1 텍스트 노드 표현 | B. TEXT 노드 객체 `{ type: '#text', props: { nodeValue }, children: [] }` | "\"님\"을 경로로 가리키면서 불필요한 태그 혹은 id값을 지정하지 않아도 돼서" | A 문자열 — 경로로 셀 수 없고 분기가 늘어남 | task_001 `01_request_spec.md` · `00_master_dialogue.md` CheckPoint |
| 2 diff 자식 비교 | 필수: 위치 기반 / Key 확장: B. key 표 (key 없거나 중복이면 위치 비교) | 필수: "태그가 같으면 그 자리에서 고치고 다르면 새로 만들어." / Key: "html에서 지정한 id값을 통해 비교하는 방식으로 진행하자" | C 양끝 비교 · D 최장 증가 부분 수열 — 분기 · 설명량, 마감 / 값(내용)으로 짝짓기 — 같은 내용 · 내용 변경 · 항목 상태에서 깨짐 | task_001 `01_request_spec.md` 결정 2 · `00_master_dialogue.md` Q6 |
| 3 diff 결과 전달 | A. 패치 목록 (한 줄 = 종류 · 경로 · 후 · 전) | 사용자 "그렇게 만든 목록보고 dom에서 다른 부분만 수정한다." | B. DOM 연산 주입 — 역패치 재료가 없음 | task_001 `01_request_spec.md` 결정 3 · `00_master_dialogue.md` Q5 |
| 4 patch 대상 찾기 | A. 경로(인덱스 배열) + 목록 순서대로 적용 | 결정 1과 같음 (경로로 가리키기) | ① 이름(id) — 글자 노드에 이름표를 못 붙이고 편집창이 지저분 / C 경로 + 참조 선수집 — 역순 되돌리기와 안 맞음 / B VNode에 DOM 참조 — 두 영역 참조가 꼬임 | task_001 `01_request_spec.md` 결정 4 · `00_master_dialogue.md` Q9 |
| 되돌리는 순서 | 역순 (나중에 한 일부터 거꾸로) | 결정 1과 같음 | 인덱스 보정 — 혼자 순서대로 고치는 상황이라 불필요 (사용자 별도 이유 없음) | task_001 `01_request_spec.md` 결정 표 |
| 5 공백 · 주석 | B. 모두 유지 + 주석 VNode 추가 | "공백 주석도 포함하여야 개발자의 의도가 포함된 거라 생각" | A 공백만 있는 텍스트 제거 — 실제 영역 초기 DOM과 경로가 어긋남 / C 공백 접기 | task_001 `01_request_spec.md` 결정 5 · `00_master_dialogue.md` Q10 |
| 6 테스트 영역 수정 | A. HTML 편집창 + 미리보기 | "UI적인 선택" | ① contenteditable + 태그 입력 변환 — 기존 요소의 태그 · 속성 변경 불가 / C 둘 다 — e2e 두 벌 | task_001 `01_request_spec.md` 결정 6 · `00_master_dialogue.md` Q11 |
| 7 State History 저장 | B + VNode: 기록마다 VNode · 패치 · 역패치 (보관 한도 50, 0번 포함) | "다중 사용자가 사용할 것으로 고려하여 결정" / 2차 선택: "그래도 b로 변경하여 다른 툴들이 히스토리 구현하는 방식을 공부하고 싶어" | A VNode 스냅샷만 — 역패치 공부가 빠짐 / B 패치만 — 과제 원문 "새로 변경된 Virtual DOM 은 State History 에 저장"과 어긋남 / C HTML 문자열 — 전체 교체 · 핸들러 소실 | task_001 `01_request_spec.md` 결정 7 · `00_master_dialogue.md` Q7 |
| 7-1 History 자료구조 | 양방향 연결 리스트 (head · current · 개수). 뒤로 · 앞으로 = prev · next | "히스토리 자료구조는 최대 저장 50개를 넘어설 때, 맨 앞의 VDOM 기록을 빼기 위함" | 배열 — 맨 앞 빼기 때 위치 번호 보정 필요 / 스택 두 개 — 한도 때 맨 아래 빼기 문제가 같음 | task_001 `01_request_spec.md` 결정 7 세부 · `00_master_dialogue.md` Q13 |
| 8 Key 출처 (확장) | Phase 1 화면은 key 없음 (위치 기반만). Key 엔진은 단위 테스트로 검증, 화면 시연은 Phase 2 데이터 id (`todo-1` …) | "사용자가 key값 수정 방지 위해" | 엔진 번호 + 편집창 `data-key` 보이기 — 편집창이 지저분 / 숨기고 엔진이 기억했다 다시 넣기 — 짝지을 단서가 위치 · 내용뿐 | task_001 `01_request_spec.md` 「Key 출처」 · `00_master_dialogue.md` Q13 |
| 9 Diff 시각화 (확장) | 스위치(기본 꺼짐) + 실제 영역 위 오버레이로 바뀐 노드만 깜빡임 (Patch · 뒤로 · 앞으로) | "diff는 사용자 입장에서 필요 없기에 on off로 선택" | 빼기 / 실제 노드에 class 붙이기 — 측정 오염, 연속 Patch 때 엉킴 / 고칠 일 목록 패널 — 깜빡임만으로 충분 | task_001 `01_request_spec.md` 「확장」 · `00_master_dialogue.md` Q14 |
| 10 이벤트 props (결정 8) | B. 리스너 하나 + 핸들러 교체. `on` + 대문자 · 함수 값 = 이벤트 (`onClick` → `click`) | "바뀐 곳만 고친다는 원칙을 지키려고" (1차 A 선택 → 표 비교 뒤 B로 바꿈) | A 바뀔 때마다 remove · add — 렌더마다 핸들러가 새 함수라 등록 취소 · 등록이 생김 / C 루트 위임 — 구현량, 항목 수가 적어 불필요 | task_002 `01_request_spec.md` 결정 8 · `00_master_dialogue.md` Q5 |
| 11 재렌더 시점 (결정 9) | A. 즉시 동기 — setter를 부르면 바로 렌더 + diff + patch | "마감이 빠듯해서 시간이 남으면 배칭 구현한다고 메모해줘" / 마지막: "배칭은 구현하지 말자" | B. 마이크로태스크 Batching (`queueMicrotask`) — 마감, 테스트에 `await` 필요 / C. `requestAnimationFrame` — 최대 약 16ms 늦음, jsdom 테스트 불편 | task_002 `01_request_spec.md` 결정 9 · `00_master_dialogue.md` Q4 · 마무리 |
| 12 Hook 정책 묶음 1~5 | 부른 순서로 `hooks` 배열 · 함수형 setter · 같은 값 무시 · 지연 초기화 · effect 의존성 3종 · cleanup · 무한 렌더 50번 · `useMemo` 의존성 · 자식 풀기 · key = 항목 id · `h()` 입력 규칙 | 추천안 수용 ("응") — 사용자 별도 이유 없음 | 버린 후보 기록 없음 (추천안 표로만 확정) | task_002 `00_master_dialogue.md` 「빠르게: 추천안 표」 · `01_request_spec.md` 정책 |

## 실제 React와 차이

| 항목 | 우리 구현 | 실제 React | 기록 |
| --- | --- | --- | --- |
| 변경 적용 방식 | 고칠 일 목록(패치 목록)을 만들고, 목록대로 수정된 부분만 고친다 | 별도 목록 대신 노드마다 표시(flag)를 남긴다 | task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| 같은 key 재정렬 (`[a,b,c]→[b,c,a]`) | MOVE 2번 (보충 설명 기준) | 이미 순서가 맞는 항목은 두어 1번 (보충 설명 기준) | task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| key가 없는 자식 | 위치 기반 비교 (key 없음 · 중복 key도 위치 비교) | 위치로 짝짓고 경고 (보충 설명 기준) | task_001 `01_request_spec.md` 결정 2 · `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| History | 있음. 패치 · 역패치 + VNode 기록, 양방향 연결 리스트 | 없음. 공식 튜토리얼은 앱이 상태 스냅샷을 쌓는 방식 (보충 설명 기준) | task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| 재렌더 시점 | setter마다 즉시 동기 렌더 (결정 9 A). Batching 미구현 | setter 호출을 모아 한 번 렌더 (18 이후, 마스터 설명) | task_002 `00_master_dialogue.md` Q4 · `01_request_spec.md` 결정 9 |

같은 점: 고칠 목록을 만들고, 목록을 바탕으로 수정된 부분만 고친다 (사용자 한 줄 요약). (출처: task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17)

## 알려진 한계

- SVG 미지원: Patch 때 검사로 막는다. 사용자 결정으로 구현하지 않음. (출처: task_001 `01_request_spec.md` 정책 · task_002 `00_master_dialogue.md` 마무리)
- Key 확장은 단위 테스트로만 검증 (Phase 1 화면에는 key 없음). 이동 횟수는 최소가 아니다. (출처: task_001 `07_pr_body.md` 「알려진 한계」)
- 공백 · 주석을 노드로 남기므로, 들여쓰기만 바꿔도 글자 patch가 생긴다. (출처: task_001 `01_request_spec.md` 4절 · `07_pr_body.md`)
- 렌더마다 핸들러가 새 함수라 이벤트 교체 patch 줄이 늘 생긴다 (DOM 작업은 없음). (출처: task_002 `07_pr_body.md` 「알려진 한계」)
- Phase 1 편집창에서 `input` · `textarea` · `select`의 `value` · `checked` 속성을 고치면 프로퍼티만 바뀌고 속성 글은 안 바뀐다. (출처: task_002 `01_request_spec.md` 4절 · `07_pr_body.md`)
- `<select value>` + `<option>` 삭제를 한 기록에서 함께 한 뒤 「뒤로」 하면 선택값이 테스트 영역과 다를 수 있다 (드묾). (출처: task_002 `01_request_spec.md` 4절 · `03_development/code_review_log.md` 경량 검수 1회차 NB-4)
- 렌더 실패 시 setter가 바꾼 state는 남고, 화면은 다음 성공 렌더에서 맞춰진다. (출처: task_002 `07_pr_body.md` · `03_development/code_review_log.md` 1회차 NB-3)

## 성능 대시보드 (확장 1, task_002)

- 시나리오 B-01~B-07을 준비 5회 · 측정 30회 이상으로 반복, p50 · p95 기록. 측정 조건(브라우저 · 기기 · 화면 크기 · 빌드 모드)을 함께 적는다. (출처: task_002 `01_request_spec.md` 확장 1 · `04_qa_evidence/qa_todo_result.md` 캡처 ⑦)
- 계측 패널의 DOM 변경은 측정에서 뺀다. 검수 1회차에서 B-07 집계에 기록판 쓰기가 섞인 것을 찾아, 세 칸을 따로 셈 (BLOCKING → 재작업 → APPROVE). (출처: task_002 `03_development/code_review_log.md`)
- Batching 비교 시나리오는 제외. (출처: task_002 `01_request_spec.md` 확장 1)
- 실제로 한 번 측정한 값 (2026-11-11, Playwright 헤드리스 Chromium 158 · Windows, 1280 × 800, Vite dev 서버, CPU 제한 없음, 준비 5 · 측정 30, `performance.now()` 해상도 약 0.1ms). 실행마다 값이 달라 알고리즘 우열 판단에 쓰지 않는다. (출처: task_002 `03_development/dev_todo.md` Dev-26 근거 · 「경량 검수 1회차 반영」)

  | 시나리오 | 전체 M-07 p50 / p95 | patch 줄 | 노드 유지 M-03 |
  | --- | --- | --- | --- |
  | B-02 텍스트 하나 변경 (노드 507개) | 0.300 / 0.600 ms | 1 (SET_TEXT 1) | 507 / 507 |
  | B-05 여러 위치 동시 변경 | 0.300 / 0.800 ms | 5 | 507 / 507 |
  | B-06 setter 10번 연달아 (렌더 10번) | 2.700 / 3.210 ms | 10 | 507 / 507 |
  | B-07 검증 페이지 대표 동작 13번 (렌더 16번) | 1.400 / 2.410 ms (재측정) | 212 (그중 SET_EVENT 168, DOM을 바꾸지 않음) | 7 / 7 |

## 검증 결과

| task | 단위 (`npx vitest run`) | 타입 (`npx tsc --noEmit`) | 인수 (`npx playwright test`) | 출처 |
| --- | --- | --- | --- | --- |
| task_001 phase1 | 16 files · 432 passed | 오류 0 | 96 passed (desktop 48 · mobile 48) | `07_pr_body.md` · `qa_todo_result.md` |
| task_002 phase2 | 36 files · 776 passed | 오류 0 | 154 passed (desktop 77 · mobile 77 = phase1 48 + phase2 29) | `07_pr_body.md` · `qa_todo_result.md` |
