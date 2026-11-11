# 03 작업자 기획 수정본 요약: mini-figma (기획 2회차)

- 근거: 검수 1회차 반려 `02_reviewer_reject.md` · 보충된 명세 `01_request_spec.md` · 사용자 결정 Q17 (`00_master_dialogue.md` 「1단계 기획 검수 1회차 뒤 결정」, 모두 추천안)
- 고친 문서: `../03_development/dev_todo.md`(Dev 12개 유지) · `../04_qa_evidence/qa_todo.md`(인수 28 · 공격 19 · patch 기대 표 21줄 · 단위 5파일 · 회귀 5)
- 코드는 쓰지 않았다. `packages/` · `types.ts`는 건드리지 않는 계획 그대로 (MF-02). 명세에 없는 기능은 더하지 않았다. 첫 초안 `01_worker_draft.md`는 기록으로 그대로 둔다 (그 안의 ④ 질문 표는 이제 `dev_todo.md` 「확정 설계 결정」이 기준)

## ① 지적별 처리

| # | 지적 | 처리 (무엇을 어디서 고쳤나) |
| --- | --- | --- |
| 1 | BLOCKING — patch 종류 단언이 엔진(`SET_PROP`)과 안 맞음 | 단언 대상을 **캔버스 경로(`[0, 1]`)로 한정**하고 **동작마다 종류별 개수**를 적음. `qa_todo.md:85-113` 새 「patch 기대 표」 P-1 ~ P-21 (예: 메인 라벨 한 글자 = 캔버스 `SET_TEXT` 2, 아이콘 켜기 = `INSERT` 4). 속성 패널(`[0, 2]`)은 `SET_PROP`이 섞이므로 센 값을 단언하지 않음(고르기 · 삭제의 `REPLACE`만 「1줄 이상」). 도우미 `canvasCounts` · `layerCounts`(SET_EVENT 제외)는 `dev_todo.md:65` 공통 주의 13, 경로 접두가 맞는지 한 줄 확인도 같은 곳. Dev-6 · 7 · 8 · 9 · 10 · 11의 `app.test.ts` 항목이 이 표를 인용 (`dev_todo.md:134-186`). `qa_todo.md:123` `app.test.ts` 줄 · `:10`도 갱신. 화면 뼈대 고정(최상위 `div.app`, 자식 순서 레이어 · 캔버스 · 속성)은 `dev_todo.md:49` |
| 2 | BLOCKING — `pressUndo`가 `property-title`로 포커스를 빼서 선택이 없으면 실패 | 포커스 빼기를 늘 있는 요소로: `page.evaluate(() => document.activeElement?.blur())`. `dev_todo.md:199`(e2e 도우미), `qa_todo.md:11`(문구), QA-21 · 22 · 25는 Given · When에 「`pressUndo`의 포커스 빼기」를 적고 (`qa_todo.md:50` · `:51` · `:54`), QA-22 · 23 · 24 · A6 · A9 · A13도 같은 도우미를 씀 |
| 3 | BLOCKING — 인스턴스의 아이콘 보이기 · 종류 override 시나리오 없음 (MF-14) | 인수 **QA-26**(b2 아이콘 켜기 + ♥ → b2에만) · **QA-27**(메인 켜기 · ♥ → ★로 바꿔도 b2는 ♥, 메인을 꺼도 b2 아이콘 남음) · **QA-28**(아이콘 칸 ↻ → 메인을 따름) 추가 (`qa_todo.md:55-57`). `app.test.ts`에 「b2 아이콘 켜기 = b2 버튼 경로 + `[0]`의 `INSERT` 1줄」(P-10) 등 P-10 ~ P-14 (`qa_todo.md:102-106`). **Dev-8 테스트 목록**에 QA-26 ~ 28 + 위 단언 + `model.test.ts`의 아이콘 칸 override 규칙 (`dev_todo.md:152-160`, `:70-83`) |
| 4 | NON-BLOCKING — A10 ③ 「Ctrl+Z 한 번 = 한 단계」는 리스너 누적을 못 잡음 | 직접 증거를 **`page.addInitScript`로 `document` keydown 등록 · 해제 수 세기**(로드 직후 값과 같음)로 바꾸고, Ctrl+Z 결과는 **보조 확인**이라고 근거 문구를 고침 (`qa_todo.md:74`, 도우미 `dev_todo.md:200`) |
| 5 | NON-BLOCKING — A8 ① 라벨 칸 안 Ctrl+Z는 Chromium 입력칸 되돌리기 | `Backspace` **직후**에만 `취` 단언, 그 뒤 `Ctrl+Z` · `Meta+Z`는 칸 글자를 단언하지 않고 **메인 색 유지 · 인스턴스 개수 · 선택 유지**만 (`qa_todo.md:72`) |
| 6 | NON-BLOCKING — QA-3 D-05는 태그가 달라야 REPLACE | 화면 약속 표에 **빈 상태 `<p>`, 머리 `<h2>`** 명시 (`qa_todo.md:23`, `:32`), Dev-6 대상 파일(`dev_todo.md:134-138`), P-1 · P-17의 REPLACE 단언 |
| 7 | NON-BLOCKING — `app.test.ts` 리스너 정리 | 테스트마다 `afterEach`에서 `unmount()`, `document.addEventListener` spy는 `render()` 전에 (`dev_todo.md:124-132` Dev-5 공통 규칙, Dev-11 `:178-186`, `qa_todo.md:123`) |
| 8 | NON-BLOCKING — `rootOnlyHooks.test.ts` 컴포넌트 파일 목록 단언 | 컴포넌트 파일을 정확히 5개(`Button.ts` · `Canvas.ts` · `Icons.ts` · `LayerPanel.ts` · `PropertyPanel.ts`)로 고정하고 목록 단언 추가 (`dev_todo.md:34-49` 폴더 구성, Dev-5 `:124-132`, `qa_todo.md:122`) |
| 9 | NON-BLOCKING — `HISTORY_LIMIT`과 뜻 맞추기 | Q17-2대로 같은 뜻으로 맞추되 상수는 `UNDO_LIMIT = 50` + 뜻 주석(past 최대 49)으로 **따로** 두고 `HISTORY_LIMIT`을 import하지 않음 (`dev_todo.md:66` 공통 주의 14, Dev-3 `:97-110`). Undo 49번에 맞춰 QA-A9 · `undo.test.ts` 기대값 다시 계산(아래 ⑤의 계산표) |
| 10 | NON-BLOCKING — 선택 상자를 `onClick`으로 받으면 열 때마다 불림 | 선택 상자 · 체크박스는 **`onInput`으로만** (`dev_todo.md:56` 공통 주의 4, Dev-7 `:142-150`, Dev-8 `:152-160`, 화면 약속 `qa_todo.md:24`) |
| 11 | NON-BLOCKING — 「인스턴스가 없어요」 안내는 명세에 없음 | **뺌.** `dev_todo.md`의 공통 주의 1에서 삭제하고 `:32`에 「만들지 않는다」 명시 |
| — | 사용자 결정 Q17-1 ~ 6 · 나머지 ④-2 · 3 · 4 · 7 · 9 · 10 · 12 · 13 | `dev_todo.md:11-32` 「확정 설계 결정」 표 하나로 고정 (Q17-1 아이콘 key = 공통 주의 12, Q17-3 `nextId` = Dev-1 · 2 · 5 · 9 · 11, Q17-4 수정키 = Dev-4 · QA-A11, Q17-5 줄바꿈 = Dev-5 · QA-A12, Q17-6 Undo 버튼 없음) |

