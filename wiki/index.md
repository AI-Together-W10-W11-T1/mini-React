# 미니 리액트 위키

> 레포의 큰 그림만 둔다. task별 자세한 기록은 `.agent_workflow/tasks/`에 있다. 4단계(위키 · 발표 README)는 task_001 · task_002를 함께 정리했다 (가벼운 모드, 발표 전 일괄). task_003 · task_004는 task_004 위키 정리 때 같이 넣었다 (task_004에서 변경). task_005 · 006 · 007은 task_007 위키 정리 때 같이 넣었다 (task_007에서 추가, 가벼운 모드).

| 문서 | 내용 |
| --- | --- |
| [architecture.md](architecture.md) | 패키지 구조 · 의존 방향 · 동작 흐름 · 알고리즘 결정 요약 · 실제 React와 차이 · 알려진 한계 |
| [qna_prep.md](qna_prep.md) | 발표 QnA 대비 (README에는 넣지 않음) |
| [README.md 발표 섹션](../README.md) | 4분 발표용 요약 (`mini-react-kit:readme` 표시 구간) |

## task 목록

| 번호 | 작업자 | 작업명 | 대상 패키지 | QA 결과 | 폴더 |
| --- | --- | --- | --- | --- | --- |
| 001 | ryuuuu5618 | phase1 | `shared` · `react-dom-bindings` · `react-reconciler` · `react-dom` · `fixtures/phase1-vdom-playground` | desktop 48 · mobile 48 PASS (시나리오 45개: QA-1~33 · QA-A1~A12) · 사람 확인 ✓ | `.agent_workflow/tasks/task_001_ryuuuu5618_phase1/` |
| 002 | ryuuuu5618 | phase2 | `react` · `react-reconciler` · `react-dom-bindings` · `react-dom` · `scheduler` · `shared` · `fixtures/phase2-app` · `fixtures/perf-bench` (확장 1) | desktop 77 · mobile 77 PASS (QA-1~20 · QA-A1~A9) · QA-21 Batching 미구현(task_002 당시, task_003에서 구현) · 사람 확인 ✓ | `.agent_workflow/tasks/task_002_ryuuuu5618_phase2/` |
| 003 | ryuuuu5618 | batching | `scheduler` · `react-reconciler` · `fixtures/perf-bench` (B-06 · B-07) | desktop 86 · mobile 86 PASS (Phase 1 회귀 48 + Phase 2 38 포함, 합계 172) · vitest 801 · tsc 0 · 사람 확인 ✓ (2026-11-11T14:50) | `.agent_workflow/tasks/task_003_ryuuuu5618_batching/` |
| 004 | ryuuuu5618 | mini-figma | `fixtures/mini-figma/` (엔진은 `@mini-react/*`로 가져다 씀, `packages/` 무수정) | mini-figma 50 × 2 PASS (QA-1~30 · A1~A19, QA-A16은 2건) · 전체 272 PASS (vitest 1064 · tsc 0) · 사람 확인 ✓ (2026-11-11T19:52) | `.agent_workflow/tasks/task_004_ryuuuu5618_mini-figma/` |
| 005 | ryuuuu5618 | figma-design | `fixtures/mini-figma/` (어두운 디자인 · `Toolbar` · `ColorPalette` 추가, `packages/` 무수정) | desktop 162 · mobile 162 PASS (playwright 324 · QA 시점) · 사람 확인 ✓ (2026-11-12, v2 재캡처 「캡처 OK」) · main 병합 c3494b8 | `.agent_workflow/tasks/task_005_ryuuuu5618_figma-design/` |
| 006 | ryuuuu5618 | patch-preview | `fixtures/mini-figma/` (실제 영역 · `previewVNode` · `previewNav` · `previewDocs` · `preview` · `PreviewPanel` 추가, 앱 편집 Undo 제거, `packages/` 무수정) | desktop 165 · mobile 165 PASS (playwright 330, 2회차) · 사람 확인 ✓ (2026-11-12T01:16, 「캡처 OK」) · main 병합 8d412da | `.agent_workflow/tasks/task_006_ryuuuu5618_patch-preview/` |
| 007 | ryuuuu5618 | variables | `fixtures/mini-figma/` (`doc.variables` · `resolveColor` · `VariablePanel` · 변수 선택 상자 추가, `packages/` 무수정) | desktop 188 · mobile 188 PASS (playwright 376 · vitest 47 files 1250 · tsc 0) · 사람 확인 ✓ (2026-11-12T02:08, 「캡처 OK」) · main 병합 77b2a6f | `.agent_workflow/tasks/task_007_ryuuuu5618_variables/` |

