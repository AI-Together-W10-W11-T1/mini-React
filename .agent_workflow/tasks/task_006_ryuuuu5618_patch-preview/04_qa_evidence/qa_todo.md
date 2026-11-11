# qa_todo: patch-preview

- 명세: `../01_request_spec.md` (PP-01 ~ 12) · Dev 목록: `../03_development/dev_todo.md`
- **PP → QA 연결**: PP-01 = QA-46 (계획 A37) / PP-02 · 03 = QA-47 / PP-04 = QA-48 ~ 51 · A30 · A32 (계획 A33 · A35) / PP-05 = QA-47 · 51 · A32 / PP-06 = QA-52 · 53 · A30 · A31 (계획 A34 · A35 · A36, A36은 단위) / PP-07 = QA-47 · 52 · 54 · QA-31(toolbar) / PP-08 = QA-48 · 49 · 52 / PP-09 = QA-54 + 단위 `rootOnlyHooks.test.ts` · `app.test.ts` / PP-10 = QA-54 + 기존 e2e 회귀 / **PP-11 = QA-52 · 54 · A31(단축키 경로) · 기존 A8 · A10 · A28(Ctrl+Z가 실제 영역 [실행 취소])** / **PP-12 = QA-19 ~ 25 · 29 · 30 · 32 · 33 · A9 · A15 · A17 · A19 · A20 · A21 · A25 · A27 삭제, QA-54 · 31 · 34 · A6 · A8 · A10 · A18 에서 「앱 [↶] [↷] · 앱 Undo 없음」 단언 (아래 「바뀌는 기존 단언」)**
- 실행: `npx playwright test e2e/mini-figma-preview.spec.ts` (desktop 1280x800 · mobile 375x812 두 프로젝트, 모든 시나리오가 두 프로젝트에서 돈다). 기존 Phase 1 · 2 e2e와 task_004 · 005 e2e(`mini-figma-*.spec.ts`)는 회귀로 모두 통과해야 한다 (아래 「바뀌는 기존 단언」만 고침)
- 시나리오 하나 = `e2e/*.spec.ts` 테스트 하나. 테스트 이름은 시나리오 문장 그대로. **번호는 task_005에서 이어 쓴다** (새 인수 = QA-46 ~ , 새 공격 = QA-A30 ~ )
- 근거 ID: 이 task의 `PP-xx` · task_004 `MF-xx` · task_005 `FD-xx` · Diff 기본 케이스 `D-01 ~ 05`(앱 화면에서 본 대응. 엔진은 안 바꾸므로 엔진 단위 테스트가 회귀로 덮음)
- **공통 확인 (모든 스펙 · 모든 테스트)**: 콘솔 `error`가 한 건이라도 있으면 실패, 선언 안 한 dialog가 뜨면 실패 (`phase1-helpers.ts`의 `test` 확장 재사용)
- 노드 참조 · DOM 변경 관찰은 task_004와 같음 (`holdNodes` · `sameNode` · `watchSel`). 이번에는 **실제 영역 상자만** 따로 관찰한다: `watchSel(page, 'real', '[data-testid="real-area"]')` (깜빡임 층은 상자 밖 형제라 섞이지 않는다)
- **깜빡임은 시간에 기대는 효과라 사라지는 시간은 단언하지 않는다.** 도우미 `watchFlash(page)`가 `real-overlay`에 박스(`.viz-box`)가 **생길 때마다** 그 위치 · 크기를 기록해 두고, 시나리오는 「박스가 생겼다 · 바뀐 노드 위에 있다 · 안 바뀐 노드 위에는 없다」만 본다 (층의 `data-last-patch-count` · `data-last-flash-count`도 같이 확인)
- 두 영역 비교 도우미 `areaSnapshot(page, 'test' | 'real')`: 버튼마다 `{ id(data-id), label, icon, class(selected 뺌), 배경색, 글자색 }` 목록. 두 영역이 「같은 모습」이라는 말은 이 목록이 같다는 뜻이다 (testid · `selected`는 일부러 다르다)
- Playwright 사실: 실제 영역 상자는 `inert`라 Playwright 기본 `click()`이 「누를 수 없음」으로 기다리다 실패한다 → 「눌러도 반응 없음」 시나리오는 `click({ force: true })`(가운데 좌표를 눌러 상자 밑으로 통과). 꺼진 버튼에 `click({ force: true })`를 해도 `click` 이벤트는 오지 않는다 (task_005 QA-A20과 같음)

