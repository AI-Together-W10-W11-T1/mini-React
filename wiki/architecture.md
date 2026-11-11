# 아키텍처

> 우리 코드 기준으로 적는다. 실제 React와의 차이는 「실제 React와 차이」 절에만 둔다. 각 항목 끝의 `(출처: …)`는 근거 기록이다. task_005 · 006 · 007에서 바뀐 항목은 `(task_00N에서 변경)`을 붙이고 새 내용으로 고쳤다. 옛 내용은 해당 항목 안에 「이전」으로 남겼다.

## 패키지 구조

| 패키지 | 맡는 것 | DOM 접근 | 대표 파일 |
| --- | --- | --- | --- |
| `packages/shared` | VNode · Patch · 이력 타입, 공통 상수 (`HISTORY_LIMIT = 50` · `NESTED_RENDER_LIMIT = 50`, `DOM_PROP_ELEMENTS`) | ✕ | `src/types.ts`, `src/index.ts` |
| `packages/react` | `h()`, Hook 공개 API `useState` · `useEffect` · `useMemo` (렌더 밖 호출은 오류) | ✕ | `src/h.ts`, `src/hooks.ts` |
| `packages/react-reconciler` | `diff` · `invertPatches` (Phase 1), `FunctionComponent` (`hooks` · `mount()` · `update()` · `unmount()` · `lastPatches`), `resolveComponents`, Hook 정책 | ✕ | `src/diff.ts`, `src/invertPatches.ts`, `src/FunctionComponent.ts`, `src/resolveComponents.ts`, `src/deps.ts` |
| `packages/react-dom-bindings` | `domToVNode` · `readAreaChildren` · `renderVNode` · `renderAreaChildren` · `patch` · `vnodesToHtml` · `setAreaHtml` · `checkHtml` · `setEventHandler` · `applyDomProp` | ○ (유일) | `src/client/domToVNode.ts`, `renderVNode.ts`, `patch.ts`, `sanitize.ts`, `checkHtml.ts`, `htmlScan.ts`, `vnodesToHtml.ts`, `events.ts`, `domProps.ts` |
| `packages/react-dom` | `render(component, container, options?)`, `History` (양방향 연결 리스트), `createVDomRoot` (`snapshot` · `update` · `back` · `forward`) | 바인딩 경유 | `src/render.ts`, `src/history.ts`, `src/createVDomRoot.ts` |
| `packages/scheduler` | `scheduleRender(owner, task)` — `queueMicrotask`로 컴포넌트(owner)당 렌더 예약 1번 (Batching, 결정 9 B) + 연달아 50번 안전장치 + 렌더 오류 처리 함수 `setRenderErrorHandler`(기본 = 다시 던지기) | ✕ | `src/scheduler.ts` |
| `fixtures/phase1-vdom-playground` | Phase 1 검증 페이지: 실제 영역 · 테스트 영역(편집창 + 미리보기), Patch · 뒤로 · 앞으로, 시각화 오버레이 | ○ | `main.ts`, `overlay.ts`, `patchErrorMessage.ts` |
| `fixtures/phase2-app` | Phase 2 검증 페이지: 루트 `App` + 칸 4개 | ○ | `App.ts`, `components/*.ts`, `todoOps.ts`, `counts.ts`, `main.ts` |
| `fixtures/perf-bench` (확장 1) | 성능 대시보드: 시나리오 B-01~B-07 반복 측정 | ○ | `scenarios.ts`, `runner.ts`, `stats.ts`, `format.ts` |
| `fixtures/mini-figma` (task_004 시연 앱, task_005 · 006 · 007에서 변경) | Figma Components · Variables 시연. 루트 `App`(Hook 8칸, 아래 상태 표) + `components/`(`Toolbar` · `Canvas` · `LayerPanel` · `VariablePanel` · `PropertyPanel` · `ColorPalette` · `PreviewPanel` · `Button` · `Icons`) + 순수 모듈 `model.ts` · `color.ts` · `keys.ts` · `previewVNode.ts` · `previewNav.ts` · `previewDocs.ts`, 실제 영역 연결 `preview.ts`(Hook 없음). 엔진은 `@mini-react/*`로 가져다 씀 | ○ | `App.ts`, `model.ts`, `color.ts`, `keys.ts`, `preview.ts`, `previewVNode.ts`, `previewNav.ts`, `previewDocs.ts`, `components/*.ts` |

(출처: CLAUDE.md 「패키지 역할」 · task_001 `01_request_spec.md` · task_002 `03_development/dev_todo.md` 「공개 API 이름」 · task_002 `01_request_spec.md` · task_004 `03_development/dev_todo.md` 「폴더 구성」 · task_006 · task_007 `03_development/dev_todo.md` 「폴더 구성」)

### 의존 방향

- DOM 조작은 `react-dom-bindings`에서만 한다. 다른 패키지에서 `document` · `window`를 쓰지 않는다. (출처: CLAUDE.md 「패키지 역할」 · task_001 `03_development/code_review_log.md` 1회차 「확인한 것」)
- `react` · `react-reconciler` · `scheduler` · `shared`는 DOM을 만지지 않는다. (출처: task_002 `01_request_spec.md` §7)
- 탭 제목 바꾸기 · 기록판 글 쓰기는 `fixtures/phase2-app`의 effect 안에서 한다. (출처: task_002 `03_development/dev_todo.md` 공통 약속)
- `types.ts`는 마스터만 고치고 `types_changelog.md`에 남긴다. (출처: CLAUDE.md 「에이전트 워크플로」 · task_002 `03_development/types_changelog.md`)
- 자식 컴포넌트는 Hook · state 없이 props만 받는 순수 함수다. (출처: CLAUDE.md 「과제 제약」 · task_002 `01_request_spec.md` P2-09)
- 시연 앱 `fixtures/mini-figma`는 `packages/`를 고치지 않고 `@mini-react/*`로만 가져다 쓴다 (MF-02 · FD · PP · VR 공통). Hook은 `App`에서만 부르고, 자식은 props만 받는다. `model.ts` · `color.ts` · `keys.ts` · `previewVNode.ts` · `previewNav.ts` · `previewDocs.ts`는 DOM · Hook이 없는 순수 함수다. `preview.ts`는 Hook만 없고 엔진 · DOM을 쓴다. `rootOnlyHooks.test.ts`가 확인. (출처: task_004 `01_request_spec.md` MF-02 · MF-04 · task_006 `03_development/dev_todo.md` 공통 주의 6 · 7 · Dev-7 · Dev-8 · task_007 `03_development/dev_todo.md` 공통 주의 8) (task_006에서 변경: `undo.ts` 삭제, 순수 모듈 목록 바뀜)

## 동작 흐름

### Phase 1: VDOM → Diff → Patch

