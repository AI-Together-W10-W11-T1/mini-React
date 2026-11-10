# dev_todo: phase2

- 명세: `../01_request_spec.md` · 검증 페이지 구성: `../00_phase2_page_proposal.md` · 타입 변경 기록: `./types_changelog.md` · 브랜치: `feature/phase2`
- 규칙: 항목 하나 = 커밋 하나 (`<type>(<package>): <요약> (Dev-N)`, push 없음). 체크할 때 완료 근거 필수 (근거 없는 체크는 무효, 실제로 돌린 명령과 결과만 적는다)
- 순서: **필수 Dev-1 ~ Dev-22(Dev-16은 제외, 필수 21개)를 앞에, 확장 Dev-23 ~ Dev-28을 맨 뒤에** (확장 순서 = 확장 1 성능 대시보드 Dev-23 ~ 26 → 확장 2 Batching Dev-27 ~ 28). 늦어지면 확장을 뒤(Dev-28)부터 미루고 이유를 기록한다. 확장 2는 **시간이 남을 때만** 한다 (명세 결정 9: 기본은 A 즉시 동기)
- 하는 방식: 화면에 보이는 Dev(17 ~ 22, 26, 28)는 `e2e/phase2-*.spec.ts`를 먼저 쓰고 실패를 확인한 뒤(`mini-react-kit:atdd-acceptance`), 안쪽 단위 테스트는 실패 테스트 → 최소 구현 → 리팩터(`mini-react-kit:test-driven-development`)
- 인수 시나리오는 `../04_qa_evidence/qa_todo.md`의 QA 번호로 가리킨다
- 시작 상태: `npx vitest run` 432 passed, `npx tsc --noEmit` **오류 2건**(0.5단계 타입 추가 때문, Dev-1이 고침), `npx playwright test` phase1 96 passed

## 공통 약속 (모든 Dev에 적용)

- **Phase 1 회귀 금지**: 모든 Dev의 완료 근거에 `npx vitest run`(전부 통과, 지금 432 + 새 테스트)과 `npx tsc --noEmit`(Dev-1 이후 오류 0) 결과를 적는다. **Dev-6부터** 엔진 동작이 바뀌므로 `npx playwright test e2e/phase1-*.spec.ts`(96 passed)도 적고, 화면 Dev(17 ~ 22 · 26 · 28)는 `npx playwright test` **전체**(phase1 96 포함) 결과를 적는다. Dev-22가 마지막으로 전체를 다시 돌려 기록한다
- **패키지 경계**: DOM(`document` · `window` · `Element` …)은 `react-dom-bindings`에서만 만진다. `react` · `react-reconciler` · `scheduler` · `shared`는 `document` · `window`를 쓰지 않는다 (탭 제목 바꾸기 · 기록판 글 쓰기는 검증 페이지 `fixtures/phase2-app`의 effect 안에서). 패키지 역할: `FunctionComponent` · Hook 슬롯 = `react-reconciler`, Hook 공개 API = `react`, 재렌더 예약 = `scheduler`, render 진입점 = `react-dom`
- **`types.ts`는 고치지 않는다.** 바꿔야 할 것 같으면 `BLOCK:SPEC_GAP`. 새 인터페이스(`FunctionComponentHost` · `HookDispatcher` 등)는 `types.ts`가 아니라 쓰는 패키지 안에 둔다 (초안 ④-5)
- **알고리즘 결정 8 B (이벤트)**: 요소마다 이벤트 이름당 리스너 **하나**를 처음 한 번만 등록, 핸들러는 요소 자신에 저장(요소가 빠지면 함께 사라짐), 다시 렌더할 때는 저장된 핸들러만 교체, props에서 빠지면 핸들러만 비우고 리스너는 남김(눌러도 아무 일 없음). `on` + 대문자 · 함수 값 = 이벤트 (`onClick` → `click`, `onInput` → `input`). 지원은 `click` · `input`뿐
- **알고리즘 결정 9 A (재렌더)**: setter를 부르면 즉시 렌더 + diff + patch (동기). 한 핸들러에서 setter를 여러 번 부르면 그 수만큼 렌더한다. 같은 값(`Object.is`)이면 렌더 0번. Batching은 확장 2뿐
- **Hook 정책**: `hooks` 배열에 부른 순서대로(렌더마다 0번부터) · 종류가 바뀌거나 개수가 달라지면 오류 · 자식 컴포넌트 실행 중 Hook 호출은 오류 · 함수형 setter · 지연 초기화 · effect는 patch 직후(같은 setter 호출 안에서 바로) · 의존성 생략 = 매 렌더, `[]` = 처음 한 번, `[a, b]` = 항목별 `Object.is`로 하나라도 다르면 · 길이가 다르면 바뀜 · cleanup은 다시 실행하기 직전과 `unmount()` 때 · 렌더가 연달아(중첩) 50번(`NESTED_RENDER_LIMIT`) 넘으면 오류 · memo는 같은 의존성이면 재사용, 생략하면 매 렌더 재계산
- **자식 컴포넌트 풀기**: diff 전에 컴포넌트 VNode를 그 자리에서 실행해 결과 요소로 바꾼다 (안쪽까지). diff · patch는 요소 · 글자만 본다. **이전 VNode는 `mount()` · `update()` 때 만든 풀린 VNode 자체를 저장**하고 DOM에서 다시 읽지 않는다. `App()` 결과(VNode 하나) = 영역 상자 안 자식 목록 `[결과]` (Phase 1 규칙)
- **diff 재사용**: `diff` · `patch`는 Phase 1 것을 그대로 쓴다. 이벤트 · `value` · `checked`는 새 patch 종류(`SET_EVENT` · `SET_PROP`)로만 확장한다 (역패치 = 전후 뒤집기, 기존 규칙)
- **공개 API 이름(초안, Dev가 바꾸면 이 표와 `qa_todo`의 화면 약속을 함께 고침)**

| 패키지 | 이름 |
| --- | --- |
| `react-reconciler` | `FunctionComponent`(`hooks` · `mount()` · `update()` · `unmount()` · `lastPatches`), `FunctionComponentHost`(`mount(children)` · `apply(patches)`), `resolveComponents(vnode)`, `depsChanged(prev, next)` |
| `react` | `h`(그대로), `useState` · `useEffect` · `useMemo`, 엔진용 `setHookDispatcher` · `HookDispatcher` 타입 |
| `scheduler` | `scheduleRender(task)` (지금은 즉시 동기 실행 + 중첩 깊이 센다) |
| `react-dom-bindings` | `setEventHandler(element, event, handler \| null)`, `applyDomProp(element, name, value)` |
| `react-dom` | `render(component, container, options?)` → `FunctionComponent` (확장 1에서 `options.onPatch`) |

- **화면 약속 `data-testid`** (검증 페이지 `fixtures/phase2-app/index.html` · 컴포넌트가 붙인다, 이름은 e2e가 이 표를 기준으로 쓴다)

| 칸 | `data-testid` |
| --- | --- |
| 루트 | `app-root`(영역 상자 = `index.html`의 보이지 않는 감싸개 `<div>`, 안에 `App()` 결과 `<main>` 하나) |
| ① 카운터 | `counter-value` · `counter-plus1` · `counter-plus3` · `counter-same` |
| ② 입력창 | `name-input` · `greeting-text` |
| ③ 목록 | `todo-input` · `todo-add` · `todo-list`(`<ul>`) · `todo-empty`(안내 `<p>`) · `todo-summary`("전체 n개 · 완료 m개") · 항목 줄 `<li data-testid="todo-item" data-id="todo-N">` 안의 `todo-check` · `todo-text` · `todo-up` · `todo-down` · `todo-remove` |
| ④ 기록판 | `log-render` · `log-effect` · `log-memo` · `log-patch` · `log-patch-events` |

- **검증 페이지 상태 (루트 `App`만 Hook을 씀, 확정 — 테스트 케이스 확인 5)**: `count`(0) · `name`('') · `draft`('') · `todoList = { items: Todo[], nextId }`(처음 `{ items: [], nextId: 1 }`). 한 번의 [추가] = `setTodoList` + `setDraft('')` 두 번(렌더 2번), [삭제] · [체크] · [위로] · [아래로] = `setTodoList` 한 번(렌더 1번). 횟수(렌더 · effect · memo)는 상태가 아닌 **바깥 변수**로 센다
- 단위 테스트 위치: `packages/<pkg>/src/__tests__/*.test.ts` (bindings는 `src/client/__tests__/`), 검증 페이지의 순수 함수는 `fixtures/phase2-app/__tests__/*.test.ts` (vitest가 이미 포함). 인수 테스트: `e2e/phase2-*.spec.ts`, 공통 도구는 `e2e/phase2-helpers.ts`(`phase1-helpers.ts`의 `test` · `expect` · `holdNodes` · `sameNode` · `observeMutations`를 다시 내보내고 `{ area: 'app-root' }`로 쓴다. 콘솔 `error` 한 건이라도 있으면 실패, **선언하지 않은 dialog도 실패**)
- **`playwright.config.ts` 변경 없음**: 같은 Vite 서버(root `fixtures`, 포트 5199, `reuseExistingServer: false`)가 `/phase2-app/` · `/perf-bench/`도 서빙한다. 페이지 주소는 `/phase2-app/` · `/perf-bench/`

## Dev 항목 — 필수 (Dev-1 ~ Dev-22, Dev-16 제외 = 21개)

