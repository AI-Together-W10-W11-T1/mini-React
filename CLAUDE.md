# 미니 리액트 프로젝트 규칙

## 요구사항 기준
- `docs/PRD/요구사항 정의서 PRD.md` — Mini React 공통 요구사항 및 검증 기준 **v2.1**. 팀원이 각자 독립적으로 구현하고, 알고리즘 · 자료구조 · 편집 UI · 웹페이지 주제 · 파일 구조는 각자 정한다 (§2.2).
- 필수: Phase 1 `P1-01~34`(§3.1), Phase 2 `P2-01~24`(§4.1). 공통 테스트: `T-01~16`(§6.1). 기록할 정책: 이력(§3.3) · Hook 세부(§4.2) · 이벤트 · 입력(§4.3) · 지원 범위(§5). 결과 공유: §9 양식.
- 공통 참고 · 선택 확장(Key 비교, Batching, 시각화, 성능 대시보드 등)은 필수가 아니다. 넣으면 「내 설계 결정」에 적는다.

## 기술 스택
- Vanilla TypeScript + HTML/CSS로 만든다. React · Vue 같은 UI 프레임워크와 그 런타임 라이브러리는 쓰지 않는다.
- 허용 개발 도구: TypeScript, Vite, Vitest, jsdom, Playwright, ESLint · Prettier. 브라우저에 실리는 코드는 직접 작성한 코드뿐이다.
- 루트 `package.json` 하나로 관리한다 (workspaces 안 씀). 패키지 간 import는 별칭 `@mini-react/<pkg>` (`tsconfig` `paths`와 Vite · Vitest `alias`를 같은 값으로).
- `tsconfig.json`은 `baseUrl` 없이 `paths`를 `./` 상대 경로로 쓴다 (예: `"@mini-react/*": ["./packages/*/src"]`). TypeScript 7부터 `baseUrl`은 오류가 난다.

## 패키지 역할
내가 고른 파일 구조다. 패키지 이름만 React를 따르고 내부 구조는 과제 범위로 만든다.

| 패키지 | 맡는 것 | DOM 접근 | 넣지 않을 것 |
| --- | --- | --- | --- |
| `packages/shared` | VNode · 변경 표현 · 이력 타입, 공통 상수 | ✕ | 로직 |
| `packages/react` | `h()`, Hook 공개 API (`useState` · `useEffect` · `useMemo`) | ✕ | DOM 조작, 렌더 로직 |
| `packages/react-reconciler` | `diff`, `FunctionComponent`(`hooks` · `mount()` · `update()`), Hook 슬롯 | ✕ | Fiber, 우선순위 레인, 동시성 렌더링 |
| `packages/react-dom-bindings` | `domToVNode`, `renderVNode`, `patch`, 이벤트 · DOM 프로퍼티 | **○ (유일)** | 합성 이벤트 시스템 전체 |
| `packages/react-dom` | `render` 진입점, State History | 바인딩 경유 | - |
| `packages/scheduler` | 재렌더 예약 (Batching은 선택) | ✕ | 우선순위 스케줄러, 시간 분할 |
| `fixtures/phase1-vdom-playground` | Phase 1 검증 페이지 (실제 · 테스트 영역, Patch · 뒤로 · 앞으로) | ○ | 엔진 로직 |
| `fixtures/phase2-app` | Phase 2 웹페이지 (주제는 내가 정함) | ○ | 엔진 로직 |
| `fixtures/perf-bench` | (선택) 측정 하네스 | ○ | - |

- **의존 방향**: DOM 조작은 `react-dom-bindings`에서만 한다. 다른 패키지에서 `document` · `window`를 쓰지 않는다.

## 과제 제약
- Hook과 state는 루트 컴포넌트에서만 쓴다. 자식은 props만 받는 순수 함수다 (Lifting State Up, P2-07~09).
- `FunctionComponent` 클래스는 `hooks` 배열, `mount()`, `update()`를 가진다 (P2-03~06).
- 재렌더는 Phase 1의 Diff · Patch를 그대로 다시 쓴다. 앱 전체 DOM 교체(`innerHTML`)로 대신하지 않는다 (P2-19~21).
- Patch · 뒤로 · 앞으로 때 실제 영역 · 테스트 영역이 함께 그 상태로 바뀐다 (P1-24 · P1-30).

## React와의 관계
- React 소스를 옮기거나 React API를 그대로 흉내 내는 것을 목표로 하지 않는다. 인터페이스는 과제 문서 · PRD와 「내 설계 결정」을 따른다.
- 과제 문서에 없는 React 내부 구조(Fiber, 우선순위 스케줄러, 동시성 렌더링)는 쓰지 않는다. 넣고 싶으면 먼저 제안하고, 내가 정한 뒤에 넣는다.
- 구현 근거는 "React가 이렇게 한다"가 아니라 PRD의 요구사항과 수용 기준이다.
- 설명은 내 코드 기준으로 한다. 실제 React와의 차이는 "차이점" 항목으로 따로 정리한다.

