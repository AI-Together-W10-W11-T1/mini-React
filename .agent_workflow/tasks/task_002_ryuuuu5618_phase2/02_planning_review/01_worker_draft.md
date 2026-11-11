# 01 작업자 기획 초안: phase2

- 쓴 문서: `../03_development/dev_todo.md` (Dev 28개 = 필수 22 + 확장 1 성능 대시보드 4 + 확장 2 Batching 2), `../04_qa_evidence/qa_todo.md` (인수 19 + 공격적 9 + 확장 2)
- 기준: `../01_request_spec.md` (승인본) · `../00_phase2_page_proposal.md` · `../03_development/types_changelog.md`. 코드는 고치지 않았고 커밋도 하지 않았다.

## 1. 요약

### Dev 항목 (필수 22 → 확장 1 → 확장 2)

| Dev | 패키지 | 내용 | 의존 |
| --- | --- | --- | --- |
| 1 | `react-reconciler` | **tsc 복구**: `invertPatches` · 테스트 도우미 `applyPatches`의 `switch`에 `SET_EVENT` · `SET_PROP` (역패치 = 전후 뒤집기) → `tsc` 오류 2건 → 0 | - |
| 2 | `react-reconciler` | `diff`: 이벤트 props 비교 → `SET_EVENT` (속성에서 뺌) | 1 |
| 3 | `react-reconciler` | `diff`: `value` · `checked` → `SET_PROP` (SET_ATTR에서 뺌) | 1 |
| 4 | `react-dom-bindings` | 이벤트 저장소 + 리스너 하나: `setEventHandler` (결정 8 B) | - |
| 5 | `react-dom-bindings` | `renderVNode`가 새 요소에 이벤트 · `value` · `checked` 적용, `applyDomProp` | 4 |
| 6 | `react-dom-bindings` | `patch`의 `SET_EVENT` · `SET_PROP` (같은 값이면 대입 안 함 → 커서 유지) | 5 |
| 7 | `scheduler` | `scheduleRender`: 즉시 동기 + 중첩 50 안전장치 (결정 9 A) | - |
| 8 | `react` | `useState` · `useEffect` · `useMemo` 공개 API + 디스패처, 렌더 밖 호출은 오류 | - |
| 9 | `react-reconciler` | 자식 컴포넌트 풀기 `resolveComponents` (자식 Hook 호출 오류, key 물려주기, diff의 컴포넌트 VNode 오류 가드) | 8 |
| 10 | `react-reconciler` | `FunctionComponent` 뼈대: `hooks` · `mount()` · `update()`, 이전 VNode 보관, 가짜 host로 단위 테스트 | 2 · 3 · 7 · 8 · 9 |
| 11 | `react-reconciler` | `useState`: 초기값 · 지연 초기화 · 유지 · 구분 · setter(같은 값 · 함수형 · 연속) · 자동 갱신 | 10 |
| 12 | `react-reconciler` | `useMemo` + `depsChanged` (`Object.is`, 길이 다름 = 바뀜) | 10 |
| 13 | `react-reconciler` | `useEffect`: patch 직후 · 의존성 3종 · cleanup · `unmount()` | 11 · 12 |
| 14 | `react-reconciler` | Hook 오류 정책(순서 · 개수) · 무한 렌더 50 · 렌더 예외 뒤 복구 | 11 ~ 13 |
| 15 | `react-dom` | `render(App, container)` 진입점 (bindings를 host로 연결) | 6 · 10 |
| 16 | `react-dom` | 엔진 통합 테스트(jsdom, 카운터 · 입력 · 목록 미니 앱): T-09 ~ T-16 · §6.2 한 번에 | 11 ~ 15 |
| 17 | fixture + e2e | 검증 페이지 뼈대 + 루트 `App` + ① `CounterPanel` | 15 |
| 18 | fixture + e2e | ② `GreetingPanel` 입력창 (포커스 · 커서) + 숫자 칸 정책 함수 | 17 |
| 19 | fixture + e2e | ③ `TodoPanel` · `TodoRow`: 추가 · 체크 · 삭제 · 요약(`useMemo`) · 안내 ↔ 목록 | 18 |
| 20 | fixture + e2e | ③ [위로] · [아래로] = Key MOVE, 같은 key 노드 유지 | 19 |
| 21 | fixture + e2e | ④ `LogPanel` + 탭 제목 effect (렌더 · effect · memo · patch 줄 수) | 20 |
| 22 | fixture + e2e | 공격적 시나리오 + T-16 코드 확인 + 전체 회귀(vitest · tsc · playwright 전체) | 21 |
| 23 | `react-dom` | **(확장 1)** `render` 옵션 `onPatch` 전달 | 15 |
| 24 | fixture + e2e | **(확장 1)** 측정 러너 + 통계 (준비 5 · 측정 30, p50 · p95) | - |
| 25 | fixture + e2e | **(확장 1)** B-01 ~ B-05 + M-02 ~ M-06 | 23 · 24 |
| 26 | fixture + e2e | **(확장 1)** B-06 · B-07 + M-01 · M-03 · M-07 + 측정 조건 + 결과 표 페이지 | 25 |
| 27 | `scheduler` + `react-reconciler` | **(확장 2, 시간이 남으면)** Batching: 결정 9 A → B(`queueMicrotask`) | 11 · 13 · 14 |
| 28 | fixture + e2e | **(확장 2, 시간이 남으면)** 화면 e2e 횟수 기대값을 Batching 기준으로 갱신 | 27 · 22 |