## ② 바뀐 Dev 요약

Dev는 12개 그대로, 번호 변화 없음. 아래는 바뀐 것만.

| Dev | 바뀐 점 | MF · Q17 |
| --- | --- | --- |
| Dev-1 | 아이콘 칸(`hasIcon` · `icon`)도 override · ↻ 규칙이 같다는 단위 테스트 추가 | MF-12 · 13 · 14 |
| Dev-2 | `addInstance(doc, nextId)` 번호는 `Doc` 밖에서 받음 · `doc`에 `nextId` 없음 단언. `instanceName`(지금 글자, 빈 글자면 id) 테스트 | Q17-3 · ④-3 |
| Dev-3 | `UNDO_LIMIT = 50`(뜻 주석), **past 최대 49 = Undo 49번**. 49단계면 처음까지 · 50단계면 처음이 빠짐 · 60단계도 49 경계 테스트 | Q17-2 |
| Dev-4 | Delete · Backspace는 수정키(Ctrl · Meta · Alt · Shift)가 없을 때만. `Shift+Delete` · `Ctrl+Backspace` 등 null 케이스 | Q17-4 |
| Dev-5 | state 4칸(`doc` · `selectedId` · `history` · `nextId`), `components/` 5파일 고정, `.canvas-instances { flex-wrap }`, 화면 뼈대(경로 접두), `canvasCounts` · `layerCounts` 도우미, rootOnlyHooks 파일 목록 단언, `app.test.ts` `unmount()` · spy 순서 | Q17-3 · 5 · NB 7 · 8 |
| Dev-6 | 빈 상태 `<p>` / 머리 `<h2>`, 고르기 patch 기대(P-1 · P-2) | NB 6 |
| Dev-7 | 선택 상자 · 체크박스 `onInput`만, 아이콘 자식 key(`icon` · `label`), patch 기대를 캔버스 경로 한정 개수로 교체(P-3 ~ P-8) | BLOCKING 1 · Q17-1 · NB 10 |
| Dev-8 | **인스턴스 아이콘 켜기 · 종류 · 메인 변경 뒤 유지 · ↻** (QA-26 ~ 28, P-10 ~ P-14) 추가 | BLOCKING 3 |
| Dev-9 | `nextId` 올림, 추가 · 삭제 patch 개수(P-16 · P-17), 삭제의 `REPLACE`(D-05) | Q17-3 |
| Dev-10 | 순서 patch 개수(P-15), 경계 렌더 0번(P-20) | — |
| Dev-11 | A18(추가 Undo 뒤 b5) · A19(49번 경계) 추가, A9 · A10 · A8 · A11 기대 수정, 리스너 `add − remove = 1`, 수정키 조합 | Q17-2 · 3 · 4 · NB 4 · 5 · 7 |
| Dev-12 | A12에 **mobile `noHorizontalScroll` + 버튼 오른쪽 끝이 캔버스 안** 추가 | Q17-5 |
| e2e 도우미 | `pressUndo` · `pressRedo` 포커스 빼기 = `activeElement.blur()`, 키 리스너 수 세는 `addInitScript` 도우미 | BLOCKING 2 · NB 4 |