## 화면 약속 (`data-testid` · 표시 상태) — task_005 표에서 더해지는 것

| 영역 | testid | 설명 |
| --- | --- | --- |
| 영역 상자 최상위 | `app-root` > `div.app` | 자식 5개: `toolbar` · `layer-panel` · `canvas` · `property-panel` · **`real-section`**. 앞 네 개의 경로 접두 `[0,0]` ~ `[0,3]` 불변, `real-section` = `[0,4]`. 자리는 CSS (desktop = 가운데 열 아래, mobile = 캔버스 다음) |
| 테스트 영역 제목 | `test-area-title` | `canvas`의 첫 자식 `<h2>` 「테스트 영역」 (캔버스 안 경로 +1) |
| 실제 영역 구역 | `real-section` · `real-title` | 구역 전체 · 머리글 `<h2>` 「실제 영역」 |
| 버튼 3개 | `patch-button` · `back-button` · `forward-button` | 「Patch」(파랑 알약) · 「실행 취소」 · 「다시 실행」(보조 알약). 처음 = Patch 켜짐, 실행 취소 · 다시 실행 `disabled`. **자리 = 도구 막대** (앱 이름 · [+ 인스턴스] · [실행 취소] · [다시 실행] · [Patch] 순서, PP-07 변경). 실제 영역 머리글(`real-title`)은 제목만. 도구 막대의 앱 Undo/Redo 버튼(`undo-button` · `redo-button`)은 **없다** (PP-12) |
| 영역 상자 | `real-area` | 미니 React가 그리는 **자식 없는 빈 요소**, `inert` 속성. 안 내용은 엔진이 채움 |
| 깜빡임 층 | `real-overlay` | 상자 밖 빈 요소(상자와 같은 크기, 마우스 안 받음). 박스 `.viz-box`가 생김. `data-last-patch-count` · `data-last-flash-count` |
| 실제 영역 안 복사본 | 테스트 영역 testid 앞에 `real-` | `real-canvas-main` · `real-canvas-instances` · `real-figma-button`(`data-id` 그대로) · `real-btn-label` · `real-btn-icon`. **테스트 영역 testid(`figma-button` 등)와 `selected` 클래스는 복사본에 없다** |

## 바뀌는 기존 단언 (이름이 같은 시나리오 · 테스트의 단언만 고침 — 뜻은 그대로)

