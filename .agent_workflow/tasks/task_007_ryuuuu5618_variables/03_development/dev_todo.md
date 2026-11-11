# dev_todo: variables

- 명세: `../01_request_spec.md` (VR-01 ~ 08) · 브랜치: `feature/variables` · 테스트 케이스: `../04_qa_evidence/qa_todo.md`
- 규칙: 항목 하나 = 커밋 하나. 체크할 때 완료 근거 필수 (근거 없는 체크는 무효). 커밋 메시지 `<type>(mini-figma): <요약> (Dev-N)`, push 안 함
- 범위: `fixtures/mini-figma/` · `e2e/mini-figma-*.spec.ts` · `e2e/mini-figma-helpers.ts`뿐. **`packages/`는 한 줄도 바꾸지 않는다.** `types.ts` 변경 없음. 완료 때 `git diff --stat main -- packages/`가 비어 있음을 근거에 붙인다
- 바깥 루프(ATDD): 인수 시나리오가 있는 Dev(3 ~ 5)는 `qa_todo.md`의 해당 QA를 **먼저 `e2e/mini-figma-variables.spec.ts`에 써서 desktop에서 실패하는 것을 확인**한 뒤 구현. 안쪽 루프는 Vitest (`fixtures/mini-figma/__tests__/`)
- 순서: Dev-1 (순수: 데이터 · 풀기 · 값 바꾸기) → Dev-2 (그리기: 푼 색) → Dev-3 (변수 패널) → Dev-4 (연결 UI) → Dev-5 (Patch · 되돌리기 · 공격 · 회귀)
- **커밋마다 vitest · tsc · 해당 e2e가 초록이어야 한다.** 깨지는 기존 단언은 그것을 깨뜨리는 Dev와 같은 커밋에서 고친다 (아래 「깨질 기존 단언」)

## 시작 전 확인 (작업자)

- `git status`: 지금 작업 트리에 **사용자 미커밋 수정**이 있다 (`App.ts` · `components/LayerPanel.ts` · `index.html` — 레이어 접기 `[▾]`, `App`에 `layersOpen` Hook 칸 추가 중). 사용자 파일이므로 **커밋 · 되돌리기 하지 않는다**. 이 기획의 Hook 개수 말은 「새 칸을 더하지 않는다」이다 (변수는 `doc` 안이라 새 Hook 없음). 사용자 수정이 먼저 커밋돼 있으면 그 개수(7 또는 8)가 기준이고, 아니면 내 커밋에 안 섞이게 `git add`를 파일별로 한다
- 사용자가 다른 창에서 `index.html` · 컴포넌트를 고칠 수 있으니 Dev마다 시작 때 `git status`를 다시 본다

## 공통 주의 (코드로 확인한 것)

