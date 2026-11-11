# 01 작업자 기획 초안: batching

- 근거: `01_request_spec.md`(승인) · task_002 Dev-27 · 28 · QA-21 · 현재 코드(HEAD 5ce2cf8)
- 초안: `../03_development/dev_todo.md`(Dev 4개) · `../04_qa_evidence/qa_todo.md`(인수 5 · 공격 4 · 기대값 변경 4 · 회귀 3)

## ① Dev 요약

| Dev | 패키지 | 한 줄 | PRD |
| --- | --- | --- | --- |
| Dev-1 | `scheduler` · `react-reconciler` (+ 단위 테스트, `react-dom` 테스트) | `queueMicrotask` Batching, 컴포넌트당 예약 1번, 같은 값 예약 안 함, effect는 patch 직후, 안전장치 연달아 50번. 단위 테스트를 `await` 형태로 | §4.2 · P2-15 · P2-16 · T-10 · T-12 |
| Dev-2 | `fixtures/perf-bench` | 엔진 시나리오(B-06 · B-07)가 마이크로태스크를 기다리도록 async로. 렌더 횟수 새로 측정 | §8.1 B-06 · B-07 |
| Dev-3 | `e2e` | 새 `phase2-batching.spec.ts` + 기존 렌더 · effect 횟수 기대값 4곳 | P2-15 · P2-16 · T-12 · T-14 · T-15 |
| Dev-4 | 문서 | README · wiki의 "즉시 동기 · Batching 미구현" 문장 | §4.2 |

순서와 커밋: Dev-1 → 2 → 3 → 4, 항목 하나 = 커밋 하나. 바깥 루프로 e2e를 Dev-1 전에 먼저 써서 실패를 확인하고(커밋은 Dev-3), Dev-1 직후에는 perf-bench · e2e가 잠시 실패하는 것이 정상이다 (`packages/` 단위는 모두 통과).

## ② 사용자 확인용 테스트 케이스

### 인수 (e2e, desktop · mobile)

| 이름 | 이럴 때 · 이렇게 하면 · 이렇게 된다 | 덮는 ID |
| --- | --- | --- |
| QA-1 [+3] 렌더 1번 | 처음 상태에서 · [+3]을 누르면 · 카운터 3, 렌더 +1, `[count]` effect +1, 탭 제목 `카운터 3` | §4.2 · P2-15 · P2-16 · T-14 |
| QA-2 렌더는 핸들러가 끝난 뒤 | [+3]의 `click()` 직후 같은 JS 안에서 읽으면 · 아직 `0`, 한 틱 뒤 `3` | §4.2 · P2-15 |
| QA-3 [추가] 렌더 1번 | 글을 입력하고 · [추가]를 누르면 · 목록 1개, 입력창 비워짐(같은 참조), 렌더 +1, memo +1 | §4.2 · P2-15 · T-13 · T-14 |
| QA-4 effect는 patch 직후 | [+3] 뒤 · 제목 effect가 돌 때 · 그 순간 화면은 이미 `3`, 제목은 1번만 씀 | P2-16 · T-12 |
| QA-5 대시보드 횟수 | `/perf-bench/`에서 B-06 · B-07 실행하면 · `setter 10번 → 렌더 1번`, `동작 13번 → 렌더 13번`, 정확성 일치 (시간은 단언 안 함) | §8.1 · §4.2 |
| QA-A1 한 틱 20번 | [+3]을 한 JS 안에서 20번 연달아 · 카운터 60, 렌더 +1 | §4.2 |
| QA-A2 한 틱 입력 3번 | 입력창 `value`를 3번 바꿔 `input` 3번 · 마지막 `가나다`, 렌더 +1 | §4.2 · P2-15 |
| QA-A3 한 틱 목록 동작 | [위로] 2 · 체크 · 삭제를 한 JS 안에서 · 최종 순서 · 완료 상태가 차례대로 쌓은 결과와 같음, 렌더 +1 | §4.2 · T-13 |
| QA-A4 처음으로 돌아오는 묶음 | [+1] 뒤 [그대로](결과가 0으로 돌아옴) · 카운터 0, 본문 DOM 변경 0건 | §4.2 |
| QA-R1 ~ R3 회귀 | Phase 2 e2e 전부 · Phase 1 96건 · vitest · tsc | T-10 · T-12 · T-14 · T-15 |

