# dev_todo: patch-preview

- 명세: `../01_request_spec.md` (PP-01 ~ 10) · 브랜치: `feature/patch-preview` · 테스트 케이스: `../04_qa_evidence/qa_todo.md`
- 규칙: 항목 하나 = 커밋 하나. 체크할 때 완료 근거 필수 (근거 없는 체크는 무효). 커밋 메시지 `<type>(mini-figma): <요약> (Dev-N)`, push 안 함
- 범위: `fixtures/mini-figma/` · `e2e/mini-figma-*.spec.ts` · `e2e/mini-figma-helpers.ts`뿐. **`packages/`는 한 줄도 바꾸지 않는다.** `types.ts` 변경 없음. 완료 때 `git diff --stat main -- packages/`가 비어 있음을 근거에 붙인다
- 바깥 루프(ATDD): 인수 시나리오가 있는 Dev(4 ~ 7)는 `qa_todo.md`의 해당 QA를 **먼저 e2e로 써서 desktop에서 실패하는 것을 확인**한 뒤 구현한다. 안쪽 루프는 Vitest (`fixtures/mini-figma/__tests__/`)
- 순서: Dev-1 (순수: 정리) → Dev-2 (순수: 기록 위치) → Dev-3 (DOM 연결 모듈) → Dev-4 (화면 뼈대 · Hook · 배치) → Dev-5 (버튼 동작) → Dev-6 (깜빡임 · 디자인) → Dev-7 (공격 · 회귀)
- **커밋마다 vitest · tsc · 해당 e2e가 초록이어야 한다**

> **A 단계 정정 (작업자)**: 공통 주의 1의 `B2_PATH`는 `[0,2,2,1,1]`이 아니라 **`[0,2,2,1]`** 이 맞다 (전 `[0,2,1,1]` = `[div.app 0, 캔버스 2, 인스턴스 줄 1, b2 1]`에서 캔버스 안 인스턴스 줄이 제목 때문에 1 → 2로 밀림). 코드는 `[0,2,2,1]`로 고쳤고 patch 종류 · 개수 단언은 그대로 통과.

## 공통 주의 (코드로 확인한 것)

1. **경로 접두는 안 바뀐다.** `div.app` 자식 = 도구 막대 `[0,0]` · 레이어 `[0,1]` · 캔버스 `[0,2]` · 속성 `[0,3]` + **실제 영역 구역 `real-section` = 5번째 `[0,4]`**. 실제 영역은 DOM 순서 맨 끝에 두고 자리는 CSS로 정한다(desktop = grid 명시 배치로 가운데 열 아래, mobile = `order`로 속성 패널 앞). 그래서 task_005 patch 기대 표(P-1 ~ 28)의 접두 · 개수는 그대로다. 바뀌는 것은 **캔버스 안쪽 한 칸뿐**: 캔버스 첫 자식으로 제목 `<h2>「테스트 영역」`이 생겨 캔버스 안 경로가 +1 (`B2_PATH` `[0,2,1,1]` → `[0,2,2,1,1]`, 종류 · 개수는 그대로)
2. **실제 영역 patch 경로는 영역 상자(`real-area`) 안 자식부터**: 상자 안 = `[canvas-main, canvas-instances]` (제목 h2는 정리 때 뺌) → 메인 버튼 `[0,0]`, b1 `[1,0]`, b2 `[1,1]`, b3 `[1,2]`, 버튼 안 글자 span `…,0`(아이콘이 있으면 글자 span은 `…,1`)
3. **DOM에서 안 읽히는 것**: 이벤트 핸들러 · `key`. 그래서 ① 실제 영역 patch에는 `SET_EVENT`가 없다 ② 실제 영역 diff는 **key 없는 위치 비교**다 — 순서 바꾸기는 `MOVE`가 아니라 위치별 `SET_ATTR`(`data-id`) + `SET_TEXT`로 나온다 (엔진 정상 동작, 기대 표에 적음)
4. **style은 글 그대로 읽힌다** (엔진이 CSSOM을 안 씀): `SET_STYLE`의 `before` · `after`가 `#0052ff` · `#cf202f` 그대로 (jsdom · Chromium 모두)
5. **실제 영역 상자는 App이 자식 없는 빈 `<div>`로만 그린다** (`h('div', { class: 'real-area', 'data-testid': 'real-area', inert: true })`). 미니 React diff는 상자 안을 모르므로(이전 · 다음 VNode 모두 자식 0) App이 몇 번 다시 그려도 안의 노드를 안 건드린다 — Phase 2 기록판 「자식 없는 빈 칸에 effect가 직접 쓰기」와 같은 방식. 깜빡임 층 `real-overlay`도 빈 요소 (실제 영역 **밖** 형제)
6. **Hook은 `App`에만. 기존 5칸(useState 4 + useEffect 1)의 순서는 그대로 두고 뒤에 3칸만 덧붙인다** (`slot(0..3)` = doc · selectedId · history · nextId 유지, `instance.hooks` 5 → 8):
   - `[5] useMemo(() => ({ preview: null }), [])` — **보관함**. 한 번 만들어 계속 쓰는 같은 객체이고 setter가 없어 렌더를 일으키지 않는다. 엔진에 `useRef`가 없어서 이렇게 한다
   - `[6] useEffect(() => { … }, [])` — 마운트 patch 직후 한 번: `document.querySelector`로 테스트 영역(`[data-testid="canvas"]`) · `real-area` · `real-overlay`를 찾아 `보관함.preview = createPreview({ … })` (`createVDomRoot`는 여기서만 만든다 — 렌더 중에는 DOM이 아직 없다). cleanup = `보관함.preview = null`
   - `[7] useState(INITIAL_NAV)` — 뒤로 · 앞으로 가능 여부 (App state, PP-09). 렌더 중 `canBack(nav)` · `canForward(nav)`로 계산해 `PreviewPanel`에 내려 준다 (새 Hook 아님)
   - 핸들러 `onPreviewPatch` · `onPreviewBack` · `onPreviewForward`는 App 안에서 `보관함.preview`를 부르고, **기록이 실제로 움직였을 때만** 함수형 setter로 nav를 바꾼다 (`setNav(navPush)` 등). 같은 틱에 연타해도 낡은 `nav`를 안 읽게 함수형으로 쓴다. 효과가 안 돈 상태(`preview === null`)면 아무것도 안 함
7. `PreviewPanel`(신규 컴포넌트) · `Canvas`는 props만 받는 순수 함수. DOM 읽기 · `createVDomRoot` · `createOverlay` 호출은 `preview.ts`(Hook 없음)가 한다
8. **깜빡임 표시는 Phase 1 `createOverlay`를 그대로 가져다 쓴다** (`../phase1-vdom-playground/overlay`, `createOverlay(overlayLayer, realArea, () => true)`). 박스 CSS(`.viz-box`)만 mini-figma 디자인에 맞게 다시 쓴다: **그림자 없음**(`design.test.ts`가 `box-shadow`는 `none`만 허용), **주황 없음**, 파랑 · 파랑 버튼 위에서도 보이게 흰 테두리 + 파랑 바깥선
9. **`rootOnlyHooks.test.ts`는 파일을 만드는 같은 커밋에서 고친다**: 컴포넌트 7 → 8(`PreviewPanel.ts`), 순수 모듈 목록에 `previewVNode.ts` · `previewNav.ts` 추가(Hook · document · window · 엔진 import 없음), `preview.ts`는 Hook 없음(엔진 · DOM 사용은 허용)
10. 새 e2e는 실제 영역 요소를 `real-` testid로만 잡는다. 테스트 영역 testid(`figma-button` 등)가 실제 영역에 남으면 기존 `getByTestId` 단언이 두 배로 잡혀 깨지므로 **정리 함수가 testid 값 앞에 `real-`을 붙인다** (`figma-button` → `real-figma-button`)

## 폴더 구성 (바뀌는 곳만)