Dev-1 · 4 · 7 · 8 · 24는 서로 의존이 없어 처음부터 나란히 시작할 수 있다. 일정(마감 2026-11-11)이 빠듯하면 확장을 Dev-28 → 27 → 26 순으로 미루고 이유를 기록한다.

### 인수 시나리오
`qa_todo.md`의 QA-1 ~ QA-19 + 공격적 QA-A1 ~ A9 + 확장 QA-20 · QA-21 (desktop · mobile 모두에서 실행). 파일 6개: `phase2-render` · `phase2-counter` · `phase2-input` · `phase2-todo` · `phase2-log` · `phase2-attack` (+ 확장 `phase2-perfbench`). QA-19는 Phase 1 e2e 96건 회귀 확인이고 새 스펙 파일이 없다. 공통 도구는 `e2e/phase2-helpers.ts`.

## 2. 테스트 케이스 표 (사용자 확인용)

### 표 1 — 인수 시나리오 (브라우저에서 사람이 하는 것처럼)

| 이름 | 한 줄 요약 (이럴 때 · 이렇게 하면 · 이렇게 된다) | 덮는 PRD · T |
| --- | --- | --- |
| QA-1 초기 화면 | 페이지를 열면 → 칸 4개(카운터 0 · 이름 입력 · 할 일 안내 · 기록판)와 탭 제목 `카운터 0 - Phase 2`가 보이고 "렌더 · Patch" 버튼은 없다 (오류 없음, mobile 가로 스크롤 없음) | P2-01 · 02 · 05 · 15 · 22 · T-09 |
| QA-2 [+1] D-01 | [+1]을 누르면 → 카운터 글자만 바뀌고(DOM 변경은 글자 1건) 버튼 · 입력창 · 안내 노드는 같은 참조 | P2-11 · 12 · 14 · 15 · 22 · T-10 · 14 · 15 · D-01 |
| QA-3 [+3] | [+3]을 누르면 → 카운터가 3 늘고 렌더가 3번(함수형 setter 연달아, 즉시 동기 정책 기록) | P2-14 · §4.2 함수형 · 연속 setter · T-10 · 14 |
| QA-4 [그대로] | 같은 값으로 setter를 부르면 → 렌더 0번, DOM 변경 0건, effect도 안 돎 | P2-14 · §4.2 동일 값 · T-04 · T-14 |
| QA-5 이름 입력 D-01 | 이름을 치면 → 인사 글이 `안녕하세요, 민수님`으로 바뀌고 지우면 안내로 돌아간다 | §4.3 입력 · value · P2-22 · T-14 · D-01 |
| QA-6 커서 유지 | 입력창 가운데에 글자를 끼워 넣으면 → 값이 맞고 커서가 방금 친 글자 뒤에 있으며 포커스를 잃지 않는다 | §4.3 포커스 · 커서 · T-10 |
| QA-7 입력창 재생성 없음 | 입력창에 포커스를 둔 채 다른 상태(카운터)를 바꾸면 → 입력창이 같은 노드이고 값 · 포커스 · 커서가 그대로 | §4.3 입력 노드 · P2-12 · T-10 · T-06 |
| QA-8 추가 D-03 · D-05 | 빈 목록에서 할 일을 추가하면 → 안내가 목록으로 교체되고, 하나 더 추가하면 앞 항목은 같은 노드로 남는다 (요약 · 입력창 비움) | P2-10 · 22 · T-14 · 16 · D-03 · D-05 |
| QA-9 체크 D-02 | 체크박스를 누르면 → `checked` 프로퍼티와 `<li>` class가 바뀌고(속성 수정) 요약의 완료 수가 맞는다 | P2-10 · T-14 · 16 · D-02 · §4.3 checked |
| QA-10 삭제 D-04 · D-05 | 가운데 항목을 지우면 → 나머지 `<li>`는 같은 노드(엉뚱한 줄이 안 지워짐), 모두 지우면 목록이 안내로 돌아온다 | P2-22 · T-14 · D-04 · D-05 |
| QA-11 순서 바꾸기 (Key) | [위로] · [아래로]를 누르면 → 순서가 바뀌고 세 `<li>`가 모두 같은 노드, DOM 변경은 `<ul>`의 자식 이동뿐 | §5 Key · T-06 · T-14 |
| QA-12 요약 · memo | 카운터 · 이름 · 입력 글 때는 memo 횟수가 그대로, 목록이 바뀔 때만 1씩 늘고 요약이 맞다 | P2-17 · T-13 · P2-10 |
| QA-13 상태 안 섞임 | 카운터 · 이름 · 목록 · 입력 글이 각자 값을 유지한다 | P2-13 · T-11 · T-10 |
| QA-14 기록판 횟수 | 로드 · [+1] · 한 글자 · [그대로] · [+3] · [추가] 뒤 렌더 · effect · memo 횟수가 정해진 값(1·1·1 → 2·2·1 → … → 9·5·2) | P2-16 · 18 · T-12 · 13 · 15 |
| QA-15 patch 줄 수 | [+1]의 patch 줄 = 이벤트 교체 줄(핸들러 달린 요소 수) + DOM을 바꾸는 줄 2, 항목이 늘어도 후자는 2 | P2-19 · 20 · 21 · T-06 · 15 |
| QA-16 탭 제목 effect | 카운터가 바뀔 때만 탭 제목이 바뀌고 이름 입력에는 안 바뀐다 (`[count]`) | P2-16 · T-12 |
| QA-17 이벤트 중복 없음 | 렌더를 20번 넘게 일으킨 뒤 [+1] 한 번 = 정확히 +1, `addEventListener`는 (요소 · 이벤트)당 1번 | §4.3 · §6.2 핸들러 교체 후 중복 호출 방지 |
| QA-18 참조 유지 | [+1] · 한 글자 · 체크 각각에서 관련 없는 노드는 같은 참조, DOM 변경은 바뀐 곳 1~2건뿐 | P2-21 · T-06 · T-15 |
| QA-19 Phase 1 회귀 | Phase 1 e2e 96건 + vitest 기존 432건이 그대로 통과 (History 동기화 필수 확인 대신) | T-01 ~ T-08 회귀 · History |
| QA-A1 (공격) 특수문자 | 이름 · 할 일에 `<b>` · `&amp;` · 이모지 · `<img onerror>` → 글자 그대로, 요소 안 생김 | §5 VNode 입력 · P1-02 연계 · T-14 |
| QA-A2 (공격) 연타 | [+1] 30번 · [+3] 10번 · [위로] 5번 연타 → 카운터 40, 렌더 61, 오류 없음, 맨 위에서 멈춤 | P2-15 · §4.2 연속 setter · §4.3 · §5 Key |
| QA-A3 (공격) 빈 입력 | 빈 할 일 · 공백만 [추가], 이름 전부 지움 → 상태 그대로 · 안내로 복귀, 입력창 노드 유지 | §4.2 동일 값 · §5 빈 입력 · P2-14 |
| QA-A4 (공격) 새로고침 | 모두 바꾼 뒤 새로고침 → 전부 초기값 · render 1 · 탭 제목 초기, 오류 없음 | P2-05 · 12 · T-09 |
| QA-A5 (공격) id 재사용 없음 | 항목 3개 추가 → 모두 삭제 → 새 항목 = `todo-4` | §5 목록 · key |
| QA-A6 (공격) 항목 많음 | 항목 20개에서 [+1] → 목록 DOM 변경 0건, `<li>` 20개 같은 참조, DOM 줄 2 · 이벤트 줄 86 | P2-21 · T-06 · T-15 |
| QA-A7 (공격) 경계 이동 | 맨 위 [위로] · 맨 아래 [아래로] · 항목 하나 → 아무 일 없음(렌더 0번) | §4.2 동일 값 · §5 Key |
| QA-A8 (공격) 빠른 타이핑 | 7글자를 지연 없이 입력 → 값 · 인사 글 정확, 포커스 · 입력창 노드 유지 | §4.3 · P2-15 |
| QA-A9 (공격) 이동 뒤 핸들러 | 순서를 바꾼 뒤 삭제 · 체크 → 맞는 항목에 걸리고 한 번만 동작 | §6.2 핸들러 교체 · §5 Key · P2-10 |
| QA-20 (확장 1) 성능 대시보드 | `/perf-bench/`에서 B-01 ~ B-07 실행 → 반복 횟수(준비 5 · 측정 30) · p50 · p95 · 오류 0 · 측정 조건이 표에 나옴 (숫자는 단언 안 함) | PRD §7 · §8 |
| QA-21 (확장 2, 시간이 남으면) Batching | 확장 2를 하면 → 최종 상태 단언은 그대로, [+3] 렌더 1번 등 횟수 단언만 바뀜 | 결정 9 B · §4.2 Batching |

