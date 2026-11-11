# 07 PR 본문 초안: phase2

- 제목: `feat(phase2): 함수형 컴포넌트 · Hooks · 자동 갱신 검증 페이지 + 성능 대시보드`
- 브랜치: `feature/phase2` → `main` (원격 없음, 로컬 병합. 커밋 45개)
- 레포에 `.github/pull_request_template.md`가 없어 PRD §9 항목에 맞춰 적는다.

## 변경 요약
- Phase 2 필수 P2-01 ~ P2-24 (공통 테스트 T-09 ~ T-16) + 선택 확장 1 성능 대시보드. 확장 2 Batching은 시간이 남으면 (미구현)
- 패키지
  - `shared`: `SET_EVENT` · `SET_PROP` patch, Hook 슬롯 타입(`StateHook` · `EffectHook` · `MemoHook`), `NESTED_RENDER_LIMIT = 50`, `DOM_PROP_ELEMENTS`
  - `react`: Hook 공개 API `useState` · `useEffect` · `useMemo` (디스패처 위임, 렌더 밖 호출은 오류)
  - `react-reconciler`: `diff`가 이벤트 · `value`/`checked`를 따로 비교, `resolveComponents`(자식 컴포넌트 풀기 · key 물려주기 · 자식 Hook 오류), `FunctionComponent`(`hooks` · `mount()` · `update()` · `unmount()` · `lastPatches`), Hook 오류 정책 · 실패한 렌더 되돌리기 · patch 예외 복구
  - `react-dom-bindings`: `setEventHandler`(리스너 하나 + 핸들러 교체), `renderVNode` · `patch`의 이벤트 · 프로퍼티
  - `scheduler`: `scheduleRender`(즉시 동기 + 중첩 50 안전장치)
  - `react-dom`: `render(App, container, { onPatch })`
  - `fixtures/phase2-app`: 루트 `App` + ① 카운터 ② 입력창 ③ 목록(key = 항목 id, [위로] · [아래로]) ④ 기록판
  - `fixtures/perf-bench` (확장 1): 시나리오 B-01 ~ B-07, 준비 5 · 측정 30, p50 · p95, 측정 조건 기록

## ⚙️ 동작 원리 (2.5단계 체크포인트에서)
- setter를 부르면 바로 `App()`을 다시 실행해 새 VNode를 만들고, 자식 컴포넌트를 풀어 Phase 1 diff로 비교한 뒤 바뀐 곳만 patch하고, patch 직후 effect를 의존성에 따라 실행한다. 이벤트는 요소마다 리스너를 한 번만 등록하고 렌더 때는 저장된 함수만 바꾼다.
- [CheckPoint] 의존성 (사용자): "(다)에 두 번째 인자가 비어있기 때문에 무조건 실행이 되는 구나"
- [CheckPoint] Hook 호출 순서 (사용자): "hook을 부르는 순서는 정해져 있으니까 순서를 보고 값을 꺼내온다" · "if를 넣으면 조건문 조건에 따라 훅이 실행될 수도 있고 아닐 수도 있기 때문에 훅 호출 순서가 달라지기 때문이야"
- [CheckPoint] 결정 8 (설명 듣고 요약 확인): "리스너는 한 번만 등록하고, 렌더할 때는 함수만 갈아 끼운다."

## 설계 선택 · 정책
- `01_request_spec.md` 「알고리즘 결정」(결정 8 B · 결정 9 A) · 「정책」 표, `CLAUDE.md` 「내 설계 결정」 참고 (이유는 사용자 말 그대로)

## 검증 결과 (마스터 · QA 실행, HEAD 7dbcb0f 기준 코드)
- `npx vitest run`: 36 files · 776 passed
- `npx tsc --noEmit`: 오류 0
- `npx playwright test`: 154 passed (desktop 77 · mobile 77 = Phase 1 48 + Phase 2 29) — 인수 QA-1 ~ QA-19 · 공격 QA-A1 ~ QA-A9 · 확장 QA-20 통과, QA-21(Batching) 미구현
- 개발 검수: 필수 Dev 1회차 APPROVE(NON-BLOCKING 8 → 6 반영 · 2 기록) → NB 반영 + 확장 1 경량 검수 1회차 REJECT(BLOCKING 1: B-07 집계에 기록판 쓰기 섞임) → 재작업 2회차 APPROVE (`03_development/code_review_log.md`)
- QA 캡처 14장 사용자 확인 (`04_qa_evidence/`)

## 알려진 한계 · 남은 일
- Batching(확장 2) 미구현 — 시간이 남으면 결정 9 A → B(`queueMicrotask`)
- 렌더마다 핸들러가 새 함수라 이벤트 교체 patch 줄이 늘 생김 (DOM 작업은 없음, 기록판에서 따로 표시)
- Phase 1 편집창에서 `input` · `textarea` · `select`의 `value` · `checked` 속성을 고치면 프로퍼티만 바뀌고 속성 글은 안 바뀜, `<select value>` + `<option>` 삭제를 한 번에 한 기록의 「뒤로」는 선택값이 어긋날 수 있음
- 렌더 실패 시 state는 남고 화면은 다음 성공 렌더에서 맞춰짐
- SVG 미지원 — 구현이 끝났으니 지원 여부를 다시 정하기 (리마인드)
- 4단계 위키 · README 발표 섹션은 발표 전에 task_001 · 002 함께
- 피그마 같은 시연 앱은 미니 React 완성 뒤 따로

🤖 Generated with [Claude Code](https://claude.com/claude-code)