```
fixtures/mini-figma/
  previewVNode.ts           (신규, 순수) toRealVNodes — 읽은 VNode 정리 (Dev-1)
  previewNav.ts             (신규, 순수) 뒤로 · 앞으로 가능 여부 모델 — 엔진 History와 같은 규칙 (Dev-2)
  preview.ts                (신규, Hook 없음) createPreview — 읽기 → 정리 → 채우기 → createVDomRoot → patch · back · forward + 깜빡임 연결 (Dev-3)
  components/PreviewPanel.ts(신규, 순수) 실제 영역 구역: 머리글 + [Patch] [뒤로] [앞으로] + 빈 상자 · 빈 깜빡임 층 (Dev-4)
  components/Canvas.ts      첫 자식에 제목 h2 「테스트 영역」 (Dev-4)
  App.ts                    Hook 3칸 + 핸들러 3개 + PreviewPanel 5번째 자식 (Dev-4 · 5)
  index.html                배치 CSS (Dev-4), 디자인 · 깜빡임 CSS (Dev-6)
  __tests__/                previewVNode · previewNav · preview 신규, app · rootOnlyHooks · design 갱신
e2e/mini-figma-preview.spec.ts   (신규) QA-46 ~ 54, QA-A30 ~ A37 (공격은 Dev-7)
e2e/mini-figma-helpers.ts        실제 영역 도우미 추가 / 기존 render · design · attack 스펙 단언 몇 줄 갱신 (qa_todo 「바뀌는 기존 단언」)
```

## Dev 항목

- [x] **Dev-1** (`mini-figma`): 읽은 VNode를 실제 영역용으로 정리하는 순수 함수 [PP-05]
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/previewVNode.ts` 신규 `toRealVNodes()` (제목 `test-area-title` 최상위에서 빼기 · `selected` 토큰만 빼기 · `data-testid` 앞에 `real-`, 입력 불변). `rootOnlyHooks.test.ts` 순수 모듈 목록에 추가(통과). **새 기능 테스트(`previewVNode.test.ts`)는 B 단계에서** (사용자 결정으로 구현 먼저). 브라우저 확인: 실제 영역 버튼에 `real-figma-button` · `selected` 없음. 커밋 1ddba24
  - 의존: 없음 (새 파일만, 기존 동작 안 바뀜)
  - 대상 파일: `fixtures/mini-figma/previewVNode.ts` (신규) — `toRealVNodes(children: AreaChildren): AreaChildren`. DOM · Hook · 엔진 import 없음 (`@mini-react/shared` 타입만). 새 객체를 돌려주고 입력은 안 고친다
    - ① 최상위 자식 중 `data-testid="test-area-title"`인 노드(테스트 영역 제목)를 뺀다 ② 모든 요소의 `class`에서 `selected` 토큰만 뺀다(다른 토큰 순서 유지, 토큰이 하나도 안 남으면 `class` 속성 자체를 뺀다) ③ `data-testid` 값 앞에 `real-`을 붙인다 ④ 글자 · 주석 노드, 그 밖의 속성(`style` · `data-id` · `type`)은 그대로
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/previewVNode.test.ts`
    - `selected` 토큰 제거 표: `figma-button btn-M selected` → `figma-button btn-M`, `selected figma-button` → `figma-button`, `figma-button`(없음) → 같은 값, `selected`만 → `class` 키 없음, `unselected` · `not-selected` 같은 **비슷한 이름은 안 건드림**
    - testid 접두: 중첩 · 자식 모두 `real-…`, 접두 안 붙은 테스트 영역 testid 값이 하나도 안 남음, testid가 없는 요소는 그대로
    - 제목 노드 제거는 최상위에서만, 나머지 자식 순서 유지
    - 입력 불변(깊은 동결한 입력이 안 깨지고 결과는 다른 객체), 글자 · 주석 · `style` · `data-id` 보존
    - 실제 App을 그려 읽은 결과(`readAreaChildren`)를 넣으면 `selected` · 테스트 영역 testid가 0개
  - `rootOnlyHooks.test.ts`: `previewVNode.ts`를 순수 모듈 목록에 더함
  - 알고리즘: 명세 PP-05 · 「새 VNode 만들기」(DOM에서 읽고 정리)
  - 완료 근거로 남길 것: 테스트 파일 · 건수, `npx vitest run fixtures/mini-figma` 통과 수, `npx tsc --noEmit`, 커밋 해시

