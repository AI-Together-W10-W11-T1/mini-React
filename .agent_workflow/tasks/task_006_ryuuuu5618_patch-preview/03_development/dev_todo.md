# dev_todo: patch-preview

- 명세: `../01_request_spec.md` (PP-01 ~ 12) · 브랜치: `feature/patch-preview` · 테스트 케이스: `../04_qa_evidence/qa_todo.md`
- 규칙: 항목 하나 = 커밋 하나. 체크할 때 완료 근거 필수 (근거 없는 체크는 무효). 커밋 메시지 `<type>(mini-figma): <요약> (Dev-N)`, push 안 함
- 범위: `fixtures/mini-figma/` · `e2e/mini-figma-*.spec.ts` · `e2e/mini-figma-helpers.ts`뿐. **`packages/`는 한 줄도 바꾸지 않는다.** `types.ts` 변경 없음. 완료 때 `git diff --stat main -- packages/`가 비어 있음을 근거에 붙인다
- 바깥 루프(ATDD): 인수 시나리오가 있는 Dev(4 ~ 7)는 `qa_todo.md`의 해당 QA를 **먼저 e2e로 써서 desktop에서 실패하는 것을 확인**한 뒤 구현한다. 안쪽 루프는 Vitest (`fixtures/mini-figma/__tests__/`)
- 순서: Dev-1 (순수: 정리) → Dev-2 (순수: 기록 위치) → Dev-3 (DOM 연결 모듈) → Dev-4 (화면 뼈대 · Hook · 배치) → Dev-5 (버튼 동작) → Dev-6 (깜빡임 · 디자인) → Dev-7 (공격 · 회귀) → **Dev-8 (PP-06 변경: [실행 취소] · [다시 실행]이 테스트 영역 `doc`도 되돌림, 2026-11-12)**
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
  components/PreviewPanel.ts(신규, 순수) 실제 영역 구역: 머리글 + [Patch] [실행 취소] [다시 실행] + 빈 상자 · 빈 깜빡임 층 (Dev-4)
  components/Canvas.ts      첫 자식에 제목 h2 「테스트 영역」 (Dev-4)
  App.ts                    Hook 3칸 + 핸들러 3개 + PreviewPanel 5번째 자식 (Dev-4 · 5)
  index.html                배치 CSS (Dev-4), 디자인 · 깜빡임 CSS (Dev-6)
  __tests__/                previewVNode · previewNav · preview 신규, app · rootOnlyHooks · design 갱신
e2e/mini-figma-preview.spec.ts   (신규) QA-46 ~ 54, QA-A30 ~ A35 · A37 (공격은 Dev-7, A36은 단위)
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
    - `app.test.ts`: **바뀌는 기존 단언**(qa_todo 표) — 최상위 자식 5개 `['toolbar','layer-panel','canvas','property-panel','real-section']`, `instance.hooks` 길이 8 (slot 0 ~ 3 그대로), `B2_PATH` `[0,2,2,1,1]`, MF-05 글 단언에서 `patch-button` 글자 제외. 새 describe 「실제 영역」: 처음 `real-area` 안 버튼 4개 = 테스트 영역과 같은 글자 · 크기 · 색, `real-figma-button` 4개 · 테스트 영역 testid `figma-button` 수는 4 그대로(두 배 아님) · `selected` 0, 레이어 · 속성 · 도구 막대 요소 없음, [실행 취소] · [다시 실행] `disabled` · [Patch] 켜짐, `real-area`에 `inert` 속성, 고르기 · 편집 · 추가를 몇 번 해도 `real-area` 노드와 그 자식 노드가 **같은 참조**이고 변경 0 (MutationObserver) — 미니 React diff가 상자 안을 안 건드림. `PreviewPanel`은 Hook 없음
    - `rootOnlyHooks.test.ts`: 컴포넌트 8개(`PreviewPanel.ts` 추가), `App.ts`가 `useMemo`도 부른다 확인
  - 알고리즘: 명세 PP-09 · 「실제 영역 자리」
  - 완료 근거로 남길 것: QA-46 · 47 · 54 desktop 먼저 실패 → 통과 출력, 기존 mini-figma e2e 전체 회귀 통과 수(QA-43 · 44 갱신 포함), 커밋 해시

