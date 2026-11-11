# qa_todo: figma-design

- 명세: `../01_request_spec.md` (FD-01 ~ 25) · Dev 목록: `../03_development/dev_todo.md` · 디자인 기준: `../00_design_reference.md`
- 실행: `npx playwright test e2e/mini-figma-<이름>.spec.ts` (desktop 1280x800 · mobile 375x812 두 프로젝트, 모든 시나리오가 두 프로젝트에서 돈다). 기존 Phase 1 · 2 e2e와 task_004 e2e(`mini-figma-*.spec.ts`)는 회귀로 모두 통과해야 한다
- 시나리오 하나 = `e2e/*.spec.ts` 테스트 하나. 테스트 이름은 시나리오 문장 그대로. **번호는 task_004에서 이어 쓴다** (새 인수 = QA-31 ~ , 새 공격 = QA-A20 ~ ). 번호가 같은 기존 시나리오는 단언만 고친다 (아래 「바뀌는 기존 단언」 표)
- 근거 ID: 이 task의 `FD-xx` · task_004 `MF-xx` · Diff 기본 케이스 `D-01 ~ 05`(앱 화면에서 본 대응. 엔진은 안 바꾸므로 엔진 단위 테스트가 회귀로 덮음). History 동기화(Phase 1 두 영역) 시나리오는 이 앱에 해당 없음
- **공통 확인 (모든 스펙 · 모든 테스트)**: 콘솔 `error`가 한 건이라도 있으면 실패, 선언 안 한 dialog가 뜨면 실패 (`phase1-helpers.ts`의 `test` 확장 재사용)
- 노드 참조 · DOM 변경 관찰: task_004와 같음 (`holdNodes` · `sameNode` · `watchApp` · `watchSel`). 화면에 patch를 안 그리므로(MF-05) patch 종류 · 개수는 `app.test.ts`가 아래 「patch 기대 표」로 확인하고, e2e는 같은 노드 + MutationObserver로 「바뀐 곳만 고침」을 본다
- 색 읽기는 값으로: 버튼 배경 = `getComputedStyle(el).backgroundColor` (`rgb(r, g, b)`), 글자 = `color`. 도우미 `rgb('#0052ff')` → `'rgb(0, 82, 255)'`, `bgOf(page, id)` · `textOf(page, id)`, 색 고르기 `pickColor(page, '#cf202f')`(칩 누르기), `pickColorInput(page, '#336699')`(색 입력칸 `fill`)
- Playwright 사실 확인(실행해 봄): `fill('#336699')`는 `<input type="color">`에서 `input` + `change`를 보낸다. 꺼진 버튼을 `click({ force: true })`해도 `click` 이벤트는 오지 않는다

## 화면 약속 (`data-testid` · 표시 상태) — task_004 표에서 바뀌는 것만

| 영역 | testid | 설명 |
| --- | --- | --- |
| 영역 상자 | `app-root` | 그 안 최상위는 `<div class="app">` 하나 (그대로) |
| 네 영역 | `toolbar` · `layer-panel` · `canvas` · `property-panel` | `div.app`의 자식 순서 **0 · 1 · 2 · 3** 고정 (경로 접두 `[0,0]` · `[0,1]` · `[0,2]` · `[0,3]`). mobile은 CSS만 바뀜 |
| 도구 막대 | `app-name` · `add-instance` · `undo-button` · `redo-button` | 앱 이름 「mini-figma」 · [+ 인스턴스](전에는 레이어 창에 있었음, testid 그대로) · [↶ 되돌리기] · [↷ 다시 하기] (기록이 없으면 `disabled`) |
| 속성 패널 색 칸 | `color-palette` · `color-chip`(`data-color`) · `prop-color` · `color-hex` | 팔레트 판 · 칩 8개(지금 색 = `aria-pressed="true"`) · 직접 고르기 `<input type="color">`(전에는 `<select>`였음) · 현재 색 값 글자 |
| 상태 표시 | 고른 것: 캔버스 버튼 · 레이어 행에 클래스 `selected`(그대로). **색: 클래스 `btn-blue/red/green`이 사라지고 버튼의 `style`(배경 · 글자색)로**. 크기: 클래스 `btn-S/M/L` 그대로 | 테스트는 computed style로 확인 |

## 바뀌는 기존 단언 (이름이 같은 시나리오의 단언만 고침 — 뜻은 그대로)

| 시나리오 | 전 | 후 |
| --- | --- | --- |
| QA-1 (render) | 색 `btn-blue ×3, btn-red` 클래스 · 최상위 `kids: ['layer-panel','canvas','property-panel']` | 배경 `rgb(0, 82, 255)` ×3 + `rgb(207, 32, 47)`(b3), 글자 4개 모두 `rgb(255, 255, 255)`, **클래스에 `btn-blue/red/green` 없음** · `kids: ['toolbar','layer-panel','canvas','property-panel']` · [↶] [↷] `disabled` |
| QA-2 (render, 배치) | 레이어 · 캔버스 · 속성 세 영역만 (desktop 가로 · mobile 세로) | 도구 막대가 **세 영역 위, 가로 전체**. desktop = 도구 막대 아래 3열, mobile = 도구 막대 → 레이어 → 캔버스 → 속성 순으로 쌓임. 가로 스크롤 없음 (MF-03 · FD-06) |
| QA-7 (main) | 색 `selectOption({ label: '초록' })`, `btn-green` 클래스 | 칩 `#05b169` 누르기 `pickColor`, 배경 `rgb(5, 177, 105)` + **글자 `rgb(10, 11, 13)`**(밝은 배경이라 먹색). b3는 `rgb(207, 32, 47)` 그대로 |
| QA-10 (instance) | `selectOption({ label: '초록' })` · `btn-green` | `pickColor('#05b169')` · b1만 배경 `rgb(5, 177, 105)`. 메인 · b2 `rgb(0, 82, 255)`, b3 `rgb(207, 32, 47)` |
| QA-13 (instance) | `prop-color` 값 `blue` · `red` | `prop-color`(색 입력칸) 값 `#0052ff` · `#cf202f`. 「메인 따름」 · override 표시는 그대로 |
| QA-14 · 15 · A9 · A12 · A18 · A19 ([+ 인스턴스]) | 레이어 창의 `add-instance` | 도구 막대의 `add-instance` (testid 같아 코드는 그대로 돎). mobile에서 20번 연타도 눌러짐(화면 안) |
| QA-19 · 20 · 23 · 24 · 29 (undo) | 메인 색 `selectOption({ label: '빨강' })`, `colorsOf` = 클래스, `prop-color` `blue`/`red` 값 | `pickColor('#cf202f')`, `colorsOf` = 배경 rgb (`rgb(0, 82, 255)` ↔ `rgb(207, 32, 47)`), `prop-color` 값 `#0052ff` ↔ `#cf202f` |
| QA-A5 · A8 · A10 · A11 · A13 (attack) | 색 `selectOption({ label: '초록' \| '빨강' })`, `mainColorClass`(`btn-red`/`btn-blue`) | `pickColor`, 배경 rgb로 (A8의 선택 상자 · 체크박스 포커스 대상은 `prop-size` · `prop-hasicon` 그대로) |
| 그 밖 (QA-3 ~ 6 · 8 · 9 · 11 · 12 · 16 ~ 18 · 21 · 22 · 25 · 26 ~ 28 · 30 · A1 ~ A4 · A6 · A7 · A14 ~ A17) | — | 단언 변화 없음 (회귀로 그대로 통과) |

## 인수 시나리오 (새)

| QA | 근거 ID | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| QA-31 | FD-10 · 11 · 12 · 07 | `/mini-figma/`를 처음 연다 | 로드 직후 | 도구 막대(`toolbar`)가 영역 최상위 첫 자식이고 안에 앱 이름 「mini-figma」 · [+ 인스턴스] · [↶ 되돌리기] · [↷ 다시 하기]가 그 순서로 있다. [↶] · [↷]는 `disabled`, [+ 인스턴스]는 눌림. **레이어 창(`layer-panel`) 안에는 `add-instance`가 없다**. 앱 이름 글자 = 「mini-figma」 | `e2e/mini-figma-toolbar.spec.ts` |
| QA-32 | FD-12 · MF-30 · 31 | 메인을 고르고 칩 `#cf202f`를 누른다 (Undo 1단계) | [↶ 되돌리기]를 누르고, 이어서 [↷ 다시 하기]를 누른다 | 색 칩을 누르자마자 [↶]이 켜지고 [↷]은 꺼진 채. [↶] 클릭 → 메인 · b1 · b2 배경이 `rgb(0, 82, 255)`으로, [↶] **꺼짐** · [↷] **켜짐**. [↷] 클릭 → 다시 `rgb(207, 32, 47)`, [↶] 켜짐 · [↷] 꺼짐. 고르기는 그대로, 버튼 노드는 같은 참조 | 〃 |
| QA-33 | FD-12 · MF-30 · 32 | [+ 인스턴스] → 메인을 골라 라벨 `새` → 크기 `L` (3단계, 추가 · 라벨 · 크기) → 마지막으로 b4를 고른다 (고르기는 기록 밖) | [↶] 2번, 이어서 키보드 Ctrl+Shift+Z 1번, 다시 [↶] 2번 | **버튼과 키가 같은 기록 하나를 쓴다**: [↶] 2번 = 크기 · 라벨이 돌아감, Ctrl+Shift+Z = 라벨 `새` 다시, [↶] 2번 = 라벨 · 추가까지 돌아가 b4가 사라지고 **선택이 풀림**(MF-32, 속성 패널 빈 안내). 마지막에 [↶] 꺼짐 · [↷] 켜짐. (Undo 한도 49번을 버튼으로 돌리는 것은 `app.test.ts`가 본다) | 〃 |
| QA-34 | FD-11 · MF-22 · D-03 | 메인을 `확인` / 크기 `L`로 바꿔 두었다 | 도구 막대의 [+ 인스턴스]를 누른다 | 캔버스 · 레이어 끝에 b4가 override 없이 생기고(글자 `확인` · 크기 L), 기존 버튼 · 행 노드는 같은 참조, 선택 그대로, 캔버스 · 레이어 DOM 변경은 각각 childList 1건(QA-14와 같음). 눌린 뒤 [↶]이 켜짐 | 〃 |
| QA-35 | FD-21 · 22 · 20 | 메인을 고른다 | 속성 패널 색 칸을 본다 | 팔레트 판(`color-palette`)에 칩 8개가 `#0052ff` `#cf202f` `#05b169` `#f4b000` `#0a0b0d` `#5b616e` `#a8acb3` `#eef0f3` 순서로(`data-color`), **지금 색 `#0052ff` 칩만 `aria-pressed="true"`**, 직접 고르기 `prop-color`(`type="color"`) 값 `#0052ff`, 값 글자(`color-hex`) `#0052ff`. 색 칸에 `<select>`가 없다 | `e2e/mini-figma-palette.spec.ts` |
| QA-36 | FD-21 · 23 · 24 · 25 · MF-12 · D-02 | 메인을 고른다 | 칩 8개를 차례로 누른다 | 칩마다 **메인 · b1 · b2 배경 = 그 색**(b3는 override라 `rgb(207, 32, 47)` 그대로), 글자색 = 규칙 표(흰 글자 `#0052ff` `#cf202f` `#0a0b0d` `#5b616e` / 먹 글자 `#05b169` `#f4b000` `#a8acb3` `#eef0f3`, ④-1 A), 누른 칩만 `aria-pressed="true"` · `prop-color` 값 · `color-hex` 글자가 따라감. 모든 버튼 노드는 같은 참조 | 〃 |
| QA-37 | FD-22 · MF-31 | 메인을 고른다 | 색 입력칸에 `#112233` → `#223344` → `#336699`를 차례로 `fill`한다 (고르는 동안 여러 번), 이어서 `pressUndo`(포커스를 먼저 뺌) 한 번 | 입력할 때마다 메인 · b1 · b2 배경이 따라 바뀌고, **마지막 값 `#336699`가 칩 8개 밖 색이라 `aria-pressed="true"` 칩이 0개**, `color-hex` `#336699`. 입력칸 노드는 같은 참조. Ctrl+Z **한 번에** 시작 색 `#0052ff`로 (연속 입력 = 한 단계) | 〃 |
| QA-38 | FD-25 · MF-12 · 13 · 21 | b1(override 없음)을 고른다 | ① 칩 `#05b169` ② 메인을 고르고 칩 `#cf202f` ③ b1을 고르고 ↻(색 칸) ④ b1에서 메인과 같은 값(메인 색) 칩 | ① 색 칸에 override 표시 + ↻, b1만 배경 `rgb(5, 177, 105)`, 메인 · b2 그대로 ② 메인 · b2는 빨강 · **b1은 초록 그대로** ③ 색 칸 「메인 따름」, b1이 메인 색(빨강)을 따라감, 인스턴스 객체에 `color` 키가 없고 `undefined` 글자가 안 나옴 ④ 메인과 같은 값이어도 override로 남고(↻ 있음) 메인을 바꿔도 안 따라감 | 〃 |
| QA-39 | FD-23 · D-02 | 메인을 고르고 버튼 노드 · 클래스 글을 붙잡아 둔다 | ① 칩 `#cf202f`(글자색 안 바뀜) ② 칩 `#f4b000`(글자색이 먹색으로 바뀜) | 4개 버튼 노드 모두 같은 참조, **`class` 글이 안 바뀜**(색은 `style`로), childList · characterData 변경 0. 버튼의 속성 변경 횟수: ① 메인 · b1 · b2 버튼당 **1건**(배경만) ② 버튼당 2건(배경 + 글자색, ④-2 X). b3 버튼은 변경 0 (override) | 〃 |
| QA-40 | FD-01 · 02 · 03 · 04 | 처음 연다 → b2를 누른다(고른 상태) | computed style을 읽는다 | 바탕 `body` `rgb(10, 11, 13)`. 레이어 · 속성 패널 배경 `rgb(22, 24, 28)` + `border-radius: 24px`, 글자 `rgb(255, 255, 255)`, 보조 글자(`property-empty` · `prop-follow`) `rgb(168, 172, 179)`. **`box-shadow: none`**(도구 막대 · 두 패널 · 캔버스 · [+ 인스턴스] · 칩 · 버튼). 캔버스 `background-image`에 `radial-gradient`(점무늬). [+ 인스턴스] 배경 `rgb(0, 82, 255)` · `border-radius: 100px` · 글자 흰색, [↶] [↷]도 `100px`. 라벨 입력칸 `border-radius: 12px`. 칩은 원(폭 = 높이, 반지름 ≥ 폭/2). 고른 캔버스 버튼 `outline-color` `rgb(0, 82, 255)`(+ `outline-style` ≠ none), 고른 레이어 행 `outline-color` `rgb(0, 82, 255)` | `e2e/mini-figma-design.spec.ts` |
| QA-41 | FD-03 · 05 · 07 | 같은 화면 | 입력칸에 포커스, 페이지 · 요청을 본다 | 라벨 입력칸 포커스 때 `border-color` `rgb(0, 82, 255)`(2px). **주황 없음**: 앱 안 모든 요소의 배경 · 글자 · 테두리 · outline 중 `rgb(246, 173, 85)` · `rgb(255, 250, 240)`이 0개 (override 칸 표시도 파랑 계열 ④-4). `body` `font-family`가 `Inter`로 시작, `color-hex` 글자 `font-family`에 `monospace`. 페이지 글자 · `document.title`에 「coinbase」(대소문자 무관) 없음, `<title>` = `mini-figma`, `img` · `svg` 요소 0개. **페이지가 받은 요청이 모두 같은 출처(`localhost:5199`) 또는 `data:`** (외부 글꼴 · 이미지 안 받음) | 〃 |
| QA-42 | FD-06 · MF-03 | 처음 연다 | 위치를 잰다 | desktop = 도구 막대가 맨 위에서 **가로 전체**(폭 ≈ 레이어 왼쪽 ~ 속성 오른쪽), 그 아래에 레이어 · 캔버스 · 속성이 같은 줄 3열. mobile = 도구 막대 → 레이어 → 캔버스 → 속성 순으로 세로. 두 크기 모두 가로 스크롤 없음 (QA-2와 같은 측정, 도구 막대 포함) | 〃 |

## 공격적 시나리오 (새)

| QA | 시나리오 | Then | 근거 ID | 스펙 파일 |
| --- | --- | --- | --- | --- |
| QA-A20 | Undo 버튼 연타: 서로 다른 칸 3단계(라벨 · 크기 · 색)를 쌓고 [↶]을 7번 연달아 누른다. 이어서 [↷]을 7번 | [↶] 3번째에서 `disabled`로 바뀌고(4 ~ 7번째는 `click({ force: true })`) 이후 클릭은 무시(첫 모습으로 멈춤, 4 ~ 7번째 DOM 변경 0). [↷]도 3번째에서 `disabled`. 한 번 누를 때 한 단계만 움직임. 콘솔 오류 없음. 라벨 입력 중에도 [↶]이 켜지는데 **입력칸은 같은 노드 · 포커스 · 커서 유지** | FD-12 · MF-30 · 31 · P2-22 | `e2e/mini-figma-toolbar.spec.ts` |
| QA-A21 | 꺼진 버튼 누르기: 처음 화면에서 [↶] · [↷]을 `click({ force: true })`로 눌러 본다. 한 단계 쌓은 뒤 Undo → [↶]이 꺼진 상태에서도 다시 눌러 본다 | 꺼진 버튼은 아무 일도 안 한다: DOM 변경 0 · 렌더 없음 · 문서 · 선택 그대로 · 오류 없음. 키 Ctrl+Z도 같은 결과(기록 없음) | FD-12 · P-20 | 〃 |
| QA-A22 | 색 입력칸 연타: `fill`로 서로 다른 색을 30번 연달아 보낸다 (중간에 칩 · 입력칸을 섞음) | 오류 없이 마지막 값이 버튼 배경 · `color-hex` · 입력칸에 반영. 입력칸 노드는 같은 참조. **`pressUndo` 한 번에 시작 색으로**(같은 칸 연속 = 한 단계, 30번이어도). [↶] 한 번 더는 아무 일 없음 | FD-22 · MF-31 | `e2e/mini-figma-palette.spec.ts` |
| QA-A23 | 극단 · 경계 색: 색 입력칸에 `#000000` · `#ffffff` · `#777777` · `#787878` · `#ff0000`을 차례로 | 글자색이 규칙대로: `#000000` 흰 · `#ffffff` 먹 · `#777777` 흰 · `#787878` 먹 · `#ff0000` 먹 (④-1 A 기준; B · C가 정해지면 경계 값만 바뀜). 글자가 읽히도록 배경과 글자가 같은 색인 경우가 없음. 대문자 `#EEF0F3`를 `evaluate`로 넣고 `input` 이벤트를 보내도 브라우저가 소문자로 정리해 상태 · 표시가 `#eef0f3` | FD-24 · FD-20 | 〃 |
| QA-A24 | 같은 색 다시 누르기: ① 메인을 고르고 지금 색(`#0052ff`) 칩을 누른다 ② b1(메인 따름)을 고르고 b1의 지금 색(메인과 같은 `#0052ff`) 칩을 누른다 | ① **아무 일 없음**: DOM 변경 0 · [↶] 안 켜짐 · 렌더 없음 (같은 값은 기록 안 함). ② 값은 같지만 **override가 생김**(색 칸 ↻ 표시, [↶] 켜짐, MF-12 「메인과 같은 값도 override」), 버튼 배경은 그대로(DOM 변경은 속성 패널뿐, 캔버스 0) | MF-12 · P-20 | 〃 |
| QA-A25 | 칩 연타: 칩 8개를 위에서 아래로 빠르게 눌러 한 바퀴 → 라벨 입력 → 칩 2번 → Ctrl+Z 한 번씩 | 칩 한 바퀴 = 한 단계(같은 칸 연속), 라벨은 새 단계, 이어서 칩 2번은 새 묶음. Ctrl+Z 순서: 칩 2번이 한 번에 → 라벨 → 칩 한 바퀴가 한 번에 시작 색. 매번 정확히 한 단계, 노드 참조 유지 | MF-31 | 〃 |
| QA-A26 | 좁은 화면 도구 막대: 375px(mobile 프로젝트)와 1280px 모두 — 앱 이름 · 버튼 3개를 본다. 이어서 [+ 인스턴스] 20번 | 네 요소의 왼쪽 ≥ 0 · 오른쪽 ≤ 뷰포트 너비(화면 밖으로 안 나감, 모자라면 줄바꿈), 가로 스크롤 없음, 버튼 높이 ≥ 40px(눌러지는 크기). 20번 추가 뒤에도 도구 막대는 맨 위 첫 자식 · [↶]이 켜져 있음 | FD-06 · 10 · MF-03 | `e2e/mini-figma-design.spec.ts` |
| QA-A27 | 새로고침: 색을 바꾸고 추가 · 삭제 · Undo까지 한 뒤 `reload` | 시작 색(메인 `#0052ff` · b3 `#cf202f`), 선택 없음, **[↶] · [↷] 둘 다 `disabled`**, Ctrl+Z · Ctrl+Shift+Z는 아무 일 없음, 추가하면 b4 | FD-12 · 20 · MF-16 | `e2e/mini-figma-attack.spec.ts` |
| QA-A28 | 색 입력칸 포커스에서 키 (④-3 추천 채택 시): 색 입력칸 `prop-color`에 포커스를 둔 채 Delete · Backspace · Ctrl+Z · Ctrl+Shift+Z | Delete · Backspace는 아무 일 없음(고른 인스턴스 안 지워짐), Ctrl+Z = 앱 Undo, Ctrl+Shift+Z = 앱 Redo (QA-30 · A8과 같은 규칙). ④-3을 「안 넓힘」으로 정하면 이 시나리오는 뺀다 | Q18 ② · FD-22 | `e2e/mini-figma-palette.spec.ts` |
| QA-A29 | 밝은 색 위의 선택 표시: 메인 칩 `#eef0f3`(가장 밝음)와 `#0a0b0d`(가장 어두움)를 각각 칠하고 메인 버튼을 고른 상태 | 고른 표시 `outline`이 파랑 `rgb(0, 82, 255)` · 너비 ≥ 2px · `outline-offset` ≥ 2px로 버튼과 떨어져 두 색 위에서 모두 그대로 있음. 글자는 규칙대로(밝은 배경 = 먹 · 어두운 배경 = 흰). 캡처로 육안 확인(캔버스 점무늬 위) | FD-02 · 03 · 24 | `e2e/mini-figma-design.spec.ts` |

