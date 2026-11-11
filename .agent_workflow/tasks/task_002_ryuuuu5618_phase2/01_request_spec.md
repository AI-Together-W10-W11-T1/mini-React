# 01 요구사항 명세: phase2

- task: `.agent_workflow/tasks/task_002_ryuuuu5618_phase2/`
- 작업자: ryuuuu5618
- 출처: `docs/PRD/요구사항 정의서 PRD.md` v2.1 (요구사항 · 테스트 ID를 그대로 씀)
- 진행 모드: **가벼운** (테스트 케이스 확인은 함). 0단계 인터뷰: Q4 재렌더 시점 · Q5 이벤트는 「깊게」, Q7 Hook · Q6 입력창 · Q8 자식 풀기 · key는 사용자 요청으로 「빠르게」(추천안 표 묶음 1~5)
- 검증 페이지 구성: `00_phase2_page_proposal.md` (사용자 확인 2026-11-11)
- 상태: **사용자 승인 (2026-11-11)**

## 1. 요청 요약
Phase 2 전체(P2-01~24, T-09~16)를 Phase 1처럼 **엔진 + 검증 페이지**로 구현한다. 검증 페이지(`fixtures/phase2-app`)는 루트 `App` 하나와 칸 4개(① 카운터 ② 입력창 ③ 목록 ④ 기록판)로, Hook과 자동 갱신(상태 변경 → 새 VNode → diff → patch)을 기능별로 눈으로 확인한다. 목록의 [위로] · [아래로]로 Key 비교(MOVE)를 화면에서 시연한다. 확장은 필수 Dev 뒤에 **성능 대시보드**, 그 뒤에 **Batching(시간이 남으면)**. 피그마 같은 편집기는 미니 React가 끝난 뒤 따로 만든다. 마감 2026-11-11(수).

## 2. 확정 요구사항

### 필수 (PRD §4.1)

