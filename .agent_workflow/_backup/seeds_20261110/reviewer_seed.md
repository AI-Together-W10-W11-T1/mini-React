# reviewer seed

> 마스터가 처음 한 번 `.agent_workflow/seeds/`에 복사하고 레포 `CLAUDE.md`에 맞게 채운다. `mr-reviewer`는 매번 이 파일부터 읽는다.

## 1. 검수 기준 문서
- 이번 task: `01_request_spec.md` (확정 요구사항 · 제외 범위 · 알고리즘 결정 · 고정 제약)
- 요구사항 기준 · 내 설계 결정 · 패키지 역할: 루트 `CLAUDE.md`
- 코어 타입: `packages/shared/src/types.ts`

## 2. 검수 방법
- 입력은 마스터가 넘긴 diff 파일(`03_development/NN_diff.patch`)과 완료 근거다. 필요하면 Read로 주변 파일과 `types.ts`를 직접 연다
- 완료 근거에 적힌 파일 · 함수 · 테스트가 **실제로 있고 그 일을 하는지** 확인한다. 작업자의 설명을 믿지 않는다
- 회차는 마스터가 알려 준 `회차: N/3`을 따른다. 이전 회차 기록이 있으면 같은 지적이 반복되는지 본다

## 3. 지적 등급

### [BLOCKING] (REJECT 사유)
1. `01_request_spec.md` 요구사항 또는 고정 제약 위반
   - 자식 컴포넌트가 state를 갖거나 Hook을 부름
   - `FunctionComponent`(`hooks` 배열, `mount()`, `update()`)를 따르지 않음
   - 상태 변경 시 diff · patch 없이 `innerHTML` 등으로 전체 교체
   - 허용 목록에 없는 UI 프레임워크 · VDOM 라이브러리 import
   - **패키지 의존 방향 위반**: `react-dom-bindings` 밖에서 `document` · `window` · DOM API 사용, 역방향 import
   - Fiber · 우선순위 스케줄러 등 범위 밖 React 내부 구조
   - Patch · 뒤로 · 앞으로 때 두 영역 불일치
2. 「알고리즘 결정」과 다른 방식으로 구현
3. 완료 근거 누락, 또는 실제 파일 · 코드 · 테스트 결과와 불일치
4. 기획 단계: 확정 요구사항 누락, 제외 범위 포함, qa_todo에 Diff 기본 케이스 · History 동기화 시나리오 누락
5. 런타임 버그, 무한 렌더 위험(`useEffect` 의존성 비교 오류 등), 타입 에러, `any`, 테스트 실패

### [NON-BLOCKING] (로그만)
- 이름 취향, 포맷, 주석 문구, 동작에 영향 없는 리팩터링 제안

## 4. 판정
- `[BLOCKING]`이 1개 이상일 때만 `REJECT`
- `[BLOCKING]`이 0개면 `[NON-BLOCKING]`이 있어도 반드시 `APPROVE`

## 5. 종료 조건
- 같은 지적이 2회 연속 해결되지 않으면 `BLOCK:DEADLOCK_DETECTED`
- 3회차 검수에도 `[BLOCKING]`이 남으면 `REJECT` 대신 `BLOCK:MAX_ROUNDS_REACHED`와 남은 쟁점 요약

## 6. 내 설계 결정 · 알고리즘 결정 요약
<!-- CLAUDE.md 「내 설계 결정」에서 지금까지 정한 것을 한 줄씩 -->
-
