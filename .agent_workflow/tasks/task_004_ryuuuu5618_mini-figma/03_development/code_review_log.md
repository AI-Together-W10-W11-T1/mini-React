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
