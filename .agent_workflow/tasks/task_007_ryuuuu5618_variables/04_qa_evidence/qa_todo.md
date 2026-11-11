# qa_todo: variables

- 명세: `../01_request_spec.md` (VR-01 ~ 08) · Dev 목록: `../03_development/dev_todo.md`
- **VR → QA 연결**: VR-01 = QA-63 · V-1 / VR-02 = QA-65 · 67 · 70 · 71 · V-3 · RC-7 / VR-03 = QA-65 · 66 · 72 · A51 · RC-1 ~ 8 · 단위 canvas / VR-04 = QA-63 · 76 · A43 ~ A46 · A55 / VR-05 = QA-64 · 65 · 68 ~ 70 · A47 · A48 · A58 / VR-06 = QA-66 · 67 · A43 · A44 · A46 · A49 · A50 · A54 · VP-1 ~ 12 / VR-07 = QA-72 ~ 75 · A52 · A53 · RV-1 ~ 4 · U-8 · PD-6 / VR-08 = QA-75 · 기존 e2e · 단위 전체 회귀
- 실행: `npx playwright test e2e/mini-figma-variables.spec.ts` (desktop 1280x800 · mobile 375x812 두 프로젝트, 모든 시나리오가 두 프로젝트에서 돈다). 기존 Phase 1 · 2 e2e와 task_004 ~ 006 e2e(`mini-figma-*.spec.ts`)는 회귀로 모두 통과해야 한다
- 시나리오 하나 = `e2e/*.spec.ts` 테스트 하나. 테스트 이름은 시나리오 문장 그대로. **번호는 task_006에서 이어 쓴다** (새 인수 = QA-63 ~ , 새 공격 = QA-A43 ~ )
- 근거 ID: 이 task의 `VR-xx` · task_004 `MF-xx` · task_005 `FD-xx` · task_006 `PP-xx` · Diff 기본 케이스 `D-01 ~ 05`(앱 화면에서 본 대응. 엔진은 안 바꾸므로 엔진 단위 테스트가 회귀로 덮음)
- **공통 확인 (모든 스펙 · 모든 테스트)**: 콘솔 `error`가 한 건이라도 있으면 실패, 선언 안 한 dialog가 뜨면 실패 (`phase1-helpers.ts`의 `test` 확장 재사용). 모든 시나리오는 `/mini-figma/`를 새로 열어 시작 (변수 · 연결은 저장 안 됨 = 새로고침하면 처음 doc)
- 노드 참조 · DOM 변경 관찰은 task_004 · 006과 같음 (`holdNodes` · `sameNode` · `watchSel`). 「다른 버튼은 그대로」 = 그 버튼 노드가 같은 참조이고 `style` 속성 변경 기록(MutationObserver)이 0
- 두 영역 비교 `areaSnapshot(page, 'test' | 'real')`(task_006 도우미)는 그대로 쓴다. 푼 색 확인은 computed `background-color` / `color` (`rgb(...)` 형식, `rgb()` 도우미)
- **새 도우미** (`e2e/mini-figma-helpers.ts`): `variableRows(page)` (줄마다 `{ name, value, hex }`), `setVariable(page, name, hex)` (그 줄 `variable-color`에 `input` 이벤트로 값 대입 — 색 입력칸은 `fill`이 안 되므로 task_005 `pickColorInput`과 같은 방식), `linkSelect(page)` (속성 패널 `prop-variable`), `linkTo(page, name | '없음')` (상자에서 고르기)

## 화면 약속 (`data-testid` · 표시 상태) — task_006 표에서 더해지는 것

