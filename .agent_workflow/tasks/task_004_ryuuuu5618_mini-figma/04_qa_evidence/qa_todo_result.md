# qa_todo_result: mini-figma (task_004)

- 시나리오: `qa_todo.md`
- 실행 명령: `npx playwright test --reporter=list` (전체: mini-figma-* 8개 스펙 + Phase 1 · 2 회귀), `npx vitest run`, `npx tsc --noEmit`, `git diff --stat f224bdd -- packages/`
- 실행 시각: 2026-11-11T19:47 ~ 19:55 (브랜치 feature/mini-figma, HEAD 37478b0)
- 캡처용 서버: 서버 남음: PID 11720 · 포트 5199 · `npx vite --port 5199 --strictPort` (백그라운드 작업 TaskStop은 성공했지만 5199가 계속 200으로 응답함. 포트로 프로세스를 죽이지 않았음)

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) | 136 | 0 | 0 |
| mobile (375x812) | 136 | 0 | 0 |

- 합계 272 passed (28.8s). 이 중 mini-figma 스펙은 프로젝트당 50개(QA-1 ~ 30 · A1 ~ A19, QA-A16은 테스트 2개), 나머지는 Phase 1 · 2 · perf-bench 회귀.
- 공통 확인(콘솔 error 0 · 선언 안 한 dialog 없음)은 `phase1-helpers.ts` `test` 확장으로 모든 테스트에 걸려 있고 전부 통과. 캡처 중 MCP 브라우저 콘솔 error도 0건.

## 회귀 · 환경

| QA | 확인 | 결과 |
| --- | --- | --- |
| QA-R1 | `git diff --stat f224bdd -- packages/` | PASS (출력 비어 있음, 엔진 무수정) |
| QA-R2 | `npx vitest run` | PASS (41 파일 · 1064 테스트 모두 통과) |
| QA-R3 | `npx tsc --noEmit` | PASS (오류 0건, exit 0) |
| QA-R4 | `npx playwright test` 전체 | PASS (272 passed, 실패 0) |
| QA-R5 | Phase 1 · Phase 2 검증 페이지 · 성능 대시보드 | PASS (phase1-*, phase2-*, phase2-perfbench 스펙이 두 프로젝트에서 모두 통과 — 별도 수동 확인은 안 함) |