```
[Patch] 테스트 영역 DOM ─readAreaChildren→ 새 VNode ─diff(저장한 마지막 기록 VNode, 새 VNode)→ 패치 목록 ─patch→ 실제 영역 DOM
                                                                                      └→ History 기록: VNode · 패치 · 역패치
```

- 비교는 실제 DOM이 아니라 저장한 VNode 두 개로 한다 (P1-33). 테스트 「저장한 VNode만 기준」으로 확인. (출처: task_001 `03_development/dev_todo.md` Dev-12)
- 패치 한 줄 = 종류 · 경로 · 전 · 후. 삭제 · 교체는 원본 VNode 통째로 넣는다. (출처: task_001 `01_request_spec.md` 결정 3)
- 경로 = 영역 상자 안 자식부터 번호를 센 배열. 목록 순서대로 하나씩 적용하고, 경로는 그 순간의 트리 기준이다. (출처: task_001 `01_request_spec.md` 결정 4)
- diff 순서: 겹치는 자리는 재귀 → 남는 옛 자식은 뒤에서부터 REMOVE → 남는 새 자식은 앞에서부터 INSERT. (출처: task_001 `03_development/dev_todo.md` 공통 약속)
- 뒤로 · 앞으로: 실제 영역은 역패치(`invertPatches`, 이미 역순)를 적용하고, 테스트 영역 · 편집창은 저장한 VNode로 다시 그린다 (`renderAreaChildren` · `vnodesToHtml`). (출처: task_001 `01_request_spec.md` 결정 7 · `03_development/dev_todo.md` Dev-13)
- Patch 전 검사: 편집창 글을 `checkHtml`로 훑어 위험 코드 · 태그 짝 · 구조 불일치 · SVG를 찾고, 문제가 있으면 alert로 막는다. 기록은 그대로. (출처: task_001 `01_request_spec.md` 정책 · `03_development/dev_todo.md` Dev-9 · Dev-10)
- Patch 도중 예외: 기록은 그대로 두고, 실제 영역을 마지막 기록 VNode로 다시 그린 뒤 예외를 알린다. (출처: task_001 `03_development/dev_todo.md` 공통 약속 C2)

### 실제 영역 · State History · 두 영역 함께 되돌리기 (task_006 추가)

```
[Patch] 테스트 영역 DOM ─readAreaChildren→ 정리(toRealVNodes) → 새 VNode ─update: diff(저장한 이전 VNode, 새 VNode)→ 패치 목록 ─patch→ 실제 영역 DOM
                                                              └→ 기록: VNode · 패치 · 역패치 (한도 50) + 바뀐 노드 깜빡임 (덧칠 층)
                                                              └→ 앱: 같은 칸 번호로 doc 사본 저장 (previewDocs)

[실행 취소 · 다시 실행]
   실제 영역: back() · forward() (엔진 역패치 · 스냅샷)
 + 테스트 영역: 그 칸의 doc 사본을 setDoc (DOM에서 다시 읽지 않음)
```

- 실제 영역 상자는 자식 없는 빈 `<div>`(`inert`)로 그리고, 내용은 `createVDomRoot`가 채운다. 미니 React diff는 상자 안을 모르므로 건드리지 않는다. 깜빡임 층도 빈 요소로 실제 영역 밖 형제다. (출처: task_006 `03_development/dev_todo.md` 공통 주의 5 · Dev-4)
- 정리 `toRealVNodes`: 테스트 영역 제목 빼기 · `selected` 토큰 빼기 · `data-testid` 앞에 `real-`. 입력은 고치지 않는다. (출처: task_006 `03_development/dev_todo.md` Dev-1)
- DOM에 없는 것: 이벤트 핸들러 · `key`. 그래서 실제 영역은 보기 전용이고, `SET_EVENT`가 없으며, diff는 key 없는 위치 비교다 (순서 바꾸기 = 위치별 `SET_ATTR`(`data-id`) · `SET_TEXT`, MOVE 없음). style은 글 그대로 읽혀 `SET_STYLE`의 before · after가 hex다. (출처: task_006 `03_development/dev_todo.md` 공통 주의 3 · 4)
- 깜빡임: Phase 1 `createOverlay`를 그대로 가져다 쓰고 (`onPatch` 관찰), 실제 노드에 클래스를 붙이지 않는다 (VNode와 어긋나므로). (출처: task_006 `01_request_spec.md` PP-08 · 5절 「실시간 표시」)
- 되돌리기 (PP-06 변경): Patch로 기록이 생길 때 그 순간의 `doc`을 같은 칸 번호로 저장한다 (`previewDocs.ts`, 한도 50, 앞쪽 버림). 이동하면 실제 영역은 엔진 기록으로, 테스트 영역은 그 칸의 `doc`으로 `setDoc`한다. `selectedId`는 그대로 두되 되돌린 `doc`에 없는 인스턴스면 풀고, `nextId`는 되돌리지 않는다. Patch 안 한 편집은 이동하면서 버려진다. 처음 · 끝 칸에서는 버튼이 꺼진다. (출처: task_006 `01_request_spec.md` PP-06 · 5절 「뒤로 · 앞으로」 · `03_development/dev_todo.md` Dev-8) (이전 task_006 첫 추천안: 실제 영역 기록만 — 「변경 2026-11-12T00:32」로 대체됨)
- 무변경 Patch(바뀐 것 없음)는 기록을 안 쌓고 `doc` 사본도 안 쌓는다. 「연결만 하고 Patch」도 같다 (task_007). (출처: task_006 `01_request_spec.md` PP-04 · task_007 `03_development/dev_todo.md` 공통 주의 10)

### Phase 1 · 실제 영역 방향 공통: 되돌릴 것은 DOM이 아니라 저장한 값

- 실제 영역 DOM을 다시 읽어 `doc`을 만들면 override 키 정보가 없어서 되돌릴 수 없다 → 칸마다 `doc` 사본을 저장한다. (출처: task_006 `01_request_spec.md` 5절 「뒤로 · 앞으로」 버린 후보)

### Phase 2: FunctionComponent · Hooks