| 영역 | testid | 설명 |
| --- | --- | --- |
| 변수 구역 | `variable-panel` · `variable-title` | **`layer-panel` 안** 인스턴스 목록 아래 맨 끝. 제목 「변수」. `div.app` 최상위 자식은 그대로 5개 (경로 접두 `[0,0]` ~ `[0,4]` 불변) |
| 변수 줄 3개 | `variable-row` (`data-id` = `primary` · `danger` · `success`) | 순서 = Primary · Danger · Success. 줄 안: `variable-chip`(색 원, `background-color` = 값) · `variable-name`(이름) · `variable-color`(`<input type="color">`, 값 = hex) · `variable-hex`(hex 글자) |
| 연결 상자 | `prop-variable` | 속성 패널 **색 구역**(`prop-row[data-field="color"]`) 안 `<select aria-label="변수">`, 옵션 = 「없음」 · Primary · Danger · Success. 메인 · 인스턴스 모두. 연결 안 됨 = 「없음」 |
| 연결 중 표시 | `color-chip`(8개) · `prop-color` · `color-hex` | 연결 중: 칩 8개 전부 `aria-pressed="false"`, 색 입력칸 값 = 푼 hex, 값 글자 = 변수 이름(「Primary」). 연결 안 됨 = 지금처럼 hex 글자 · 지금 색 칩 pressed |
| 안 바뀌는 것 | 기존 `color-chip` · `prop-color` · `color-hex` · `real-*` | **변수 구역은 위 testid만 쓴다** → 기존 팔레트 testid 개수 · 단언 불변. 실제 영역 DOM 구조 · testid 불변 (변수 구역은 복사 안 됨) |

**기본 데이터 (시나리오 공통 준비)**: 처음 메인 `#0052ff`, b1 override 없음, b2 라벨 `취소`뿐, b3 `#cf202f`(hex override) — **처음엔 아무것도 연결 안 됨**. 변수: Primary `#0052ff` · Danger `#cf202f` · Success `#05b169`. 「메인을 Primary에 연결」은 캔버스 메인 버튼 선택 → 속성 패널 변수 상자에서 Primary 고르기.

## 바뀌는 기존 단언

| 시나리오 · 테스트 | 전 | 후 |
| --- | --- | --- |
| `app.test.ts` doc 키 (추가 시 `Object.keys(doc)`) | `['main', 'instances']` | `['main', 'instances', 'variables']` |
| `app.test.ts` 팔레트 「색 칸에 `<select>`가 없다」 | `prop-row[data-field="color"] select` 없음 | 변수 상자 `prop-variable` 하나만 있음 (다른 `<select>`는 없음) |
| `rootOnlyHooks.test.ts` 컴포넌트 목록 | 8개 | 9개 (`VariablePanel.ts` 추가, 이것도 Hook · `document` 없는 순수 함수) |
| `model.test.ts` · `previewDocs.test.ts` Doc 리터럴 7곳 | `{ main, instances }` | `variables` 칸 추가 (**tsc만** 깨짐, vitest는 통과) |
| 그 밖 (기존 QA-1 ~ 62 · A1 ~ A42, 단위 P · R · U · PD) | — | 단언 변화 없음 (회귀로 그대로 통과). 구현 때 확인할 후보: `mini-figma-design.spec.ts`의 레이어 창 안 요소 검사 · 60개 추가 뒤 레이어 창 스크롤 |

## 인수 시나리오 (새)