1. **`Doc`에 `variables`가 더해지면 doc을 만드는 모든 순수 함수가 `variables`를 이어받아야 한다.** `model.ts`의 `setMainField` · `setInstanceField` · `resetInstanceField` · `addInstance` · `removeInstance` · `moveInstance`가 지금은 `{ main, instances }` 객체 리터럴을 새로 만든다 → `{ ...doc, … }` 또는 `variables: doc.variables`로 고친다. **같은 참조**여야 한다 (안 바뀐 칸 = 같은 배열, 기존 「같은 값이면 같은 Doc」 규칙 그대로)
2. **`color` 칸 하나에 `#rrggbb`와 `var:<id>`가 같이 산다** (VR-02). `isHexColor('var:primary')`는 이미 false라 `textColorFor` · `buttonStyle`은 건드리지 않고, **풀기는 Canvas에서** 한다 (`Button`은 지금처럼 hex만 받음 → `Button.ts` · `buttonStyle` 변경 없음). 푼 hex를 `Button`에 넘기면 글자색 대비(task_005)는 푼 색 기준이 자연히 된다
3. **풀기 순서 (VR-03)**: `resolveColor(color, variables, fallback?)` — ① hex면 그대로 ② `var:<id>`면 그 변수 `value` ③ 없는 id면 `fallback`(메인 색, 그것이 hex면 그대로 · 연결이면 같은 규칙으로 풀기 · 그래도 못 풀면) ④ `#0052ff`. 메인 자신의 `color`가 없는 id면 `fallback` 없이 ④. 변수끼리 연결(alias)은 없으므로 재귀 · 순환 검사가 필요 없다
4. **Canvas가 풀어서 `Button`에 넘기므로 `doc`은 항상 연결 정보(`var:…`)를 들고 있다.** 실제 영역은 DOM에서 읽으므로 푼 hex만 본다(VR-07). `previewVNode.ts`(실제 영역 정리) · `preview.ts` · `previewDocs.ts` · `previewNav.ts`는 **고치지 않는다** — doc 사본은 `Doc` 참조 하나라 `variables`가 저절로 따라 들어간다 (Dev-5가 단위로 확인)
5. **변수 구역 자리 = `LayerPanel` 안, 인스턴스 목록(`<ul>`) 아래 맨 끝 자식** (`div.variable-panel`, 새 컴포넌트 `components/VariablePanel.ts`를 `LayerPanel`이 `h(VariablePanel, …)`로 부름). 이유: ① `div.app` 최상위 자식이 5개 그대로라 경로 접두 `[0,0]` ~ `[0,4]` · desktop grid · mobile 순서가 안 바뀐다 ② 레이어 창 기존 자식 경로(제목 · 메인 행 · `ul`)가 그대로 (맨 끝에 더하기만) ③ 레이어 목록을 접어도(사용자 WIP `layer-list collapsed`) 변수 구역은 남는다. 변수 구역 testid는 **속성 패널 · 팔레트와 안 겹치게** 새로 짓는다: `variable-panel` · `variable-title` · `variable-row` · `variable-chip` · `variable-name` · `variable-color`(`<input type="color">`) · `variable-hex`. 기존 `color-chip` · `prop-color` · `color-hex`는 **속성 패널 팔레트 전용으로 남긴다** (기존 e2e 수가 안 변함)
6. **변수 줄은 `key: v.id` `<li>`** (`variable-list` `<ul>`의 자식 전부 key — 엔진 diff key 규칙, task_004 공통 주의 1). 줄 안 색 입력칸은 `onInput`만 쓴다 (엔진 이벤트는 click · input뿐, Chromium은 고르는 동안 input을 연달아 낸다). `value`는 DOM 프로퍼티라 입력칸을 다시 만들지 않고 그 자리에서 고쳐 포커스가 유지된다
7. **연결 UI = 팔레트 판(`ColorPalette`) 안**: `<select data-testid="prop-variable" aria-label="변수">` (옵션 `''` = 「없음」 + 변수 이름들, 값은 변수 id). 새 Hook 없음, 새 콜백 없음 — 고르면 `onEdit('color', 'var:<id>')`, 「없음」이면 지금 푼 hex로 `onEdit('color', hex)`(겉모습은 그대로 · 연결만 풀림). 칩 · 색 입력칸은 지금처럼 hex를 `onEdit`로 올려 연결이 풀린다 (같은 색이라도 문자열이 `var:…` → `#…`로 달라지므로 doc은 바뀌고 렌더 1번). 연결 중이면: 칩 `aria-pressed` 전부 `'false'` · 색 입력칸 `value` = 푼 hex · 값 글자(`color-hex`) = 변수 이름 (VR-05). 속성 패널 색 구역에 `<select>`가 생기므로 task_005 단위 단언 「색 칸에 `<select>`가 없다」가 바뀐다
8. **Hook · DOM**: `VariablePanel.ts` · `ColorPalette.ts` · `Canvas.ts`는 props만 받는 순수 함수 (`rootOnlyHooks.test.ts` 컴포넌트 목록에 `VariablePanel.ts` 추가). 변수 값 바꾸기는 `App`의 콜백 `onVariableChange(id, value)` 하나 (`applyEdit(setVariableValue(doc, id, value))`)이고 `App` Hook 칸은 늘지 않는다. 한 동작 = setter 하나 = 렌더 1번 (Batching, VR-06)
9. **`setVariableValue`가 값 형식을 검사한다 (기획 가정)**: `#rrggbb`(`isHexColor`) 아니면 같은 Doc (UI에서는 안 나오는 값 — 색 입력칸은 항상 `#rrggbb` 소문자). 안 정해진 동작이라 사용자 확인 없이 방어로만 두고, 단위 테스트(A57)로 고정한다
10. **연결만 하고 [Patch]하면 무변경 Patch다.** 메인을 Primary에 연결해도 푼 색이 같으면 테스트 영역 DOM이 안 바뀌어 `patch()`가 false → 기록 · doc 사본이 안 쌓인다 (기존 task_006 규칙 그대로). 연결은 이후 값을 바꿔 보이는 변화가 생기고 Patch할 때 그때의 `doc` 사본에 같이 들어간다 (QA-73이 그 순서로 쓴다)

