# 개발 검수 기록: mini-figma

> `mr-reviewer`(Opus) 판정을 마스터가 그대로 옮긴다. 진행 모드: 기본 (Dev 묶음마다).

## 묶음 1 · Dev-1 ~ 4 · 회차 1/3 — APPROVE (2026-11-11T18:22)
- 대상: `01_diff_dev1-4.patch` (`10dfa4e..fff6ca3`), 마스터 실행: `vitest run fixtures/mini-figma` 3 files · 162 passed, `tsc --noEmit` 0, `packages/` diff 비어 있음

BLOCKING 없음. 확인한 것:
- 완료 근거: 함수가 모두 `model.ts` · `undo.ts` · `keys.ts`에 있음. 테스트 건수 model 36 + 26 = 62, undo 24, keys 76 = 162 (마스터 실행과 같음). 커밋 aa22ea9 · 825cb95 · 160f56b · be98199, 제목 형식 지킴
- override: `Object.hasOwn`(`model.ts:47`, prototype 키 제외 · `toString` 테스트), ↻는 키 자체를 뺌(`model.ts:78`, `'label' in` · `Object.keys` · `Object.values`로 확인), 키 없던 칸에 메인과 같은 값 = 키 생김, 이미 override인 칸에 같은 값 = 같은 Doc(`model.ts:63`), 빈 글자 · 아이콘 칸도 같은 규칙
- Undo: 같은 대상 + 같은 칸이면 `past` 안 늘림(시간 기준 없음), `null` 묶음은 늘 새 단계 + 묶음 끝, 새 수정이면 `future` 비움, Undo · Redo 뒤 묶음 `null`, `MAX_PAST = UNDO_LIMIT - 1 = 49`(`HISTORY_LIMIT` import 없음, 뜻 주석), 49 · 50 · 60단계 경계 테스트는 한도를 50 · 48로 잘못 두면 실패
- 키 판정: 명세 · Q17-4대로. `Ctrl+Meta+z` = undo 판단 괜찮음 (명세는 Ctrl/Cmd+Z, Q17-4가 빼는 것은 Alt뿐)
- `nextId`는 Doc 밖, `addInstance`가 인자로 받음(Q17-3). 삭제 · 순서 경계 · 없는 id에서 같은 객체
- 세 모듈에 `document` · `window` 사용 · Hook · 엔진 import 없음 (`undo.ts` → `./model` 타입 import 하나뿐)
- 기획 NON-BLOCKING 1 ~ 4가 ec98662에 모두 반영

[NON-BLOCKING]
1. `Ctrl+Meta+z` → `'undo'`, `Ctrl+Meta+Shift+Z` → `'redo'` 단언이 `keys.test.ts`에 없음 → 표에 한 줄씩
2. `keys.ts:1`(`:16` 근처) 주석에 `document · window` 단어 → Dev-5 `rootOnlyHooks.test.ts`는 `fixtures/phase2-app/__tests__/rootOnlyHooks.test.ts:17-27`의 `stripComments` · `stripNoise`를 그대로 가져갈 것
3. `undo.test.ts:175` `toEqual(docOf(99))`는 값만 비교해 약함 → 같은 변수 + `toBe` (바로 위 `future === []`가 이미 잡고 있어 동작 문제는 아님)
4. `undo.ts:17` `target: 'main' | string`은 타입상 `string`과 같음 (문서용 표기, 동작 영향 없음)

- 처리 계획 (마스터): 1 · 2 · 3은 묶음 2 작업 때 반영, 4는 주석으로 뜻을 남기거나 그대로 (작업자 판단, 동작 영향 없음)

## 묶음 2 · Dev-5 ~ 8 · 회차 1/3 — APPROVE (2026-11-11T18:47)
- 대상: `02_diff_dev5-8.patch` (`c3fcff9..27d1772`), 마스터 실행: vitest 41 files · 1018 passed, tsc 0, `e2e/mini-figma-*` 42 passed, `packages/` diff 비어 있음, 포트 5199 남은 서버 없음