(출처: task_001 · task_002 · task_003 · task_004 `04_qa_evidence/qa_todo_result.md`, `05_execution_timeline.log` · task_005 · 006 · 007 `04_qa_evidence/qa_todo_result.md` · `07_pr_body.md` · `00_master_dialogue.md` · 병합 해시는 마스터 전달값)

## task 요약

| 항목 | task_001 phase1 | task_002 phase2 |
| --- | --- | --- |
| 범위 | Phase 1 필수 P1-01~34 · 공통 T-01~08 + 확장 Key 비교 · Diff 시각화 | Phase 2 필수 P2-01~24 · 공통 T-09~16 + 확장 1 성능 대시보드. 확장 2 Batching은 task_002 당시 구현 안 함 (task_003에서 구현) |
| Dev 완료 | 26개 (필수 20 + 확장 6) | 25개 (필수 21 + 확장 4 = 대시보드). Dev-27 · 28(Batching)은 당시 미구현 → task_003 Dev-1~4로 구현 |
| 개발 검수 | REJECT 2회 → 재작업 → 마스터 확인 (3회차 Opus 없음, 사용자 선택) | 1회차 APPROVE → 경량 검수 1회차 REJECT → 재작업 → 2회차 APPROVE |
| 최종 검증 | vitest 16 files · 432 passed · tsc 0 · playwright 96 passed | vitest 36 files · 776 passed · tsc 0 · playwright 154 passed |
| main 병합 | 74c82c5 (`--no-ff`, 로컬, push 없음) | 55c18c9 (`--no-ff`, 로컬, push 없음) |
| 사람 확인 | 캡처 확인 ✓ (2026-11-11T04:27) | 캡처 확인 ✓ (2026-11-11T13:44) |

(출처: task_001 · task_002 `03_development/code_review_log.md`, `07_pr_body.md`, `05_execution_timeline.log`, `04_qa_evidence/qa_todo_result.md`)

## task 요약 (task_005 · 006 · 007, mini-figma 시연 앱)

