# 개발 검수 기록: figma-design

> `mr-reviewer`(Opus) 판정을 마스터가 그대로 옮긴다. 진행 모드: 가벼운 (task당 한 번).

## Dev-1 ~ 8 · 회차 1/3 — APPROVE (2026-11-11T21:29)
- 대상: `01_diff_dev1-8.patch` (`16b2580..fb088e0`), 마스터 실행: vitest 43 files · 1159 passed, tsc 0, playwright 전체 318 passed, `git diff --stat main -- packages/` 비어 있음, 포트 5199 남은 서버 없음

BLOCKING 없음 (파일 직접 확인, 실행은 마스터 결과를 받음). 확인한 것:
1. 색 처리: `#rrggbb` 저장, 버튼 `style`(`buttonStyle`), 글자색 = WCAG 대비 큰 쪽(`color.ts:31-37`). 경계 손계산: `#777777` 흰 글자(4.48 대 4.40), `#787878` 먹 글자(4.42 대 4.46). 색 입력칸 `value` 프로퍼티 + `onInput`, 형식 밖 값은 흰 글자로 막음. `keys.ts`는 `isNonTextInput`에 `color`만 더함, 글자 칸 · Delete · 수정키 규칙 그대로 (text · number · range · TEXTAREA null 행 테스트 추가)
2. Hook · 버튼: Hook은 `App`에만(useState 4 · effect 1, `instance.hooks` 5칸). `Toolbar` · `ColorPalette`는 props + 콜백 props, rootOnlyHooks 대상 7파일. `disabled = !canUndo`, `aria-pressed` 문자열. [↶][↷]와 단축키가 같은 `onUndo` · `onRedo` (`App.ts:86-87, 111, 114, 125`)
3. 바뀌는 기존 단언 · 디자인: 표대로만, 약해진 곳 없음 (QA-1 · 7 · A13은 강해짐). 접두 [0,0] ~ [0,3], `B2_PATH` [0,2,1,1] + 접두 확인 단언. 강조색 파랑 하나(`#003ecc` = 문서 primary-active). 주황 · 그림자 · `@import`/`https` · coinbase 글자 0건 (design.test 소스 · QA-41 computed style)
- 편차 판단: ① `.property-title { overflow-wrap: anywhere }` 버그 수정 수용 (QA-A2 강해짐) ② QA-42 · A27 처음부터 통과 수용 ③ 앱 이름 `mini-figma` 수용 ④ 선택 상자 단언 대상 변경 수용 (`prop-color` Delete · Backspace 무시 `app.test.ts:1308`, Ctrl+Z · Ctrl+Shift+Z 전용 `:1332`, Meta+Z는 `prop-icon` + keys.test) ⑤ Dev-7 CSS · 테스트만 수용

[NON-BLOCKING]
1. P-25 · 26 · 27 도구 막대 T 열 단언 빠짐 (`app.test.ts:693` · `:705` · `:783`). qa_todo는 P-25 · 27 `{ SET_ATTR: 1 }`, P-26 첫 input `{ SET_ATTR: 1 }` 이후 `{}` + 레이어 `{}`. 같은 경로는 P-5b 등이 증명 → `toolbarCounts` 단언 3 ~ 4줄 추가 권장
2. 「글자색은 배경에 따라 textColorFor 규칙」 테스트가 기대값을 구현 함수에서 가져옴 (P-5 · color.test가 리터럴로 같은 내용 단언 → 실제 문제 없음)
3. 색 입력칸 · 체크박스 포커스 표시가 브라우저 기본 (파랑 2px 포커스는 글자 칸 · 선택 상자만, `index.html:76`). FD-03 「입력칸 포커스」를 넓게 읽으면 `.color-input:focus-visible` 추가 가능 (QA-41 영향 없음)