| 시나리오 · 테스트 | 전 | 후 |
| --- | --- | --- |
| QA-1 (render, e2e) | 최상위 `kids: ['toolbar','layer-panel','canvas','property-panel']` · 영역 글에 `patch` 없음(MF-05) | `kids`에 `'real-section'`이 5번째로 더해짐. `patch` 글 단언은 「`log-` testid 없음 + `patch`라는 글은 `patch-button` 하나뿐」으로 (PP-07이 「Patch」 버튼을 더하므로 글 전체 검사는 못 한다. MF-05 「patch 목록 · 줄 수를 안 보여 줌」의 뜻은 그대로) |
| QA-2 (render) · QA-42 (design) 배치 | desktop: 레이어 · 캔버스 · 속성이 같은 줄 · mobile: 도구 막대 → 레이어 → 캔버스 → 속성 | desktop: **그대로**(캔버스는 가운데 열 위 칸, 시작 y가 레이어와 같음). mobile: 캔버스 → **실제 영역** → 속성 순서 한 줄 추가 (`canvas.bottom ≤ real.y`, `real.bottom ≤ prop.y`) |
| QA-43 (design) 전체 높이 | 캔버스가 남은 높이를 모두 씀(높이 > 500, 아래 끝이 화면 아래 20px 안) | 가운데 열 = 캔버스(위) + 실제 영역(아래)이 남은 높이를 **나눠** 씀: 캔버스 y는 도구 막대 아래 20px 안, **실제 영역 아래 끝**이 화면 아래 끝 20px 안, 캔버스 아래 끝 ≤ 실제 영역 y, 두 높이 각각 ≥ 250 · 차이 ≤ 40. 레이어 · 속성은 그대로 화면 아래까지. 페이지 세로 스크롤 없음 그대로. mobile = 그대로(캔버스 높이 ≥ 320) |
| QA-44 (design) 넘침 | 세 영역(레이어 · 캔버스 · 속성)의 아래 끝이 화면 아래 20px 안 | 세 영역 → **레이어 · 실제 영역 · 속성**(캔버스는 가운데 열 위 칸이라 제외). 캔버스 · 레이어 안쪽 스크롤 단언(`scrollHeight > clientHeight`, 끝 버튼 클릭 → `scrollTop > 0`)은 그대로 (캔버스가 낮아져 더 쉽게 성립) |
| `expectPanelsNoHorizontalOverflow` (design) | 레이어 · 캔버스 · 속성 | + `real-section` |
| `app.test.ts` 시작 화면 | `Array.from(area().children).map(testId)` = 4개 | 5개 (`real-section` 추가). `[0,1,2,3]` 접두 지킴 줄은 그대로 |
| `app.test.ts` Hook 개수 | `instance.hooks` 길이 5 · 「useState 4칸 + useEffect 1칸」 | 길이 **7** (doc · selectedId · nextId · 보관함 `useMemo` · 초기화 `useEffect` · `nav` `useState` · keydown `useEffect`). `nav` = `slot(5)`, 앱 Undo `history` 칸은 PP-12로 빠졌으므로 nextId = `slot(2)`. 처음 계획의 「8칸 · `slot(7)`」은 PP-12 반영 전 값 |
| `app.test.ts` 화면에 patch 없음 (MF-05) | `root.textContent`에 `patch` 없음 | `patch-button` 글자를 뺀 나머지에 `patch` 없음 + `log-` testid 없음 |
| `app.test.ts` `B2_PATH` (P-10 · 12 · 13 · 14) | `[0,2,1,1]` | `[0,2,2,1]` (캔버스 제목 한 칸 — B 단계에서 `[0,2,2,1,1]` 오기를 바로잡음). patch 종류 · 개수 단언은 그대로 |
| `rootOnlyHooks.test.ts` | 컴포넌트 7개 · 순수 모듈 `model` `undo` `keys` `color` | 컴포넌트 **8개**(`PreviewPanel.ts`), 순수 모듈 `model` `keys` `color` + `previewVNode` · `previewNav` (**`undo.ts` 삭제**, PP-12), `preview.ts` Hook 없음 |
| `undo.test.ts` · `undo.ts` · `e2e/mini-figma-undo.spec.ts` | 앱 편집 Undo 모델 · 시험 | **파일 삭제** (PP-12). 되돌리기는 State History(`previewNav` · 실제 영역)가 맡음 |
| `keys.test.ts` | 동작 `'undo'` · `'redo'` | `'back'` · `'forward'` (규칙 표 그대로) |
| **삭제된 기존 QA / A** (앱 Undo 전용, PP-12) | QA-19 ~ 25 (`mini-figma-undo.spec.ts` 통째) · 29 · 30 · 32 · 33 (`toolbar`) · A9 · A15 · A17 · A19 (`attack`) · A20(2건) · A21 (`toolbar`) · A25 (`palette`) · A27 (`attack`) | 삭제 (뜻이 남는 것은 State History 시나리오 QA-52 · 54 · A31이 맡음) |
| **단언이 바뀐 기존 QA / A** | QA-1 (render) | 시작 때 `undo-button` · `redo-button` 꺼짐 → `back-button` · `forward-button` 꺼짐 + `undo-button` 0개 (위 QA-1 행의 kids · patch 글 변경과 함께) |
| 〃 | QA-40 (design) | 모서리 · 글꼴 검사 대상 `undo-button` → `back-button`, `undo-button` · `redo-button` 모서리 100px → `back-button` · `forward-button` |
| 〃 | QA-A26 (design) | 도구 막대 버튼 3개 → 4개([+ 인스턴스] · [실행 취소] · [다시 실행] · [Patch]) 화면 안 · 눌러지는 크기, [↶] 켜짐 단언 → [Patch] 켜짐 |
| 〃 | QA-31 (toolbar) | 도구 막대 순서 = 앱 이름 · [+ 인스턴스] · [실행 취소] · [다시 실행] · [Patch], [실행 취소] [다시 실행] 꺼짐 · [Patch] 켜짐 · [↶] [↷] 없음 |
| 〃 | QA-34 (toolbar) · QA-37 (palette) · A13 · A14 (attack) · A22 · A24 (palette) | Undo(`[↶]` 켜짐 · Ctrl+Z) 단언만 제거 |
| 〃 | A6 (attack) | Delete로 선택이 풀리는 것만 (Undo · Redo 풀림 제거) |
| 〃 | A8 · A10 (attack) · A28 (palette) | Ctrl+Z · Ctrl+Shift+Z → 실제 영역 [실행 취소] · [다시 실행] (라벨 글자 칸 안은 안 움직임, 선택 상자 · 체크박스 · 색 입력칸은 움직임 + 막음 / A10은 키 핸들러가 옛 state를 안 읽고 리스너 1개) |
| 〃 | A18 (attack) | 「추가 → Undo → 추가 = b5」 → 「추가 → 삭제 → 추가 = b5 · b6」 |
| 그 밖 (위에 없는 QA-1 ~ 45 · A1 ~ A29, 단위 P-1 ~ 28 접두 · 개수) | — | 단언 변화 없음 (회귀로 그대로 통과). 단위 `app.test.ts`는 Undo 전용 테스트가 삭제 · 전환됨 (상세 = `dev_todo.md` Dev-7 근거) |