| 항목 | task_005 figma-design | task_006 patch-preview | task_007 variables |
| --- | --- | --- | --- |
| 범위 | 어두운 디자인 시스템 · 도구 막대(`Toolbar`) · 팔레트 판(칩 8 + 직접 고르기) · 전체 높이 배치 | 테스트 영역 아래 실제 영역 · [Patch] · State History(실제 영역 + 테스트 영역 `doc` 함께 되돌림) · 앱 편집 Undo 제거 | 색 변수 3개 · 버튼 색을 변수에 연결(`'var:<id>'`) · 변수 패널 · 연결 선택 상자 |
| Dev 완료 | 9개 (Dev-1 ~ 9, Dev-9 = FD-08 전체 높이) | 8개 (Dev-1 ~ 8, Dev-8 = PP-06 변경 · 두 영역 함께 되돌림) | 5개 (Dev-1 ~ 5) |
| 개발 검수 | 1회 APPROVE (Dev-1 ~ 8) → 경량 Dev-9 APPROVE · BLOCKING 0 | 3회 (Dev-1 ~ 7 REJECT: `qa_todo.md` 문서 불일치 → 재작업 APPROVE · Dev-8 APPROVE) | 1회 APPROVE · BLOCKING 0 (NB 4 반영) |
| 최종 검증 (QA 시점) | vitest 43 files · 1159 · playwright 324 · tsc 0 | vitest 46 files · 1195 · playwright 330 · tsc 0 | vitest 47 files · 1250 · playwright 376 · tsc 0 |
| 테스트 케이스 확인 | 2026-11-11T20:52 「응」 · 개발 검수 뒤 2026-11-11T21:31 「둘 다 해」 | 2026-11-11T23:00 「응」 (빠르게 범위) · 2026-11-12T00:08 A33 · 34 · 35 · 37 추가 · 2026-11-12T00:32 PP-06 변경 「응」 | 사용자 위임 (명세 상태 줄 기준) · 2026-11-12T01:24 「진행시켜」 (미리 확인) |
| 체크포인트 | 생략 (사용자 「a로 가자」, 2026-11-12T02:11) | 생략 (같은 날 같은 문답) | 생략 (같은 날 같은 문답) |
| 사람 확인 | 2026-11-12 v2 재캡처 12장 「캡처 OK」 · 색 팝업 「팝업 됨」 · 스크롤바 「그대로」 | 2026-11-12T01:16 「캡처 OK」 | 2026-11-12T02:08 「캡처 OK」 |
| main 병합 | c3494b8 (커밋 21개) | 8d412da (커밋 29개) | 77b2a6f |

(출처: task_005 · 006 · 007 `01_request_spec.md` 상태 · `03_development/dev_todo.md` · `03_development/code_review_log.md` · `04_qa_evidence/qa_todo_result.md` · `07_pr_body.md` · `00_master_dialogue.md`)

## 시연 앱 mini-figma (task_004 · 005 · 006 · 007)

- 무엇: Figma Components(메인 · 인스턴스 · component property)와 Variables(색 변수)를 미니 React로 만든 시연 앱. 메인 = 함수형 컴포넌트 `Button`, 인스턴스 = `h(Button, props)` 호출, property = props, 변수 = `doc.variables`를 버튼 색 칸이 이름으로 가리킴. (출처: task_004 `01_request_spec.md` 1절 · task_007 `01_request_spec.md` 1절)
- 목적: 메인을 고치면 override 없는 인스턴스만 바뀌고, 인스턴스를 고치면 그것만 바뀌는 장면 (task_004). task_005 · 006 · 007은 디자인 · 실제 영역 · 되돌리기 · 변수 장면을 더했다. 엔진은 고치지 않고 앱만 만든다. (출처: task_004 `01_request_spec.md` 1절 · task_005 `01_request_spec.md` 1절 · task_006 `01_request_spec.md` 1절 · task_007 `01_request_spec.md` 1절)
- 자리: `fixtures/mini-figma/` (Vite `/mini-figma/`). 화면: 도구 막대(맨 위, desktop 가로 전체) · 레이어(맨 아래에 변수 구역) · 테스트 영역(캔버스) · 속성 패널 + 실제 영역(가운데 열 아래). desktop 3열 · mobile 위아래 쌓기. `packages/` 무수정. (출처: task_005 `01_request_spec.md` FD-06 · FD-08 · task_006 `01_request_spec.md` PP-01 · task_007 `03_development/dev_todo.md` 시작 전 확인 · 공통 주의 5) (task_006 · 007에서 변경: 실제 영역 · 변수 구역 추가)
- 범위 밖: 끌기 · 크기 조절 · 확대·축소, 여러 개 고르기, 메인 삭제, 저장, 자유 위치 배치, 도형 · 펜 · SVG (task_004). 밝은 테마 · 외부 글꼴 내려받기 · 색 칩 추가 · 삭제 (task_005). 변수 추가 · 삭제 · 이름 바꾸기, 색 말고 다른 종류 변수, 모드(Light / Dark), 변수끼리 연결 (task_007). 화면에 patch 목록 · 줄 수 표시 없음 (보여 주는 것은 깜빡임뿐, task_006). (출처: task_004 `01_request_spec.md` 3절 · task_005 `01_request_spec.md` 3절 · task_006 `01_request_spec.md` 3절 · task_007 `01_request_spec.md` 3절)
- 검증:
  - task_004: 인수 QA-1~30 · 공격 A1~A19 (desktop · mobile 각 50건 PASS). (출처: task_004 `04_qa_evidence/qa_todo_result.md`)
  - task_005: 인수 QA-31 ~ 45 · 공격 A20 ~ A29 (desktop · mobile PASS, 실패 0). 레포 전체 playwright 324 (desktop 162 · mobile 162). (출처: task_005 `04_qa_evidence/qa_todo_result.md`)
  - task_006: 인수 QA-46 ~ 62 · 공격 A30 ~ A40 PASS, A41 · A42는 단위 테스트. 레포 전체 playwright 330 (desktop 165 · mobile 165). (출처: task_006 `04_qa_evidence/qa_todo_result.md`)
  - task_007: 변수 스펙 `mini-figma-variables.spec.ts` QA-63 ~ 76 · 공격 A43 ~ A55 · A58 e2e, A56 · A57은 단위. 레포 전체 playwright 376 (desktop 188 · mobile 188) · vitest 47 files 1250 · tsc 0. (출처: task_007 `04_qa_evidence/qa_todo_result.md` · `03_development/dev_todo.md` Dev-5 근거)
