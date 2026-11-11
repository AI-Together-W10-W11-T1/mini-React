# dev_todo: figma-design

- 명세: `../01_request_spec.md` (FD-01 ~ 25) · 디자인 기준: `../00_design_reference.md` · 브랜치: `feature/figma-design`
- 규칙: 항목 하나 = 커밋 하나. 체크할 때 완료 근거 필수 (근거 없는 체크는 무효). 커밋 메시지 `<type>(mini-figma): <요약> (Dev-N)`, push 안 함
- 범위: `fixtures/mini-figma/` · `e2e/mini-figma-*.spec.ts` · `e2e/mini-figma-helpers.ts`뿐. **`packages/`는 한 줄도 바꾸지 않는다 (FD 전체 · task_004 MF-02)**. `types.ts` 변경 없음. 완료 때 `git diff --stat c0699a1 -- packages/`(main) 가 비어 있음을 근거에 붙인다
- 바꾸지 않는 것 (명세 3절): 동작 규칙(override = 키 · ↻ = 키 지우기 · Undo 묶음 · 한도 49번 · 단축키 Q18 · 선택 정리 · 순서 · 추가 · 삭제). 색 칸의 값 타입만 이름 → `#rrggbb`로 바뀐다
- 바깥 루프(ATDD): 인수 시나리오가 있는 Dev(2 ~ 8)는 `04_qa_evidence/qa_todo.md`의 해당 QA를 **먼저 e2e로 써서 desktop에서 실패하는 것을 확인**한 뒤 구현한다 (기존 QA의 단언을 고치는 Dev는 고친 단언이 먼저 실패하는지 본다). 안쪽 루프는 Vitest (`fixtures/mini-figma/__tests__/`)
- patch 종류 · 개수의 **기대값 표는 `qa_todo.md` 「patch 기대 표」 하나가 기준**이다 (task_004 P-1 ~ 22를 새 접두 · 새 값으로 옮기고 P-23 ~ 28을 더함). Dev 항목의 `app.test.ts` 단언은 그 표를 그대로 옮긴다
- 순서: Dev-1 (순수 함수) → Dev-2 (색 값 · 칠하기) → Dev-3 (팔레트 판) → Dev-4 (색 입력칸 키) → Dev-5 (도구 막대 · 접두 이동) → Dev-6 (Undo/Redo 버튼) → Dev-7 (디자인 CSS) → Dev-8 (공격 · 회귀)
- **커밋마다 vitest · tsc · 해당 e2e가 초록이어야 한다.** 그래서 색 이름 → 값 전환(Dev-2)에서 속성 패널 색 칸을 임시로 선택 상자 그대로 두고 값만 hex로 바꾼다 (Dev-3에서 팔레트 판으로 교체)

## 확정 · 가정 (사용자 확정 = 명세 5절. 아래 「④」 표시는 테스트 케이스 확인 때 정해지면 그대로 따른다)

| # | 항목 | 값 |
| --- | --- | --- |
| 명세 | 색 값 · 칩 | 색 칸은 `#rrggbb`(소문자). 시작 데이터 메인 `#0052ff`, b3 `#cf202f`. 칩 8개 = `#0052ff` · `#cf202f` · `#05b169` · `#f4b000` · `#0a0b0d` · `#5b616e` · `#a8acb3` · `#eef0f3` (이 순서) |
| 명세 | 칠하기 | 배경색은 `style`(`background-color`), 크기는 클래스 `btn-S/M/L`. `btn-blue/red/green` 클래스는 사라진다 |
| 명세 | 도구 막대 | `div.app`의 **첫 자식**. `Toolbar` = 앱 이름 「mini-figma」 · [+ 인스턴스] · [↶ 되돌리기] · [↷ 다시 하기]. props + 콜백 props만 |
| ④-1 | 글자 색 자동 (FD-24) | 추천 A: 흰색 `#ffffff`과 먹색 `#0a0b0d` 중 **WCAG 대비가 큰 쪽**. 경계: `#777777`은 흰 글자, `#787878`은 먹 글자. 칩 8개 결과 = 흰 글자 `#0052ff` `#cf202f` `#0a0b0d` `#5b616e` / 먹 글자 `#05b169` `#f4b000` `#a8acb3` `#eef0f3` |
| ④-2 | 글자 색을 담는 곳 | 추천 X: 배경색과 같이 `style`(`color`)에 둔다. 색을 바꿀 때 글자색이 같은 쪽이면 `SET_STYLE` 버튼당 1줄, 밝기 쪽이 바뀌면 버튼당 2줄 (배경 + 글자). (Y = 글자색을 클래스로: 바뀔 때 `SET_STYLE` 1 + `SET_ATTR` 1) |
| ④-3 | 색 입력칸의 키 | 추천: `<input type="color">`는 선택 상자 · 체크박스처럼 취급 — Ctrl/Meta+Z · +Shift+Z = 앱 Undo/Redo + `preventDefault`, Delete · Backspace는 무시 (Q18 ②를 이 칸까지 넓힘). 안 하면 색 입력칸에 포커스가 있을 때 Ctrl+Z가 아무 일도 안 한다 |
| ④-4 | override 칸 표시 색 | 추천: 주황 → 파랑 계열(왼쪽 파랑 줄 + 연한 파랑 배경). 클래스 `override`와 ↻ · 「메인 따름」은 그대로 (CSS만) |
| ④-5 | 칩 연타 | 기존 묶음 규칙 그대로: 같은 대상 + 같은 칸(`color`)이 연달아 바뀌면 한 단계. 칩 `A` → 칩 `B` → 색 입력칸 드래그까지 한 단계 (확인만) |
| ④-6 | 현재 색 값 글자 | 팔레트 판 안에 현재 색을 `#0052ff`처럼 고정폭 글자로 보인다 (FD-05 「색 값은 고정폭」의 근거). `data-testid="color-hex"` |
| 가정 | 구조 | 평평하게: `div.app` 자식 4개 = 도구 막대(0) · 레이어(1) · 캔버스(2) · 속성(3). 도구 막대는 CSS 그리드로 가로 전체(`grid-column: 1 / -1`). **경로 접두: 도구 막대 `[0,0]` · 레이어 `[0,1]`(전 `[0,0]`) · 캔버스 `[0,2]`(전 `[0,1]`) · 속성 `[0,3]`(전 `[0,2]`)** |
| 가정 | testid | 새 것: `toolbar` · `app-name` · `undo-button` · `redo-button` · `color-palette` · `color-chip`(`data-color`) · `color-hex`. **`add-instance`는 이름 그대로 도구 막대로 옮김**. **`prop-color`는 이름 그대로 두되 이제 `<input type="color">`**(다른 `prop-*`처럼 입력 부품 이름) |
| 가정 | 칩 표시 | 지금 색인 칩 = `aria-pressed="true"`, 아니면 `"false"`(문자열). 칩에 글자 없음, `aria-label="색 #0052ff"` |
| 가정 | 형식 밖 색 | UI에서는 안 나오는 값이라 방어용: `textColorFor`가 `#rrggbb`(대소문자 무관)가 아니면 흰 글자 |

