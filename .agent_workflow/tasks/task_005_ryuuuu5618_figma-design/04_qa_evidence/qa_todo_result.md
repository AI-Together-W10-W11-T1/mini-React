# qa_todo_result: figma-design

- 시나리오: `qa_todo.md`
- 실행 명령: `npx playwright test --reporter=list` (전체) · `npx vitest run` · `npx tsc --noEmit` · `git diff --stat main -- packages/` (+ `c0699a1` 기준도 확인)
- 실행 시각: 2026-11-11T21:40 ~ 21:55
- 캡처용 서버: 서버 남음: PID 50900 · 포트 5199 · `node ...\node_modules\vite\bin\vite.js --port 5199 --strictPort` (내가 `npx vite --port 5199 --strictPort`로 띄우고 TaskStop했으나 npx 아래 node 자식이 남아 응답 중. 규칙상 PID로 끄지 않음 → 마스터/사람이 정리)

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) | 162 | 0 | 0 |
| mobile (375x812) | 162 | 0 | 0 |

- Playwright 전체 324 passed (34.2s). 콘솔 error · 선언 안 한 dialog 없음(공통 확인은 `test` 확장이 모든 테스트에 적용, 실패 0).
- Vitest: 43 files · 1159 tests passed. `tsc --noEmit`: 오류 0. `git diff --stat main -- packages/` · `c0699a1` 기준 모두 빈 출력 (QA-R1).

## 시나리오 결과

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-31 | FD-10 · 11 · 12 · 07 | PASS | PASS | 01 |
| QA-32 | FD-12 · MF-30 · 31 | PASS | PASS | 05 |
| QA-33 | FD-12 · MF-30 · 32 | PASS | PASS | 05 |
| QA-34 | FD-11 · MF-22 · D-03 | PASS | PASS | - |
| QA-35 | FD-21 · 22 · 20 | PASS | PASS | 02 |
| QA-36 | FD-21 · 23 · 24 · 25 · MF-12 · D-02 | PASS | PASS | 03 |
| QA-37 | FD-22 · MF-31 | PASS | PASS | - |
| QA-38 | FD-25 · MF-12 · 13 · 21 | PASS | PASS | 04 |
| QA-39 | FD-23 · D-02 | PASS | PASS | - |
| QA-40 | FD-01 ~ 04 | PASS | PASS | 01 · 02 |
| QA-41 | FD-03 · 05 · 07 | PASS | PASS | - |
| QA-42 | FD-06 · MF-03 | PASS | PASS | 01 |
| QA-43 | FD-08 | PASS | PASS | 01 |
| QA-44 | FD-08 | PASS | PASS | 06 |
| QA-45 | FD-03 (NB 3) | PASS | PASS | - |
| QA-A20 (연타 · 라벨 입력 중, 테스트 2개) | FD-12 · MF-30 · 31 · P2-22 | PASS | PASS | - |
| QA-A21 | FD-12 · P-20 | PASS | PASS | - |
| QA-A22 | FD-22 · MF-31 | PASS | PASS | - |
| QA-A23 | FD-24 · FD-20 | PASS | PASS | - |
| QA-A24 | MF-12 · P-20 | PASS | PASS | - |
| QA-A25 | MF-31 | PASS | PASS | - |
| QA-A26 | FD-06 · 10 · MF-03 | PASS | PASS | 06 (mobile) |
| QA-A27 | FD-12 · 20 · MF-16 | PASS | PASS | - |
| QA-A28 | Q18 ② · FD-22 | PASS | PASS | - |
| QA-A29 | FD-02 · 03 · 24 | PASS | PASS | 03 |
| 바뀐 기존 단언 (QA-1 · 2 · 7 · 10 · 13 · 14 · 15 · 19 · 20 · 23 · 24 · 29 · A5 · A8 ~ A13 등) · 그 밖 회귀 | - | PASS | PASS | - |
| QA-R1 packages diff | - | 비어 있음 | - | - |
| QA-R2 vitest | - | 1159 passed | - | - |
| QA-R3 tsc | - | 오류 0 | - | - |
| QA-R4 playwright 전체 | - | 324 passed | - | - |

캡처 번호(NN)는 마스터 지정 장면 번호이고 QA 번호가 아니다:
- 01 처음 화면 (도구 막대 · 검은 바탕 · 카드 · 점무늬 · [↶][↷] 꺼짐) — `screenshot_01_desktop.png` · `screenshot_01_mobile.png`
- 02 메인 고른 상태 (칩 8 · 직접 고르기 · 값 글자) — `screenshot_02_*`
- 03 메인을 `#f4b000`으로 → 메인 · b1 · b2 노랑 + 먹색 글자, b3 빨강 + 흰 글자 — `screenshot_03_*`
- 04 b1 고르고 `#05b169` override → 색 칸 파랑 계열 강조 + ↻ — `screenshot_04_*`
- 05 몇 번 고친 뒤(메인 크기 L → [+ 인스턴스]) [↶] 클릭 → 추가가 되돌아감([↷] 켜짐) — `screenshot_05_*`
- 06 인스턴스 22개 추가 — `screenshot_06_*` (mobile은 fullPage)