- [x] **Dev-2** (`mini-figma`): 뒤로 · 앞으로 가능 여부 모델 — 엔진 History와 같은 규칙 [PP-06]
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/previewNav.ts` 신규 (`INITIAL_NAV` · `navPush` · `navBack` · `navForward` · `canBack` · `canForward`, 경계는 같은 객체, 한도 `HISTORY_LIMIT` 50). `rootOnlyHooks.test.ts` 순수 모듈 목록에 추가(통과). **`previewNav.test.ts`(엔진 대조 포함)는 B 단계에서**. 커밋 ec76826
  - 의존: 없음 (새 파일만)
  - 대상 파일: `fixtures/mini-figma/previewNav.ts` (신규, 순수) — `PreviewNav = { index, size }`, `INITIAL_NAV = { index: 0, size: 1 }`, `navPush(n)`(앞쪽을 버리고 하나 붙임 → 한도 `HISTORY_LIMIT`(50, `@mini-react/shared`)을 넘으면 맨 앞을 뺌), `navBack(n)` · `navForward(n)`(경계에서는 **같은 객체**를 돌려줘 setter가 렌더를 안 일으키게), `canBack(n)` · `canForward(n)`. 엔진 `VDomRoot`에는 「뒤로 갈 수 있나」를 묻는 메서드가 없어서(엔진 수정 금지) 앱이 같은 규칙으로 따로 센다
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/previewNav.test.ts`
    - 처음 `canBack` · `canForward` 둘 다 거짓. push → `canBack` 참 · `canForward` 거짓. back → 처음이면 `canBack` 거짓 · `canForward` 참. forward → 끝이면 거짓. 경계에서 `navBack(INITIAL_NAV)` · `navForward(끝)` = 같은 객체
    - 뒤로 간 뒤 push → 앞쪽이 버려져 `canForward` 거짓 (`size = index + 2`)
    - 한도: push 60번 → `size` 50, `index` 49, back 49번이면 `canBack` 거짓
    - **엔진 대조**: 같은 연산 순서(push · back · forward · 뒤로 간 뒤 push · 한도 넘김)를 `@mini-react/react-dom`의 `History`(가짜 항목)와 `navPush` · `navBack` · `navForward`에 돌려 `size` · 위치(`current`가 head에서 몇 칸째)가 매 단계 같다
  - `rootOnlyHooks.test.ts`: `previewNav.ts`를 순수 모듈 목록에 더함
  - 알고리즘: 엔진 정책 「이력」(0번 · 앞쪽 끊음 · 경계 무시 · 한도 50) 그대로 — 새 결정 없음
  - 완료 근거로 남길 것: 테스트 건수(엔진 대조 포함), vitest · tsc 출력, 커밋 해시

- [x] **Dev-3** (`mini-figma`): 실제 영역 연결 모듈 — 읽기 → 정리 → `createVDomRoot` → patch · 뒤로 · 앞으로 + 깜빡임 [PP-03 · PP-04 · PP-05 · PP-06 · PP-08]
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/preview.ts` 신규 `createPreview({ testArea, realArea, overlayLayer, observe? })` → `{ patch, back, forward }` (읽기 → 정리 → `renderAreaChildren`로 0번 → `createVDomRoot` + Phase 1 `createOverlay(…, () => true)` 재사용). `rootOnlyHooks.test.ts`에 「preview.ts Hook 없음」 추가. **`preview.test.ts`(patch 기대 표 R-1 ~ R-13)는 B 단계에서**. 브라우저 확인: 라벨 변경 → Patch → 실제 영역 반영, 깜빡임 박스 2개(`data-last-flash-count` 2). 커밋 737083c
  - 의존: Dev-1
  - 대상 파일: `fixtures/mini-figma/preview.ts` (신규, Hook 없음) — `createPreview({ testArea, realArea, overlayLayer, observe? })` → `{ patch(): boolean, back(): boolean, forward(): boolean }`
    - 만들 때: `renderAreaChildren(realArea, toRealVNodes(readAreaChildren(testArea)))`로 처음 모습을 채운 뒤 `createVDomRoot(realArea, { onPatch })`(이때 채운 DOM을 읽어 **0번 기록**, PP-03). `onPatch` = Phase 1 `createOverlay`의 콜백 + 선택 인자 `observe`(테스트가 patch 종류를 세는 관찰 자리, 앱은 안 넘김)
    - `patch()`: `overlay.run(() => root.update(toRealVNodes(readAreaChildren(testArea))))` → 기록이 쌓이면 `true`(바뀐 게 없으면 `false`). `back()` · `forward()`: `overlay.run(() => root.back() / forward()) !== null`. 예외는 엔진이 실제 영역을 복구한 뒤 그대로 위로 던진다(앱에서 따로 안 잡음)
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/preview.test.ts` (jsdom — `render(App, root)`로 만든 테스트 영역 + 별도 `<div>` 실제 영역으로 `createPreview` 직접 호출)
    - 만들자마자 실제 영역 = 테스트 영역 복사본(버튼 4개, 글자 · class · style 같음, `selected` 0, testid 전부 `real-` 접두). 읽은 것은 테스트 영역을 안 고침
    - **patch 기대 표(실제 영역, qa_todo 참조)**를 `observe`로 센 값으로 단언: 편집 없음 → `false` · patch 0 / b2 고르기만 → `false` / 라벨 `버튼!` → `{ SET_TEXT: 2 }` / 크기 L → `{ SET_ATTR: 4 }` / 색 `#05b169` → `{ SET_STYLE: 6 }`, `#cf202f` → `{ SET_STYLE: 3 }`(한 줄 필드 `background-color` · `#0052ff` → `#cf202f`) / 아이콘 켜기 → `{ INSERT: 4 }`, 끄기 → `{ REMOVE: 4 }` / 인스턴스 추가 → `{ INSERT: 1 }`(경로 `[1,3]`) / b3 삭제 → `{ REMOVE: 1 }` / b1↔b2 순서 → 위치 비교 `{ SET_ATTR: 2, SET_TEXT: 2 }` (MOVE 없음)
    - **D-05 교체**: 테스트 영역 DOM을 직접 고쳐(`span.btn-label` → `em`) Patch → `{ REPLACE: 1 }` (캔버스 흐름에는 없는 장면이라 이 모듈 단위로만 확인)
    - 뒤로 · 앞으로: Patch 2번 → `back()` · `back()` · `forward()` · `forward()` 매 단계 실제 영역이 그 기록 모습, 처음에서 `back()` · 끝에서 `forward()` = `false`, 테스트 영역 DOM은 움직이는 동안 그대로(같은 노드 · 같은 글자). 뒤로 간 뒤 Patch → 앞쪽 기록 버림(`forward()` 거짓)
    - 깜빡임 연결: 색 바꾸고 Patch → 깜빡임 층 `data-last-patch-count` · `data-last-flash-count` = 3, 무변경 Patch는 지난 숫자 그대로
    - 한도: Patch 55번 → `back()` 정확히 49번 참 · 50번째 거짓
  - `rootOnlyHooks.test.ts`: `preview.ts`는 Hook 없음(엔진 · DOM 사용 허용) 확인 추가
  - 알고리즘: 명세 PP-04 · 「새 VNode 만들기」 · 「뒤로 · 앞으로 = 실제 영역 기록만」 · 「실시간 표시 = 덧칠 층(`onPatch`)」
  - 완료 근거로 남길 것: patch 기대 표 단언 건수, vitest · tsc 출력, 커밋 해시