| QA | 근거 ID | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| QA-63 | VR-01 · 04 | `/mini-figma/`를 처음 연다 | 왼쪽 사이드바를 본다 | `variable-panel`이 `layer-panel` 안에 있고 인스턴스 목록(`layer-list`) **아래**에 놓인다. 제목 「변수」. `variable-row` **3줄**, 순서 Primary · Danger · Success, 칩 배경 · 색 입력칸 값 · hex 글자가 각각 `#0052ff` · `#cf202f` · `#05b169`. 캔버스 버튼 4개 색은 처음 그대로(메인 · b1 · b2 파랑, b3 빨강, VR-08) | `e2e/mini-figma-variables.spec.ts` |
| QA-64 | VR-05 | 처음 화면 | ① 캔버스 메인 버튼 선택 ② b3 선택 | 속성 패널 색 구역에 `prop-variable` 상자가 있고 옵션이 「없음」 · Primary · Danger · Success, 선택값은 「없음」(연결 안 됨), 칩 중 지금 색 하나만 pressed. 인스턴스(b3)도 같음 | 〃 |
| QA-65 | VR-02 · 03 · 05 | 메인 선택 | 변수 상자에서 Primary 고름 (푼 색이 같음) | 상자 값 Primary, 칩 8개 전부 `aria-pressed="false"`, 값 글자 「Primary」(hex 아님), 색 입력칸 값 `#0052ff`. **버튼 색은 그대로** 파랑 (캔버스 버튼 노드 `style` 변경 0, VP-1 캔버스 0줄) | 〃 |
| QA-66 | VR-06 | 메인을 Primary에 연결, b2 선택 후 칩 `#05b169`(override), 노드 참조 잡음 | 변수 줄 Primary 값을 `#f4b000`으로 | **메인 · b1만** 배경 `rgb(244,176,0)` · 글자 먹(`#0a0b0d`)으로 바뀜. **b2(override `#05b169`) · b3 `#cf202f`는 그대로**, b2 · b3 노드 같은 참조 · `style` 변경 0, 레이어 행 노드 전부 같은 참조. 변수 줄 Primary의 칩 · 입력칸 · hex 글자도 `#f4b000` (VP-4) | 〃 |
| QA-67 | VR-05 · 06 | b3 선택 후 Danger에 연결 (푼 색 같음), 노드 참조 잡음 | Danger 값을 `#05b169`로 | **b3만** 배경 `rgb(5,177,105)` · 글자 먹으로 바뀜. 메인 · b1 · b2 노드 같은 참조 · `style` 변경 0 (VP-6, 다른 버튼 0줄). Danger 줄만 바뀌고 Primary · Success 줄은 그대로 | 〃 |
| QA-68 | VR-05 | 메인을 Primary에 연결한 상태 | 팔레트 칩 `#0052ff`(**같은 색**)를 누름 | 상자 값 「없음」으로 돌아가고(연결 풀림), 칩 `#0052ff` pressed, 값 글자 `#0052ff`. 이후 Primary 값을 `#f4b000`으로 바꿔도 메인 · b1 · b2는 파랑 그대로 (VP-7) | 〃 |
| QA-69 | VR-05 | 메인을 Primary에 연결한 상태 | 팔레트 `색 직접 고르기` 입력칸(`prop-color`)에 `#112233`을 넣음 | 연결 풀림(상자 「없음」), 메인 · b1 · b2가 `#112233` 배경 · 글자 흰색. Primary 값을 바꿔도 안 따라감 | 〃 |
| QA-70 | VR-02 · 05 | 메인을 Primary에 연결, Primary 값 `#f4b000`으로 바꿔 둔 상태 | 변수 상자에서 「없음」을 고름 | 겉모습 그대로(푼 색 `#f4b000` 유지, 글자 먹), 값 글자 `#f4b000`, 칩 중 `#f4b000`은 팔레트에 없으니 pressed 0개. 이후 Primary 값을 `#0052ff`로 되돌려도 메인 · b1 · b2는 `#f4b000` 그대로 (VP-8) | 〃 |
| QA-71 | VR-02 | b3를 Danger에 연결(override), 메인은 Primary에 연결 | b3 선택 상태에서 색 칸 ↻ | b3가 메인을 따름: 배경 `#0052ff`(푼 Primary), 값 글자 「Primary」, ↻ 사라짐 · 색 칸 파랑 표시(override) 풀림. 이후 Primary 값 변경 시 b3도 같이 바뀜 (VP-9) | 〃 |
| QA-72 | VR-07 | 메인을 Primary에 연결, Primary 값 `#f4b000` | [Patch] | 실제 영역 메인 · b1 · b2가 배경 `rgb(244,176,0)` · 글자 먹, b3 그대로. `areaSnapshot` test = real. **실제 영역 DOM 안에 `var:` 글자가 없다** (`real-area` `innerHTML`). `real-overlay`의 깜빡임 박스는 바뀐 세 버튼(메인 · b1 · b2) 위에만 생기고 b3 위에는 없음 (RV-2) | 〃 |
| QA-73 | VR-07 | QA-72 뒤 (Patch 1번) | ① [실행 취소] ② [다시 실행] | ① 두 영역 모두 파랑, 변수 줄 Primary 값 · 칩 · hex 글자 `#0052ff`, 메인 선택 시 변수 상자 「없음」 + 값 글자 `#0052ff` (**연결 · 변수 값 둘 다 되돌림**), [실행 취소] 꺼짐 · [다시 실행] 켜짐 ② 두 영역 모두 다시 `#f4b000`, 변수 상자 Primary · 값 글자 「Primary」, Primary 줄 `#f4b000` | 〃 |
| QA-74 | VR-07 | QA-72 뒤, Patch 안 한 편집 두 가지: Primary 값을 `#05b169`로, 메인 변수 상자 「없음」 | [실행 취소] | 편집은 버려지고 doc이 처음 사본이 됨: 테스트 · 실제 영역 모두 파랑, Primary `#0052ff`, 메인 상자 「없음」. [다시 실행]해도 Patch 안 한 `#05b169`는 안 돌아오고 `#f4b000` | 〃 |
| QA-75 | VR-08 | `/mini-figma/` 처음 + 변수를 건드린 뒤 [Patch] | 시작 화면 · 선택 · 속성 5칸 · 팔레트 칩 · ↻ · 추가 · 삭제 · 순서 · 키보드를 task_004 ~ 006 방식으로 한 번씩 | 기존 동작이 그대로 (칩 8개 pressed 규칙, 5칸 override 표시, patch 줄 수). 처음 화면 `div.app` 자식 5개 · Hook 7칸(단위) 그대로. 이 한 줄은 **기존 mini-figma e2e 전 스펙 통과**로 증명하고, 새 스펙에는 변수를 안 쓰는 대표 흐름 1개만 둔다 | 〃 + 기존 스펙 |
| QA-76 | VR-04 | 처음 화면 (desktop · mobile 각각) | 변수 구역 위치 · 크기를 잰다 | **desktop**: `variable-panel`이 `layer-panel` 박스 안에서 인스턴스 목록 아래, 박스 폭 안(넘침 0), 레이어 창 아래 끝이 화면 아래 20px 안 그대로, 페이지 가로 · 세로 스크롤 없음. **mobile**: 레이어 카드 안 변수 구역이 가로 스크롤 없이 한 줄씩, `variable-color` 입력칸 · 상자 · 칩 터치 목표 ≥ 32px, 변수 줄 3개가 화면 폭(375) 안 | 〃 |

