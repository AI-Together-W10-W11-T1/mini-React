# 미니 리액트 위키

> 레포의 큰 그림만 둔다. task별 자세한 기록은 `.agent_workflow/tasks/`에 있다. 4단계(위키 · 발표 README)는 task_001 · task_002를 함께 정리했다 (가벼운 모드, 발표 전 일괄). task_003 · task_004는 task_004 위키 정리 때 같이 넣었다 (task_004에서 변경).

| 문서 | 내용 |
| --- | --- |
| [architecture.md](architecture.md) | 패키지 구조 · 의존 방향 · 동작 흐름 · 알고리즘 결정 요약 · 실제 React와 차이 |
| [qna_prep.md](qna_prep.md) | 발표 QnA 대비 (README에는 넣지 않음) |
| [README.md 발표 섹션](../README.md) | 4분 발표용 요약 (`mini-react-kit:readme` 표시 구간) |

## task 목록

| 번호 | 작업자 | 작업명 | 대상 패키지 | QA 결과 | 폴더 |
| --- | --- | --- | --- | --- | --- |
| 001 | ryuuuu5618 | phase1 | `shared` · `react-dom-bindings` · `react-reconciler` · `react-dom` · `fixtures/phase1-vdom-playground` | desktop 48 · mobile 48 PASS (시나리오 45개: QA-1~33 · QA-A1~A12) · 사람 확인 ✓ | `.agent_workflow/tasks/task_001_ryuuuu5618_phase1/` |
| 002 | ryuuuu5618 | phase2 | `react` · `react-reconciler` · `react-dom-bindings` · `react-dom` · `scheduler` · `shared` · `fixtures/phase2-app` · `fixtures/perf-bench` (확장 1) | desktop 77 · mobile 77 PASS (QA-1~20 · QA-A1~A9) · QA-21 Batching 미구현(task_002 당시, task_003에서 구현) · 사람 확인 ✓ | `.agent_workflow/tasks/task_002_ryuuuu5618_phase2/` |
| 003 | ryuuuu5618 | batching | `scheduler` · `react-reconciler` · `fixtures/perf-bench` (B-06 · B-07) | desktop 86 · mobile 86 PASS (Phase 1 회귀 48 + Phase 2 38 포함, 합계 172) · vitest 801 · tsc 0 · 사람 확인 ✓ (2026-11-11T14:50) | `.agent_workflow/tasks/task_003_ryuuuu5618_batching/` |
| 004 | ryuuuu5618 | mini-figma | `fixtures/mini-figma/` (엔진은 `@mini-react/*`로 가져다 씀, `packages/` 무수정) | mini-figma 50 × 2 PASS (QA-1~30 · A1~A19, QA-A16은 2건) · 전체 272 PASS (vitest 1064 · tsc 0) · 사람 확인 ✓ (2026-11-11T19:52) | `.agent_workflow/tasks/task_004_ryuuuu5618_mini-figma/` |

(출처: task_001 · task_002 · task_003 · task_004 `04_qa_evidence/qa_todo_result.md`, `05_execution_timeline.log`)

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

## 시연 앱 mini-figma (task_004)

- 무엇: Figma Components(메인 컴포넌트 · 인스턴스 · component property)를 미니 React로 만든 시연 앱. 메인 = 함수형 컴포넌트, 인스턴스 = `h(Button, props)` 호출, property = props. (출처: task_004 `01_request_spec.md` 1절 · `00_master_dialogue.md` 0단계)
- 목적: 메인을 고치면 override 없는 인스턴스만 바뀌고, 인스턴스 하나를 고치면 그것만 바뀌는 장면을 보여 준다. 엔진은 고치지 않고 앱만 만든다. (출처: task_004 `01_request_spec.md` 1절)
- 자리: `fixtures/mini-figma/` (Vite `/mini-figma/`). 레이어 창 · 캔버스 · 속성 패널 세 영역 (desktop 가로, mobile 세로). `packages/` 무수정 (MF-02). (출처: task_004 `01_request_spec.md` MF-01 · MF-02 · MF-03)
- 범위 밖: 끌기 · 크기 조절 · 확대·축소, 여러 개 고르기, 메인 삭제, 저장, 자유 위치 배치, 도형 · 펜 · SVG. (출처: task_004 `01_request_spec.md` 3절)
- 검증: 인수 QA-1~30 · 공격 A1~A19 (desktop · mobile 각 50건 PASS, QA 실패 0). 단위 263 (`fixtures/mini-figma/__tests__`, 5 파일, Q18 수정 뒤 기준). 회귀 포함 전체 vitest 1064 · playwright 272 · tsc 0. (출처: task_004 `04_qa_evidence/qa_todo_result.md` · `03_development/dev_todo.md` Dev-11)
- 자세히: 데이터 모양 · Figma ↔ 미니 React 대응 · 키보드 · Undo → [architecture.md](architecture.md) 「시연 앱 mini-figma」 · 예상 질문 → [qna_prep.md](qna_prep.md) 「시연 앱 mini-figma」

## 남은 확인

<!-- [확인 필요] 항목을 모은다. 해결되면 지운다 -->

- [x] 구현에 쓴 토큰량: README 「AI 워크플로 운영 결과」 표 (사용자 요청 "해당 영역을 구현하는데 사용한 토큰량을 적자")
- [x] Reflow / Repaint 설명: README 「핵심 기술 포인트」 (사용자 승인)
- [x] task_004 CP1 · CP2 한 줄 요약: 따로 받지 않음 (사용자 "질문 일단 넘어가고 구현하자", 19:47) → 사용자 자기 말 답으로 갈음: CP1 "이벤트 리스너를 때는 작업 아니야? 11개가 붙이 있지 않을까? 엉뚱한 걸 지울 것 같아" · CP2 "처음 렌더될 때만 실행되고 안 되겠네" (마스터 정리, 사용자가 "너가 알아서 채워줘")
- [x] task_004 CP3 Instance swap patch: 문답은 건너뜀 (사용자 요청, 19:47). 사실 정답은 테스트 기록으로 채움 — 엔진이 diff 전에 컴포넌트를 풀어 ★ → ♥는 같은 `<span>` 태그의 글자 변경 = 캔버스 `SET_TEXT` 4줄 (`qa_todo.md` P-8, `app.test.ts` 통과). 사용자 답은 없음 → 발표 전 다시 할 후보 (마스터 정리)

## 남은 일 (기록 기준)

- SVG 미지원 — 사용자 결정으로 구현 안 함 (CLAUDE.md 「내 설계 결정」 · task_002 `00_master_dialogue.md` 마무리)
- Batching(확장 2) — task_002 마무리 때는 "배칭은 구현하지 말자"였고(task_002 `01_request_spec.md` 확장 2 · `00_master_dialogue.md` 마무리), 그 뒤 task_003에서 구현하기로 바꿨다 (결정 9 B: "리액트를 공부할려면 배칭 구현하는게 맞는 거 같아서", task_003 `01_request_spec.md`)
- 피그마 같은 시연 앱 — task_004에서 mini-figma로 만듦 (`fixtures/mini-figma/`, 엔진 무수정). 끌기 · 크기 조절 · 도형 · SVG는 범위 밖 (task_004 `01_request_spec.md` 3절) (task_004에서 변경)