```
setter 호출 → 칸 값을 바로 바꾸고 렌더 예약 (`queueMicrotask`, 컴포넌트당 1번) → 지금 코드가 끝난 직후 렌더 (App() 재실행 → 새 VNode) → resolveComponents (자식 컴포넌트를 그 자리에서 풀기)
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

(출처: task_002 `01_request_spec.md` 「검증 페이지」) 횟수는 상태가 아닌 바깥 변수로 센다. [+3]은 렌더 1번이 된다 (Batching, 정책으로 기록, PRD §4.2. task_002 즉시 동기 때는 렌더 3번). (출처: task_002 `01_request_spec.md` 4절 · task_003 `01_request_spec.md`)

### 시연 앱 mini-figma (task_004 · 005 · 006 · 007)

**상태 — `App`의 Hook 8칸** (task_006 · 007에서 변경: 앱 편집 Undo 기록 칸 제거, 보관함 · nav 추가, 레이어 접기 칸 추가). task_004의 4칸 (`doc` · `selectedId` · `history` · `nextId`)에서 `history`가 빠졌다.

| 칸 (`slot`) | Hook | 모양 | 비고 |
| --- | --- | --- | --- |
| `[0]` `doc` | useState | `{ main, instances, variables }`. `main` = `label` · `size` · `hasIcon` · `icon` · `color`. `instances` = 배열, 각 `{ id, …바꾼 값만 }`. `variables` = `{ id, name, value }` 3개 (`primary` · `danger` · `success`) | 앱 편집 기록 없음 (task_006에서 제거). 색 칸은 `#rrggbb` 또는 `'var:<id>'` (task_007) |
| `[1]` `selectedId` | useState | `'main'` · 인스턴스 id · `null` (처음 `null`) | 되돌린 `doc`에 없는 인스턴스면 `reconcileSelection`이 `null`로 바꿈 (task_006) |
| `[2]` `nextId` | useState | 처음 4. 추가 때 `'b' + nextId` | 되돌리기로 되돌리지 않음 (번호 재사용 없음, task_006 PP-06 ③) |
| `[3]` 보관함 `{ preview, track }` | useMemo | `preview` = `createPreview` 결과 (실제 영역 연결), `track` = `DocTrack` (`nav` + `doc` 사본 목록) | state가 아님. 바뀌어도 렌더를 일으키지 않고, 같은 틱 연타 때 최신 칸을 동기로 읽고 쓴다 |
| `[4]` 실제 영역 연결 | useEffect `[]` | 마운트 뒤 한 번: 테스트 영역 · `real-area` · `real-overlay`를 찾아 `createPreview` (렌더 중에는 DOM이 없어 여기서만 만듦) | cleanup = 보관함 `preview = null` |
| `[5]` `nav` | useState | `{ index, size }` — 뒤로 · 앞으로 가능 여부 | `canBack` · `canForward`로 버튼 `disabled` 계산 |
| `[6]` 키보드 | useEffect | `document`에 `keydown` 등록 + cleanup | 키 핸들러와 버튼이 같은 함수를 부름 |
| `[7]` `layersOpen` | useState | 레이어 접기 여부 | 사용자 커밋 a62dda5 (레이어 접기). 이 뒤로 App Hook 8칸 |

(출처: task_006 `03_development/dev_todo.md` Dev-4 · Dev-5 · Dev-7 · Dev-8 · 공통 주의 6 · task_007 `03_development/dev_todo.md` 「시작 전 확인」 · 「작업자 정정」)

- 이전 (task_004): `history` 칸 `{ past, future, group }` (한도 50, 같은 대상 + 같은 칸 묶음). task_006에서 앱 편집 Undo와 함께 제거. (출처: task_004 `01_request_spec.md` MF-10 · MF-30 · task_006 `01_request_spec.md` PP-12)

흐름:

```
클릭 · 입력 (엔진 이벤트 click · input) 또는 키 (document keydown)
  → 편집 · 고르기 · 팔레트 콜백 (doc · selectedId를 같은 렌더 값에서 계산) / 변수 값 바꾸기 (onVariableChange → setVariableValue)
  → [Patch] (onPreviewPatch) · [실행 취소] · [다시 실행] (onPreviewBack · onPreviewForward) — 버튼과 Ctrl/Cmd+Z · Shift+Z가 같은 함수
  → 렌더 1번 (Batching) → App() 재실행 → Toolbar · LayerPanel(→ VariablePanel) · Canvas(→ resolveColor → Button × N) · PropertyPanel(→ ColorPalette) · PreviewPanel
  → diff → patch (바뀐 곳만) → useEffect (deps 기준)
```
(출처: task_005 `03_development/dev_todo.md` 공통 주의 7 · task_006 `03_development/dev_todo.md` Dev-5 · Dev-8 · task_007 `03_development/dev_todo.md` Dev-2 · Dev-3 · 공통 주의 8)

- 키 판정 `keyAction`(`keys.ts`): Delete · Backspace = 고른 인스턴스 지우기 (Ctrl · Cmd · Alt · Shift가 하나도 없을 때만). Ctrl/Cmd+Z = [실행 취소](State History 뒤로), Ctrl/Cmd+Shift+Z = [다시 실행](State History 앞으로). 입력칸 안 Delete · Backspace는 무시. Alt 조합은 무시. (출처: task_004 `01_request_spec.md` MF-33 · MF-34 · `03_development/dev_todo.md` Q17-4 · Dev-4 · task_006 `01_request_spec.md` PP-11 · `03_development/dev_todo.md` Dev-7 「키 규칙」) (task_006에서 변경: 「되돌리기 · 다시 하기」 → State History 뒤로 · 앞으로)
- Q18 규칙 (키가 어디서 눌렸나): 입력칸 밖 · 선택 상자 · 체크박스 · 색 입력칸 = State History 뒤로 · 앞으로 + 브라우저 기본 동작 막음(`preventDefault`). 라벨 글자 칸 안 = 앱 동작 없음 · 막지 않음 (브라우저 글자 되돌리기 그대로). 색 입력칸은 task_005 ④-3에서 선택 상자류로 넓힘. (출처: task_004 `00_master_dialogue.md` 2단계 Q18 · task_005 `03_development/dev_todo.md` ④-3 · Dev-4 · task_006 `01_request_spec.md` PP-11) (task_006에서 변경: 앱 Undo → State History)
- 되돌리기 (State History, task_006): 기록이 쌓이는 것은 Patch 성공 때뿐 (`preview.patch()`가 `true`). 칸 수 · 잘림 · 경계는 `previewNav.ts`(`navPush` · `navBack` · `navForward`)가 정하고, `previewDocs.ts`(`trackPush` · `trackBack` · `trackForward` · `trackDoc`)가 같은 칸에 `doc` 사본을 맞춘다. 불변식 `docs.length === nav.size`. (출처: task_006 `03_development/dev_todo.md` Dev-2 · Dev-8 「설계」 5)

Figma ↔ 미니 React 대응:

| Figma | 미니 React (이 앱) | 출처 |
| --- | --- | --- |
| 메인 컴포넌트 | 함수형 컴포넌트 `Button`. 메인 값 `doc.main`이 기본 props | task_004 `00_master_dialogue.md` 0단계 (props 설명) |
| 인스턴스 | `h(Button, props)` 호출 1번 (`key` = 인스턴스 id) | 같음 · `01_request_spec.md` MF-11 |
| component property | props 값 · props 타입: Text → string, Boolean → boolean, Variant → 유니언 | 같음 · 0단계 Q4 |
| Instance swap | 컴포넌트를 prop 값으로 넘김. 상태는 문자열 `'star'` / `'heart'` → `Canvas`가 `StarIcon` / `HeartIcon`으로 바꿔 `Button`에 `icon`으로 넘김 → `Button`이 `h(icon, { key: 'icon' })` | 같음 · 0단계 Q4-1 · `03_development/dev_todo.md` ④-12 |
| override (인스턴스에서 바꾼 값) | 인스턴스 객체의 키 (`mergeProps`에서 뒤쪽 우선) | 0단계 Q3-1 · MF-12 |
| Figma Variables | `doc.variables` (`{ id, name, value }` 3개) · 버튼 `color` 칸 `'var:<id>'` 이름 참조 · 그릴 때 `resolveColor`로 hex로 풀어 칠함 | task_007 `01_request_spec.md` 1절 · VR-01 ~ 03 (task_007에서 추가) |
| Figma 편집기 배치 | 위에 도구 막대(`Toolbar`), 아래 3열 (레이어 · 캔버스 · 속성). mobile은 위아래 쌓기 | task_005 `01_request_spec.md` 1절 · FD-06 (task_005에서 추가) |

(출처: task_004 `01_request_spec.md` · `00_master_dialogue.md` 0단계 · task_005 · task_007 명세)

정책 (task_004):

- 새 인스턴스 = override 없음 ("기존 메인 버튼 스타일을 따라가야지"). (출처: task_004 `01_request_spec.md` 5절 「정책」)
- 고른 것 삭제 = 선택 풀림 ("그냥 포커스 풀리게 하면 되지 않아?"), 속성 패널은 빈 상태. (출처: task_004 `01_request_spec.md` 5절 「정책」)
- 메인 삭제 = 못 함 ("메인 못 지우게 하자 일단은"). (출처: task_004 `00_master_dialogue.md` Q6)
- 순서 바꾸기 = 레이어 창 [↑] [↓] ("순서 바꾸기는 레이어 창에서 하면 될 것 같아"). (출처: task_004 `01_request_spec.md` 5절 「정책」)
- 되돌리기에 선택 = 기록 안 함 ("2번은 안 해도 될 것 같아") → task_006부터: 되돌리기 때 `selectedId`는 그대로 두고 되돌린 `doc`에 없으면 푼다. (출처: task_004 `00_master_dialogue.md` Q14 · task_006 `01_request_spec.md` PP-06 ②) (task_006에서 변경)
- patch 표시 = 안 함 ("일반적으로 안 보이잖아"). 보여 주는 것은 깜빡임뿐. (출처: task_004 `00_master_dialogue.md` Q6 · Q7 · task_006 `01_request_spec.md` 3절)
- 그리기: 인스턴스마다 `h(Button, { key: it.id, ...main, ...it })` (= `mergeProps(main, it)`). `Button`은 필요한 props만 꺼내 속성을 만들어 `id`가 DOM 속성이 되지 않는다. task_007부터 `Canvas`가 `color` 칸을 `resolveColor`로 hex로 풀어 넘기고 `Button`은 hex만 받는다. (출처: task_004 `01_request_spec.md` MF-11 · `03_development/dev_todo.md` 공통 주의 2 · task_007 `03_development/dev_todo.md` Dev-2 · 공통 주의 2) (task_007에서 변경)

#### 실제 영역 · 변수 정책 (task_006 · 007)

- 실제 영역은 보기 전용(`inert`)이고 키 · 클릭에 반응하지 않는다. 버튼 꺼짐 상태(뒤로 · 앞으로 가능 여부)는 App state다. (출처: task_006 `01_request_spec.md` PP-09 · PP-10)
- 실제 영역 patch 경로는 영역 상자 안 자식부터 센다 (메인 `[0,0]`, b1 `[1,0]`, b2 `[1,1]`, b3 `[1,2]`). 캔버스 접두 `[0,2]`, 실제 영역 구역 `[0,4]`. (출처: task_006 `03_development/dev_todo.md` 공통 주의 1 · 2) — 접두 `[0,4]`는 task_006 Dev-1 · 공통 주의 1 기준.
- 실제 영역 diff 결과 줄: 이벤트 · key가 DOM에 없어 `SET_EVENT` 없음, 순서 바꾸기 = 위치 비교 `{ SET_ATTR: 2, SET_TEXT: 2 }` (MOVE 아님). 아이콘 켜기 · 끄기는 `{ SET_ATTR: 12, SET_TEXT: 4, INSERT: 4 }` · `{ SET_ATTR: 12, SET_TEXT: 4, REMOVE: 4 }` (계획의 `INSERT: 4` · `REMOVE: 4`만이 아님). (출처: task_006 `03_development/dev_todo.md` 공통 주의 3 · Dev-7 「테스트가 찾은 계획 오류」)
- 변수: `color` 칸 하나에 `#rrggbb`와 `var:<id>`가 같이 산다. 풀기는 `Canvas`에서 한다 (`resolveColor(color, variables, fallback?)`: hex 그대로 → `var:<id>`면 변수 값 → 없는 id면 `fallback`(메인 색) → `#0052ff`). `isHexColor('var:primary')`는 false라 `textColorFor` · `buttonStyle`은 건드리지 않는다. (출처: task_007 `03_development/dev_todo.md` 공통 주의 2 · 3 · RC-1 ~ 8)
- 실제 영역에는 푼 hex만 나간다 (DOM에 `var:` 글자 없음). 연결 정보는 `doc` 사본에만 있다. (출처: task_007 `01_request_spec.md` VR-07 · `03_development/dev_todo.md` 공통 주의 4 · RV-2)
- 없는 id 연결(`var:ghost`)은 UI로 만들 수 없고 단위 테스트에서만 가능하며, 그릴 때 메인 색 → `#0052ff`로 처리한다. (출처: task_007 `03_development/dev_todo.md` Dev-4 · VR-03)
- `setVariableValue`는 같은 값 · 없는 id · 형식 밖 값(`#rrggbb` 아님)이면 같은 `doc`을 돌려준다 (방어용, 사용자 확인 없이 둔 기획 가정). 같은 값이면 렌더 0번. (출처: task_007 `03_development/dev_todo.md` 공통 주의 9 · VP-10 · A44)
- 변수 값을 바꾸면 렌더 1번, 연결된 버튼만 `SET_STYLE`. 다른 버튼 · 레이어 노드는 같은 참조. 메인 · b1 · b2가 Primary를 따르는 상태에서 값을 바꾸면 캔버스 `SET_STYLE` 6줄 (배경 3 + 글자색 3). b3 (hex override)은 0줄. (출처: task_007 `03_development/dev_todo.md` VP-2 · VP-6 · VR-06)
- 같은 색 칩 다시 누르기 · 같은 색 입력 = 렌더 0 (P-20). 칩 연타 = 이벤트마다 렌더 1번 (Batching, VP-12). (출처: task_005 `03_development/dev_todo.md` Dev-3 · task_007 VP-12)

