# qa_todo: patch-preview

- 명세: `../01_request_spec.md` (PP-01 ~ 10) · Dev 목록: `../03_development/dev_todo.md`
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
| 버튼 3개 | `patch-button` · `back-button` · `forward-button` | 「Patch」(파랑 알약) · 「뒤로」 · 「앞으로」(보조 알약). 처음 = Patch 켜짐, 뒤로 · 앞으로 `disabled`. 머리글 오른쪽 |
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
| `app.test.ts` Hook 개수 (Dev-6 Undo/Redo 버튼 테스트 이름 포함) | `instance.hooks` 길이 5 · 「useState 4칸 + useEffect 1칸」 | 길이 **8** · `slot(0..3)` 그대로, 뒤 3칸 = 보관함(`useMemo`) · 초기화 `useEffect` · `nav`(`useState`, `slot(7)`) |
| `app.test.ts` 화면에 patch 없음 (MF-05) | `root.textContent`에 `patch` 없음 | `patch-button` 글자를 뺀 나머지에 `patch` 없음 + `log-` testid 없음 |
| `app.test.ts` `B2_PATH` (P-10 · 12 · 13 · 14) | `[0,2,1,1]` | `[0,2,2,1]` (캔버스 제목 한 칸 — B 단계에서 `[0,2,2,1,1]` 오기를 바로잡음). patch 종류 · 개수 단언은 그대로 |
| `rootOnlyHooks.test.ts` | 컴포넌트 7개 · 순수 모듈 `model` `undo` `keys` `color` | 컴포넌트 **8개**(`PreviewPanel.ts`), 순수 모듈 + `previewVNode` · `previewNav`, `preview.ts` Hook 없음 |
| 그 밖 (QA-3 ~ 41 · 45 · A1 ~ A29, P-1 ~ 28 접두 · 개수) | — | 단언 변화 없음 (회귀로 그대로 통과) |

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
| QA-47 | PP-02 · 03 · 05 · 07 | 처음 연다 | 실제 영역과 버튼 3개를 본다 | `real-area` 안에 버튼 4개(메인 + b1 · b2 · b3), `areaSnapshot` real = test (글자 버튼 · 버튼 · 취소 · 삭제, 배경 `rgb(0, 82, 255)` ×3 + `rgb(207, 32, 47)`, 글자 흰색, 크기 M). 레이어 · 속성 · 도구 막대 요소는 실제 영역 안에 0개. **테스트 영역 testid(`figma-button` · `btn-label` · `canvas-main` …)가 실제 영역 안에 0개** (`real-` 접두만 있음), `figma-button` 전체 수는 4 그대로, `selected` 클래스 0개. `real-area`에 `inert` 속성. [Patch] 켜짐 · [뒤로] [앞으로] `disabled`. [Patch] 배경 `rgb(0, 82, 255)` · 글자 흰색 · 모서리 `100px`, [뒤로] [앞으로] 모서리 `100px`(보조), 그림자 `none`. 파랑 알약 버튼(`.btn-primary`)은 [+ 인스턴스] · [Patch] **둘뿐** (캔버스의 `figma-button`은 사용자 색이라 세지 않음) | 〃 |
| QA-48 | PP-04 · 08 · D-01 | 메인을 고르고 라벨을 `확인`으로 쓴다 (실제 영역 버튼 노드 · 박스 기록을 붙잡아 둠) | ① [Patch] 누르기 전 ② [Patch] | ① 테스트 영역 글자는 `확인 · 확인 · 취소 · 삭제`, **실제 영역은 아직 `버튼 · 버튼 · 취소 · 삭제`** (DOM 변경 0). ② 실제 영역 글자 = `확인 · 확인 · 취소 · 삭제`, 실제 영역 버튼 노드는 모두 같은 참조, 변경 = **characterData 2건**(메인 · b1 글자) · childList 0 · attributes 0. 박스가 2개 생겼고(`data-last-flash-count` = 2 = `data-last-patch-count`) 각 박스가 메인 · b1 버튼 영역 **안**에 있으며 b2 · b3 버튼과는 안 겹침. 테스트 영역은 그대로(선택 · 속성 패널 그대로) | 〃 |
| QA-49 | PP-04 · 08 · D-02 | 메인을 고르고 칩 `#cf202f`를 누른다 (실제 영역 버튼 노드 · 박스 기록을 붙잡아 둠) | ① [Patch] ② 이어서 크기 `L`을 고르고 [Patch] | ① 실제 영역 메인 · b1 · b2 배경 `rgb(207, 32, 47)`(b3는 원래 빨강이라 그대로), 실제 영역 버튼 노드 모두 같은 참조, 변경은 attributes 3건뿐(childList · characterData 0), 박스 3개(`data-last-flash-count` = 3)가 각각 **메인 · b1 · b2 버튼 영역과 ±2px 일치**(색만 바뀌어 크기가 안 변하므로 잴 수 있음), b3 버튼 위에는 박스 없음. ② 실제 영역 버튼 4개가 모두 `btn-L`, attributes 4건(class) · 박스 4개, 버튼 노드 같은 참조. 두 단계 모두 `areaSnapshot` real = test | 〃 |
| QA-50 | PP-04 · D-03 · D-04 | 처음 연다 | [+ 인스턴스] → [Patch] → 메인 아이콘 켜기 → [Patch] → 아이콘 끄기 → [Patch] → b4 고르고 Delete → [Patch] | 단계마다 [Patch] 직후 `areaSnapshot` real = test. 추가: 실제 영역 인스턴스 줄 childList 1건(버튼 +1, 노드 b1 ~ b3 같은 참조). 아이콘 켜기: 버튼 5개에 아이콘 span이 글자 앞에 생김(글자 span 노드 같은 참조). 끄기: 아이콘 사라짐. 삭제: 버튼 4개로, 앞 버튼 노드 같은 참조. 각 단계 [뒤로]가 켜져 있음 | 〃 |
| QA-51 | PP-04 · 05 (무변경 = 기록 안 함) | b2를 고른다(`selected`만 바뀜) | [Patch], 이어서 [Patch] 5번 더 | 실제 영역 DOM 변경 0, 박스가 한 번도 안 생김(`watchFlash` 기록 0건), **[뒤로] 계속 `disabled`**(기록 안 쌓임), 실제 영역에 `selected` 클래스 0개. 선택 · 속성 패널은 그대로 | 〃 |
| QA-52 | PP-06 · 08 · History 동기화 | 라벨 `확인` → [Patch] (A), 크기 `L` → [Patch] (B) 까지 해서 기록이 3칸(처음 · A · B) | [뒤로] → [뒤로] → [앞으로] → [앞으로] | 매 단계 실제 영역이 그 기록 모습: B(크기 L · `확인`) → [뒤로] = A(크기 M · `확인`) → [뒤로] = 처음(`버튼`, M) → [앞으로] = A → [앞으로] = B. **테스트 영역 · 앱 상태는 그대로**: 내내 테스트 영역은 B 모습(크기 L · `확인`), 속성 패널 값 · 앱 [↶] 켜짐 유지. 버튼 켜짐: 처음 = [뒤로] 꺼짐 · [앞으로] 켜짐, 끝 = 반대, 가운데 = 둘 다 켜짐. 실제 영역 버튼 노드는 같은 참조. 이동마다 박스 ≥ 1개 생김 (꺼진 버튼은 안 눌려 박스 없음) | 〃 |
| QA-53 | PP-06 | 라벨 `확인` → [Patch] (A), 크기 `L` → [Patch] (B) 후 [뒤로] (실제 영역 = A, 테스트 영역 = B) | 테스트 영역은 그대로 둔 채 [Patch] | 실제 영역이 B 모습이 되고(새 기록), **앞쪽(원래 B) 기록은 버려져 [앞으로] `disabled`**. [뒤로] 두 번 = A → 처음, 그 뒤 [뒤로] 꺼짐 (기록 = 처음 · A · 새 B 3칸) | 〃 |
| QA-54 | PP-10 · 06 · 09 | b1을 고른 상태(속성 패널에 「인스턴스 · 버튼」) | ① 실제 영역 b2 버튼을 `click({ force: true })`, Enter · Space ② 편집(색)·[Patch] 뒤 Ctrl+Z, 이어서 [뒤로] | ① 선택 · 속성 패널 제목 · 레이어 선택 · 두 영역 DOM 모두 그대로(변경 0), 실제 영역 안 요소가 포커스를 못 받음(`activeElement`가 `real-area` 안이 아님). ② [Patch] 전후로 앱 [↶] · [↷] 켜짐 상태가 같음. Ctrl+Z는 **테스트 영역만** 되돌림(색 처음으로), 실제 영역은 그대로 · [뒤로] 여전히 켜짐. 이어서 [뒤로]를 눌러도 앱 [↶] · [↷] 켜짐 상태와 테스트 영역은 그대로. 즉 앱 Undo 기록과 실제 영역 기록은 서로 안 건드림 | 〃 |

## 공격적 시나리오 (새)

| QA | 시나리오 | Then | 근거 ID | 스펙 파일 |
| --- | --- | --- | --- | --- |
| QA-A30 | [Patch] 연타: ① 편집 없이 20번 ② 라벨을 바꾼 뒤 [Patch]를 20번 (`click` 연속) | ① 기록 0칸([뒤로] 꺼짐), 실제 영역 변경 0, 오류 없음. ② 기록 **1칸만**(첫 번째만 변경, 나머지 19번은 무변경) → [뒤로] 한 번이면 처음 모습, 그 뒤 [뒤로] 꺼짐. 두 영역(테스트 영역 vs 지금 기록) 일치 | PP-04 · 06 | `e2e/mini-figma-preview.spec.ts` |
| QA-A31 | [뒤로] · [앞으로] 연타: Patch 3번 쌓고 [뒤로]를 10번 연속(3번째에서 `disabled`, 4 ~ 10번째는 `click({ force: true })`), 이어서 [앞으로] 10번 | 한 번에 한 칸만 움직임, 처음 · 끝에서 멈춤(4번째부터 DOM 변경 0 · 박스 없음), 도중 오류 없음, 끝에서 실제 영역 = 마지막 Patch 모습. 연타 도중 버튼 켜짐 · 꺼짐이 실제 기록 위치와 어긋나지 않음(처음 = [뒤로] 꺼짐, 끝 = [앞으로] 꺼짐) | PP-06 | 〃 |
| QA-A32 | 특수문자 라벨: 메인 라벨 `<b>x</b> &amp; "q" 'a' 😀` → [Patch] | 실제 영역 글자가 입력 그대로 **글자로** 표시(실제 영역 안 `b` 요소 0개, `real-btn-label` 글자 = 입력), 테스트 영역 글자와 같음. [뒤로]하면 `버튼`으로 돌아감 | PP-04 · 05 | 〃 |
| QA-A33 | 빈 입력: 메인 라벨을 모두 지우고(빈 글자) [Patch] → [뒤로] | 실제 영역 메인 · b1 글자 span이 **빈 글자로 남음**(노드 제거 아님), 오류 없음, [뒤로] = `버튼` 복원, 테스트 영역 그대로 | PP-04 | 〃 |
| QA-A34 | 새로고침: 편집 · [Patch] · [뒤로] 뒤 `page.reload()` | 실제 영역 = 처음 모습(테스트 영역과 같음), 기록 비어 있음([뒤로] · [앞으로] 꺼짐), 오류 없음 (기록은 저장 안 함) | PP-03 · 06 | 〃 |
| QA-A35 | 구조 바꾸기를 섞어서: [+ 인스턴스] → [Patch] → b1 [↓] → [Patch] → b2 삭제 → [Patch] → 라벨 · 색 → [Patch]. 이어서 [뒤로]를 끝까지, [앞으로]를 끝까지 | 단계마다 [Patch] 직후 `areaSnapshot` real = test(순서 · 개수 · 글자 · 색). [뒤로]를 끝까지 하면 처음 모습(버튼 4개 · 원래 순서 · 글자), [앞으로]를 끝까지 하면 마지막 모습. 각 이동 뒤 두 영역 중 실제 영역은 그 기록의 모습과 같고 테스트 영역은 그대로 (순서 바꾸기는 위치 비교라 `MOVE`가 아님 — 모습만 맞으면 됨) | PP-04 · 06 · D-03 · D-04 | 〃 |
| QA-A36 | 한도 50: [+ 인스턴스] → [Patch]를 55번 반복 → [뒤로]를 계속 누른다 | **정확히 49번째 [뒤로]에서 `disabled`**(기록 50칸), 가장 오래된 6칸(처음 포함)은 이미 빠져 처음 모습(b1 ~ b3)이 아니라 **b1 ~ b9 모습**(버튼 10개)에서 멈춤. 마지막 [뒤로] 뒤 앞으로 49번 → 끝(b1 ~ b58 모습). 앱이 센 켜짐 상태와 엔진 이동이 끝까지 안 어긋남(꺼진 버튼을 눌러도 아무 일 없음). 느린 시나리오(≈ 110번 클릭) | PP-06 (한도 50) | 〃 |
| QA-A37 | 인스턴스를 많이 더한 뒤(60번) [Patch]: 메인 크기 `L` → [+ 인스턴스] 60번 → [Patch] → 좁은 화면 · 긴 라벨(`'A'.repeat(200)`) | **desktop**: 페이지 세로 · 가로 스크롤 없음, `real-section` 안쪽에서 스크롤(`overflow-y` `auto`, `scrollHeight > clientHeight`), 레이어 · 실제 영역 · 속성 아래 끝이 화면 아래 20px 안. **mobile**: 가로 스크롤 없음. 두 크기 모두 실제 영역 버튼의 오른쪽 끝이 `real-area` 오른쪽 끝을 넘지 않음. 깜빡임 박스가 실제 영역 구역 밖으로 페이지를 넘치게 만들지 않음 | PP-01 · 08 · FD-06 · 08 | 〃 |

## 필수 확인
- [x] Diff 기본 케이스 D-01 ~ 05: D-01 = R-3 · QA-48, D-02 = R-4 · 5 · QA-49, D-03 = R-6 · 9 · QA-50, D-04 = R-7 · 10 · QA-50, **D-05(교체) = R-13(단위, 이 모듈 단위로만)** — 캔버스 흐름에는 노드 종류가 바뀌는 장면이 없다. 엔진 전체 D-01 ~ 05는 엔진 단위 테스트가 회귀로 덮음
- [x] History 동기화: Patch 2회 → 뒤로 → 앞으로 = QA-52. **Phase 1 페이지와 다른 점**: 이 앱에서는 뒤로 · 앞으로가 실제 영역 기록만 움직이고 테스트 영역은 그대로다(PP-06). 「두 영역이 같은 모습」이 아니라 「실제 영역 = 그 기록 모습, 테스트 영역 = 안 움직임」을 본다
- [ ] 회귀: `git diff --stat main -- packages/` 비어 있음, `npx vitest run` 전체, `npx tsc --noEmit`, `npx playwright test` 전체
- [ ] desktop · mobile 캡처 (`04_qa_evidence/screenshot_NN_<desktop|mobile>.png`) — QA 단계: ① 처음 두 영역 ② 편집 뒤 Patch 전(두 영역이 다름) ③ Patch 직후 깜빡임 ④ 뒤로 간 상태([앞으로] 켜짐)
