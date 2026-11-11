# worker seed

> 마스터가 처음 한 번 `.agent_workflow/seeds/`에 복사하고 레포 `CLAUDE.md`에 맞게 채운다. `mr-worker`는 매번 이 파일부터 읽는다.

## 1. 프로젝트 맥락
- 요구사항: `docs/PRD/요구사항 정의서 PRD.md` v2.1 (P1-01~34 · P2-01~24 · T-01~16)
- 요구사항 기준 · 내 설계 결정 · 패키지 역할: 루트 `CLAUDE.md`
- 코어 타입: `packages/shared/src/types.ts` (임의 수정 금지)
- 위키: `wiki/index.md` · `wiki/architecture.md`

## 2. 패키지 지도
<!-- CLAUDE.md의 패키지 역할 표를 그대로 옮긴다 -->
| 패키지 | 맡는 것 | DOM 접근 |
| --- | --- | --- |
| `shared` | 타입 · 공통 상수 | ✕ |
| `react` | `h()`, Hook 공개 API | ✕ |
| `react-reconciler` | `diff`, `FunctionComponent`, Hook 슬롯 · 런타임 가드 | ✕ |
| `react-dom-bindings` | `domToVNode`, `renderVNode`, `patch`, 이벤트, 입력 검증 | ○ (유일) |
| `react-dom` | `render` 진입점, State History | 바인딩 경유 |
| `scheduler` | 재렌더 예약 · Batching | ✕ |

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
4. 기술 스택
   - 금지: React, Vue, Preact, Svelte 등 UI 프레임워크와 VDOM 라이브러리
   - 허용: TypeScript, Vite, Vitest, jsdom, Playwright, ESLint · Prettier
   - 패키지 간 import는 별칭 `@mini-react/<pkg>`
5. 타입 · 알고리즘
   - `types.ts`를 고칠 일이 생기면 직접 고치지 말고 `BLOCK:SPEC_GAP`
   - `01_request_spec.md` 「알고리즘 결정」과 다른 방식으로 구현하지 않는다. 결정이 없는 선택을 만나면 `BLOCK:SPEC_GAP`
6. 작업 규칙
   - TDD: 실패하는 테스트 → 최소 구현 → 통과 → 리팩터 (`mini-react-kit:test-driven-development`)
   - 단위 테스트 위치: `packages/<pkg>/src/__tests__/*.test.ts`, 인수 테스트: `e2e/*.spec.ts`
   - 핵심 로직에는 `// [AI Note]: …`로 의도를 남긴다 (과하게 달지 않음)
   - Dev 항목 형식: `Dev-N (패키지): 작업명 [PRD ID]`
   - 체크한 항목마다 완료 근거(파일 · 함수 · 실행한 테스트 명령과 결과 · 커밋 해시)를 적는다. 근거 없는 체크는 무효
   - 커밋: Dev 항목 하나 = 커밋 하나, 메시지 `<type>(<package>): <요약> (Dev-N)`. push는 하지 않는다

## 4. 내 설계 결정 · 알고리즘 결정 요약
<!-- CLAUDE.md 「내 설계 결정」에서 지금까지 정한 것을 한 줄씩 -->
-