#### 시연 앱 mini-figma 알고리즘 결정 (task_004 — 기록 유지)

| 결정 | 선택 | 이유 (사용자 말) | 버린 후보 · 이유 | 기록 |
| --- | --- | --- | --- | --- |
| 보여 줄 쪽 | (나) Figma Components 중심, (가) 패널 UI는 조작 도구로만 | "나는 (나)를 보여주고 싶기는 한데" + 추천 수용 | (가)만 — 일반 웹앱과 다를 게 없음 | task_004 `01_request_spec.md` 알고리즘 결정 |
| 프로퍼티 종류 | 4종 전부 (Text · Variant · Boolean · Instance swap), 색은 일반 override | "구현한 기능들로 다 구현할 수 있어서" | 일부만 — 보여 줄 patch 종류가 줄어듦 | 같음 · 0단계 Q4 |
| override 판단 | 키가 있으면 override (빈 글자 · 같은 값 포함), 되돌리기 = 키 지우기 | Q3-1 "이미 인스턴스에 컬러를 추가했기 때문에 메인 컴포넌트가 컬러를 바꿔도 영향을 받지 않아" · Q10 "빈 글자니까 오버라이드" · "프레이머는 오버라이드였어" | 값으로 판단 (빈 글자 = 메인 따름) — 규칙이 둘이 됨 | 같음 · 0단계 Q3-1 · Q10 |
| 화면 배치 | (A) 선택해서 고치기 (패널 하나, 머리에 대상 표시) | "기존 피그마랑 비슷한 것 같아" | (B) 패널 두 개 — 모바일에서 좁음 / (C) 탭 — 메인 수정 → 인스턴스 변화가 한눈에 안 보임 | 같음 · 0단계 Q5 |
| 인스턴스 목록 자료구조 | 배열 (삭제 = `filter`로 새 배열) | "우리 엔진은 「새 값을 넘겨야 다시 그린다」는 규칙 때문에" | 연결 리스트 — 노드를 직접 고치면 setter가 같은 참조(`Object.is`)라 렌더 안 함, 복사하면 장점이 사라짐 | 같음 · 0단계 Q9-2 |
| 선택 · key | 인스턴스 id (지운 번호 재사용 안 함) | "누구를 골랐는지는 id값이 있었던 것 같은데?" | 인덱스 — 순서를 바꾸면 다른 인스턴스가 골라지고 key가 자리를 따라감 | 같음 · 0단계 Q9-1 |
| 키보드 받는 방법 | `useEffect`에서 `document`에 `keydown` 등록 + cleanup | "추천이라서" | 엔진에 `keydown` 추가 — 엔진 수정(MF-02 위반), props 이벤트는 포커스된 요소 안에서만 받아 전역 단축키가 안 됨 | 같음 · 0단계 Q13 · Q16 |
| Undo 묶음 (task_006에서 제거) | 같은 대상 + 같은 칸 연달아 = 한 단계, 시간 기준 없음, 기록 50개 (Undo 49번) | "다른 속성을 건드렸나면 그건 묶음이 끝났지" · "기록 개수는 50개로~" | 한 글자 = 한 단계 — Undo를 여러 번 눌러야 함 / 시간 기준 — 타이머 · e2e 기다리기 필요 | 같음 · 0단계 Q14 · task_006 `01_request_spec.md` PP-12 |
| Undo 키 기본 동작 (Q18) (task_006에서 변경) | 입력칸 밖 · 선택 상자 · 체크박스 = 앱 Undo/Redo + 기본 동작 막음 → task_006부터 State History 뒤로 · 앞으로, 규칙 그대로 | ①③ 추천안 수용 "응" · ② "브라우저에서도 undo가 가능하다면 추전하는대로" | 그대로 두기 — 브라우저 글자 되돌리기와 겹쳐 한 키에 두 단계 되돌아감 (BLOCKING 1) / 선택 상자 · 체크박스에서 막기만 — 앱 Undo 없음 (사용자 질문 뒤 바꿈) | `00_master_dialogue.md` 2단계 Q18 · task_006 PP-11 |
| 기획 검수 뒤 6개 (Q17) | 아이콘 key(`icon` · `label`) · 되돌리기 49번 · `nextId` 따로 · Delete · Backspace는 수정키 없을 때만 · 캔버스 줄바꿈 · Undo 버튼 없음 (task_005 FD-12에서 바뀜, task_006 PP-07에서 State History 버튼으로) | "응" (추천안 수용, 이유 미기재) | 기록 없음 | `00_master_dialogue.md` Q17 · task_005 `01_request_spec.md` FD-12 · task_006 PP-07 |

(출처: task_004 `01_request_spec.md` 알고리즘 결정 · 정책 · `00_master_dialogue.md` 해당 Q)

#### 시연 앱 mini-figma 알고리즘 결정 (task_005 · 006 · 007)