- 자세히: 데이터 모양 · Figma ↔ 미니 React 대응 · 키보드 · 되돌리기(State History) · 변수 → [architecture.md](architecture.md) 「시연 앱 mini-figma」 · 예상 질문 → [qna_prep.md](qna_prep.md) 「시연 앱 mini-figma」

### 시연 앱 변경 이력 (task_005 · 006 · 007)

- task_005 (figma-design): 어두운 바탕 · 한 단계 밝은 카드 · 점무늬 캔버스 · 강조색 파랑 하나 · 알약 버튼 (디자인 시스템 문서 기준, 브랜드 이름 · 로고 · 외부 글꼴 없음). 도구 막대 `Toolbar` 신설. 팔레트 판(칩 8 + 직접 고르기), 색 값 `#rrggbb` 저장 · `style`로 칠함 (SET_STYLE). 전체 높이 배치(FD-08). (출처: task_005 `01_request_spec.md` 2절 · `07_pr_body.md`)
- task_006 (patch-preview): 캔버스 = 테스트 영역, 그 아래 실제 영역. [Patch] → 테스트 영역 DOM 읽기 → 정리 → diff · patch → State History(한도 50), 바뀐 노드 깜빡임. [실행 취소] · [다시 실행] + Ctrl/Cmd+Z · Shift+Z = State History 뒤로 · 앞으로, 두 영역 함께. 앱 편집 Undo · `undo.ts` · `undo-button` · `redo-button` 제거 (PP-12 · PP-07). [인스턴스 생성] · [삭제]는 속성 패널 (사용자 커밋 81e1e2d). 레이어 접기 (사용자 커밋 a62dda5, App Hook 8칸). (출처: task_006 `01_request_spec.md` PP-01 ~ 12 · `00_master_dialogue.md` 2026-11-11T23:25 · 23:27 · 23:43 · 2026-11-12T00:32 · `07_pr_body.md`)
- task_007 (variables): 색 변수 3개(Primary · Danger · Success), 버튼 `color` 칸에 `'var:<id>'` 연결, 그릴 때 `resolveColor`로 hex로 풀어 칠함. 변수 패널은 레이어 맨 아래, 속성 패널 「변수」 선택 상자. 변수는 `doc` 안이라 Patch · 되돌리기에 같이 들어감. (출처: task_007 `01_request_spec.md` VR-01 ~ 08 · `03_development/dev_todo.md` · `07_pr_body.md`)

