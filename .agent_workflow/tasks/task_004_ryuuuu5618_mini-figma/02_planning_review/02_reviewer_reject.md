# 02 검수자 판정: 기획 1회차 — REJECT (회차 1/3)

> `mr-reviewer`(Opus) 답을 마스터가 그대로 저장. 검수 대상: `01_worker_draft.md` · `03_development/dev_todo.md` · `04_qa_evidence/qa_todo.md`

REJECT (회차 1/3)

[BLOCKING]이 3개라 반려합니다. 계획이 엔진에 대해 세운 가정 대부분은 코드와 맞습니다. 다만 단위 테스트의 patch 종류 단언 하나가 엔진 동작(SET_PROP)과 맞지 않습니다.

## 엔진 가정 확인 결과 (코드로 대조)
- key MOVE 조건: 형제 전부에 key가 있어야 하고 중복이 없어야 함 (`diff.ts:16`, `isKeyed` `:36-45`). 컴포넌트 key는 결과 요소로 물려줌 (`resolveComponents.ts:51-56`) → 계획대로 맞음.
- ④-1 후보 B (버튼 자식 모두에 key `'icon'` · `'label'`): `diffKeyedChildren`(`diff.ts:51-86`) 기준으로 켜면 `INSERT [..,0]` 1줄, 끄면 `REMOVE [..,0]` 1줄이고 글자 span은 그대로 남음 → 계획의 설명이 맞음. 후보 A도 위치 비교로 `INSERT`/`REMOVE` 1줄 → 맞음.
- `...it`의 id: `h()`는 `key`만 꺼냄 (`h.ts:22`) → `id`가 props에 남는다는 공통 주의 2가 맞음.
- `h()`의 null · boolean 자식은 버림 (`h.ts:8`) → 맞음.
- 이벤트 버블링: 요소마다 진짜 `addEventListener`를 붙임 (`events.ts:35`) → 브라우저 버블링 그대로라 ④-4의 `stopPropagation` 판단이 맞음.
- Batching: 컴포넌트당 마이크로태스크 1번 (`scheduler.ts:54-59`, `FunctionComponent.ts:278-285`) → 한 동작 = 렌더 1번, `await Promise.resolve()` 한 번이면 됨 → 맞음.
- `lastPatches`: `render()`가 `FunctionComponent`를 돌려주고 getter가 있음 (`render.ts:23-33`, `FunctionComponent.ts:68`) → 맞음.
- SET_TEXT는 `nodeValue` 대입 (`patch.ts:31`, characterData), SET_EVENT는 DOM을 바꾸지 않음 (`patch.ts:98-104`) → MutationObserver 단언이 맞음.
- 포트 5199 · `reuseExistingServer: false` · mobile = chromium + `isMobile`/`hasTouch` (`playwright.config.ts:8-16`) → 설정을 고치지 않아도 된다는 판단이 맞음. `watchApp(page,'canvas')`도 그대로 쓸 수 있음.

## 지적

1. [BLOCKING] [Dev-7 · qa_todo 단위 `app.test.ts` · 엔진 가정 `value`/`checked`] patch 종류 단언 「라벨 입력 = SET_TEXT만, 크기 · 색 = SET_ATTR만, 아이콘 켜기 = INSERT만 / 끄기 = REMOVE만, ★→♥ = SET_TEXT만 (SET_EVENT 제외)」는 엔진 동작과 맞지 않아 그대로 쓰면 실패 (dev_todo.md:115, qa_todo.md:88).
   - diff는 VNode의 `value`/`checked`가 바뀌면 DOM 값과 상관없이 `SET_PROP` 줄을 만든다 (`diff.ts:109`, `:211-218`). DOM 대입을 건너뛰는 것은 patch 단계뿐 (`patch.ts:105-110`).
   - 속성 패널의 라벨 칸 · 크기/색/아이콘 선택 상자 · 체크박스가 매번 `SET_PROP`을 함께 만든다.
   - ④-3(레이어 이름 = 지금 글자)을 따르면 메인 라벨 입력 때 레이어 행의 `SET_TEXT`도 섞인다.
   - → 단언 대상을 「캔버스 하위 경로의 patch」로 한정 (path가 캔버스 경로로 시작하는 것만, 그 안에서 SET_EVENT 제외). 또는 `SET_PROP`(패널)도 기대값에 적을 것. 동작마다 기대 개수를 적을 것 (예: 메인 라벨 한 글자 = 캔버스 SET_TEXT 2줄(메인 · b1), 아이콘 켜기 = 캔버스 INSERT 4줄).
