# qa_todo_result: phase2

- 시나리오: `qa_todo.md`
- 실행 명령: `npx playwright test --reporter=list` (전체: phase1 8개 스펙 + phase2 7개 스펙, `webServer`가 5199를 띄웠다 끔). 보조: `npx vitest run`
- 실행 시각: 2026-11-11T13:40 (레포 브랜치 feature/phase2, HEAD 7dbcb0f)
- 캡처용 서버: **서버 남음: 5199 · PID 8968 (node.exe) · `npx vite --port 5199 --strictPort`**. 캡처용으로 내가 띄웠는데 셸 `&`로 감싸 띄운 탓에 작업 ID가 바로 종료 처리되어 `TaskStop`으로 끌 수 없었다. 규칙상 포트 · PID로 프로세스를 죽이지 않았으므로 마스터 · 사용자가 정리해야 한다 (`http://localhost:5199/phase2-app/` HTTP 200 응답 중)

## 요약

| 프로젝트 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| desktop (1280x800) | 77 | 0 | 0 |
| mobile (375x812) | 77 | 0 | 0 |

- Playwright 총 **154 passed (19.6s)**. 프로젝트당 77건 = Phase 1 48건 + Phase 2 29건 (QA-1 ~ QA-18 18건 · QA-A1 ~ QA-A9 9건 · QA-20 2건: 표 채움 + 다시 실행해도 7행). 실패 · 건너뜀 0, flaky 0.
- `npx vitest run`: **36 files · 776 tests passed** (기존 432건 + Phase 2 새 테스트 전부 통과).
- QA-19 = Phase 1 e2e 96건(프로젝트당 48건, `phase1-history.spec.ts` 포함) passed + vitest 776 passed. 이번 전체 실행에 포함되어 있다.
- QA-21(확장 2 Batching)은 **미구현 · 범위 밖(시간이 남으면)**. 실행하지 않았다.
- 콘솔 error · dialog는 `phase1-helpers.ts`의 `test` 확장이 모든 스펙에서 감시하며 실패 0건. 캡처 재현(MCP)에서도 콘솔 error · warning · dialog 0건.

## 시나리오 결과

