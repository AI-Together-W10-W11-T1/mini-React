# qa_todo_result: patch-preview (task_006)

- 시나리오: `qa_todo.md` (범위 = 명세 §6 「빠르게」: QA-46 ~ 54 + A30 · A31 · A32, A36은 단위 `preview.test.ts`)
- 실행 명령: `npx playwright test e2e/mini-figma-preview.spec.ts --reporter=list` → 24 passed
- 회귀: `npx playwright test` 전체 → 308 passed (기대 308) / `npx vitest run` → 45 파일 · 1178 passed (기대 1178) / `npx tsc --noEmit` → 오류 없음
- 실행 시각: 2026-11-11T23:5x (브랜치 feature/patch-preview, HEAD 55251ab)
- 캡처용 서버: **서버 남음: 5199 · `node ...\node_modules\vite\bin\vite.js --port 5199 --strictPort` (PID 47932, 부모 cmd 1936)**. 캡처용으로 `npx vite --port 5199 --strictPort`를 background로 띄웠고 TaskStop으로 껐으나 node 자식 프로세스가 남아 `/mini-figma/`가 200으로 응답함. 규칙상 포트 · PID로 프로세스를 죽이지 않아 그대로 둠 (5173 · 5180은 건드리지 않음)

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) — preview 스펙 12건 | 12 | 0 | 0 |
| mobile (375x812) — preview 스펙 12건 | 12 | 0 | 0 |
| 전체 회귀 (desktop + mobile) | 308 | 0 | 0 |

## 시나리오 결과

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-46 | PP-01 · FD-06 · FD-08 | PASS | PASS | `screenshot_46_desktop.png` · `screenshot_46_mobile.png` (처음 상태) |
| QA-47 | PP-02 · 03 · 05 · 07 | PASS | PASS | `screenshot_47_desktop_toolbar.png` · `screenshot_47_mobile_toolbar.png` (도구 막대) |
| QA-48 | PP-04 · 08 · D-01 | PASS | PASS | - |
| QA-49 | PP-04 · 08 · D-02 | PASS | PASS | `screenshot_49_{desktop,mobile}_before.png` · `_after.png` (Patch 직후 깜빡임 박스 3개: 메인 · b1 · b2) |
| QA-50 | PP-04 · D-03 · D-04 | PASS | PASS | - |
| QA-51 | PP-04 · 05 | PASS | PASS | - |
| QA-52 | PP-06 · 08 · 11 | PASS | PASS | `screenshot_52_desktop.png` · `screenshot_52_mobile.png` ([실행 취소] 후: 실제 영역만 파랑으로 돌아가고 테스트 영역은 빨강 그대로, [다시 실행] 켜짐) |
| QA-53 | PP-06 | PASS | PASS | - |
| QA-54 | PP-10 · 06 · 09 · 11 · 12 | PASS | PASS | - |
| QA-A30 | PP-04 · 06 | PASS | PASS | - |
| QA-A31 | PP-06 · 11 | PASS | PASS | - |
| QA-A32 | PP-04 · 05 | PASS | PASS | - |
| QA-A36 | PP-06 (한도 50) | 범위 밖(단위 `preview.test.ts` · `previewNav.test.ts`가 맡음, 이 e2e에서는 세지 않음) | 〃 | - |
| QA-A33 · A34 · A35 · A37 | PP-03 · 04 · 06 · 01 | **PASS** (범위 확대 2026-11-12T00:26 사용자 결정, 커밋 03ba8b9 — preview 스펙 32 · 전체 316 통과, 각 테스트 깨짐 확인. 실행 = mr-worker, 마스터 기록) | desktop · mobile | - |

필수 확인: Diff 기본 케이스 D-01 = QA-48, D-02 = QA-49, D-03 · 04 = QA-50 (D-05는 단위 R-13) — 모두 PASS. History 동기화 = QA-52 PASS + 캡처.

캡처 직접 재현 수치 (MCP, `fixtures/mini-figma/`): 메인 색 `#cf202f` → Patch 직후 박스 3개(`data-last-patch-count` 3 · `data-last-flash-count` 3, desktop · mobile 동일), [실행 취소] 후 실제 영역 배경 `rgb(0, 82, 255)` · 테스트 영역 `rgb(207, 32, 47)` · [실행 취소] 꺼짐 · [다시 실행] 켜짐.

## 실패 보고

없음.

## 그 밖에 본 것

- 첫 전체 `npx playwright test`가 `http://localhost:5199/... is already used`로 즉시 실패했다. 직전에 끝난 preview 스펙 실행의 서버가 막 닫히는 중이던 것으로 보이며, 몇 초 뒤 재실행하니 308 passed. 코드 문제 아님(불확실하나 재현 안 됨).
- 캡처 스크립트의 브라우저 화면 크기는 1280x800 · 375x812만 썼다.

## 사람 확인

- [ ] 캡처를 직접 열어 확인함 (확인한 사람: , 시각: )