## 공격적 시나리오 (새)

| 번호 | 근거 ID | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| A43 | VR-04 · 06 | 메인을 Primary에 연결 | Primary 색 입력칸에 `input`을 **연달아 6번**(`#111111` → `#222222` → … → `#f4b000`, 연타) | 마지막 값 `#f4b000`만 최종으로 남음: 메인 · b1 · b2 배경 · 변수 줄 hex 글자 · 속성 패널 색 입력칸 모두 같은 값, 콘솔 error 0, 입력칸 노드가 연타 전후 같은 참조(포커스 유지). 이벤트마다 렌더 1번(단위 VP-12) | 〃 |
| A44 | VR-06 | 메인을 Primary에 연결한 상태 | Primary 입력칸에 **현재 값과 같은 값**을 다시 `input` | 렌더 0번: `app-root` DOM 변경 0 (`watchApp`), 단위에서 `lastPatches` 그대로 (VP-10) | 〃 |
| A45 | VR-07 | 메인을 Primary에 연결 | Primary `#f4b000` → 곧바로 원래 `#0052ff`로 되돌림 → [Patch] | 버튼이 원래 파랑으로 돌아오고, 실제 영역과 같아 **무변경 Patch**(기록 안 쌓임, [실행 취소] 꺼짐 그대로) | 〃 |
| A46 | VR-06 | 처음 doc (아무것도 연결 안 됨) | Primary 값을 `#f4b000`으로 → [Patch] | 캔버스 버튼 4개 노드 · `style` 변경 0 (VP-11), 변수 줄만 바뀜. [Patch]는 무변경(실제 영역 patch 0줄, RV-4) | 〃 |
| A47 | VR-05 | 메인 선택 | 변수 상자를 Primary ↔ 「없음」으로 **20번 번갈아** 고름 | 끝난 뒤 상자 값 · 값 글자 · 칩 pressed가 마지막 선택과 일치 (Primary면 pressed 0 · 「Primary」, 없음이면 `#0052ff` · pressed 1), 콘솔 error 0, 상자 노드 같은 참조 | 〃 |
| A48 | VR-05 | 메인을 Primary에 연결한 상태 | 상자에서 **같은 Primary를 다시** 고름 (`input` 이벤트) | 렌더 0번 (`app-root` DOM 변경 0, 단위에서 `lastPatches` 그대로) | 〃 |
| A49 | VR-02 · 06 | b3를 Danger에 연결 | ① b3 [↓]/[↑]로 순서 바꿈 ② [인스턴스 생성]으로 b4 추가 ③ b1 삭제 ④ Danger 값 변경 | ①②③ 뒤에도 b3 연결 유지 (b3 버튼이 Danger 값을 따라 바뀜). b4는 새 인스턴스라 **메인을 따르고** Danger가 바뀌어도 안 바뀜 | 〃 |
| A50 | VR-02 · 06 | 메인을 Primary에 연결 | [인스턴스 생성]으로 b4 추가 후 Primary 값 변경 | b4도 메인을 따르므로 같이 바뀜 (b4 노드가 새로 만들어졌어도 푼 색 적용), 다른 버튼 규칙은 QA-66과 같음 | 〃 |
| A51 | VR-03 | 메인을 Primary에 연결 | Primary 값을 `#eef0f3`(아주 밝음) → `#0a0b0d`(아주 어두움) → `#777777` · `#787878`(경계) 순으로 바꿈 | 연결된 버튼 글자색이 푼 색 기준으로 바뀜: `#eef0f3` 먹 · `#0a0b0d` 흰 · `#777777` 흰 · `#787878` 먹 (task_005 대비 규칙, 푼 hex 기준) | 〃 |
| A52 | VR-07 | 변수를 바꾸고 연결도 하고 (Patch 안 함) | 페이지를 **새로고침** | 변수 · 연결 모두 처음 doc: Primary `#0052ff`, 메인 상자 「없음」, 실제 영역 처음 모습, 콘솔 error 0 (저장 안 됨) | 〃 |
| A53 | VR-07 | ① 메인을 Primary에 연결 + Primary `#f4b000` → Patch ② b3를 Danger에 연결 + Danger `#05b169` → Patch ③ 메인 상자 「없음」 + 칩 `#cf202f` → Patch | [실행 취소] 3번 → [다시 실행] 3번 (연타 포함) | 칸마다 두 영역 `areaSnapshot` 같음 · 변수 줄 3개 값 · 메인 · b3 선택 시 상자 값 · 값 글자가 **그 칸의 사본**과 일치 (연결과 변수 값 둘 다 칸마다 복원), 끝에서 꺼진 버튼 | 〃 |
| A54 | VR-06 | b3 선택(속성 패널 열림), b3 Danger에 연결 | Danger 값을 바꿈 (변수 색 입력칸 계속 `input`) | 선택은 b3 그대로, 속성 패널 색 입력칸 값 · 칸 값이 푼 색을 따라 바뀜(상자 · 이름 글자 그대로), 변수 입력칸에 포커스 유지 (노드 같은 참조), 렌더 1번 (VP-6) | 〃 |
| A55 | VR-04 · 07 | Patch 두 번 뒤 | **변수 색 입력칸에 포커스**하고 Ctrl+Z · Ctrl+Shift+Z | 실제 영역 [실행 취소] · [다시 실행]처럼 움직이고(두 영역 + 변수 줄 되돌림) 브라우저 기본 되돌리기는 막음 (task_005 A28의 색 입력칸 규칙과 같음) | 〃 |
| A56 | VR-01 | (단위) | `setVariableValue`에 형식 밖 값 `'blue'` · `'#fff'` · `''` · `'var:primary'` · `'#GGGGGG'`, 없는 id `'ghost'` · `''` | 모두 같은 Doc 객체 (변수 · `main` · `instances` 안 바뀜), 입력 동결해도 안 깨짐 | `model.test.ts` |
| A57 | VR-03 | (단위) | `resolveColor`에 `'var:ghost'` · `'var:'` · `'var:Primary'` · `'var:primary '` · `fallback`이 없는 id · `fallback`이 변수 값이 바뀐 `var:`, 빈 `variables` 배열 | 없는 id 규칙 순서대로: 메인 색(hex) → 풀린 값 → `#0052ff`. `var:primary`가 hex로 오해되지 않음(`isHexColor` false). 단위 `app.test.ts`에서 doc에 `var:ghost`를 직접 넣어 그려 보면 푼 색(메인 색 또는 `#0052ff`)으로 칠하고 변수 상자는 「없음」 | `color.test.ts` · `app.test.ts` |
| A58 | VR-05 | 메인 선택 + Primary 연결 (mobile 375x812 · desktop) | 속성 패널 · 레이어 창 · 변수 구역 가로 넘침을 잰다 | 변수 상자 · 이름 글자 · 변수 줄 어디에도 **가로 스크롤 없음** (`noHorizontalScroll` + `expectPanelsNoHorizontalOverflow` 확장으로 `variable-panel` 포함), 상자 · 입력칸 터치 목표 ≥ 32px | 〃 |