- [x] **Dev-5** (`mini-figma`): [Patch] · [실행 취소] · [다시 실행] 동작 + 꺼짐 상태 [PP-04 · PP-06 · PP-10]
  - **완료 근거 (Evidence)**: `App.ts` `onPreviewPatch` · `onPreviewBack` · `onPreviewForward` — 보관함의 `preview`를 부르고 true일 때만 함수형 setter(`setNav(navPush)` 등), `doc` · `selectedId` · `history`는 안 건드림. 브라우저 확인(desktop · mobile): 라벨 `바뀐 라벨` 입력 → Patch 전 실제 영역 `버튼 버튼 취소 삭제` 그대로 → [Patch] → `바뀐 라벨 바뀐 라벨 취소 삭제`, 뒤로 켜짐 · 앞으로 꺼짐 → [실행 취소] → 옛 글자, 테스트 영역은 그대로, 앞으로 켜짐 → [다시 실행] → 반영 · 콘솔 오류 0. **QA-48 ~ 54 e2e와 `app.test.ts` 「실제 영역」 describe는 B 단계에서**. 커밋 abcdeff
  - 의존: Dev-4
  - 바깥 루프(먼저 실패): QA-48 · 49 · 50 · 51 · 52 · 53 · 54(Undo 독립 부분)
  - 대상 파일: `App.ts` — `onPreviewPatch = () => { if (preview.patch()) setNav(navPush) }`, `onPreviewBack` · `onPreviewForward` 같은 모양(`back()` · `forward()`가 `true`일 때만 `navBack` · `navForward`), 보관함이 비었으면 무시. `nav` 칸을 실제로 쓰고 `canBack(nav)` · `canForward(nav)`를 `PreviewPanel`에 내려 준다. `doc` · `selectedId` · `history`(앱 Undo)는 건드리지 않는다
  - 테스트(먼저 실패 확인): `app.test.ts` 「실제 영역」 describe에 추가 —
    - 편집(라벨 · 색)만으로는 실제 영역이 안 바뀜 → [Patch] 클릭 뒤 실제 영역 = 테스트 영역 모습, 테스트 영역 DOM · `doc` · `history` · `selectedId`(slot 0 · 1 · 2)는 **같은 객체**로 그대로, 렌더 1번(버튼 `disabled`만 바뀜)
    - [Patch] 뒤 [실행 취소] 켜짐 · [다시 실행] 꺼짐 / [실행 취소] 뒤 반대 / 처음 · 끝에서 `disabled` 속성. 꺼진 버튼 클릭 = 이벤트 없음 · 렌더 0
    - 고르기만 하고 [Patch] → `slot(7)` nav 그대로(기록 안 쌓임), [실행 취소] 꺼진 채. 같은 틱에 [Patch] 두 번 → nav `{ index: 1, size: 2 }` (두 번째는 무변경)
    - **연타 정확성(함수형 setter)**: Patch 2번(각각 `await`) 뒤 [실행 취소]를 같은 틱에 두 번 → 실제 영역은 처음 모습, nav `{ index: 0, size: 3 }`, 렌더 뒤 [실행 취소] 꺼짐
    - 뒤로 간 뒤 [Patch] → 앞쪽 기록 버림(nav `size = index + 2`), [다시 실행] 꺼짐. 앱 Undo(Ctrl+Z · [↶])는 실제 영역 기록을 안 건드리고, [Patch]도 앱 Undo 기록을 안 건드림
  - 알고리즘: 명세 PP-04 · PP-06 · 「뒤로 · 앞으로 = 실제 영역 기록만」
  - 완료 근거로 남길 것: QA-48 ~ 54 desktop 먼저 실패 → desktop · mobile 통과 출력, 단위 건수, 커밋 해시

- [x] **Dev-6** (`mini-figma`): 깜빡임 · 디자인 마감 CSS [PP-07 · PP-08 · PP-01]
  - **완료 근거 (Evidence)**: `index.html` `<style>`: 실제 영역 카드 · 머리글(좁으면 줄바꿈) · 상자(캔버스와 같은 점무늬 · 1px 테두리 · 24px 여백) · `.viz-box`(흰 2px 테두리 + 파랑 바깥선 + 연한 흰 바탕, `viz-flash` 옅어짐, **그림자 · 주황 없음**) · 실제 영역 버튼 `cursor: default`. `design.test.ts` 12건 통과(기존 `box-shadow: none`만 허용 단언이 그대로 지킴). 육안 확인(desktop · mobile, 캡처는 scratchpad)에서 박스가 파랑 버튼 위에서 보임. **주황 없음 · `.viz-box` 전용 단언 · QA 깜빡임 단언은 B 단계에서**. 커밋 66c872a
  - 의존: Dev-5
  - 바깥 루프(먼저 실패): QA-47 중 버튼 모양 단언 · QA-48 · 49 · 52의 깜빡임 단언(`watchFlash` 도우미) · QA-46 머리글 모양
  - 대상 파일: `index.html` `<style>`만 (TS는 새 클래스 이름이 필요할 때만 최소로 고치고 Dev에 기록) — 실제 영역 구역 카드(24px · 기존 `.app > *` 규칙 재사용), `.real-header`(제목 + 버튼 줄, 좁으면 줄바꿈), 상자 모양은 캔버스와 같게(점무늬 · 1px 테두리 · 24px 안쪽 여백), `.area-title`(제목 · 위 간격), [Patch] = 기존 `.btn-primary`(파랑 알약 — 화면의 파랑은 [+ 인스턴스] · [Patch] 두 곳), [실행 취소] · [다시 실행] = 기존 `.btn-secondary`, 깜빡임 `.viz-box`(흰 테두리 2px + 파랑 바깥선 + 연한 흰 바탕, 짧은 `@keyframes`로 옅어져 사라짐, **그림자 · 주황 없음**), 실제 영역 버튼은 눌러지지 않게 `cursor: default`
  - 테스트(먼저 실패 확인): `design.test.ts` — `.viz-box` 규칙에 `box-shadow`가 없다(또는 `none`), 주황 색(`#e8590c` · `rgba(255, 146, 43`) 없음, 외부 요청 글자 없음 유지. e2e는 위 QA
  - 알고리즘: 해당 없음 (CSS만)
  - 완료 근거로 남길 것: QA 먼저 실패 → 통과, `design.test.ts` 건수, desktop · mobile 육안 확인(정식 캡처는 QA 단계), 커밋 해시

