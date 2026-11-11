# 07 PR 본문 초안: phase1

- 제목: `feat(phase1): Virtual DOM · Diff · Patch · State History 검증 페이지`
- 브랜치: `feature/phase1` → `main` (원격 없음, 로컬 병합. 커밋 49개)
- 레포에 `.github/pull_request_template.md`가 없어 PRD §9 항목에 맞춰 적는다.

## 변경 요약
- Phase 1 필수 P1-01 ~ P1-34 (공통 테스트 T-01 ~ T-08) + 선택 확장 Key 비교 · Diff 시각화
- 패키지
  - `shared`: 코어 타입 — TEXT · 주석 VNode, `Path`, `Patch`(SET_TEXT · SET_ATTR · SET_STYLE · INSERT · REMOVE · REPLACE · MOVE), `HistoryEntry` · `HistoryNode`, `HISTORY_LIMIT = 50`
  - `react-dom-bindings`: `renderVNode` · `renderAreaChildren` · `domToVNode` · `readAreaChildren` · `patch`(+ 관찰 콜백) · `vnodesToHtml` · `setAreaHtml`(미리보기 정리) · `checkHtml`(위험 코드 · SVG · 태그 짝 · 구조 비교) · style 항목 해석
  - `react-reconciler`: `diff`(위치 기반 + Key 확장) · `invertPatches`
  - `react-dom`: `History`(양방향 연결 리스트) · `createVDomRoot`(update · back · forward, Patch 도중 예외 복구)
  - `fixtures/phase1-vdom-playground`: 실제 영역 · 테스트 영역(HTML 편집창 + 미리보기) · Patch · 뒤로 · 앞으로 · 링크 · 폼 기본 동작 막기 · 시각화 스위치 · 오버레이

## ⚙️ 동작 원리 (2.5단계 체크포인트에서)
- Patch를 누르면 테스트 영역 DOM을 VNode로 읽고, 마지막 기록의 VNode와 위치(+key)로 짝지어 비교해 전 · 후가 담긴 고칠 일 목록을 만들고, 경로를 따라 순서대로 실제 영역에 적용한 뒤, VNode · 목록 · 역패치를 연결 리스트에 기록한다. 뒤로가기는 역패치를 역순으로 적용한다.
- [CheckPoint] Diff · Patch (사용자): "위치 기반에서는 가운데를 지우면 \"둘\"이 없으니까 그 <li>를 삭제를 하는 것이 아니라 해당 텍스트만 수정하고 맨 뒤 <li>를 삭제한다"
- [CheckPoint] History (사용자): 갈림길에서 앞쪽 기록을 버림 — "일반적인 프로그램에서는 분기를 나누지 않으니까"
- [CheckPoint] 실제 React와 차이 (사용자): "같은 점은 고칠 목록을 만들고 목록을 바탕으로 수정된 부분만 고친다는 것이고 우리는 리액트 튜토리얼에서 권장하는 방식과 달라" (React는 목록 대신 Fiber 노드별 표시, key 재정렬 이동은 React가 더 적음, React에는 History가 없고 튜토리얼은 상태 스냅샷)

## 설계 선택 · 정책
- `01_request_spec.md` 「알고리즘 결정」 · 「정책」 표, `CLAUDE.md` 「내 설계 결정」 참고 (이유는 사용자 말 그대로)

## 검증 결과 (마스터가 직접 실행, HEAD ce899f0 기준 코드 = 12443c0)
- `npx vitest run`: 16 files · 432 passed
- `npx tsc --noEmit`: 오류 0
- `npx playwright test`: 96 passed (desktop 48 · mobile 48) — 인수 시나리오 QA-1 ~ QA-33 · QA-A1 ~ QA-A12 전부 통과
- 개발 검수: 1회차 REJECT(BLOCKING 3) → 재작업 → 2회차 REJECT(BLOCKING 1) → 사용자 선택으로 재작업 후 마스터 확인 통과 (`03_development/code_review_log.md`)
- QA 캡처 12장 사용자 확인 (`04_qa_evidence/`)

## 알려진 한계 · 남은 일
- SVG 미지원 (Patch 때 막음) — 구현이 끝나면 리마인드
- Key 확장은 단위 테스트로만 검증 (Phase 1 화면에는 key 없음). 이동 횟수는 최소가 아님
- 공백 · 주석을 노드로 남기므로 들여쓰기만 바꿔도 글자 patch가 생김
- 위키 · README 발표 섹션(4단계)은 가벼운 모드라 발표 전에 한 번에
- Phase 2(task_002): 이벤트 props · 재렌더 시점 · Hook 정책 · 앱 주제(후보: 피그마 같은 컴포넌트 시연), 확장 Batching · 성능 대시보드. 0번 기록에 key가 없어 key VNode가 처음 들어오는 update는 위치 비교가 되는 점 확인 필요

🤖 Generated with [Claude Code](https://claude.com/claude-code)