| ID | 요구사항 | 수용 기준 | 패키지 |
| --- | --- | --- | --- |
| P2-01 | 함수형 컴포넌트 | UI 컴포넌트를 함수로 구현한다. 래퍼 클래스와 함수형 UI 컴포넌트를 구분한다. | `fixtures/phase2-app` · `react-reconciler` |
| P2-02 | 컴포넌트별 UI 구성 | UI를 기능에 맞는 컴포넌트로 나누며 각 컴포넌트가 자신의 UI를 표현한다. | `fixtures/phase2-app` (App · CounterPanel · GreetingPanel · TodoPanel · TodoRow · LogPanel) |
| P2-03 | 함수형 컴포넌트 래퍼 | `FunctionComponent` 클래스를 직접 구현한다. | `react-reconciler` |
| P2-04 | hooks 배열 | `FunctionComponent`가 상태 저장에 쓰는 `hooks` 배열을 갖는다. | `react-reconciler` |
| P2-05 | mount() | 최초 호출 시 컴포넌트의 초기 UI를 실제 DOM에 렌더링한다. | `react-reconciler` · `react-dom` |
| P2-06 | update() | 상태 변경 후 컴포넌트를 다시 실행하여 변경된 UI를 반영한다. | `react-reconciler` · `react-dom` |
| P2-07 | 루트 전용 상태 관리 | 앱의 변경 가능한 UI 상태는 루트 컴포넌트에서 관리한다. | `fixtures/phase2-app` |
| P2-08 | 루트 전용 Hook 사용 | Hook은 루트 컴포넌트에서만 사용한다. (우리 정책: 자식 실행 중 Hook 호출은 오류) | `react` · `react-reconciler` |
| P2-09 | Stateless 자식 | 자식은 자체 State · Hook 없이 props로 UI를 구성하는 순수 함수다. | `fixtures/phase2-app` |
| P2-10 | props 전달 반영 | 루트 상태에 따라 자식 props가 바뀌면 자식 UI에도 반영된다. | `fixtures/phase2-app` · `react-reconciler` |
| P2-11 | useState 초기 상태 | 최초 렌더링에서 초기 상태값을 쓴다. (우리 정책: 지연 초기화 지원) | `react` · `react-reconciler` |
| P2-12 | useState 상태 유지 | 컴포넌트가 다시 실행되어도 상태가 초기값으로 돌아가지 않는다. | `react` · `react-reconciler` |
| P2-13 | 여러 상태의 구분 | 여러 상태값이 서로 섞이지 않는다. | `react` · `react-reconciler` |
| P2-14 | setter 상태 변경 | setter로 상태를 바꾼다. (우리 정책: 함수형 setter 지원, 같은 값이면 다시 그리지 않음) | `react` · `react-reconciler` |
| P2-15 | 상태 변경 후 자동 갱신 | 별도 렌더 · Patch 버튼 없이 화면이 갱신된다. (알고리즘 결정 9 A 즉시 동기) | `react-reconciler` · `scheduler` |
| P2-16 | useEffect 구현 | 부수 효과를 등록하고 선언한 실행 조건에 따라 실행한다. | `react` · `react-reconciler` |
| P2-17 | useMemo 구현 | 계산 결과를 저장하고 같은 의존성에서 재사용, 바뀌면 다시 계산한다. | `react` · `react-reconciler` |
| P2-18 | 새 VNode 생성 | 상태 변경 후 컴포넌트 실행 결과로 새 VNode를 만든다. | `react-reconciler` |
| P2-19 | Phase 1 Diff 재사용 | Phase 1 diff로 이전 · 새 VNode를 비교한다. 이벤트 · DOM 프로퍼티 확장은 허용 범위. | `react-reconciler` |
| P2-20 | Phase 1 Patch 재사용 | Phase 1 patch로 실제 DOM에 반영한다. | `react-dom-bindings` |
| P2-21 | 부분 업데이트 | 앱 전체 DOM 교체로 대신하지 않고 필요한 변경만 반영한다. | `react-reconciler` · `react-dom-bindings` |
| P2-22 | 사용자 인터랙션 페이지 | 클릭 · 입력으로 상태와 화면이 바뀐다. | `fixtures/phase2-app` |
| P2-23 | Hook 단위 테스트 | useState · useEffect · useMemo를 각각 검증하고 정책대로인지 확인한다. | `packages/*/src/__tests__` |
| P2-24 | 화면 기능 테스트 | 실제 사용자 동작 후 앱 상태와 표시 결과가 일치한다. | `e2e/phase2-*.spec.ts` |

### 검증 페이지 (`fixtures/phase2-app`)

자세한 화면 · 동작 · PRD 연결은 `00_phase2_page_proposal.md`. 자식은 모두 props만 받는 순수 함수이고, 버튼을 누르면 루트가 내려 준 함수를 불러 루트가 setter로 상태를 바꾼다.

| 칸 | 컴포넌트 | 화면 · 동작 | 확인하는 것 |
| --- | --- | --- | --- |
| ① 카운터 | `CounterPanel` | 숫자 + [+1] · [+3](함수형 setter 3번 연달아) · [그대로](같은 값) | `useState` 초기값 · 유지 · 함수형 setter · 같은 값 정책 (P2-11 · 12 · 14, T-10 · T-14) |
| ② 입력창 | `GreetingPanel` | 이름 입력(`onInput`, `value`) → "안녕하세요, ○○님" | `value` · `input` 이벤트, 다른 상태가 바뀌어도 입력창이 새로 만들어지지 않고 포커스 · 커서 유지 (§4.3) |
| ③ 목록 | `TodoPanel` · `TodoRow` | 할 일 추가 · 체크(`checked`) · [위로] · [아래로] · [삭제], "전체 n개 · 완료 m개"(`useMemo`). key = 항목 id(`todo-1` …, 지운 번호 재사용 안 함) | Key 이동(MOVE) 뒤 같은 key의 `<li>` 노드 유지, `checked` · `click`, D-03 · D-04, `useMemo` 재사용 (P2-10 · 17, T-13 · T-16) |
| ④ 기록판 | `LogPanel` | 렌더 횟수 · effect 실행 횟수 · memo 계산 횟수 · 마지막 update의 patch 줄 수, 탭 제목에 카운터 값(`useEffect(…, [count])`) | effect 실행 조건 · DOM 반영 뒤 실행, 부분 갱신 (P2-16 · 18~21, T-12 · T-15) |

- 횟수는 렌더 결과에 영향을 주지 않게 **상태가 아닌 바깥 변수**로 센다 (기록하려고 setter를 부르면 렌더가 또 생기므로).
- 화면 꾸미기는 Phase 1 검증 페이지 정도로 단순하게.

### 선택 확장 (필수 Dev 뒤, 이 순서)

| 순서 | 확장 | 이번 task 범위 | 패키지 |
| --- | --- | --- | --- |
| 1 | 성능 대시보드 | `fixtures/perf-bench`: PRD §7 지표(M-01~M-07 중 측정 가능한 것) · §8.1 시나리오 B-01~B-07을 작은 공통 fixture로 반복 측정(준비 5회 · 측정 30회 이상, p50 · p95). 측정 조건(브라우저 · 기기 · 화면 크기 · 빌드 모드) 기록. 계측 패널의 DOM 변경은 측정에서 뺌. Batching 비교 시나리오는 제외 | `fixtures/perf-bench` (+ patch 관찰 콜백으로 DOM 작업 집계) |
| 2 | Batching (**구현 안 함** — 2026-11-11 병합 뒤 사용자 결정 "배칭은 구현하지 말자") | 알고리즘 결정 9를 A → B(`queueMicrotask`로 모아 한 번 렌더)로 승격. 할 때 `types_changelog.md`에 `[알고리즘]` 기록, 관련 테스트 다시 실행 | `scheduler` · `react-reconciler` |

## 3. 구현 제외 범위
- **피그마 같은 도형 편집기** — 미니 React 구현이 끝난 뒤 따로 만들 시연 앱 (사용자 결정)
- Batching은 확장 2번(시간이 남으면)으로만. 필수 Dev에는 넣지 않음. 대시보드의 Batching 비교 시나리오 제외
- 루트 이벤트 위임(알고리즘 결정 8 C), 합성 이벤트 시스템 전체, `value` · `checked` 외의 DOM 프로퍼티, `click` · `input` 외의 이벤트 props
- Phase 2 검증 페이지의 History(되돌리기), 자식 컴포넌트의 상태 · Hook
- Fiber · 우선순위 스케줄러 · 동시성 렌더링
- SVG 지원 (여전히 미지원) — Phase 1 · 2 구현이 끝나면 마스터가 리마인드
- Phase 1 검증 페이지 기능 변경 (회귀만 확인)

## 4. 주의사항 · 열린 질문
- **0.5단계 `types.ts` 변경 예정** (`types_changelog.md`에 기록):
  - `Patch`에 이벤트 핸들러 교체 한 줄(이벤트 이름 · 전 · 후 함수, `null` = 없음)과 DOM 프로퍼티(`value` · `checked`) 한 줄 추가
  - 이벤트 props 규칙: 값이 함수이고 이름이 `on` + 대문자면 이벤트 (`onClick` → `click`, `onInput` → `input`). diff의 속성 비교(`readAttrs`)는 지금 함수 값을 건너뛰므로, 이벤트는 따로 비교한다
  - `value` · `checked`는 속성(SET_ATTR)이 아니라 프로퍼티 줄로 비교 · 적용
  - Hook 슬롯 타입은 `react-reconciler` 안에 둘지 `shared`에 둘지 0.5단계에서 정함
