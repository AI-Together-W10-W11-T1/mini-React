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
