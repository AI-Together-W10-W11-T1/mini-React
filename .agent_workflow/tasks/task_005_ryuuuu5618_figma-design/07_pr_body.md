# 07 PR 본문 초안: figma-design

- 제목: `style(mini-figma): 디자인 시스템 개편 · 도구 막대 · 팔레트 판 · 전체 높이`
- 브랜치: `feature/figma-design` → `main` (원격 없음, 로컬 병합 --no-ff, 커밋 21개). 뒤이은 디자인 수정(5e841b2 · 905a582 · 81e1e2d)은 task_006 브랜치에 있어 task_006 병합으로 함께 들어감
- 레포에 `.github/pull_request_template.md`가 없어 PRD §9 항목에 맞춰 적는다.

## 변경 요약
- 사용자 디자인 시스템 문서를 바탕으로 어두운 바탕 · 강조색 파랑 하나 · 알약 버튼 (브랜드 이름 · 로고 · 외부 글꼴 없음, FD-05)
- 도구 막대, 팔레트 판(칩 8 + 직접 고르기, 색은 hex로 저장 · style로 칠함 → SET_STYLE, 글자색은 WCAG 대비로 흰색 / 먹색), 전체 높이 배치 (FD-01 ~ 25)
- 엔진 `packages/` 변경 없음
- 공통 측정 지표 결과 문서 `docs/공통_측정_지표_결과.md` (PRD §7 · §8) 포함

## ⚙️ 동작 원리
- 색 = `#rrggbb` 문자열 state → `style` prop → patch는 SET_STYLE 줄. 글자색은 바탕 밝기로 계산 (`#777777` → 흰, `#787878` → 먹색)
- [CheckPoint] 생략 (2026-11-12T01:18, 사용자 "시간 없으니까 너가 추천하는 방식으로 진행해") — 발표 전 보충 대상

## 검증 결과
- task_005 QA PASS (playwright 324). 사람 확인 2026-11-12T01:18: v2 재캡처 12장 "캡처 OK", 색 팝업 "팝업 됨", 스크롤바 "그대로"
- 최종 수치는 task_006 병합 시점 값과 같음 (아래 task_006 07)

## 남은 일
- 2.5 체크포인트 · 4단계 위키 · README: 발표 전에 task_005 · 006 모아 한 번 (가벼운 모드 규칙)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