## 테스트
- 바깥 루프 (인수): `e2e/*.spec.ts`, Playwright Test, desktop(1280x800) · mobile(375x812) 프로젝트 두 개만, `webServer`가 `fixtures/`를 띄움 → `/mini-react-kit:atdd-acceptance`
- 안쪽 루프 (단위): `packages/<pkg>/src/__tests__/*.test.ts`, Vitest + jsdom → `/mini-react-kit:test-driven-development`
- 공통 테스트 `T-01~16`을 빠짐없이 덮는다. 결과는 §6.3 형식(통과 / 실패 / 미구현 / 해당 없음)으로 남긴다.
- 성능 측정은 선택(§7 · §8): Chrome DevTools로만 측정 → `/mini-react-kit:perf-check`
- 완료라고 말하기 전에 `npx vitest run`과 `npx playwright test`를 실제로 돌리고 결과를 보여 준다.

## 내 설계 결정 (PRD §2.2 개인 선택, 정해지면 채운다)
> `/mini-react-kit:agent-workflow` 0단계에서 후보와 장단점을 보고 고른다. 여기 적힌 결정은 다시 묻지 않는다. 발표 README의 §9 「설계 선택」 · 「정책 차이」 재료가 된다.

**알고리즘 · 내부 표현**
- 텍스트 노드 표현:
- diff 자식 비교 (위치 기반 / Key 기반):
- diff 결과 전달:
- patch 대상 노드 찾기:
- 공백 텍스트 노드:
- 테스트 영역 수정 방식 (편집 UI):
- State History 저장:
- 이벤트 props 처리:
- 재렌더 시점 (동기 / 비동기, Batching 여부):

**정책 (PRD §3.3 · §4.2 · §4.3 · §5)**
- 이력: 초기 저장 · 무변경 Patch · redo 처리 · 경계 이동 · 미저장 편집 · 보관 한도
- Hook: 함수형 setter · 동일 값 처리 · 의존성 비교 · 허용하지 않는 Hook 호출 처리 · 해제(`unmount()`)
- 지원 범위: 단일 · 복수 루트, 공백 · 주석, SVG, boolean · style 속성, VNode 입력(숫자 · 배열 · `null` · boolean), 지원 이벤트 · DOM 프로퍼티, 실행 가능한 HTML 처리, 오류 처리

## 에이전트 워크플로
- 시작: `/mini-react-kit:agent-workflow`. 메인 세션이 마스터, `mr-worker`(Sonnet)가 기획 · 개발, `mr-reviewer`(Opus, 읽기 전용)가 검수하고, `mr-qa`(Sonnet)가 `e2e/`를 실행해 캡처를 남기고, `mr-wiki`(Haiku)가 `wiki/` · `README.md` 발표 섹션을 정리한다.
- 기록: `.agent_workflow/` (task 폴더 · seed, 서브에이전트 기록은 훅이 자동으로), 큰 그림: `wiki/`. 핵심 로직에는 `// [AI Note]: …` 주석.
- 코어 타입 `packages/shared/src/types.ts`는 마스터만 고치고 `types_changelog.md`에 남긴다.
- 핵심 모듈마다 이해 체크포인트를 거친다. 핵심 로직은 내가 직접 설명할 수 있어야 한다.

## 브랜치 · 커밋
- 로컬 레포. 작업은 `main`에서 `feature/<작업명>` 브랜치를 만들어 하고, 끝나면 `main`에 병합한다.
- 커밋 제목: `<type>(<package>): <요약>` (`feat` · `fix` · `refactor` · `test` · `docs` · `chore` · `style`)
- 원격 저장소 추가 · push · PR 생성은 내가 승인한 뒤에만 한다.

## `.gitignore`에 넣을 것
```
node_modules/
dist/
.DS_Store
test-results/
playwright-report/
coverage/
.agent_workflow/current
.agent_workflow/tasks/*/06_raw_transcripts.jsonl
.playwright-mcp/
```

## 문서 위치
- 요구사항: `docs/PRD/요구사항 정의서 PRD.md` (PDF · PPT는 MarkItDown으로 `.md` 변환)
- 위키: `wiki/index.md` · `architecture.md` · `qna_prep.md`
- 발표: `README.md`의 `<!-- mini-react-kit:readme:start -->` ~ `end` 사이는 `mr-wiki`가 갱신한다. 내가 직접 쓰는 내용은 표시 밖에 둔다.
