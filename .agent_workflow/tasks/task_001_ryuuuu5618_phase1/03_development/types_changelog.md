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

## 2026-11-11 · task_001 0.5단계: Phase 1 코어 타입
- 추가: `COMMENT_NODE` · `CommentVNode` (VNode 합집합에 포함), `HISTORY_LIMIT = 50`, `StyleMap`, `AreaChildren`, `Path`, `Patch`(SET_TEXT · SET_ATTR · SET_STYLE · INSERT · REMOVE · REPLACE · MOVE), `HistoryEntry`, `HistoryNode`
- 이유: 명세 「알고리즘 결정」 — 결정 1 B(TEXT 객체, 기존 유지) · 결정 3 A(patch 목록, 전 · 후 포함) · 결정 4 A(경로 + 순서대로) · 결정 5 B(공백 · 주석 유지) · 결정 7 B + VNode(양방향 연결 리스트, 한도 50) · §5(영역 상자 = 보이지 않는 감싸개, boolean = 값 `""`, style 항목별) · Key 확장(MOVE)
- 기존 타입은 그대로 (`TextVNode` · `ElementVNode` · `ComponentVNode` · `Props` · `Key` · `VNodeChild`). `Props` 주석에 boolean · style 규칙만 덧붙임
- 영향: `react-dom-bindings` `renderVNode`가 아직 주석 VNode를 그리지 못함(타입은 통과, 런타임은 Dev에서 처리), `react-reconciler` diff · `react-dom-bindings` patch · `react-dom` History가 새 타입을 씀
- 확인: `npx tsc --noEmit` 통과(exit 0), `npx vitest run` 2 files · 17 tests 통과