### 표 2 — 단위 테스트 (코드 안에서 부품 하나씩 확인)

| 파일 | 검사 내용 | 덮는 PRD · T |
| --- | --- | --- |
| `react-reconciler/src/__tests__/invertPatches.test.ts` (고침) | `SET_EVENT` · `SET_PROP` 전후 뒤집기, 두 번 뒤집으면 원래 | T-08 회귀 · P2-19 |
| `react-reconciler/src/__tests__/diffEvents.test.ts` | 이벤트 추가 · 교체 · 삭제 줄, 같은 함수는 줄 없음, 속성으로 새지 않음, 무작위 왕복 | P2-19 · §4.3 · T-04 |
| `react-reconciler/src/__tests__/diffProps.test.ts` | `value` · `checked` 줄(정규화 · `null`), SET_ATTR로 새지 않음, 무작위 왕복 | P2-19 · §4.3 |
| `react-dom-bindings/src/client/__tests__/events.test.ts` | 리스너 하나 + 핸들러 교체: 교체 뒤 1번만 호출, `null`이면 무반응(리스너 남김), `addEventListener` 횟수, 지원 밖 이벤트 경고 | §4.3 · §6.2 핸들러 교체 · 해제 |
| `react-dom-bindings/src/client/__tests__/renderVNode.test.ts` (고침) · `domProps.test.ts` | 새 요소에 이벤트 · `value` · `checked` 적용(속성이 아니라 프로퍼티), 같은 값이면 대입 안 함 | P2-05 · 20 · §4.3 |
| `react-dom-bindings/src/client/__tests__/patch.test.ts` (고침) | `SET_EVENT` · `SET_PROP` 적용, 커서 유지, DOM 변경 0건, MOVE와 섞임 | P2-20 · 21 · T-06 |
| `scheduler/src/__tests__/scheduler.test.ts` | 즉시 동기, 중첩 깊이 50 허용 · 51째 오류, 예외 뒤 깊이 복구 | P2-15 · 안전장치 |
| `react/src/__tests__/hooks.test.ts` | 디스패처 위임, 디스패처 없으면 Hook 오류 | P2-08 · T-16 |
| `react-reconciler/src/__tests__/resolveComponents.test.ts` | 컴포넌트 풀기(중첩 · props 반영), 자식 Hook 호출 오류, key 물려주기, diff의 컴포넌트 VNode 오류 | P2-02 · 09 · 10 · T-16 |
| `react-reconciler/src/__tests__/functionComponent.test.ts` | `hooks` 배열 · `mount()` · `update()` · 이전 VNode 보관 · 무변경이면 apply 없음 · 새 VNode 매번 생성 (가짜 host) | P2-01 · 03 ~ 06 · 18 · 19 · T-09 · T-15 |
| `react-reconciler/src/__tests__/useState.test.ts` | 초기값 · 지연 초기화 · 유지 · 상태 구분 · 같은 값 렌더 0번 · 함수형 · 연속 setter · 자동 갱신 | P2-11 ~ 15 · T-10 · T-11 · §6.2 |
| `react-reconciler/src/__tests__/deps.test.ts` · `useMemo.test.ts` | 의존성 비교 경계, 재사용 · 재계산 · 생략 · `[]` | P2-17 · T-13 · §6.2 Memo |
| `react-reconciler/src/__tests__/useEffect.test.ts` | patch 뒤 실행, 생략 · `[]` · 변경, cleanup 순서, `unmount()`, effect 안 setter | P2-16 · T-12 · §6.2 Effect |
| `react-reconciler/src/__tests__/hookErrors.test.ts` | 순서 · 개수 오류, 자식 Hook 오류, 무한 렌더 50, 렌더 예외 뒤 복구 | P2-08 · T-16 · §6.2 오류 복구 |
| `react-dom/src/__tests__/render.test.ts` | `render` 초기 UI · 클릭 뒤 자동 갱신 · 형제 참조 유지 · DOM 변경 0건 · 통째 교체 안 함 | P2-05 · 06 · 20 · 21 · T-09 · T-15 |
| `react-dom/src/__tests__/phase2Integration.test.ts` | 미니 앱 통합: [+3] · 같은 값 · 입력 · 포커스 · 커서 · 핸들러 중복 · Key 이동 · 안내 ↔ 목록 · memo · effect · unmount | T-09 ~ T-16 · §4.3 · §5 Key · §6.2 |
| `fixtures/phase2-app/__tests__/readNumberInput.test.ts` | 숫자 칸 빈칸 · 글자 → 상태 그대로 (화면에 쓰지 않는 순수 함수) | §4.3 지원하지 않는 입력 · §6.2 |
| `fixtures/phase2-app/__tests__/todoOps.test.ts` | 추가 · 체크 · 삭제 · 이동 · id 재사용 없음 · 경계 · 입력 안 고침 | §5 목록 · key · P2-22 |
| `fixtures/phase2-app/__tests__/rootOnlyHooks.test.ts` | 소스 확인: Hook 호출은 `App.ts`에만, 자식 컴포넌트에는 없음, 컴포넌트가 `document` · `window`를 안 씀 | P2-07 ~ 09 · T-16 (코드 확인) |
| `fixtures/perf-bench/__tests__/stats.test.ts` · `runner.test.ts` · `scenarios.test.ts` (확장 1) | p50 · p95, 준비 5 · 측정 30, 오류 기록, 시나리오별 patch 종류 · 집계 단위 | PRD §7 · §8 |

### 표 3 — T-ID · §6.2 정책 대조 (빠짐없이)

| ID | 단위 (Dev) | 화면 (QA) |
| --- | --- | --- |
| T-01 ~ T-08 | **task_001에서 덮음 · 회귀로 확인** (QA-19). T-04 · T-06은 Phase 2 화면에서도 다시 확인 | QA-19 (T-04: QA-4 · QA-A7, T-06: QA-2 · 11 · 18 · A6) |
| T-09 컴포넌트 | Dev-9 · 10 · 15 · 16 | QA-1 · QA-A4 |
| T-10 상태 유지 | Dev-11 · 16 | QA-2 · 3 · 6 · 7 · 13 |
| T-11 상태 구분 | Dev-11 · 16 | QA-13 |
| T-12 Effect | Dev-13 · 14 · 16 | QA-14 · QA-16 |
| T-13 Memo | Dev-12 · 16 | QA-12 · QA-14 |
| T-14 사용자 동작 | Dev-16 | QA-2 ~ 5 · 8 ~ 11 · 13 · QA-A1 ~ A9 |
| T-15 Phase 연계 | Dev-10 · 15 · 16 | QA-2 · 14 · 15 · 18 · A6 |
| T-16 컴포넌트 · 루트 제약 | Dev-8 · 9 · 14 · 16 · **22(코드 확인)** | QA-8 · QA-9 · QA-13 (자식 props 반영) |
| §6.2 History · 경계 · 새 분기 · 미저장 편집 | task_001 | QA-19 |
| §6.2 빈 입력 · 공백 · 주석 · 복수 루트 경계 | task_001 + Phase 2는 빈 입력만 | QA-A3 |
| §6.2 속성 · 이벤트 제거 · 핸들러 교체 후 중복 호출 방지 | Dev-4 · 6 · 16 | QA-17 · QA-A2 · QA-A9 |
| §6.2 함수형 setter · 동일 값 · 연속 setter | Dev-11 · 16 | QA-3 · QA-4 · QA-A2 · QA-A7 |
| §6.2 Effect 의존성 생략 · `[]` · 변경 · cleanup · unmount | Dev-13 · 14 · 16 (화면에서는 `[count]` 한 가지만) | QA-14 · QA-16 |
| §6.2 Memo 의존성 생략 · 경계 | Dev-12 · 16 (화면에서는 `[todoList.items]` 한 가지만) | QA-12 |
| §6.2 입력값 · 포커스 · 커서 유지, 지원하지 않는 입력, 오류 복구 | Dev-6 · 14 · 16 · 18 | QA-6 · QA-7 · QA-A3 · QA-A8 |
| §6.2 Key · Batching | Key: Dev-16 · 20 (Phase 1 diffKeyed는 task_001) / Batching: Dev-27 | Key: QA-11 · QA-A2 · QA-A9 / Batching: QA-21 (확장 2) |
| 명세 7절: Diff D-01 ~ D-05 | Dev-16 | D-01 QA-2 · 5, D-02 QA-9, D-03 QA-8, D-04 QA-10, D-05 QA-8 · 10 |
| 명세 7절: History 동기화 | - | QA-19 (Phase 1 `phase1-history.spec.ts` 회귀) |
| 명세 7절: 화면 크기 2개 | - | 모든 QA가 desktop · mobile에서 실행 |