- **Phase 1 회귀 금지**: 지금 결과(vitest 432 · tsc 0 · playwright 96)가 그대로 통과해야 한다. Phase 1 검증 페이지의 `domToVNode`는 함수 props를 만들지 않으므로 새 patch 줄은 Phase 1 History에 나타나지 않는다.
- **diff는 컴포넌트 VNode를 받으면 오류**를 낸다 → `update()`에서 자식 컴포넌트를 먼저 풀어 요소 · 글자 VNode만 diff에 넘긴다 (묶음 5-1).
- **즉시 동기 렌더의 주의점**: effect 안에서 setter를 부르면 렌더가 중첩된다. 안전장치(연달아 50번 넘으면 오류, 묶음 2-4)가 필요하다. 한 핸들러에서 setter를 여러 번 부르면 핸들러 안의 변수는 옛 값이므로 함수형 setter를 쓴다 (묶음 1-4). [+3]은 렌더도 3번 (정책으로 기록, PRD §4.2 "렌더링 횟수는 스케줄링 정책과 함께 기록").
- **입력창**: patch가 `input.value`를 넣을 때 실제 값과 같으면 넣지 않아야 커서가 유지된다.
- **알려진 한계 (테스트 케이스 확인 4)**: Phase 1 `domToVNode`는 `<input value="…">` · `<input checked>` 속성을 props로 읽으므로, Phase 1 편집창에서 이 속성을 고치면 이제 SET_PROP(프로퍼티)로 가서 속성 글은 바뀌지 않는다. (검수 NB-4 반영 뒤 `input` · `textarea` · `select`에만 해당)
- **알려진 한계 (경량 검수 1회차 NB-4)**: 역패치는 SET_PROP이 자식 복구보다 먼저 적용된다. Phase 1 편집창에서 `<select value="x">` 속성과 그 값의 `<option>` 삭제를 한 번에 한 기록을 「뒤로」 하면 실제 영역의 선택값이 테스트 영역(스냅샷)과 다를 수 있다 (비표준 속성 · 드문 경우)
- **DOM 접근**: 리스너 등록 · 핸들러 저장 · 프로퍼티 반영은 `react-dom-bindings`에서만. `react` · `react-reconciler` · `scheduler`는 DOM을 만지지 않는다. 탭 제목 바꾸기는 검증 페이지(`fixtures/phase2-app`)의 effect 안에서.
- **2.5단계 체크포인트 대상** (사용자 요청 순서):
  1. **의존성 개념 먼저** (effect · memo 의존성 배열, `Object.is` 비교)
  2. Q7-1 Hook 호출 순서 — 이름 없는 `useState`를 엔진이 어떻게 구분하나, `if` 안에서 부르면 무슨 일이 생기나
  3. 결정 8 "왜 이걸 골랐나" (리스너 하나 + 핸들러 교체)
  4. 빠르게 묶음 1~5 중 `추천안 수용` 항목
- **남은 일**: 발표 전 4단계 위키 · README(task_001 · 002 함께), SVG 지원 리마인드, (미니 React 완성 뒤) 피그마 같은 시연 앱.

## 5. 알고리즘 결정

출처 번호는 `references/algorithm_catalog.md`. 「이유 (사용자)」는 사용자 말 그대로다. Phase 1 결정(1~7)은 `CLAUDE.md` 「내 설계 결정」 참고.