BLOCKING 0건. 확인한 것 (파일 직접 확인, git은 못 돌려 커밋 해시는 못 봄):
- Hook · 구조: Hook은 `App.ts:19-22`의 `useState` 4개(doc · selectedId · history · nextId)뿐, 조건 없이 같은 순서. `useEffect` · keydown · Undo 연결 없음(Dev-11 몫 안 앞당김). 자식은 props + 콜백 props(`onSelect` · `onEdit` · `onReset`)만. `rootOnlyHooks.test.ts`가 컴포넌트 파일 5개 정렬 단언 + 틀린 소스 검출 확인
- 합치기 · id · key: `Canvas.ts:43` `{ key: it.id, ...draw(it.id, mergeProps(main, it)) }` — 쓸 칸만 꺼내 `id`가 DOM 속성이 안 되고 `data-id`로만(`app.test.ts:160`). `Button.ts:37-38` 아이콘 `key: 'icon'` · 글자 `key: 'label'`, 꺼지면 `null`이라 형제 전부 key. 인스턴스 줄 · 레이어 `<ul>`은 key 있는 자식만, 메인은 따로 상자
- app.test.ts: 경로 접두로 거르고 `SET_EVENT` 뺌, 접두는 `children[1] = canvas` 단언 + 도우미 자체 테스트로 지킴. 단언 값은 기획 때 정한 P-1 ~ 14 · 21 · 22와 같음(구현 베낌 아님). 매 동작 `await Promise.resolve()`, `afterEach` `unmount()`
- 테스트 개수: 단위 62 + 24 + 78 + 13 + 40 = 217, Dev-5 ~ 7의 187 · 193 · 204도 맞음. e2e 21 × 2 = 42
- e2e: `holdNodes` · `sameNode` + `watchApp` · `watchSel`(MutationObserver)로 「바뀐 곳만 고침」을 실제로 잡음. 좌표 단언은 QA-2(1px) · A2(0.5px)뿐
- 선택 상자 · 체크박스 · 글자 칸 모두 `onInput`, 값은 `value` · `checked`. `renderVNode.ts:25-27`이 자식 뒤에 값을 넣어 `<select>` 처음 값도 맞음. override = `isOverridden`(`Object.hasOwn`), override 칸 = `override` 클래스 + ↻, 아니면 「메인 따름」, ↻ = 키 지움(`b3` → `{ id: 'b3' }`). MF-12 · 13 · 21과 맞음
- XSS: 라벨 · 레이어 이름 · 패널 머리 모두 글자 노드, QA-A1이 `<b>` · `<img>` 0개 · `__pwned` 없음 확인
- 편차 판단: ① Dev-5 `LayerPanel` 이름만 있는 행 4개 = 받아들임(QA-1 요구, 고르기는 Dev-6) ② QA-13은 MF-16대로가 맞고 `qa_todo.md:42` 글귀 고침 확인
- 묶음 1 NON-BLOCKING 1 ~ 4 반영 확인 (`keys.test.ts:27-28` · `undo.test.ts:173-176` · `undo.ts` 주석 · `rootOnlyHooks.test.ts:18-28`)

[NON-BLOCKING]
1. `e2e/mini-figma-attack.spec.ts:26` `page.waitForTimeout(100)` 고정 기다리기 — 바로 위에서 `<img>` 0개를 확인하므로 없어도 됨
2. `rootOnlyHooks.test.ts:27` 템플릿 문자열 지우기가 `${…}` 식까지 지움 → ``${document.title}`` 같은 코드는 안 걸림 (phase2 검사기와 같은 한계, 지금 소스엔 없음)
3. `packages/` 무수정 근거 기준이 `10dfa4e` — dev_todo · QA-R1은 `f224bdd` 기준이므로 Dev-12 최종 근거에 `git diff --stat f224bdd -- packages/`
4. `App.ts`의 `applyEdit` · `onEdit`은 그 렌더의 `doc` · `history`를 붙잡음 — 같은 틱에 편집 두 번이면 앞의 것이 덮임. Dev-9(삭제 = setter 3개) · Dev-11(keydown)도 한 동작 안의 setter 값을 같은 `doc`에서 계산할 것
5. `App.ts:22-23` `nextId` · `setNextId`는 Dev-9 전까지 안 쓰임 (주석 있음, 그대로)

- 처리 계획 (마스터): 1 · 3 · 4는 묶음 3에서 반영, 2 · 5는 기록만

## 묶음 3 · Dev-9 ~ 12 · 회차 1/3 — REJECT (2026-11-11T19:13)
- 대상: `03_diff_dev9-12.patch` (`c5aa027..d29715c`), 마스터 실행: vitest 41 files · 1047 passed, tsc 0, playwright 전체 268 passed, `git diff --stat f224bdd -- packages/` 비어 있음, 남은 서버 없음

