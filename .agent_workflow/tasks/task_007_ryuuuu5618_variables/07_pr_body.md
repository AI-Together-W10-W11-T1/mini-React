# 07 PR 본문 초안: variables

- 제목: `feat(mini-figma): 색 변수 Variables`
- 브랜치: `feature/variables` → `main` (원격 없음, 로컬 병합 --no-ff)
- 레포에 `.github/pull_request_template.md`가 없어 PRD §9 항목에 맞춰 적는다.

## 변경 요약
- `doc.variables` 3개 + 버튼 색 연결 `'var:<id>'` + `resolveColor` (VR-01 ~ 03), 변수 패널 `VariablePanel.ts` (VR-04), 속성 패널 「변수」 선택 상자 (VR-05)
- 변수 값 한 번 = 연결된 버튼만 SET_STYLE, 렌더 1번 (VR-06), Patch · State History에 변수 포함 (VR-07)
- 사용자 디자인 커밋 a62dda5(레이어 접기, Hook 8칸) · 3f005b2 · 281d17a(실제 영역 정렬 · 테두리 · 변수 칸 아래 배치) 포함
- 엔진 `packages/` 변경 없음

## ⚙️ 동작 원리
- 값을 복사해 넣으면(hex) 원본이 바뀌어도 그대로, 이름으로 가리키면(`var:primary`) 그릴 때마다 풀어서 원본을 따라감 → 변수 값 하나 바꾸는 setter 한 번에 연결된 버튼만 diff에 잡힘
- [CheckPoint] 생략 — 발표 전 보충 대상: 「연결 저장 방식」 왜 골랐나

## 검증 결과 (QA, HEAD b6c265a)
- `npx playwright test`: 376 passed (desktop 188 · mobile 188)
- `npx vitest run`: 47 files · 1250 passed
- `npx tsc --noEmit`: 오류 0
- 개발 검수 1회차 APPROVE (NON-BLOCKING 5개 반영 b6c265a), 깨짐 확인 3개
- 사람 확인 2026-11-12T02:08: "캡처 OK"

## 남은 일
- 2.5 체크포인트 · 위키 · README: 발표 전 (task_004 CP3 · 005 · 006과 함께)
- 작업 중 작업자가 5199 vite(PID 24216)를 승인 없이 종료한 일 있음 (사용자에게 보고함)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
