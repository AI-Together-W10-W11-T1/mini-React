# 00 마스터 대화 기록: patch-preview

> 0단계 인터뷰 문답과 2.5단계 이해 체크포인트를 시간 순서로 남긴다. 사용자의 답은 고치지 않고 요약만 한다.

- 작업자: ryuuuu5618 · 작업명: patch-preview · 시작: 2026-11-11T22:41
- 브랜치: `feature/patch-preview` ← `feature/figma-design` (task_005 디자인 위에서 시작, task_005는 QA 사람 확인 대기로 보류)
- 진행 모드: **가벼운**
- 규칙 출처: 플러그인 소스 0.4.6 `skills/agent-workflow` · `skills/grill-me`
- 배경: 사용자가 과제 요구사항(Phase 1 실제 영역 · 테스트 영역 · Patch · 뒤로 · 앞으로)을 mini-figma 안에서 보여 주고 싶어 함
- 마스터 사실 확인: 엔진 `@mini-react/react-dom`의 `createVDomRoot(realArea, { onPatch })` = update(next) · back() · forward() (diff + patch + History), `@mini-react/react-dom-bindings`의 `readAreaChildren` (DOM → VNode). Phase 1 검증 페이지가 이미 필수 요구사항을 채움 → 이번 것은 시연 앱 안 추가 장면

## 0단계 인터뷰

- 사용자 제안 (원문): "지금 내 document의 (body > div) 이 부분이랑 대칭되는 실제 영역으로 최초 상태 혹은 이전 상태를 보여주고 '버튼' 같은 요소들과 객체들을 만들고 나서 Patch 버튼을 눌렀을 때 실제 영역이 Patch되는 모습이 실시간으로 보였으면 좋겠는데 내 개념이 맞아?" → 마스터: 거의 맞음. 테스트 영역 = 편집 캔버스(state), 실제 영역 = Patch로만 바뀌는 미리보기, 흐름 = Phase 1 그대로(createVDomRoot), 실시간 = Diff 시각화. 다듬을 곳: ① body > div는 앱 전체라 캔버스만 비추기 추천 ② 뒤로 · 앞으로는 실제 영역만(간단) vs 앱 Undo와 묶기(복잡)
- 순서 → A (원문): "디자인 말고 새 task_006를 먼저 진행하자" → task_006 먼저
- Q0 모드 · 서버 · Q1(실제 영역 자리 · 내용 · 클릭) → A (원문): "가벼운 걸로 가고 지금은 시간이 없으니까 너의 추천대로 무조건 가자" (2026-11-11T22:43)
  - 모드 가벼운, QA 서버 PID 50900 끄기(추천 = 끄기 → 마스터가 종료, 포트 5199 비어 있음 확인)
  - 0단계 결정 전부 마스터 추천안 (명세 5절): 가운데 열 위 테스트 · 아래 실제, 캔버스 버튼만, readAreaChildren + 정리 함수, 뒤로 · 앞으로 = 실제 영역만, 버튼 = 실제 영역 머리글, 깜빡임 = 덧칠 층. 이유 = 사용자 원문 그대로, 2.5단계 「왜 이걸 골랐나」 대상
  - 명세 승인: 추천안 일괄 수용으로 봄 (테스트 케이스 확인은 따로 받음)

## 알고리즘 결정 문답

## 이해 체크포인트