| QA | PRD | desktop | mobile | 캡처 |
| --- | --- | --- | --- | --- |
| QA-1 | P2-01 · P2-02 · P2-05 · P2-15 · P2-22 · T-09 | PASS | PASS | `screenshot_01_desktop.png` · `screenshot_01_mobile.png` |
| QA-2 | P2-11 · P2-12 · P2-14 · P2-15 · P2-22 · T-10 · T-14 · T-15 · D-01 | PASS | PASS | `screenshot_02_*.png` (참고) |
| QA-3 | P2-14 · §4.2 함수형 setter · 연속 setter · T-10 · T-14 | PASS | PASS | `screenshot_02_desktop.png` · `screenshot_02_mobile.png` |
| QA-4 | P2-14 · §4.2 동일 값 · T-04 · T-14 | PASS | PASS | - |
| QA-5 | §4.3 입력 이벤트 · value · P2-22 · T-14 · D-01 | PASS | PASS | `screenshot_03_*.png` (참고) |
| QA-6 | §4.3 포커스 · 커서 · T-10 | PASS | PASS | `screenshot_03_desktop.png` · `screenshot_03_mobile.png` |
| QA-7 | §4.3 입력 노드 재생성 없음 · P2-12 · T-10 · T-06 | PASS | PASS | - |
| QA-8 | P2-10 · P2-22 · T-14 · T-16 · D-03 · D-05 | PASS | PASS | `screenshot_04_desktop.png` · `screenshot_04_mobile.png` |
| QA-9 | P2-10 · T-14 · T-16 · D-02 · §4.3 checked · click | PASS | PASS | `screenshot_04_*.png` (참고: 체크 · 완료 class) |
| QA-10 | P2-22 · T-14 · D-04 · D-05 | PASS | PASS | `screenshot_06_desktop.png` · `screenshot_06_mobile.png` |
| QA-11 | §5 Key · T-06 · T-14 · P2-22 | PASS | PASS | `screenshot_05_desktop.png` · `screenshot_05_mobile.png` |
| QA-12 | P2-17 · T-13 · P2-10 | PASS | PASS | - |
| QA-13 | P2-13 · T-11 · T-10 | PASS | PASS | - |
| QA-14 | P2-16 · P2-18 · T-12 · T-13 · T-15 | PASS | PASS | `screenshot_02_*.png` (참고: [+3] 뒤 기록판) |
| QA-15 | P2-19 · P2-20 · P2-21 · T-06 · T-15 | PASS | PASS | - |
| QA-16 | P2-16 · T-12 | PASS | PASS | - |
| QA-17 | §4.3 이벤트 중복 실행 없음 · §6.2 핸들러 교체 후 중복 호출 방지 | PASS | PASS | - |
| QA-18 | P2-21 · T-06 · T-15 · §5 참조 유지 | PASS | PASS | - |
| QA-19 | T-01 ~ T-08 회귀 · History 동기화 대체 | PASS (phase1 48 + vitest 776) | PASS (phase1 48) | - |
| QA-A1 | §5 VNode 입력 · P1-02 연계 · T-14 | PASS | PASS | - |
| QA-A2 | P2-15 · §4.2 연속 setter · §4.3 중복 없음 · §5 Key | PASS | PASS | - |
| QA-A3 | §4.2 동일 값 · §5 빈 입력 · P2-14 | PASS | PASS | - |
| QA-A4 | P2-05 · P2-12 · T-09 | PASS | PASS | - |
| QA-A5 | §5 목록 · key | PASS | PASS | - |
| QA-A6 | P2-21 · T-06 · T-15 | PASS | PASS | - |
| QA-A7 | §4.2 동일 값 · §5 Key | PASS | PASS | - |
| QA-A8 | §4.3 입력 · 포커스 · 커서 · P2-15 | PASS | PASS | - |
| QA-A9 | §6.2 핸들러 교체 · §5 Key · P2-10 | PASS | PASS | - |
| QA-20 | 확장 1 성능 대시보드 · PRD §7 · §8 | PASS | PASS | `screenshot_07_desktop.png` · `screenshot_07_mobile.png` |
| QA-21 | 확장 2 Batching | 미구현 · 범위 밖(시간이 남으면), 실행 안 함 | 미구현 · 범위 밖, 실행 안 함 | - |

필수 확인 항목 대응: D-01 ~ D-05 = QA-2 · 5 · 9 · 8 · 10 / Key 재정렬 = QA-11 · A2 · A9 / History 동기화 = QA-19(phase1-history 회귀) / 포커스 · 커서 = QA-6 · 7 · A8 / 이벤트 중복 없음 = QA-17 · A2 · A9 / 참조 유지 = QA-2 · 8 · 11 · 18 · A6 / 기록판 횟수 = QA-14 · 15 · 12 · A6 / [그대로] 0번 · [+3] 3번 = QA-4 · 3 / 탭 제목 = QA-16 — 모두 두 프로젝트 PASS. 지원하지 않는 입력(숫자 칸)은 해당 없음 · 기록만(스펙 없음).

## 캡처 목록 (Playwright MCP로 `http://localhost:5199/phase2-app/` · `/perf-bench/`를 직접 재현)

캡처 번호 NN은 QA 번호가 아니라 대표 화면 번호다 (사람이 보기 위한 대표 장면, fullPage 캡처). 스펙 통과가 판정 근거이고 캡처는 화면 확인용이다.

재현 순서(새로 연 페이지, 같은 순서를 desktop · mobile에서 각각): 초기 → [+3] → 이름 `민수` 입력 → 할 일 `사과` · `배` · `귤` 추가 → `사과` 체크 → `귤`의 [위로] → 모두 [삭제].

