# reviewer seed

> 마스터가 처음 한 번 `.agent_workflow/seeds/`에 복사하고 레포 `CLAUDE.md`에 맞게 채운다. `mr-reviewer`는 매번 이 파일부터 읽는다.

## 1. 검수 기준 문서
- 이번 task: `01_request_spec.md` (확정 요구사항 · 제외 범위 · 알고리즘 결정 · 고정 제약)
- 요구사항 기준 · 내 설계 결정 · 패키지 역할: 루트 `CLAUDE.md`
- 코어 타입: `packages/shared/src/types.ts`
- `.agent_workflow/_backup/`은 이전 시작분 백업이다. 검수 기준으로 쓰지 않는다

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
4. 기획 단계: 확정 요구사항 누락, 제외 범위 포함, qa_todo에 Diff 기본 케이스 · (History를 다루는 task면) History 동기화 시나리오 누락
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
- 텍스트 노드: TEXT 노드 객체 (결정 1 B). 주석 노드도 `{ type: '#comment', props: { nodeValue } }`로 남김
- 공백 · 주석: 모두 VNode로 남김 → VNode 자식 번호 = 실제 DOM childNodes 번호 (결정 5 B)
- diff 자식 비교: 필수 = 위치 기반(같은 자리 · 같은 태그면 그 자리에서 비교, 다르면 교체, 남으면 INSERT · REMOVE). Key 확장 = key 표 매칭 + MOVE (결정 2 B). key 없는 자식 · 중복 key는 위치 비교
- diff 결과: `Patch[]` 목록, 한 줄 = 종류 · 경로 · 전 · 후 (결정 3 A). 타입은 `types.ts`의 `Patch`
- patch 대상: 경로(`Path`) + 목록 순서대로 하나씩 적용, 경로는 그 patch를 실행하는 순간의 트리 기준 (결정 4 A). 경로는 영역 상자 안 자식부터 (`AreaChildren`)
- 역패치: 전후 뒤집기 + 역순. `HistoryEntry.inverse`는 이미 역순으로 뒤집어 둔 목록
- State History: `HistoryEntry`(snapshot · patches · inverse)를 `HistoryNode` 양방향 연결 리스트로. 한도 `HISTORY_LIMIT` = 50 (결정 7 B + VNode)
- 이력 정책: 초기 모습 = 0번 · 무변경 Patch 기록 안 함 · 뒤로 간 뒤 새 Patch면 앞쪽 끊음 · 경계 이동 무시 · 이동 때 미저장 편집 버림(편집창 · 테스트 영역 · 실제 영역 모두 그 기록) · 50 넘으면 head부터 뺌
- 편집 UI: HTML 편집창 + 미리보기(테스트 영역) (결정 6 A). 미리보기는 `on…` · `<script>` · `javascript:` 제거 후 그림. Patch 때 위험 코드 · 태그 짝 · 구조 비교 · `<svg>` 검사 → 문제면 alert, Patch 안 함
- 속성: boolean = 보통 속성(값 `""`, SET_ATTR before/after null), style = 항목별(`StyleMap`, SET_STYLE)
- SVG 미지원. Phase 1 검증 페이지는 key를 쓰지 않음 (Key 엔진은 단위 테스트로만)
- (테스트 케이스 확인 C1~C5) `tbody` 자동 추가는 구조 비교 예외로 허용 · Patch 도중 예외면 기록 그대로 + 실제 영역을 마지막 기록 VNode로 다시 그린 뒤 alert · `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">` · `<meta http-equiv="refresh">` · `<base>`는 미리보기에서 빼고 Patch 때 막음 · 두 영역 안 링크 클릭 · 폼 제출은 기본 동작 막음(fixture)
- Diff 시각화(확장): 스위치(기본 꺼짐), 켜면 바뀐 노드만 실제 영역 위 오버레이에서 깜빡임. 실제 DOM에 표시용 class를 붙이지 않음
- 근거 · 이유 전문: `.agent_workflow/tasks/task_001_ryuuuu5618_phase1/01_request_spec.md` 「알고리즘 결정」
