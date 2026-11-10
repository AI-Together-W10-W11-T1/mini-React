# 미니 리액트 프로젝트 규칙

## 대화
- 답변은 항상 한국어로 한다.
- 인터뷰 · 질문은 한 메시지에 하나만 자세히 묻고, 나머지는 제목과 짧은 위치 설명만 미리 보여 준다 (`/mini-react-kit:grill-me`).
- 나는 코드를 직접 쓰지 않고 말로 답한다. 코드는 에이전트가 쓴다.
- `.agent_workflow/_backup/`은 이전 시작분 백업이다. 이어서 하지 않고 참고하지 않는다.

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

> 확정한 task와 이유(내 말 그대로)는 `.agent_workflow/tasks/task_001_ryuuuu5618_phase1/01_request_spec.md` · `task_002_ryuuuu5618_phase2/01_request_spec.md` 「알고리즘 결정」에 있다.

**알고리즘 · 내부 표현** (task_001, 2026-11-11)
- 텍스트 노드 표현: TEXT 노드 객체 `{ type: '#text', props: { nodeValue }, children: [] }` (알고리즘 결정 1 B)
- diff 자식 비교 (위치 기반 / Key 기반): 필수 = 위치 기반 (같은 자리 · 같은 태그면 그 자리에서 비교, 다르면 교체, 남으면 추가 · 삭제). Key 확장 = key 표 매칭 + 이동 (알고리즘 결정 2 B). key 없는 자식 · 중복 key는 위치 비교
- diff 결과 전달: 고칠 일(patch) 목록. 한 줄 = 종류 · 경로 · 전 · 후 (알고리즘 결정 3 A)
- patch 대상 노드 찾기: 경로(인덱스 배열) + 목록 순서대로 하나씩 적용, 경로는 그 순간의 트리 기준 (알고리즘 결정 4 A). 경로는 영역 상자 안 자식부터
- 공백 텍스트 노드: 공백 · 주석 모두 VNode로 남김 → VNode 번호 = DOM childNodes 번호 (알고리즘 결정 5 B + 주석 유지)
- 테스트 영역 수정 방식 (편집 UI): HTML 편집창 + 미리보기(테스트 영역) (알고리즘 결정 6 A)
- State History 저장: 기록마다 VNode 스냅샷 · patch · 역패치 (알고리즘 결정 7 B + VNode). 양방향 연결 리스트. 뒤로 · 앞으로 = 실제 영역은 역패치(이미 역순) 적용, 테스트 영역 · 편집창은 스냅샷으로
- Key 출처: Phase 1 검증 페이지는 key 없음. Key 엔진은 단위 테스트로 검증, 화면 시연은 Phase 2 검증 페이지 목록의 항목 id (`todo-1` …, 지운 번호 재사용 안 함)
- Diff 시각화 (확장): 스위치(기본 꺼짐), 켜면 Patch · 뒤로 · 앞으로 때 바뀐 노드만 실제 영역 위 오버레이에서 깜빡임 (실제 DOM은 건드리지 않음)
**알고리즘 · 내부 표현** (task_002, 2026-11-11)
- 이벤트 props 처리: 리스너 하나 + 핸들러 교체 (알고리즘 결정 8 B). 요소마다 이벤트 이름당 리스너를 처음 한 번만 등록, 핸들러는 요소 자신에 저장하고 다시 렌더할 때는 핸들러만 바꿈. 이름이 `on` + 대문자이고 값이 함수면 이벤트 (`onClick` → `click`)
- 재렌더 시점: 즉시 동기 (알고리즘 결정 9 A) — setter를 부르면 바로 렌더 + diff + patch. Batching은 시간이 남으면 확장으로 B(`queueMicrotask`) 승격
- 자식 컴포넌트: diff 전에 그 자리에서 실행해 결과 요소로 풀어 둠. diff · patch는 요소 · 글자만 봄. 이전 VNode는 `mount()` · `update()` 때 만든 VNode 자체를 저장 (DOM에서 다시 읽지 않음)

**정책 (PRD §3.3 · §4.2 · §4.3 · §5)**
- 이력: 초기 모습 = 0번 기록(뒤로가기의 바닥) · 무변경 Patch는 기록 안 함 · 뒤로 간 뒤 새 Patch면 앞쪽 기록 버림 · 처음 · 끝에서 누르면 무시 · 이동 때 미저장 편집은 버림(편집창 · 테스트 영역 · 실제 영역 모두 그 기록으로) · 보관 한도 50, 넘으면 가장 오래된 기록부터 뺌
- Hook: `hooks` 배열에 부른 순서대로(렌더마다 0번부터) · `if` · `for` 안 Hook 금지 + Hook 개수가 달라지면 오류 · 자식 실행 중 Hook 호출은 오류 · 같은 값 setter(`Object.is`)는 다시 그리지 않음 · 함수형 setter · 지연 초기화 지원 · effect는 patch 직후 실행, 의존성 생략 = 매 렌더 · `[]` = 처음 한 번 · 변경 시(항목별 `Object.is`, 길이가 다르면 변경) · cleanup은 다시 실행 직전과 `unmount()` 때 · 렌더가 연달아 50번 넘으면 오류 · memo는 같은 의존성이면 재사용, 생략하면 매 렌더 재계산
- 지원 범위: 영역 상자 = 보이지 않는 감싸개(최상위 여러 개 · 0개 허용) · 공백 · 주석 유지 · **SVG 미지원**(Patch 때 막음) · boolean 속성 = 보통 속성(값 `""`, 추가 · 삭제) · style = 항목별 비교 · VNode 입력: 숫자 · 문자열 → 글자 노드, `null` · `undefined` · boolean 무시, 배열 펼침, `key`는 props에서 꺼냄 · 이벤트 = `click` · `input`, 핸들러가 빠지면 핸들러만 비우고 리스너는 남김(눌러도 아무 일 없음) · DOM 프로퍼티 = `value` · `checked`만, 프로퍼티로 넣고 실제 값과 다를 때만(커서 유지) · 입력창은 다시 만들지 않고 그 자리에서 고침(포커스 유지) · 숫자 칸 빈칸 · 글자면 상태 그대로 · 실행 가능한 HTML = 미리보기에서 `on…` · `<script>` · `javascript:` · `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">` · `<meta http-equiv="refresh">` · `<base>` 제거 + Patch 때 검사해서 막음 · 오류 = Patch 때 태그 짝 검사 + 구조 비교(`tbody` 자동 추가만 허용), 문제면 alert로 막고 실제 영역 · 기록은 그대로. Patch 도중 예외면 기록은 그대로, 실제 영역을 마지막 기록 VNode로 다시 그린 뒤 alert · 검증 페이지: 두 영역 안 링크 클릭 · 폼 제출은 기본 동작을 막음

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