| 파일 | 보여 주는 것 |
| --- | --- |
| `screenshot_01_desktop.png` · `screenshot_01_mobile.png` | ① 초기 화면: 카운터 0과 [+1] · [+3] · [그대로], 이름 입력창(빈칸) + "이름을 입력해 주세요", 할 일 입력창 · [추가] · "전체 0개 · 완료 0개" · "할 일이 없어요", 기록판 render 1 · effect 1 · memo 1 · patch 0. 탭 제목 `카운터 0 - Phase 2`. 렌더 · Patch 버튼 없음. desktop은 2열 4칸이 한 화면에, mobile은 칸이 위아래로 쌓이고 가로 스크롤 없음(scrollWidth 375 = innerWidth 375) |
| `screenshot_02_desktop.png` · `screenshot_02_mobile.png` | ② [+3] 직후 기록판: 카운터 3, 렌더 횟수 4 · effect 4 · memo 1 · patch 줄 8 · 이벤트 교체 줄 6, 탭 제목 `카운터 3 - Phase 2` (즉시 동기 정책으로 렌더가 3번 늘어남) |
| `screenshot_03_desktop.png` · `screenshot_03_mobile.png` | ③ 이름 입력 중: 입력창에 `민수`, 인사 글 `안녕하세요, 민수님`, 입력창이 포커스를 가짐(포커스 테두리, activeElement = `name-input`). mobile 캡처에서 입력창 강조 테두리가 보임 |
| `screenshot_04_desktop.png` · `screenshot_04_mobile.png` | ④ 할 일 3개(`사과` `배` `귤`) 중 `사과` 체크: 완료 줄(취소선 · 연한 글자), 요약 "전체 3개 · 완료 1개", 기록판 렌더 16 · effect 4 · memo 5 · patch 23 · 이벤트 교체 18 (desktop 기준) |
| `screenshot_05_desktop.png` · `screenshot_05_mobile.png` | ⑤ `귤`의 [위로] 뒤: 순서 `사과` `귤` `배` (MCP 읽기 값으로 확인), `사과`의 체크 상태 유지 |
| `screenshot_06_desktop.png` · `screenshot_06_mobile.png` | ⑥ 세 항목을 모두 [삭제]한 뒤: `<ul>`이 사라지고 안내 "할 일이 없어요", 요약 "전체 0개 · 완료 0개" (D-05 교체 반대 방향) |
| `screenshot_07_desktop.png` · `screenshot_07_mobile.png` | ⑦ `/perf-bench/`에서 [측정 시작] 뒤 결과 표: B-01 ~ B-07 7행, 반복 "준비 5 · 측정 30", 오류 0, p50 / p95(숫자는 기기마다 달라 판정 안 함), 최종 화면 = 상태 모두 "일치", 노드 유지 507/507 (B-07은 7/7). 측정 조건 칸(브라우저 · 화면 크기 1280×800 또는 375×812 · dev 서버 · 시계 해상도 · 항목 100 · 노드 507 · 깊이 5)이 채워져 있고 측정 영역은 끝나서 비어 있음. 콘솔 error · warning 0건 |

## 실패 보고

실패 없음.

## 그 밖에 본 것

- 캡처 ⑤ · ⑥ · ⑦은 스크린샷을 눈으로 열어 보지 않고(01 · 03 · 04 · 07만 열어 확인) MCP로 읽은 값 · 텍스트로 확인했다. 사람이 열어 확인할 때 ⑤ · ⑥을 중점 확인해 달라.
- `screenshot_03_mobile.png`에는 이름 입력 단계라 할 일이 아직 없어 "할 일이 없어요"가 보이는 것이 정상이다 (③은 할 일 추가 전 장면).
- B-07 비고: "동작 13번 → 렌더 16번" · patch 212줄 중 SET_EVENT 168줄 — 판정 대상 아님(수치 단언 없음)이나, 핸들러 교체 줄이 patch 줄 대부분을 차지함을 참고로 기록.
- 이번 실행에서 vitest 출력 끝에 jsdom 생성 시간 경고성 안내(`Environment jsdom was created 36 times`)가 있으나 실패 아님.
- 캡처용 5199 서버가 남아 있음(위 「캡처용 서버」). 최초 상태(전체 e2e 시작 전)에서는 5199가 비어 있었고 e2e `webServer`는 정상 종료됐다.

## 사람 확인

- [x] 캡처를 직접 열어 확인함 (확인한 사람: ryuuuu5618, 시각: 2026-11-11T13:44) — 사용자 원문: "캡처 확인했고 잘 작동해"
- 서버 남음 5199 PID 8968(vite)은 사용자 승인("서버 닫아도 될 것 같아") 후 마스터가 종료, 포트 비어 있음 확인