## 3. 아직 안 덮인 T-ID와 이번 범위 밖 사유

- **덮이지 않은 T-ID: 없음.** T-09 ~ T-16 전부 단위 + 화면으로 덮는다. T-01 ~ T-08은 task_001에서 덮었고 QA-19(Phase 1 e2e 96 + vitest)로 회귀를 확인한다.
- **화면으로 못 덮고 단위로만 덮는 것**: `FunctionComponent` 구조(`hooks` · `mount()` · `update()`), effect `[]` · 의존성 생략 · cleanup · `unmount()`, memo 경계, 잘못된 Hook 호출 오류, 무한 렌더 50, 지연 초기화, 숫자 칸 빈칸 정책, T-16 코드 확인 — 검증 페이지가 `[count]` effect와 `[todoList.items]` memo 한 가지씩만 쓰기 때문.
- **범위 밖 (명세 「구현 제외 범위」)**: 피그마 같은 도형 편집기(미니 React 완성 뒤 별도), 루트 이벤트 위임(결정 8 C) · 합성 이벤트 시스템, `value` · `checked` 외 DOM 프로퍼티, `click` · `input` 외 이벤트(그래서 할 일 입력의 Enter 키 추가도 없음), Phase 2 페이지의 History(되돌리기), 자식 컴포넌트의 상태 · Hook, Fiber · 우선순위 스케줄러 · 동시성 렌더링, SVG 지원(마스터가 Phase 1 · 2 끝난 뒤 리마인드), Phase 1 검증 페이지 기능 변경(회귀만).
- **필수에서 뺀 것(확장으로만)**: Batching(Dev-27 · 28, 시간이 남으면), 성능 대시보드의 Batching 비교 시나리오(제외), PRD §7 M-01 자동 집계(대시보드는 "사람이 옮겨 적는 칸"으로 표시).
- **기록만 하는 것**: 실제 React와의 차이, §9 설계 선택 · 정책 차이 문장은 4단계 위키 · README에서 정리.

