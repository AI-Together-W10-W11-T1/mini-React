# qa_todo_result: patch-preview (task_006)

**재실행 2회차: Dev-8 · 디자인 커밋 5e841b2 · 905a582 · 81e1e2d 반영** (1회차 = 55251ab 시점, 전체 308 passed · 실패 0 · preview 24건이었음)

- 시나리오: `qa_todo.md` (「PP-06 변경 (Dev-8)」 절 포함: QA-55 ~ 62 · A38 ~ A42, 개정된 QA-52 · 53 · 54)
- 실행 명령: `npx playwright test --reporter=list` (전체 1회) → **330 passed · 0 failed · 0 skipped** (38.7s)
- 회귀: `npx vitest run` → **1195 passed (1195)** / `npx tsc --noEmit` → 오류 없음 (exit 0)
- 실행 시각: 2026-11-12T01:1x (브랜치 feature/patch-preview, HEAD 81e1e2d, 작업 트리: 앱 · 테스트 코드 변경 없음)
- 캡처용 서버: 포트 5231 `npx vite --port 5231 --strictPort`(background)을 띄우고 TaskStop으로 껐으나 **서버 남음: 5231 · node 자식 프로세스 PID 46960** (`[::1]:5231` LISTENING, `/mini-figma/` 200 응답). 규칙상 포트 · PID로 죽이지 않고 둠. 5199 · 5173 · 5180은 건드리지 않음 (5199는 전체 실행 뒤 응답 없음).

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) | 165 | 0 | 0 |
| mobile (375x812) | 165 | 0 | 0 |
| 그중 preview 스펙 | 23 + 23 | 0 | 0 |

## 시나리오 결과

전체 330건이 모두 PASS (desktop · mobile 동일). preview 스펙의 QA-46 ~ 62 · A30 ~ A40 시나리오와 기존 task_004 · 005 · Phase 1 · 2 회귀 포함. 필수 확인: Diff 기본 케이스 D-01 ~ 04 = QA-48 · 49 · 50 PASS (D-05 단위), History 동기화 = QA-52 · 55 PASS + 아래 캡처.

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-46 | PP-01 · FD-06 · FD-08 | PASS | PASS | `screenshot_46_desktop.png` · `screenshot_46_mobile.png` (처음 상태, mobile은 fullPage) |
| QA-47 | PP-02 · 03 · 05 · 07 | PASS | PASS | `screenshot_47_desktop_toolbar.png` · `screenshot_47_mobile_toolbar.png` (도구 막대 확대) |
| QA-48 | PP-04 · 08 · D-01 | PASS | PASS | - |
| QA-49 | PP-04 · 08 · D-02 | PASS | PASS | `screenshot_49_{desktop,mobile}_before.png` · `_after.png` (메인 `#cf202f` 뒤 Patch 전 / 직후, 깜빡임 박스 3개) |
| QA-50 · 51 | PP-04 · 05 · D-03 · 04 | PASS | PASS | - |
| QA-52 | PP-06 · 08 · 11 · History 동기화 (개정) | PASS | PASS | `screenshot_52_desktop.png` · `screenshot_52_mobile.png` (Patch 뒤 [실행 취소] → 두 영역 모두 파랑) |
| QA-53 · 54 | PP-06 · 10 | PASS | PASS | - |
| QA-55 | PP-06 · T-08 · D-02 | PASS | PASS | `screenshot_55_desktop.png` · `screenshot_55_mobile.png` (Patch 안 한 편집 뒤 [실행 취소] → 편집 버려짐, 두 영역 처음 모습) |
| QA-56 ~ 62 · A30 ~ A40 | PP-04 ~ 06 · 11 | PASS | PASS | - |
| QA-A41 · A42 | PP-06 | 범위 밖 (단위 테스트가 맡음, vitest 1195 passed) | 〃 | - |

캡처 직접 재현 수치 (MCP, `fixtures/mini-figma/`, desktop · mobile 동일):
- 49: 메인 `#cf202f` → Patch 직후 박스 3개 (`data-last-patch-count` 3 · `data-last-flash-count` 3).
- 52: [실행 취소] 뒤 테스트 · 실제 영역 모두 메인 · b1 · b2 `rgb(0, 82, 255)`, b3 `rgb(207, 32, 47)`, 색 입력값 `#0052ff`, [실행 취소] 꺼짐 · [다시 실행] 켜짐.
- 55: 라벨 `확인` + 빨강을 Patch한 뒤 라벨을 `편집만`으로 고친 상태(테스트 `편집만`, 실제 `확인`)에서 [실행 취소] → 두 영역 라벨 `버튼 · 버튼 · 취소 · 삭제`, 배경 파랑 ×3 + 빨강, 라벨 입력칸 `버튼`, [실행 취소] 꺼짐 · [다시 실행] 켜짐.
- 52 · 55 캡처는 [실행 취소] 뒤 1.5초 기다려 깜빡임 박스가 사라진 뒤(`.viz-box` 0개)에 찍음. (처음 시도에서는 깜빡임이 글자 위에 겹쳐 찍혀 다시 찍음)
- 캡처 장면의 [+ 인스턴스]는 지금 버튼 글자가 「인스턴스 생성」이고 속성 패널 오른쪽 아래에 있음 (메인을 고른 뒤 누름).

## 실패 보고

없음.

## 그 밖에 본 것

- 1회차 때 있던 「직전 서버가 닫히는 중이라 5199 already used」 현상은 이번에는 없었다 (전체 1회로 통과).
- 이번 캡처 서버(5231)도 TaskStop 뒤 node 자식이 남는다 (위 「서버 남음」). 1회차의 5199 잔여 프로세스는 이번 전체 실행이 정상 시작된 것으로 보아 이미 없어진 것으로 보임.
- 캡처 화면 크기는 1280x800 · 375x812만 사용. mobile 캡처는 세로로 쌓이는 화면이라 fullPage.

## 사람 확인

- [x] 캡처를 직접 열어 확인함 (확인한 사람: ryuuuu5618, 시각: 2026-11-12T01:16, 재실행 2회차 캡처) — 사용자 "캡처 OK"