## patch 기대 표 — 실제 영역 (`preview.test.ts`가 `observe`로 센 값 · 한 번 Patch)

실제 영역은 이벤트 · key가 DOM에서 안 읽히므로 `SET_EVENT`가 없고(걸러 낼 필요 없음) 순서 바꾸기는 `MOVE`가 아니라 위치 비교다. 경로는 영역 상자 안 자식부터: 메인 `[0,0]` · b1 `[1,0]` · b2 `[1,1]` · b3 `[1,2]`.

| # | 테스트 영역에서 한 일 → [Patch] | 실제 영역 patch | 근거 |
| --- | --- | --- | --- |
| R-1 | 아무것도 안 함 | 없음 — 기록 안 쌓임 (`update` 거짓) | PP-04 |
| R-2 | b2 고르기만 (`selected` 클래스 + 레이어 · 속성 변화) | 없음 — `selected`는 정리에서 빠지므로 같은 VNode → 기록 안 쌓임 | PP-05 |
| R-3 | 메인 라벨 `버튼!` | `{ SET_TEXT: 2 }` (메인 · b1, b2 · b3는 override) | D-01 |
| R-4 | 메인 크기 `L` | `{ SET_ATTR: 4 }` (class) | D-02 |
| R-5 | 메인 색 `#05b169` | `{ SET_STYLE: 6 }` (메인 · b1 · b2 × 배경 + 글자색 흰 → 먹) | D-02 |
| R-5b | 메인 색 `#cf202f` | `{ SET_STYLE: 3 }` (배경만 — b3는 이미 같은 값). 한 줄: `background-color` · before `#0052ff` · after `#cf202f` | D-02 |
| R-6 | 메인 아이콘 켜기 | `{ SET_ATTR: 12, SET_TEXT: 4, INSERT: 4 }` (key가 없어 위치 비교: 0번 글자 span이 아이콘으로 바뀌고 글자 span은 1번에 새로 생김. B 단계 실제 출력으로 정정, 전 `{ INSERT: 4 }`) | D-03 |
| R-7 | (R-6 Patch 뒤) 아이콘 끄기 | `{ SET_ATTR: 12, SET_TEXT: 4, REMOVE: 4 }` (B 단계 정정, 전 `{ REMOVE: 4 }`) | D-04 |
| R-8 | (R-6 Patch 뒤) 종류 `♥` | `{ SET_TEXT: 4 }` | D-01 |
| R-9 | [+ 인스턴스] | `{ INSERT: 1 }` — 경로 `[1,3]` | D-03 |
| R-10 | b3 삭제 | `{ REMOVE: 1 }` | D-04 |
| R-11 | b1 삭제 (key가 없어 위치 비교) | `{ SET_ATTR: 2(data-id), SET_TEXT: 2, SET_STYLE: 1, REMOVE: 1 }` — 값은 개발에서 실제 출력으로 확인해 표를 고친다 | D-04 + 위치 비교 |
| R-12 | b1 ↓ (b1 · b2 순서 바꿈) | `{ SET_ATTR: 2(data-id), SET_TEXT: 2 }` — `MOVE` 없음 | 위치 비교 |
| R-13 | 테스트 영역 DOM을 직접 고쳐 `span.btn-label` → `em` (단위 테스트에서만) | `{ REPLACE: 1 }` | D-05 |