## 단위 테스트 (Vitest) 요약

| 번호 | 파일 | 확인 |
| --- | --- | --- |
| V-1 ~ V-5 | `model.test.ts` | 시작 변수 3개 · 기존 doc 함수가 `variables` 같은 참조 이어받음 · `setVariableValue` (새 Doc / 같은 Doc / 입력 불변) |
| RC-1 ~ RC-8 | `color.test.ts` | `resolveColor` 풀기 순서 · 없는 id · `varRef` · `varIdOf` · `isVarRef` |
| (canvas) | `canvas.test.ts` | 연결된 버튼만 푼 색으로 칠함, 연결 없는 출력은 기존과 같음, 값만 바뀐 두 번째 그리기의 patch (VP-2 · 3 · 4 · 6 캔버스 줄) |
| VP-1 ~ VP-12 | `app.test.ts` | patch 줄 수 표 (dev_todo 「patch 줄 수 기대 표」), `slot(0)` · 렌더 횟수 · 노드 같은 참조 |
| RV-1 ~ RV-4 | `preview.test.ts` | 실제 영역 patch (푼 hex만, `var:` 없음, 무변경 Patch는 기록 안 쌓임) |
| PD-6 · U-8 | `previewDocs.test.ts` · `app.test.ts` | doc 사본에 `variables`가 같은 참조로 들어감, [실행 취소] · [다시 실행]이 변수 값 · 연결을 사본으로 복원 (렌더 1번) |
| (기존 수정) | `rootOnlyHooks.test.ts` · `app.test.ts` · `model.test.ts` · `previewDocs.test.ts` | 「깨질 기존 단언」 5건 (런타임 3 · tsc 7곳) |