### 단위 (Vitest)

| 파일 | 검사 내용 |
| --- | --- |
| `packages/scheduler/src/__tests__/scheduler.test.ts` (다시 씀) | 같은 틱 예약 → 1번 · 호출 직후엔 안 돔, 컴포넌트별 1번씩, 예외 뒤 다음 예약 정상, 연달아 50번 정상 · 51번째 오류, 오류 뒤 복구, DOM 전역 없이 동작 |
| `react-reconciler/.../useState.test.ts` | setter 3번 → 렌더 1번 · 최종 +3, 같은 값 0번, 값 setter 연속은 마지막 값, stale 클로저 +1, 함수형 setter는 가장 최근 값 |
| `.../useEffect.test.ts` | 모은 렌더의 patch 직후 한 번 실행, cleanup 순서, 효과 안 setter → 다음 렌더 연쇄(최종 상태), `[]`가 자기 자신을 반복 안 함, unmount 뒤 setter 무시 |
| `.../hookErrors.test.ts` | 렌더 중 setter 오류 유지, 렌더 예외 뒤 큐 안 막힘, 안전장치 50 · 51 |
| `.../useMemo.test.ts` · `functionComponent.test.ts` | 최종 상태 · 이전 VNode · apply 실패 복구(await 형태) |
| `react-dom/.../render.test.ts` | 클릭 → 한 틱 뒤 DOM, [+3] 렌더 1번 · 같은 값 0번, patch 실패 복구 |
| `fixtures/perf-bench/__tests__/scenarios.test.ts` · `runner.test.ts` | B-06 · B-07 렌더 횟수와 정확성 (③ 대시보드) |

## ③ 바뀌는 기존 단언 (전 → 후)

### 단위: 횟수 · 방식이 바뀌는 것 (총 12건)

나머지(대략 60여 건)는 setter · 이벤트 호출 뒤 `await flush()`만 붙고 **값은 그대로**다. 규칙: 테스트에서 setter 하나하나 뒤에 flush를 넣어 "호출 하나 = 렌더 하나"를 유지한다.

| # | 위치 | 전 | 후 |
| --- | --- | --- | --- |
| U-1 | `useState` "한 핸들러에서 함수형 setter 3번 … 렌더도 3번" | `renders === 1 + 3`, 값 +3 | `renders === 1 + 1`, 값 +3 (이름도 "렌더 1번"으로) |
| U-2 | `useState` "값 setter 3번 → 마지막 값 · 렌더도 3번" | `renders === 4` | `renders === 2`, 값 3 |
| U-3 | `render.test.ts` "함수형 setter 세 번 = 렌더 3번 · 최종 3" | `renders === 4`, DOM `3` | `renders === 2`, DOM `3` (이름도 바꿈) |
| U-4 | `hookErrors` "setter 안 렌더의 예외가 호출한 쪽으로" `expect(() => setN(1)).toThrow('render boom')` | 호출한 쪽에서 잡힘 | 마이크로태스크 오류로 잡음 (④ 참고) |
| U-5 | `hookErrors` 깊이 복구 `for 1..100: expect(() => setN(i)).toThrow('boom')` + `setN(1000)` not throw | 호출마다 throw | 호출마다 오류가 나도 다음 예약이 정상 (④ 방식) |
| U-6 | `hookErrors` 안전장치 4건 (10 정상 · 50 정상 · 51 오류 · 매번 setter 오류 + 복구) `fc.mount()`가 throw | `mount()` 안 중첩 렌더에서 throw | 연달아 예약된 렌더 50번 정상 · 51번째 오류 (한도 숫자 · 문구 "무한 렌더" 같음), 오류 뒤 새 setter 정상 |
| U-7 | `functionComponent` "setter가 일으킨 update에서 apply가 던져도 같은 복구" `expect(() => setN(1)).toThrow('apply boom')` | 호출한 쪽 | 마이크로태스크 오류 (④ 방식), 복구 · 상태 값 남음은 그대로 |
| U-8 | `render.test.ts` "patch가 던지면 영역을 마지막 성공 모습으로 … 예외는 setter 호출자에게" | 호출자에게 throw | 마이크로태스크 오류 (④ 방식), 영역 복구 단언은 그대로 |
| U-9 | `useEffect` "중첩 렌더에서 같은 effect가 다시 돌아도 cleanup이 빠지지 않는다" | 안쪽(중첩) 렌더가 effect를 먼저 처리 | 중첩 렌더가 없어짐 → 같은 목적(effect 본문 · cleanup 횟수가 짝이 맞음)을 연쇄 렌더로 다시 씀. 최종 상태 · cleanup 균형 단언 유지 |
| U-10 | `useEffect` "같은 목록 뒤쪽 effect는 안쪽 렌더가 대신 실행해 한 번만 돈다" | 중첩 | 연쇄 렌더에서도 한 번만 돈다로 다시 씀 |
| U-11 | `useEffect` "안쪽 렌더가 실패해 예외를 삼켜도 바깥의 뒤쪽 effect가 … 빠지지 않는다" | 중첩 | 안쪽 렌더가 실패해도 모은 effect가 빠지지 않는다로 다시 씀 |
| U-12 | `scheduler.test.ts` 12건 (즉시 동기 3 + 중첩 깊이 9) | 동기 실행 · 중첩 순서 · 깊이 | 마이크로태스크 예약 · 컴포넌트당 1번 · 연달아 50번 · 복구 (파일을 새로 씀, "DOM 전역 없이 동작" · "50은 한도 상수" 유지) |

