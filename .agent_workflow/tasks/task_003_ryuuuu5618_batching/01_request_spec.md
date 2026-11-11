# 01 요구사항 명세: batching

- task: `.agent_workflow/tasks/task_003_ryuuuu5618_batching/`
- 작업자: ryuuuu5618
- 출처: `docs/PRD/요구사항 정의서 PRD.md` v2.1 §4.2 Batching(선택) · §6.2 「Key · Batching 등 선택 확장의 동작」 · §8.1 B-06
- 진행 모드: **가벼운** (테스트 케이스 확인은 함). 0단계는 「빠르게」 추천안 표
- 기준 기획: task_002 `03_development/dev_todo.md` Dev-27 · Dev-28, `04_qa_evidence/qa_todo.md` QA-21
- 상태: **사용자 승인 (2026-11-11T14:11)** — 추천안 표 "응"

## 1. 요청 요약
Phase 2 재렌더 시점을 알고리즘 결정 9 **A 즉시 동기 → B 마이크로태스크 Batching**으로 바꾼다. 같은 핸들러(같은 틱)에서 부른 setter는 모아서 렌더 한 번으로 처리한다. 검증 페이지 [+3]이 렌더 1번이 되는 것을 기록판으로 보여 준다.

## 2. 확정 요구사항

| ID | 요구사항 | 수용 기준 | 패키지 |
| --- | --- | --- | --- |
| §4.2 Batching | 같은 틱의 setter를 모아 한 번 렌더 | setter 3번 → 렌더 1번 · 최종 상태 +3, 같은 값이면 렌더 0번 | `scheduler` · `react-reconciler` |
| P2-15 | 상태 변경 후 자동 갱신 | 버튼 · 입력만으로 화면이 갱신됨 (렌더는 핸들러가 끝난 직후) | `scheduler` |
| P2-16 | useEffect | 모은 렌더의 patch 직후에 실행 | `react-reconciler` |
| T-10 · T-12 · T-14 · T-15 | 회귀 | 기존 단위 · e2e가 최종 상태 · DOM 기준으로 모두 통과 (렌더 횟수 기대값만 바뀜) | 전체 |
| §8.1 B-06 | 대시보드 연속 상태 변경 | setter 10번 → 렌더 횟수 · 시간이 Batching 기준으로 나옴 (숫자는 실제 측정값만) | `fixtures/perf-bench` |

## 3. 구현 제외 범위
- `flushSync` 같은 즉시 렌더 API, 우선순위 · 시간 분할, `requestAnimationFrame`(결정 9 C)
- Phase 1 검증 페이지 변경 (회귀만)
- SVG

## 4. 주의사항
- **types.ts**: `NESTED_RENDER_LIMIT` 주석의 뜻을 "연달아 50번 렌더"로 바꿈 (마스터, 0.5단계)
- 즉시 렌더를 전제로 한 단위 테스트는 setter 뒤 마이크로태스크를 비우는 `await` 형태로 고친다. 최종 상태 · DOM 단언은 바꾸지 않는다
- e2e는 렌더 · effect 횟수 단언만 바꾼다 (전 → 후 목록을 근거에 남김)
- 핸들러 안의 변수는 여전히 옛 값이므로 연속 증가는 함수형 setter (지금 [+3] 코드 그대로)
- README · 위키 · `CLAUDE.md`의 "즉시 동기 · Batching 구현 안 함" 문장을 고친다

## 5. 알고리즘 결정

| 결정 | 선택 | 이유 (사용자) | 버린 후보와 이유 |
| --- | --- | --- | --- |
| 알고리즘 결정 9 · 재렌더 시점 (변경) | **B. 마이크로태스크 Batching** — setter는 칸 값을 바로 바꾸고 렌더는 `queueMicrotask`로 컴포넌트당 한 번 예약, 지금 실행 중인 코드가 끝난 직후 한 번 렌더 + diff + patch + effect | "리액트를 공부할려면 배칭 구현하는게 맞는 거 같아서" | A 즉시 동기 — task_002의 선택("마감이 빠듯해서"), 연속 setter마다 렌더 / C requestAnimationFrame — 렌더가 최대 약 16ms 늦음, jsdom 테스트 불편 |

### 정책

| 항목 | 선택 | 이유 (사용자) |
| --- | --- | --- |
| §4.2 같은 값 | 예약 시점에 값이 같으면 예약하지 않음, 모은 결과가 처음과 같아도 diff가 무변경 | 추천안 수용 ("응") |
| §4.2 effect 시점 | 모은 렌더의 patch 직후 한 번 | 추천안 수용 |
| §4.2 무한 렌더 안전장치 | effect → setter → 렌더가 연달아 50번 넘으면 오류 | 추천안 수용 |
| 그대로 | 렌더 중 setter 오류 · 함수형 setter · 지연 초기화 · Hook 순서 · 이벤트(결정 8 B) | 추천안 수용 |

## 6. 수용 기준 연결
- 인수: task_002 QA-21 (+ 렌더 · effect 횟수를 세는 QA-3 · QA-14 · QA-A2 등 기대값 갱신) → `e2e/phase2-*.spec.ts` desktop · mobile, Phase 1 e2e 회귀
- 단위: scheduler · useState · useEffect · hookErrors · render 테스트 (Batching 동작 + 기존 동작 await 형태)
- 테스트 케이스 확인: <!-- 1단계 끝 -->

## 7. [고정] 필수 제약
- task_002와 같음 (`01_request_spec.md` 7절). DOM은 `react-dom-bindings` · fixture에서만, Fiber · 우선순위 스케줄러 금지