- [x] **Dev-4** (`mini-figma`): 화면 뼈대 · Hook 연결 · 배치 — 두 영역이 보이고 처음엔 같은 모습 [PP-01 · PP-02 · PP-03 · PP-07 · PP-09 · PP-10]
  - **완료 근거 (Evidence)**: `components/PreviewPanel.ts` 신규(Hook 없음, 빈 `real-area`[inert] · `real-overlay`), `components/Canvas.ts` 첫 자식 제목 `test-area-title`, `App.ts` Hook 3칸(`[5]` useMemo 보관함 · `[6]` useEffect([]) createPreview · `[7]` useState(nav)) + PreviewPanel 5번째 자식, `index.html` 배치 CSS(desktop grid 명시 배치 · mobile `.property-panel { order: 1 }`). 기존 단언 갱신은 `test(…)` 커밋 한 개(92587e4). **이 커밋 시점에는 기존 단언 5건이 아직 옛 값이라 빨강이고 92587e4에서 초록** (사용자 지시: 기존 단언 수정은 test 커밋 하나). 커밋 3bad89d
  - 의존: Dev-3
  - 바깥 루프(먼저 실패): QA-46 · 47 · 54(보기 전용 부분) + 바뀌는 기존 단언(QA-1 최상위 5개, QA-43 · 44 높이, QA-2 · 42 mobile 순서 한 줄)을 `e2e/mini-figma-preview.spec.ts` 신규 + 기존 스펙에 먼저 쓰고 실패 확인
  - 대상 파일:
    - `components/PreviewPanel.ts` (신규, 순수) — props `{ canBack, canForward, onPatch, onBack, onForward }`. `section.real-section[data-testid=real-section]` > `header.real-header` > (`h2.panel-title[data-testid=real-title]` 「실제 영역」 + `div.real-actions` > `button.btn-primary[data-testid=patch-button]` 「Patch」 · `button.btn-secondary[data-testid=back-button][disabled=!canBack]` 「뒤로」 · `button.btn-secondary[data-testid=forward-button][disabled=!canForward]` 「앞으로」) + `div.real-frame` > (`div.real-area[data-testid=real-area][inert]` 빈 요소 + `div.real-overlay[data-testid=real-overlay]` 빈 요소)
    - `components/Canvas.ts` — 첫 자식에 `h2.area-title[data-testid=test-area-title]` 「테스트 영역」
    - `App.ts` — Hook 3칸(공통 주의 6) + `h(PreviewPanel, …)`를 `div.app`의 **5번째 자식**으로. 이 Dev에서는 `nav`를 `INITIAL_NAV`로 두고 핸들러는 빈 함수 자리(Dev-5에서 연결) — 처음 실제 영역 채우기(PP-03)까지만
    - `index.html` — 배치 CSS만: desktop(≥721px) `.app { grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr) }`, 레이어 · 속성 `grid-row: 2 / span 2`, 캔버스 `grid-column: 2; grid-row: 2`, `.real-section { grid-column: 2; grid-row: 3 }`, 세 영역 `overflow-y: auto`에 `.real-section` 추가. mobile(≤720px) `.property-panel { order: 1 }`(속성 패널만 뒤로 → 캔버스 다음에 실제 영역). 깜빡임 층 최소 규칙: `.real-frame { position: relative }` · `.real-overlay { position: absolute; inset: 0; pointer-events: none }` · `.viz-box { position: absolute }` (박스가 흐름에 끼어 레이아웃을 밀지 않게). 제목 h2 · 실제 영역 모양 다듬기는 Dev-6
  - 테스트(먼저 실패 확인):
    - `app.test.ts`: **바뀌는 기존 단언**(qa_todo 표) — 최상위 자식 5개 `['toolbar','layer-panel','canvas','property-panel','real-section']`, `instance.hooks` 길이 8 (slot 0 ~ 3 그대로), `B2_PATH` `[0,2,2,1,1]`, MF-05 글 단언에서 `patch-button` 글자 제외. 새 describe 「실제 영역」: 처음 `real-area` 안 버튼 4개 = 테스트 영역과 같은 글자 · 크기 · 색, `real-figma-button` 4개 · 테스트 영역 testid `figma-button` 수는 4 그대로(두 배 아님) · `selected` 0, 레이어 · 속성 · 도구 막대 요소 없음, [뒤로] · [앞으로] `disabled` · [Patch] 켜짐, `real-area`에 `inert` 속성, 고르기 · 편집 · 추가를 몇 번 해도 `real-area` 노드와 그 자식 노드가 **같은 참조**이고 변경 0 (MutationObserver) — 미니 React diff가 상자 안을 안 건드림. `PreviewPanel`은 Hook 없음
    - `rootOnlyHooks.test.ts`: 컴포넌트 8개(`PreviewPanel.ts` 추가), `App.ts`가 `useMemo`도 부른다 확인
  - 알고리즘: 명세 PP-09 · 「실제 영역 자리」
  - 완료 근거로 남길 것: QA-46 · 47 · 54 desktop 먼저 실패 → 통과 출력, 기존 mini-figma e2e 전체 회귀 통과 수(QA-43 · 44 갱신 포함), 커밋 해시