---

## 테스트 케이스 요약 (사용자 확인용)

| 번호 | 한 줄 설명 | 종류 |
| --- | --- | --- |
| QA-63 | 처음 화면: 레이어 아래 「변수」 구역에 3줄(Primary · Danger · Success), 값 `#0052ff` · `#cf202f` · `#05b169`, 버튼 색은 그대로 | 인수 e2e |
| QA-64 | 메인 · 인스턴스를 고르면 색 구역에 「변수」 선택 상자(없음 · Primary · Danger · Success), 처음은 「없음」 | 인수 e2e |
| QA-65 | 메인을 Primary에 연결 → 칩 선택 표시 없음, 이름 「Primary」 표시, 버튼 색은 그대로 | 인수 e2e |
| QA-66 | 메인을 Primary에 연결하고 Primary 값을 `#f4b000`으로 → **메인 + 따르는 인스턴스만** 바뀜, 색을 따로 고른(override) 인스턴스 · b3는 그대로 | 인수 e2e |
| QA-67 | b3를 Danger에 연결하고 Danger 값을 바꾸면 **b3만** 바뀜 (다른 버튼 변화 0) | 인수 e2e |
| QA-68 | 연결 중 팔레트 칩(같은 색이라도)을 누르면 연결이 풀리고 이후 변수 값이 안 따라옴 | 인수 e2e |
| QA-69 | 연결 중 「색 직접 고르기」 입력칸으로 색을 고르면 연결이 풀림 | 인수 e2e |
| QA-70 | 변수 상자에서 「없음」을 고르면 지금 색 그대로 두고 연결만 풀림 | 인수 e2e |
| QA-71 | b3 ↻(되돌리기) → 메인 색을 따름 (메인이 변수에 연결이면 변수 값을 따라감) | 인수 e2e |
| QA-72 | 변수 값 변경 후 [Patch] → 실제 영역에 **푼 색(hex)** 이 들어가고 `var:` 글자는 없음 | 인수 e2e |
| QA-73 | [실행 취소] = 변수 값 · 연결까지 **두 영역** 되돌림, [다시 실행] = 다시 적용 | 인수 e2e |
| QA-74 | Patch 안 한 변수 · 연결 편집은 [실행 취소] 때 버려짐 | 인수 e2e |
| QA-75 | 기존 task_004 ~ 006 동작이 그대로 (기존 e2e 전체 회귀) | 인수 e2e + 회귀 |
| QA-76 | 변수 구역 배치: desktop 사이드바 안 · mobile 가로 스크롤 없음 · 터치 목표 32px 이상 | 인수 e2e |
| A43 | 변수 값 연타(6번 연속 input) → 마지막 값만 남고 모두 일치, 오류 없음 | 공격 e2e |
| A44 | 같은 값을 다시 입력 → 렌더 · DOM 변화 0 | 공격 e2e |
| A45 | 값 바꿨다 원래대로 → [Patch]는 무변경 (기록 안 쌓임) | 공격 e2e |
| A46 | 아무것도 연결 안 한 채 변수 값 변경 → 캔버스 버튼 변화 0, Patch 무변경 | 공격 e2e |
| A47 | 연결 ↔ 없음 20번 번갈아 → 표시가 마지막 선택과 일치 | 공격 e2e |
| A48 | 같은 변수를 다시 고름 → 렌더 0 | 공격 e2e |
| A49 | 연결된 b3를 이동 · 추가 · 삭제해도 연결 유지, 새 인스턴스(b4)는 메인을 따름 | 공격 e2e |
| A50 | 메인이 연결된 상태에서 추가한 b4도 변수 값을 따라 바뀜 | 공격 e2e |
| A51 | 변수 값을 아주 밝게 · 어둡게 · 경계(`#777777` · `#787878`) → 글자색이 푼 색 기준으로 흰 ↔ 먹 | 공격 e2e |
| A52 | 변수 · 연결을 바꾸고 새로고침 → 처음 상태 | 공격 e2e |
| A53 | Patch 3번 쌓고 [실행 취소] ×3 · [다시 실행] ×3 → 칸마다 연결 · 값이 그 칸 모습 | 공격 e2e |
| A54 | b3 선택 중 Danger 변경 → 선택 · 포커스 유지, 속성 패널 색 값이 따라 바뀜 | 공격 e2e |
| A55 | 변수 색 입력칸 포커스에서 Ctrl+Z · Ctrl+Shift+Z = [실행 취소] · [다시 실행] | 공격 e2e |
| A56 | 형식 밖 값(`blue` · `#fff` · 빈 글자 · `var:…`) · 없는 변수 id로 값 바꾸기 = 아무 일 없음 | 공격 단위 |
| A57 | 없는 id · 빈 id · 대소문자 다른 id는 메인 색 → `#0052ff`로 풀림, `var:…`는 hex로 오해되지 않음 | 공격 단위 |
| A58 | 연결 상태에서 desktop · mobile 가로 넘침 없음 (변수 상자 · 변수 줄 포함) | 공격 e2e |
| V-1 ~ V-5 | 시작 변수 · doc 함수 `variables` 이어받기 · 값 바꾸기(새 Doc / 같은 Doc / 입력 불변) | 단위 |
| RC-1 ~ RC-8 | `resolveColor` 풀기 순서 · 연결 표현 함수 | 단위 |
| VP-1 ~ VP-12 | patch 줄 수 표 (연결 · 값 변경 · 풀림 · ↻ · 같은 값 0 · 연타) | 단위 |
| RV-1 ~ RV-4 | 실제 영역 patch (푼 hex만, 무변경 Patch) | 단위 |
| PD-6 · U-8 | doc 사본에 변수가 들어가 되돌리기로 복원 | 단위 |