| 결정 | 선택 | 이유 (사용자 말) | 버린 후보 · 이유 | 기록 |
| --- | --- | --- | --- | --- |
| 도구 막대 범위 (task_005) | C. `Toolbar` 컴포넌트 | "c로 가자" (B에 대해 "b는 장식용인거면 없어도 되는거 아니야?") | A CSS만 — 막대 없음 · B 고정 막대 — 기능 없는 장식 | task_005 `01_request_spec.md` 5절 · 0단계 Q2 |
| 배치 (task_005) | (다) 전부 어둡게 + 캔버스 점무늬 (5e841b2 사용자 변경으로 캔버스 점무늬 · 테두리 제거) | "(다)러 할래" · "(다)인데 캔버스는 점무늬" | (가) 전부 밝게 · (나) 어두운 막대만 | task_005 0단계 Q3 · 명세 5절 · `01_request_spec.md` FD-02 |
| 버튼 색 (task_005) | 디자인 팔레트로 맞춤 + 선택 표시 파랑 | "팔레트로 맞추자" | 지금 색 유지 — 새 디자인과 톤이 안 맞음 | task_005 `01_request_spec.md` 5절 |
| 색 고르기 (task_005) | (다) 칩 8개 + 직접 고르기 | "(다)로 진행하자" · "팔레트 판 넣어서 우리가 색 지정할 수 있게" | (가) 칩만 — 8개 밖 색 불가 · (나) 선택기만 — 디자인 톤 흐트러짐 | task_005 0단계 Q4 · 명세 5절 |
| 색 저장 (task_005) | 이름 → `#rrggbb` 값 (FD-20, 시작 `#0052ff` · `#cf202f`) | "팔레트 판 넣어서 우리가 색 지정할 수 있게" (0단계 Q3) · Q4 「(다)」 확정에 포함 | 기록 없음 (이름 유지 후보는 명세에 없음). 칩 8개 밖 색 불가 문제는 「색 고르기」의 (가) 버린 이유와 같음 | task_005 `01_request_spec.md` FD-20 · 5절 「색 고르기」 · `00_master_dialogue.md` 0단계 Q3 · Q4 |
| 글자 색 자동 (task_005, FD-24) | 배경과 흰 `#ffffff` · 먹 `#0a0b0d` 중 WCAG 대비가 큰 쪽 (경계 `#777777` 흰 · `#787878` 먹) | 추천안 수용 (테스트 케이스 확인 "응", 이유 미기재) | 기록 없음 | task_005 `03_development/dev_todo.md` ④-1 · `00_master_dialogue.md` 2026-11-11T20:52 |
| 글자 색 담는 곳 (task_005) | `style`의 `color` (배경과 같은 곳) | 추천안 수용 (이유 미기재) | Y 글자색을 클래스로 — 바뀔 때 `SET_STYLE` 1 + `SET_ATTR` 1 | task_005 `03_development/dev_todo.md` ④-2 |
| 색 입력칸 키 (task_005 → task_006) | `<input type="color">`는 선택 상자류 (Ctrl+Z = 앱 Undo → task_006부터 State History 뒤로) | 추천안 수용 (이유 미기재) | 안 넓힘 — 색 입력칸에서 Ctrl+Z가 아무 일도 안 함 | task_005 `03_development/dev_todo.md` ④-3 · Dev-4 |
| override 표시 (task_005) | 왼쪽 파랑 줄 + 연한 파랑 배경 (클래스 `override` · ↻ 그대로) | 추천안 수용 (이유 미기재) | 주황 (기존 선택 표시) — 강조색 파랑 하나 원칙 (FD-03) | task_005 `03_development/dev_todo.md` ④-4 · 명세 FD-03 |
| 칩 연타 묶음 (task_005) | 같은 대상 + 같은 칸(`color`) 연달아 = 한 단계 | 추천안 수용 | task_006부터 앱 편집 Undo 없음 → 해당 없음 | task_005 `03_development/dev_todo.md` ④-5 |
| 실제 영역 자리 (task_006) | 가운데 열 위 테스트 · 아래 실제 | "너의 추천대로 무조건 가자" | 캔버스 옆 — 3열이 꽉 차 좁음 · 탭 — 두 영역을 동시에 못 봄 | task_006 `01_request_spec.md` 5절 · 0단계 |
| 실제 영역 내용 (task_006) | 캔버스 버튼만 | 〃 | 앱 전체(`body > div`) — 패널까지 비추면 뜻이 흐려짐 | task_006 `01_request_spec.md` 5절 |
| 새 VNode 만들기 (task_006) | 테스트 영역 DOM을 `readAreaChildren`으로 읽기 + 정리 함수 `toRealVNodes` | 〃 (Phase 1 요구사항 「DOM → VDOM」 그대로) | state로 바로 VNode — Phase 1의 「DOM → VDOM」을 보여 주지 못함 | task_006 `01_request_spec.md` 5절 |
| 뒤로 · 앞으로 (task_006, PP-06 변경) | 두 영역 함께: `doc` 사본을 기록 칸 번호로 저장, 이동하면 `setDoc` | "그럼 실행 취소를 눌렀으면 테스트 영역도 실제 영역과 다시 같이 져야 하는 것 아니야?" + 세부 1 ~ 4 "응" (PRD T-08) | 실제 영역 기록만 — T-08과 어긋나고 편집을 되돌릴 방법이 없음 · 실제 영역 DOM을 다시 읽어 `doc` 만들기 — override 키 정보가 DOM에 없음 · Patch 안 한 편집이 있으면 묻기 · 막기 — 확인 창 · 단계 증가 | task_006 `00_master_dialogue.md` 2026-11-12T00:32 · `01_request_spec.md` 5절 |
| 버튼 자리 (task_006, PP-07) | 도구 막대 = 앱 이름 · [실행 취소] · [다시 실행] · [Patch] | "State History 다루는 버튼들을 undo-button와 redo-button의 위치로 옮기고 undo-button와 redo-button는 제거하자" (2026-11-11T23:25) | 실제 영역 머리글 — 처음 추천안, 사용자 요청으로 바뀜 | task_006 `00_master_dialogue.md` 2026-11-11T23:25 · `01_request_spec.md` PP-07 |
| 앱 편집 Undo · 단축키 (task_006, PP-11 · PP-12) | 앱 편집 Undo 완전히 없앰. Ctrl/Cmd+Z · Shift+Z = State History 뒤로 · 앞으로 | "스테이트 히스토리 관련 기능들에 Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z 단축키로 할당하자" · 마스터 추천 A "추천으로 가자" (2026-11-11T23:27) | B 다른 키(Ctrl+Alt+Z)로 앱 Undo 유지 — 앱 편집 Undo를 부를 방법이 없어짐 (A 채택) | task_006 `00_master_dialogue.md` 2026-11-11T23:27 · `01_request_spec.md` PP-11 · PP-12 |
| 실시간 표시 (task_006) | 덧칠 층 깜빡임 (`onPatch`, Phase 1 `createOverlay` 재사용) | 〃 (5절 「실시간 표시」) | 실제 노드에 클래스 — VNode와 어긋남 | task_006 `01_request_spec.md` 5절 |
| 변수 연결 저장 (task_007) | 버튼 `color` 칸에 `'var:<id>'` 문자열 | 사용자 위임 「너가 최선이라고 판단되는 걸로」 (추천안 수용) | 따로 `colorVar` 칸 — override · ↻ 규칙을 칸 두 개에 맞춰야 함 · 객체 `{ var }` — 문자열 비교 · 사본 복사가 번거로움 | task_007 `01_request_spec.md` 5절 · `00_master_dialogue.md` 0단계 Q0 |
| 변수 종류 · 개수 (task_007) | 색만, 3개 고정 (추가 · 삭제 · 이름 바꾸기 없음) | 〃 | 추가 · 삭제 포함 — 연결된 변수를 지울 때 규칙이 더 필요 | task_007 `01_request_spec.md` 5절 |
| 모드 (task_007) | 제외 | 〃 | 포함 — 하나 바꿔 전부 바뀌는 장면은 값 편집으로 이미 보여 줌 | task_007 `01_request_spec.md` 5절 |
| 변수 패널 자리 (task_007) | 레이어 카드 맨 아래 (`LayerPanel`의 끝 자식, 레이어 접기에 안 접힘) | 〃 · 마스터 추천 확정 (2026-11-12T01:29) | 따로 창 — 화면 2개(desktop · mobile) 배치가 늘어남 | task_007 `01_request_spec.md` 5절 · VR-04 · `03_development/dev_todo.md` 공통 주의 5 |
| 처음 연결 (task_007) | 없음 (hex 그대로) | 〃 | 메인을 Primary에 미리 연결 — 기존 테스트의 처음 데이터 단언이 많이 바뀜 | task_007 `01_request_spec.md` 5절 |
| 연결 중 「없음」 · 칩 · 색 입력칸 (task_007, VR-05) | 「없음」 = 지금 푼 hex로 저장 (연결만 풂) · 칩 · 색 입력칸 = hex 저장 (연결 풀림) | 마스터 추천 확정 (2026-11-12T01:29) · 「없음」은 겉모습 유지 | 기록 없음 | task_007 `01_request_spec.md` VR-05 |