2. [BLOCKING] [e2e 도우미 · QA-22 · 25 · A6 · A9 · A13] `pressUndo`/`pressRedo`가 「먼저 `property-title`을 눌러 포커스를 뺌」(dev_todo.md:164, qa_todo.md:11)인데, 선택이 없으면 `property-empty`가 그려져(qa_todo.md:22) 선택이 풀린 뒤 Undo · Redo 시나리오가 클릭 대기 시간 초과로 실패. 해당: QA-22(:51) · QA-25(:54) · A6(:67) · A9(:70, ④-10) · A13(:74).
   - → 늘 있는 요소로 포커스를 뺄 것 (`document.activeElement?.blur()` 또는 늘 있는 `layer-panel`/`canvas` 제목 클릭). qa_todo 11줄 문구도 같이.
3. [BLOCKING] [MF-14 요구사항 일부 누락] MF-14는 5칸을 「메인 · 인스턴스 모두 편집」(01_request_spec.md:34)인데 인스턴스 쪽 아이콘 보이기(Boolean) · 아이콘 종류(Instance swap) override를 바꾸는 QA가 없음 (QA-13은 표시만, :42).
   - → 인수 시나리오 추가: b2 고르고 아이콘 켜기 + ♥ → b2에만 ♥ 노드, 메인 아이콘을 켜고 ★로 바꿔도 b2는 ♥, ↻로 메인을 따름.
   - → `app.test.ts`에 「인스턴스 하나의 아이콘 켜기 = 그 버튼 경로의 INSERT 1줄」 추가, Dev-8 테스트 목록에.
4. [NON-BLOCKING] [QA-A10 ③] 20번 변경 뒤 Ctrl+Z 한 번 = 한 단계는 리스너 누적을 e2e에서 못 잡을 수 있음(최신 리스너가 마지막에 돌아 덮음). 실제로 막는 건 jsdom 등록 횟수 검사 → 근거 문구 수정 또는 `page.addInitScript`로 등록 수 세기.
5. [NON-BLOCKING] [QA-A8 ①] 라벨 칸 안 Ctrl+Z는 Chromium 입력칸 되돌리기라 `input` 이벤트 → `취` → `취소` + b2 라벨 수정으로 기록. Meta+Z는 맥에서만 → 「`취`」는 Backspace 직후에만 단언, Ctrl+Z 뒤에는 메인 색 · 인스턴스 개수 · 선택 유지만.
6. [NON-BLOCKING] [QA-3 D-05] 빈 안내와 머리 요소가 같은 자리에서 태그가 달라야 REPLACE → 화면 약속 표에 태그(빈 상태 `<p>`, 머리 `<h2>` 등) 적기.
7. [NON-BLOCKING] [`app.test.ts`] 테스트마다 `unmount()`로 `document` keydown 리스너 정리, 리스너 수 spy는 `render()` 전에.
8. [NON-BLOCKING] [MF-04] `rootOnlyHooks.test.ts`에 컴포넌트 파일 목록 단언 (`fixtures/phase2-app/__tests__/rootOnlyHooks.test.ts:62-64` 참고).
9. [NON-BLOCKING] [Dev-3] `HISTORY_LIMIT`은 Phase 1에서 「0번 초기 기록 포함 50」(`packages/react-dom/src/__tests__/history.test.ts:145`). ④-6이 다르면 `UNDO_LIMIT`을 따로.
10. [NON-BLOCKING] [공통 주의 4] 선택 상자를 `onClick`으로 받으면 열 때마다 불림 → 선택 상자 · 체크박스는 `onInput`으로만.
11. [NON-BLOCKING] 「인스턴스가 없어요」 안내(dev_todo.md:26)는 명세에 없음. 넣으면 테스트 대상 아님을 적거나 빼기.

