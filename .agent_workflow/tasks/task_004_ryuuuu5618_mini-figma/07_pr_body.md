# 07 PR 본문 초안: mini-figma

- 제목: `feat(mini-figma): 미니 React로 만든 Figma Components 시연 앱`
- 브랜치: `feature/mini-figma` → `main` (원격 없음, 로컬 병합. 커밋 33개) — **병합 완료 634304e**
- 레포에 `.github/pull_request_template.md`가 없어 PRD §9 항목에 맞춰 적는다.

## 변경 요약
- 완성된 미니 React(Phase 1 · 2 · Batching)로 Figma의 **Components**(메인 컴포넌트 · 인스턴스 · component property)를 만든 시연 앱. PRD상 필수 아님(특정 주제 앱), 가까운 요구사항 P2-02 · P2-09 · P2-10 · P2-22 · P2-24
- 명세 MF-01 ~ MF-34 (`01_request_spec.md`), 엔진 `packages/`는 **한 줄도 바꾸지 않음** (`git diff --stat f224bdd -- packages/` 비어 있음)
- `fixtures/mini-figma/`
  - `model.ts`: 시작 데이터 · override 합치기(`{ ...main, ...it }`, 키가 있으면 override) · ↻ = 키 지우기 · 추가(`nextId`) · 삭제 · 순서 · 선택 정리
  - `undo.ts`: 같은 대상 + 같은 칸 연달아 = 한 단계, 처음 상태 포함 50개 = Undo 49번, Redo 버림
  - `keys.ts`: Delete · Backspace(수정키 없을 때만) · Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z 판정, 대상 종류별(글자 칸 · 선택 상자 · 체크박스)
  - `App.ts`(Hook 4칸 · `useEffect` 키보드) → `LayerPanel` · `Canvas`(→ `Button` · `Icons`) · `PropertyPanel`, 자식은 props + 콜백 props만
- 단위 `fixtures/mini-figma/__tests__/` 5파일 (model · undo · keys · rootOnlyHooks · app = patch 기대 표 P-1 ~ 22)
- e2e `e2e/mini-figma-{render,select,main,instance,layers,undo,attack}.spec.ts` + helpers (인수 QA-1 ~ 30, 공격 QA-A1 ~ A19)
- 문서: `CLAUDE.md` 「패키지 역할」 · 「시연 앱 mini-figma」, `wiki/` 3파일, README 발표 섹션

## ⚙️ 동작 원리 (2.5단계 체크포인트에서)
- 메인 = 함수형 컴포넌트 `Button`, 인스턴스 = `h(Button, { key: it.id, ...main, ...it })` 호출 한 번, property = props. state(`main` · `instances` · 선택 · Undo 기록)는 루트 `App`에만 있고, 메인을 고치면 override 키가 없는 인스턴스만 따라 바뀐다.
- [CheckPoint] 키보드 리스너 (사용자): "이벤트 리스너를 때는 작업 아니야? 11개가 붙이 있지 않을까? 엉뚱한 걸 지울 것 같아" (엔진 props 이벤트는 요소마다라 전역 단축키는 `document`에 붙임 — 설명 들음)
- [CheckPoint] 의존성 `[]` (사용자): "아하 그러면 처음 렌더될 때만 실행되고 안 되겠네" (node 흉내 결과 `[]` = 지울 대상 null)
- CP3(Instance swap patch)는 사용자 요청으로 건너뜀 — 발표 전 다시 할 후보

## 설계 선택 · 정책
- `01_request_spec.md` 「알고리즘 결정」 · 「정책」 표 (Q1 ~ Q18, 이유는 사용자 말 그대로), `CLAUDE.md` 「시연 앱 mini-figma」

## 검증 결과 (마스터 · QA 실행, 코드 HEAD 37478b0)
- `npx vitest run`: 41 files · 1064 passed
- `npx tsc --noEmit`: 오류 0
- `npx playwright test`: 272 passed (desktop 136 · mobile 136, mini-figma 50 × 2 + Phase 1 · 2 · perf-bench 회귀), 콘솔 error 0
- 기획 검수: 1회차 REJECT(BLOCKING 3) → 2회차 APPROVE (`02_planning_review/`)
- 개발 검수: 묶음 1(Dev-1 ~ 4) · 2(Dev-5 ~ 8) APPROVE, 묶음 3(Dev-9 ~ 12) 1회차 REJECT(BLOCKING 1: 브라우저 기본 Undo 겹침 → 재현 e2e QA-29 실패로 확인 → 사용자 결정 Q18로 수정) → 2회차 APPROVE (`03_development/code_review_log.md`)
- QA 실패 0, 캡처 16장 사용자 확인 (`04_qa_evidence/`)

## 알려진 한계 · 남은 일
- 터치 기기에서는 Undo 수단 없음 (Undo 버튼 없음, Q17-6)
- Windows Chromium Ctrl+Y는 앱 키가 아니라 막지 않음 → 라벨 칸 글자 되돌리기 뒤 칸 밖 Ctrl+Y면 브라우저 Redo가 일반 수정 한 단계로 기록될 수 있음 (앱 Undo 기록은 안 깨짐)
- 엔진 이벤트가 `click` · `input`뿐이라 끌기 · 크기 조절 · 확대·축소 없음, 메인 컴포넌트는 버튼 하나 · 메인 삭제 불가 · 저장 없음 (명세 제외 범위)
- 렌더마다 핸들러가 새 함수라 `SET_EVENT` 줄이 생김 (task_002 알려진 한계 그대로)
- 체크포인트 CP3 · 한 줄 요약은 발표 전에

🤖 Generated with [Claude Code](https://claude.com/claude-code)