## 남은 일 (기록 기준)

- SVG 미지원 — 사용자 결정으로 구현 안 함 (CLAUDE.md 「내 설계 결정」 · task_002 `00_master_dialogue.md` 마무리)
- Batching(확장 2) — task_002 마무리 때는 "배칭은 구현하지 말자"였고(task_002 `01_request_spec.md` 확장 2 · `00_master_dialogue.md` 마무리), 그 뒤 task_003에서 구현하기로 바꿨다 (결정 9 B: "리액트를 공부할려면 배칭 구현하는게 맞는 거 같아서", task_003 `01_request_spec.md`)
- 피그마 같은 시연 앱 — task_004 mini-figma → task_005 · 006 · 007(디자인 · 실제 영역 · 되돌리기 · 변수)까지 구현. 끝난 뒤 다음 후보는 마스터 제안 (Dev Mode 코드 보기 · 레이어 숨기기 · 복제 · Auto Layout), 어느 것을 할지는 기록에 없음. (task_004 `01_request_spec.md` 3절 · task_006 · task_007 `00_master_dialogue.md` 0단계) (task_007에서 변경)
- 발표 전 보충 후보 (체크포인트 생략분): ① task_006 PP-06 ④ 「Patch 안 한 편집은 버림」 왜 골랐나 ② task_007 「연결 저장 방식」 왜 골랐나. 두 질문의 답은 `qna_prep.md`에 기록 기준으로만 적었다. (출처: task_006 `07_pr_body.md` · task_007 `00_master_dialogue.md`)

## 남은 확인

<!-- [확인 필요] 항목을 모은다. 해결되면 지운다 -->

- [x] task_005 ~ 007 토큰량: 넣지 않기로 함 (사용자 결정 2026-11-12, "토큰 사용량은 안 넣기로 했어")
- [x] Ctrl+Y 한계: (task_006부터 앱 편집 Undo 기록이 없어 「기록에 섞이는」 문제는 해당 없음. Ctrl+Y는 `keys.ts`에 없어 앱 키가 아니고, State History 다시 실행은 Ctrl/Cmd+Shift+Z만 — 마스터 코드 확인 2026-11-12)
- [x] task_007 테스트 케이스 확인: 2026-11-12T01:24 사용자 「진행시켜」 (기획 진행 중 미리 확인, task_007 `05_execution_timeline.log`)
- [x] 구현에 쓴 토큰량: README에서 뺌 (사용자 결정 2026-11-12, "토큰 사용량은 안 넣기로 했어")
- [x] Reflow / Repaint 설명: README 「핵심 기술 포인트」 (사용자 승인)
- [x] task_004 CP1 · CP2 한 줄 요약: 따로 받지 않음 (사용자 "질문 일단 넘어가고 구현하자", 19:47) → 사용자 자기 말 답으로 갈음: CP1 "이벤트 리스너를 때는 작업 아니야? 11개가 붙이 있지 않을까? 엉뚱한 걸 지울 것 같아" · CP2 "처음 렌더될 때만 실행되고 안 되겠네" (마스터 정리, 사용자가 "너가 알아서 채워줘")
- [x] task_004 CP3 Instance swap patch: 문답은 건너뜀 (사용자 요청, 19:47). 사실 정답은 테스트 기록으로 채움 — 엔진이 diff 전에 컴포넌트를 풀어 ★ → ♥는 같은 `<span>` 태그의 글자 변경 = 캔버스 `SET_TEXT` 4줄 (`qa_todo.md` P-8, `app.test.ts` 통과). 사용자 답은 없음 → 발표 전 다시 할 후보 (마스터 정리)
- [x] task_005 · 006 · 007 이해 체크포인트: 「생략」 (사용자 「a로 가자」, 2026-11-12T02:11). 답을 지어내지 않음. 발표 질문 대비는 `qna_prep.md`의 task_005 · 006 · 007 절 (기록 기준 답)