[BLOCKING] 1건: Undo 한 번에 두 단계가 되돌아가고 Redo가 사라질 수 있음 (MF-30 · MF-31 · Q17-4)
1. [Dev-11 · Q17-4 전제 깨짐 · 런타임 버그 의심] 작업자 편차 1의 관찰: 입력칸에서 포커스를 뺀(`pressUndo`의 `blurFocus`) 뒤 Ctrl+Z도 Chromium 기본 글자 되돌리기가 그 입력칸에 적용되고, 그 `input` 이벤트를 앱 `onInput`이 편집으로 기록 → 앱 Undo 없이도 A2의 `버튼` 복귀가 통과했음.
   - `App.ts:88-105` `onKey`는 `preventDefault`를 안 함 (`App.ts:87` 주석, ④-8 ③). 근거 `01_worker_draft.md:142` 「입력칸 밖에서는 기본 동작이 없어 필요 없음」의 전제가 틀림
   - 예상 재현: 메인 고름 → 라벨 `새` 입력 → 색 빨강 (라벨 칸 값은 프로그램이 다시 안 써서 브라우저 글자 되돌리기 기록이 남음) → 포커스 빼고 Ctrl+Z
   - 예상 결과: 앱 Undo가 색을 되돌림 + 브라우저 기본 Undo가 라벨 칸을 `버튼`으로 → `onInput` → `onEdit('label','버튼')` 새 단계 기록 + `future` 비움. 키 한 번에 색 · 라벨이 함께 되돌아가고 Ctrl+Shift+Z 무동작 → MF-31 · MF-30 위반
   - 지금 e2e는 못 덮음 (QA-21 · A2 · A14는 다른 것을 골랐다 돌아오며 기록을 비움, QA-22 · A10 끝은 Undo 전에 라벨 칸이 다시 쓰이거나 사라짐)
   - 검수자는 브라우저를 못 돌려 실패를 직접 보지 못함, 관찰 + 코드로 가능성 높다고 판단
   - 고칠 방법: ① e2e로 먼저 (`e2e/mini-figma-undo.spec.ts`): 메인 → `prop-label` `fill('새')` → `prop-color` 빨강 → `pressUndo` → 캔버스 글자[0] = `새` · 메인 `btn-blue` → `pressRedo` → `btn-red` + `새` → `pressUndo` → `새` → `pressUndo` → `버튼`, desktop · mobile ② 통과하면 근거에 붙이고 끝 ③ 실패하면 마스터가 사용자에게 ④-8 ③을 「앱이 처리한 Undo · Redo(`keyAction`이 undo/redo = 입력칸 밖)만 `preventDefault`, 입력칸 안 키와 Delete · Backspace는 그대로」로 바꿀지 묻는다 (작업자 혼자 바꾸지 않음) ④ 바꾸면 `onKey`에서 undo · redo일 때만 `preventDefault`, `app.test.ts`에 body의 cancelable Ctrl+Z = `defaultPrevented === true`, input 대상 Ctrl+Z · body Delete = `false`, `dev_todo.md:20` · `App.ts:87` 주석 · `CLAUDE.md` 문구 갱신 (마스터)

문제없는 것: keydown deps `[doc, selectedId, history]`가 핸들러가 읽는 값을 모두 덮음(`nextId` 제외 인정) · cleanup으로 리스너 1개, `unmount()` 뒤 0개 · 입력칸 안 키 · 수정키는 `keyAction` 경유 · 한 동작 = 렌더 1번 (같은 렌더의 doc · history · selectedId에서 계산, 묶음 2 NB 4) · 선택 정리 `reconcileSelection`, 메인 삭제 불가, `nextId` Undo 밖(b5 · b6), Undo 49번 경계(A9 · A19 · 단위 60번) 맞음, 고르기 기록 안 됨(QA-24) · [↑][↓] `stopPropagation` · 경계 렌더 0번 · `disabled` 없음 · MOVE 1줄 · 건수(app +28 · rootOnlyHooks +1 = 246, e2e 48 × 2) 맞음 · 묶음 2 NB 1 · 3 반영 · 편차 1(다시 고르기는 검출력을 높이고 ④-7로 뜻 유지, 다만 위 흐름을 가림) · 편차 2(A6 전체가 구현 전 실패 15건에 있음) · 편차 3(맨 아래 행 5번 + b1 5번이 원래 뜻을 둘 다 지킴) 인정

[NON-BLOCKING]
1. `qa_todo.md` 글귀를 테스트와 맞출 것 (마스터): QA-21 · A2 · A14에 「다른 것을 골랐다 돌아온 뒤 Undo」, A12 ② 「맨 아래 행 [↓] 5번 = 무동작, `b1` 행 [↓] 5번 = 한 칸씩 6번째로」, A12 ① 「버튼 23개」 → 「메인 포함 24개」
2. QA-A8 ② · ③(선택 상자 · 체크박스에서 Ctrl+Z)도 기본 Undo가 b2 라벨 칸에 적용될 수 있으나 단언 범위 밖 → BLOCKING 결론 뒤 함께 다시 볼 것
3. `history`는 늘 `doc`과 같이 바뀌어 deps에서 빠져도 지금 테스트로는 못 잡음 (deps에 있으므로 그대로, 기록만)
- 재현 (2026-11-11T19:15, 작업자 · 앱 코드 안 고침): QA-29 추가(미커밋) → desktop · mobile 실패. Ctrl+Z 1번 = 메인 글자 `버튼` + 색 blue (두 단계), Ctrl+Shift+Z = 브라우저 기본 Redo가 라벨만 `새`로 (빨강 단계 사라짐). 원인: Chromium 글자 되돌리기 기록은 포커스를 빼도 남아 Ctrl+Z · Ctrl+Shift+Z에 기본 Undo/Redo가 라벨 칸에 적용, `onKey`가 `preventDefault` 안 함 → 그 `input`을 `onInput`이 새 편집으로 기록 + `future` 비움. 선택 상자 · 체크박스 포커스에서 Ctrl+Z도 기본 Undo가 이전 라벨 칸에 적용돼 새 편집으로 기록됨 (A8은 라벨을 단언 안 해 못 잡음) → 사용자 결정 필요

