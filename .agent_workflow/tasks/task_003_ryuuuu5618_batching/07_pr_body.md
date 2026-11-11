# 07 PR 본문 초안: batching

- 제목: `feat(batching): 알고리즘 결정 9 A 즉시 동기 → B 마이크로태스크 Batching`
- 브랜치: `feature/batching` → `main` (원격 없음, 로컬 병합)

## 변경 요약
- `scheduler`: `scheduleRender(owner, task)` — owner(컴포넌트)마다 `queueMicrotask` 예약 1번, 연달아 50번 안전장치, `setRenderErrorHandler`(기본 = 다시 던지기)
- `react-reconciler`: setter는 칸 값을 바로 바꾸고 렌더는 예약만, 같은 값이면 예약 안 함
- 단위 테스트를 await 형태로 (렌더 횟수 · 예외 전달 방식만 바뀜), 새 e2e `phase2-batching.spec.ts`, 기존 e2e 렌더 · effect 횟수 기대값 6곳
- 대시보드: 엔진 시나리오 async, B-06 · B-07 다시 측정 (옛 값은 "task_002 당시(즉시 동기)" 표시)
- 문서: `CLAUDE.md` 결정 9 B, README · 위키 문장 (사용자 인용 · 토큰량 표 유지)

## 설계 선택
- 알고리즘 결정 9 B — 이유 (사용자): "리액트를 공부할려면 배칭 구현하는게 맞는 거 같아서"
- 렌더 예외는 마이크로태스크에서 그대로 던짐, 예약 단위는 컴포넌트 (테스트 케이스 확인, "바로 시작해줘")

## 검증 결과
- `npx vitest run`: 36 files · 801 passed / `npx tsc --noEmit`: 오류 0 / `npx playwright test`: 172 passed (desktop 86 · mobile 86)
- 개발 검수 1회차 APPROVE (BLOCKING 0, NON-BLOCKING 8 → 1~4 반영 · 5 · 6 기록 · 7 사용자 확인 · 8 마스터)
- 대시보드 (첫 실행): B-06 setter 10번 → 렌더 1번 · 0.300 / 0.830 ms, B-07 동작 13번 → 렌더 13번 · 1.200 / 1.955 ms
- QA 캡처 8장 사용자 확인

## 알려진 한계 · 남은 일
- 대시보드 B-06 · B-07은 Batching 렌더 예외를 오류 칸에 세지 않음 (정확성 검사가 대신, 검수 NB-5)
- effect 보호 코드(`latestPending` · `runCount`)는 중첩 렌더가 없어져 일부 불필요 — 정리는 다음 기회 (검수 NB-6)
- mobile 화면에서 대시보드 표 비고 칸이 잘림

🤖 Generated with [Claude Code](https://claude.com/claude-code)
