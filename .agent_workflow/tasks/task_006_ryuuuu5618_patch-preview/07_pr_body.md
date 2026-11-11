# 07 PR 본문 초안: patch-preview

- 제목: `feat(mini-figma): 실제 영역 · Patch · State History (Phase 1 흐름을 시연 앱 안에)`
- 브랜치: `feature/patch-preview` → `main` (원격 없음, 로컬 병합 --no-ff, figma-design 병합 뒤, 커밋 29개)
- 레포에 `.github/pull_request_template.md`가 없어 PRD §9 항목에 맞춰 적는다.

## 변경 요약
- mini-figma 캔버스 = 테스트 영역, 그 아래 실제 영역. [Patch] → 테스트 영역 DOM `readAreaChildren` → 정리(`toRealVNodes`: 고르기 표시 · testid · 제목 빼기) → `createVDomRoot(실제 영역).update` (diff + 바뀐 곳만 patch + State History 50) + 바뀐 노드 깜빡임 덧칠 층 (PP-01 ~ 05 · 08)
- [실행 취소] · [다시 실행] · Ctrl/Cmd+Z · Shift+Z = State History. **두 영역 함께** 그 칸으로 (PP-06 변경, PRD T-08): Patch 때 `doc` 사본을 기록 칸 번호로 저장(`previewDocs.ts`), 이동하면 `setDoc`. 선택은 없어진 인스턴스면 풂, `nextId` 유지, Patch 안 한 편집은 버림
- 앱 편집 Undo 제거 (PP-12), 도구 막대 = 앱 이름 · [실행 취소] · [다시 실행] · [Patch], [인스턴스 생성] · [삭제]는 속성 패널 (사용자 변경 81e1e2d)
- 사용자 디자인 커밋 5e841b2 · 81e1e2d (헤더 · 사이드바 · 점무늬 제거 · 버튼 자리), 실제 영역도 같은 모양 905a582
- Hook은 App에만 7칸, 실제 영역 상자는 미니 React가 자식 없는 빈 요소로 그림 (`inert`). 엔진 `packages/` 변경 없음 (`git diff --stat main -- packages/` 빈 출력)

## ⚙️ 동작 원리
- 실제 영역 VNode는 DOM에서 읽어 key가 없음 → 순서 바꾸기는 MOVE가 아니라 위치 비교 줄로 나옴 (엔진 정상, 계획 표를 고침)
- [CheckPoint] 생략 (2026-11-12T01:18, 사용자 "시간 없으니까 너가 추천하는 방식으로 진행해") — 발표 전 보충 대상: PP-06 ④ 「Patch 안 한 편집은 버림」 왜 골랐나

## 검증 결과 (QA 재실행 2회차, HEAD 81e1e2d)
- `npx playwright test`: 330 passed (desktop 165 · mobile 165)
- `npx vitest run`: 46 files · 1195 passed
- `npx tsc --noEmit`: 오류 0
- 개발 검수: Dev-1~7 2회차 APPROVE (1회차 REJECT = qa_todo 문서만), Dev-8 1회차 APPROVE
- 사람 확인 2026-11-12T01:18: "캡처 OK"

## 남은 일
- 2.5 체크포인트 · 4단계 위키 · README: 발표 전 한 번 (task_004 CP3와 함께)
- 코드로 같은 틱에 [실행 취소] + [Patch]를 이어 부르면 이동 전 doc 저장 가능 (실제 클릭으로는 안 생김, 기록만)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
