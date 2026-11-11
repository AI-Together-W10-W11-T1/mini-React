# mini-react

Vanilla TypeScript로 직접 만든 미니 React입니다. Phase 1(Virtual DOM · Diff · Patch · History)과 Phase 2(함수형 컴포넌트 · Hooks)를 만들었고, 그 엔진으로 Figma의 Components · Variables를 흉내 낸 시연 앱 **mini-figma**를 만들었습니다.

- 요구사항 기준: [docs/PRD/요구사항 정의서 PRD.md](docs/PRD/요구사항%20정의서%20PRD.md) (PRD v2.1)
- 내 설계 결정 · 정책 전체: [CLAUDE.md 「내 설계 결정」](CLAUDE.md)
- 상세 위키: [wiki/index.md](wiki/index.md) · [wiki/architecture.md](wiki/architecture.md) · [wiki/qna_prep.md](wiki/qna_prep.md)

## 목차

1. [프로젝트 소개와 사용법](#1-프로젝트-소개와-사용법)
2. [기술 스택과 제약 사항](#2-기술-스택과-제약-사항)
3. [실행 및 검증 방법](#3-실행-및-검증-방법)
4. [폴더 구조와 모듈 책임](#4-폴더-구조와-모듈-책임)
5. [요구사항 구현 현황](#5-요구사항-구현-현황)
6. [Phase 1 설계와 동작](#6-phase-1-설계와-동작)
7. [Phase 2 설계와 연계](#7-phase-2-설계와-연계)
8. [테스트 및 측정 결과](#8-테스트-및-측정-결과)
9. [지원 범위와 한계](#9-지원-범위와-한계)

---

## 1. 프로젝트 소개와 사용법

> 자세히: [wiki/index.md](wiki/index.md) · [wiki/architecture.md 「시연 앱 mini-figma」](wiki/architecture.md#시연-앱-mini-figma-task_004--005--006--007)

| 페이지 (개발 서버 기준) | 주제 · 주요 기능 | 대표 조작 |
| --- | --- | --- |
| `/phase1-vdom-playground/` | Phase 1 검증 페이지: 실제 영역 · 테스트 영역 | 편집창에서 HTML 수정 → 미리보기(테스트 영역) 확인 → **[Patch]** = 바뀐 곳만 실제 영역에 반영 · 기록 저장 → **[뒤로] · [앞으로]** = 편집창 · 테스트 영역 · 실제 영역이 함께 그 기록으로. 「Diff 시각화」 스위치를 켜면 바뀐 노드만 깜빡임 |
| `/phase2-app/` | Phase 2 검증 페이지: 카운터 · 인사 입력창 · 할 일 목록 · 기록판 | [+1] · [+3] · [그대로], 이름 입력, 할 일 추가 · 체크 · [위로] · [아래로] · [삭제]. 기록판에 렌더 · effect · memo 횟수와 patch 줄 수 표시 |
| `/mini-figma/` | **개인 앱**: 미니 Figma (메인 컴포넌트 · 인스턴스 · property · 변수) | 레이어에서 메인 / 인스턴스 고르기 → 속성 패널에서 라벨 · 크기 · 아이콘 · 색 수정 (메인을 고치면 override 없는 인스턴스만 따라감, ↻ = 메인 따르기) → [인스턴스 생성] · [삭제] · 레이어 [↑][↓] → 변수 패널에서 Primary 값 바꾸기 → **[Patch]** = 캔버스(테스트 영역)를 실제 영역에 반영 → **[실행 취소] · [다시 실행]** (Ctrl/Cmd+Z · Shift+Z) = 두 영역 함께 이동 |
| `/perf-bench/` | (선택 확장) 성능 대시보드 | 시나리오 B-01 ~ B-07 반복 측정 |

| 화면 | |
| --- | --- |
| Phase 1: Patch 뒤 바뀐 글자만 실제 영역에 반영 | ![](.agent_workflow/tasks/task_001_ryuuuu5618_phase1/04_qa_evidence/screenshot_02_desktop.png) |
| Phase 2: 할 일 체크 · 완료 요약 · 기록판 자동 갱신 | ![](.agent_workflow/tasks/task_002_ryuuuu5618_phase2/04_qa_evidence/screenshot_04_desktop.png) |
| mini-figma: Primary 변수를 노랑으로 → 연결된 버튼만 바뀌고, [Patch] 직후 실제 영역에서 바뀐 노드만 깜빡임 | ![](.agent_workflow/tasks/task_007_ryuuuu5618_variables/04_qa_evidence/screenshot_72_desktop.png) |
| mini-figma: [실행 취소] → 테스트 영역 · 실제 영역이 함께 이전 색으로 | ![](.agent_workflow/tasks/task_006_ryuuuu5618_patch-preview/04_qa_evidence/screenshot_52_desktop.png) |

## 2. 기술 스택과 제약 사항

> 자세히: [CLAUDE.md 「기술 스택」 · 「과제 제약」](CLAUDE.md)

- **언어 · 도구**: TypeScript 7, Vite 8 (개발 서버), Vitest 5 + jsdom (단위), Playwright 1.65 (화면 기능, desktop 1280×800 · mobile 375×812). 루트 `package.json` 하나, 패키지 간 import는 별칭 `@mini-react/<pkg>`
- **외부 UI 프레임워크 미사용**: React · Vue 등 런타임 라이브러리 없음. 브라우저에 실리는 코드는 모두 직접 작성
- **직접 구현한 범위**: DOM → VNode 변환, VNode 렌더링, Diff(위치 기반 + Key 확장), Patch, State History, `h()`, `FunctionComponent`(`hooks` · `mount()` · `update()`), `useState` · `useEffect` · `useMemo`, 이벤트 연결, 렌더 예약(Batching)
- **루트 전용 State · Hook**: Hook은 루트 컴포넌트에서만 부르고, 자식은 props만 받는 순수 함수다. 자식 실행 중 Hook 호출은 오류로 막고, `rootOnlyHooks` 테스트가 코드에서도 확인한다 (P2-07 ~ 09, T-16)

## 3. 실행 및 검증 방법

- 환경: Node.js 24 (확인한 버전 v24.19.0), Windows · Chromium에서 검증

```bash
npm ci
npx playwright install chromium
npm run dev          # 개발 서버 (fixtures/를 루트로 띄움 → /phase1-vdom-playground/ 등)
npx vitest run       # 단위 테스트 (= npm test)
npx playwright test  # 화면 기능 테스트, desktop · mobile (= npm run e2e, 포트 5199를 직접 띄움)
npx tsc --noEmit     # 타입 검사 (= npm run typecheck)
```

- 빌드: 별도 빌드 스크립트는 두지 않았다 (개발 서버로만 실행 · 검증, 번들 빌드는 검증하지 않음)

## 4. 폴더 구조와 모듈 책임

> 자세히: [wiki/architecture.md 「패키지 구조」 · 「의존 방향」](wiki/architecture.md#패키지-구조)

```
packages/
  shared/              타입(VNode · Patch · 이력) · 공통 상수 (HISTORY_LIMIT 50 등)
  react/               h(), Hook 공개 API (useState · useEffect · useMemo)
  react-reconciler/    diff · invertPatches (Phase 1), FunctionComponent · Hook 슬롯 · resolveComponents (Phase 2)
  react-dom-bindings/  domToVNode · renderVNode · patch · 이벤트 · DOM 프로퍼티 ← DOM 접근은 여기만
  react-dom/           render 진입점, History(양방향 연결 리스트), createVDomRoot
  scheduler/           재렌더 예약 (queueMicrotask Batching)
fixtures/
  phase1-vdom-playground/  Phase 1 검증 페이지
  phase2-app/              Phase 2 검증 페이지
  mini-figma/              개인 앱 (엔진은 고치지 않고 @mini-react/*로 사용)
  perf-bench/              성능 대시보드 (선택)
e2e/                   Playwright 화면 기능 테스트
docs/                  PRD · 측정 결과
wiki/                  설계 · QnA 위키
```

| 역할 | 모듈 | 관계 |
| --- | --- | --- |
| DOM 변환 | `react-dom-bindings` `domToVNode` · `readAreaChildren` | 실제 DOM → VNode (Phase 1 입력, mini-figma 실제 영역 입력) |
| Diff | `react-reconciler` `diff` | 이전 · 새 VNode → 고칠 일(patch) 목록 |
| Patch | `react-dom-bindings` `patch` | patch 목록을 실제 DOM에 순서대로 적용 |
| History | `react-dom` `History` · `createVDomRoot` | 기록마다 VNode · patch · 역patch 저장, 뒤로 · 앞으로 |
| Component | `react-reconciler` `FunctionComponent` | `mount()` · `update()`가 컴포넌트를 실행해 VNode를 만들고 위 Diff · Patch를 부름 |
| Hooks | `react` hooks + reconciler 슬롯 + `scheduler` | setter → 렌더 예약 → `update()` |
| 앱 | `fixtures/*` | 루트 `App` 하나가 state를 갖고 자식에게 props로 내려줌 |

## 5. 요구사항 구현 현황

> 원문: [PRD §3.1 · §4.1 · §6.1](docs/PRD/요구사항%20정의서%20PRD.md) · 시나리오별 결과: task_001 · 002 [`qa_todo_result.md`](.agent_workflow/tasks/task_002_ryuuuu5618_phase2/04_qa_evidence/qa_todo_result.md) · 위키 [task 요약](wiki/index.md)

**필수 기능** (Phase 1 P1-01 ~ 34, Phase 2 P2-01 ~ 24 모두 구현)

| 요구사항 | 구현 위치 | 검증 사례 | 결과 |
| --- | --- | --- | --- |
| T-01 DOM 변환 · T-02 VNode 렌더링 | `react-dom-bindings` `domToVNode` · `renderVNode` | 단위 + QA-A1 (중첩 · 텍스트 · 속성) | 통과 |
| T-03 기본 Diff (D-01 ~ 05) | `react-reconciler` `diff` | 단위 + Phase 1 QA-2 ~ 6 | 통과 |
| T-04 무변경 | `diff` · `createVDomRoot` | QA-8 · QA-23 · 24 (patch 0줄, 기록 안 쌓임) | 통과 |
| T-05 복합 변경 | `diff` · `patch` | QA-5 · QA-7 (중첩 · 여러 형제 삭제 · 삭제+수정) | 통과 |
| T-06 부분 갱신 | `patch` | 노드 참조 유지 단언 (QA-2 · QA-9 · Phase 2 QA-15 · 18) | 통과 |
| T-07 Patch 화면 | `phase1-vdom-playground` | QA-2 ~ 7 · QA-10 | 통과 |
| T-08 History | `react-dom` `History` | QA-11 · QA-15 (두 영역 함께 복원) | 통과 |
| T-09 컴포넌트 · T-10 상태 유지 · T-11 상태 구분 | `FunctionComponent` · `useState` | Phase 2 QA-1 · 2 · 6 · 7 · 13 | 통과 |
| T-12 Effect · T-13 Memo | `useEffect` · `useMemo` | QA-12 · 14 · 16 + 기록판 횟수 | 통과 |
| T-14 사용자 동작 | `phase2-app` · `mini-figma` | Phase 2 QA-2 ~ 11, mini-figma e2e | 통과 |
| T-15 Phase 연계 | `FunctionComponent.update()` → `diff` → `patch` | QA-14 · 15 · 18 (setter → 부분 갱신) | 통과 |
| T-16 루트 제약 | `rootOnlyHooks` 테스트 · 자식 Hook 오류 | QA-8 · 9 + 단위 | 통과 |

**선택 확장**: Key 비교(MOVE) · Diff 시각화 · 성능 대시보드 · Batching · 개인 앱 mini-figma(Components · 실제 영역 · State History · Variables) — 모두 구현

**미구현**: SVG (Patch 때 검사로 막음, 사용자 결정), 자식 컴포넌트의 독립 상태 · Fiber · 동시성 렌더링 · JSX 컴파일러 (PRD상 필수 아님)

## 6. Phase 1 설계와 동작

> 자세히: [wiki/architecture.md 「Phase 1」](wiki/architecture.md#phase-1-vdom--diff--patch) · [CLAUDE.md 「알고리즘 · 내부 표현」](CLAUDE.md) · 선택 이유: [wiki/qna_prep.md 「알고리즘 결정」](wiki/qna_prep.md#알고리즘-결정-왜-이걸-골랐나)

- **VNode 구조**: 요소 `{ type, props, children, key }`, 글자 `{ type: '#text', props: { nodeValue }, children: [] }`. 공백 · 주석도 노드로 남겨 VNode 번호 = DOM `childNodes` 번호
- **Diff 알고리즘**: 같은 자리 · 같은 태그면 그 자리에서 비교, 다르면 교체, 남으면 추가 · 삭제 (위치 기반). key가 있으면 key 표로 짝짓고 이동(MOVE). 선택 이유: 필수 범위는 위치 기반이 단순하고 설명하기 쉽고, 목록 순서 바꾸기는 key 확장으로 보여 줌
- **5가지 변경 + 무변경**: 글자(SET_TEXT) · 속성(SET_ATTR, style은 SET_STYLE) · 추가(INSERT) · 삭제(REMOVE) · 교체(REPLACE) (D-01 ~ 05), key 확장은 MOVE, Phase 2는 SET_EVENT · SET_PROP 추가. 바뀐 게 없으면 patch 0줄이고 기록도 안 쌓음
- **DOM 적용**: diff 결과는 고칠 일 목록(종류 · 경로 · 전 · 후). 경로(인덱스 배열)로 노드를 찾아 목록 순서대로 하나씩 적용 → 관련 없는 노드는 그대로(참조 유지)
- **History**: 기록마다 VNode 스냅샷 · patch · 역patch, 양방향 연결 리스트, 한도 50(오래된 것부터 뺌). 처음 모습 = 0번 기록. 뒤로 간 뒤 새 Patch면 앞쪽 기록 버림(분기). 뒤로 · 앞으로 = 실제 영역은 역patch, 테스트 영역 · 편집창은 스냅샷으로. 이동 때 저장 안 한 편집은 버림
- **처리 정책**: 속성 boolean = 보통 속성(값 `""`), style = 항목별 비교, 입력 `value` · `checked`는 프로퍼티로 넣고 실제 값과 다를 때만, 실행 가능한 HTML(`<script>` · `on…` · `javascript:` 등)은 미리보기에서 빼고 Patch 때 막음

## 7. Phase 2 설계와 연계

> 자세히: [wiki/architecture.md 「Phase 2」](wiki/architecture.md#phase-2-functioncomponent--hooks) · [wiki/qna_prep.md 「Hook · 자동 갱신」](wiki/qna_prep.md#hook--자동-갱신-task_002)

- **FunctionComponent**: `hooks` 배열 · `mount()`(처음 실행 → VNode → DOM) · `update()`(다시 실행 → 새 VNode → 이전 VNode와 diff → patch → effect)
- **상태가 유지되는 원리**: 상태는 함수 안이 아니라 인스턴스의 `hooks` 배열에 있고, Hook을 부른 순서(0번부터)로 같은 칸을 다시 찾음. 그래서 `if` · `for` 안 Hook은 금지, 개수가 달라지면 오류
- **루트 · 자식 책임**: 루트 `App`만 state · Hook을 갖고, 자식은 props만 받아 VNode를 돌려줌. 자식은 diff 전에 그 자리에서 실행해 요소로 풀어 둠(`resolveComponents`)
- **Hook 정책**: 같은 값(`Object.is`) setter는 다시 그리지 않음 · 함수형 setter · 지연 초기화 · effect는 patch 직후, 의존성 생략 = 매 렌더 / `[]` = 처음 한 번 / 항목별 `Object.is` 비교 · cleanup은 다시 실행 직전과 `unmount()` 때 · memo는 같은 의존성이면 재사용 · 렌더 중 setter와 50번 넘는 연쇄 렌더는 오류
- **이벤트**: `onClick` · `onInput` props → 요소마다 이벤트 이름당 리스너 한 번, 다시 렌더할 때는 핸들러만 교체. 입력창은 다시 만들지 않아 포커스 · 커서 유지
- **Phase 1 코어 재사용 경로**: `setter` → 칸 값 변경 + `scheduler`가 `queueMicrotask`로 렌더 1번 예약(Batching) → `FunctionComponent.update()` → `App()` 재실행 → 새 VNode → **Phase 1과 같은 `diff`** → **같은 `patch`** → effect. 앱 전체 `innerHTML` 교체는 쓰지 않음

## 8. 테스트 및 측정 결과

> 자세히: [wiki/architecture.md 「검증 결과」](wiki/architecture.md#검증-결과) · 측정: [docs/공통_측정_지표_결과.md](docs/공통_측정_지표_결과.md)

- **단위 테스트** (Vitest + jsdom): 패키지별 `packages/<pkg>/src/__tests__/` (diff · patch · History · FunctionComponent · Hook · scheduler 등), 앱별 `fixtures/*/__tests__/`
- **화면 기능 테스트** (Playwright): `e2e/*.spec.ts`, desktop · mobile 두 화면
- **주요 경계 사례**: 무변경 Patch, 여러 형제 삭제 + 수정 동시, 공백 · 주석 노드, 같은 값 setter, 같은 틱 setter 여러 번(렌더 1번), 이력 처음 · 끝 · 분기 · 한도 50, 입력창 포커스 유지, 위험 HTML 차단
- **실제 실행 결과** (최종, 2026-11-12): `npx vitest run` 47 files · **1250 passed**, `npx playwright test` **376 passed** (desktop 188 · mobile 188), `npx tsc --noEmit` 오류 0. QA 실패 0건
- **부분 갱신 근거**: 노드 참조 유지 단언(T-06, B-01 ~ 06에서 507 / 507 노드 유지), MutationObserver 기록 수와 patch 줄 수 비교
- **측정** (성능 대시보드, Playwright 헤드리스 Chromium · Windows · 1280×800 · Vite dev 서버, 준비 5 + 측정 30회, p50 / p95, 한 번 잰 값):

| 시나리오 | 전체 처리 M-07 | patch 줄 |
| --- | --- | --- |
| B-02 텍스트 하나 변경 (노드 507개) | 0.300 / 0.600 ms | 1 |
| B-05 여러 위치 동시 변경 | 0.300 / 0.800 ms | 5 |
| B-06 setter 10번 연달아 — 즉시 동기 → Batching | 2.700 / 3.210 → **0.300 / 0.830 ms** | 10 → **1** |

- 측정한 지표만 적었다. 시간은 DOM 반영까지이고 reflow · repaint 시간은 들어 있지 않다. "VDOM이 항상 빠르다"를 전제하지 않는다

## 9. 지원 범위와 한계

> 자세히: [wiki/architecture.md 「알려진 한계」 · 「실제 React와 차이」](wiki/architecture.md#알려진-한계) · 정책 전체: [CLAUDE.md 「정책」](CLAUDE.md)

- **지원하지 않는 것**: SVG, `click` · `input` 외 이벤트(끌기 · 크기 조절 없음), DOM 프로퍼티는 `value` · `checked`만, 자식 컴포넌트의 독립 state
- **알려진 문제**
  - 공백 · 주석을 노드로 남겨 들여쓰기만 바꿔도 글자 patch가 생김
  - 렌더마다 핸들러가 새 함수라 이벤트 교체 patch 줄이 늘 생김 (DOM 작업은 없음)
  - `<select value>` + `<option>` 삭제를 한 기록에서 함께 한 뒤 뒤로 가면 선택값이 다를 수 있음 (드묾)
  - mini-figma: 처음 · 끝 기록 칸에서 Patch 안 한 편집은 버튼이 꺼져 버릴 수 없음, 낮은 desktop 높이(예 721×300)에서 패널 일부가 잘림
- **미검증**: Key 확장은 단위 테스트로만 검증(Phase 1 화면에는 key 없음, 이동 횟수 최소 아님), 테스트 크기(1280×800 · 375×812) 밖 화면, Chromium 외 브라우저, 번들 빌드
- **실제 React와 주요 차이**
  - 변경 적용: 우리는 고칠 일 목록을 만들어 적용, React는 노드마다 표시(flag)를 남김
  - History: 우리 엔진에 내장(패치 · 역패치), React에는 없음
  - 재렌더: `queueMicrotask` Batching 한 가지뿐, 우선순위 · 시간 분할 · Fiber 없음
  - 컴포넌트: State · Hook은 루트에만

---

<!-- mini-react-kit:readme:start -->
<!-- 이 표시 사이는 4단계에서 mr-wiki가 갱신한다. 표시 밖은 건드리지 않는다 -->

## 부록: AI 워크플로 운영 결과

| 항목 | 값 |
| --- | --- |
| task | 7개 (Phase 1 · Phase 2 · Batching · mini-figma · 디자인 · 실제 영역 · 변수) |
| QA 실패 분류 (구현 · 테스트 · 명세) | QA 실패 0건 (task_001 ~ 007). 개발 검수 BLOCKING은 모두 작업자 재작업으로 해결 |
| 자동 테스트 (최종) | vitest 1250 · playwright 376 · tsc 오류 0 |

- 워크플로 기록: `.agent_workflow/tasks/` · 위키: [wiki/index.md](wiki/index.md)

<!-- mini-react-kit:readme:end -->