## 사용자 결정 필요

**명세 · 문답과 부딪히는 것**
- ④-6 「최대 50개」의 뜻: 문답 「기록 개수는 50개로~」 → 「최대 50개 (Phase 1과 같음)」(00_master_dialogue.md:58). Phase 1의 50은 0번 초기 기록 포함 → Undo 49번. 계획 추천(Undo 50번)과 다름. QA-A9 · `undo.test.ts` 기대값이 달림.
- ④-5 state 구성: MF-10 · CLAUDE.md는 `main` · `instances` · `selectedId` · Undo 기록. 계획은 `doc = { main, instances }` + `nextId`로 4칸. 동작은 같지만 명세 문구와 모양이 다름. `nextId`를 Undo로 되돌리지 않는 것도 확인 필요.
- ④-8 ①: Delete · Backspace를 「수정키가 없을 때만」은 MF-33보다 좁음 (Shift+Delete 등).
- (새로 찾은 것) 인스턴스가 많을 때 캔버스 배치: 「캔버스는 한 줄로 나란히」와 MF-03 「가로 스크롤 없음」이 mobile 인스턴스 20개 이상(QA-A12)에서 부딪힘. 추천: 줄바꿈(`flex-wrap`) + A12에 `noHorizontalScroll`.

**명세가 말하지 않은 빈 곳 (추천대로 진행해도 무방, 확인만)**
- ④-1 아이콘 자리: B · A 모두 INSERT/REMOVE 1줄 확인. B는 key 하나라도 빠지면 조용히 위치 비교로 돌아가므로 1번의 캔버스 경로 한정 단언이 함께 있어야 함.
- ④-12: `icon: 'star'`(MF-16) → Canvas에서 컴포넌트로 → 무리 없음.
- ④-7 고르기는 묶음을 끝내지 않음 / ④-2 처음 선택 `null` / ④-3 이름 = 지금 글자, 빈 글자면 id / ④-4 행마다 [↑][↓] + `stopPropagation` / ④-9 크기 · 색 = 클래스 / ④-10 추가 뒤 선택 안 바뀜 / ④-11 Undo 버튼 없음 (mobile에서는 되돌릴 방법 없음, 명세대로) / ④-13 경계 버튼은 눌러도 아무 일 없음.

## 지켜진 것
- MF-02: 범위가 `fixtures/mini-figma/` · `e2e/mini-figma-*`뿐, `git diff --stat f224bdd -- packages/` 확인이 Dev-5 · 12와 QA-R1에.
- Hook은 `App`에만, 자식 · model · undo · keys에 `document` · `window` 없음 (rootOnlyHooks 검사). keys.ts가 평범한 객체를 받아 의존 방향 문제 없음.
- MF-01 ~ 34는 3번(MF-14 인스턴스 Boolean · Instance swap)을 빼면 모두 QA에 연결. 제외 범위는 섞이지 않음.
- Undo 시나리오는 실패를 잡을 수 있는 단언 (QA-21 · 22 · 23 · 24 · A6 · A9 · A17). 51번 추가 → Undo 50번 → b1~b4에서 멈춤 → Redo 50번으로 b54까지 계산 확인. 단, ④-6 결정에 따라 기대값이 바뀜.
- 이 앱은 Phase 1 검증 페이지가 아니므로 History 동기화 「해당 없음」 판단이 맞음.