MCP로 같은 페이지에서 재현한 값 (desktop · mobile 동일): 처음 [↶][↷] disabled, 칩 8개, `#f4b000` 뒤 main/b1 `rgb(244, 176, 0)` · 글자 `rgb(10, 11, 13)`, b3 `rgb(207, 32, 47)` · 글자 흰색, b1 override `rgb(5, 177, 105)`, 색 칸에 `#05b169` + ↻, Undo 뒤 [↶][↷] 모두 켜짐 · 버튼 4개. 20개 이상 추가(22번): desktop `scrollHeight 800 = innerHeight 800`, scrollWidth 1280(가로 없음), 레이어 `scrollHeight 1228 > clientHeight 688`(패널 안 스크롤), 캔버스 686/686. mobile 가로 scrollWidth 375(가로 스크롤 없음), 페이지 세로 2207(쌓기 · 세로 스크롤 허용). 콘솔 error 0건. (MCP 브라우저는 viewport만 1280x800 · 375x812로 맞춤. 터치 에뮬레이션은 없음)

## 실패 보고

없음.

## 그 밖에 본 것

- desktop 캡처 06: 레이어 패널 스크롤바가 밝은 흰색 기본 모양(어두운 카드 위에서 튐). 기능 문제 아님, 시각 취향 확인용.
- mobile 캡처 06: 레이어 목록이 패널 안 스크롤 없이 전부 펼쳐져 화면이 길다(스펙상 mobile은 쌓기 · 페이지 스크롤 허용).
- TaskStop 뒤에도 vite 자식 node 프로세스가 남는다(위 「서버 남음」).

## 사람 확인

- [x] 캡처를 직접 열어 확인함 (확인한 사람: ryuuuu5618, 시각: 2026-11-12T01:16, v2 재캡처 기준) — 사용자 "캡처 OK"
- [x] 브라우저의 색 고르기 팝업(`<input type="color">` 네이티브 창)을 직접 열어 색을 고르면 버튼이 따라 바뀌고 Ctrl+Z 한 번에 시작 색으로 돌아오는지 (Playwright `fill`로는 팝업 조작을 못 함) — 사용자 "팝업 됨" (2026-11-12T01:16)
- [x] 어두운 바탕에서 글자 · 선택 표시 · 점무늬가 읽히는지 육안 확인 (특히 `#eef0f3` · `#0a0b0d` 칠한 버튼 위 선택 파랑 테두리, QA-A29) — 점무늬는 5e841b2에서 사용자가 없앰, 스크롤바 색은 사용자 "스크롤바 그대로" (2026-11-12T01:16)

## 재캡처 v2 (task_006 이후 화면)

task_006 · Dev-8 · 디자인 커밋(HEAD 81e1e2d) 이후 화면으로 다시 찍음. 기존 파일은 그대로 두고 `_v2`로 추가. 같은 폴더, desktop 1280x800 · mobile 375x812 (mobile은 fullPage). 앱 Undo 버튼이 없어져 05 장면을 바꿈.
- 01 처음 화면 (도구 막대 [실행 취소] · [다시 실행] 꺼짐 · [Patch] 켜짐, 테스트 · 실제 영역) — `screenshot_01_desktop_v2.png` · `screenshot_01_mobile_v2.png`
- 02 메인 고른 상태 — `screenshot_02_desktop_v2.png` · `screenshot_02_mobile_v2.png`
- 03 메인을 `#f4b000`으로 (메인 · b1 · b2 `rgb(244, 176, 0)`, b3 빨강) — `screenshot_03_desktop_v2.png` · `screenshot_03_mobile_v2.png`
- 04 b1 고르고 `#05b169` override (b1 `rgb(5, 177, 105)`, ↻ 1개) — `screenshot_04_desktop_v2.png` · `screenshot_04_mobile_v2.png`
- 05 메인 크기 L → [Patch] → [실행 취소] (두 영역 버튼 4개 모두 `btn-M`으로 복원, [다시 실행] 켜짐; 깜빡임 사라진 뒤 촬영) — `screenshot_05_desktop_v2.png` · `screenshot_05_mobile_v2.png`
- 06 인스턴스 22개 추가 (기존 3 + 22 = 레이어 행 25개; desktop scrollWidth 1280 = innerWidth, scrollHeight 800 = innerHeight / mobile scrollHeight 3350, 가로 스크롤 없음, fullPage) — `screenshot_06_desktop_v2.png` · `screenshot_06_mobile_v2.png`