특수문자 · 빈 입력(공격 기본 4종 중): 색 칸은 글자 입력이 없어 해당 없음 — 글자 칸 쪽 특수문자(A1) · 빈 라벨(A3) · 긴 글자(A2)는 기존 시나리오가 그대로 지키며, 새 팔레트와 함께 쓰는 확인은 QA-A22(연타) · A23(극단 값) · A27(새로고침)이 맡는다.

## patch 기대 표 (`app.test.ts`가 `lastPatches`로 단언)

- 센 방법: `toolbarCounts` · `layerCounts` · `canvasCounts` = `patch.path`(`MOVE`는 `patch.parent`)가 **도구 막대 `[0,0]` · 레이어 `[0,1]` · 캔버스 `[0,2]`**로 시작하는 줄만 모아 **`SET_EVENT`를 뺀** 종류별 개수. 속성 패널 `[0,3]`은 `value` / `checked`가 바뀔 때마다 `SET_PROP`이 섞이므로 센 값을 단언하지 않는다 — **예외: P-25만 팔레트 구조가 정해져 있어 `panelCounts`로 센다**(고르기 · 삭제의 `REPLACE` ≥ 1(D-05)은 그대로 「1줄 이상」)
- 접두 맞는지 한 줄 단언: `root.firstElementChild.children[0 ~ 3]`의 `data-testid`가 `toolbar` · `layer-panel` · `canvas` · `property-panel`
- 시작 상태(`INITIAL_DOC`, 선택 없음, [↶] [↷] 꺼짐)에서 각 행을 독립된 `it`으로. 「Given」 준비 편집 뒤의 렌더만 센다 (**준비 동작마다 `await Promise.resolve()`로 렌더를 끝낸 뒤 센 동작을 한다**, Batching 결정 9 B). 도구 막대 열 T는 첫 수정에서 [↶]이 켜지는 `SET_ATTR`(`disabled` `""` → 없음) 줄이다: 첫 수정 `{ SET_ATTR: 1 }`, 이미 켜져 있으면 `{}`
- 글자색 줄(④-2 X)은 `style`의 `color` 항목이다. Y(클래스)로 정해지면 P-5 · 5b · 19의 캔버스 값이 `{ SET_STYLE: 3, SET_ATTR: 3 }`(글자색이 바뀌는 행) · `{ SET_STYLE: 3 }`(안 바뀌는 행)으로 바뀐다

| # | 동작 (Given → When) | 도구 막대 T | 캔버스 | 레이어 | 속성 패널 | 전(task_004) → 후 | 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P-1 | 처음 → `b2` 고르기 | `{}` | `{ SET_ATTR: 1 }` | `{ SET_ATTR: 1 }` | `[0,3]` `REPLACE` ≥ 1 (빈 `<p>` → `<h2>`) | 접두만 이동 (캔버스 `[0,1]`→`[0,2]` · 레이어 `[0,0]`→`[0,1]` · 속성 `[0,2]`→`[0,3]`) | MF-20 · D-05 |
| P-2 | `b2` 선택 → `b3` 고르기 | `{}` | `{ SET_ATTR: 2 }` | `{ SET_ATTR: 2 }` | 세지 않음 | 접두만 | MF-20 |
| P-3 | 메인 선택 → 라벨 `버튼!` | `{ SET_ATTR: 1 }` | `{ SET_TEXT: 2 }` | `{ SET_TEXT: 1 }` | 세지 않음 | + T 열 | MF-14 · 15 · D-01 |
| P-4 | 메인 선택 → 크기 `L` | `{ SET_ATTR: 1 }` | `{ SET_ATTR: 4 }`(class `btn-L`) | `{}` | 세지 않음 | + T 열 | MF-14 · D-02 |
| P-5 | 메인 선택 → 색 칩 `#05b169` | `{ SET_ATTR: 1 }` | **`{ SET_STYLE: 6 }`** (메인 · b1 · b2 × (배경 + 글자색 흰 → 먹)) | `{}` | 세지 않음 | **캔버스 `SET_ATTR: 3`(class) → `SET_STYLE: 6`** | FD-23 · 24 · D-02 |
| P-5b | 메인 선택 → 색 칩 `#cf202f` | `{ SET_ATTR: 1 }` | **`{ SET_STYLE: 3 }`** (배경만, 글자색 흰 그대로, b3는 이미 `#cf202f`라 줄 없음). 한 줄 필드 단언: `property` `'background-color'`, `before` `'#0052ff'`, `after` `'#cf202f'` | `{}` | 세지 않음 | 새 행 (P-5의 글자색이 안 바뀌는 쪽) | FD-23 · D-02 |
| P-6 | 메인 선택 → 아이콘 켜기 | `{ SET_ATTR: 1 }` | `{ INSERT: 4 }` (`REPLACE` · `REMOVE` · `SET_TEXT` 0, 각 INSERT 경로 마지막 = `0`) | `{}` | 세지 않음 | + T 열 | MF-14 · D-03 · Q17-1 |
| P-7 | P-6 뒤 → 아이콘 끄기 | `{}` (같은 칸 묶음, 기록 그대로) | `{ REMOVE: 4 }` | `{}` | 세지 않음 | + T 열 | MF-14 · D-04 |
| P-8 | P-6 뒤 → 종류 `♥` | `{}` | `{ SET_TEXT: 4 }` | `{}` | 세지 않음 | + T 열 | MF-14 · D-01 |
| P-9 | `b1` 선택 → 라벨 `확인` | `{ SET_ATTR: 1 }` | `{ SET_TEXT: 1 }` | `{ SET_TEXT: 1 }` | 세지 않음 | + T 열 | MF-12 · 14 · D-01 |
| P-10 | `b2` 선택 → 아이콘 보이기 켜기 | `{ SET_ATTR: 1 }` | `{ INSERT: 1 }` — 경로 = **`b2` 버튼 경로 `[0,2,1,1]` + `[0]`** (전 `[0,1,1,1]`) | `{}` | 세지 않음 | 접두 + T 열 | MF-14 |
| P-11 | P-10 뒤 → 아이콘 종류 `♥` | `{}` | `{ SET_TEXT: 1 }` | `{}` | 세지 않음 | + T 열 | MF-14 |
| P-12 | `b2`에 아이콘 override가 있는 채 → 메인 아이콘 켜기 | `{}` | `{ INSERT: 3 }` (메인 · b1 · b3, **`b2` 경로 `[0,2,1,1]` 줄 0**) | `{}` | 세지 않음 | 접두 + T 열 | MF-12 · 14 |
| P-13 | P-12 뒤 → 메인 종류 `♥`, 이어서 `★` | `{}` | 각각 `{ SET_TEXT: 3 }` (`b2` 줄 0) | `{}` | 세지 않음 | 접두 + T 열 | MF-12 · 14 |
| P-14 | `b2`: 켜짐 + `♥` override, 메인 꺼짐 → ① `hasIcon` ↻ ② `icon` ↻ ③ 메인 켜기 | 모두 `{}` | ① `{ REMOVE: 1 }` ② `{}`(렌더는 됨) ③ `{ INSERT: 4 }` | 모두 `{}` | 세지 않음 | + T 열 | MF-13 · 14 |
| P-15 | 레이어 `b1` 행 [↓] | `{ SET_ATTR: 1 }` | `{ MOVE: 1 }` | `{ MOVE: 1 }` | 세지 않음 | + T 열 | MF-25 · 결정 2 B |
| P-16 | **도구 막대의** [+ 인스턴스] | `{ SET_ATTR: 1 }` | `{ INSERT: 1 }` | `{ INSERT: 1 }` | 세지 않음 | + T 열 (버튼 자리만 이동, 동작 그대로) | FD-11 · MF-22 · D-03 |
| P-17 | `b2` 선택 → [삭제] (키 Delete도 같음) | `{ SET_ATTR: 1 }` | `{ REMOVE: 1 }` | `{ REMOVE: 1 }` | `[0,3]` `REPLACE` ≥ 1 (`<h2>` → 빈 `<p>`) | 접두 + T 열 | MF-23 · D-04 · D-05 |
| P-18 | P-17 뒤 → Undo (Ctrl+Z) | **`{ SET_ATTR: 2 }`** ([↶] 꺼짐 + [↷] 켜짐) | `{ INSERT: 1 }` | `{ INSERT: 1 }` | 세지 않음 | + T 열 | MF-30 · D-03 |
| P-19 | 메인 칩 `#cf202f`(1단계) → Undo → Redo | Undo `{ SET_ATTR: 2 }`, Redo `{ SET_ATTR: 2 }` | **Undo `{ SET_STYLE: 3 }`**(메인 · b1 · b2 배경만), **Redo `{ SET_STYLE: 3 }`** | `{}` | 세지 않음 | **캔버스 `SET_ATTR: 3` → `SET_STYLE: 3`** + T 열 | MF-30 · FD-23 |
| P-20 | 맨 위 [↑] · 맨 아래 [↓] · 같은 값 다시 쓰기 · **지금 색 칩 다시 누르기** · **같은 색을 색 입력칸에 다시 `input`** · **꺼진 [↶] [↷] 누르기** · 기록 없을 때 Ctrl+Z | 렌더 0번 (`App` 실행 횟수 그대로, `lastPatches` 그대로) | 〃 | 〃 | 〃 | 같은 규칙에 새 입력 부품 추가 | ④-13 · FD-12 · 공통 주의 7 |
| P-21 | `b1` 라벨 override(`확인`) 상태 → ↻ | `{}` | `{ SET_TEXT: 1 }` | `{ SET_TEXT: 1 }` | 세지 않음 | + T 열 | MF-13 |
| P-22 | `b1` 선택 → 크기 `S` | `{ SET_ATTR: 1 }` | `{ SET_ATTR: 1 }` (b1 class만) | `{}` | 세지 않음 | + T 열 | MF-12 · 14 · D-02 |
| P-23 | (신규) P-17 뒤 → **[↶ 되돌리기] 버튼** 클릭 | `{ SET_ATTR: 2 }` | `{ INSERT: 1 }` | `{ INSERT: 1 }` | 세지 않음 | P-18과 같은 결과. 렌더 1번, 문서 · 선택 · 기록이 키와 같음 | FD-12 · MF-30 |
| P-24 | (신규) P-19 뒤(Undo 상태) → **[↷ 다시 하기] 버튼** 클릭 | `{ SET_ATTR: 2 }` | `{ SET_STYLE: 3 }` | `{}` | 세지 않음 | P-19 Redo와 같은 결과. 렌더 1번 | FD-12 · MF-30 |
| P-25 | (신규) 메인 선택(색 `#0052ff`) → 칩 `#cf202f` | `{ SET_ATTR: 1 }` | `{ SET_STYLE: 3 }` | `{}` | **`panelCounts` = `{ SET_ATTR: 2, SET_PROP: 1, SET_TEXT: 1 }`** (칩 두 개의 `aria-pressed` 2 · 색 입력칸 `value` 1 · `color-hex` 글자 1) | 새 행 (팔레트 판이 바뀐 곳만 고침) | FD-21 · D-01 · D-02 |
| P-26 | (신규) 메인 선택 → 색 입력칸 `input` 연속 `#112233` → `#223344` → `#334455` → `#ffee00` | 첫 `input` `{ SET_ATTR: 1 }`, 이후 `{}` | 각각 `{ SET_STYLE: 3 }`(모두 어두워 글자색 흰 그대로), 마지막 `#ffee00`만 `{ SET_STYLE: 6 }`(글자색 흰 → 먹) | `{}` | 세지 않음 | 새 행. 네 번 입력해도 `history.past` 1칸 (한 단계) | FD-22 · MF-31 · D-02 |
| P-27 | (신규) `b1`(메인 따름) 선택 → 칩 `#05b169` | `{ SET_ATTR: 1 }` | `{ SET_STYLE: 2 }` (b1 버튼만: 배경 + 글자색. 메인 · b2 · b3 줄 0) | `{}` | `[0,3]` `REPLACE` ≥ 1 (색 칸 「메인 따름」 `<span>` → ↻ `<button>`) | 새 행 | FD-25 · MF-12 · D-05 |
| P-28 | (신규) 수정 → Undo → **다른 칸 새 수정** (Redo 버림) | `{ SET_ATTR: 2 }` ([↷] 꺼짐 + [↶] 켜짐) | 그 수정의 줄 | — | 세지 않음 | 새 행 | FD-12 · MF-30 |

## 단위 테스트 (Vitest, `fixtures/mini-figma/__tests__/`)

| 파일 | 검사 내용 | 근거 ID |
| --- | --- | --- |
| `color.test.ts` (신규) | `PALETTE` 8개 · 순서 · 중복 없음 · 전부 `#rrggbb` / `isHexColor` 표(대문자 참, 3자리 · 이름 · 빈 값 · 틀린 글자 거짓) / `textColorFor` 표(칩 8개 결과 · `#000000` · `#ffffff` · **경계 `#777777` 흰 · `#787878` 먹** · 대문자 · 형식 밖 = 흰) / `buttonStyle` = `{ 'background-color', color }` 키 2개 · 입력 불변 | FD-21 · 23 · 24 |
| `model.test.ts` (갱신) | 시작 데이터 hex(`#0052ff` · `#cf202f`), 색 칸 값이 hex 문자열, 이름 값(`blue` 등)이 안 남음. override · ↻ · 같은 값 같은 Doc 규칙은 hex로도 그대로 (`setMainField(INITIAL_DOC, 'color', '#05b169')` → `['#05b169', '#05b169', '#cf202f']`) | FD-20 · 25 · MF-12 · 13 · 16 |
| `undo.test.ts` (갱신) | 기존 전부 그대로 통과 + `canUndo` · `canRedo`(빈 기록 둘 다 거짓 · 수정 뒤 `canUndo` · Undo 뒤 `canRedo` · 새 수정이 `future`를 버리면 `canRedo` 거짓 · 한도 49칸에서 참) | FD-12 · MF-30 |
| `keys.test.ts` (갱신, ④-3 채택 시) | `INPUT` `type='color'`: Delete · Backspace null, Ctrl/Meta+Z `undo`, Ctrl/Meta+Shift+Z `redo` / 글자 `INPUT` · `TEXTAREA`는 그대로 전부 null | Q18 ② |
| `rootOnlyHooks.test.ts` (갱신) | `App.ts`만 `useState` · `useEffect` 호출. **컴포넌트 파일 목록 = `Button` · `Canvas` · `ColorPalette` · `Icons` · `LayerPanel` · `PropertyPanel` · `Toolbar` (7개)** 모두 Hook · `document` · `window` · 엔진 import 없음. 순수 모듈 목록에 `color.ts` 추가. 검사기가 일부러 틀린 소스를 잡는 것은 그대로 | FD-10 · P2-07 · 08 · 09 · T-16 |
| `app.test.ts` (대폭 갱신) | 경로 접두 이동 · 최상위 자식 4개 · 위 「patch 기대 표」 P-1 ~ P-28 전부(`toolbarCounts` · `layerCounts` · `canvasCounts` · P-25의 `panelCounts`) · 시작 화면 색(배경 · 글자색 · 클래스에 색 이름 없음) · `Button`이 `style`로 칠함 · 팔레트 판(칩 8개 · `aria-pressed` · 색 입력칸 `type` · 값 글자) · 칩 · 색 입력칸 = 같은 `color` 묶음(`past` 1칸) · 같은 칩 · 같은 색 = 렌더 0 · 인스턴스 override · ↻ · [↶] [↷] 버튼 = 키와 같은 결과(문서 · 선택 · 기록 · 렌더 1번) · 꺼진 버튼 = 렌더 0 · `disabled` 속성 유무 · [+ 인스턴스]가 도구 막대에만 있음 · Hook 4칸(`slot(0..3)`) 순서 불변 · keydown 리스너 1개 · 색 입력칸(`prop-color`)에서 Delete · Backspace = 무시 · Ctrl+Z = 앱 Undo + `preventDefault`(④-3) | FD-10 ~ 12 · FD-20 ~ 25 · MF-04 · 10 · 14 · 31 · 32 · 34 |
| `design.test.ts` (신규) | `index.html` · `fixtures/mini-figma/**/*.ts` 소스에서 「coinbase」(대소문자 무관) 0건, `index.html`에 `@import` · `@font-face` · `http://` · `https://` 0건, 문서 색 값(`#0a0b0d` · `#16181c` · `#a8acb3` · `#0052ff`) 정의 유무. (실제 적용은 QA-40 · 41이 증명) | FD-05 · 07 |

## 회귀 · 환경

| QA | 확인 | Then |
| --- | --- | --- |
| QA-R1 | `git diff --stat c0699a1 -- packages/` (c0699a1 = main) | **비어 있음** (엔진 무수정) |
| QA-R2 | `npx vitest run` 전체 | 기존 테스트 + 새 · 고친 단위 테스트 모두 통과 |
| QA-R3 | `npx tsc --noEmit` | 오류 0건 (`fixtures` · `e2e` 포함) |
| QA-R4 | `npx playwright test` 전체 (desktop · mobile) | 기존 Phase 1 · 2 e2e 전부 + `mini-figma-*.spec.ts`(고친 것 · 새 것) 통과 |

## 필수 확인
- [x] Diff 기본 케이스 D-01 ~ 05: 앱 화면에서 본 대응은 patch 표가 맡는다 — D-01 글자(P-3 · 9 · 8) · D-02 속성 · 스타일(P-4 · 5 · 5b · 22 · 25 · 26, 도구 막대 `disabled` P-3) · D-03 추가(P-6 · 16) · D-04 삭제(P-7 · 17) · D-05 교체(P-1 · 17 · 27). 엔진 D-01 ~ 05 자체는 Phase 1 단위 테스트가 회귀로 덮음
- [x] History 동기화(Phase 1 두 영역): 이 앱에 해당 없음. 대신 「Undo 버튼과 키가 같은 기록을 쓴다」(QA-33)로 상태 일치를 본다
- [ ] desktop · mobile 캡처 (`04_qa_evidence/screenshot_NN_<desktop|mobile>.png`): ① 시작 화면(도구 막대 · 점무늬 캔버스) ② 메인 선택 + 팔레트 판 ③ b3 선택(override 표시 파랑 · ↻) ④ 밝은 칩(`#eef0f3`) 칠한 버튼 + 고른 표시 ⑤ [↶] 켜진 · 꺼진 도구 막대 ⑥ 20개 추가 뒤 mobile 줄바꿈. 어두운 바탕에서 글자 · 선택 표시가 읽히는지 육안 확인
