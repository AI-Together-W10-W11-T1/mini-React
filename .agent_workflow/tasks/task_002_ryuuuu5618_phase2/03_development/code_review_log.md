# 개발 검수 기록: phase2

## 1회차 (2026-11-11) · Dev-1~22 (16 제외) · diff `01_diff_src.patch` (8a44ac4..ae0dc7b) · 판정 **APPROVE**

검수자(mr-reviewer, Opus) 답 요약 (원문 그대로의 판정 · 지적):

- [BLOCKING] 0개. 완료 근거의 파일 · 함수 · 테스트가 실제로 있고 적힌 대로 동작. 결정 8 B · 9 A · Hook 정책대로. 엔진 패키지 DOM 없음, `any` 없음, 자식 컴포넌트 Hook · DOM 없음
- 특히 봐 줄 것 1~7
  1. Phase 1 단위 테스트 3건 수정: 정당 (원래 검증 유지, 이벤트 쪽은 새 테스트로 옮김, 한계 테스트 추가)
  2. 결정 8 B: 맞음 (`events.ts:28-37` 처음 핸들러 때만 addEventListener, SET_EVENT는 Map 값만, removeEventListener 없음, QA-17 단언)
  3. effect 중첩 실행: 버그 · 무한 렌더 위험 없음 (`FunctionComponent.ts:169-220`, deps 선저장, latestPending, 늦은 cleanup 즉시 호출, 51번째 오류)
  4. 실패한 렌더 되돌리기: 기본 경로 맞음 (106-123), 틈은 NB-2 · 3
  5. SET_PROP: 맞음 (`domProps.ts:11,14` 다를 때만 대입, 역패치 · Phase 1 History 충돌 없음)
  6. 기록판 빈 `<span>`: 충돌 없음 (VNode 자식이 없어 diff가 안 들어감). 나중에 자식을 주면 깨짐 — `LogPanel.ts:9-11` 주석이 경고
  7. qa_todo 문구: 문서 불일치만. QA-A2 `40` → `60`, QA-21 "1 + 30 + 10 = 41"은 Batching 기준으로 맞음
- [NON-BLOCKING]
  1. 렌더 도중 setter 호출이 막혀 있지 않음 (`FunctionComponent.ts:126-137, 244-250`): 본문에서 setter를 부르면 안쪽 렌더가 hookIndex · pendingEffects를 덮어써 상태 5 · DOM 0이 오류 없이 남을 수 있음. 정책 밖 사용 → 사용자 결정 필요. 권장: 렌더 중 표시를 두고 렌더 중 setter는 오류
  2. 실패한 렌더가 `latestPending`을 되돌리지 않음 (117-122, 182-188): effect 안 setter 예외를 try/catch로 삼킬 때만 바깥 effect 하나가 그 회차에 빠질 수 있음 → 렌더 중엔 지역 목록, 성공 뒤 반영
  3. 렌더 실패 시 setter가 바꾼 state는 남고 DOM · 이전 VNode는 옛것 (다음 성공 렌더에서 반영, 작업자 의도) → README 정책 / 차이점에 한 줄
  4. `value` · `checked`를 요소 종류와 무관하게 프로퍼티로 넣음 (`diff.ts:193-201`, `renderVNode.ts:43-47, 63-64`): Phase 1 편집창의 `<div value>` · `<li value="3">`이 실제 영역에 속성으로 안 그려짐 → 한계 문구를 넓히거나 `input` · `textarea` · `select`로 좁히기
  5. `qa_todo.md:47` QA-A2 `40` → `60` (카운터 · 제목 두 곳), QA 전에 고치기 권장
  6. 지원 밖 이벤트 경고가 렌더마다 반복 (`events.ts:16-19`) → 계획 문구("경고 1회")를 "호출마다"로 맞추면 됨
  7. update 중 `host.apply`가 도중에 던지면 복구 없음 (85-86): DOM 일부만 고쳐지고 previous는 옛것 → catch에서 `host.mount([previous])`로 다시 그리기 가능 (명세 밖)
  8. Dev-10 작은 정책: `mount()` 두 번 · mount 전 `update()`는 오류 — 마스터 확인

## 경량 검수 1회차 (2026-11-11) · NB 반영 + 확장 1 Dev-23~26 · diff `02_diff_src.patch` (e8cde94..daf8f99) · 판정 **REJECT**