## 인수 시나리오 (새)

| QA | 근거 ID | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| QA-46 | PP-01 · FD-06 · FD-08 | `/mini-figma/`를 처음 연다 | 위치를 잰다 | 두 영역 모두 머리글 글자가 있다: `test-area-title` 「테스트 영역」 · `real-title` 「실제 영역」. **desktop**: 캔버스와 `real-section`이 가운데 열에서 x · 폭이 같고(±1) 캔버스가 위 · 실제 영역이 아래(`canvas.bottom ≤ real.y + 1`), 레이어 · 속성은 두 영역의 합만큼 세로로 길어 아래 끝이 `real-section` 아래 끝과 ±1, 가로 스크롤 · 페이지 세로 스크롤 없음. **mobile**: 도구 막대 → 레이어 → 캔버스 → 실제 영역 → 속성 순으로 세로, 가로 스크롤 없음 | `e2e/mini-figma-preview.spec.ts` |
| QA-47 | PP-02 · 03 · 05 · 07 | 처음 연다 | 실제 영역과 버튼 3개를 본다 | `real-area` 안에 버튼 4개(메인 + b1 · b2 · b3), `areaSnapshot` real = test (글자 버튼 · 버튼 · 취소 · 삭제, 배경 `rgb(0, 82, 255)` ×3 + `rgb(207, 32, 47)`, 글자 흰색, 크기 M). 레이어 · 속성 · 도구 막대 요소는 실제 영역 안에 0개. **테스트 영역 testid(`figma-button` · `btn-label` · `canvas-main` …)가 실제 영역 안에 0개** (`real-` 접두만 있음), `figma-button` 전체 수는 4 그대로, `selected` 클래스 0개. `real-area`에 `inert` 속성. [Patch] 켜짐 · [실행 취소] [다시 실행] `disabled`. [Patch] 배경 `rgb(0, 82, 255)` · 글자 흰색 · 모서리 `100px`, [실행 취소] [다시 실행] 모서리 `100px`(보조), 그림자 `none`. 파랑 알약 버튼(`.btn-primary`)은 [+ 인스턴스] · [Patch] **둘뿐** (캔버스의 `figma-button`은 사용자 색이라 세지 않음) | 〃 |
| QA-48 | PP-04 · 08 · D-01 | 메인을 고르고 라벨을 `확인`으로 쓴다 (실제 영역 버튼 노드 · 박스 기록을 붙잡아 둠) | ① [Patch] 누르기 전 ② [Patch] | ① 테스트 영역 글자는 `확인 · 확인 · 취소 · 삭제`, **실제 영역은 아직 `버튼 · 버튼 · 취소 · 삭제`** (DOM 변경 0). ② 실제 영역 글자 = `확인 · 확인 · 취소 · 삭제`, 실제 영역 버튼 노드는 모두 같은 참조, 변경 = **characterData 2건**(메인 · b1 글자) · childList 0 · attributes 0. 박스가 2개 생겼고(`data-last-flash-count` = 2 = `data-last-patch-count`) 각 박스가 메인 · b1 버튼 영역 **안**에 있으며 b2 · b3 버튼과는 안 겹침. 테스트 영역은 그대로(선택 · 속성 패널 그대로) | 〃 |
| QA-49 | PP-04 · 08 · D-02 | 메인을 고르고 칩 `#cf202f`를 누른다 (실제 영역 버튼 노드 · 박스 기록을 붙잡아 둠) | ① [Patch] ② 이어서 크기 `L`을 고르고 [Patch] | ① 실제 영역 메인 · b1 · b2 배경 `rgb(207, 32, 47)`(b3는 원래 빨강이라 그대로), 실제 영역 버튼 노드 모두 같은 참조, 변경은 attributes 3건뿐(childList · characterData 0), 박스 3개(`data-last-flash-count` = 3)가 각각 **메인 · b1 · b2 버튼 영역과 ±2px 일치**(색만 바뀌어 크기가 안 변하므로 잴 수 있음), b3 버튼 위에는 박스 없음. ② 실제 영역 버튼 4개가 모두 `btn-L`, attributes 4건(class) · 박스 4개, 버튼 노드 같은 참조. 두 단계 모두 `areaSnapshot` real = test | 〃 |
| QA-50 | PP-04 · D-03 · D-04 | 처음 연다 | [+ 인스턴스] → [Patch] → 메인 아이콘 켜기 → [Patch] → 아이콘 끄기 → [Patch] → b4 고르고 Delete → [Patch] | 단계마다 [Patch] 직후 `areaSnapshot` real = test. 추가: 실제 영역 인스턴스 줄 childList 1건(버튼 +1, 노드 b1 ~ b3 같은 참조). 아이콘 켜기: 버튼 5개에 아이콘 span이 글자 앞에 생김(글자 span 노드 같은 참조). 끄기: 아이콘 사라짐. 삭제: 버튼 4개로, 앞 버튼 노드 같은 참조. 각 단계 [실행 취소]가 켜져 있음 | 〃 |
| QA-51 | PP-04 · 05 (무변경 = 기록 안 함) | b2를 고른다(`selected`만 바뀜) | [Patch], 이어서 [Patch] 5번 더 | 실제 영역 DOM 변경 0, 박스가 한 번도 안 생김(`watchFlash` 기록 0건), **[실행 취소] 계속 `disabled`**(기록 안 쌓임), 실제 영역에 `selected` 클래스 0개. 선택 · 속성 패널은 그대로 | 〃 |
| QA-52 | PP-06 · 08 · 11 · History 동기화 | 라벨 `확인` → [Patch] (A), 크기 `L` → [Patch] (B) 까지 해서 기록이 3칸(처음 · A · B) | [실행 취소] → [실행 취소] → [다시 실행] → [다시 실행] | 매 단계 실제 영역이 그 기록 모습: B(크기 L · `확인`) → [실행 취소] = A(크기 M · `확인`) → [실행 취소] = 처음(`버튼`, M) → [다시 실행] = A → [다시 실행] = B. **테스트 영역 · 앱 상태는 그대로**: 내내 테스트 영역은 B 모습(크기 L · `확인`), 속성 패널 값(크기 `L` · 라벨 `확인`) 그대로. 버튼 켜짐(Patch 두 번 직후 = [Patch] 켜짐 · [실행 취소] 켜짐 · [다시 실행] 꺼짐): 처음 기록 = [실행 취소] 꺼짐 · [다시 실행] 켜짐, 끝 = 반대, 가운데 = 둘 다 켜짐. 실제 영역 버튼 노드는 같은 참조. 이동마다 박스 ≥ 1개 생김. **이어서 같은 기록을 단축키로도**: Ctrl+Z ×2 → 처음, Ctrl+Shift+Z ×2 → B (버튼과 같은 모습 · 같은 버튼 켜짐 · 테스트 영역 불변) | 〃 |
| QA-53 | PP-06 | 라벨 `확인` → [Patch] (A), 크기 `L` → [Patch] (B) 후 [실행 취소] (실제 영역 = A, 테스트 영역 = B) | 테스트 영역은 그대로 둔 채 [Patch] | 실제 영역이 B 모습이 되고(새 기록), **앞쪽(원래 B) 기록은 버려져 [다시 실행] `disabled`**. [실행 취소] 두 번 = A → 처음, 그 뒤 [실행 취소] 꺼짐 (기록 = 처음 · A · 새 B 3칸) | 〃 |
| QA-54 | PP-10 · 06 · 09 · 11 · 12 | b1을 고른 상태(속성 패널에 「인스턴스 · 버튼」) | ① 실제 영역 b2 버튼을 `click({ force: true })`, 포커스 시도, Enter · Space ② 편집(색 `#cf202f`) → [Patch] 뒤 Ctrl+Z · Ctrl+Shift+Z, [실행 취소] 버튼 → Ctrl+Shift+Z, 그 뒤 Ctrl+Z를 두 번 더 | ① 선택 · 속성 패널 제목 · 레이어 선택 · 두 영역 DOM 모두 그대로(변경 0), 실제 영역 안 요소가 포커스를 못 받음(`activeElement`가 `real-area` 안이 아님). ② **Ctrl+Z = 실제 영역 [실행 취소]**: 실제 영역 b1이 처음 색(파랑)으로 돌아가고 버튼 상태 = [실행 취소] 꺼짐 · [다시 실행] 켜짐. **테스트 영역 · 선택(b1) · 속성 패널 제목은 그대로**(빨강 유지). **Ctrl+Shift+Z = [다시 실행]**: 실제 영역이 [Patch] 직후 모습(빨강)으로, 버튼 상태 = [실행 취소] 켜짐 · [다시 실행] 꺼짐. [실행 취소] 버튼 → 파랑, 이어서 Ctrl+Shift+Z → 빨강 (버튼과 단축키가 같은 기록). **앱 편집 Undo는 없다**: `undo-button` 0개, 끝에서 Ctrl+Z를 두 번 더 눌러도 테스트 영역 b1은 빨강 그대로 | 〃 |

## 공격적 시나리오 (새)

> **e2e로 만든 것은 QA-A30 ~ A32뿐** (`mini-figma-preview.spec.ts`). **QA-A33 ~ A37은 이번 범위에서 e2e를 만들지 않았다** (사용자 「빠르게」). 한도 50(A36)은 단위 `preview.test.ts`(55번 Patch → back 정확히 49번) · `previewNav.test.ts`가 맡고, 나머지(A33 · A34 · A35 · A37)는 단위로도 e2e로도 같은 모양의 시험이 아직 없다. 아래 표의 A33 ~ A37 행은 계획 기록으로 남긴다 (`01_request_spec.md` 구현 제외 범위 아님, 후속 보강 후보).

| QA | 시나리오 | Then | 근거 ID | 스펙 파일 |
| --- | --- | --- | --- | --- |
| QA-A30 | [Patch] 연타: ① 편집 없이 20번 ② 라벨을 바꾼 뒤 [Patch]를 20번 (`click` 연속) | ① 기록 0칸([실행 취소] 꺼짐), 실제 영역 변경 0, 오류 없음. ② 기록 **1칸만**(첫 번째만 변경, 나머지 19번은 무변경) → [실행 취소] 한 번이면 처음 모습, 그 뒤 [실행 취소] 꺼짐. 두 영역(테스트 영역 vs 지금 기록) 일치 | PP-04 · 06 | `e2e/mini-figma-preview.spec.ts` |
| QA-A31 | [실행 취소] · [다시 실행] 연타: Patch 3번 쌓고 [실행 취소]를 10번 연속(3번째에서 `disabled`, 4 ~ 10번째는 `click({ force: true })`), 이어서 [다시 실행] 10번, 마지막으로 **단축키 연타** Ctrl+Z 10번 · Ctrl+Shift+Z 10번 | 한 번에 한 칸만 움직임, 처음 · 끝에서 멈춤(4번째부터 DOM 변경 0 · 박스 없음), 도중 오류 없음, 끝에서 실제 영역 = 마지막 Patch 모습. 단축키 연타도 버튼과 같은 기록을 한 칸씩 움직임. 연타 도중 버튼 켜짐 · 꺼짐이 실제 기록 위치와 어긋나지 않음(처음 = [실행 취소] 꺼짐, 끝 = [다시 실행] 꺼짐) | PP-06 · 11 | 〃 |
| QA-A32 | 특수문자 라벨: 메인 라벨 `<b>x</b> &amp; "q" 'a' 😀` → [Patch] | 실제 영역 글자가 입력 그대로 **글자로** 표시(실제 영역 안 `b` 요소 0개, `real-btn-label` 글자 = 입력), 테스트 영역 글자와 같음. [실행 취소]하면 `버튼`으로 돌아감 | PP-04 · 05 | 〃 |
| QA-A33 | 빈 입력: 메인 라벨을 모두 지우고(빈 글자) [Patch] → [실행 취소] | 실제 영역 메인 · b1 글자 span이 **빈 글자로 남음**(노드 제거 아님), 오류 없음, [실행 취소] = `버튼` 복원, 테스트 영역 그대로 | PP-04 | 〃 |
| QA-A34 | 새로고침: 편집 · [Patch] · [실행 취소] 뒤 `page.reload()` | 실제 영역 = 처음 모습(테스트 영역과 같음), 기록 비어 있음([실행 취소] · [다시 실행] 꺼짐), 오류 없음 (기록은 저장 안 함) | PP-03 · 06 | 〃 |
| QA-A35 | 구조 바꾸기를 섞어서: [+ 인스턴스] → [Patch] → b1 [↓] → [Patch] → b2 삭제 → [Patch] → 라벨 · 색 → [Patch]. 이어서 [실행 취소]를 끝까지, [다시 실행]를 끝까지 | 단계마다 [Patch] 직후 `areaSnapshot` real = test(순서 · 개수 · 글자 · 색). [실행 취소]를 끝까지 하면 처음 모습(버튼 4개 · 원래 순서 · 글자), [다시 실행]를 끝까지 하면 마지막 모습. 각 이동 뒤 두 영역 중 실제 영역은 그 기록의 모습과 같고 테스트 영역은 그대로 (순서 바꾸기는 위치 비교라 `MOVE`가 아님 — 모습만 맞으면 됨) | PP-04 · 06 · D-03 · D-04 | 〃 |
| QA-A36 | 한도 50: [+ 인스턴스] → [Patch]를 55번 반복 → [실행 취소]를 계속 누른다 | **정확히 49번째 [실행 취소]에서 `disabled`**(기록 50칸), 가장 오래된 6칸(처음 포함)은 이미 빠져 처음 모습(b1 ~ b3)이 아니라 **b1 ~ b9 모습**(버튼 10개)에서 멈춤. 마지막 [실행 취소] 뒤 앞으로 49번 → 끝(b1 ~ b58 모습). 앱이 센 켜짐 상태와 엔진 이동이 끝까지 안 어긋남(꺼진 버튼을 눌러도 아무 일 없음). 느린 시나리오(≈ 110번 클릭) | PP-06 (한도 50) | 〃 |
| QA-A37 | 인스턴스를 많이 더한 뒤(60번) [Patch]: 메인 크기 `L` → [+ 인스턴스] 60번 → [Patch] → 좁은 화면 · 긴 라벨(`'A'.repeat(200)`) | **desktop**: 페이지 세로 · 가로 스크롤 없음, `real-section` 안쪽에서 스크롤(`overflow-y` `auto`, `scrollHeight > clientHeight`), 레이어 · 실제 영역 · 속성 아래 끝이 화면 아래 20px 안. **mobile**: 가로 스크롤 없음. 두 크기 모두 실제 영역 버튼의 오른쪽 끝이 `real-area` 오른쪽 끝을 넘지 않음. 깜빡임 박스가 실제 영역 구역 밖으로 페이지를 넘치게 만들지 않음 | PP-01 · 08 · FD-06 · 08 | 〃 |

## 필수 확인
- [x] Diff 기본 케이스 D-01 ~ 05: D-01 = R-3 · QA-48, D-02 = R-4 · 5 · QA-49, D-03 = R-6 · 9 · QA-50, D-04 = R-7 · 10 · QA-50, **D-05(교체) = R-13(단위, 이 모듈 단위로만)** — 캔버스 흐름에는 노드 종류가 바뀌는 장면이 없다. 엔진 전체 D-01 ~ 05는 엔진 단위 테스트가 회귀로 덮음
- [x] History 동기화: Patch 2회 → 뒤로 → 앞으로 = QA-52. **Phase 1 페이지와 다른 점**: 이 앱에서는 뒤로 · 앞으로가 실제 영역 기록만 움직이고 테스트 영역은 그대로다(PP-06). 「두 영역이 같은 모습」이 아니라 「실제 영역 = 그 기록 모습, 테스트 영역 = 안 움직임」을 본다
- [ ] 회귀: `git diff --stat main -- packages/` 비어 있음, `npx vitest run` 전체, `npx tsc --noEmit`, `npx playwright test` 전체
- [ ] desktop · mobile 캡처 (`04_qa_evidence/screenshot_NN_<desktop|mobile>.png`) — QA 단계: ① 처음 두 영역 ② 편집 뒤 Patch 전(두 영역이 다름) ③ Patch 직후 깜빡임 ④ 뒤로 간 상태([다시 실행] 켜짐)
