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

## 2026-11-11 · Phase 2 타입 추가 (이벤트 · DOM 프로퍼티 patch, Hook 슬롯)
- 이유: 명세 「알고리즘 결정」 — 결정 8 B(리스너 하나 + 핸들러 교체) · 결정 9 A(즉시 동기) · 정책(§4.2 Hook, §4.3 `value` · `checked`)
- 추가:
  - `Patch`에 `SET_EVENT { path, event, before, after: EventHandler | null }` · `SET_PROP { path, name: 'value' | 'checked', before, after: DomPropValue | null }` (역패치 = 전후 뒤집기, 기존 규칙 그대로)
  - `EventHandler` · `DomPropName` · `DomPropValue`
  - Hook 슬롯: `Deps`(`null` = 생략) · `EffectCleanup` · `EffectCallback` · `StateHook` · `EffectHook` · `MemoHook` · `HookSlot` (Hook 슬롯을 `shared`에 둔 이유: 작업자 · 검수자가 같은 모양을 기준으로 보게)
  - 상수 `NESTED_RENDER_LIMIT = 50` (무한 렌더 안전장치)
- 영향:
  - `react-reconciler/src/invertPatches.ts`의 `switch`와 테스트 도우미 `react-reconciler/src/__tests__/applyPatches.ts`의 `switch`가 새 kind를 다루지 않아 **`npx tsc --noEmit` 오류 2건** (TS2366). 마스터는 코드를 고치지 않으므로 **1단계 기획의 첫 Dev 항목**에서 작업자가 두 `switch`에 새 kind를 넣어 tsc 0으로 되돌린다
  - `npx vitest run`: 432 passed (변경 전과 같음)
