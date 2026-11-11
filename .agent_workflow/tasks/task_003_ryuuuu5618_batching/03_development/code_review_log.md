# 개발 검수 기록: batching

## 1회차 (2026-11-11) · Dev-1~4 · diff `01_diff_src.patch` (96ca92a..8f3b532) · 판정 **APPROVE**

- [BLOCKING] 0
- 확인: Batching 엔진(`scheduler.ts`, `FunctionComponent.ts:278-285`) 결정 9 B · 정책대로 — owner별 WeakSet 예약 1번, 같은 값 예약 전 return, 예약 표시는 task 전에 지움, 연달아 횟수(밖 = 1, 안 = 앞 + 1), 51번째는 task를 돌리지 않고 오류 처리 함수로, finally 복구, `setRenderErrorHandler` 기본 다시 던지기 · null = 기본, unmount 뒤 예약은 update()에서 무시. 무한 렌더 · 놓친 렌더 · 경쟁 상태 없음. 엔진 DOM · any · ts-ignore 없음
- 단위 단언 약화 없음 (U-9는 순서 배열 비교로 더 강해짐, U-10 `[0, 1]` 정당, U-11 확인), MutationObserver 콜백 수집은 단언을 더 강하게 함
- e2e · 대시보드 · 문서 기록과 일치 (QA-16 effect 횟수만, QA-17 `>= 20` = qa_todo 원문 "20번 이상", 대시보드 새 숫자 = Dev-2 실측 첫 실행, 토큰량 표 · 사용자 인용 그대로)
- [NON-BLOCKING]
  1. 초안 ③ · qa_todo 「기대값만 바뀌는 기존 시나리오」에 QA-16(제목 쓰기 0·1·2·3·4 → 0·1·4) 줄 없음
  2. `e2e/phase2-log.spec.ts:143` 이름 · 170 주석 "20번 넘게" → "20번 이상"
  3. `hookErrors.test.ts` 새 테스트 이름의 "effect 보호 코드"가 본문과 다름
  4. qa_todo QA-3 "포커스 유지" 문구 — [추가] 클릭 시 포커스는 버튼으로 감, 문구를 고칠 것
  5. 대시보드 B-06 · B-07은 Batching 뒤 렌더 예외가 `run.errors`에 안 잡힘 (verify · e2e 콘솔 검사가 대신) — 원하면 setRenderErrorHandler로 모으기
  6. `useEffect.test.ts:403-440` NB-2 되돌리기가 빠져도 실패하지 않음 — 보호 코드 정리 때 같이
  7. README 39줄 Reflow / Repaint 단락(사용자 확인했던 단락) 문장이 Batching 기준으로 바뀜 → 사용자에게 보여 주기
  8. types_changelog "재실행 결과" 채우기 (마스터)