## 폴더 구성 (바뀌는 곳만)

```
fixtures/mini-figma/
  model.ts                  Variable 타입 · Doc.variables · INITIAL_VARIABLES · setVariableValue · 기존 doc 함수가 variables 이어받기 (Dev-1)
  color.ts                  varRef · isVarRef · varIdOf · resolveColor (Dev-1)
  components/Canvas.ts      variables prop · 그릴 때 resolveColor (Dev-2)
  components/VariablePanel.ts (신규, 순수) 변수 3줄 (Dev-3)
  components/LayerPanel.ts  끝 자식으로 VariablePanel (Dev-3, 사용자 WIP와 같은 파일이라 충돌 주의)
  components/ColorPalette.ts 변수 선택 상자 · 연결 중 표시 (Dev-4)
  components/PropertyPanel.ts variables · fallback 색을 ColorPalette에 전달 (Dev-4)
  App.ts                    variables를 자식에 내려 주기 · onVariableChange (Dev-2 · 3)
  index.html                변수 구역 · 선택 상자 CSS (Dev-3 · 4)
  __tests__/                color · model · app · rootOnlyHooks · previewDocs 갱신, canvas 신규
e2e/mini-figma-variables.spec.ts (신규) QA-63 ~ 76, A43 ~ A58 (A57은 단위)
e2e/mini-figma-helpers.ts        변수 도우미 (variableSel · setVariableValue · linkTo 등)
```

## 깨질 기존 단언 (처음 doc에 `variables`가 더해져서)

`Hook 슬롯 값`(`slot(0)`)과 `INITIAL_DOC` 같은 참조 비교(`toBe(INITIAL_DOC)`)는 **안 깨진다** (`INITIAL_DOC` 자신이 `variables`를 가진 같은 객체). `INITIAL_DOC.main` · `.instances` 값 비교도 안 깨진다. 깨지는 것:

| # | 위치 | 어떻게 깨지나 | 어느 Dev에서 고치나 |
| --- | --- | --- | --- |
| 1 | `app.test.ts` `Object.keys(doc)` `toEqual(['main', 'instances'])` (추가 시 doc 키 단언, 약 846줄) | 런타임: `['main', 'instances', 'variables']` | Dev-1 |
| 2 | `app.test.ts` 팔레트 「색 칸에 `<select>`가 없다」 (`prop-row[data-field="color"] select` null, 약 665줄) | 런타임: 변수 `<select>`가 색 칸에 생김 → 「`<select>`는 `prop-variable` 하나뿐」으로 | Dev-4 |
| 3 | `rootOnlyHooks.test.ts` 컴포넌트 파일 목록 (65줄, 8개) | 런타임: `VariablePanel.ts` 추가 → 9개 | Dev-3 |
| 4 | `model.test.ts` `deepFreeze<Doc>({ main, instances })` 6곳 (약 134 · 189 · 235 · 313 · 341 · 372줄) | **tsc만** (vitest는 통과): `variables` 칸 없음 → `variables: INITIAL_DOC.variables.map(…)` 추가 | Dev-1 |
| 5 | `previewDocs.test.ts` `docN` (14줄) | **tsc만**: `variables: INITIAL_DOC.variables` 추가 | Dev-1 |

