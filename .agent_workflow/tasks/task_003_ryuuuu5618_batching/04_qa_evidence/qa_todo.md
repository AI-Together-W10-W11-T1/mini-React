# qa_todo: batching

- 명세: `../01_request_spec.md`
- 실행: `npx playwright test <파일>` (desktop 1280x800 · mobile 375x812 두 프로젝트)
- 시나리오 하나 = `e2e/*.spec.ts` 테스트 하나. 테스트 이름은 시나리오 문장 그대로
- `QA-N`은 이번 task 내부 번호이고 근거 ID는 PRD ID · T-ID와 PRD 절만 쓴다. 화면 약속(`data-testid` · 기록판 칸)은 task_002 `qa_todo.md` 위쪽 설명 그대로. 로드 직후 render 1 · effect 1 · memo 1 · 제목 `카운터 0 - Phase 2`
- 새 시나리오는 `e2e/phase2-batching.spec.ts`(새 파일). 기존 task_002 시나리오 중 횟수가 바뀌는 4곳은 아래 「기대값만 바뀌는 기존 시나리오」

## 인수 시나리오

| QA | PRD | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| QA-1 | §4.2 Batching · P2-15 · P2-16 · T-14 | 처음 연 상태(render 1 · effect 1, 제목 `카운터 0`) | [+3]을 한 번 누른다 | 카운터 `3`, **렌더 횟수 +1(2)**, `[count]` effect +1(2), 제목 `카운터 3 - Phase 2`. 이어서 [+1] → `4` | `e2e/phase2-batching.spec.ts` |
| QA-2 | §4.2 Batching · P2-15 | 처음 연 상태 | 페이지 안에서 [+3] 버튼의 `click()`을 부르고 **같은 JS 실행 안에서** 카운터 글을 읽는다. 한 틱(마이크로태스크) 뒤 다시 읽는다 | 바로 읽으면 `0` · 렌더 횟수 그대로(렌더는 핸들러가 끝난 뒤), 한 틱 뒤 `3` · 렌더 +1 | `e2e/phase2-batching.spec.ts` |
| QA-3 | §4.2 Batching · P2-15 · T-14 · T-13 | 항목 0개, 할 일 입력창에 `사과` 입력해 둠 | [추가]를 누른다 | 목록에 `사과` 1개, 입력창이 비워짐(같은 참조 · 포커스 유지), 요약 `전체 1개 · 완료 0개`, **[추가] 한 번 = 렌더 +1**(setter 2번을 모음), memo +1 | `e2e/phase2-batching.spec.ts` |
| QA-4 | P2-16 · T-12 | 처음 연 상태 | [+3]을 누른다. 페이지가 `document.title`을 쓰는 순간 화면의 카운터 글을 기록하게 해 둠 | 제목을 쓴 횟수 1번, 그때 화면의 카운터 글은 이미 `3`(effect는 모은 렌더의 patch 직후) | `e2e/phase2-batching.spec.ts` |
| QA-5 | §8.1 B-06 · B-07 · §4.2 렌더 횟수 기록 | `/perf-bench/`를 연다 | B-06 · B-07을 실행한다 | B-06 행에 `setter 10번 → 렌더 1번`, B-07 행에 `동작 13번 → 렌더 13번`(실제로 돈 횟수), 두 행 모두 정확성 `일치` · 오류 0. **시간 숫자는 단언하지 않는다** | `e2e/phase2-perfbench.spec.ts` |

## 공격적 시나리오

