# types_changelog

> `packages/shared/src/types.ts` 변경과 확정 뒤 바꾼 알고리즘 결정을 남긴다. 변경은 마스터만 한다.

<!-- 형식
## 2026-11-11 · VNode에 component 타입 추가
- 이유: Phase 2 함수형 컴포넌트를 VNode 트리에 표현하기 위해
- 영향: react(h), react-reconciler(diff), react-dom-bindings(patch) — 각 패키지 테스트 재실행 완료

## 2026-11-14 · [알고리즘] 재렌더 시점: 동기 → 마이크로태스크 Batching
- 이유: 선택 과제 Batching
- 영향: scheduler, useState 테스트를 await 형태로 변경 — 재실행 완료
-->

## 2026-11-11 · [알고리즘] 재렌더 시점: 결정 9 A 즉시 동기 → B 마이크로태스크 Batching
- 이유 (사용자 원문): "리액트를 공부할려면 배칭 구현하는게 맞는 거 같아서"
- types.ts: `NESTED_RENDER_LIMIT` 주석을 "연달아 50번 렌더"로 (값 50은 그대로)
- 영향: scheduler · react-reconciler(FunctionComponent setter), 단위 테스트 await 형태, e2e 렌더 횟수 기대값 — 재실행 결과 (2026-11-11, Dev-1~4 완료 뒤): `npx vitest run` 36 files · 801 passed, `npx tsc --noEmit` 오류 0, `npx playwright test` 172 passed (desktop 86 · mobile 86, 마스터 재실행 확인). scheduler `scheduleRender(owner, task)` · `setRenderErrorHandler` 추가, setter는 렌더 예약만, 단위 테스트 await 형태(렌더 횟수 · 예외 전달 방식만), e2e 렌더 · effect 횟수 기대값 5곳 + 새 batching spec + perfbench, 대시보드 B-06 렌더 10 → 1 · B-07 16 → 13 다시 측정