- [ ] **Dev-1** (`react-reconciler`): tsc 복구 — `invertPatches` · 테스트 도우미 `applyPatches`의 `switch`가 새 kind(`SET_EVENT` · `SET_PROP`)를 다룬다 (역패치 = 전후 뒤집기) [P2-19 준비 · T-08 회귀]
  - 의존: -
  - 만들 · 고칠 파일: `packages/react-reconciler/src/invertPatches.ts`(`SET_EVENT` · `SET_PROP` 케이스: `before` ↔ `after`, `event` · `name` · `path` 그대로), `packages/react-reconciler/src/__tests__/applyPatches.ts`(검산기: `SET_EVENT`는 `on` + 이벤트 이름 첫 글자 대문자 prop(`click` → `onClick`)을 `after` 함수로 두거나 `null`이면 뺌, `SET_PROP`은 `name` prop을 `after`로 두거나 `null`이면 뺌)
  - 테스트(먼저 실패 확인): 시작 때 `npx tsc --noEmit` **TS2366 2건**(`invertPatches.ts` · `applyPatches.ts`)을 출력 그대로 확인. `packages/react-reconciler/src/__tests__/invertPatches.test.ts`에 종류별 뒤집기 `SET_EVENT`(`null` 포함) · `SET_PROP`(`null` 포함) · 두 번 뒤집으면 원래 · 순서 뒤집기 안에 섞여 있어도 동작 · 입력을 안 고침 — 구현 전에는 `undefined`를 돌려줘 실패
  - 알고리즘: 결정 7 세부(역패치 = 전후 뒤집기 + 역순), 기존 규칙 그대로
  - 완료 근거로 남길 것: 고치기 전 tsc 오류 2건 · 고친 뒤 `npx tsc --noEmit` 0건, `invertPatches.test.ts` 새 케이스 개수, `npx vitest run` 전체 통과 개수(기존 432 + 새 케이스), 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-2** (`react-reconciler`): `diff`가 이벤트 props를 따로 비교한다 — 추가 · 교체 · 삭제를 `SET_EVENT`로, 속성(SET_ATTR)에는 넣지 않는다 [P2-19 · §4.3 이벤트 등록 · 변경 · 제거 · §6.2 핸들러 교체]
  - 의존: Dev-1
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`(이름이 `on` + 대문자이고 값이 함수인 props를 `readAttrs`에서 빼고 `diffEvents` 추가: 이벤트 이름 = `on` 뒤를 소문자로 `onClick` → `click`. 이전 · 새에 같은 함수 참조면 줄 없음, 다르면 `before` · `after` 함수, 이전에 없으면 `before: null`, 새에 없으면 `after: null`. 호출 순서는 SET_ATTR · SET_STYLE 앞이나 뒤 어느 쪽이든 같은 요소 안에서 고정), `packages/react-reconciler/src/__tests__/applyPatches.ts`의 `normalizeTree`(함수 값 `on…` props를 남기도록 맞춤)
  - 테스트(먼저 실패 확인): `packages/react-reconciler/src/__tests__/diffEvents.test.ts` — 같은 함수 참조는 patch 0건(T-04), 다른 함수는 `SET_EVENT` 1건, 처음 붙음(before null), 빠짐(after null), 이벤트 둘 이상 독립, `on` 뒤 소문자가 아니거나 값이 함수가 아니면(`onclick="x"` 문자열) 이벤트가 아님, 이벤트가 있어도 SET_ATTR가 안 생김, 새로 INSERT되는 요소 안의 이벤트는 SET_EVENT를 내지 않음(요소째 새로 그림), 같은 key 이동(MOVE)과 함께여도 경로가 맞음, Phase 1 `diff.test.ts` · `diffKeyed.test.ts` 그대로 통과, 무작위 200쌍 "applyPatches(old, diff) = new"에 이벤트 props 섞기
  - 알고리즘: 결정 8 B(핸들러만 교체), 결정 3 A(한 줄 = 종류 · 경로 · 전 · 후)
  - 완료 근거로 남길 것: `diffEvents.test.ts` 통과 개수, Phase 1 diff 테스트 회귀 없음, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-3** (`react-reconciler`): `diff`가 `value` · `checked`를 DOM 프로퍼티 줄(`SET_PROP`)로 비교한다 — SET_ATTR에서 뺀다 [P2-19 · §4.3 DOM 프로퍼티 · T-06]
  - 의존: Dev-1
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`(`readAttrs`에서 `value` · `checked` 제외, `diffProps` 추가: `before` · `after`가 다를 때만 줄을 내고 `null` = props에 없음. 정규화는 초안 ④-4(테스트 케이스 확인 4 확정): `value`는 문자열 · 숫자 → 문자열, `checked`는 `true` · `""` → `true`, `false` → `false`, 나머지는 없음), `applyPatches.ts`의 `normalizeTree`(같은 정규화)
  - 테스트(먼저 실패 확인): `packages/react-reconciler/src/__tests__/diffProps.test.ts` — `value` 변경 1건 · 같은 값 0건(T-04), 처음 붙음 · 빠짐(`null`), `checked` true ↔ false, 숫자 `value`는 문자열로, `value` · `checked`가 SET_ATTR로 새지 않음, 다른 속성(`type` · `class`)은 기존 그대로, 요소 종류가 다르면 REPLACE(프로퍼티 줄 없음), 무작위 쌍 왕복에 섞기. Phase 1 테스트 중 `value` · `checked`를 속성으로 보던 케이스가 있으면 어느 것을 어떻게 고쳤는지 근거에 적는다 (없으면 "없음"). Phase 1 편집창에서 `value` · `checked` 속성을 고치면 속성 글은 안 바뀌는 한계는 명세 4절에 기록됨(테스트 케이스 확인 4)
  - 알고리즘: 결정 3 A. 정책 「§4.3 DOM 프로퍼티」
  - 완료 근거로 남길 것: 통과 개수, Phase 1 diff 테스트 회귀 없음, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-4** (`react-dom-bindings`): 이벤트 핸들러 저장 + 리스너 하나 — `setEventHandler(element, event, handler | null)` [§4.3 이벤트 등록 · 변경 · 제거 · §6.2 핸들러 교체 후 중복 호출 방지]
  - 의존: -
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/events.ts`(요소별 핸들러 저장소는 `WeakMap<Element, Map<이벤트 이름, EventHandler | null>>` — 요소가 빠지면 함께 사라지고 엔진이 따로 치우지 않음. 그 요소 · 이벤트에서 처음 `handler`가 올 때만 리스너를 **한 번** 등록하고, 리스너는 저장된 핸들러를 꺼내 부름. 교체 = 저장된 값만 바꿈, `null` = 값만 비움(리스너 남김), 지원 밖 이벤트 이름은 `console.warn` 1회 후 무시 — 초안 ④-6 작은 정책, 확정), `packages/react-dom-bindings/src/index.ts`에 내보내기
  - 테스트(먼저 실패 확인): `packages/react-dom-bindings/src/client/__tests__/events.test.ts` — 등록 뒤 `dispatchEvent` 1번에 핸들러 1번 호출, 핸들러를 여러 번 교체해도 한 번 눌렀을 때 **마지막 핸들러만 1번** 호출(중복 없음), `addEventListener` 호출 횟수가 요소 · 이벤트당 1번(`vi.spyOn`), `null`이면 눌러도 아무 일 없고 오류도 없음, `null` 뒤 다시 핸들러를 붙이면 호출됨(리스너 한 번만 등록됨), `click` · `input`이 서로 독립, 요소 둘이 서로 독립, 핸들러가 던진 예외는 그대로 위로, 지원 밖 이벤트 경고
  - 알고리즘: 결정 8 B (리스너 하나 + 핸들러 교체), 정책 「§4.3 이벤트 · 핸들러 저장 위치 · 핸들러 해제」
  - 완료 근거로 남길 것: 통과 개수, `addEventListener` 호출 횟수 단언, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-5** (`react-dom-bindings`): `renderVNode`가 새로 만드는 요소에 이벤트 · `value` · `checked`를 적용한다 (`applyDomProp` 포함) [P2-05 · P2-20 · §4.3 DOM 프로퍼티]
  - 의존: Dev-4
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/domProps.ts`(`applyDomProp(element, name, value)`: `value`는 `element.value`가 **다를 때만** 대입(커서 유지), `checked`는 `element.checked`가 다를 때만, `null` = props에서 빠짐 → `value`는 `''`, `checked`는 `false`로 둠 — 초안 ④-4, 테스트 케이스 확인 4 확정), `packages/react-dom-bindings/src/client/renderVNode.ts`(`applyProps`: `on` + 대문자 + 함수 → `setEventHandler`, `value` · `checked` → 속성이 아니라 `applyDomProp`, 그 밖의 함수 · 객체 props는 지금처럼 경고), `packages/react-dom-bindings/src/index.ts`
  - 테스트(먼저 실패 확인): `packages/react-dom-bindings/src/client/__tests__/renderVNode.test.ts`(고침) · `domProps.test.ts` — 그려진 `<button>`을 `click`하면 핸들러 호출, `<input value="a">` 프로퍼티 `.value === 'a'`이고 `value` **속성은 안 생김**, `checked`, 이벤트가 아닌 함수 props 경고는 그대로, 같은 값이면 대입 안 함(setter 스파이 · `selectionStart` 유지), 숫자 `value`, 기존 Phase 1 `renderVNode` 테스트 그대로 통과
  - 알고리즘: 결정 8 B, 정책 「§4.3 DOM 프로퍼티」
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-6** (`react-dom-bindings`): `patch`가 `SET_EVENT` · `SET_PROP`을 적용한다 (+ 관찰 콜백에 알림) [P2-20 · P2-21 · §4.3 · T-06]
  - 의존: Dev-5
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/patch.ts`(`SET_EVENT` → `setEventHandler(요소, event, after)`, `SET_PROP` → `applyDomProp(요소, name, after)`, 둘 다 `elementAt`로 요소만 허용, 관찰 콜백 `stage: 'after'`로 알림)
  - 테스트(먼저 실패 확인): `packages/react-dom-bindings/src/client/__tests__/patch.test.ts`(고침) — `SET_EVENT` 교체 뒤 눌러도 **새 핸들러만 1번**, `after: null`이면 눌러도 아무 일 없음, `SET_PROP` `value`가 DOM 값과 같으면 대입하지 않음(타이핑 중 커서 유지: `selectionStart` · `selectionEnd` 그대로), 다르면 대입, `checked`, 요소가 아닌 경로면 오류, `SET_EVENT` · `SET_PROP`은 DOM 변경(MutationObserver)을 내지 않음, 같은 목록 안에서 MOVE와 섞여도 맞는 요소에 적용, Phase 1 patch 테스트 그대로 통과
  - 알고리즘: 결정 4 A(경로 + 순서대로), 결정 8 B
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, **`npx playwright test e2e/phase1-*.spec.ts` 96 passed**(Phase 1 회귀), 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-7** (`scheduler`): 재렌더 예약 — `scheduleRender(task)`: 지금은 **즉시 동기 실행**, 중첩 깊이가 50을 넘으면 오류 [P2-15 · 결정 9 A · 무한 렌더 안전장치]
  - 의존: -
  - 만들 · 고칠 파일: `packages/scheduler/src/scheduler.ts`(깊이 카운터를 올리고 `task()` 실행, `finally`로 내림. 깊이가 `NESTED_RENDER_LIMIT`을 넘으면 Error — 문구에 "무한 렌더" · 한도 숫자), `packages/scheduler/src/index.ts`(기존 `.gitkeep` 대신), `packages/scheduler/src/__tests__/scheduler.test.ts`
  - 테스트(먼저 실패 확인): task가 호출한 즉시 한 번 실행됨(동기), 반환 전에 끝남, 중첩 호출(task 안에서 다시 예약)은 즉시 안쪽이 먼저 끝남, 깊이 50은 허용 · 51째에서 오류, task가 예외를 던져도 깊이가 복구됨(다음 예약이 정상), 나란히(연달아 아닌) 호출 1000번은 오류 없음(중첩이 아님), 깊이 카운터가 DOM 전역을 쓰지 않음
  - 알고리즘: 결정 9 A (즉시 동기). Batching은 Dev-27에서 이 파일을 승격
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-8** (`react`): Hook 공개 API — `useState` · `useEffect` · `useMemo`가 지금 렌더 중인 컴포넌트의 디스패처에 위임, 디스패처가 없으면 오류 [P2-08 · P2-11 ~ P2-17 · T-16]
  - 의존: -
  - 만들 · 고칠 파일: `packages/react/src/hooks.ts`(`HookDispatcher` 인터페이스 `useState` · `useEffect` · `useMemo` 세 메서드, `setHookDispatcher(d | null)`, 공개 함수 셋은 현재 디스패처를 부름. **디스패처가 `null`이면 "Hook은 함수형 컴포넌트 렌더 중에만 부를 수 있습니다" 오류**), `packages/react/src/index.ts`에 내보내기(`h` 그대로), `packages/react/src/__tests__/hooks.test.ts`
  - 테스트(먼저 실패 확인): 디스패처 없이 부르면 세 Hook 모두 오류(렌더 밖 · 이벤트 핸들러 안), 가짜 디스패처를 꽂으면 인자(초기값 · 함수 · 의존성)와 반환값이 그대로 오감, `setHookDispatcher(null)`로 되돌림, 타입이 `any` 없이 `useState<number>(0)` 추론됨(컴파일), `react` 패키지가 `document` · `window`를 쓰지 않음
  - 알고리즘: 정책 「§4.2 허용하지 않는 호출」(자식 · 렌더 밖 호출은 오류). 디스패처 연결 방향은 초안 ④-5
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-9** (`react-reconciler`): 자식 컴포넌트 풀기 `resolveComponents` — 컴포넌트 VNode를 그 자리에서 실행해 요소 · 글자로 바꾼다 (안쪽까지), 실행 중 Hook 호출은 오류, 풀리지 않은 컴포넌트 VNode가 diff에 오면 오류 [P2-02 · P2-09 · P2-10 · P2-18 · T-16]
  - 의존: Dev-8
  - 만들 · 고칠 파일: `packages/react-reconciler/src/resolveComponents.ts`(컴포넌트 VNode `type(props)`를 실행해 결과를 다시 푼다 — 결과가 또 컴포넌트면 재귀, 요소의 `children`도 재귀. **자식 실행 동안 `setHookDispatcher`를 "Hook은 루트 컴포넌트에서만 부를 수 있습니다" 오류를 던지는 디스패처로 바꾸고 끝나면 원래대로 되돌림(예외가 나도 `finally`)**. 컴포넌트 VNode의 `key`는 결과 요소에 물려줌(결과가 key를 안 가질 때) — 초안 ④-1, 테스트 케이스 확인 1 확정. 컴포넌트 `children`은 풀 때 props로 넘기지 않음 — 작은 정책, 확정. 글자 · 주석 · 요소는 새 객체로 만들되 입력 VNode는 고치지 않음), `packages/react-reconciler/src/diff.ts`(`diffNode` 맨 앞에 컴포넌트 VNode(`typeof type === 'function'`)가 오면 Error — 현재 diff에는 이 가드가 없다, 초안 ④-6 작은 정책, 확정), `packages/react-reconciler/src/index.ts`, `packages/react-reconciler/src/__tests__/resolveComponents.test.ts`
  - 테스트(먼저 실패 확인): 컴포넌트가 요소로 풀림, 안쪽 중첩 컴포넌트까지 풂, props가 그대로 전달되어 값이 UI에 반영(P2-10), 같은 컴포넌트를 다른 props로 풀면 결과가 달라짐, 자식이 `useState`를 부르면 오류 · 오류가 난 뒤에도 디스패처가 복구됨, 풀린 트리에는 함수 type이 없음, key 물려주기(`h(Row, { key: 'a' })` → 결과 요소 `key: 'a'`), 이미 key가 있는 결과는 덮지 않음, 입력 VNode를 안 고침(깊게 얼린 입력), diff가 컴포넌트 VNode를 받으면 오류, `children`이 컴포넌트 props에 들어가지 않음. Phase 1 diff 테스트 그대로 통과
  - 알고리즘: 정책 「자식 컴포넌트 풀기」「§4.2 허용하지 않는 호출」
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-10** (`react-reconciler`): `FunctionComponent` 뼈대 — `hooks` 배열 · `mount()` · `update()` : 렌더 → 풀기 → (처음) 그리기 / (다시) diff → patch 적용, 이전 VNode 보관 [P2-01 · P2-03 ~ P2-06 · P2-18 · P2-19 · T-09 · T-15]
  - 의존: Dev-2, Dev-3, Dev-7, Dev-8, Dev-9
  - 만들 · 고칠 파일: `packages/react-reconciler/src/FunctionComponent.ts`(`class FunctionComponent`: 생성자 `(component, props, host)`, 공개 `hooks: HookSlot[]` · 읽기 전용 `lastPatches`(테스트 케이스 확인 2 확정), `mount()` = 렌더(루트 디스패처를 꽂고 컴포넌트 실행) → `resolveComponents` → `[결과]`(`App()` 결과 VNode 하나 = 영역 자식 목록 `[결과]`, 작은 정책 확정)를 `host.mount`로 → 풀린 VNode 저장, `update()` = 렌더 → 풀기 → `diff(저장해 둔 이전, 새)` → patch가 1줄 이상이면 `host.apply` → 저장 → `lastPatches` 갱신. **`host`는 DOM을 모르는 인터페이스 `FunctionComponentHost { mount(children): void; apply(patches): void }`**), `packages/react-reconciler/src/index.ts`, `packages/react-reconciler/src/__tests__/functionComponent.test.ts`(가짜 host로 DOM 없이)
  - 테스트(먼저 실패 확인): `mount()`가 컴포넌트를 1번 실행하고 host.mount에 `[VNode]`를 넘김, `update()`가 다시 실행하고 **diff 결과(Patch 목록)를 host.apply에 넘김**, 바뀐 게 없으면(T-04) `host.apply`가 호출되지 않고 `lastPatches`가 빈 목록, 이전 VNode는 저장한 것을 쓰며 host(DOM)에서 읽지 않음(host에 읽기 메서드가 없음), 컴포넌트를 `h(Child, props)`로 쓴 트리가 풀려 patch에 컴포넌트 VNode가 없음, 새 VNode가 매번 만들어짐(P2-18, 직전과 `!==`), `hooks`가 배열이고 Hook 호출이 없으면 빈 배열, `FunctionComponent`(래퍼 클래스)와 `App`(함수형 UI 컴포넌트)이 구분됨(P2-01), `document` · `window`를 쓰지 않음
  - 알고리즘: 정책 「이전 VNode 보관」「자식 컴포넌트 풀기」, 결정 3 A, 결정 4 A (Phase 1 diff 재사용)
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-11** (`react-reconciler`): `useState` — 슬롯 · 초기값 · 지연 초기화 · 상태 유지 · 여러 상태 구분 · setter(같은 값 무시 · 함수형 · 즉시 갱신) · 호출 순서 [P2-11 ~ P2-15 · T-10 · T-11 · §4.2 · §6.2 함수형 setter · 동일 값 · 연속 setter]
  - 의존: Dev-10
  - 만들 · 고칠 파일: `packages/react-reconciler/src/FunctionComponent.ts`(렌더 중 디스패처의 `useState`: `hooks[번호]`가 없으면 `{ kind: 'state', value, setter }`를 만듦(초기값이 함수면 **처음 한 번만** 실행), 있으면 그 슬롯을 돌려줌 — setter는 렌더 사이에 **같은 함수**. 번호는 렌더마다 0번부터. setter(`next`): 함수면 `next(현재 값)`, 아니면 값 → `Object.is`로 현재 값과 같으면 아무 일 없음, 다르면 슬롯 값을 바꾸고 `scheduleRender(() => this.update())`(P2-15 자동 갱신). 같은 번호의 종류가 `state`가 아니면 오류), `packages/react-reconciler/src/__tests__/useState.test.ts`
  - 테스트(먼저 실패 확인): 초기값 사용(P2-11), 지연 초기화 함수는 처음 한 번만 실행되고 다시 렌더해도 안 부름, 렌더가 또 돌아도 값 유지(P2-12 · T-10), 여러 `useState`가 안 섞임(T-11), setter 함수가 렌더 사이에 같은 참조, setter 한 번에 렌더 1번 + `host.apply` 반영(별도 렌더 호출 없음, P2-15), **같은 값 setter는 렌더 0번**(`Object.is`: `NaN`도 같음, `{}`는 다른 값), 함수형 setter(`c => c + 1`), **한 핸들러에서 함수형 setter를 3번 부르면 +3이고 렌더 3번**, 값 setter 3번은 마지막 값(옛 값을 읽는 클로저는 +1만 됨 — 정책 기록용 테스트), 함수형 setter가 이전 값을 돌려주면(같은 값) 렌더 0번, 상태가 렌더 사이에 객체 참조를 유지
  - 알고리즘: 결정 9 A (즉시 동기), 정책 「§4.2 Hook 구분 · useState 동일 값 · 함수형 setter · 지연 초기화」
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-12** (`react-reconciler`): `useMemo` + 의존성 비교 `depsChanged` — 처음 계산 · 같은 의존성 재사용 · 바뀌면 재계산 · 생략하면 매 렌더 [P2-17 · T-13 · §6.2 Memo 의존성 생략 · 경계]
  - 의존: Dev-10
  - 만들 · 고칠 파일: `packages/react-reconciler/src/deps.ts`(`depsChanged(prev, next)`: `null`(생략)이면 항상 바뀜, 항목마다 `Object.is`, 길이가 다르면 바뀜, `[]` vs `[]`는 안 바뀜), `FunctionComponent.ts`(디스패처의 `useMemo`: 슬롯 `{ kind: 'memo', value, deps }`, 바뀌면 `factory()`를 다시 실행해 저장), `packages/react-reconciler/src/__tests__/deps.test.ts` · `useMemo.test.ts`
  - 테스트(먼저 실패 확인): `depsChanged` 경계(`null` · `[]` · 길이 다름 · `NaN` · `+0`/`-0` · 객체 참조), `useMemo` 처음 계산 1번, 같은 의존성이면 factory 호출 0번(재사용, 같은 값 참조), 의존성이 바뀌면 다시 계산, 생략하면 매 렌더 다시 계산, `[]`는 처음 한 번, 다른 상태가 바뀌어도(의존성 그대로) 재사용(T-13), 결과가 객체여도 참조 유지, 슬롯 번호 불일치 시 오류
  - 알고리즘: 정책 「§4.2 useMemo · 의존성 비교」
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-13** (`react-reconciler`): `useEffect` — patch 직후 실행 · 의존성(생략 / `[]` / 변경) · cleanup(재실행 직전) · `unmount()` [P2-16 · T-12 · §4.2 · §6.2 Effect 의존성 · cleanup · unmount]
  - 의존: Dev-11, Dev-12
  - 만들 · 고칠 파일: `packages/react-reconciler/src/FunctionComponent.ts`(디스패처의 `useEffect`: 슬롯 `{ kind: 'effect', deps, cleanup }`와 이번 렌더에서 실행할 effect 목록. **`mount()` · `update()`가 `host.mount` · `host.apply`를 끝낸 직후** 목록을 순서대로: `depsChanged`면 이전 `cleanup` 실행 → 본문 실행 → 돌려준 함수를 `cleanup`에 저장. `unmount()`: 남은 모든 cleanup을 실행하고 이후 setter는 아무 일 없음 — 초안 ④-6 작은 정책, 확정), `packages/react-reconciler/src/__tests__/useEffect.test.ts`
  - 테스트(먼저 실패 확인): effect가 **DOM(host) 반영 뒤에** 실행됨(host 가짜가 호출 순서를 기록: `mount` → effect), 의존성 생략 = 매 렌더 뒤, `[]` = mount 한 번만, `[a]` = 값이 바뀔 때만(다른 상태가 바뀌어도 안 돎), 여러 effect는 선언 순서대로, cleanup은 **다시 실행하기 직전**에 1번(마운트 직후엔 없음), 의존성이 안 바뀌면 cleanup도 안 부름, `unmount()`가 마지막 cleanup을 부르고 두 번 부르면 두 번째는 아무 일 없음, `unmount()` 뒤 setter 무시, effect가 아무것도 안 돌려줘도 정상, **effect 안에서 setter**를 부르면 렌더가 한 번 더 중첩되고 최종 상태 · 이전 VNode가 맞음, 실행 순서 `cleanup(이전) → 본문(새)`
  - 알고리즘: 결정 9 A (같은 setter 호출 안에서 바로), 정책 「§4.2 useEffect 실행 시점 · 의존성 · cleanup · 해제」
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-14** (`react-reconciler`): Hook 호출 오류 정책 · 무한 렌더 안전장치 · 렌더 중 예외 뒤 복구 [P2-08 · §4.2 허용하지 않는 호출 · 무한 렌더 · T-16 · §6.2 오류 복구]
  - 의존: Dev-11, Dev-12, Dev-13
  - 만들 · 고칠 파일: `packages/react-reconciler/src/FunctionComponent.ts`(렌더가 끝났을 때 `hooks.length`가 지난번(첫 렌더 이후)과 다르거나, 같은 번호의 `kind`가 바뀌면 "Hook 호출 순서 · 개수가 달라졌습니다" 오류 — 오류가 나면 이번 렌더는 **적용하지 않음**: 이전 VNode · DOM · 슬롯 값 그대로. 렌더 중 컴포넌트가 던진 예외도 같은 방식(상태 그대로, 예외는 위로)), `packages/react-reconciler/src/__tests__/hookErrors.test.ts`
  - 테스트(먼저 실패 확인): 조건부 `if (flag) useState(...)`로 개수가 달라지면 오류, 순서가 바뀌어 `kind`가 달라지면 오류, 오류 뒤 DOM(host.apply 호출 없음) · 이전 VNode 보존, 오류 뒤 다음 `update()`가 정상(깊이 카운터 · 디스패처 복구), 자식 컴포넌트에서 `useState` · `useEffect` · `useMemo` 호출은 각각 오류(T-16), 렌더 밖에서 Hook 호출 오류(Dev-8과 통합 확인), **effect 안에서 매번 setter를 부르는 컴포넌트**는 중첩 50번째를 넘으면 오류가 나고 그 뒤에도 앱이 죽지 않음(깊이 복구), 중첩이 50 이하로 끝나는 연쇄(예: 카운터를 10까지 올리는 effect)는 정상
  - 알고리즘: 정책 「§4.2 허용하지 않는 호출 · 무한 렌더 안전장치」
  - 완료 근거로 남길 것: 통과 개수, 오류 문구, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-15** (`react-dom`): `render(component, container)` 진입점 — 바인딩을 host로 연결해 `FunctionComponent`를 만들고 `mount()` + 엔진 연결 확인(제외한 Dev-16에서 옮긴 검사 포함) [P2-05 · P2-06 · P2-20 · P2-21 · T-09 · T-10 · T-12 · T-14 · T-15 · §4.3 · §5 Key · §6.2 핸들러 교체]
  - 의존: Dev-6, Dev-10, Dev-11, Dev-13 (렌더 테스트가 `useState` · `useEffect`를 씀. Dev-16 제외 뒤 이 Dev가 엔진을 처음 실제 DOM(jsdom)에 이어 붙여 보는 곳)
  - 만들 · 고칠 파일: `packages/react-dom/src/render.ts`(host: `mount(children)` → `renderAreaChildren(container, children)`, `apply(patches)` → `patch(container, patches)`. `container` = 영역 상자. `new FunctionComponent(component, {}, host)` → `mount()` → 인스턴스를 돌려줌. DOM은 `@mini-react/react-dom-bindings`만 거침, 직접 `document`를 안 씀), `packages/react-dom/src/index.ts`에 `render`(기존 `History` · `createVDomRoot` 그대로), `packages/react-dom/src/__tests__/render.test.ts`(jsdom)
  - 테스트(먼저 실패 확인): `render(App, container)`가 컨테이너 안에 초기 UI를 그림(P2-05), 컨테이너 자신은 건드리지 않음(영역 상자), 클릭 → setter → **별도 렌더 호출 없이 DOM이 바뀜**(P2-15), 바뀐 글자 노드만 바뀌고 **형제 · 부모 요소는 같은 참조**(T-06 · P2-21), 바뀐 게 없으면 DOM 변경 0건(T-04, MutationObserver), 컨테이너를 `innerHTML`로 통째 바꾸지 않음(`replaceChildren`은 mount 때 한 번뿐이라는 스파이 단언), `render`가 돌려준 인스턴스의 `unmount()`가 cleanup 실행. Phase 1 `createVDomRoot` 테스트 그대로 통과
  - **옮긴 검사 (Dev-16 제외로 여기 `render.test.ts`에 추가, 테스트 안에서 `h` · 훅 · `render`를 이어 붙인 작은 카운터 · 입력창 · 목록 앱)**: ① `input` 이벤트 → 상태 → `<input>` `value` 프로퍼티 반영(T-14 · §4.3 입력), 입력창이 **같은 노드 · 포커스 · `selectionStart`가 유지**(다른 상태 변경 · 타이핑 도중, T-10 · §4.3), ② 다른 상태를 렌더 20번 일으킨 뒤 `click` 1번 = 핸들러 정확히 1번(핸들러 교체 뒤 중복 호출 없음, §6.2), ③ `h(Row, { key })` 컴포넌트 목록의 순서 바꾸기 → 같은 key `<li>`가 `===`로 유지되고 이동 뒤 [삭제]가 맞는 항목에 걸림(Key MOVE + key 물려주기 연결, §5), ④ 목록 한 바퀴: 안내 `<p>` ↔ `<ul>` 교체 · 항목 추가 · 삭제 · class 속성 변경이 맞는 DOM(D-02 ~ D-05), ⑤ effect 본문 안에서 컨테이너 DOM을 읽으면 이미 새 값이 반영돼 있음(effect는 patch 직후, T-12 실제 DOM), ⑥ 카운터 [+3] 렌더 3번 · 같은 값은 렌더 0번 + DOM 변경 0건(`render` 횟수는 바깥 변수, T-04 · T-14). 엔진 코드에서 틀린 게 드러나면 해당 Dev의 파일을 고치고 근거에 적는다
  - 알고리즘: 정책 「이전 VNode 보관」(DOM에서 다시 읽지 않음), 결정 4 A, 결정 8 B · 9 A
  - 완료 근거로 남길 것: 통과 개수(옮긴 검사 ① ~ ⑥ 개수 따로), 전체 vitest · tsc, Phase 1 e2e 96 passed, 커밋 해시
  - **완료 근거 (Evidence)**:

- ~~**Dev-16**~~ **제외 (테스트 케이스 확인 7, 사용자 결정 — 다른 Dev 단위 테스트 · e2e와 겹침).** 번호는 다시 매기지 않는다. 이 Dev가 덮으려던 T-ID · §6.2 항목은 Dev-9 · 10 · 11 · 12 · 13 · 14 · 15(옮긴 검사) · 20 · 22와 QA로 덮는다 (`../02_planning_review/03_worker_revised.md` 대조표)

- [ ] **Dev-17** (`fixture` + `e2e`): 검증 페이지 뼈대 + 루트 `App` + ① `CounterPanel` — 페이지가 열리고 [+1] · [+3] · [그대로]가 동작한다 [P2-01 · P2-02 · P2-07 · P2-09 · P2-10 · P2-11 · P2-12 · P2-14 · P2-15 · P2-22 · T-09 · T-10 · T-14 · D-01]
  - 의존: Dev-15
  - 만들 · 고칠 파일: `fixtures/phase2-app/index.html`(제목 · `<div data-testid="app-root">` 하나, 720px 이하에서 위아래로 쌓임 · 가로 스크롤 없음, Phase 1 페이지 정도로 단순한 스타일), `fixtures/phase2-app/main.ts`(`render(App, document.querySelector('[data-testid="app-root"]'))` 한 줄 + 연결만), `fixtures/phase2-app/App.ts`(**루트: 모든 `useState` · `useEffect` · `useMemo`는 이 파일에서만**. 이 Dev에서는 `count` 상태), `fixtures/phase2-app/components/CounterPanel.ts`(props만 받는 순수 함수: 숫자 + [+1] · [+3] · [그대로], 버튼 `onClick`은 루트가 내려 준 `onPlus1` · `onPlus3` · `onSame`), `.gitkeep`는 지움. [+1] = `setCount(c => c + 1)` 한 번, [+3] = 같은 함수형 setter **세 번 연달아**, [그대로] = `setCount(count)`(같은 값)
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-render.spec.ts`(QA-1) · `e2e/phase2-counter.spec.ts`(QA-2 · QA-3 · QA-4) + `e2e/phase2-helpers.ts` — 먼저 쓰면 페이지가 없어 `getByTestId('counter-value')`를 못 찾고 실패. 렌더 횟수는 이 Dev에서는 페이지가 `window.__renderCount`(바깥 변수)를 노출하는 것으로 읽는다(Dev-21에서 기록판 칸으로 옮김). 단위: 없음(엔진 로직 없음)
  - 알고리즘: 결정 9 A (이 Dev의 [+3] = 렌더 3번이 정책으로 기록되는 곳)
  - 완료 근거로 남길 것: `npx playwright test e2e/phase2-render.spec.ts e2e/phase2-counter.spec.ts` desktop · mobile 통과 개수와 먼저 쓴 실패 출력, 전체 playwright(phase1 96 포함) 결과, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-18** (`fixture` + `e2e`): ② `GreetingPanel` — 이름 입력(`onInput` · `value`) → 인사 글자, 입력 중 포커스 · 커서 유지 [§4.3 입력 이벤트 · value · 포커스 · 커서 · P2-13 · P2-22 · T-10 · T-11 · T-14 · D-01]
  - 의존: Dev-17
  - 만들 · 고칠 파일: `fixtures/phase2-app/App.ts`(`name` 상태 더함), `fixtures/phase2-app/components/GreetingPanel.ts`(`<input data-testid="name-input" value={name} onInput>` + 인사 글자: 이름이 비면 "이름을 입력해 주세요", 아니면 `안녕하세요, ○○님` — 초안 ④-8, 테스트 케이스 확인 5 확정)
  - **지원하지 않는 입력(숫자 칸) = 해당 없음 · 기록만 (테스트 케이스 확인 6)**: 화면에 숫자 칸이 없으므로 `readNumberInput` 함수 · 단위 테스트를 만들지 않는다. 정책("숫자 칸에 빈칸 · 글자면 상태 그대로, 입력창 글자도 그대로")은 명세 4.3 · README 「정책」에만 기록하고, §6.2 결과표에는 "해당 없음(숫자 칸 없음)"으로 적는다
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-input.spec.ts`(QA-5 · QA-6 · QA-7), `e2e/phase2-attack.spec.ts`의 QA-A8(빠른 타이핑)·QA-A1의 이름 부분·QA-A3의 이름 비움 부분(나머지는 Dev-22에서 마저). 단위: 없음 (엔진 로직 없음, 입력창 값 · 포커스 · 커서의 jsdom 확인은 Dev-6 · Dev-15에서)
  - 알고리즘: 정책 「§4.3 입력 이벤트 · 포커스 · 커서」 (「지원하지 않는 입력」은 해당 없음 · 기록만)
  - 완료 근거로 남길 것: e2e 통과 개수와 실패 출력, 전체 playwright · vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-19** (`fixture` + `e2e`): ③ `TodoPanel` · `TodoRow` — 추가 · 체크(`checked`) · 삭제 · "전체 n개 · 완료 m개"(`useMemo`) · 빈 목록 안내 ↔ 목록 · key = 항목 id [P2-10 · P2-13 · P2-17 · P2-22 · T-11 · T-13 · T-14 · T-16 · D-02 · D-03 · D-04 · D-05 · §5 목록 · key]
  - 의존: Dev-18, Dev-12 (`useMemo`)
  - 만들 · 고칠 파일: `fixtures/phase2-app/App.ts`(`draft` · `todoList = { items, nextId }` 상태(테스트 케이스 확인 5 확정, 처음 `{ items: [], nextId: 1 }` = 빈 목록), `useMemo(() => 개수 · 완료 수 계산(memo 횟수 바깥 변수 +1), [todoList.items])`), `fixtures/phase2-app/todoOps.ts`(순수 함수: `addTodo` · `toggleTodo` · `removeTodo` — 입력을 안 고치고 새 배열, 지운 번호는 다시 쓰지 않음(`nextId`는 줄지 않음)), `fixtures/phase2-app/components/TodoPanel.ts`(입력창 `todo-input` + [추가] + 요약 + 목록이 비면 `<p data-testid="todo-empty">`, 아니면 `<ul>`), `fixtures/phase2-app/components/TodoRow.ts`(`<li key={id} data-id class={done ? 'todo done' : 'todo'}>` + 체크박스 `checked={done}` `onClick` + 글자 + [삭제]). 빈 글 · 공백만 [추가]는 상태 그대로(렌더 0번 — 초안 ④-8, 테스트 케이스 확인 5 확정)
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-todo.spec.ts`(QA-8 · QA-9 · QA-10 · QA-12 · QA-13) + `e2e/phase2-attack.spec.ts`의 QA-A5(지운 id 재사용 안 함)·QA-A3의 빈 할 일 부분(나머지 공격 시나리오는 Dev-22에서 마저), 단위 `fixtures/phase2-app/__tests__/todoOps.test.ts`(추가 · 체크 · 삭제 · id가 재사용되지 않음 · 입력 안 고침)
  - 알고리즘: 정책 「§5 목록 · key」(key = 항목 id, 지운 번호 재사용 안 함), 「자식 컴포넌트 풀기」(TodoRow key 물려주기, 테스트 케이스 확인 1)
  - 완료 근거로 남길 것: e2e 통과 개수와 실패 출력, `todoOps.test.ts` 개수, 전체 playwright · vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-20** (`fixture` + `e2e`): ③ [위로] · [아래로] — Key 비교(MOVE)를 화면에서 시연, 순서를 바꿔도 같은 key `<li>` 노드가 유지된다 [§5 Key · T-06 · T-14 · P2-22]
  - 의존: Dev-19
  - 만들 · 고칠 파일: `fixtures/phase2-app/todoOps.ts`(`moveTodo(items, id, delta)`: 경계(맨 위 [위로] · 맨 아래 [아래로])는 같은 배열을 그대로 돌려줌 → 상태가 같은 값이라 렌더 0번 — 테스트 케이스 확인 5 확정), `fixtures/phase2-app/components/TodoRow.ts`([위로] · [아래로] 버튼 추가), `fixtures/phase2-app/App.ts`(핸들러 연결)
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-todo.spec.ts`(QA-11) + `e2e/phase2-attack.spec.ts`의 QA-A7 · QA-A9(나머지는 Dev-22에서 마저), 단위 `todoOps.test.ts`에 `moveTodo`(위 · 아래 · 경계 · 입력 안 고침 · 항목 하나뿐인 목록)
  - 알고리즘: 결정 2 B (Phase 1의 key 표 매칭 + MOVE를 그대로 씀), 결정 8 B (이동 뒤 핸들러 교체)
  - 완료 근거로 남길 것: e2e 통과 개수와 실패 출력, `todoOps.test.ts` 개수, 전체 playwright · vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-21** (`fixture` + `e2e`): ④ `LogPanel` + 탭 제목 effect — 렌더 · effect · memo 횟수와 마지막 update의 patch 줄 수, `useEffect(…, [count])`로 탭 제목 [P2-16 · P2-18 ~ P2-21 · T-12 · T-13 · T-15 · §4.3 이벤트 중복 없음]
  - 의존: Dev-20
  - 만들 · 고칠 파일: `fixtures/phase2-app/App.ts`(바깥 변수 `renderRuns` · `effectRuns` · `memoRuns`. 렌더 시작에 `renderRuns++`. effect 둘: ① `useEffect(() => { effectRuns++; document.title = '카운터 ' + count + ' - Phase 2'; }, [count])` ② 의존성 생략 effect — **기록판의 "effect 횟수" · "patch 줄 수" 칸에 글자를 직접 씀**(렌더가 끝난 뒤에야 알 수 있는 값이라 VNode로는 한 박자 늦기 때문, 초안 ④-2, 테스트 케이스 확인 2 확정. 칸은 VNode에 **자식 없는 빈 `<span>`**이라 diff와 충돌하지 않음)), `fixtures/phase2-app/components/LogPanel.ts`(props: `renderRuns` · `memoRuns`는 VNode 글로, `log-effect` · `log-patch` · `log-patch-events`는 빈 칸), `fixtures/phase2-app/main.ts`(`render`가 돌려준 인스턴스를 effect가 `lastPatches`로 읽을 수 있게 연결: patch 줄 수 = `lastPatches.length`, 그중 `SET_EVENT` 줄 수를 따로 표시 — 초안 ④-3, 테스트 케이스 확인 3 확정: 전체 `log-patch` · 이벤트 교체 `log-patch-events`), Dev-17의 임시 `window.__renderCount`는 지우고 e2e가 기록판 칸을 읽는다
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-log.spec.ts`(QA-14 · QA-15 · QA-16 · QA-17 · QA-18), 단위: 없음 (엔진 로직 없음. 순수 요약 함수를 만들면 `__tests__`에 추가)
  - 알고리즘: 결정 9 A (patch 직후 effect), 결정 8 B (이벤트 교체 줄이 매 렌더 핸들러 수만큼 생김 — 핸들러가 달린 요소 수가 곧 SET_EVENT 줄 수)
  - 완료 근거로 남길 것: e2e 통과 개수와 실패 출력, 기록판 숫자 예시(로드 직후 · [+1] 뒤), 전체 playwright · vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-22** (`fixture` + `e2e`): 공격적 시나리오 + 루트 전용 Hook 코드 확인 + 전체 회귀 확인 [P2-24 · T-14 · T-16 · §6.2 전반]
  - 의존: Dev-21, Dev-14 (Dev-16 제외 뒤 엔진 오류 정책 Dev가 마지막 전체 회귀 전에 끝나 있도록)
  - 만들 · 고칠 파일: `e2e/phase2-attack.spec.ts`(QA-A1 ~ QA-A9 마무리), `fixtures/phase2-app/__tests__/rootOnlyHooks.test.ts`(**T-16 코드 확인**: `fixtures/phase2-app` 소스 파일을 읽어 `useState` · `useEffect` · `useMemo` 호출은 `App.ts`에만 있고 `components/*.ts`에는 없음, 컴포넌트 함수들이 `document` · `window`를 안 씀), 필요하면 `fixtures/phase2-app/components/*`의 잔손질
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-attack.spec.ts` 전체(QA-A1 ~ A9), 단위 `rootOnlyHooks.test.ts`. 앞 Dev에서 이미 만들어진 동작이면 "작성 즉시 통과"로 근거에 쓴다(처음부터 실패하는 것은 새로 드러난 결함뿐)
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: `npx playwright test` **전체**(phase1 96 + phase2 전부, desktop · mobile) 개수, `npx vitest run` 전체 · `npx tsc --noEmit` 0, T-09 ~ T-16 각각 어느 테스트가 덮는지 최종 대조표, desktop · mobile 캡처 경로, 커밋 해시
  - **완료 근거 (Evidence)**:

## Dev 항목 — 확장 1: 성능 대시보드 (`fixtures/perf-bench`, 필수가 모두 끝난 뒤)

- [ ] **Dev-23** (`react-dom`) **(확장 1)**: `render` 옵션 `onPatch` — patch 관찰 콜백을 그대로 전달해 DOM 작업을 집계할 수 있게 한다 [PRD §7 M-02]
  - 의존: Dev-15
  - 만들 · 고칠 파일: `packages/react-dom/src/render.ts`(`options.onPatch`를 `patch(container, patches, onPatch)`에 전달. 없으면 동작이 이전과 똑같음), `packages/react-dom/src/__tests__/render.test.ts`(고침)
  - 테스트(먼저 실패 확인): 콜백이 update의 patch마다 `{ patch, node, stage }`로 불림, 무변경 update는 불리지 않음, `SET_EVENT` · `SET_PROP`도 알림, 콜백이 없으면 이전 테스트 그대로 통과
  - 알고리즘: 해당 없음 (Phase 1 관찰 콜백 재사용)
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, Phase 1 e2e 96 passed, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-24** (`fixture` + `e2e`) **(확장 1)**: 측정 러너 + 통계 — 준비 5회 · 측정 30회 이상, p50 · p95, 반복 중 오류는 숨기지 않고 기록 [PRD §8.2 · M-07]
  - 의존: -
  - 만들 · 고칠 파일: `fixtures/perf-bench/stats.ts`(순수 함수 `percentile(values, p)` · `summarize(values)` → `{ n, p50, p95, min, max }`), `fixtures/perf-bench/runner.ts`(`runScenario({ setup, step, warmup = 5, runs = 30 })`: 매 반복 전에 상태를 초기화하고, `step` 구간을 `performance.now()`로 잼, 오류가 나면 그 반복을 "오류"로 남기고 개수를 결과에 포함), `fixtures/perf-bench/__tests__/stats.test.ts` · `runner.test.ts`
  - 테스트(먼저 실패 확인): p50 · p95 경계(1개 · 짝수 · 홀수 · 정렬 안 된 입력 · 입력 안 고침), 준비 5회는 결과에서 빠지고 측정 30회만 요약됨, 매 반복 `setup` 호출 횟수, 오류 반복이 조용히 빠지지 않고 `errors` 개수로 남음
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-25** (`fixture` + `e2e`) **(확장 1)**: 시나리오 B-01 ~ B-05 + 지표 M-02 ~ M-06 — 작은 공통 fixture(같은 초기 트리 · 같은 변경)로 반복 측정 [PRD §7 M-02 ~ M-06 · §8.1 B-01 ~ B-05]
  - 의존: Dev-23, Dev-24
  - 만들 · 고칠 파일: `fixtures/perf-bench/scenarios.ts`(공통 fixture: 항목 N개(예: 100개) 목록 한 개 + 헤더 · 카운터. **노드 수 · 항목 수 · 트리 깊이를 결과에 명시**. B-01 변경 없음 · B-02 텍스트 하나 · B-03 속성 하나 · B-04 자식 하나 추가 · 삭제 · B-05 여러 위치 동시 변경. 시간은 단계별로 따로: M-04 VNode 생성(컴포넌트 실행 + 풀기) · M-05 `diff` · M-06 `patch`를 각각 `performance.now()`로, M-02 DOM 작업은 `onPatch`로 종류별 집계(생성 · 삽입 · 삭제 · 교체 · 글자 · 속성 · 프로퍼티 · 핸들러 교체를 **집계 단위로 명시**, MutationObserver 레코드 수와 구분해 둘 다 기록)), 계측 패널은 **측정 영역 밖**에 둠(계측 DOM 변경이 측정에 안 들어감)
  - 테스트(먼저 실패 확인): `fixtures/perf-bench/__tests__/scenarios.test.ts` — 각 시나리오가 기대한 patch 종류 · 개수를 냄(B-01은 0건, B-02는 SET_TEXT 1건 …), 집계 단위별 개수가 patch 목록과 일치, 노드 수 · 항목 수가 결과에 들어감
  - 알고리즘: 해당 없음 (Batching 비교 시나리오는 제외 — 명세)
  - 완료 근거로 남길 것: 통과 개수, 전체 vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-26** (`fixture` + `e2e`) **(확장 1)**: 시나리오 B-06 · B-07 + M-01 · M-03 · M-07 + 측정 조건 기록 + 결과 표 페이지 [PRD §7 M-01 · M-03 · M-07 · §8.1 B-06 · B-07 · §8.2]
  - 의존: Dev-25
  - 만들 · 고칠 파일: `fixtures/perf-bench/index.html` · `main.ts`(실행 버튼 + 결과 표(p50 · p95 · 반복 횟수 · 오류 수) + **측정 조건 기록**: 브라우저 · 버전(`navigator.userAgent`) · 화면 크기 · 빌드 모드(dev 서버 / 빌드) · CPU 제한 여부는 사람이 적는 칸), `fixtures/perf-bench/scenarios.ts`(B-06 연속 상태 변경: setter 여러 번 → 최종 상태 · 렌더 횟수 · 처리시간(M-07: setter 호출부터 DOM 반영 완료까지, 화면 표시 완료가 아님을 표에 적음) · B-07 개인 앱 대표 동작: 검증 페이지 App으로 [+1] · 입력 · 목록 동작, M-03 노드 참조 유지 = 보존 대상으로 정한 노드 중 같은 참조 수 / 대상 수, M-01은 "기능 테스트 결과는 `qa_todo`/`vitest` 결과를 사람이 옮겨 적는 칸"으로 표시)
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase2-perfbench.spec.ts`(QA-20: 스모크 — 페이지가 열리고 시나리오를 실행하면 표에 B-01 ~ B-07 행이 생기며 반복 횟수(준비 5 · 측정 30)와 오류 0이 표시, 측정 조건 칸이 채워짐, 콘솔 오류 없음. 숫자 값 자체는 기기마다 달라 단언하지 않음), 단위: `scenarios.test.ts`에 B-06 · B-07
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: e2e 통과 개수와 실패 출력, 실제 한 번 측정한 결과 표 한 줄 예시(측정 조건과 함께, 측정하지 않은 수치는 쓰지 않음), 전체 playwright · vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:

## Dev 항목 — 확장 2: Batching (**시간이 남으면만**, 확장 1 뒤)

- [ ] **Dev-27** (`scheduler` + `react-reconciler`) **(확장 2, 시간이 남으면)**: 알고리즘 결정 9를 A → B로 승격 — `queueMicrotask`로 setter를 모아 한 번 렌더 [PRD §4.2 Batching(선택) · 결정 9 B]
  - 의존: Dev-11, Dev-13, Dev-14
  - 만들 · 고칠 파일: `packages/scheduler/src/scheduler.ts`(`scheduleRender`가 컴포넌트별로 한 번만 `queueMicrotask`에 예약, 같은 틱의 setter는 마지막 값으로 한 번만 렌더. 중첩 안전장치는 "연달아 50번 렌더"로 의미를 다시 정함 — 안전장치 의미 변경은 초안 ④-9), `packages/react-reconciler/src/FunctionComponent.ts`(setter의 슬롯 값 갱신은 즉시, 렌더는 예약), 관련 테스트 `scheduler.test.ts` · `useState.test.ts` · `useEffect.test.ts` · `hookErrors.test.ts` · `render.test.ts`(Dev-15에서 옮긴 검사 포함)를 `await`(마이크로태스크 비우기) 형태로 고침, `types_changelog.md`에 `[알고리즘]` 줄(이유 · 영향 · 재실행 완료)은 **마스터가 기록**하고 작업자는 문장 초안을 완료 근거에 적는다
  - 테스트(먼저 실패 확인): 한 핸들러에서 setter 3번 → 렌더 1번 · 최종 상태 맞음, 같은 값이면 렌더 0번, effect는 렌더 뒤 한 번, 마이크로태스크 사이에 이벤트 핸들러가 읽는 상태(함수형 setter 필요성) 기록, 중첩 안전장치 동작, 예외 뒤 큐가 막히지 않음, 기존 테스트 전부 통과(await 형태로)
  - 알고리즘: 결정 9 B (마이크로태스크 Batching), `types_changelog.md` `[알고리즘]`
  - 완료 근거로 남길 것: 변경한 테스트 목록, 통과 개수, 전체 vitest · tsc, Phase 1 e2e 96 passed, `types_changelog.md`에 넣을 문장 초안, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-28** (`fixture` + `e2e`) **(확장 2, 시간이 남으면)**: 화면 e2e 기대값을 Batching 기준으로 갱신 — [+3]은 렌더 1번 · 최종 +3, [추가]도 렌더 1번 [P2-15 · P2-22 · T-14 · §4.2 Batching 렌더 횟수 기록]
  - 의존: Dev-27, Dev-22
  - 만들 · 고칠 파일: `e2e/phase2-counter.spec.ts`(QA-3: 렌더 횟수 기대 3 → 1), `e2e/phase2-todo.spec.ts` · `e2e/phase2-log.spec.ts` · `e2e/phase2-attack.spec.ts`(렌더 · effect 횟수를 세는 단언만 — 최종 상태 · DOM 단언은 그대로), `qa_todo.md`(QA-21 갱신)
  - 테스트(먼저 실패 확인): 기대값만 먼저 고쳐 실패를 확인한 뒤(Dev-27 직후 e2e가 이미 통과하면 "기대 변경 전 실패"를 근거에 쓸 수 없으므로 어떤 단언이 어떻게 바뀌었는지 diff로 적는다), 전체 통과
  - 알고리즘: 결정 9 B
  - 완료 근거로 남길 것: 바뀐 단언 목록(전 → 후), 전체 playwright(phase1 96 + phase2) · vitest · tsc, 커밋 해시
  - **완료 근거 (Evidence)**:
