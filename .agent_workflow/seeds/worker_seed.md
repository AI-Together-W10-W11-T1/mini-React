# worker seed

> 마스터가 처음 한 번 `.agent_workflow/seeds/`에 복사하고 레포 `CLAUDE.md`에 맞게 채운다. `mr-worker`는 매번 이 파일부터 읽는다.

## 1. 프로젝트 맥락
- 요구사항: `docs/PRD/요구사항 정의서 PRD.md` v2.1 (P1-01~34 · P2-01~24 · T-01~16)
- 요구사항 기준 · 내 설계 결정 · 패키지 역할: 루트 `CLAUDE.md`
- 코어 타입: `packages/shared/src/types.ts` (임의 수정 금지)
- 위키: `wiki/index.md` · `wiki/architecture.md`
- `.agent_workflow/_backup/`은 이전 시작분 백업이다. 읽지 않고 참고하지 않는다

## 2. 패키지 지도
<!-- CLAUDE.md의 패키지 역할 표를 그대로 옮긴다 -->
| 패키지 | 맡는 것 | DOM 접근 | 넣지 않을 것 |
| --- | --- | --- | --- |
| `packages/shared` | VNode · 변경 표현 · 이력 타입, 공통 상수 | ✕ | 로직 |
| `packages/react` | `h()`, Hook 공개 API (`useState` · `useEffect` · `useMemo`) | ✕ | DOM 조작, 렌더 로직 |
| `packages/react-reconciler` | `diff`, `FunctionComponent`(`hooks` · `mount()` · `update()`), Hook 슬롯 | ✕ | Fiber, 우선순위 레인, 동시성 렌더링 |
| `packages/react-dom-bindings` | `domToVNode`, `renderVNode`, `patch`, 이벤트 · DOM 프로퍼티 | **○ (유일)** | 합성 이벤트 시스템 전체 |
| `packages/react-dom` | `render` 진입점, State History | 바인딩 경유 | - |
| `packages/scheduler` | 재렌더 예약 (Batching은 선택) | ✕ | 우선순위 스케줄러, 시간 분할 |
| `fixtures/phase1-vdom-playground` | Phase 1 검증 페이지 (실제 · 테스트 영역, Patch · 뒤로 · 앞으로) | ○ | 엔진 로직 |
| `fixtures/phase2-app` | Phase 2 웹페이지 (주제는 사용자가 정함) | ○ | 엔진 로직 |
| `fixtures/perf-bench` | (선택) 측정 하네스 | ○ | - |

- 의존 방향: DOM 조작은 `react-dom-bindings`에서만 한다. 다른 패키지에서 `document` · `window`를 쓰지 않는다.

## 3. 위반 금지 규칙
1. Component 규격
   - 함수형 컴포넌트는 `FunctionComponent` 클래스로 감싼다. 필수 멤버: `hooks` 배열, `mount()`, `update()`
   - 시그니처와 Hook 슬롯 타입은 `types.ts`를 따른다. `any` 금지
2. State · Hooks 범위
   - `useState` · `useEffect` · `useMemo`는 루트 컴포넌트 렌더 중에만 호출한다
   - 자식 컴포넌트는 props만 받아 VNode를 반환하는 순수 함수이고, `h(Child, props)`로 호출한다
   - 잘못된 Hook 호출의 런타임 가드 여부는 `CLAUDE.md` 「내 설계 결정」 Hook 정책을 따른다 (PRD P2-08은 필수로 요구하지 않음)
3. DOM 갱신
   - 상태 변경 시 전체 DOM을 교체하지 않는다. 반드시 Phase 1 `diff` → `patch`를 지난다
   - DOM 조작 코드는 `react-dom-bindings`에만 둔다. 다른 패키지에서 `document` · `window`를 쓰지 않는다
   - Patch · 뒤로 · 앞으로 때 실제 영역 · 테스트 영역이 함께 그 상태로 바뀐다 (P1-24 · P1-30)
4. 기술 스택
   - 금지: React, Vue, Preact, Svelte 등 UI 프레임워크와 VDOM 라이브러리
   - 허용: TypeScript, Vite, Vitest, jsdom, Playwright, ESLint · Prettier
   - 루트 `package.json` 하나 (workspaces 안 씀). 패키지 간 import는 별칭 `@mini-react/<pkg>`
   - `tsconfig.json`은 `baseUrl` 없이 `paths`를 `./` 상대 경로로 쓴다 (TypeScript 7)
5. 타입 · 알고리즘
   - `types.ts`를 고칠 일이 생기면 직접 고치지 말고 `BLOCK:SPEC_GAP`
   - `01_request_spec.md` 「알고리즘 결정」과 다른 방식으로 구현하지 않는다. 결정이 없는 선택을 만나면 `BLOCK:SPEC_GAP`
   - Fiber · 우선순위 스케줄러 · 동시성 렌더링 등 과제 문서에 없는 React 내부 구조는 쓰지 않는다
6. 작업 규칙
   - TDD: 실패하는 테스트 → 최소 구현 → 통과 → 리팩터 (`mini-react-kit:test-driven-development`)
   - 단위 테스트 위치: `packages/<pkg>/src/__tests__/*.test.ts`, 인수 테스트: `e2e/*.spec.ts` (desktop · mobile 프로젝트만)
   - 핵심 로직에는 `// [AI Note]: …`로 의도를 남긴다 (과하게 달지 않음)
   - Dev 항목 형식: `Dev-N (패키지): 작업명 [PRD ID]`
   - 체크한 항목마다 완료 근거(파일 · 함수 · 실행한 테스트 명령과 결과 · 커밋 해시)를 적는다. 근거 없는 체크는 무효
   - 커밋: Dev 항목 하나 = 커밋 하나, 메시지 `<type>(<package>): <요약> (Dev-N)`. 작업 브랜치는 `feature/<작업명>`. push는 하지 않는다

## 4. 내 설계 결정 · 알고리즘 결정 요약
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
- (테스트 케이스 확인 C1~C5) `tbody` 자동 추가는 구조 비교 예외로 허용 · Patch 도중 예외면 기록 그대로 + 실제 영역을 마지막 기록 VNode로 다시 그린 뒤 alert · `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`는 미리보기에서 빼고 Patch 때 막음 · 두 영역 안 링크 클릭 · 폼 제출은 기본 동작 막음(fixture)
- Diff 시각화(확장): 스위치(기본 꺼짐), 켜면 바뀐 노드만 실제 영역 위 오버레이에서 깜빡임. 실제 DOM에 표시용 class를 붙이지 않음
- 근거 · 이유 전문: `.agent_workflow/tasks/task_001_ryuuuu5618_phase1/01_request_spec.md` 「알고리즘 결정」