## 묶음 3 · Dev-9 ~ 12 · 회차 2/3 — APPROVE (2026-11-11T19:33)
- 대상: `04_diff_dev11-fix.patch` (`d29715c..32f73bc`: 23d84ab test · e57484e fix · 32f73bc docs + 마스터 문서 커밋), 마스터 실행: vitest 41 files · 1064 passed, tsc 0, playwright 전체 272 passed, `packages/` diff 비어 있음, 남은 서버 없음

1회차 BLOCKING 1 해소, 새 BLOCKING 없음. 확인한 것 (파일 직접, git · 테스트는 못 돌려 마스터 결과와 diff로 건수 대조):
- Q18 판정 `keys.ts:21-49`: `isTextField`(TEXTAREA 또는 checkbox 아닌 INPUT) = 전부 null(③), `isChoiceControl`(SELECT · checkbox) = Delete · Backspace만 null, Undo/Redo 통과(②), 그 밖 = 원래 판정(①)
- `App.ts:100-110`: `targetType` = `HTMLInputElement`의 type, `preventDefault`는 undo · redo일 때만(되돌릴 것이 없어도 막음), Delete · null은 안 막음. `00_master_dialogue.md:86` Q18 ② 변경과 맞음
- 그 밖 input을 글자 칸으로: 앱 input은 text · checkbox뿐(`PropertyPanel.ts:70,83`) → 동작 영향 없음
- QA-29 (`undo.spec.ts:236-291`): 다시 고르지 않아 브라우저 기록이 남은 채 Undo → Redo → Undo → Undo 한 단계씩. QA-30: 포커스가 선택 상자 · 체크박스에 남은 채 앱 Undo · Redo + 라벨 글자 · 칸 값 `새` 그대로 → 체크박스 단계에서도 겹침을 잡음. 구현 전 실패(`Expected "새" Received "버튼"`) = 1회차 재현과 같은 증상
- QA-A8 (`attack.spec.ts:232-275`): ② · ③ Delete · Backspace 무시, Ctrl+Z = 파랑, Ctrl+Shift+Z = 빨강, ① 라벨 칸은 앱 Undo 없음(빨강)
- 문서: qa_todo A8 · 1회차 NB 1(QA-21 · A2 · A14, A12 ① 「메인 포함 24개」 · ②) 반영, MF-34 · `dev_todo.md:20` · CLAUDE.md 키보드 줄 · `App.ts:87-89` 주석이 Q18과 일치
- Q18 밖 동작 그대로: `anyModifier` · Alt 무시, 입력칸 안 Delete · Backspace null, `undo.ts` · `applyEdit` · `moveThroughHistory`는 diff에 없음
- 건수: 단위 246 → 263 (+17: keys 4 × 3 = 12, app 1 → 2 나눔 + 4 = 5), 구현 전 실패 8 = keys 4 + app 4, e2e 268 → 272

[NON-BLOCKING]
1. 주석 두 곳이 Q18 이전 표현: `e2e/mini-figma-helpers.ts:85` 「입력칸 안의 키는 앱이 무시하므로」, `e2e/mini-figma-undo.spec.ts:23` 「입력칸 안의 키는 앱이 무시하기 때문이다」 → 「라벨 글자 칸 안의 키는 앱이 무시」로 (동작 영향 없음)
2. Ctrl+Y는 앱 키가 아니라 안 막음 — Windows Chromium에서 Ctrl+Y는 브라우저 기본 Redo → 라벨 칸 글자 되돌리기(③) 뒤 포커스를 빼고 Ctrl+Y면 브라우저 Redo가 라벨 칸에 적용돼 일반 수정 한 단계로 기록될 수 있음. Q18 ③ 「결과는 일반 수정」 범위 안, 앱 Undo 기록은 안 깨짐 → 기록만
3. QA-A8 ② · ③의 `b2 글자 취소` 단언은 겹침을 못 잡음 (그 전에 글자 입력이 없어 브라우저 기록이 비어 있음). 겹침은 QA-29 · 30이 맡음 → 그대로

- 처리 계획 (마스터): 1은 3단계 QA 전에 작업자에게 주석만 고치게 함(테스트 코드라 마스터가 안 고침), 2 · 3은 기록만 (2는 README 「알려진 한계」 후보)
