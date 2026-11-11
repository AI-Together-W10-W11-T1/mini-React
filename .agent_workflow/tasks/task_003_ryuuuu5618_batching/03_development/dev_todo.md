# dev_todo: batching

- 명세: `../01_request_spec.md` · 브랜치: `feature/batching`
- 규칙: 항목 하나 = 커밋 하나. 체크할 때 완료 근거 필수 (근거 없는 체크는 무효)
- 기준: task_002 Dev-27 · Dev-28을 이번 task로 가져온 것. 순서 = Dev-1(엔진 + 단위 테스트) → Dev-2(대시보드) → Dev-3(e2e) → Dev-4(문서)
- 바깥 루프(ATDD): Dev-1을 시작하기 **전에** `qa_todo.md`의 새 e2e(`e2e/phase2-batching.spec.ts`)와 바뀌는 기대값(Dev-3 목록)을 먼저 써서 desktop에서 **실패하는 것을 확인**하고 로그를 Dev-3 근거에 붙인다. 커밋은 Dev-3에서 한다
- 알려진 중간 상태: Dev-1 커밋 직후에는 `fixtures/perf-bench` 단위 테스트와 e2e 일부가 Dev-2 · Dev-3 전까지 실패한다 (그 외 `packages/` 단위 테스트는 모두 통과해야 한다)

## Dev 항목

- [ ] **Dev-1** (`scheduler` + `react-reconciler` + 단위 테스트): 마이크로태스크 Batching — setter는 칸 값을 바로 바꾸고 렌더는 컴포넌트당 한 번 예약 [§4.2 Batching · P2-15 · P2-16 · T-10 · T-12]
  - 의존: 없음
  - 대상 파일:
    - `packages/scheduler/src/scheduler.ts` — `scheduleRender`가 `queueMicrotask`로 컴포넌트당 1번만 예약(이미 예약돼 있으면 무시), 안전장치 = 예약된 렌더가 연달아 `NESTED_RENDER_LIMIT`(50)번 넘게 이어지면 오류. 예외가 나도 예약 표시 · 연달아 횟수를 되돌려 큐가 막히지 않게 한다 (`finally`)
    - `packages/react-reconciler/src/FunctionComponent.ts` — `setState`: 렌더 중 오류 유지 → 값 갱신(같은 값이면 예약 안 함) → `scheduleRender`. effect는 모은 렌더의 patch 직후(지금 `runEffects` 위치 그대로). `// [AI Note]` 주석(결정 9 A → B)과 effect 중첩 설명 갱신
  - 테스트(먼저 실패 확인):
    - `packages/scheduler/src/__tests__/scheduler.test.ts` 다시 쓰기: 같은 틱 여러 번 예약 → task 1번(마이크로태스크 뒤), 호출 직후에는 안 돈다, 컴포넌트가 다르면 각각 1번, task가 던져도 다음 예약 정상, 연달아 50번 정상 · 51번째 오류(문구 "무한 렌더" · 50), 오류 뒤 복구, DOM 전역 없이 동작
    - `useState.test.ts` · `useEffect.test.ts` · `hookErrors.test.ts` · `useMemo.test.ts` · `functionComponent.test.ts`(react-reconciler), `render.test.ts`(react-dom): setter · 이벤트 뒤 `await flush()`(= `await new Promise((r) => setTimeout(r, 0))`) 형태. 최종 상태 · DOM 단언은 그대로. 바뀌는 단언은 `02_planning_review/01_worker_draft.md` ③
    - 새 단위: setter 3번 → 렌더 1번 · 최종 +3, 같은 값 → 렌더 0번, 함수형 setter 연속 · 값 setter 연속은 마지막 값, 모은 결과가 처음과 같아도 patch 0건, effect는 모은 렌더의 patch 직후 한 번, 렌더 중 setter는 그 자리에서 오류(유지), unmount 뒤 setter 무시
  - 알고리즘: 결정 9 B (queueMicrotask · 컴포넌트당 예약 1번 · 같은 값 예약 안 함 · effect는 patch 직후 · 안전장치 = 연달아 50번)
  - 완료 근거로 남길 것: 바꾼 테스트 파일 · 새로 쓴 테스트 수, `npx vitest run packages/`의 통과 수와 실패(perf-bench) 수, `npx tsc --noEmit`, 커밋 해시, `types_changelog.md`에 마스터가 쓸 `[알고리즘]` 문장 초안
  - **완료 근거 (Evidence)**:

- [ ] **Dev-2** (`fixtures/perf-bench`): 대시보드 B-06 · B-07을 Batching 기준으로 — 엔진 시나리오를 마이크로태스크를 기다리는 형태로 [§8.1 B-06 · B-07 · §4.2 렌더 횟수 기록]
  - 의존: Dev-1
  - 대상 파일: `fixtures/perf-bench/runner.ts`(await하는 변형 추가, 기존 `runScenario`는 단계 시나리오 B-01~05용으로 유지), `fixtures/perf-bench/scenarios.ts`(엔진 시나리오 `act`가 setter · 이벤트 뒤 마이크로태스크를 기다림 → `runEngineScenario` · `runScenarioById`가 Promise, B-06 `what` · 주석, `verify`의 렌더 횟수), `fixtures/perf-bench/main.ts`(`await runScenarioById`), `fixtures/phase2-app/App.ts`(주석만: [+3] 렌더 1번)
  - 테스트(먼저 실패 확인): `fixtures/perf-bench/__tests__/scenarios.test.ts` · `runner.test.ts`(바뀌는 단언은 draft ③ 대시보드 표). B-07은 이벤트마다 마이크로태스크를 비워 실제 클릭 하나하나가 따로 렌더되게 한다 (한 번에 몰면 앞 입력값을 못 읽어 화면이 틀어짐)
  - 알고리즘: 결정 9 B. **측정값은 실제로 다시 잰 값만** 쓴다 (예상 숫자는 완료 근거에 "실측"으로 적은 것만)
  - 완료 근거로 남길 것: 바뀐 단언 전 → 후, 대시보드에서 다시 잰 B-06 · B-07 한 줄(렌더 횟수 · 전체 시간 · patch 줄 · 기록 · 노드 유지), `npx vitest run fixtures/`, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-3** (`e2e`): 인수 e2e — 새 Batching spec + 렌더 · effect 횟수 기대값만 갱신 [P2-15 · P2-16 · T-12 · T-14 · T-15 · §4.2 · §8.1 B-06]
  - 의존: Dev-1, Dev-2
  - 대상 파일: `e2e/phase2-batching.spec.ts`(새 파일, qa_todo QA-1~5 · QA-A1~A4), `e2e/phase2-counter.spec.ts`(QA-3), `e2e/phase2-log.spec.ts`(QA-14 · QA-17 · QA-12 주석), `e2e/phase2-attack.spec.ts`(QA-A2), `e2e/phase2-perfbench.spec.ts`(B-06 · B-07 렌더 횟수 칸). 최종 상태 · DOM 단언은 그대로 (draft ③ e2e 표)
  - 테스트(먼저 실패 확인): Dev-1 시작 전에 기대값 · 새 spec을 쓴 뒤 `npx playwright test e2e/phase2-batching.spec.ts e2e/phase2-counter.spec.ts e2e/phase2-log.spec.ts e2e/phase2-attack.spec.ts --project=desktop`에서 실패한 줄을 근거에 붙인다. Dev-1 · 2 뒤 전체 통과
  - 알고리즘: 결정 9 B
  - 완료 근거로 남길 것: 실패 로그(전), 바뀐 단언 전 → 후, `npx playwright test`(phase1 96 + phase2 전부, desktop · mobile) 통과 수, 커밋 해시
  - **완료 근거 (Evidence)**:

- [ ] **Dev-4** (문서): README · 위키 문장 갱신 — "즉시 동기 · Batching 미구현"을 Batching 기록으로 [§4.2 · 결정 9 B]
  - 의존: Dev-3
  - 대상 파일: `README.md` 34 · 39째 줄 근처("setter마다 즉시 동기 렌더", "[+3]은 렌더 3번"), `wiki/architecture.md`(14 · 49 · 88 · 99 · 117째 줄 근처), `wiki/index.md`(24 · 25 · 43), `wiki/qna_prep.md`(90 · 91 · 130 · 144). `CLAUDE.md`는 이미 결정 9 B로 바뀌었으니 건드리지 않는다. 문장은 실제 구현 · 측정(Dev-1 · 2 완료 근거)과 task_003 기록 기준으로만 쓴다 (코드 · 테스트 변경 없음)
  - 테스트: 해당 없음(문서). `grep -rn "즉시 동기\|Batching 미구현\|배칭은 구현하지" README.md wiki`로 남은 옛 문장 확인
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: 바꾼 줄 목록(전 → 후), 남은 옛 문장 grep 결과(task_002 이력으로 남길 것은 "task_002 당시" 표기), 커밋 해시
  - **완료 근거 (Evidence)**:
