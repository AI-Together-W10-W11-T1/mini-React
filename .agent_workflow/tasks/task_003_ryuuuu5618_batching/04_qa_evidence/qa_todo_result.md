# qa_todo_result: batching

- 시나리오: `qa_todo.md`
- 실행 명령: `npx playwright test --reporter=list` (전체: phase1 + phase2 + batching, `webServer`가 5199를 띄웠다 끔). 보조: `npx vitest run`, `npx tsc --noEmit`
- 실행 시각: 2026-11-11T14:45 (레포 브랜치 feature/batching)
- 캡처용 서버: **서버 남음: 5199 · PID 12420 (node.exe) · `npx vite --port 5199 --strictPort`**. 캡처용으로 Bash `run_in_background`(작업 ID bw38kog49)로 띄웠고 `TaskStop`은 성공했다고 응답했지만, `npx`가 띄운 자식 node 프로세스는 남아 `http://localhost:5199/phase2-app/`가 HTTP 200으로 계속 응답한다. 규칙상 PID · 포트로 프로세스를 죽이지 않았으므로 마스터 · 사용자가 정리해야 한다. (e2e 실행 전 5199는 비어 있었고, e2e `webServer`는 정상 종료됐다.)

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) | 86 | 0 | 0 |
| mobile (375x812) | 86 | 0 | 0 |

- Playwright 총 **172 passed (19.1s)**. 프로젝트당 86건 = Phase 1 48건 + Phase 2 38건(batching 8건 · perfbench 3건 포함). 실패 · 건너뜀 · flaky 0.
- `npx vitest run`: **36 files · 801 tests passed** (task_002 때 776건 → 25건 늘어남).
- `npx tsc --noEmit`: 오류 없음(exit 0).
- ESLint: 레포에 ESLint 설정 · 스크립트 · 의존성이 없다(`package.json` scripts는 dev · test · e2e · typecheck뿐). QA-R3의 ESLint는 **실행하지 못했다(해당 없음 — 설정 없음)**. 통과로 적지 않는다.
- 콘솔 error · dialog는 `phase1-helpers.ts`의 `test` 확장이 모든 스펙에서 감시하며 실패 0건. MCP 캡처 재현에서도 perf-bench 콘솔 error · warning 0건.

## 시나리오 결과

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-1 | §4.2 Batching · P2-15 · P2-16 · T-14 | PASS | PASS | `screenshot_01_*.png` (처음) · `screenshot_02_*.png` ([+3] 뒤) |
| QA-2 | §4.2 Batching · P2-15 | PASS | PASS | - |
| QA-3 | §4.2 Batching · P2-15 · T-14 · T-13 | PASS | PASS | `screenshot_03_*.png` |
| QA-4 | P2-16 · T-12 | PASS | PASS | - |
| QA-5 | §8.1 B-06 · B-07 · §4.2 렌더 횟수 기록 | PASS | PASS | `screenshot_04_*.png` |
| QA-A1 | 한 JS 안 [+3] 20번 → 60 · 렌더 +1 | PASS | PASS | - |
| QA-A2 | 이름 입력 3번 → `가나다` · 렌더 +1 | PASS | PASS | - |
| QA-A3 | 위로 2 · 체크 · 삭제 순서 쌓임 · 렌더 +1 | PASS | PASS | - |
| QA-A4 | [+1] 다음 [그대로] → 0 · DOM 변경 0건 | PASS | PASS | - |
| 기존 task_002 QA-3 [+3] 렌더 2 (`phase2-counter`) | 기대값 변경 | PASS | PASS | - |
| 기존 task_002 QA-14 기록판 4·3·1 / 6·3·2 (`phase2-log`) | 기대값 변경 | PASS | PASS | - |
| 기존 task_002 QA-A2 연타 렌더 41 (`phase2-attack`) | 기대값 변경 | PASS | PASS | - |
| 기존 task_002 QA-17 렌더 20번 이상 (`phase2-log`) | 기대값 변경 | PASS | PASS | - |
| 기존 task_002 QA-16 탭 제목 쓰기 기록 (`phase2-log`) | 기대값 변경 | PASS | PASS | - |
| QA-R1 | task_002 Phase 2 e2e 전부 (counter · input · todo · log · attack · render · perfbench) | PASS (Phase 2 38건 전체) | PASS (38건 전체) | - |
| QA-R2 | Phase 1 e2e | PASS (48건) | PASS (48건) → 합계 96 passed | - |
| QA-R3 | vitest · tsc · ESLint | vitest 801 passed · tsc 오류 0 · ESLint 해당 없음(설정 없음, 실행 못 함) | (프로젝트 무관) | - |

필수 확인 대응: Diff 기본 케이스 D-01~05 = QA-R1의 task_002 QA-2 · 8 · 9 · 10(`phase2-input` · `phase2-todo`)이 [추가] 렌더 1번이 된 뒤에도 같은 DOM 결과로 통과. History 동기화 = QA-R2(`phase1-history`) 통과. [+3] 뒤 기록판 · B-06 행 캡처 = 아래 목록. 화면에서 못 덮는 것(안전장치 · 렌더 중 setter · 렌더 예외 뒤 큐 · unmount 뒤 setter)은 단위 테스트 영역이며 vitest 801 passed에 포함 (개별 항목은 확인하지 않음, `dev_todo.md` 참조).

## 캡처 목록 (Playwright MCP로 `http://localhost:5199/phase2-app/` · `/perf-bench/`를 직접 재현, fullPage, 같은 순서를 desktop · mobile에서 각각)

재현 순서(새로 연 페이지): ① 처음 → ② [+3] 한 번 → 이름 `민수` · 할 일 `사과` 입력 → [추가] ③ → `/perf-bench/` [측정 시작] 후 완료 ④. 캡처 이미지는 모두 직접 열어 확인했다.

| 파일 | 직접 열어 본 내용 |
| --- | --- |
| `screenshot_01_desktop.png` · `screenshot_01_mobile.png` | ① 검증 페이지 처음: 카운터 0 · [+1] [+3] [그대로], 이름 입력창(빈칸) + "이름을 입력해 주세요", 할 일 입력창 · [추가] · "전체 0개 · 완료 0개" · "할 일이 없어요", 기록판 렌더 1 · effect 1 · memo 1 · patch 줄 0 · 이벤트 교체 0. desktop은 2열(카운터 · 입력창 / 목록 · 기록판), mobile은 한 열로 쌓임 |
| `screenshot_02_desktop.png` · `screenshot_02_mobile.png` | ② [+3] 한 번 뒤: 카운터 **3**, 기록판 **렌더 횟수 2 · effect 2 · memo 1 · patch 줄 8 · 이벤트 교체 6**. 렌더가 1 → 2로 **1만 늘어난 것**이 보임(task_002 때는 4). 눌린 [+3] 버튼이 회색 강조. 탭 제목은 `카운터 3 - Phase 2`(MCP로 확인) |
| `screenshot_03_desktop.png` · `screenshot_03_mobile.png` | ③ [+3] 뒤 이름 `민수` 입력 + 할 일 `사과` 입력 + [추가] 뒤: 이름 입력창 `민수` · 인사 "안녕하세요, 민수님", 할 일 입력창은 비워짐(placeholder `할 일`), "전체 1개 · 완료 0개", `사과` 항목 1개(체크박스 · [위로] [아래로] [삭제]), 기록판 **렌더 5 · effect 2 · memo 2 · patch 줄 11 · 이벤트 교체 6**. 렌더 5 = 처음 1 + [+3] 1 + 이름 입력 1 + 할 일 입력 1 + **[추가] 1**(setter 2개를 모음). [추가] 버튼이 포커스 상태(테두리). mobile은 항목 줄의 [삭제]가 다음 줄로 내려감(레이아웃 깨짐 아님) |
| `screenshot_04_desktop.png` · `screenshot_04_mobile.png` | ④ `/perf-bench/` [측정 시작] 뒤 "완료 (7개 시나리오)". desktop: 결과 표 B-01~B-07 7행 모두 오류 0 · 최종 화면 "일치", **B-06 연속 상태 변경 행 맨 끝 비고 칸에 `setter 10번 → 렌더 1번`**(patch 1줄 SET_TEXT 1), B-07 행 비고 `동작 13번 → 렌더 13번 · 기록판 직접 쓰기 39건 …`. 측정 영역은 끝나서 비어 있음. 시간 숫자(p50 / p95)는 기기마다 달라 판정 안 함. **mobile 캡처는 표가 가로로 길어 비고 칸이 화면 오른쪽 밖으로 잘려 B-06 행의 `setter 10번 → 렌더 1번` 글자는 이 이미지에 보이지 않는다** (표 앞 6열과 B-06 행의 오류 0 · 값만 보임). mobile의 이 글자 판정은 e2e QA-5 PASS(`[data-col="extra"]`에 포함)가 근거 |

MCP로 읽은 desktop 값: B-06 `setter 10번 → 렌더 1번`, B-07 `동작 13번 → 렌더 13번`(둘 다 일치 · 오류 0).

## 실패 보고

실패 없음.

## 그 밖에 본 것

- `screenshot_04_mobile.png`: 결과 표의 비고 열이 화면 밖이라 B-06의 핵심 글자가 캡처에 안 보인다(표 자체 가로 스크롤 또는 잘림으로 보임, 판정 대상 아님). 사람이 mobile에서 비고 열을 확인하려면 가로로 밀어 봐야 한다.
- B-07 비고: patch 167줄 중 SET_EVENT 126줄(task_002 때는 212줄 중 168줄). 판정 대상 아님.
- vitest 출력 끝의 `Environment jsdom was created 36 times` 안내는 실패 아님.
- `TaskStop`이 성공으로 응답한 뒤에도 vite 서버(PID 12420)가 응답을 계속 한다. `npx` 래퍼만 죽고 자식 node가 남은 것으로 보인다 (원인 불확실).

## 사람 확인

- [x] 캡처를 직접 열어 확인함 (확인한 사람: ryuuuu5618, 시각: 2026-11-11T14:50) — 사용자 원문: "캡처 괜찮고 서버 꺼도 돼"
- 서버 남음 5199 PID 12420(vite)은 사용자 승인 후 마스터가 종료, 포트 비어 있음 확인