→ 런타임으로 깨지는 단언 **3건**, tsc만 깨지는 리터럴 **7곳**. e2e는 **구현 때 확인**할 후보: `mini-figma-design.spec.ts` (레이어 창 안 요소 폰트 · 모서리 · 그림자 · 터치 목표 검사, 60개 추가 뒤 레이어 창 `scrollHeight`), `mini-figma-render.spec.ts` · `mini-figma-layers.spec.ts` (`layer-panel` DOM 변화 0 단언 — 변수를 안 건드리는 시나리오라 그대로일 것). 새 testid를 따로 지었으니 `getByTestId('color-chip')` 개수 · `prop-color` 단언은 안 변한다

## patch 줄 수 기대 표 — 테스트 영역 (`app.test.ts`가 `instance.lastPatches`로 센 값 · 코드 구조로 계산한 값)

전제: 시작 doc에서 **메인을 고르고 Primary에 연결**한 상태(메인 `var:primary`, b1 따름, b2는 라벨 override뿐 = 따름, b3 `#cf202f` hex override). 경로 구분: **캔버스** `[0,2,…]` · **레이어(변수 구역 포함)** `[0,1,…]` · **속성 패널** `[0,3,…]`. 글자색 대비: `#0052ff` 흰 / `#f4b000` 먹 / `#0066ff` 흰 / `#05b169` 먹 / `#cf202f` 흰.

| # | 한 일 | 캔버스 | 변수 구역 | 속성 패널 | 렌더 | 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| VP-1 | 메인(선택)을 Primary에 연결 (`#0052ff`와 푼 색 같음) | **0줄** | 0 | `{ SET_PROP: 1(변수 상자 value), SET_ATTR: 1(`#0052ff` 칩 aria-pressed true→false), SET_TEXT: 1(color-hex `#0052ff` → `Primary`) }` | 1 | VR-02 · 05 |
| VP-2 | (VP-1 뒤) Primary 값 `#f4b000` | `{ SET_STYLE: 6 }` (메인 · b1 · b2 × 배경 + 글자색 흰→먹). **b3 · 레이어 노드 줄 0** | `{ SET_STYLE: 1(칩 배경), SET_PROP: 1(색 입력칸 value), SET_TEXT: 1(hex 글자) }` | 메인 선택 중: `{ SET_PROP: 1(색 입력칸 value) }` (변수 상자 · 이름 글자 · 칩은 그대로). 선택 없음 · b3 선택이면 0 | 1 | VR-06 |
| VP-3 | (VP-1 뒤) Primary 값 `#0066ff` (글자색 안 바뀜) | `{ SET_STYLE: 3 }` (메인 · b1 · b2 배경만) | VP-2와 같음 | VP-2와 같음 | 1 | VR-06 |
| VP-4 | (VP-1 뒤) b2에 팔레트 칩 `#05b169` (override) → Primary 값 `#f4b000` | `{ SET_STYLE: 4 }` (메인 · b1 × 2). **b2 · b3 줄 0**, b2 노드 같은 참조 | VP-2와 같음 | b2 선택 중이면 0 (hex 값이라 안 따라감) | 1 | VR-06 (override 안 따라감) |
| VP-5 | b3(선택)를 Danger에 연결 (푼 색 `#cf202f` 같음) | **0줄** | 0 | VP-1과 같은 3줄 (`#cf202f` 칩 · 이름 `Danger`). ↻는 이미 있음(b3는 color override라) | 1 | VR-02 · 05 |
| VP-6 | (VP-5 뒤) Danger 값 `#05b169` | `{ SET_STYLE: 2 }` (**b3만**, 흰→먹). **메인 · b1 · b2 줄 0**, 그 버튼 노드 같은 참조 | `{ SET_STYLE: 1, SET_PROP: 1, SET_TEXT: 1 }` | b3 선택 중: `{ SET_PROP: 1 }` | 1 | VR-06 (b3 변경 시 다른 버튼 0줄) |
| VP-7 | (VP-1 뒤, 메인 선택) 같은 색 칩 `#0052ff` 클릭 = 연결 풀림 | **0줄** (푼 색 같음) | 0 | `{ SET_PROP: 1(상자 Primary→없음), SET_ATTR: 1(칩 pressed false→true), SET_TEXT: 1(`Primary` → `#0052ff`) }`. doc은 `var:primary` → `#0052ff`로 바뀌어 **렌더 1번** (같은 색이어도 같은 값 아님) | 1 | VR-05 |
| VP-8 | (VP-1 뒤) 변수 상자 `없음` | 0줄 | 0 | VP-7과 같은 3줄 | 1 | VR-05 |
| VP-9 | (VP-5 뒤, b3 선택) ↻ (색) = 메인 따름 → 메인은 Primary(`#0052ff`) | `{ SET_STYLE: 1 }` (b3 배경 `#cf202f` → `#0052ff`, 글자색 흰 그대로) | 0 | `{ ↻ REMOVE: 1 }` + 상자 · 칩 · 이름 글자 줄 (`Danger` → `#0052ff`가 아니라 메인이 Primary 연결이라 `Primary`): 개발에서 실제 출력으로 확인 | 1 | VR-02 (↻) |
| VP-10 | 변수 값을 **같은 값**으로 `input` (Primary = `#0052ff` 그대로) · 연결 없음에서도 | — | — | — | **0번**, `lastPatches` 그대로 | `setVariableValue` 같은 Doc |
| VP-11 | 연결 없는 처음 doc에서 Primary 값 `#f4b000` | **0줄** (아무 버튼도 연결 안 됨) | `{ SET_STYLE: 1, SET_PROP: 1, SET_TEXT: 1 }` | 0 | 1 | VR-06 |
| VP-12 | 같은 틱에 Primary `input` 4번 연속(`#111111` → `#222222` → `#333333` → `#f4b000`) | 이벤트마다 `{ SET_STYLE: 3 }`, 마지막만 `{ SET_STYLE: 6 }` | 이벤트마다 3줄 | — | 이벤트당 1번 (P-26과 같은 방식) | Batching |