(출처: task_005 · 006 · 007 `01_request_spec.md` 5절 · `00_master_dialogue.md` · `03_development/dev_todo.md`)

## 실제 React와 차이

| 항목 | 우리 구현 | 실제 React | 기록 |
| --- | --- | --- | --- |
| 변경 적용 방식 | 고칠 일 목록(패치 목록)을 만들고, 목록대로 수정된 부분만 고친다 | 별도 목록 대신 노드마다 표시(flag)를 남긴다 | task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| 같은 key 재정렬 (`[a,b,c]→[b,c,a]`) | MOVE 2번 (보충 설명 기준) | 이미 순서가 맞는 항목은 두어 1번 (보충 설명 기준) | task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| key가 없는 자식 | 위치 기반 비교 (key 없음 · 중복 key도 위치 비교) | 위치로 짝짓고 경고 (보충 설명 기준) | task_001 `01_request_spec.md` 결정 2 · `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| History | 있음. 패치 · 역패치 + VNode 기록, 양방향 연결 리스트 | 없음. 공식 튜토리얼은 앱이 상태 스냅샷을 쌓는 방식 (보충 설명 기준) | task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 보충 |
| 재렌더 시점 | 같은 틱의 setter를 모아 컴포넌트당 한 번 렌더 (결정 9 B, `queueMicrotask`). 우선순위 · 시간 분할 없음. (task_002 당시는 setter마다 즉시 동기 렌더 · Batching 미구현) | setter 호출을 모아 한 번 렌더 (18 이후, 마스터 설명) | task_003 `01_request_spec.md` 결정 9 · task_002 `00_master_dialogue.md` Q4 |
| effect 실행 시점 (task_004 CP2) | patch 직후 한 번. 의존성 기준 (생략 = 매 렌더 · `[]` = 처음 한 번) | 실행 시점이 더 복잡 (마스터 설명) | task_004 `00_master_dialogue.md` 「이해 체크포인트 · Hooks」 🔁 |

같은 점: 고칠 목록을 만들고, 목록을 바탕으로 수정된 부분만 고친다 (사용자 한 줄 요약). (출처: task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17)

## 알려진 한계

- ~~터치 기기에서는 Undo 수단이 없다 (Undo 버튼 없음, 단축키만)~~ → 해소. task_005 명세 4절에 따라 README 「알려진 한계」에서 지움 (FD-12 Undo 버튼). task_006에서 Undo 버튼은 도구 막대 [실행 취소] · [다시 실행](State History)으로 바뀌어 남았다. (출처: task_004 `00_master_dialogue.md` Q17-6 · task_005 `01_request_spec.md` 4절 · task_006 `01_request_spec.md` PP-07) (task_005 · 006에서 변경)
- SVG 미지원: Patch 때 검사로 막는다. 사용자 결정으로 구현하지 않음. (출처: task_001 `01_request_spec.md` 정책 · task_002 `00_master_dialogue.md` 마무리)
- Key 확장은 단위 테스트로만 검증 (Phase 1 화면에는 key 없음). 이동 횟수는 최소가 아니다. (출처: task_001 `07_pr_body.md` 「알려진 한계」)
- 공백 · 주석을 노드로 남기므로, 들여쓰기만 바꿔도 글자 patch가 생긴다. (출처: task_001 `01_request_spec.md` 4절 · `07_pr_body.md`)
- 렌더마다 핸들러가 새 함수라 이벤트 교체 patch 줄이 늘 생긴다 (DOM 작업은 없음). (출처: task_002 `07_pr_body.md` 「알려진 한계」)
- Phase 1 편집창에서 `input` · `textarea` · `select`의 `value` · `checked` 속성을 고치면 프로퍼티만 바뀌고 속성 글은 안 바뀐다. (출처: task_002 `01_request_spec.md` 4절 · `07_pr_body.md`)
- `<select value>` + `<option>` 삭제를 한 기록에서 함께 한 뒤 「뒤로」 하면 선택값이 테스트 영역과 다를 수 있다 (드묾). (출처: task_002 `01_request_spec.md` 4절 · `03_development/code_review_log.md` 경량 검수 1회차 NB-4)
- 렌더 실패 시 setter가 바꾼 state는 남고, 화면은 다음 성공 렌더에서 맞춰진다. (출처: task_002 `07_pr_body.md` · `03_development/code_review_log.md` 1회차 NB-3)
- 시연 앱(task_004): Windows Chromium의 Ctrl+Y는 앱 키가 아니라 막지 않아서, 라벨 글자 칸에서 브라우저 글자 되돌리기를 한 뒤 칸 밖에서 Ctrl+Y를 누르면 브라우저 Redo가 라벨 칸에 적용돼 일반 수정 한 단계로 기록될 수 있다. 이 문장의 「앱 Undo 기록은 안 깨짐」은 task_004 기준이다. (task_006부터 앱 편집 Undo 기록이 없어 「기록에 섞이는」 문제는 해당 없음. Ctrl+Y는 `keys.ts`에 없어 앱 키가 아니고, State History 다시 실행은 Ctrl/Cmd+Shift+Z만 — 마스터 코드 확인 2026-11-12) (출처: task_004 `03_development/code_review_log.md` 묶음 3 2회차 NB-2)
- 시연 앱(task_004): 엔진 이벤트는 `click` · `input`뿐이라 끌기 · 크기 조절 · 확대·축소가 없다 (명세 밖). (출처: task_004 `01_request_spec.md` 3절)
- 시연 앱(task_004): Instance swap ★ → ♥는 같은 태그라 글자 변경(`SET_TEXT`)으로만 보인다. 정상 동작. (출처: task_004 `01_request_spec.md` 4절)
- 시연 앱(task_006): 「실행 취소 → 편집 없이 [Patch]」는 무변경이라 기록이 안 쌓인다. 처음 · 끝 칸에서 편집만 하고 Patch를 안 한 상태는 꺼진 버튼 · 단축키로 버릴 수 없다 (명세 「처음 · 끝에서는 꺼짐」 우선). (출처: task_006 `03_development/dev_todo.md` Dev-8 「알려진 결과(명세대로)」)
- 시연 앱(task_006): 코드로 같은 틱에 [실행 취소] → [Patch]를 이어 부르면 이동 전 `doc`이 저장될 수 있다. 실제 클릭은 이벤트마다 마이크로태스크가 비워져 생기지 않아 기록만 남기고 고치지 않았다. (출처: task_006 `03_development/code_review_log.md` 회차 1/3 Dev-8 NB 2 · `07_pr_body.md` 「남은 일」)
- 시연 앱(task_005, 경량 검수 Dev-9 NB 2): 낮은 desktop 높이(예 721 × 300)에서는 도구 막대 · 패널 일부가 잘리고 스크롤바가 없다. 테스트 크기(1280 × 800) 밖, 기록만. (출처: task_005 `03_development/code_review_log.md` 경량 Dev-9 NB 2)
- 시연 앱(task_005, 경량 검수 Dev-9 NB 3): 폭 720 ~ 721 사이 소수점 배율에서는 두 media query가 모두 안 걸려 3열 · 전체 높이가 없다. 기록만. (출처: task_005 `03_development/code_review_log.md` 경량 Dev-9 NB 3)
- 시연 앱(task_007): 변수는 색 3개 고정 (추가 · 삭제 · 이름 바꾸기 · 모드 · 변수끼리 연결 없음, 명세 3절 제외 범위). (출처: task_007 `01_request_spec.md` 3절)

## 성능 대시보드 (확장 1, task_002)

- 시나리오 B-01~B-07을 준비 5회 · 측정 30회 이상으로 반복, p50 · p95 기록. 측정 조건(브라우저 · 기기 · 화면 크기 · 빌드 모드)을 함께 적는다. (출처: task_002 `01_request_spec.md` 확장 1 · `04_qa_evidence/qa_todo_result.md` 캡처 ⑦)
- 계측 패널의 DOM 변경은 측정에서 뺀다. 검수 1회차에서 B-07 집계에 기록판 쓰기가 섞인 것을 찾아, 세 칸을 따로 셈 (BLOCKING → 재작업 → APPROVE). (출처: task_002 `03_development/code_review_log.md`)
- Batching 전후를 한 화면에서 비교하는 시나리오는 없다 (제외 범위). task_003에서 B-06 · B-07 값을 Batching 기준으로 다시 쟀다. (출처: task_002 `01_request_spec.md` 확장 1 · task_003 `03_development/dev_todo.md` Dev-2)
- 실제로 한 번 측정한 값 (2026-11-11, Playwright 헤드리스 Chromium 158 · Windows, 1280 × 800, Vite dev 서버, CPU 제한 없음, 준비 5 · 측정 30, `performance.now()` 해상도 약 0.1ms). 실행마다 값이 달라 알고리즘 우열 판단에 쓰지 않는다. 아래 표는 **task_002 당시(즉시 동기)** 값이다. (출처: task_002 `03_development/dev_todo.md` Dev-26 근거 · 「경량 검수 1회차 반영」)

  | 시나리오 | 전체 M-07 p50 / p95 | patch 줄 | 노드 유지 M-03 |
  | --- | --- | --- | --- |
  | B-02 텍스트 하나 변경 (노드 507개) | 0.300 / 0.600 ms | 1 (SET_TEXT 1) | 507 / 507 |
  | B-05 여러 위치 동시 변경 | 0.300 / 0.800 ms | 5 | 507 / 507 |
  | B-06 setter 10번 연달아 (렌더 10번, task_002 당시 즉시 동기) | 2.700 / 3.210 ms | 10 | 507 / 507 |
  | B-07 검증 페이지 대표 동작 13번 (렌더 16번, task_002 당시 즉시 동기) | 1.400 / 2.410 ms (재측정) | 212 (그중 SET_EVENT 168, DOM을 바꾸지 않음) | 7 / 7 |

- Batching(결정 9 B)으로 다시 쟀다 (task_003, 같은 조건, 2026-11-11, 대시보드를 3번 돌린 것 중 첫 번째 실행. 실행마다 값이 달라 우열 판단에 쓰지 않으며, B-06은 `performance.now()` 해상도(약 0.1ms)에 가까운 값이다). (출처: task_003 `03_development/dev_todo.md` Dev-2 근거)

  | 시나리오 | 전체 M-07 p50 / p95 | patch 줄 | 노드 유지 M-03 |
  | --- | --- | --- | --- |
  | B-06 setter 10번 연달아 (렌더 1번, Batching) | 0.300 / 0.830 ms | 1 (SET_TEXT 1) | 507 / 507 |
  | B-07 검증 페이지 대표 동작 13번 (렌더 13번, 이벤트마다 렌더) | 1.200 / 1.955 ms | 167 (그중 SET_EVENT 126, DOM을 바꾸지 않음) | 7 / 7 |

## 검증 결과

| task | 단위 (`npx vitest run`) | 타입 (`npx tsc --noEmit`) | 인수 (`npx playwright test`) | 출처 |
| --- | --- | --- | --- | --- |
| task_001 phase1 | 16 files · 432 passed | 오류 0 | 96 passed (desktop 48 · mobile 48) | `07_pr_body.md` · `qa_todo_result.md` |
| task_002 phase2 | 36 files · 776 passed | 오류 0 | 154 passed (desktop 77 · mobile 77 = phase1 48 + phase2 29) | `07_pr_body.md` · `qa_todo_result.md` |
| task_003 batching | 36 files · 801 passed | 오류 0 | 172 passed (desktop 86 · mobile 86 = phase1 48 + phase2 38) | `04_qa_evidence/qa_todo_result.md` |
| task_004 mini-figma | 41 files · 1064 passed (레포 전체) | 오류 0 | 272 passed (desktop 136 · mobile 136, mini-figma 50 × 2 포함) | `04_qa_evidence/qa_todo_result.md` |
| task_005 figma-design | 43 files · 1159 passed (레포 전체, QA 시점) | 오류 0 | 324 passed (desktop 162 · mobile 162) | `04_qa_evidence/qa_todo_result.md` |
| task_006 patch-preview | 46 files · 1195 passed | 오류 0 | 330 passed (desktop 165 · mobile 165) | `03_development/dev_todo.md` Dev-8 · `04_qa_evidence/qa_todo_result.md` |
| task_007 variables | 47 files · 1250 passed (레포 전체) | 오류 0 | 376 passed (desktop 188 · mobile 188) | `04_qa_evidence/qa_todo_result.md` · 마스터 전달값 |