### e2e (총 5건, 렌더 · effect 횟수만)

| # | 시나리오 · 파일 | 전 | 후 |
| --- | --- | --- | --- |
| E-1 | task_002 QA-3 (`phase2-counter.spec.ts`) | 제목 "렌더 횟수는 3 늘어 4가 된다", `renderCount === 4` | "1 늘어 2", `renderCount === 2` (카운터 `3` · 제목 · 이어서 `4`는 그대로) |
| E-2 | QA-14 (5) (`phase2-log.spec.ts`) | `[6, 5, 1]` | `[4, 3, 1]` |
| E-3 | QA-14 (6) | `[9, 5, 2]` | `[6, 3, 2]` |
| E-4 | QA-A2 (`phase2-attack.spec.ts`) | `renderCount === 61`, 제목 "렌더 61" | `41` (1 + 30 + 10). 카운터 `60` · 제목 `카운터 60`은 그대로 |
| E-5 | QA-17 (`phase2-log.spec.ts`) | `renderCount > 20` (실제 23) | `>= 20` (실제 20). 이 동작 묶음이 렌더 3번 줄어 `> 20`이 실패하기 때문 |

주석만 바뀌는 곳(값 그대로): QA-12 (c) "렌더 2번 중 …" → "렌더 1번 (setter 2번을 모음)", memo `m + 1` 그대로 / QA-14 · QA-3의 "즉시 동기" 설명 문장 / `fixtures/phase2-app/App.ts` [+3] 주석. 회귀에서 달라질 수 있는 곳(단언은 그대로 두고 통과만 확인): [추가]가 렌더 2번 → 1번이 되므로 todo spec의 DOM 변경 기록 수 단언(QA-9 · QA-10 근처)이 달라지면 최종 DOM이 같은지 확인한 뒤 근거에 따로 적는다.

### 대시보드 (`fixtures/perf-bench`, 총 5건)