| QA | 시나리오 | Then | 스펙 파일 |
| --- | --- | --- | --- |
| QA-A1 | 한 JS 실행 안에서 [+3] `click()`을 20번 연달아 부른다 (페이지 안 반복문) | 카운터 `60`, 렌더 횟수 +1, 콘솔 오류 없음, 제목 `카운터 60 - Phase 2` (여러 번 눌러도 렌더는 한 번, 모은 결과는 함수형 setter 그대로 합쳐짐) | `e2e/phase2-batching.spec.ts` |
| QA-A2 | 한 JS 실행 안에서 이름 입력창 `value`를 `가` → `가나` → `가나다`로 바꾸며 `input` 이벤트를 3번 보낸다 | 입력창 · 인사 글이 `가나다`(마지막 값), 렌더 +1, 입력창은 같은 참조 · 오류 없음 | `e2e/phase2-batching.spec.ts` |
| QA-A3 | 항목 `가` `나` `다`가 있을 때 한 JS 실행 안에서 `다`의 [위로] 2번 → `가` 체크 → `나` [삭제]를 순서대로 `click()` | 최종 목록 `다` `가`(가는 완료), 요약 `전체 2개 · 완료 1개`, 렌더 +1, 남은 `<li>` 두 개는 같은 참조 (옛 값에 덮이지 않고 순서대로 쌓임) | `e2e/phase2-batching.spec.ts` |
| QA-A4 | 한 JS 실행 안에서 [+1] 다음 [그대로]를 `click()` (결과가 처음 값 0으로 돌아옴) | 카운터 `0`, **본문(기록판 제외) DOM 변경 0건**(모은 결과가 처음과 같으면 diff 무변경), 오류 없음 | `e2e/phase2-batching.spec.ts` |

## 기대값만 바뀌는 기존 시나리오 (최종 상태 · DOM 단언은 그대로)

| 기존 | 바뀌는 횟수 단언 (전 → 후) | 스펙 파일 |
| --- | --- | --- |
| task_002 QA-3 [+3] | 렌더 4 → 2 (3 늘어 → 1 늘어) | `e2e/phase2-counter.spec.ts` |
| task_002 QA-14 기록판 | (5) 6·5·1 → **4·3·1**, (6) 9·5·2 → **6·3·2** | `e2e/phase2-log.spec.ts` |
| task_002 QA-A2 연타 | 렌더 61 → 41 (1 + 30 + 10) | `e2e/phase2-attack.spec.ts` |
| task_002 QA-17 렌더 20번 넘게 | `toBeGreaterThan(20)` → `toBeGreaterThanOrEqual(20)` (이 동작 묶음이 렌더 23 → 20번) | `e2e/phase2-log.spec.ts` |

## 회귀 · 환경

| QA | 확인 | Then |
| --- | --- | --- |
| QA-R1 | task_002 Phase 2 e2e 전부 (counter · input · todo · log · attack · render · perfbench, desktop · mobile) | 위 표 4곳 말고는 바뀐 것 없이 통과. 특히 QA-4 [그대로] 렌더 0번 · QA-A8 글자당 렌더 1번 · QA-A7 경계 이동 렌더 0번 · QA-15 patch 줄 수는 그대로 |
| QA-R2 | Phase 1 e2e (`phase1-*.spec.ts`) | 96 passed (desktop · mobile) — Phase 1은 이 task에서 변경 없음 |
| QA-R3 | `npx vitest run` 전체 · `npx tsc --noEmit` · ESLint | 전부 통과 (바뀐 단위 테스트 목록은 `dev_todo.md` Dev-1 · 2 근거) |

## 필수 확인
- [ ] Diff 기본 케이스 D-01~05: 이번 task는 diff를 안 바꾼다 → task_002 e2e(QA-2 · QA-8 · QA-9 · QA-10)가 같은 DOM 결과로 통과하는지(QA-R1)로 확인 (특히 [추가]가 렌더 2번 → 1번이 되어도 D-05 교체 · D-03 추가 결과 동일)
- [ ] History 동기화: Phase 1 기능이라 변경 없음, QA-R2 회귀로 확인
- [ ] desktop · mobile 캡처 (`04_qa_evidence/screenshot_NN_<desktop|mobile>.png`): 검증 페이지 [+3] 뒤(기록판 render 2) · 대시보드 B-06 행(렌더 1번)
- [ ] 화면에서 못 덮는 것(단위 테스트로만): 안전장치(연달아 50번 · 51번째 오류) · 렌더 중 setter 오류 · 렌더 예외 뒤 큐가 막히지 않음 · unmount 뒤 setter — `dev_todo.md` Dev-1