| 결정 | 선택 | 이유 (사용자) | 버린 후보와 이유 |
| --- | --- | --- | --- |
| 알고리즘 결정 9 · 재렌더 시점 | **A. 즉시 동기** — setter를 부르면 바로 렌더 + diff + patch. Batching은 확장 2번(시간이 남으면, B로 승격) | 방향: "그냥 setter 부를 때마다 바로 렌더와 패치를 진행하자." / 선택 이유: "마감이 빠듯해서 시간이 남으면 배칭 구현한다고 메모해줘" | B 마이크로태스크 Batching(추천: 승격) — 마감, 테스트에 `await` 필요 / C `requestAnimationFrame` — 렌더가 최대 약 16ms 늦음, jsdom 테스트 불편 |
| 알고리즘 결정 8 · 이벤트 props 처리 | **B. 리스너 하나 + 핸들러 교체** — 요소마다 이벤트 이름당 리스너를 처음 한 번만 등록, 실제 핸들러는 요소 자신에 저장해 두고 리스너가 꺼내 부름. 다시 렌더할 때는 저장된 핸들러만 바꿈 | "바뀐 곳만 고친다는 원칙을 지키려고" | A 바뀔 때마다 remove · add — 사용자가 한때 고름("우리도 setter함수로 매번 바꾸니까"), 표 비교 뒤 바꿈: 렌더마다 모든 핸들러가 새 함수라 등록 취소 · 등록이 생기고(항목 100개면 200번) 무변경 렌더(T-04)에도 작업이 생김 / C 루트 위임 — 구현량, 항목 수가 적어 필요 없음 |

### 정책 (PRD §4.2 · §4.3 · §5)