- [BLOCKING] 1. [Dev-26 · PRD §8.2 · 명세 2절 「계측 패널의 DOM 변경은 측정에서 뺌」 · 완료 근거 불일치] B-07의 MutationObserver 집계와 M-07 시간에 검증 페이지 ④ 기록판 로그 출력이 섞임. `fixtures/phase2-app/App.ts:42-47` 의존성 없는 effect가 렌더마다 `writeLog()`(14-17행)로 세 칸에 textContent를 직접 씀 → `fixtures/perf-bench/scenarios.ts:499-502`가 observer를 붙인 채 `run.act(area)`를 불러 전부 기록됨. 근거(dev_todo.md:321) 「기록 84 · 추가 52 · 제거 50」 중 48 · 48 · 48이 기록판 쓰기(렌더 16 × 3칸), patch 몫은 36 · 4 · 2. 근거와 `index.html:107` 「읽는 법」은 앱의 DOM 작업처럼 보여 줌
  - 고칠 방법: `countEnginePass`에서 `record.target`이 `[data-testid="log-panel"]` 안이면 기본 집계에서 빼고 「기록판 직접 쓰기 N건」으로 따로 셈(`DomCounts` 칸 추가, 표 비고) · 「읽는 법」에 "B-07의 M-07에는 앱 자신의 effect(탭 제목 · 기록판 쓰기) 시간이 들어간다" 한 줄 · `scenarios.test.ts` B-07에 단언 추가(기록판 기록 따로, 기본 nodesAdded/Removed = patch 쪽 값) · Dev-26 근거 B-07 줄 다시 측정
- [NON-BLOCKING]
  2. `scenarios.ts:559` 엔진 집계 실행 실패 시 fixture가 `{ items: 0, nodes: 0, … depth: 0 }` → 측정값처럼 보임. `null`로 두고 `cellsOf`에서 「집계 실패」 표시
  3. `DOM_PROP_ELEMENTS`가 `packages/shared/src/index.ts:7`에 있음(다른 공통 상수는 types.ts). 규칙 위반 아님 — 마스터가 위치를 정하고 types_changelog에 한 줄
  4. 역패치는 SET_PROP이 자식 복구보다 먼저 적용 → Phase 1 편집창에서 `<select value="x">` 속성과 그 `<option>` 삭제를 함께 한 기록을 「뒤로」 하면 select 선택값이 테스트 영역과 다를 수 있음 (드묾). 「알려진 한계」(request_spec:84)에 한 줄
  5. `hookErrors.test.ts` 「렌더 중 setter 오류 뒤에도 앱이 산다」는 새 인스턴스로 확인 → 테스트 이름을 실제 확인 내용에 맞춤
- 확인(문제 없음): NB-1(`FunctionComponent.ts:58, 162-167, 278`) · NB-2(`staged` 49, 141-154, 214-220) · NB-7(`applyOrRecover` 96-113) · NB-4 경로 안전성 · `applyPatches.ts` `normalizeTree` 수정 타당 · 대시보드 나머지 조건(준비 5 · 측정 30, p50 · p95, 오류 기록, 측정 조건, 계측 패널은 bench-area 밖, M-07 ≠ 페인트) · DOM 접근 fixture 안 · `any` 없음

## 경량 검수 2회차 (2026-11-11) · 재작업 · diff `03_diff_src.patch` (daf8f99..c205c93) · 판정 **APPROVE**

- 1회차 BLOCKING-1 해결 (`scenarios.ts:484-536` effect가 직접 쓰는 세 칸 `LOG_PANEL_DIRECT_CELLS`만 기본 집계에서 빼고 `logPanelWrites`로 따로 셈, `format.ts:53-54` 비고, `index.html:107` 읽는 법, `scenarios.test.ts:235-259` 48 · 36 · 4 · 2, Dev-26 근거 정정). 같은 지적 반복 없음. NB-2 · NB-5 반영
- 작업자가 1회차 지시와 다르게 한 점(로그판 전체가 아니라 직접 쓰는 세 칸만 뺌): 검수자 판단 "맞음" — `log-render` · `log-memo`는 VNode가 그리는 SET_TEXT라 patch 몫. 1회차 지시 문구가 부정확했고 작업자 안을 받아들임
- [NON-BLOCKING] 1. `scenarios.ts:516` 칸을 `act()` 뒤에 찾음 → 나중에 기록판 부모를 REPLACE하는 시나리오면 못 가림 (지금 B-07은 문제 없음). 고친다면 `run.mount()` 직후 칸을 찾아 둠 / 2. phase2-app testid 세 개에 묶임 — B-07 단위 테스트가 48을 단언해서 바뀌면 드러남, 기록만