## ③ 사용자 확인용 테스트 케이스

### 인수 (e2e, desktop · mobile 모두) — 새로 늘거나 바뀐 것 중심. 나머지 QA-1 ~ 25는 1회차와 같은 뜻 (전체는 `qa_todo.md:30-57`)

| 이름 | Given / When / Then 한 줄 | 덮는 ID |
| --- | --- | --- |
| QA-1 | 처음 열면 · 보기만 · 메인 + b1 b2 b3, `b3`만 빨강, 속성 패널 빈 상태, patch 표시 없음 | MF-01 · 04 · 05 · 11 · 16 · P2-22 |
| QA-2 | 1280 / 375에서 열면 · 위치를 재면 · 가로 3칸 / 위아래로 쌓임, 가로 스크롤 없음 | MF-03 |
| QA-3 | b2를 누르면 · 머리 「인스턴스 · 취소」, 빈 `<p>`가 `<h2>`로 교체, 버튼 노드 같은 참조 | MF-20 · D-05 |
| QA-5 ~ 9 | 메인 라벨 · 크기 · 색 · 아이콘 켜기 / 끄기 · 종류 `♥` · 바뀐 버튼만 바뀌고 노드 같은 참조, 아이콘은 글자 **앞**에 INSERT 되고 글자 노드는 유지 | MF-12 · 14 · 15 · D-01 ~ 04 |
| QA-10 ~ 13 | 인스턴스 라벨 · override 유지 · ↻ · override 표시 | MF-12 · 13 · 21 |
| **QA-26** | b2에서 아이콘 켜고 ♥ · b2에만 ♥ 노드, 나머지 버튼은 아이콘 없음 (노드 같은 참조) | MF-14 · 12 · D-03 · BLOCKING 3 |
| **QA-27** | 위 상태에서 메인을 켜고 ♥ → ★ · 메인 · b1 · b3만 따라 바뀌고 b2는 계속 ♥, 메인을 꺼도 b2 아이콘 남음 | MF-12 · 14 |
| **QA-28** | b2의 아이콘 보이기 ↻ → 아이콘 종류 ↻ → 메인 켜기 · b2 아이콘이 사라졌다가 메인을 따라 ★로 나타남 | MF-13 · 14 |
| QA-14 ~ 18 | 추가 · 삭제(번호 재사용 안 함) · 메인 삭제 불가 · 순서(DOM 노드 유지) · 고른 채 순서 | MF-22 ~ 26 · D-03 ~ 05 |
| QA-19 ~ 25 | Ctrl · Cmd+Z · Shift · 한 단계 묶음 · 묶음이 끝나는 경우 · Undo 뒤 새 수정 · Undo로 선택 풀림 · Delete · Backspace (포커스 빼기 = `blur`) | MF-30 ~ 33 |