| 항목 | 선택 | 이유 (사용자) |
| --- | --- | --- |
| §4.3 이벤트 · 핸들러 저장 위치 | 요소 자신에 저장 → 요소가 화면에서 빠지면 함께 사라짐 (엔진이 따로 치우지 않음) | "너가 추천하는대로 할게" (추천안 수용). 사용자 생각: "레이어 li가 통째로 빠졌는데 치워야 하지 않을까" |
| §4.3 핸들러 해제 | props에서 `on…`이 빠지면 핸들러만 비우고 리스너는 남김 → 눌러도 아무 일 없음 | "잠궜으니까 해당 li를 눌렀을 때 아무 일도 일어나지 않은 것이 정상인 것 같고" + 추천안 수용 |
| §4.3 지원 이벤트 | `click` · `input` | 묶음 4 추천안 수용 |
| §4.2 Hook 구분 · 호출 순서 | `hooks` 배열에 부른 순서대로, 렌더마다 0번부터 | 묶음 1 추천안 수용 ("응") — 2.5단계에서 다시 공부 |
| §4.2 허용하지 않는 호출 | `if` · `for` 안 Hook은 규칙으로 금지 + 렌더 끝에 Hook 개수가 지난번과 다르면 오류. 자식 컴포넌트 실행 중 Hook 호출은 오류("Hook은 루트에서만") | 묶음 1 · 3 추천안 수용 |
| §4.2 useState 동일 값 | `Object.is`로 같으면 다시 그리지 않음 | 묶음 1 추천안 수용 |
| §4.2 useState 함수형 setter | 지원 `setX(prev => …)` | 묶음 1 추천안 수용 |
| §4.2 useState 지연 초기화 | 지원 `useState(() => …)`, 처음 렌더 때만 실행 | 묶음 3 추천안 수용 |
| §4.2 useEffect 실행 시점 | patch로 실제 DOM을 고친 직후, 같은 setter 호출 안에서 바로 | 묶음 2 추천안 수용 |
| §4.2 useEffect 의존성 | 생략 = 매 렌더 뒤, `[]` = 처음 한 번, `[a, b]` = 하나라도 바뀌면 | 묶음 2 추천안 수용 |
| §4.2 cleanup · 해제 | effect가 돌려준 함수를 다시 실행하기 직전 · `unmount()` 때 부름. `FunctionComponent`에 `unmount()` 두고 테스트 | 묶음 2 추천안 수용 |
| §4.2 무한 렌더 안전장치 | 렌더가 연달아(중첩) 50번을 넘으면 오류 | 묶음 2 추천안 수용 |
| §4.2 렌더 중 setter (검수 NB-1) | 컴포넌트 본문(렌더 도중)에서 setter를 부르면 오류 "렌더 중에는 setter를 부를 수 없습니다" | 검수 1회차 추천안 수용 ("응") |
| §4.2 렌더 실패 (검수 NB-2 · 3 · 8) | 실패한 렌더는 hooks 슬롯 · memo · effect 예약을 되돌리고 예외를 위로. setter가 바꾼 state는 남고 화면은 다음 성공 렌더에서 맞춰짐. `mount()` 두 번 · mount 전 `update()`는 오류 | 검수 1회차 추천안 수용 |
| §5 오류 · update 중 patch 예외 (검수 NB-7) | patch 적용 도중 예외면 마지막으로 성공한 VNode로 영역을 다시 그린 뒤 예외를 위로 (Phase 1 C2와 같은 복구) | 검수 1회차 추천안 수용 |
| §4.2 useMemo | 처음 계산 · 같은 의존성이면 재사용 · 바뀌면 재계산 · 생략하면 매 렌더 재계산 | 묶음 3 추천안 수용 |
| §4.2 의존성 비교 | 항목마다 `Object.is`, 배열 길이가 달라지면 바뀜 (effect · memo 공통) | 묶음 3 추천안 수용 |
| §4.3 DOM 프로퍼티 | `value` · `checked`만, **`input` · `textarea` · `select` 요소에서만**(검수 NB-4, 다른 요소는 보통 속성). 프로퍼티로 넣고 실제 입력창 값과 다를 때만 | 묶음 4 추천안 수용 + 검수 1회차 NB-4 추천안 수용 |
| §4.3 입력 이벤트 | `onInput`으로 상태 갱신 | 묶음 4 추천안 수용 |
| §4.3 포커스 · 커서 | 입력창 요소를 새로 만들지 않고 그 자리에서 고침. 타이핑 중 포커스 · 커서 유지 테스트 | 묶음 4 추천안 수용 |
| §4.3 지원하지 않는 입력 | 숫자로 받아야 하는 칸에 빈칸 · 글자 → 상태 그대로, 입력창 글자도 그대로. **이번 검증 페이지에는 숫자 칸이 없어 해당 없음 · 기록만** (테스트 케이스 확인 6) | 묶음 4 추천안 수용 |
| 자식 컴포넌트 풀기 | diff 전에 컴포넌트 VNode를 그 자리에서 실행해 결과 요소로 바꿈(안쪽까지). diff · patch는 요소 · 글자만 | 묶음 5 추천안 수용 |
| 이전 VNode 보관 | `mount()` · `update()` 때 만든 VNode 자체를 저장, DOM에서 다시 읽지 않음. `App()` 결과 = 영역 상자 안 자식 목록 (Phase 1 규칙) | 묶음 5 추천안 수용 |
| §5 목록 · key | key = 항목 id. 페이지의 카운터로 만들고(`todo-1` …) 지운 번호는 다시 쓰지 않음. [위로] · [아래로] = MOVE | 묶음 5 추천안 수용 (Phase 1 "key는 사람이 정하지 않음"과 같은 생각) |
| §5 VNode 입력 | 숫자 · 문자열 → 글자 노드, `null` · `undefined` · boolean 무시, 배열 펼침, `key`는 props에서 꺼냄 (`h()` 기존 동작 확인) | 묶음 5 추천안 수용 |
| 렌더 횟수 기록 | 즉시 동기라 setter 수만큼 렌더 (같은 값은 0번) | 결정 9와 같음 |