- [x] **Dev-5** (`mini-figma`): [Patch] · [뒤로] · [앞으로] 동작 + 꺼짐 상태 [PP-04 · PP-06 · PP-10]
  - **완료 근거 (Evidence)**: `App.ts` `onPreviewPatch` · `onPreviewBack` · `onPreviewForward` — 보관함의 `preview`를 부르고 true일 때만 함수형 setter(`setNav(navPush)` 등), `doc` · `selectedId` · `history`는 안 건드림. 브라우저 확인(desktop · mobile): 라벨 `바뀐 라벨` 입력 → Patch 전 실제 영역 `버튼 버튼 취소 삭제` 그대로 → [Patch] → `바뀐 라벨 바뀐 라벨 취소 삭제`, 뒤로 켜짐 · 앞으로 꺼짐 → [뒤로] → 옛 글자, 테스트 영역은 그대로, 앞으로 켜짐 → [앞으로] → 반영 · 콘솔 오류 0. **QA-48 ~ 54 e2e와 `app.test.ts` 「실제 영역」 describe는 B 단계에서**. 커밋 abcdeff
  - 의존: Dev-4
  - 바깥 루프(먼저 실패): QA-48 · 49 · 50 · 51 · 52 · 53 · 54(Undo 독립 부분)
  - 대상 파일: `App.ts` — `onPreviewPatch = () => { if (preview.patch()) setNav(navPush) }`, `onPreviewBack` · `onPreviewForward` 같은 모양(`back()` · `forward()`가 `true`일 때만 `navBack` · `navForward`), 보관함이 비었으면 무시. `nav` 칸을 실제로 쓰고 `canBack(nav)` · `canForward(nav)`를 `PreviewPanel`에 내려 준다. `doc` · `selectedId` · `history`(앱 Undo)는 건드리지 않는다
  - 테스트(먼저 실패 확인): `app.test.ts` 「실제 영역」 describe에 추가 —
    - 편집(라벨 · 색)만으로는 실제 영역이 안 바뀜 → [Patch] 클릭 뒤 실제 영역 = 테스트 영역 모습, 테스트 영역 DOM · `doc` · `history` · `selectedId`(slot 0 · 1 · 2)는 **같은 객체**로 그대로, 렌더 1번(버튼 `disabled`만 바뀜)
    - [Patch] 뒤 [뒤로] 켜짐 · [앞으로] 꺼짐 / [뒤로] 뒤 반대 / 처음 · 끝에서 `disabled` 속성. 꺼진 버튼 클릭 = 이벤트 없음 · 렌더 0
    - 고르기만 하고 [Patch] → `slot(7)` nav 그대로(기록 안 쌓임), [뒤로] 꺼진 채. 같은 틱에 [Patch] 두 번 → nav `{ index: 1, size: 2 }` (두 번째는 무변경)
    - **연타 정확성(함수형 setter)**: Patch 2번(각각 `await`) 뒤 [뒤로]를 같은 틱에 두 번 → 실제 영역은 처음 모습, nav `{ index: 0, size: 3 }`, 렌더 뒤 [뒤로] 꺼짐
    - 뒤로 간 뒤 [Patch] → 앞쪽 기록 버림(nav `size = index + 2`), [앞으로] 꺼짐. 앱 Undo(Ctrl+Z · [↶])는 실제 영역 기록을 안 건드리고, [Patch]도 앱 Undo 기록을 안 건드림
  - 알고리즘: 명세 PP-04 · PP-06 · 「뒤로 · 앞으로 = 실제 영역 기록만」
  - 완료 근거로 남길 것: QA-48 ~ 54 desktop 먼저 실패 → desktop · mobile 통과 출력, 단위 건수, 커밋 해시