## 시나리오 결과

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-1 | MF-01 · 04 · 05 · 10 · 11 · 16 · P2-02 · P2-22 · T-14 | PASS | PASS | `screenshot_01_desktop.png` · `screenshot_01_mobile.png` |
| QA-2 | MF-03 | PASS | PASS | `screenshot_01_desktop.png` · `screenshot_01_mobile.png` |
| QA-3 | MF-20 · D-05 · T-14 | PASS | PASS | (e2e로만 확인) |
| QA-4 | MF-20 | PASS | PASS | (e2e로만 확인) |
| QA-5 | MF-14 · 15 · 12 · P2-10 · T-14 · T-16 · D-01 | PASS | PASS | (e2e로만 확인) |
| QA-6 | MF-14 · D-02 | PASS | PASS | (e2e로만 확인) |
| QA-7 | MF-12 · 14 · D-02 (Q3-1) | PASS | PASS | `screenshot_02_desktop.png` · `screenshot_02_mobile.png` |
| QA-8 | MF-14 · D-03 · D-04 · Q17-1 | PASS | PASS | (e2e로만 확인) |
| QA-9 | MF-14 · D-01 | PASS | PASS | `screenshot_04_desktop.png` · `screenshot_04_mobile.png` |
| QA-10 | MF-12 · 14 · 21 · P2-10 · T-14 · D-01 | PASS | PASS | `screenshot_03_desktop.png` · `screenshot_03_mobile.png` |
| QA-11 | MF-12 (Q3-1 · Q10) | PASS | PASS | (e2e로만 확인) |
| QA-12 | MF-13 | PASS | PASS | `screenshot_03_desktop.png` · `screenshot_03_mobile.png` |
| QA-13 | MF-21 | PASS | PASS | `screenshot_03_desktop.png` · `screenshot_03_mobile.png` |
| QA-14 | MF-22 · D-03 · T-14 | PASS | PASS | `screenshot_05_desktop.png` · `screenshot_05_mobile.png` · `screenshot_08_desktop.png` · `screenshot_08_mobile.png` |
| QA-15 | MF-23 · D-04 · D-05 · T-14 | PASS | PASS | `screenshot_06_desktop.png` · `screenshot_06_mobile.png` |
| QA-16 | MF-24 | PASS | PASS | (e2e로만 확인) |
| QA-17 | MF-25 · D-03(이동) | PASS | PASS | `screenshot_05_desktop.png` · `screenshot_05_mobile.png` |
| QA-18 | MF-26 · 20 | PASS | PASS | `screenshot_05_desktop.png` · `screenshot_05_mobile.png` |
| QA-19 | MF-30 · 33 · T-14 | PASS | PASS | `screenshot_07_desktop.png` · `screenshot_07_mobile.png` |
| QA-20 | MF-33 (Cmd) | PASS | PASS | (e2e로만 확인) |
| QA-21 | MF-31 | PASS | PASS | (e2e로만 확인) |
| QA-22 | MF-31 | PASS | PASS | (e2e로만 확인) |
| QA-23 | MF-30 | PASS | PASS | (e2e로만 확인) |
| QA-24 | MF-30 · 32 | PASS | PASS | `screenshot_07_desktop.png` · `screenshot_07_mobile.png` |
| QA-25 | MF-33 · 23 · 30 | PASS | PASS | `screenshot_06_desktop.png` · `screenshot_06_mobile.png` · `screenshot_07_desktop.png` · `screenshot_07_mobile.png` |
| QA-26 | MF-14 · 12 · 21 · D-03 · D-04 · D-01 | PASS | PASS | `screenshot_04_desktop.png` · `screenshot_04_mobile.png` |
| QA-27 | MF-12 · 14 · D-03 · D-01 | PASS | PASS | `screenshot_04_desktop.png` · `screenshot_04_mobile.png` |
| QA-28 | MF-13 · 14 | PASS | PASS | (e2e로만 확인) |
| QA-29 | MF-30 · 31 · 34 | PASS | PASS | (e2e로만 확인) |
| QA-30 | MF-30 · 33 · 34 | PASS | PASS | (e2e로만 확인) |
| QA-A1 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A2 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A3 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A4 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A5 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A6 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A7 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A8 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A9 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A10 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A11 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A12 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A13 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A14 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A15 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A16 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A17 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A18 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |
| QA-A19 | 공격 시나리오 | PASS | PASS | (e2e로만 확인) |

캡처 장면 번호 (`screenshot_NN_*`는 장면 번호이며 QA 번호와 1:1이 아님):
01 처음 화면(버튼 4 · b3만 빨강 · 패널 빈 상태) / 02 메인 색 초록 → b3만 빨강 / 03 b1 라벨 「확인」(↻ 1개, 나머지 칸 「메인 따름」) / 04 메인 아이콘 켜기 + b2만 ♥ (아이콘 ★ ★ ♥ ★) / 05 인스턴스 2개 추가 + b1 [↓] (레이어 · 캔버스 모두 b2 b1 b3 b4 b5) / 06 b2 삭제 뒤 빈 패널 (선택 풀림, 레이어 b1 b3) / 07 Ctrl+Z 뒤 (b1 b2 b3 복귀, 선택 없음) / 08 인스턴스 20개 추가(총 24개 버튼, 가로 스크롤 없음, mobile 줄바꿈 확인용). 장면 재현 값은 MCP로 직접 읽어 기대와 일치함. QA 표의 PASS는 e2e 결과이고 캡처는 사람 확인용이다.

## 실패 보고

없음.

## 그 밖에 본 것

- 03 장면에서 선택된 b1의 레이어 행이름이 「확인」으로 바뀌어 보이고(명세대로), desktop 레이어 창 · 속성 패널이 모두 화면 위쪽만 쓰고 아래가 비는 것은 정상 레이아웃으로 보임(판정 아님).
- QA-A16은 스펙에 테스트가 2개(고른 채 [↑][↓] / 선택 없음 [↓])이며 둘 다 두 프로젝트에서 통과.
- 서버 정리: TaskStop 후에도 PID 11720이 5199를 계속 listen 중임.

## 사람 확인

- [x] 캡처를 직접 열어 확인함 (확인한 사람: ryuuuu5618, 시각: 2026-11-11T19:52) — 사용자 "캡처 확인했고 서버 꺼도 돼". 남은 서버 PID 11720 (vite --port 5199)은 사용자 승인 뒤 마스터가 종료
