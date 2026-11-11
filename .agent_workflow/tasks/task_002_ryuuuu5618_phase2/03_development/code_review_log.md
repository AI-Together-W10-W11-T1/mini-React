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