### 공격 · 경계 (e2e) — 바뀐 것 · 새것 표시

| 이름 | 공격 한 줄 | 덮는 ID |
| --- | --- | --- |
| QA-A1 · A2 | 특수문자 · 200자 라벨 · 글자 그대로, 가로 스크롤 없음 | MF-03 · 15 · T-14 |
| QA-A3 ~ A5 | 빈 라벨 · 같은 값 override · ↻ 뒤 메인 변경 (`undefined` 없음), 빈 글자 레이어 이름은 id | MF-12 · 13 · ④-3 |
| QA-A6 · A7 · A17 | Delete · Undo · Redo로 선택 사라짐 · 메인에서 Delete 연타 · 끼어들어도 고른 id 유지 | MF-23 · 24 · 26 · 32 |
| **QA-A8** (바뀜) | 입력칸 안 키: `Backspace` 직후만 `취`, Ctrl · Meta+Z 뒤에는 메인 색 유지 · 인스턴스 개수 · 선택만 | MF-34 · NB 5 |
| **QA-A9** (바뀜) | 추가 **50번** → Ctrl+Z 49번 = `b1~b4`에서 멈춤, 50번째 무시 → Redo 49번 = `b53` | MF-30 · Q17-2 |
| **QA-A10** (바뀜) | 옛 선택 핸들러 · keydown 리스너 등록 − 해제 수가 상태 20번 바꿔도 로드 직후와 같음 | MF-34 · NB 4 |
| **QA-A11** (늘어남) | 정해진 키 밖 + `Shift+Delete` · `Ctrl+Backspace` · `Alt+Backspace` · `Meta+Backspace`는 안 지움, 수정키 없는 Delete는 지움(대조) | MF-33 · Q17-4 |
| **QA-A12** (늘어남) | 연타 + 인스턴스 23개에서 mobile 가로 스크롤 없음, 버튼이 캔버스 밖으로 안 나감 | MF-03 · Q17-5 |
| QA-A13 · A14 | 새로고침(기록도 비어 있음) · 입력 100자 | MF-16 · 15 · 31 |
| QA-A15 · A16 | 고르기만 바꿔도 묶음 유지 · 순서 버튼이 고르기를 안 바꿈 | MF-31 · 25 · 26 |
| **QA-A18** (새) | b4 추가 → Undo → 추가 = **b5** (`nextId` 안 되돌림) | MF-22 · Q17-3 |
| **QA-A19** (새) | 추가 **49번** → Ctrl+Z 49번 = **처음 모습**까지 돌아옴, 50번째 무시 | MF-30 · Q17-2 |

### 단위 (Vitest) — 파일별

| 파일 | 검사 내용 | 덮는 ID |
| --- | --- | --- |
| `model.test.ts` | override 합치기(빈 글자 · 같은 값 · **아이콘 칸**) · ↻ = 키 지우기 · 추가(`nextId` 밖 · 끝 · override 없음) · 삭제 · 순서(경계 같은 객체) · 선택 정리 · 이름(빈 글자면 id) · 불변 | MF-11 ~ 14 · 16 · 22 · 23 · 25 · 32 |
| `undo.test.ts` | 묶음 규칙 · Undo/Redo · Redo 버림 · **`UNDO_LIMIT = 50`: 49단계 = 처음까지, 50단계 = 처음 빠짐, 60단계도 `past` 49** | MF-30 · 31 |
| `keys.test.ts` | 키 표 · 입력칸 무시 · 수정키 있는 Delete · Backspace는 null · `Alt+z` null | MF-33 · 34 |
| `rootOnlyHooks.test.ts` | Hook은 `App.ts`만 · 자식에 `document` · `window` 없음 · **컴포넌트 파일 목록 5개** | MF-04 · P2-07 ~ 09 · T-16 |
| `app.test.ts` (jsdom) | **patch 기대 표 P-1 ~ P-21 (캔버스 · 레이어 개수, 패널 제외)** · 한 동작 = 렌더 한 번 · keydown 리스너 1개 · `unmount()` cleanup · 입력칸 · 수정키 무시 · 고르기는 기록 밖 · b4 추가 → Undo → 추가 = b5 | MF-04 · 10 · 14 · 31 · 32 · 34 · 명세 4절 |

### 회귀

`git diff --stat f224bdd -- packages/` 비어 있음 · `npx vitest run` · `npx tsc --noEmit` · `npx playwright test` 전체 · Phase 1 · 2 검증 페이지와 성능 대시보드 그대로 (QA-R1 ~ R5).

## ④ 아직 안 덮인 MF · PRD ID와 사유

| ID | 사유 |
| --- | --- |
| MF-02 엔진 무수정 | e2e로 못 본다. `git diff --stat f224bdd -- packages/`가 비어 있는지와 기존 vitest · playwright 통과(QA-R1 ~ R4)로 확인 |
| MF-05 patch 비표시 | QA-1이 「알리는 요소가 없음」(`log-` testid · "patch" 글자)만 확인. 「어떤 것도 안 보임」의 완전한 증명은 아님 |
| MF-10 state 칸 구성 | 내부 구조라 e2e에 안 보인다. `app.test.ts` · `rootOnlyHooks.test.ts`가 동작으로만 확인(칸 이름은 검사 안 함). `nextId`가 Undo로 안 되돌아감은 QA-A18 · `app.test.ts`가 확인 |
| MF-34 listener 등록 · cleanup | e2e는 A10 ③의 `addInitScript` 등록 − 해제 수로, `unmount()` cleanup은 jsdom `app.test.ts`가 직접 확인 (4번 지적 반영) |
| 명세 4절 「Batching」 · 「SET_EVENT」 | 화면에 렌더 횟수 · patch가 없어 e2e로 못 본다 → `app.test.ts`의 `lastPatches` · `App` 실행 횟수로 대신 |
| 「Undo 묶음에 시간 기준 없음」 | e2e는 기다리기에 기대지 않는다. `undo.ts`에 시간 입력이 없다는 것을 단위 테스트(여러 번 · 간격 없이)로만 확인 |
| D-01 ~ 05 엔진 자체 | 이 task는 엔진을 안 바꿔 새로 안 쓴다. 앱 화면 대응만 표시, 엔진은 Phase 1 회귀 |
| History 동기화 (두 영역) | **해당 없음** — Phase 1 검증 페이지 전용 |
| P2-24 중 touch · 실제 모바일 키보드 | mobile 프로젝트도 Playwright 키 입력으로 돈다. 터치 기기에서는 단축키를 못 쓰고 **Undo 버튼은 없다**(Q17-6 확정, 명세대로) |

(1회차에 「미덮임」이던 MF-14 인스턴스 아이콘 · Instance swap override는 QA-26 ~ 28로 덮임. Delete · Backspace 수정키 조합은 Q17-4 확정 뒤 QA-A11 · `keys.test.ts`로 덮임.)

## ⑤ 남은 질문

없다. 사용자 결정이 필요한 새 빈 곳은 찾지 못했다. 확인만 부탁할 계산 하나:

- **Undo 49번 기대값** (Q17-2): 50번 추가하면 상태가 s0(처음) ~ s50, 51개 중 s0이 빠져 s1~s50(50개). Undo 49번이면 s1 = `b1 b2 b3 b4`, 50번째는 무시, Redo 49번이면 s50 = `b1`~`b53`(QA-A9). 49번 추가하면 s0 ~ s49 = 50개라 전부 남아 Undo 49번에 처음 모습 `b1 b2 b3`까지 돌아옴(QA-A19). `undo.test.ts` 경계는 49단계 / 50단계로 같은 뜻.

## 알려 두는 가정 (명세 · 결정에 이미 있는 것의 풀이, 추가 기능 아님)

- 최상위 `div.app` 하나 + 자식 순서(레이어 · 캔버스 · 속성)를 고정해 patch 경로 접두 `[0, 0]` · `[0, 1]` · `[0, 2]`로 영역을 가른다. 화면(mobile 세로 쌓기)은 CSS만 다르다.
- 메인 행 이름은 고정 문구 「메인 Button」(레이어 · 패널 머리 모두), 인스턴스 이름만 지금 글자를 따라간다 (④-3 추천 확정).
- `components/`는 5파일로 고정(`Icons.ts` 포함)해 rootOnlyHooks 목록 단언이 가능하게 했다. 다른 쪼갬이 필요하면 개발자가 목록 단언을 같은 커밋에서 고친다.