## 6. 수용 기준 연결
- 인수 기준: P2-22 · P2-24, T-14 · T-15 · T-16 (PRD §4.1 · §6.1) + 검증 페이지 동작(카운터 [+1] · [+3] · [그대로], 이름 입력, 목록 추가 · 체크 · [위로] · [아래로] · [삭제]) 뒤 상태와 화면 일치, 기록판 횟수 · patch 줄 수, 관련 없는 노드 참조 유지, 이벤트 중복 실행 없음, 입력 중 포커스 · 커서 유지, 순서 바꾼 뒤 같은 key 노드 유지 → `e2e/phase2-*.spec.ts` (desktop · mobile) + Phase 1 `e2e/phase1-*.spec.ts` 회귀
- 단위 검증: T-09 컴포넌트 · T-10 상태 유지 · T-11 상태 구분 · T-12 Effect · T-13 Memo · T-15 Phase 연계 · T-16 루트 제약 (PRD §6.1) + §6.2 정책 테스트(이벤트 제거 · 핸들러 교체 뒤 중복 호출 없음, 함수형 setter · 동일 값 · 연속 setter 최종 상태, effect 의존성 생략 · `[]` · 변경 · cleanup · `unmount`, memo 의존성 생략 · 경계, 잘못된 Hook 호출 오류, 무한 렌더 안전장치) → `packages/<pkg>/src/__tests__/*.test.ts`
- 테스트 케이스 확인: 2026-11-11 사용자 "응" — 작업자 확인 요청 1~5는 작업자 안대로(key 물려주기 · 기록판 effect · patch 칸은 effect가 직접 씀 · patch 줄 수를 전체 / 이벤트 교체로 나눔 · Phase 1 `value` · `checked` 속성 한계 기록 · 페이지 세부), 6 숫자 칸 정책은 "해당 없음 · 기록만"(단위 함수 안 만듦), 7 Dev-16 엔진 통합 테스트 제외 (`00_master_dialogue.md` 「테스트 케이스 확인」)

## 7. [고정] 미니 리액트 필수 제약 (위반 시 BLOCKING)

### 공통
- [ ] 외부 UI 프레임워크 · VDOM 라이브러리 금지 (Vanilla HTML · CSS · TypeScript)
- [ ] 허용 개발 도구: TypeScript, Vite, Vitest, jsdom, Playwright, ESLint · Prettier
- [ ] 개발 착수 전 `packages/shared/src/types.ts` 커밋. 변경은 마스터만, `types_changelog.md`에 기록
- [ ] **패키지 의존 방향**: `react` · `react-reconciler` · `scheduler` · `shared`는 DOM을 만지지 않는다. DOM 조작은 `react-dom-bindings`에서만
- [ ] 패키지 이름만 React를 따르고 내부 구조는 과제 범위 (Fiber · 우선순위 스케줄러 · 동시성 렌더링 금지)

### Phase 1 (VDOM + Diff + Patch + History)
- [ ] task_001에서 완료. 이번 task는 diff · patch를 재사용하고 **회귀가 없어야** 한다 (Phase 1 단위 · e2e 전부 통과)

### Phase 2 (Component + State + Hooks)
- [ ] `FunctionComponent` 클래스: `hooks` 배열, `mount()`, `update()` (+ 우리 정책 `unmount()`)
- [ ] `useState` · `useEffect` · `useMemo`와 state는 루트 컴포넌트에서만 (잘못된 호출은 오류, 위 「정책」)
- [ ] 자식 컴포넌트는 props만 받는 stateless 순수 함수, `h(Child, props)`로 호출
- [ ] state 변경 → `update()` → 새 VDOM → diff → patch 재사용 (전체 DOM 교체 금지)
- [ ] 테스트 페이지는 사용자의 입력 · 클릭에 따라 화면이 바뀜

### qa_todo 필수 시나리오
- [ ] Diff 기본 케이스: 검증 페이지 동작으로 D-01 텍스트(카운터 숫자 · 인사 글자) · D-02 속성(완료 항목 표시 class 등) · D-03 추가(할 일 추가) · D-04 삭제(할 일 삭제) · D-05 교체(목록이 비었을 때 안내 문구 ↔ 목록 등, 기획에서 확정) 확인. Key 재정렬은 [위로] · [아래로]로 같은 key 노드 유지 확인
- [ ] History 동기화: Phase 2 검증 페이지는 History 없음 → Phase 1 `e2e/phase1-history.spec.ts` 회귀로 대신
- [ ] 화면 크기 2개 (desktop 1280x800 · mobile 375x812)