- [x] **Dev-6** (`mini-figma`): 깜빡임 · 디자인 마감 CSS [PP-07 · PP-08 · PP-01]
  - **완료 근거 (Evidence)**: `index.html` `<style>`: 실제 영역 카드 · 머리글(좁으면 줄바꿈) · 상자(캔버스와 같은 점무늬 · 1px 테두리 · 24px 여백) · `.viz-box`(흰 2px 테두리 + 파랑 바깥선 + 연한 흰 바탕, `viz-flash` 옅어짐, **그림자 · 주황 없음**) · 실제 영역 버튼 `cursor: default`. `design.test.ts` 12건 통과(기존 `box-shadow: none`만 허용 단언이 그대로 지킴). 육안 확인(desktop · mobile, 캡처는 scratchpad)에서 박스가 파랑 버튼 위에서 보임. **주황 없음 · `.viz-box` 전용 단언 · QA 깜빡임 단언은 B 단계에서**. 커밋 66c872a
  - 의존: Dev-5
  - 바깥 루프(먼저 실패): QA-47 중 버튼 모양 단언 · QA-48 · 49 · 52의 깜빡임 단언(`watchFlash` 도우미) · QA-46 머리글 모양
  - 대상 파일: `index.html` `<style>`만 (TS는 새 클래스 이름이 필요할 때만 최소로 고치고 Dev에 기록) — 실제 영역 구역 카드(24px · 기존 `.app > *` 규칙 재사용), `.real-header`(제목 + 버튼 줄, 좁으면 줄바꿈), 상자 모양은 캔버스와 같게(점무늬 · 1px 테두리 · 24px 안쪽 여백), `.area-title`(제목 · 위 간격), [Patch] = 기존 `.btn-primary`(파랑 알약 — 화면의 파랑은 [+ 인스턴스] · [Patch] 두 곳), [뒤로] · [앞으로] = 기존 `.btn-secondary`, 깜빡임 `.viz-box`(흰 테두리 2px + 파랑 바깥선 + 연한 흰 바탕, 짧은 `@keyframes`로 옅어져 사라짐, **그림자 · 주황 없음**), 실제 영역 버튼은 눌러지지 않게 `cursor: default`
  - 테스트(먼저 실패 확인): `design.test.ts` — `.viz-box` 규칙에 `box-shadow`가 없다(또는 `none`), 주황 색(`#e8590c` · `rgba(255, 146, 43`) 없음, 외부 요청 글자 없음 유지. e2e는 위 QA
  - 알고리즘: 해당 없음 (CSS만)
  - 완료 근거로 남길 것: QA 먼저 실패 → 통과, `design.test.ts` 건수, desktop · mobile 육안 확인(정식 캡처는 QA 단계), 커밋 해시

- [ ] **Dev-7** (`mini-figma`): 공격 · 경계 마무리 + 회귀 [PP 전체 · QA-A30 ~ A37]
  - **A 단계 진행 (체크 안 함 — QA-A30 ~ A32와 새 e2e는 B 단계)**: 회귀 명령만 실행 — `npx vitest run` 43 files · 1163 passed, `npx tsc --noEmit` 오류 0, `npx playwright test` 324 passed(desktop · mobile 전체, Phase 1 · 2 · mini-figma 포함), `git diff --stat main -- packages/` 출력 없음(0줄). 기존 단언 갱신 커밋 92587e4
  - 의존: Dev-6
  - 바깥 루프: QA-A30 ~ A37을 쓰고 desktop · mobile 모두에서 도는지 확인. 필요한 도우미만 `mini-figma-helpers.ts`에 더한다. 앱 코드는 시나리오가 버그를 찾을 때만 고치고 Dev에 기록
  - 회귀 · 환경: `npx vitest run` 전체 · `npx tsc --noEmit` · `npx playwright test` 전체(Phase 1 · 2 · mini-figma 포함) · `git diff --stat main -- packages/` 비어 있음
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: 위 네 명령의 출력(통과 수), 커밋 해시

<!-- 완료 예시
- [x] **Dev-3** (`mini-figma`): 실제 영역 연결 모듈
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/preview.ts` 신규(`createPreview`), `fixtures/mini-figma/__tests__/preview.test.ts` 18건 통과
    (`npx vitest run fixtures/mini-figma` 412 passed), `npx tsc --noEmit` 오류 0, 커밋 a1b2c3d
-->