**실제 영역 patch** (`preview.test.ts` 방식, 한 번 [Patch], 경로는 영역 상자 안: 메인 `[0,0]` · b1 `[1,0]` · b2 `[1,1]` · b3 `[1,2]`):

| # | 한 일 → [Patch] | 실제 영역 patch | 근거 |
| --- | --- | --- | --- |
| RV-1 | VP-1(연결만) → [Patch] | 없음 — 기록 안 쌓임, doc 사본도 안 쌓임 | PP-04 · 공통 주의 10 |
| RV-2 | VP-2(`#f4b000`) → [Patch] | `{ SET_STYLE: 6 }` (R-5와 같음, 경로 `[0,0]` · `[1,0]` · `[1,1]`). **DOM에 `var:` 글자가 없음** (푼 hex만) | VR-07 |
| RV-3 | VP-6(Danger `#05b169`) → [Patch] | `{ SET_STYLE: 2 }` (b3 `[1,2]`만) | VR-07 |
| RV-4 | VP-11(연결 없이 값만) → [Patch] | 없음 — 무변경, 기록 안 쌓임 | PP-04 |

## Dev 항목

- [ ] **Dev-1** (`mini-figma`): 변수 데이터 · 풀기 · 값 바꾸기 순수 함수 [VR-01 · 02 · 03]
  - 의존: 없음 (UI 안 바뀜, 화면은 그대로)
  - 대상 파일: `fixtures/mini-figma/model.ts` · `fixtures/mini-figma/color.ts`
    - `model.ts`: `export interface Variable { readonly id: string; readonly name: string; readonly value: Color }`, `Doc.variables: readonly Variable[]`, `INITIAL_VARIABLES` = `primary` Primary `#0052ff` · `danger` Danger `#cf202f` · `success` Success `#05b169`, `INITIAL_DOC`에 `variables: INITIAL_VARIABLES`. `setVariableValue(doc, id, value)`: 같은 값 · 없는 id · 형식 밖 값이면 같은 Doc, 아니면 새 Doc (**그 변수 하나만 새 객체**, 나머지 변수 · `main` · `instances`는 같은 참조). 기존 6개 doc 함수가 `variables`를 같은 참조로 이어받게 고침. `Color` 타입 주석(FD-20)을 「`#rrggbb` 또는 `var:<id>`」로
    - `color.ts`: `varRef(id)` (`'var:' + id`), `isVarRef(color)`, `varIdOf(color)` (연결이 아니면 `null`), `resolveColor(color, variables, fallback?)` — 공통 주의 3의 순서. `isHexColor` · `textColorFor` · `buttonStyle` · `PALETTE`는 안 바꾼다
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/model.test.ts` · `color.test.ts`
    - V-1 `INITIAL_DOC.variables` = 3개 · 순서 `primary` `danger` `success` · 값(팔레트 색) · 이름. V-2 기존 doc 함수 6개(`setMainField` · `setInstanceField` · `resetInstanceField` · `addInstance` · `removeInstance` · `moveInstance`)가 `variables` 같은 참조를 돌려줌. V-3 `setVariableValue` 다른 값 = 새 Doc, 해당 변수만 새 객체, 다른 변수 · `main` · `instances` 같은 참조. V-4 같은 값 · 없는 id · 형식 밖(`blue` · `#fff` · 빈 글자) = 같은 Doc. V-5 입력 불변(깊게 동결한 입력이 안 깨짐)
    - RC-1 hex는 그대로 · RC-2 `var:primary` → 변수 값(변수 값이 바뀌면 같이 바뀜) · RC-3 없는 id → `fallback`이 hex면 그것 · RC-4 `fallback`이 `var:…`면 풀어서 · RC-5 `fallback`도 없는 id거나 없으면 `#0052ff` · RC-6 `var:`(빈 id) · `var:Primary`(대소문자 다름, id는 정확 일치) = 없는 id 취급 · RC-7 `varRef` · `varIdOf` · `isVarRef` 왕복, hex는 `isVarRef` false · RC-8 `isHexColor('var:primary')` false이고 `resolveColor` 결과에는 `textColorFor`가 푼 색 기준으로 정상 대비
  - 깨진 기존 단언 고침: `app.test.ts` doc 키(#1), `model.test.ts` 동결 리터럴 6곳(#4), `previewDocs.test.ts` `docN`(#5)
  - 알고리즘: 명세 §5 「연결 저장 방식」(`color` 칸에 `'var:<id>'`), VR-03 「없는 id는 메인 색 → `#0052ff`」
  - 완료 근거로 남길 것: 테스트 파일 · 건수, `npx vitest run fixtures/mini-figma` 통과 수, `npx tsc --noEmit`, 커밋 해시

- [ ] **Dev-2** (`mini-figma`): 그릴 때 푼 색을 쓴다 — Canvas가 `resolveColor`로 hex를 만들어 `Button`에 넘김 [VR-03 · 06 · 08]
  - 의존: Dev-1
  - 대상 파일: `components/Canvas.ts` (`variables` prop, `draw()`의 `color: resolveColor(merged.color, variables, main.color)`, 메인은 `fallback` 없이), `App.ts` (`h(Canvas, { …, variables: doc.variables })`). `Button.ts`는 안 바꾼다
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/canvas.test.ts` (신규 — 엔진으로 `Canvas`만 그리는 작은 하니스, `previewVNode.test.ts`의 그리기 방식)
    - 메인 `var:primary` · 변수 값 `#f4b000` → 메인 · 따르는 인스턴스 style = `background-color: #f4b000` + `color: #0a0b0d` (푼 색 기준 대비). b3 hex override는 그대로. 연결이 없으면 지금과 똑같은 출력
    - 없는 id 연결: 인스턴스 `var:ghost` → 메인 색, 메인도 `var:ghost` → `#0052ff`
    - 변수 값만 바뀐 두 번째 그리기의 patch = 연결 안 된 버튼 줄 0, 연결된 버튼만 `SET_STYLE` (VP-2 · 3 · 4 · 6의 캔버스 줄 수)
    - `app.test.ts`: 처음 화면 버튼 4개 색이 그대로(VR-08), `slot(0)` 그대로
  - 알고리즘: 공통 주의 2 · 3 · 4 (풀기는 Canvas, 연결 정보는 doc에만)
  - 완료 근거로 남길 것: `canvas.test.ts` 건수 · `npx vitest run fixtures/mini-figma` · `npx tsc --noEmit` · 커밋 해시

- [ ] **Dev-3** (`mini-figma`): 변수 패널 — 레이어 아래 「변수」 3줄, 값을 바꾸면 `setDoc` 한 번 [VR-04 · 06]
  - 의존: Dev-1 · Dev-2. **ATDD**: QA-63 · 76 · A43 · A44 · A46를 `e2e/mini-figma-variables.spec.ts`에 먼저 쓰고 desktop 실패 확인
  - 대상 파일: `components/VariablePanel.ts` (신규, 순수 — 공통 주의 5 · 6), `components/LayerPanel.ts` (`variables` · `onVariableChange` prop, 끝 자식으로 `h(VariablePanel, …)`. **사용자 WIP 레이어 접기와 같은 파일 — 사용자 수정 위에 얹고 그 부분은 안 건드림**), `App.ts` (`onVariableChange` = `applyEdit(setVariableValue(doc, id, value))`, `h(LayerPanel, { …, variables: doc.variables, onVariableChange })`), `index.html` (변수 구역 CSS: 제목 · 줄 · 칩 원 · 입력칸 · hex 고정폭, mobile 가로 안 넘침, 터치 목표 ≥ 32px, 그림자 없음 · 디자인 변수 재사용)
  - 줄 구조: `li key=v.id` > `span.variable-chip`(style `background-color`) · `span.variable-name` · `input type=color`(`value`, `aria-label` = 「Primary 값」) · `span.variable-hex`. 이벤트는 `onInput`만
  - 테스트(먼저 실패 확인): 
    - e2e: QA-63 · 76 · A43 · A44 · A46 (연결이 아직 없으므로 캔버스는 안 바뀜 = VP-11)
    - 단위 `app.test.ts`: 처음 변수 줄 3개 · 순서 · 값 · hex 글자, 입력 → `slot(0).variables` 해당 값만 바뀜 · 줄 patch = VP-11, 같은 값 `input` = 렌더 0번 · `lastPatches` 그대로(VP-10), 4번 연속 `input` = 이벤트당 렌더 1번(VP-12), 변수 줄 **입력칸 노드가 연타 뒤에도 같은 참조**, 화면에 `patch` 글자 없음(MF-05) 계속
    - `rootOnlyHooks.test.ts`: 컴포넌트 목록에 `VariablePanel.ts` (#3)
  - 알고리즘: 명세 VR-04 · VR-06 · Batching 결정(한 동작 = 렌더 1번)
  - 완료 근거로 남길 것: e2e 통과 수(desktop · mobile) · vitest · tsc · 커밋 해시

- [ ] **Dev-4** (`mini-figma`): 연결 UI — 속성 패널 색 구역의 「변수」 선택 상자 · 연결 중 표시 · 연결 풀림 [VR-02 · 05 · 06]
  - 의존: Dev-3. **ATDD**: QA-64 ~ 71 · A47 ~ A51 · A54 · A58을 먼저 써서 실패 확인
  - 대상 파일: `components/ColorPalette.ts` (props에 `variables` · `fallback` 추가, `<select data-testid="prop-variable">`: 옵션 `''` 「없음」 + 변수들, 연결 중이면 칩 전부 `aria-pressed 'false'` · 색 입력칸 `value` = 푼 hex · 값 글자 = 변수 이름. 변수 상자 고르기 = `onPick('var:<id>')`, 「없음」 = `onPick(지금 푼 hex)`), `components/PropertyPanel.ts` (`variables` prop → `ColorPalette`에 `variables` · `fallback: main.color` 전달), `App.ts` (`h(PropertyPanel, { …, variables })`), `index.html` (상자 CSS). 연결을 위한 새 콜백 · 새 Hook 없음 (공통 주의 7). ↻는 지금 코드 그대로 (`color` 키가 있으면 override)
  - 없는 id 연결(단위에서만 가능, UI로는 못 만듦)은 연결 안 된 것처럼 그린다: 변수 상자 `없음`, 이름 글자 대신 푼 hex
  - 테스트(먼저 실패 확인):
    - e2e: 위 QA · A 목록
    - 단위 `app.test.ts`: VP-1 · 5 · 7 · 8 · 9 patch 줄 수 표, `slot(0)`의 `main.color` = `'var:primary'` · 풀린 뒤 `'#0052ff'`, 인스턴스 연결 · 해제 시 다른 인스턴스 · `variables` 같은 참조, 같은 변수 상자 값 다시 고르기 = 렌더 0번, 추가한 인스턴스(b4)는 메인 따름이라 메인이 연결이면 같이 따라옴, 칩 8개 · `color-hex` 단언(기존 P-25 ~ 27 · 팔레트 판)이 연결 없는 상태에서 그대로 통과
    - 깨진 기존 단언 고침: 「색 칸에 `<select>`가 없다」 → 「`<select>`는 `prop-variable` 하나뿐」(#2)
  - 알고리즘: 명세 §5 「연결 저장 방식」, VR-05
  - 완료 근거로 남길 것: e2e 통과 수 · vitest · tsc · 커밋 해시

- [ ] **Dev-5** (`mini-figma`): Patch · 되돌리기 · 공격 · 회귀 마무리 [VR-06 · 07 · 08]
  - 의존: Dev-4. **ATDD**: QA-72 ~ 75 · A45 · A52 · A53 · A55 · A56(단위 짝)을 먼저 써서 실패 확인
  - 대상 파일: `__tests__/preview.test.ts` (RV-1 ~ 4), `__tests__/previewDocs.test.ts` (PD-6: 변수가 든 doc 사본이 칸마다 같은 참조로 돌아옴 — `previewDocs.ts` 본문 변경 없음), `__tests__/app.test.ts` (U-8 ~ : [Patch] 뒤 `variables`가 든 `slot(0)`이 [실행 취소]로 처음 doc 같은 참조 · [다시 실행]으로 Patch 때 doc 같은 참조, 연결 · 값 둘 다 복원, 렌더 1번), `e2e/mini-figma-helpers.ts` 변수 도우미, `e2e/mini-figma-variables.spec.ts` 나머지. 필요하면 `index.html` 작은 CSS
  - 회귀: `npx vitest run` 전체 · `npx tsc --noEmit` · `npx playwright test` 전체(Phase 1 · 2 + mini-figma 전 스펙, desktop · mobile) · `git diff --stat main -- packages/` 비어 있음 · `rootOnlyHooks`(Hook은 `App`만, 자식은 props만)
  - 완료 근거로 남길 것: 각 명령 결과 (건수), `git diff --stat main -- packages/` 빈 출력, 커밋 해시

## 구현 때 확인 (기획에서 못 정한 것)

- VP-9(↻) 속성 패널 줄 수 · 이름 글자 줄 — 실제 출력으로 표를 고친다
- 변수 구역이 들어가 레이어 창이 길어지는 만큼 desktop 사이드바에서 **인스턴스를 많이 추가하면 안쪽 스크롤**이 되는지 (design 스펙 QA-44 단언이 그대로 통과하는지)
- mobile(375px)에서 변수 줄(칩 · 이름 · 입력칸 · hex)이 한 줄에 들어가는지 — 안 들어가면 줄바꿈 허용
