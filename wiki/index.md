# 미니 리액트 위키

> 레포의 큰 그림만 둔다. task별 자세한 기록은 `.agent_workflow/tasks/`에 있다. 4단계(위키 · 발표 README)는 task_001 · task_002를 함께 정리했다 (가벼운 모드, 발표 전 일괄).

| 문서 | 내용 |
| --- | --- |
| [architecture.md](architecture.md) | 패키지 구조 · 의존 방향 · 동작 흐름 · 알고리즘 결정 요약 · 실제 React와 차이 |
| [qna_prep.md](qna_prep.md) | 발표 QnA 대비 (README에는 넣지 않음) |
| [README.md 발표 섹션](../README.md) | 4분 발표용 요약 (`mini-react-kit:readme` 표시 구간) |

## task 목록

| 번호 | 작업자 | 작업명 | 대상 패키지 | QA 결과 | 폴더 |
| --- | --- | --- | --- | --- | --- |
| 001 | ryuuuu5618 | phase1 | `shared` · `react-dom-bindings` · `react-reconciler` · `react-dom` · `fixtures/phase1-vdom-playground` | desktop 48 · mobile 48 PASS (시나리오 45개: QA-1~33 · QA-A1~A12) · 사람 확인 ✓ | `.agent_workflow/tasks/task_001_ryuuuu5618_phase1/` |
| 002 | ryuuuu5618 | phase2 | `react` · `react-reconciler` · `react-dom-bindings` · `react-dom` · `scheduler` · `shared` · `fixtures/phase2-app` · `fixtures/perf-bench` (확장 1) | desktop 77 · mobile 77 PASS (QA-1~20 · QA-A1~A9) · QA-21 Batching 미구현 · 사람 확인 ✓ | `.agent_workflow/tasks/task_002_ryuuuu5618_phase2/` |

(출처: task_001 · task_002 `04_qa_evidence/qa_todo_result.md`, `05_execution_timeline.log`)

## task 요약

| 항목 | task_001 phase1 | task_002 phase2 |
| --- | --- | --- |
| 범위 | Phase 1 필수 P1-01~34 · 공통 T-01~08 + 확장 Key 비교 · Diff 시각화 | Phase 2 필수 P2-01~24 · 공통 T-09~16 + 확장 1 성능 대시보드. 확장 2 Batching 구현 안 함 |
| Dev 완료 | 26개 (필수 20 + 확장 6) | 25개 (필수 21 + 확장 4 = 대시보드). Dev-27 · 28(Batching) 미구현 |
| 개발 검수 | REJECT 2회 → 재작업 → 마스터 확인 (3회차 Opus 없음, 사용자 선택) | 1회차 APPROVE → 경량 검수 1회차 REJECT → 재작업 → 2회차 APPROVE |
| 최종 검증 | vitest 16 files · 432 passed · tsc 0 · playwright 96 passed | vitest 36 files · 776 passed · tsc 0 · playwright 154 passed |
| main 병합 | 74c82c5 (`--no-ff`, 로컬, push 없음) | 55c18c9 (`--no-ff`, 로컬, push 없음) |
| 사람 확인 | 캡처 확인 ✓ (2026-11-11T04:27) | 캡처 확인 ✓ (2026-11-11T13:44) |

(출처: task_001 · task_002 `03_development/code_review_log.md`, `07_pr_body.md`, `05_execution_timeline.log`, `04_qa_evidence/qa_todo_result.md`)

## 남은 확인

<!-- [확인 필요] 항목을 모은다. 해결되면 지운다 -->

- [ ] [확인 필요: 마스터가 측정값 전달] — `/usage` 비용 (README 「AI 워크플로 운영 결과」)
- [ ] [확인 필요: Reflow / Repaint 설명 없음 — 기록에 없어 발표에 넣을지 마스터 확인] (README 「핵심 기술 포인트」)
- [ ] [확인 필요: 보관 한도 50의 수치 이유 — 기록에 사용자 답 없음 (명세 「정책」에 "수치 이유 미기재")] (`qna_prep.md`)

## 남은 일 (기록 기준)

- SVG 미지원 — 사용자 결정으로 구현 안 함 (CLAUDE.md 「내 설계 결정」 · task_002 `00_master_dialogue.md` 마무리)
- Batching(확장 2) 미구현 — 사용자 결정 "배칭은 구현하지 말자" (task_002 `01_request_spec.md` 확장 2 · `00_master_dialogue.md` 마무리)
- 피그마 같은 시연 앱 — 미니 리액트 구현이 끝난 뒤 따로 만든다 (task_002 `01_request_spec.md` 「구현 제외 범위」)