| # | 위치 | 전 | 후 |
| --- | --- | --- | --- |
| P-1 | `scenarios.test.ts` B-06 "setter 10번 → 렌더 10번 …(즉시 동기 정책)" | `counts = { setters: 10, renders: 10 }` | `{ setters: 10, renders: 1 }` (이름 "렌더 1번 … Batching") |
| P-2 | B-06 `verify` · `scenarios.ts` | `lastDelta === SERIAL_SETTERS` (10) | `lastDelta === 1`, 최종 카운터 10 · 화면 = state 그대로 |
| P-3 | B-06 DOM 작업 | `patchLines: 10, byKind: { SET_TEXT: 10 }` | **실측으로 확정** (예상: 글자 바꿈 1줄) — 노드 유지 `507 / 507` · 추가 · 제거 0은 그대로 |
| P-4 | B-07 "동작 13번 → 렌더 16번" | `{ actions: 13, renders: 16 }` | `{ actions: 13, renders: 13 }` (이벤트 하나 = 렌더 하나, [추가]가 2번 → 1번). 이름 · 주석의 계산식도 갱신 |
| P-5 | B-07 기록판 직접 쓰기 · 기록 수 | `logPanelWrites = 16 * 3`, `mutationRecords 36 · nodesAdded 4 · nodesRemoved 2` | `13 * 3`, 나머지는 **실측으로 확정** (예상 숫자를 미리 적지 않음. 다른 값이 나오면 이유를 근거에 적음) |

호출 형태도 바뀜: `runEngineScenario` · `runScenarioById`가 Promise → 테스트 8곳이 `await`. 보기 표(`format.ts`)는 값만 채우는 문자열이라 코드 변경 없음, `runner.test.ts`는 단계 시나리오용 기존 `runScenario` 검사를 유지(새 async 변형 검사만 추가).

## ④ 명세에서 애매했던 점 · 제안

1. **렌더 예외가 어디로 나오는가 (결정 필요, 마스터 확인).** 지금은 setter 호출자에게 렌더 · patch 예외가 던져지는데(단위 12건 중 U-4 · 5 · 7 · 8), Batching은 마이크로태스크 안이라 호출자에게 못 간다. 제안: 마이크로태스크에서 **그대로 다시 던진다**(콘솔 오류, 삼키지 않음). 예약 표시 · 연달아 횟수는 `finally`로 되돌려 큐가 안 막힘. 단위 테스트는 오류를 잡는 방법으로 `process` 오류 이벤트가 아니라 scheduler에 **오류 처리 함수를 꽂는 자리**(`setRenderErrorHandler`, 기본 = 다시 던지기)를 두는 안. 이 자리는 명세 밖 추가라 마스터 승인이 필요하다. 승인이 안 되면 Dev-1 단위 테스트는 vitest의 마이크로태스크 오류 포착(`process.once('uncaughtException')`)으로 대신한다.
2. **"컴포넌트당 예약 1번"을 어디서 지키나.** 지금 `scheduleRender(task)`는 task만 받아 같은 컴포넌트인지 알 수 없다. 제안: `scheduleRender(owner, task)`(owner = 컴포넌트 인스턴스)로 바꿔 scheduler가 `owner` 표시를 관리(단위 테스트가 쉬움). 대안은 `FunctionComponent`가 `scheduled` 플래그를 갖는 것. 타입(`types.ts`)은 안 바뀐다.
3. **중첩 렌더가 없어져 effect 보호 코드 일부가 불필요해질 수 있다** (`latestPending` · `runCount`). 이번 task에서는 지우지 않고(회귀 위험) 주석만 정리, 정리는 다음 기회.
4. **대시보드 B-07의 이벤트 사이 대기.** 사용자 클릭은 서로 다른 틱이므로 `act`가 이벤트마다 마이크로태스크를 비운다(렌더 13번). 한 번에 몰면 렌더 1번이 되고 입력값도 틀어진다. B-06만 "연달아 10번 = 렌더 1번"이 Batching의 핵심 비교다.
5. **QA-17의 `> 20`** 은 렌더가 줄어 실패하므로 `>= 20`으로 완화한다(qa_todo 원문도 "20번 이상"). 동작 수를 늘려 `> 20`을 유지하는 안도 가능 — 어느 쪽이든 횟수 단언만의 변경이다.
6. 대시보드의 측정 시간 숫자(task_002 완료 근거의 B-06 · B-07 기록)는 옛 정책 값이므로 Dev-2에서 다시 재서 새 줄로 남기고, 옛 줄에는 "task_002 당시(즉시 동기)" 표기만 한다.
