# mini-react

개인 미니 리액트 구현 (요구사항: `docs/PRD/요구사항 정의서 PRD.md` v2.1).

## 실행

- `npm ci` → `npx playwright install chromium`
- 단위 테스트: `npx vitest run` · 인수 테스트: `npx playwright test` · 개발 서버: `npm run dev`

<!-- mini-react-kit:readme:start -->
<!-- 이 표시 사이는 4단계에서 mr-wiki가 갱신한다. 표시 밖은 건드리지 않는다 -->

## 아키텍처 & 동작 흐름

- 패키지 역할: `shared`(타입) · `react`(`h()` · Hook API) · `react-reconciler`(`diff` · `FunctionComponent`) · `react-dom-bindings`(DOM 접근 유일) · `react-dom`(`render` · History) · `scheduler`(재렌더 예약)
- Phase 1: 테스트 영역 → VNode → `diff`(저장한 이전 VNode와 비교) → 패치 목록 → `patch`(실제 영역에 바뀐 곳만) → History 기록
- Phase 2: setter → 즉시 렌더(`App()` 재실행) → `diff` → `patch` → effect
- 자세히: [wiki/architecture.md](wiki/architecture.md)

## 핵심 구현 기능 & 동작 화면

| 기능 | 화면 |
| --- | --- |
| Patch: 글자 하나만 고쳐 반영, 나머지 노드는 그대로 | ![](.agent_workflow/tasks/task_001_ryuuuu5618_phase1/04_qa_evidence/screenshot_02_desktop.png) |
| 뒤로 · 앞으로: 편집창 · 테스트 영역 · 실제 영역이 함께 이동 | ![](.agent_workflow/tasks/task_001_ryuuuu5618_phase1/04_qa_evidence/screenshot_03_desktop.png) |
| Diff 시각화: 스위치를 켜면 바뀐 노드만 깜빡임 | ![](.agent_workflow/tasks/task_001_ryuuuu5618_phase1/04_qa_evidence/screenshot_05_desktop.png) |
| Hooks 자동 갱신: 할 일 체크 · 완료 요약 · 기록판(렌더 · effect 횟수) | ![](.agent_workflow/tasks/task_002_ryuuuu5618_phase2/04_qa_evidence/screenshot_04_desktop.png) |
| Key 이동: [위로] · [아래로]로 순서를 바꿔도 같은 항목(key) 유지 | ![](.agent_workflow/tasks/task_002_ryuuuu5618_phase2/04_qa_evidence/screenshot_05_desktop.png) |

## 핵심 기술 포인트

- 변경 감지: 이전 · 새 VNode 비교 → 고칠 일 목록 → 목록대로 바뀐 곳만 DOM 반영 (위치 기반 필수 · key 확장 MOVE)
- 되돌리기: 기록마다 VNode · 패치 · 역패치 저장 (양방향 연결 리스트, 한도 50), 뒤로 = 역패치를 역순 적용
- Hooks · 재렌더 · 이벤트: `hooks` 배열에 부른 순서로 저장, `if` 안 Hook 금지, setter마다 즉시 동기 렌더 (Batching 미구현), 요소마다 리스너 한 번 + 핸들러 교체
- 실제 React와 차이: 고칠 목록 대신 노드마다 표시 · React에는 History 없음 · React는 setter를 모아 한 번에 렌더
- Reflow / Repaint와 VDOM: [확인 필요: 기록에 설명 없음 — 마스터 확인]

## AI 워크플로 운영 결과

| 항목 | 값 |
| --- | --- |
| task 수 · 검수 회차 | task 2개 · task_001 검수 2회 (둘 다 REJECT, 2회차 뒤 마스터 확인) · task_002 검수 3회 (개발 1회 APPROVE · 경량 2회: REJECT → APPROVE) |
| QA 실패 분류 (구현 · 테스트 · 명세) | QA 실패 0건 (두 task 모두) — 3갈래 분류 대상 없음. 개발 검수 BLOCKING 5건(task_001 4 · task_002 1)은 모두 작업자 재작업으로 해결 (`code_review_log.md`) |
| 자동 테스트 (최종) | task_001: vitest 432 · playwright 96 / task_002: vitest 776 · playwright 154 / tsc 오류 0 |
| `/usage` 비용 (하네스 적용 전 / 후) | [확인 필요: 마스터가 측정값 전달] |

- 위키 · 상세 기록: [wiki/index.md](wiki/index.md) · [wiki/qna_prep.md](wiki/qna_prep.md)

<!-- mini-react-kit:readme:end -->