- [x] **Dev-7** (`mini-figma`): 공격 · 경계 마무리 + 회귀 + 사용자 변경(도구 막대 · 앱 Undo 제거) [PP 전체 · QA-46 ~ 54 · QA-A30 ~ A35 · A37]
  - **완료 근거 (Evidence)**:
    - **새 단위 테스트**: `previewVNode.test.ts` 16건 · `previewNav.test.ts` 11건(엔진 `History`와 같은 연산 대조 + 무작위 2000번 + 한도 50) · `preview.test.ts` 25건(patch 기대 표 R-1 ~ 13 · 뒤로 · 앞으로 · 한도 50(55번 Patch → back 정확히 49번) · 깜빡임 연결 · 테스트 영역 불변) · `app.test.ts` 「실제 영역」 describe 12건(상자 노드 같은 참조 + 변경 0 · Hook 7칸 · [Patch] 뒤 doc · selectedId 같은 객체 · 같은 틱 연타 · 단축키와 버튼이 같은 기록) · `design.test.ts` `.viz-box` 4건(주황 없음 · 그림자 없음)
    - **새 e2e** `e2e/mini-figma-preview.spec.ts` 16건 × desktop · mobile = 32건: QA-46 ~ 54 + A30 ~ A35 · A37 (A36 한도 50만 단위 테스트가 맡음; A33 · A34 · A35 · A37은 사용자 결정으로 나중에 추가). QA-52 · 54 · A31에는 단축키 경로(Ctrl+Z = [실행 취소])도 포함. 도우미 `areaSnapshot` · `watchFlash` · `navState` · `realBgOf` 등 (`mini-figma-helpers.ts`)
    - **범위 확대 추가 (사용자 결정, `01_request_spec.md` §6)**: QA-A33 · A34 · A35 · A37 e2e 4건 × 2 프로젝트 = 8건 추가 (`e2e/mini-figma-preview.spec.ts`). 시나리오 문장이 앱 동작과 달라 고친 곳 없음(앱은 명세 PP-01 ~ 12대로 동작). 깨짐 확인(앱 코드를 잠깐 깨고 되돌림, 되돌린 뒤 앱 파일 변경 없음 확인): A33 → `previewVNode.ts`에서 빈 글자 span 제거 시 desktop · mobile 실패(`real-btn-label` 4 기대 · 2개 받음) / A34 → `preview.ts` 처음 모습 채우기 끔 시 실패 / A35 → `preview.ts` `back`을 두 칸씩 가게 하면 실패(「[실행 취소] 뒤 실제 영역 = 기록 3」) / A37 → `index.html`에서 `.real-section`의 `overflow-y: auto` 제거 시 desktop 실패(페이지 높이 14240 > 800), `.btn-label`의 `overflow-wrap: anywhere` 제거 시 mobile 실패(가로 스크롤). 최종 회귀: `npx playwright test e2e/mini-figma-preview.spec.ts` 32 passed, `npx playwright test` **316 passed**(308 + 8), `npx vitest run` 1178 passed, `npx tsc --noEmit` 오류 0. 5199 LISTEN 없음.
    - **구현을 일부러 깨서 테스트가 실패하는지 확인한 뒤 되돌림** (되돌린 뒤 `git diff`로 앱 파일 변경 0 확인): ① `previewVNode.ts`에서 `selected` 빼기 끔 → `previewVNode.test.ts` + `preview.test.ts` 15건 실패, e2e QA-48 · 49 · 51 실패 ② `App.ts`에서 `setNav(...)` 호출 제거(nav 갱신 끔) → `app.test.ts` 6건 실패, e2e QA-50 · 52 · 53 · 54 · A30 · A31 · A32 실패 ③ `setNav(navBack(nav))`(낡은 nav 읽기, 함수형 setter 아님) → `app.test.ts` 「연타 정확성」 1건 실패 ④ `createOverlay(…, () => false)`(깜빡임 끔) → `preview.test.ts` 깜빡임 2건 + e2e QA-48 · 49 실패 ⑤ 키 핸들러에서 `preventDefault` 제거 → `app.test.ts` 키 5건 실패
    - **테스트가 찾은 계획 오류 (앱 버그 아님)**: 실제 영역은 DOM에서 읽어 key가 없어 **위치 비교**라서 아이콘 켜기 · 끄기는 `{ INSERT: 4 }` · `{ REMOVE: 4 }`가 아니라 `{ SET_ATTR: 12, SET_TEXT: 4, INSERT: 4 }` · `{ SET_ATTR: 12, SET_TEXT: 4, REMOVE: 4 }`이고(0번 글자 span이 아이콘으로 바뀌고 글자 span은 1번에 새로 생김, 화면 결과는 테스트 영역과 같음), QA-50의 「글자 span 노드 같은 참조」 단언은 성립하지 않아 모습 비교로 바꿨다. `qa_todo.md` R-6 · R-7 표와 `B2_PATH` `[0,2,2,1,1]` 오기(정답 `[0,2,2,1]`)를 고침. 앱 코드 버그는 발견 못 함
    - **jsdom 한계**: `Range.getBoundingClientRect`가 없어 깜빡임 위치 재기가 불리면 예외 → 테스트 파일(`preview.test.ts` · `app.test.ts`)에서만 0 크기 대역을 둠. 위치 · 크기 단언은 e2e(`watchFlash`)가 맡음
    - **사용자 변경 반영 (앱 코드, 커밋 3개)**: 60f0fb3 [Patch] 도구 막대로(중간 상태) → 8110e51 도구 막대 = 앱 이름 · [+ 인스턴스] · [실행 취소] · [다시 실행] · [Patch], [↶] [↷] 제거, 실제 영역 머리글은 제목만 (`Toolbar.ts` · `PreviewPanel.ts` · `App.ts`) → 6d44b13 앱 Undo 제거(`history` 칸 · `undo.ts` · `undo.test.ts` 삭제), Hook 8칸 → **7칸**(doc · selectedId · nextId · useMemo 보관함 · useEffect 초기화 · useState nav · useEffect keydown), `keys.ts` 동작 `undo/redo` → `back/forward`, Ctrl/Cmd+Z = [실행 취소] · +Shift = [다시 실행] (Q18 규칙 그대로: 라벨 글자 칸 안 무시 · 막지 않음, 그 밖 `preventDefault`(처음 · 끝이어도), Alt 무시)
    - **지우거나 바꾼 기존 테스트 (전 → 후 · 이유)** — 앱 편집 Undo가 없어졌으므로 Undo 자체를 시험하던 것은 삭제, 뜻이 남는 것은 State History로 전환:
      - 단위 `app.test.ts`: 「Undo/Redo 버튼 (Dev-6)」 describe 11건 통째 삭제(P-23 · 24 · 28 · 한도 · 버튼 켜짐 · 키와 같은 함수 등 모두 Undo 버튼 전용) / P-18 · P-19 · 「한 키 입력 = 한 단계」 · QA-29 단위판 · 「Undo로 고른 것이 사라지면」 · 「다른 것이 끼어들거나…」 · 「Undo 한도」 삭제 / 「메인 편집은 applyEdit…history」 · 「인스턴스 편집 · ↻ 묶음」 · 「칩 연달아 묶음」 삭제(history 묶음 전용) / **전환**: Ctrl+Z · Meta+Z → 실제 영역 [실행 취소] · +Shift [다시 실행], 라벨 글자 칸 안 키 무시(nav · 실제 영역 그대로), 선택 상자 · 체크박스 · 색 입력칸 Ctrl+Z → [실행 취소] + `preventDefault`, 입력칸 밖 `defaultPrevented`(처음 · 끝에서도 true), Q17-3 「추가 → Undo → 추가 = b5」 → 「추가 → 삭제 → 추가 = b5 · b6」, P-20 「없으면 렌더 0」 → 「처음에서 Ctrl+Z · Ctrl+Shift+Z는 렌더 0 · nav 같은 객체 · 막기는 함」 / `slot(n)` 번호 이동(history 칸 빠짐: nextId `slot(3)` → `slot(2)`), `toolbarCounts` 도구 막대 열 기대값 `{ SET_ATTR: 1 }` · `{ SET_ATTR: 2 }`(첫 수정 · Undo로 [↶] 켜짐) **전부 `{}`**(편집은 도구 막대를 안 바꿈. [Patch]로 기록이 처음 쌓일 때만 [실행 취소] 켜짐 SET_ATTR 1줄), 「편집은 doc · history를 같이」류의 `past` 단언 삭제
      - 단위 `keys.test.ts`: `'undo'` → `'back'`, `'redo'` → `'forward'` (규칙 표 100건 그대로 통과) / `rootOnlyHooks.test.ts`: 순수 모듈 목록에서 `undo.ts` 제거 / `undo.test.ts` 파일 삭제(Undo 모델 자체가 사라짐)
      - e2e: `mini-figma-undo.spec.ts` 통째 삭제(QA-19 ~ 25 · 29 · 30) / `mini-figma-toolbar.spec.ts`: QA-32 · 33 · A20(2건) · A21 삭제(Undo 버튼 전용), QA-31 → 도구 막대 순서 · [실행 취소] [다시 실행] 꺼짐 · [Patch] 켜짐 · [↶] [↷] 없음, QA-34 끝의 `[↶] 켜짐` 단언 제거 / `mini-figma-attack.spec.ts`: A9 · A19 · A15 · A17 · A27 삭제(Undo 한도 · 묶음 · 선택 · 새로고침 Undo), A6 → Delete로 선택이 풀림만, A8 → 선택 상자 · 체크박스 Ctrl+Z가 실제 영역 [실행 취소](+ 라벨 칸 안은 안 움직임), A10 → 키 핸들러가 옛 state를 안 읽음 · 리스너 1개(Ctrl+Z가 실제 영역 가장 최근 [Patch] 단계), A18 → 「삭제 후 추가 = b5 · b6」, A13 · A14 → Undo 단언만 제거 / `mini-figma-palette.spec.ts`: QA-37 · A22 · A24의 Undo 단언 제거, A25 삭제, A28 → 색 입력칸에서 Ctrl+Z · Shift+Z = 실제 영역 [실행 취소] · [다시 실행] / `mini-figma-render.spec.ts`(QA-1) · `mini-figma-design.spec.ts`(QA-40 · A26): [↶] [↷] → [실행 취소] [다시 실행] · [Patch] 기준
    - **회귀 명령 (최종)**: `npx vitest run` 45 files · **1178 passed** (이 전 1231 − 삭제 Undo 테스트 + 새 테스트), `npx tsc --noEmit` 오류 0, `npx playwright test` **308 passed** (desktop · mobile, Phase 1 · 2 · mini-figma 전체 포함), `git diff --stat main -- packages/` 출력 없음(0줄)
    - **검수 1회차 반영 (REJECT → 수정)**: `04_qa_evidence/qa_todo.md`를 PP-07 · 11 · 12 최신본과 실제 e2e에 맞춤(QA-52 · 54 · 화면 약속 표 · 바뀌는 기존 단언 표(Hook 7칸 · `slot(5)` · `undo` 모듈 삭제 · 삭제 · 변경 QA/A 번호를 e2e `git diff 969edc4..HEAD`의 test 이름과 대조) · PP → QA 연결). `rootOnlyHooks.test.ts:101` 정규식 템플릿 안 `\b`(백스페이스) → `\\b`(고친 뒤 통과, preview.ts에 `useState` · `useEffect`를 일부러 넣으면 3건 실패 확인 후 되돌림). 옛 앱 Undo 설명 주석만 정리(`Toolbar.ts` · `App.ts` · `model.ts` · `ColorPalette.ts` · `PropertyPanel.ts`, 동작 변경 없음). 확인: `npx vitest run` 45 files · 1178 passed, `npx tsc --noEmit` 오류 0, `git diff --stat main -- packages/` 출력 없음
    - **mobile 375px 도구 막대**: QA-47 · QA-A26 이 mobile에서 통과 — 도구 막대 버튼 5개가 화면 밖으로 안 나가고(줄바꿈) 가로 스크롤 없음
    - 포트 5199: Playwright가 `reuseExistingServer: false`로 띄우고 끝에 내리므로 남은 LISTEN 서버 없음 (확인: `netstat`에 LISTEN 행 없음)
    - 커밋: 60f0fb3 · 8110e51 · 6d44b13 (feat) · c369905 (test 단위) · 0a6bd0e (test e2e)
  - 의존: Dev-6
  - 알고리즘: 해당 없음

- [x] **Dev-8** (`mini-figma`): [실행 취소] · [다시 실행]이 실제 영역과 함께 테스트 영역(`doc`)도 그 칸 상태로 되돌린다 [PP-06 변경 · PRD T-08]
  - **완료 근거 (Evidence)**: 2026-11-12, 커밋 = 이 문서가 들어 있는 커밋 (`git log --grep "PP-06 · T-08"`)
    - **신규 모듈** `fixtures/mini-figma/previewDocs.ts` (`DocTrack` · `initialTrack` · `trackPush` · `trackBack` · `trackForward` · `trackDoc`, 칸 수 · 잘림은 `previewNav`의 `navPush`/`navBack`/`navForward`를 그대로 호출). `App.ts`: 보관함 `{ preview, track }`(새 Hook 칸 없음, `instance.hooks` 7칸 · `slot(0~6)` 번호 · `slot(5)` 모양 그대로), `onPreviewPatch`는 기록이 쌓였을 때만 `trackPush(vault.track, doc)`, `onPreviewBack`/`onPreviewForward`는 `moveTo`(`setDoc(target)` + `setSelectedId(prev => reconcileSelection(prev, target))` + `setNav`, `setNextId` 호출 없음). `packages/` · `types.ts` · `preview.ts` · `previewNav.ts` · `keys.ts` 수정 없음 (`git diff --stat main -- packages/` 빈 출력)
    - **단위 (Vitest)**: `previewDocs.test.ts` 신규 7건 통과 (PD-1 2 · PD-2 1 · PD-3 1 · PD-4 2(한도 50 · 엔진 `History` 대조) · PD-5 1(무작위 2000번)). `app.test.ts` 신규 9건(U-1 ~ U-7 · A41 · A42) + 고친 기존 9건(Ctrl+Z · Meta+Z / 선택 상자 / 색 입력칸 / 체크박스 / [Patch] 뒤 켜짐 상태 / 연타 정확성 / 실행 취소한 뒤 [Patch](편집을 끼워 고침) / 버튼 · 단축키 같은 기록 / Hook 7칸 `track`), `rootOnlyHooks.test.ts`에 `previewDocs.ts` 추가 3곳, `preview.test.ts` 한 건 이름에 「(모듈 단위)」. `npx vitest run fixtures/mini-figma` 394 passed (전 378 + 16)
    - **e2e (Playwright, desktop · mobile)**: 새 시나리오를 test 7개로 묶음 — `QA-55 · 61` · `QA-56 · 57 · 62` · `QA-58 · 59` · `QA-60` · `QA-A38` · `QA-A39` · `QA-A40` (요약 표 단언을 하나도 빼지 않음). 개정 = QA-52 · 53 · 54 · A30 · A31 · A32 · A33 · A35 (`mini-figma-preview.spec.ts`) · A8 · A10 (`mini-figma-attack.spec.ts`) · A28 (`mini-figma-palette.spec.ts`). `npx playwright test e2e/mini-figma-preview.spec.ts e2e/mini-figma-attack.spec.ts e2e/mini-figma-palette.spec.ts` 96 passed
    - **일부러 깬 뒤 되돌린 확인 3개** (모두 되돌린 뒤 `git status`로 파일 상태 확인): ① `moveTo`의 `setDoc(target)` 제거 → `QA-55` desktop 실패 (`QA-55 [실행 취소]: 테스트 영역` 불일치) ② `setSelectedId(... reconcileSelection ...)` 제거 → `QA-58` desktop 실패 (`selectedOnCanvas` `[]` 기대인데 b4가 남음) ③ `trackPush`의 앞쪽 자르기를 `slice(0, index)`로 한 칸 어긋나게 → `previewDocs.test.ts` 5건 + `app.test.ts` 16건(A42 포함) 실패 (21 failed). 세 곳 모두 원복 확인
    - **전체**: `npx vitest run` 46 files · 1195 passed, `npx tsc --noEmit` 오류 0, `npx playwright test` 330 passed (desktop + mobile)
    - **참고 (작업 트리 상황)**: 개발 중 사용자의 다른 창이 `[+ 인스턴스]`를 도구 막대에서 속성 패널로 옮기는 디자인 수정을 하는 중이었다(`Toolbar.ts` · `PropertyPanel.ts` · `e2e/mini-figma-helpers.ts`의 `clickAdd` 등, 미커밋). Dev-8 커밋에는 그 수정을 넣지 않고 **HEAD 위에 Dev-8 변경만 다시 적용한 파일**을 스테이지했다(HEAD + Dev-8 단독 상태도 별도 작업 트리에서 vitest 394 · tsc 0 · playwright 96 통과 확인). 사용자의 수정은 작업 트리에 그대로 남아 있다
    - **알려진 결과(명세대로)**: 「실행 취소 → 편집 없이 [Patch]」는 무변경이라 기록이 안 쌓임(QA-62 · U-6), 처음 · 끝 칸에서 편집만 한 상태는 꺼진 버튼 · 단축키로 못 버림(QA-A38 · U-5)
  - 의존: Dev-7. 명세: `../01_request_spec.md` PP-06 (최신) · §5 「뒤로 · 앞으로」 행 · `../00_master_dialogue.md` 「PP-06 변경」. 테스트 케이스: `../04_qa_evidence/qa_todo.md` 「PP-06 변경 (Dev-8)」 (QA-55 ~ 62 · A38 ~ A42 · 바뀌는 기존 단언)
  - **엔진 · `packages/` · `types.ts` 수정 없음.** `preview.ts`(createPreview) · `previewNav.ts` · `keys.ts` · 컴포넌트 · `index.html`도 안 고친다 (실제 영역 연결 모듈은 「실제 영역 기록만」 그대로 두고, 테스트 영역 되돌리기는 App이 맡는다)
  - **설계 (현재 코드 확인: `App.ts`는 Hook 7칸 — `[0]doc [1]selectedId [2]nextId [3]보관함 useMemo [4]초기화 useEffect [5]nav useState [6]keydown useEffect`, 핸들러 3개가 `vault.preview.patch/back/forward()`가 true일 때만 `setNav(navPush/navBack/navForward)`, `doc`은 안 건드림)**
    1. **`doc` 사본 목록 = 새 순수 모듈 `fixtures/mini-figma/previewDocs.ts`** (Hook · document · window · 엔진 import 없음, `Doc`은 `./model` 타입만):
       `DocTrack = { nav: PreviewNav; docs: readonly Doc[] }` · `initialTrack(doc)`(= `{ nav: INITIAL_NAV, docs: [doc] }`, 0번) · `trackPush(t, doc)` · `trackBack(t)` · `trackForward(t)` · `trackDoc(t)`(= `docs[nav.index]`). **칸 번호 = `nav.index`, 불변식 `docs.length === nav.size`.** `trackPush`는 새 번호 규칙을 따로 만들지 않고 **`navPush`를 그대로 불러** 엔진 History와 같은 칸 수 · 같은 잘림을 얻는다: `docs = [...docs.slice(0, nav.index + 1), doc]`(앞쪽 사본 버림) 뒤 `navPush(nav)`가 알려 준 `size`보다 길면 맨 앞에서 `docs.length - size`개를 뺀다 (한도 `HISTORY_LIMIT` 50, 넘으면 가장 오래된 칸부터 — 엔진 「맨 앞(head)부터 뺌」과 같음). `trackBack` · `trackForward`는 `navBack` · `navForward`가 같은 객체를 돌려주는 경계에서 **같은 `DocTrack` 객체**를 돌려준다
    2. **보관 자리 = 기존 보관함(`[3]` useMemo 상자)에 `track` 한 필드 더함**: `{ preview: Preview | null, track: DocTrack }`, 초기 `track = initialTrack(INITIAL_DOC)` (처음 = 0번 = 처음 `doc`). **새 Hook 칸 없음 — 7칸 · `slot(0~6)` 번호 그대로, `slot(5)`(nav)도 그대로 `{ index, size }`.** 엔진에 `useRef`가 없어 상자(바뀌어도 렌더를 안 일으키는 같은 객체)에 두는 기존 패턴. `track`을 state가 아니라 상자에 두는 이유: 같은 틱 연타(Patch → Patch, 실행 취소 → 실행 취소)에서 렌더 클로저 값이 낡아도 핸들러가 늘 **동기로 최신 칸**을 읽고 쓰기 위해 (Dev-5의 함수형 setter 연타 정확성과 같은 목적)
    3. **`nav`(state, `slot(5)`)는 버튼 꺼짐 계산용으로 남기고 `setNav(vault.track.nav)`로 상자와 맞춘다.** 경계 이동 · 무변경 Patch는 같은 객체라 렌더 0번 (기존 단언 유지)
    4. **핸들러** (`App.ts`):
       - `onPreviewPatch`: `if (vault.preview?.patch()) { vault.track = trackPush(vault.track, doc); setNav(vault.track.nav); }` — `doc` = 마지막 렌더의 값 = Patch가 읽은 테스트 영역 DOM을 그린 바로 그 값. **무변경 Patch(`false`)면 기록 · 사본 모두 안 쌓임**
       - `onPreviewBack` / `onPreviewForward`: `const next = trackBack(vault.track)`(forward는 `trackForward`); `next === vault.track`이거나 `!vault.preview?.back()`이면 아무것도 안 함(경계 · 효과 전); 아니면 `vault.track = next; const target = trackDoc(next); setDoc(target); setSelectedId((prev) => reconcileSelection(prev, target)); setNav(next.nav);` — **① `doc`만 되돌림 ② `selectedId`는 그대로, 되돌린 `doc`에 없는 인스턴스면 `reconcileSelection`이 null(함수형 setter라 같은 틱 선택도 안 놓침) ③ `nextId`는 setter 호출 자체가 없음(번호 재사용 없음) ④ Patch 안 한 편집은 `setDoc(target)`이 덮어써서 버려짐**. 한 틱의 setter 여러 개는 결정 9 B 배칭으로 렌더 1번
       - keydown effect · 버튼 `onClick`은 같은 `onPreviewBack` · `onPreviewForward`를 부르므로 단축키(Ctrl/Cmd+Z · Shift+Z)와 버튼이 자동으로 같은 경로. effect 코드 · deps(`[doc, selectedId]`) 변경 없음 (핸들러가 클로저 `doc`을 안 읽음. Patch 핸들러만 `doc`을 읽는데 버튼 `onClick`은 렌더마다 갈아 끼워지므로 늘 최신)
    5. **엔진 History 칸과 번호 맞추기**: ① 같은 연산이 `preview.patch()`(= 엔진 `update`가 기록을 쌓음) 성공 때만 `trackPush`로 이어지므로 쌓이는 시점이 같다 ② 칸 수 · 잘림 · 경계는 `navPush` · `navBack` · `navForward` 한 곳이 정하고 이 규칙은 `previewNav.test.ts`가 엔진 `History`와 대조 중 ③ `docs`는 `nav.size`에 맞춰 같이 잘리므로 어긋날 수 없음. 새 테스트(`previewDocs.test.ts`)가 불변식과 엔진 대조를 한 번 더 지킨다
    6. **알려진 결과 (명세대로, 테스트로 고정)**: (가) 「실행 취소 → 편집 없이 [Patch]」는 이제 **아무 일도 안 함**(테스트 영역 = 실제 영역이라 무변경 → 기록 안 쌓임 · [다시 실행] 계속 켜짐). 전에는 테스트 영역(B) ≠ 실제 영역(A)이라 B가 새 기록이 됐다 → QA-53 · 단위 「실행 취소한 뒤 [Patch]」는 편집을 끼워 넣어 고침 (나) 처음 칸 · 끝 칸에서는 버튼이 꺼져 있어 거기서 편집만 하고 Patch를 안 한 상태는 [실행 취소] · [다시 실행]으로 못 버린다(명세 「처음 · 끝에서는 꺼짐」 우선) — A38에서 「안 움직이고 안 버려짐」으로 고정 (다) 눈에 안 보이는 `doc` 차이(DOM이 안 바뀌는 편집)는 Patch가 `false`라 사본이 안 쌓이고 이동 때 버려짐 (④와 같은 결과라 허용)
  - **바깥 루프(ATDD, 먼저 실패 확인)**: `e2e/mini-figma-preview.spec.ts`에 QA-55 ~ 62 · A38 ~ A40을 **먼저** 쓰고 desktop에서 실패를 본 뒤 구현. 같은 파일의 QA-52 · 53 · 54 · A33 · A35(깨지는 기존 단언)와 `mini-figma-attack.spec.ts` A8 · A10, `mini-figma-palette.spec.ts` A28도 새 기대로 고쳐 같은 시점에 실패 → 통과로 만든다. 새 도우미가 필요하면 **`e2e/mini-figma-helpers.ts`를 건드리지 않고 `mini-figma-preview.spec.ts` 안 지역 함수로** 둔다
  - **안쪽 루프(Vitest, 먼저 실패 확인)**:
    - `fixtures/mini-figma/__tests__/previewDocs.test.ts` (신규, PD-1 ~ 5): 처음 `trackDoc` = 처음 doc · push/back/forward 때 매 단계 `trackDoc` · 경계는 같은 객체 · 뒤로 간 뒤 push → 앞쪽 사본 버림(`docs.length = index + 2`) · 한도: push 60번 → `docs` 50개 · 맨 앞 = 11번째 사본 · `index` 49 · back 49번째에 맨 앞 사본, 50번째는 같은 객체 · **무작위 연산 2000번 불변식** `docs.length === nav.size` && `trackDoc === docs[nav.index]` · **엔진 대조**: 엔진 `History`에 같은 번호표 항목을 같은 연산(push · back · forward · 뒤로 간 뒤 push · 60번 push)으로 넣고 매 단계 `size` · 현재 칸의 번호표 = `trackDoc`의 번호표 · 입력 불변(이전 `DocTrack`을 안 고침)
    - `fixtures/mini-figma/__tests__/app.test.ts` 「실제 영역」 · 키보드 describe: 「바뀌는 기존 단언」(qa_todo) 고침 + 새 단위 U-1 ~ U-7 · A41 · A42 (qa_todo). `slot(0)` = 이동 뒤 `docs[index]`와 **같은 객체**, `slot(1)` · `slot(2)` 규칙, Hook 7칸 · `slot(5)` 모양 불변
    - `fixtures/mini-figma/__tests__/rootOnlyHooks.test.ts`: 순수 모듈 목록 두 곳(`useEffect` 안 씀 검사 · Hook 없음 검사 · 순수 검사)에 `previewDocs.ts` 추가
  - **대상 파일**: `fixtures/mini-figma/previewDocs.ts` (신규) · `fixtures/mini-figma/App.ts` (보관함 모양 · 핸들러 3개 · 주석 갱신 — 파일 맨 위 「실제 영역 기록만」 취지 주석, `onPreviewPatch` 위 주석) · 테스트 = `__tests__/previewDocs.test.ts` (신규) · `__tests__/app.test.ts` · `__tests__/rootOnlyHooks.test.ts` · `e2e/mini-figma-preview.spec.ts` · `e2e/mini-figma-attack.spec.ts` (A8 · A10) · `e2e/mini-figma-palette.spec.ts` (A28)
  - **충돌 주의 (사용자가 다른 창에서 디자인 작업 중)**: ① Dev-8은 사용자가 고치는 4개 파일 `fixtures/mini-figma/index.html` · `__tests__/design.test.ts` · `e2e/mini-figma-design.spec.ts` · `e2e/mini-figma-render.spec.ts`를 **건드리지 않는다** (CSS · 배치 변경 없음, QA-1은 `back-button`이 꺼져 있음만 보므로 그대로 통과) ② 그러나 **지금 작업 트리에 사용자의 커밋 안 된 수정이 있는 파일 두 개를 Dev-8도 고친다**: `fixtures/mini-figma/__tests__/app.test.ts`(사용자 수정은 442 · 762 · 795 · 1283줄 근처 4곳. Dev-8은 1058 ~ 1473줄 `키보드` · `실제 영역` describe의 테스트 몇 개와 새 describe를 고친다 — 1283줄은 `실제 영역` describe 안 한 줄이라 Dev-8이 같은 테스트 줄은 안 건드리지만 같은 describe라 가까움)와 `e2e/mini-figma-palette.spec.ts`(사용자 수정 144 · 149줄, Dev-8은 A28 297줄 근처). 같은 파일 다른 줄이라 서로 덮어쓰지는 않지만 **Dev-8 커밋에 사용자의 디자인 수정이 섞여 들어가지 않게** `git add -p`로 Dev-8 줄만 스테이지하거나, 개발 전에 사용자에게 디자인 커밋을 먼저 해 달라고 한다 (마스터가 정함). `e2e/mini-figma-helpers.ts`(사용자 수정 있음)는 Dev-8이 **안 고친다** ③ `Toolbar.ts` · `PropertyPanel.ts`(사용자 수정 있음)도 안 건드림. `App.ts`는 사용자 수정 없음
  - 알고리즘: 명세 PP-06 (변경) · 「뒤로 · 앞으로」 행 (사용자 결정: 세부 1 ~ 4 추천안) — 새 결정 없음
  - 완료 근거로 남길 것: QA-55 ~ 62 · A38 ~ A40 desktop 먼저 실패 → desktop · mobile 통과 출력, `previewDocs.test.ts` 건수(엔진 대조 포함), 고친 기존 단언 목록과 통과 수, `npx vitest run` · `npx tsc --noEmit` · `npx playwright test` 전체 수, `git diff --stat main -- packages/` 비어 있음, 일부러 깬 뒤 되돌린 확인(예: `setDoc(target)` 제거 → QA-55 실패 · `trackPush`의 앞쪽 버리기 제거 → 단위 실패 · `reconcileSelection` 제거 → QA-58 실패), 커밋 해시

<!-- 완료 예시
- [x] **Dev-3** (`mini-figma`): 실제 영역 연결 모듈
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/preview.ts` 신규(`createPreview`), `fixtures/mini-figma/__tests__/preview.test.ts` 18건 통과
    (`npx vitest run fixtures/mini-figma` 412 passed), `npx tsc --noEmit` 오류 0, 커밋 a1b2c3d
-->