## 4. 명세에 없어서 내가 정해 둔 작은 것 · 애매했던 점 (마스터 확인 요청)

틀리면 알려 달라 (Dev에서 막히지 않도록 미리 적어 둠). 아직 코드가 없어 되돌리기 쉽다.

1. **key 물려주기 (Dev-9 · 19)**: `h(TodoRow, { key })`의 key는 컴포넌트 VNode에 붙는데 diff는 풀린 `<li>`의 key를 본다. 제안: 풀 때 결과 요소에 key가 없으면 컴포넌트 VNode의 key를 물려준다 (대안: `TodoRow`가 `h('li', { key: props.id })`를 직접 달기 — 엔진은 안 바뀌지만 id를 따로 props로 받아야 함).
2. **기록판의 effect · patch 칸 (Dev-21)**: 두 값은 렌더가 끝난 **뒤에야** 알 수 있어서 VNode로 그리면 항상 한 박자 늦은 값이 보인다. 제안: 이 두 칸은 VNode에 자식 없는 빈 `<span>`으로 두고 의존성 생략 effect가 `textContent`로 직접 씀(fixture 안 effect라 DOM 접근 허용, diff와 충돌 없음). 렌더 횟수 · memo 횟수는 렌더 중에 알 수 있어 VNode 글로 그림. 그러려면 `FunctionComponent.lastPatches`(읽기 전용)를 노출해야 함. 대안: 모두 VNode로 그리고 "직전 값"이 보인다고 받아들이기.
3. **patch 줄 수 = 이벤트 교체가 대부분 (Dev-21)**: 렌더마다 핸들러가 새 함수라 모든 `on…` 요소에 `SET_EVENT` 한 줄씩 생겨 [+1]도 patch가 6줄 이상이다(항목 20개면 86줄). 제안: 기록판에 "전체 줄"(`log-patch`)과 "그중 이벤트 교체"(`log-patch-events`)를 나눠 보여 주고 부분 갱신은 둘의 차이(DOM을 바꾸는 줄, [+1]이면 2)로 확인. 명세 문장 "마지막 update의 patch 줄 수"를 둘로 나눈 것.
4. **`value` · `checked` 규칙 (Dev-3 · 5)**: 정규화(`value` 문자열 · 숫자 → 문자열, `checked`는 `true` · `""` → true / `false` → false, 나머지 = 없음)와 적용 규칙(없음 `null` → `value ''` · `checked false`)을 내가 정했다. 또 Phase 1 `domToVNode`는 `<input value="1">` · `<input checked>`의 속성을 props(`value: "1"` · `checked: ""`)로 읽는다 → 이제 그 props가 바뀌면 SET_ATTR이 아니라 SET_PROP(프로퍼티)로 가서 **속성 글은 안 바뀐다**. Phase 1 e2e · 단위에는 이런 시나리오가 없어 회귀는 안 나올 것으로 보지만, Phase 1 편집기에서 `value` · `checked` 속성을 고치는 경우의 한계로 기록해도 되는지 확인 요청.
5. **연결 방향 · 인터페이스 위치 (types.ts 변경 없음)**: Hook 디스패처는 `react`가 `setHookDispatcher` · `HookDispatcher`를 내보내고 `react-reconciler`가 import한다(`react-reconciler` → `react` · `scheduler` · `shared`, 순환 없음). `FunctionComponentHost`(`mount` · `apply`)는 `react-reconciler`, `render()`의 인자 · 옵션은 `react-dom` 안에 둔다. 모두 `types.ts` 밖.
6. **작은 정책 (명세에 없어 정함)**: ① 지원 밖 `on…` 이벤트 이름은 경고 1회 후 무시(지금 함수 props 경고와 같은 방식) ② `unmount()` 뒤 setter는 아무 일 없음 ③ **diff는 컴포넌트 VNode를 받으면 오류**라고 명세에 적혀 있지만 현재 `diff.ts`에는 가드가 없어서 Dev-9에서 오류 가드를 더함(Phase 1 테스트에 컴포넌트 VNode 입력은 없음) ④ 컴포넌트 `children`은 풀 때 props로 넘기지 않음(검증 페이지가 안 씀) ⑤ `App()` 결과는 VNode 하나라 영역 자식 목록 = `[결과]`.
7. **숫자 칸 정책 (Dev-18)**: 화면에 숫자 칸이 없으므로 화면에서는 안 쓰는 순수 함수 `readNumberInput`을 만들어 단위로만 검증한다. 안 쓰는 코드를 두기 싫으면 "해당 없음 · 기록만"으로 바꿀 수 있다 (명세 6절 단위 검증 목록에는 들어 있어서 일단 포함).
8. **검증 페이지 세부 (제안, 사용자 확인 요청)**: 이름이 비면 인사 글 "이름을 입력해 주세요" · 빈 / 공백만 할 일 [추가]는 상태 그대로(렌더 0번) · 맨 위 [위로] · 맨 아래 [아래로]는 상태 그대로 · 할 일 상태를 `todoList = { items, nextId }` 하나로 묶음(그래야 [추가]가 렌더 2번, 삭제 · 체크 · 이동이 1번) · `data-testid` 이름 · 목록이 처음에는 비어 있음(D-05를 화면에서 보이려고).
9. **확장 2 (Dev-27)**: Batching을 하면 "중첩 50번" 안전장치의 의미가 "연달아 50번 렌더"로 바뀐다. `types_changelog.md`의 `[알고리즘]` 줄은 마스터가 쓰고, 작업자는 문장 초안만 완료 근거에 적는다.
10. **일정**: 필수 22개 Dev가 마감(2026-11-11)에 비해 많다. 줄일 후보는 Dev-16(통합 테스트, 개별 Dev의 단위 테스트가 대부분 같은 것을 덮음)과 Dev-18의 `readNumberInput`(7번). 확장은 뒤부터 미룬다.