## 공통 주의 (엔진과 부딪히는 곳 — 개발자 · 검수자 모두 확인. 코드로 확인한 것)

task_004 공통 주의 1 ~ 14는 그대로 지킨다 (key 목록 · `...it`의 id · 버블링 · `click` · `input`만 · `SET_EVENT` 제외 · Hook 개수 고정 · 버튼 안 자식 key 등). 이번에 더해지는 것:

1. **`style`은 항목별 비교다.** `style: { 'background-color': c, color: t }` → diff가 항목 하나당 `SET_STYLE`(`property` · `before` · `after`) 한 줄을 만든다 (`diff.ts` `diffStyle`). 속성 이름은 **kebab 그대로**(`background-color`) 적는다 — `styleMapToText`가 이름을 그대로 글로 쓰고 `parseStyleText`는 이름을 소문자로만 바꾼다. 값이 같은 항목은 줄이 없다. 항목이 사라지면 `after: null`. 빈 묶음이면 `style` 속성이 지워진다
2. **`disabled`는 보통 속성이다.** `disabled: true` → 속성 값 `""`(`readAttrs`), `false` · `undefined`는 속성 없음. 켜고 끄는 것은 `SET_ATTR`(`before: null ↔ after: ""`) 한 줄 (`DOM_PROP_ELEMENTS`는 `input` · `textarea` · `select`뿐이라 `button`은 프로퍼티가 아님). 꺼진 `<button>`은 눌러도 `click`이 안 온다 (jsdom `button.click()` · Chromium `click({ force: true })` 둘 다 확인함 → 이벤트 0). 그러니 App의 Undo/Redo 핸들러에는 「꺼진 상태 검사」를 따로 넣지 않는다(이미 `undo()`가 빈 기록이면 같은 state를 돌려줌)
3. **`aria-pressed`는 문자열로 넘긴다** (`'true'` · `'false'`). 불린 `false`를 넘기면 속성이 통째로 빠져서 「누르지 않음」이 안 그려진다 (`readAttrs`: `false` → 속성 없음)
4. **`<input type="color">`의 `value`는 DOM 프로퍼티다** (`input`이라 `SET_PROP`, 실제 값과 다를 때만 대입, `renderVNode`는 `type` 속성을 쓴 뒤 마지막에 `value`를 넣음). 브라우저는 값을 `#rrggbb` **소문자**로 정리하고 형식이 아니면 `#000000`으로 만든다 (jsdom · Chromium 모두 확인). Chromium은 드래그하는 동안 `input` 이벤트를 연달아 내고 닫을 때 `change`를 한 번 더 낸다 → `onInput`만 쓴다 (`change`는 엔진이 안 받음). Playwright `fill('#336699')`는 `input` + `change`를 보낸다 (확인함)
5. **`h(ColorPalette, …)`를 `PropertyPanel` 안에서 부른다** — 자식 컴포넌트 안의 자식 컴포넌트도 `resolveComponents`가 끝까지 푼다 (`Canvas` → `Button`과 같음). `ColorPalette`는 props(`value` · `onPick`)만 받는 순수 함수. 팔레트 판의 patch는 속성 패널 접두 `[0,3]` 아래로 나온다
6. **글자 색 이름 충돌**: `Button`의 props에 `color`(배경 hex)가 있고 `style` 안에도 `color`(글자색)가 있다. 헷갈리지 않게 `Button`은 `buttonStyle(color)`(color.ts) 결과만 `style`에 넣고, props 이름은 그대로 둔다
7. **Hook 개수 불변**: `App`은 `useState` 4개 + `useEffect` 1개 그대로 (`slot(0..3)` = doc · selectedId · history · nextId). `canUndo` · `canRedo`는 렌더 중 `history`에서 계산하는 값(새 Hook 아님). 키 핸들러와 버튼이 **같은 함수**(`onUndo` · `onRedo`)를 쓴다 — 한 동작 = setter 3개 = 렌더 1번 (결정 9 B)
8. **도구 막대는 글자 편집 중에도 바뀐다**: 첫 수정에서 [↶]이 켜진다. 이때 라벨 입력칸은 같은 노드로 남아 포커스 · 커서가 유지돼야 한다 (도구 막대 `disabled` 속성만 바뀜)
9. **`rootOnlyHooks.test.ts` 목록**: 컴포넌트 파일 목록을 새 파일을 만드는 같은 커밋에서 고친다 (Dev-3: `ColorPalette.ts` 추가 = 6개, Dev-5: `Toolbar.ts` 추가 = 7개 → `Button` · `Canvas` · `ColorPalette` · `Icons` · `LayerPanel` · `PropertyPanel` · `Toolbar`). `color.ts`는 순수 모듈 목록(`model` · `undo` · `keys` · `main` · **`color`**)에 Dev-1에서 더한다

## 폴더 구성 (바뀌는 곳만)

```
fixtures/mini-figma/
  index.html                <style> 전면 개편 (Dev-2 · 5 · 7)
  App.ts                    Toolbar 자식 + canUndo/canRedo + onUndo/onRedo (Dev-5 · 6)
  color.ts                  (신규, DOM 없음) PALETTE · isHexColor · textColorFor · buttonStyle (Dev-1)
  model.ts                  Color = '#rrggbb' 문자열, INITIAL_DOC 값 (Dev-2)
  undo.ts                   canUndo · canRedo 순수 함수 추가 (Dev-6)
  keys.ts                   색 입력칸 = 선택 상자류 (Dev-4, ④-3)
  components/               Button.ts(칠하기) · ColorPalette.ts(신규) · PropertyPanel.ts · LayerPanel.ts([+ 인스턴스] 제거) · Toolbar.ts(신규)
  __tests__/                color.test.ts(신규) · design.test.ts(신규) + 기존 5개 갱신
```

화면 뼈대: `App`이 돌려주는 최상위는 `<div class="app">` 하나, 자식 순서 **도구 막대(0) · 레이어(1) · 캔버스(2) · 속성(3)**. 도구 막대 안 자식 순서 = 앱 이름 · [+ 인스턴스] · [↶] · [↷].

## Dev 항목

- [x] **Dev-1** (`mini-figma`): 색 순수 함수 — 칩 8개 · 형식 검사 · 글자 색 자동 · 버튼 style [FD-21 · FD-23 · FD-24]
  - 의존: 없음 (새 파일만, 기존 동작 안 바뀜)
  - 대상 파일: `fixtures/mini-figma/color.ts` (신규) — `PALETTE: readonly string[]`(8개, 위 순서), `isHexColor(v: string): boolean`(`/^#[0-9a-f]{6}$/i`), `textColorFor(bg: string): '#ffffff' | '#0a0b0d'`(④-1 결정 따름), `buttonStyle(color: string): { 'background-color': string; color: string }`. DOM · Hook · 엔진 import 없음
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/color.test.ts`
    - `PALETTE`: 8개 · 순서 · 중복 없음 · 전부 `isHexColor`
    - `isHexColor` 표: `#0052ff` · `#0052FF` 참, `#fff`(3자리) · `blue` · `''` · `#12345` · `#12345g` · `0052ff`(# 없음) 거짓
    - `textColorFor` 표 (④-1 A 기준): 칩 8개(흰: `#0052ff` `#cf202f` `#0a0b0d` `#5b616e` / 먹: `#05b169` `#f4b000` `#a8acb3` `#eef0f3`), `#000000` 흰, `#ffffff` 먹, **경계 `#777777` 흰 · `#787878` 먹**, 대문자 `#EEF0F3` 먹, 형식 밖(`blue` · `''` · `#fff`) 흰, 반환값은 항상 두 값 중 하나. (④-1이 B · C로 정해지면 경계 행 · `#05b169` 행만 그 기준으로 바뀐다)
    - `buttonStyle('#0052ff')` = `{ 'background-color': '#0052ff', color: '#ffffff' }`, 키는 정확히 2개(이름이 `SET_STYLE`의 `property`가 됨), 입력을 고치지 않음
  - `rootOnlyHooks.test.ts`: `color.ts`를 순수 모듈 목록에 더함 (Hook · `document` · `window` · 엔진 import 없음)
  - 알고리즘: 명세 5절 「칩 8개 · 글자 색 자동」 (④-1)
  - 완료 근거로 남길 것: 테스트 파일 · 건수, `npx vitest run fixtures/mini-figma` 통과 수, `npx tsc --noEmit`, 커밋 해시
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/color.ts` 신규 (`PALETTE` · `isHexColor` · `textColorFor`(WCAG 대비, 경계 `#777777` 흰 / `#787878` 먹) · `buttonStyle`), `fixtures/mini-figma/__tests__/color.test.ts` 30건. 처음 실패: `npx vitest run fixtures/mini-figma/__tests__/color.test.ts` → `Test Files 1 failed (1) / Tests no tests` (`../color` 없음). 구현 뒤 `npx vitest run fixtures/mini-figma` 294 passed, `npx tsc --noEmit` 오류 0, `rootOnlyHooks.test.ts`에 `color.ts` 순수 모듈 목록 추가. 커밋 3100d70

- [x] **Dev-2** (`mini-figma`): 색을 값으로 저장하고 버튼을 `style`로 칠한다 [FD-20 · FD-23 · FD-24 · FD-25 · MF-16]
  - 의존: Dev-1
  - 바깥 루프(먼저 실패): 고친 단언 — QA-1(색 단언), QA-7 · 10 · 13 · 19 ~ 24 · 29 · A5 · A8 · A10 · A11 · A13의 색 확인을 `btn-blue` 클래스 → 배경 `rgb(…)`/글자 `rgb(…)`로 (helpers `rgb()` · `bgOf()` · `textOf()` 추가). 색 고르기는 아직 `selectOption({ label: '빨강' })` 그대로 (선택 상자 라벨은 같음)
  - 대상 파일: `model.ts`(`Color` = `string`(`#rrggbb`), `INITIAL_DOC`: 메인 `#0052ff`, b3 `#cf202f`), `components/Button.ts`(클래스 `figma-button btn-{size}[ selected]` + `style: buttonStyle(color)`), `components/PropertyPanel.ts`(**임시**: `COLOR_OPTIONS` 값만 hex로 — 라벨 파랑 · 빨강 · 초록은 그대로, Dev-3에서 지워짐), `index.html`(`.btn-blue/red/green` · `--blue/--red/--green` 삭제, `.figma-button`은 크기 · 모양만)
  - 테스트(먼저 실패 확인):
    - `model.test.ts` 갱신: 시작 데이터 값 hex(`blue` → `#0052ff`, `red` → `#cf202f`), 색 관련 단언의 `'blue'`/`'red'`/`'green'`을 hex로 (`setMainField(…, 'color', '#05b169')`, 결과 `['#05b169', '#05b169', '#cf202f']`). 규칙은 그대로(override · ↻ · 같은 값 같은 Doc)
    - `app.test.ts`: 「Button에 메인 값(크기 M · 파랑)」 → `style`의 배경 `rgb(0, 82, 255)` · 글자 `rgb(255, 255, 255)`, b3만 `rgb(207, 32, 47)`, **클래스에 색 이름이 없다**(`btn-blue` 같은 것 0). P-5 · P-5b · P-19를 qa_todo 표의 새 값(`SET_ATTR` → `SET_STYLE`, 글자색 줄 포함)으로. `SET_STYLE` 한 줄의 `property` = `'background-color'` · `before` · `after` = hex를 직접 단언
  - 알고리즘: 「override 판단」(그대로) · 명세 FD-23
  - 완료 근거로 남길 것: 고친 단언이 먼저 실패한 출력, `npx vitest run fixtures/mini-figma` · `npx playwright test e2e/mini-figma-*.spec.ts` 통과 수, 커밋 해시
  - **완료 근거 (Evidence)**: `model.ts`(`Color = string`, `INITIAL_DOC` `#0052ff` · `#cf202f`), `components/Button.ts`(`style: buttonStyle(color)`, 클래스 `figma-button btn-{size}[ selected]`), `components/PropertyPanel.ts`(임시 선택 상자 값만 hex), `index.html`(`btn-blue/red/green` · `--blue/red/green` 삭제). e2e 고친 단언(QA-1 · 7 · 10 · 13 · 19 · 20 · 23 · 24 · 29 · A5 · A8 · A10 · A11 · A13, 도우미 `rgb` · `bgOf` · `textOf` · `colorsOf`)이 **먼저 실패**: `npx playwright test e2e/mini-figma-*.spec.ts --project=desktop` → `14 failed · 36 passed` (예: `Expected "rgb(207, 32, 47)" Received "rgb(197, 48, 48)"`). 단위도 먼저 `app.test.ts` 등 16건 실패 → 구현 뒤 `npx vitest run fixtures/mini-figma` 298 passed (model.test 63, app.test 새 단언: 시작 배경 `rgb(0, 82, 255)` ×3 + `rgb(207, 32, 47)`, 글자 `rgb(255, 255, 255)`, 클래스에 색 이름 없음, P-5 `{ SET_STYLE: 6 }`, P-5b `{ SET_STYLE: 3 }` + 한 줄 필드 `background-color` · `#0052ff` → `#cf202f`), `npx playwright test e2e/mini-figma-*.spec.ts` 100 passed (desktop · mobile), tsc 0. 커밋 2a4dcff

- [x] **Dev-3** (`mini-figma`): 팔레트 판 — 칩 8개 + 직접 고르기 [FD-21 · FD-22 · FD-25]
  - 의존: Dev-2
  - 바깥 루프(먼저 실패): QA-35 · 36 · 37 · 38 · 39 + QA-A22 · A24 · A25를 `e2e/mini-figma-palette.spec.ts`(신규)에 쓴다. 기존 스펙의 색 고르기(`selectOption`)는 `pickColor(page, hex)`(칩 누르기) 도우미로 바꾼다(QA-7 · 10 · 13 · 19 · 20 · 23 · 24 · 29 · A5 · A8 · A10 · A11 · A13)
  - 대상 파일: `components/ColorPalette.ts`(신규) — props `{ value, onPick }`. 구조 `div.palette[data-testid=color-palette]` > 칩 8개(`button[type=button].chip[data-testid=color-chip][data-color][aria-pressed][aria-label][style=배경색] onClick → onPick(hex)`) + `input[type=color][data-testid=prop-color][aria-label=색 직접 고르기][value=value] onInput → onPick(event.target.value)` + `span[data-testid=color-hex]`(값 글자, ④-6). `components/PropertyPanel.ts`: 색 칸의 `<select>`를 `h(ColorPalette, …)`로 교체(`propRow('color', '색', …)`), `COLOR_OPTIONS` 삭제. 팔레트 값 → `onEdit('color', hex)`(묶음 `{ target, field: 'color' }`는 기존 그대로)
  - 테스트(먼저 실패 확인):
    - `app.test.ts`: 메인 선택 → 칩 8개(`data-color`가 `PALETTE`와 같은 순서), 지금 색 칩만 `aria-pressed="true"`, `prop-color`의 `type` = `color` · 값 `#0052ff`, `color-hex` 글자 `#0052ff`. 칩 누르기 = `onEdit` → 메인 값 · 버튼 배경 · 칩 표시가 바뀜. **P-25 · P-26 · P-27**(팔레트 patch · 색 입력칸 연속 `input` · 인스턴스에서 칩)을 표 그대로. 같은 칩 다시 누르기 · 같은 색 입력 = 렌더 0 (P-20). 칩 연달아 + 입력칸 = `past` 1칸 · 묶음 `{ target, field: 'color' }`
    - 인스턴스 b1을 고르면 색 칸이 「메인 따름」, 칩을 누르면 override(`prop-row`에 `override` 클래스 + ↻), 메인과 같은 색 칩을 눌러도 override(MF-12), ↻ = 키 지우기(`undefined` 없음) 후 메인 색을 다시 따라감
    - 입력칸 노드는 다시 만들지 않는다(같은 참조, 포커스 유지). `input` 이벤트에 대문자 · 형식 밖 값이 와도 상태에는 브라우저가 정리한 값만 들어감 (jsdom: `#EEF0F3` → `#eef0f3`)
    - `rootOnlyHooks.test.ts`: 컴포넌트 파일 목록 6개 (`ColorPalette.ts` 추가), `ColorPalette.ts`도 Hook · DOM 접근 없음
  - 알고리즘: 명세 5절 「색 고르기 (다) 칩 8개 + 직접 고르기」
  - 완료 근거로 남길 것: 위 단언 건수, QA-35 ~ 39 · A22 · A24 · A25 desktop 먼저 실패 → 통과 출력, 커밋 해시
  - **완료 근거 (Evidence)**: `components/ColorPalette.ts` 신규(칩 8개 + `input[type=color][data-testid=prop-color]` + `color-hex`), `PropertyPanel.ts` 색 칸 → `h(ColorPalette, …)`(`COLOR_OPTIONS` 삭제), `index.html` 팔레트 임시 스타일. `e2e/mini-figma-palette.spec.ts` 신규(QA-35 · 36 · 37 · 38 · 39 + A22 · A23 · A24 · A25), 기존 스펙 색 고르기 `selectOption` → `pickColor`(칩). **먼저 실패**: `npx playwright test e2e/mini-figma-palette.spec.ts --project=desktop` → `9 failed` (`expect(locator).toHaveCount(expected) failed`), 기존 스펙 포함 desktop `19 failed · 31 passed`. 단위 `npx vitest run fixtures/mini-figma` → `27 failed`. 구현 뒤: 단위 312 passed (`app.test.ts` 팔레트 12건: 칩 순서 · `aria-pressed` · `type=color` · P-25 `panelCounts { SET_ATTR: 2, SET_PROP: 1, SET_TEXT: 1 }` · P-26 `{ SET_STYLE: 3 }` ×3 + `{ SET_STYLE: 6 }`, `past` 1칸 · P-27 `{ SET_STYLE: 2 }` + 패널 REPLACE ≥ 1 · 같은 칩 · 같은 색 렌더 0 · 대문자 `#EEF0F3` → `#eef0f3` · override · MF-12 · ↻), `rootOnlyHooks` 컴포넌트 6개, e2e `npx playwright test e2e/mini-figma-*.spec.ts` 118 passed, tsc 0. 칩 연달아 + 입력칸 = `past` 1칸. 커밋 faa0b20

- [x] **Dev-4** (`mini-figma`): 색 입력칸에서도 Undo/Redo 키가 앱 동작이다 [Q18 ② 확장, ④-3 결정에 따름]
  - 의존: Dev-3 · **④-3을 「안 넓힘」으로 정하면 이 Dev는 건너뛰고 QA-A28도 뺀다**
  - 바깥 루프(먼저 실패): QA-A28 (색 입력칸에 포커스가 있는 채 Ctrl+Z · Ctrl+Shift+Z = 앱 Undo/Redo, Delete · Backspace는 아무 일 없음)
  - 대상 파일: `keys.ts` — `isTextField`에서 `type="color"` 제외, `isChoiceControl`에 `type="color"` 추가 (선택 상자 · 체크박스와 같은 처리)
  - 테스트(먼저 실패 확인): `keys.test.ts`에 행 추가 — `INPUT color`(targetType `'color'`): Delete · Backspace = null, Ctrl+Z = `undo`, Ctrl+Shift+Z = `redo`; 글자 `INPUT text` · `INPUT number` · `TEXTAREA`는 그대로 null. `app.test.ts`: 색 입력칸(`prop-color`)에 보낸 Ctrl+Z → `defaultPrevented` true + 앱 Undo, Delete · Backspace → false · 렌더 0 (기존 「선택 상자 안」 테스트의 대상 목록에 포함). `rootOnlyHooks`는 변화 없음
  - 알고리즘: 해당 없음 (Q18 ②의 대상을 새 입력 부품으로 넓힘)
  - 완료 근거로 남길 것: `keys.test.ts` 건수, QA-A28 먼저 실패 → 통과, 커밋 해시
  - **완료 근거 (Evidence)**: `keys.ts` — `isNonTextInput`(checkbox · color) 추가, `isTextField`에서 `type=color` 제외, `isChoiceControl`에 포함. QA-A28(`palette.spec.ts`) **먼저 실패**: `npx playwright test e2e/mini-figma-palette.spec.ts --project=desktop -g A28` → `1 failed` (`Expected "rgb(0, 82, 255)" Received "rgb(5, 177, 105)"`, Ctrl+Z가 앱 Undo 아님). `keys.test.ts`(INPUT color 행 추가: Delete · Backspace null, Ctrl/Meta+Z `undo`, Ctrl/Meta+Shift+Z `redo`; 글자 input · number · TEXTAREA · range null) + `app.test.ts` 색 입력칸 키 1건 먼저 3 failed → 통과. `npx vitest run fixtures/mini-figma` 323 passed (`keys.test.ts` 100), e2e 120 passed, tsc 0. 커밋 9977d2c

- [x] **Dev-5** (`mini-figma`): `Toolbar`(앱 이름 + [+ 인스턴스])를 첫 자식으로 — 경로 접두 이동 [FD-10 · FD-11 · FD-06]
  - 의존: Dev-4
  - 바깥 루프(먼저 실패): QA-31(도구 막대 구성 — 이 Dev에서는 앱 이름 · [+ 인스턴스]만, [↶] [↷]는 Dev-6) · QA-34 · QA-1(최상위 자식 `['toolbar','layer-panel','canvas','property-panel']`) · QA-2(세 영역 배치 + 도구 막대가 위)
  - 대상 파일: `components/Toolbar.ts`(신규, `<header class="toolbar" data-testid="toolbar">` > 앱 이름 `span.app-name[data-testid=app-name]` 「mini-figma」 + `button.btn-primary[data-testid=add-instance]` 「+ 인스턴스」), `components/LayerPanel.ts`(`onAdd` prop · [+ 인스턴스] 버튼 삭제), `App.ts`(`h(Toolbar, { onAdd })`를 첫 자식으로, LayerPanel에서 `onAdd` 제거), `index.html`(**최소 CSS만**: `.toolbar { grid-column: 1 / -1 }` — 전면 개편은 Dev-7)
  - 테스트(먼저 실패 확인):
    - `app.test.ts`: `CANVAS_PREFIX = [0,2]` · `LAYER_PREFIX = [0,1]` · 속성 `[0,3]` · `TOOLBAR_PREFIX = [0,0]` + `toolbarCounts`, 「patch 세는 도우미」 샘플 경로 갱신, 최상위 자식 순서 4개, `area().children[1]` → `[2]`(캔버스 쿼리), `B2_PATH = [0,2,1,1]`, 속성 패널 REPLACE 접두 `[0,2]` → `[0,3]`(P-1 · P-17 · 키 P-17). **P-1 ~ 22를 qa_todo 표의 새 접두 값으로**. 도구 막대 열(T)은 Dev-6에서 켜진다(이 Dev에서는 `toolbarCounts`가 `{}`인지만, [↶] [↷]가 없으므로)
    - `Toolbar`: 앱 이름 글자 「mini-figma」, [+ 인스턴스] 한 번 = P-16(도구 막대에서도 동작이 MF-22 그대로: 끝에 b4, 선택 그대로, 렌더 1번, 새 단계 · 번호 `nextId` 그대로), 레이어 창 안에는 `add-instance`가 없다
    - `rootOnlyHooks.test.ts`: 컴포넌트 파일 목록 7개 (`Toolbar.ts` 추가), `Toolbar.ts`도 Hook · DOM 접근 없음
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: 접두 갱신 뒤 P-1 ~ 22 통과 수, QA-1 · 2 · 31 · 34 먼저 실패 → 통과, 기존 e2e 전체 회귀, 커밋 해시
  - **완료 근거 (Evidence)**: `components/Toolbar.ts` 신규(`header.toolbar` > `span.app-name` 「mini-figma」 + `button.btn-primary[add-instance]`), `LayerPanel.ts`(`onAdd` · 버튼 삭제), `App.ts`(`h(Toolbar, …)` 첫 자식), `index.html`(`.toolbar { grid-column: 1 / -1 }`). `e2e/mini-figma-toolbar.spec.ts` 신규(QA-31 · 34), QA-1 · QA-2 단언 갱신. **먼저 실패**: `npx playwright test e2e/mini-figma-render.spec.ts e2e/mini-figma-toolbar.spec.ts --project=desktop` → `4 failed`. 단위 `32 failed` → `app.test.ts` 접두 갱신(`TOOLBAR [0,0]` · `LAYER [0,1]` · `CANVAS [0,2]` · `PANEL [0,3]`, `B2_PATH [0,2,1,1]`, 최상위 4개, `toolbarCounts`), `rootOnlyHooks` 컴포넌트 7개. `npx vitest run fixtures/mini-figma` 328 passed (P-1 ~ 22 접두 이동 통과, P-16 도구 막대 `[+ 인스턴스]` 렌더 1번), e2e `npx playwright test e2e/mini-figma-*.spec.ts` 124 passed, tsc 0. 커밋 8584258

- [x] **Dev-6** (`mini-figma`): [↶ 되돌리기] · [↷ 다시 하기] 버튼 — 키와 같은 동작 · 없으면 꺼짐 [FD-12 · MF-30 ~ 32]
  - 의존: Dev-5
  - 바깥 루프(먼저 실패): QA-31(나머지) · QA-32 · QA-33 + QA-A20 · A21
  - 대상 파일: `undo.ts`(`canUndo(state)` = `past.length > 0`, `canRedo(state)` = `future.length > 0`), `components/Toolbar.ts`(props `canUndo` · `canRedo` · `onUndo` · `onRedo`, 버튼 둘 `button[type=button][data-testid=undo-button|redo-button][disabled=!can…][aria-label]` 글자 「↶ 되돌리기」 · 「↷ 다시 하기」), `App.ts`(`onUndo = () => moveThroughHistory(undo(history, doc))` · `onRedo` 같은 모양. 키 핸들러(`useEffect`)도 같은 함수를 부른다)
  - 테스트(먼저 실패 확인):
    - `undo.test.ts`: `canUndo` · `canRedo` — 빈 기록 둘 다 거짓, 수정 뒤 `canUndo`, Undo 뒤 `canRedo`, 새 수정이 `future`를 버리면 `canRedo` 거짓, 한도(49칸)에서도 참
    - `app.test.ts`: 처음 [↶] [↷] 모두 `disabled`. **P-3 · 4 · 5 · 5b · 6 · 9 · 10 · 15 · 16 · 17 · 22**의 도구 막대 열(첫 수정 = `{ SET_ATTR: 1 }`), **P-18 · 19 · 23 · 24**(Undo/Redo 뒤 `{ SET_ATTR: 2 }`), **P-28**(Undo 뒤 새 수정 = [↷] 꺼짐 `{ SET_ATTR: 2 }`). [↶] 클릭 = 키 Ctrl+Z와 같은 결과(문서 · 선택 · 기록 · 렌더 1번). 꺼진 [↶] · [↷] 클릭 = 렌더 0 · `lastPatches` 그대로. 한도 테스트(60번 추가 · Undo 49번)를 버튼으로도 한 번 돌려 같은 결과
    - 라벨 입력 중 첫 글자로 [↶]이 켜져도 입력칸은 같은 노드 · 포커스 유지 (공통 주의 8)
    - `Toolbar`는 Hook 없음 (rootOnlyHooks 그대로 통과)
  - 알고리즘: 해당 없음 (동작은 MF-30 ~ 32 그대로)
  - 완료 근거로 남길 것: 도구 막대 열 단언 통과 수, QA-31 ~ 33 · A20 · A21 먼저 실패 → 통과, 커밋 해시
  - **완료 근거 (Evidence)**: `undo.ts`(`canUndo` · `canRedo`), `components/Toolbar.ts`(props `canUndo` · `canRedo` · `onUndo` · `onRedo`, 버튼 `[disabled=!can…]`), `App.ts`(`onUndo` · `onRedo`를 버튼 · 키 핸들러가 같이 씀, 렌더 중 계산, Hook 4 + effect 1 그대로 `instance.hooks` 5칸). `toolbar.spec.ts`에 QA-31(나머지) · 32 · 33 · A20(2건) · A21, `render.spec.ts` QA-1 [↶] [↷] disabled, `palette.spec.ts` A22 · A24 보강. **먼저 실패**: `npx playwright test e2e/mini-figma-render.spec.ts e2e/mini-figma-toolbar.spec.ts e2e/mini-figma-palette.spec.ts --project=desktop` → `10 failed · 9 passed`. 단위 `32 failed`(app 28 + undo 8 중) → 통과. `npx vitest run fixtures/mini-figma` 346 passed (`undo.test.ts` canUndo · canRedo 8건, `app.test.ts` Undo/Redo 버튼 9건 + P-3 ~ P-22 도구 막대 열: 첫 수정 `{ SET_ATTR: 1 }` · 같은 칸 묶음 `{}` · Undo/Redo(P-18 · 19 · 23 · 24 · 28) `{ SET_ATTR: 2 }`), e2e 134 passed, tsc 0. 커밋 6a05321

- [x] **Dev-7** (`mini-figma`): 디자인 개편 CSS — 어두운 카드 · 점무늬 · 알약 · 글꼴 [FD-01 ~ 07]
  - 의존: Dev-6
  - 바깥 루프(먼저 실패): QA-40 · 41 · 42 · QA-2(배치 세부) · QA-A26 (computed style 단언 — 값은 qa_todo 참조)
  - 대상 파일: `index.html` `<style>`만 (TS 코드는 클래스 이름이 부족할 때만 최소로 — 새 클래스가 필요하면 Dev에 기록): 색 변수(`--bg #0a0b0d` · `--card #16181c` · `--ink-soft #a8acb3` · `--accent #0052ff`), 카드 24px · 입력칸 12px · 알약 100px · 칩 원, 점무늬 캔버스(`radial-gradient`), 선택 표시 파랑(캔버스 버튼 `outline` 3px + `outline-offset` 2px · 레이어 행 `outline` 2px), override 칸 표시(④-4), 입력칸 포커스 = `border` 2px 파랑, 보조 글자(`property-empty` · `prop-follow`) `#a8acb3`, 그림자 없음, 폰트(`Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` · 숫자 · 색 값 `ui-monospace, "JetBrains Mono", "Geist Mono", monospace`), 도구 막대 높이 64px · mobile(≤720px) 쌓기 · 도구 막대 줄바꿈(375에서 버튼 3개가 안 넘침). **외부 글꼴 · 이미지 · `@import` · `https://` 0** (FD-05)
  - 테스트(먼저 실패 확인): `__tests__/design.test.ts`(신규) — `../index.html?raw` · `../**/*.ts?raw`에서 (1) `coinbase`(대소문자 무관) 0건 (FD-07), (2) `@import` · `@font-face` · `http://` · `https://`가 `index.html`에 0건 (FD-05, 외부 글꼴 안 받음), (3) 색 변수에 문서 값(`#0a0b0d` · `#16181c` · `#a8acb3` · `#0052ff`)이 정의돼 있다(글자 있는지만). 값이 실제 화면에 적용되는지는 e2e computed style이 증명한다
  - 알고리즘: 해당 없음 (디자인 기준 = `../00_design_reference.md`)
  - 완료 근거로 남길 것: QA-40 ~ 42 · A26 먼저 실패 → 통과, desktop · mobile 화면 확인(캡처는 QA 단계), `design.test.ts` 건수, 커밋 해시
  - **완료 근거 (Evidence)**: `index.html` `<style>` 전면 개편(변수 `--bg #0a0b0d` · `--card #16181c` · `--ink-soft #a8acb3` · `--accent #0052ff`, 카드 24px · 입력칸 12px · 알약 100px · 칩 원 · 점무늬 `radial-gradient` · 파랑 선택 outline · override 파랑 줄 · 포커스 2px 파랑 · 도구 막대 64px · mobile 줄바꿈, 외부 글꼴 · `@import` · `https://` 0). TS는 안 바꿈(새 클래스 필요 없었음). `e2e/mini-figma-design.spec.ts` 신규(QA-40 · 41 · 42 · A26 · A29) + `design.test.ts` 신규 12건. **먼저 실패**: `npx playwright test e2e/mini-figma-design.spec.ts` → `8 failed · 2 passed`(QA-42는 Dev-5 배치로 이미 통과; 예: `Expected "rgb(168, 172, 179)" Received "rgb(59, 66, 82)"`, 입력칸 포커스 `Expected "rgb(0, 82, 255)" Received "rgb(118, 118, 118)"`, 버튼 높이 `>= 40 Received 37`), `design.test.ts` `6 failed`. 구현 뒤 `design.test.ts` 12 passed, `npx vitest run fixtures/mini-figma` 358 passed, e2e 144 passed, tsc 0. **발견한 버그 하나**: 인스턴스를 골랐을 때 공백 없는 긴 이름이 속성 패널 머리 `<h2>`에서 가로로 넘쳐 mobile에서 가로 스크롤(scrollWidth 2569) → `.property-title { overflow-wrap: anywhere }`로 고침, QA-A2에 「인스턴스를 고른 상태에서도 가로 스크롤 없음」 단언 추가(Dev-8 커밋). desktop · mobile 화면 육안 확인(임시 캡처, 정식 캡처는 QA 단계). 커밋 ea24a2e

- [x] **Dev-8** (`mini-figma`): 공격 · 경계 마무리 + 회귀 [FD 전체 · QA-A23 · A27 · A29]
  - 의존: Dev-7
  - 바깥 루프: QA-A23 · A27 · A29를 쓰고 나머지 공격(A20 ~ A28)이 모두 desktop · mobile에서 도는지 확인. 필요한 도우미만 `mini-figma-helpers.ts`에 더한다
  - 대상 파일: `e2e/mini-figma-*.spec.ts` · `e2e/mini-figma-helpers.ts` (앱 코드는 시나리오가 버그를 찾을 때만 고치고 Dev에 기록). `README.md` 「알려진 한계」의 「터치 기기 Undo 없음」 삭제는 이 task 끝난 뒤 mr-wiki가 한다 (Dev 범위 밖)
  - 회귀 · 환경: `npx vitest run` 전체 · `npx tsc --noEmit` · `npx playwright test` 전체(Phase 1 · 2 포함) · `git diff --stat c0699a1 -- packages/` 비어 있음
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: 위 네 명령의 출력(통과 수), 커밋 해시
  - **완료 근거 (Evidence)**: `e2e/mini-figma-attack.spec.ts` — QA-A27(새로고침) 추가, QA-A2 보강(인스턴스 선택 시 긴 이름 가로 스크롤). QA-A20 ~ A26 · A28 · A29는 Dev-3 · 4 · 6 · 7에서 이미 써서 desktop · mobile 모두 통과(아래 전체 실행에 포함). A27은 앱 동작이 이미 있어 처음부터 통과(`npx playwright test e2e/mini-figma-attack.spec.ts -g A27` 2 passed). 도우미 추가는 앱 코드 변경 없이 `mini-figma-helpers.ts`(`rgb` · `bgOf` · `textOf` · `colorsOf` · `classOf` · `pickColor` · `pickColorInput`). **회귀 실행**: `npx vitest run` → `Test Files 43 passed (43) · Tests 1159 passed (1159)` (시작 전 1064), `npx tsc --noEmit` exit 0 · 출력 없음, `npx playwright test` 전체 → `318 passed (36.2s)` (desktop · mobile, Phase 1 · 2 · mini-figma 포함), `git diff --stat c0699a1 -- packages/` (= `git diff --stat main -- packages/`, main = c0699a1) 출력 없음 = 비어 있음. 커밋 1361282

- [x] **Dev-9** (`mini-figma`): FD-08 전체 높이 + 검수 NB 1 · 3 반영 [FD-08 · FD-03]
  - 의존: Dev-8 (검수 APPROVE 뒤 사용자 「둘 다 해」)
  - 바깥 루프(먼저 실패): QA-43 · 44 · 45 (`e2e/mini-figma-design.spec.ts`)
  - 대상 파일: `index.html` `<style>`만 (TS · `packages/` · 설정 변경 없음, 새 클래스 필요 없었음), `e2e/mini-figma-design.spec.ts`, `__tests__/app.test.ts`
  - 알고리즘: 해당 없음 (CSS만, 동작 규칙 · 앱 로직 변경 없음)
  - **완료 근거 (Evidence)**:
    - **NB 1**: `fixtures/mini-figma/__tests__/app.test.ts` P-25 · P-27에 `toolbarCounts` `{ SET_ATTR: 1 }`, P-26에 첫 input `{ SET_ATTR: 1 }` · 이후 `{}` + 모든 input의 `layerCounts` `{}` 추가. 이미 앱이 그렇게 동작해 처음부터 통과(`npx vitest run fixtures/mini-figma/__tests__/app.test.ts` 104 passed). 커밋 637c48b
    - **FD-08 · NB 3 e2e 먼저 실패**: QA-43 · 44 · 45를 먼저 쓰고 CSS 없이 `npx playwright test e2e/mini-figma-design.spec.ts -g "QA-4[34]"` → desktop 2 failed · mobile 2 passed. 실패 출력: QA-43 `Expected: >= 780 Received: 355.9375` (레이어 패널 아래 끝 · 화면 높이 800), QA-44 `60개 추가 뒤에도 페이지 세로 스크롤 없음 Expected: <= 800 Received: 3012`. QA-45는 `index.html`을 되돌려 실행 → `prop-hasicon 포커스 색 Expected: "rgb(0, 82, 255)" Received: "rgb(16, 16, 16)"`. 커밋 b3686a7
    - **구현**(커밋 68cfc3f, `index.html`): `@media (min-width: 721px)`에서 `html, body { height: 100% }` · `body { overflow: hidden }` · `[data-testid='app-root'] { height: 100% }` · `.app { height: 100%; grid-template-rows: auto minmax(0, 1fr); align-items: stretch }` · 레이어 · 캔버스 · 속성 `overflow-y: auto`(+ `overscroll-behavior: contain`) · `.canvas { min-height: 0 }`. mobile(≤720)은 이 블록이 안 걸려 지금처럼 쌓임(캔버스 최소 320px). NB 3: `.color-input:focus-visible, .prop-row input[type='checkbox']:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`
    - **통과**: `npx playwright test e2e/mini-figma-design.spec.ts -g "QA-4[34]"` 4 passed, QA-45 통과. 여백 허용: 세 영역 아래 끝이 화면 아래 끝에서 20px 안(body 여백 16px + 4px 여유, `BOTTOM_GAP = 20`)이고 뷰포트를 넘지 않음. 실제 desktop 값: 캔버스 높이 686(1280x800, 아래 끝 784), `scrollHeight <= innerHeight`
    - **QA-44 설계 메모**: 인스턴스 60개를 더해도 크기 M 버튼은 줄바꿈으로 686px 안에 다 들어가 캔버스 안 스크롤이 안 생김(처음 실패: `canvas 안쪽 높이가 보이는 높이보다 큼 Expected: > 686 Received: 686`) → 시작 전에 메인 크기를 `L`로 올려 캔버스도 넘치게 함. 맨 끝 캔버스 버튼 클릭 = 캔버스 `scrollTop > 0` · `window.scrollY` 0, 맨 끝 레이어 행 클릭 = 레이어 창 `scrollTop > 0`. Playwright 클릭이 스크롤 컨테이너 안을 자동 스크롤해 흔들림 없음
    - **회귀**: `npx playwright test e2e/mini-figma-*.spec.ts` 152 passed, `npx playwright test` 전체 `324 passed (35.3s)` (QA-2 · 42 · A12 · A26 · A29 포함 기존 그대로), `npx vitest run` `Test Files 43 passed (43) · Tests 1159 passed (1159)`, `npx tsc --noEmit` exit 0, `git diff --stat main -- packages/` 출력 없음
    - 육안: 1280x800 캡처 확인 (도구 막대 아래 세 영역이 화면 아래까지 참, 점무늬 캔버스가 남은 높이 사용)
    - **경량 검수 NB 1 반영 (테스트만)**: `e2e/mini-figma-design.spec.ts`에 도우미 `expectPanelsNoHorizontalOverflow`(레이어 · 캔버스 · 속성 `scrollWidth <= clientWidth`)를 QA-42 · QA-44 desktop 분기에 추가. 검출력: 임시로 `.layer-name`에 `overflow-wrap: normal; white-space: nowrap` + QA-44에서 라벨 `'A'.repeat(200)`을 넣자 `npx playwright test e2e/mini-figma-design.spec.ts -g QA-44 --project=desktop` 실패 `60개 추가 뒤: layer-panel 안 가로 넘침 없음 Expected: <= 220 Received: 2134` (바로 앞 `noHorizontalScroll(page)`는 통과 = 페이지 검사로는 못 잡음), 임시 변경 되돌린 뒤 `e2e/mini-figma-design.spec.ts` 16 passed, `npx playwright test` 전체 324 passed (35.6s). 앱 · CSS · `packages/` 변경 없음

<!-- 완료 예시
- [x] **Dev-3 [#12]** (`mini-figma`): 팔레트 판
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/components/ColorPalette.ts` 신규, `fixtures/mini-figma/__tests__/app.test.ts` 18건 통과
    (`npx vitest run fixtures/mini-figma` 112 passed), `npx playwright test e2e/mini-figma-palette.spec.ts` desktop · mobile 10 passed, 커밋 a1b2c3d
-->
