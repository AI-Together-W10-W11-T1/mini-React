# qa_todo: phase1

- 명세: `../01_request_spec.md` · Dev 목록: `../03_development/dev_todo.md` · 테스트 케이스 확인: `../02_planning_review/02_user_test_case_review.md` (A1~A5 · B1~B22 · C1~C5, 대조표는 `../02_planning_review/03_worker_revised.md`)
- 실행: `npx playwright test <파일>` (desktop 1280x800 · mobile 375x812 두 프로젝트, 모든 시나리오가 두 프로젝트에서 돈다)
- 시나리오 하나 = `e2e/*.spec.ts` 테스트 하나. 테스트 이름은 시나리오 문장 그대로
- `QA-N`은 이 표의 행 번호일 뿐이고, 근거 ID는 PRD ID · T-ID(`P1-xx` · `T-0x` · `D-0x`)와 검토 문서 번호(A · B · C)만 쓴다
- **번호 규칙**: 기존 QA-1 ~ QA-22 · QA-A1 ~ QA-A11은 번호를 바꾸지 않았다. 새 인수 시나리오는 **QA-23 ~ QA-33**(QA-33 = 뒤로 · 앞으로 도중 예외, Dev-18), 새 공격 시나리오는 **QA-A12**. 기존 시나리오에 덧붙인 항목은 Then에 `(B1)`처럼 번호를 표시했다
- 화면 약속: `data-testid` = `real-area` · `test-area` · `html-editor` · `btn-patch` · `btn-back` · `btn-forward` · `viz-toggle` · `viz-overlay`(확장은 `data-last-patch-count` · `data-last-flash-count`도 남김). 초기 샘플은 `dev_todo.md`의 샘플 HTML (글자 `제목` · `안녕` · `하나` · `둘` · `셋` · `잠김`)
- 편집은 편집창 글을 읽어 **일부만 바꿔서 다시 채운다**(샘플의 들여쓰기에 기대지 않기 위해). 예: `글.replace('안녕', '반가워')`
- 두 영역 · 편집창을 비교할 때는 `innerHTML` 글이 아니라 구조를 비교한다 (`e2e/phase1-helpers.ts`의 `structureOf`): 요소 태그 · 속성 · 글자(공백 포함) · 주석을 번호 순서대로. **속성은 이름 → 값 집합으로 비교한다(순서 무시)** — 실제 영역은 SET_ATTR로 속성이 맨 뒤에 붙고 테스트 영역은 편집창에 친 순서대로라 순서가 달라도 정상이다(A4). **`style`은 `el.style.cssText` 비교에 더해, `getAttribute('style')` 글을 엔진과 같은 규칙(`parseStyleText`)으로 쪼갠 항목 집합도 비교한다**(브라우저가 모르는 항목을 버려서 둘이 같아 보이는 경우를 잡음, A4). 편집창 글은 `<template>`에 넣어 파싱한 구조와 비교
- "참조 유지"는 페이지 안에서 노드에 JS 변수(`window.__keep`)로 붙잡아 두었다가 `===`로 비교한다 (DOM 속성을 쓰지 않음)
- "DOM 변경 없음"은 실제 영역에 `MutationObserver`를 심어 기록 개수가 0인지 본다. "정확히 N건"은 같은 방법으로 `characterData` · `attributes` · `childList` 종류별 개수와 `target`을 센다(`observeMutations`)
- **공통 확인 (모든 스펙 · 모든 테스트, A5)**
  - **콘솔 `error`(`console.error` · `pageerror`)가 한 건이라도 있으면 실패한다.** (이전에는 QA-1 · QA-A2 · QA-A4만 확인) QA-1 · QA-A2 · QA-A4는 경고도 0건
  - **dialog 감시**: alert는 시나리오가 `captureAlert(page, 동작)`으로 **미리 선언한 것만** 허용하고, 선언 없이 뜨면 닫은 뒤 테스트가 실패한다. Playwright가 예상하지 못한 alert를 조용히 닫아 검사기가 정상 글을 잘못 막아도 모르고 지나가는 일을 막는다. alert를 기대하는 시나리오는 QA-16 ~ QA-20 · QA-29 · QA-30 · QA-32 · QA-A10 · QA-A12뿐이고, 나머지는 alert가 뜨면 곧 실패
- Patch 때 alert 문구 말마디: `[위험한 코드]` · `[태그 짝]` · `[구조 불일치]` · `[SVG 미지원]` · `[Patch 오류]`(C2) · `다시 작성해 주세요`. `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`는 `[위험한 코드]` 줄에 요소 이름이 들어간다

## 인수 시나리오

| QA | PRD · T | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| QA-1 | P1-19 · P1-20 · P1-21 · P1-22 | 페이지를 처음 연다 | 로드 직후 | "실제 영역" · "테스트 영역" 이름표가 보여 구별된다. 두 영역 구조가 같고 샘플과 같다. 편집창에 샘플 HTML 글이 들어 있다. 편집창에 `<p>&lt;b&gt; 😀</p>`를 치면 테스트 영역에 글자로 보이고 `<b>` 요소가 없다. Patch · 뒤로 · 앞으로 버튼이 보인다. 콘솔 오류 · 경고 없음. mobile에서 가로 스크롤 없음 | `e2e/phase1-render.spec.ts` |
| QA-2 | P1-06 · P1-17 · D-01 · T-03 · T-06 · T-07 · M-02 · B1 · B7 | 초기 상태 | `안녕` → `반가워`로 고치고 Patch | 실제 영역 글자가 `반가워`, 구조가 테스트 영역과 같다. 글자 노드를 뺀 다른 노드는 같은 참조. **(B1) 실제 영역 `MutationObserver` 기록이 `characterData` 정확히 1건, `childList` 0건 · `attributes` 0건.** **(B7) Patch 성공 뒤 편집창 글이 친 그대로다**(Patch 직전 값과 같음, 스냅샷 글로 바뀌지 않음) | `e2e/phase1-patch.spec.ts` |
| QA-3 | P1-07 · P1-08 · P1-09 · D-02 · T-03 · T-07 · A4 | 초기 상태 | `<p>`에 `title` 추가(**편집창에서는 `class`보다 앞에 씀**), `class` 수정, `<section>`의 `id` 삭제 후 Patch | 실제 영역 속성이 테스트 영역과 같다 (추가 · 수정 · 삭제 모두). 요소는 같은 참조. **(A4) 편집창에서는 `title`이 앞이고 실제 영역에서는 맨 뒤에 붙어 속성 순서가 달라도 같은 것으로 판정**(이름 → 값 집합 비교) | `e2e/phase1-patch.spec.ts` |
| QA-4 | P1-10 · D-03 · T-03 · T-07 | 초기 상태 | `<ul>` 끝에 `<li>넷</li>` 추가 후 Patch | `<li>`가 4개, 넷째가 `넷`. 앞 세 `<li>`는 같은 참조 | `e2e/phase1-patch.spec.ts` |
| QA-5 | P1-11 · P1-16 · D-04 · T-03 · T-05 · T-07 · A2 | 초기 상태 | (a) 가운데 `<li>둘`을 지우고 Patch, (b) 다시 처음 상태에서 `<li>` 둘을 한꺼번에 지우고 `<p>`의 글자도 바꾸고 Patch | **(a) (A2) 위치 비교라서 원래 둘째 `<li>` 노드는 그대로 남고 글자만 `셋`으로 바뀌며, 원래 셋째 `<li>`가 지워진다**: 남은 `<li>`는 2개 · 글자 순서 `하나` `셋`, 남은 둘째 `<li>`는 Patch 전 둘째 `<li>`와 같은 참조(`===`)이고 원래 셋째 `<li>`는 분리됨(`isConnected` 거짓). `<ul>` · 첫 `<li>` · `<section>` · `<h2>` · `<p>` · `<button>`은 같은 참조. 구조가 테스트 영역과 같다. (b) 남은 구조가 테스트 영역과 같고 `<p>` 글자가 바뀌었으며, `<ul>` · 남은 `<li>`를 뺀 주변 요소는 같은 참조 | `e2e/phase1-patch.spec.ts` |
| QA-6 | P1-12 · D-05 · T-03 · T-07 · A3 | 초기 상태 | `<ul>` → `<ol>`로 태그를 바꾸고 Patch | **(A3)** 실제 영역에 `<ol>`이 있고 `<ul>`은 사라진다. **`<ol>`과 그 안의 `<li>` 세 개는 모두 새 노드**(교체는 하위 구조까지 새로 만듦: Patch 전 `<li>` 참조와 `!==`)이고 글자(`하나` `둘` `셋`)는 같다. **`<section>` · `<h2>` · `<p>` · `<button>`은 같은 참조** | `e2e/phase1-patch.spec.ts` |
| QA-7 | P1-14 · P1-15 · P1-16 · T-05 · T-07 | 초기 상태 | 한 번에 `<h2>` 글자 수정 + `<li>` 속성 추가 + `<li>` 하나 삭제 + `<li>` 하나 추가 + `<button>` → `<a>` 교체 후 Patch | 실제 영역이 테스트 영역과 구조가 같다 (여러 단계 · 여러 종류 동시) | `e2e/phase1-patch.spec.ts` |
| QA-8 | P1-13 · T-04 · §3.3 무변경 Patch | 초기 상태 | 편집 없이 Patch를 누르고, 이어서 뒤로 | 실제 영역 DOM 변경 기록 0건. 뒤로를 눌러도 아무 일 없다 (기록이 안 생김) | `e2e/phase1-patch.spec.ts` |
| QA-9 | P1-17 · P1-18 · T-06 · B2 | 초기 상태, 노드 참조를 잡아 둠 | `<p>`의 글자 하나와 `class`만 바꾸고 Patch | 바뀐 `<p>`를 포함해 부모 · 형제 요소(`<section>` · `<h2>` · `<ul>` · `<li>` · `<button>`)가 같은 참조. **(B2) `MutationObserver` 기록이 `characterData` 1건 + `attributes` 1건, `childList` 0건** | `e2e/phase1-patch.spec.ts` |
| QA-10 | P1-25 · T-07 | 초기 상태 | 편집 → Patch → (같은 편집창에서) 다른 편집 → Patch | 두 번째 Patch 뒤에도 실제 영역이 테스트 영역과 같다 (직전 반영 상태 기준). 첫 Patch의 변경이 유지된다 | `e2e/phase1-patch.spec.ts` |
| QA-11 | P1-26 · P1-28 · P1-29 · P1-30 · T-06 · T-08 · B3 | 초기 상태 | Patch 2회(상태 S1 → S2: **S1 = 글자 하나 변경, S2 = `<ul>` 끝에 `<li>` 추가**) → 뒤로 → 앞으로 | 뒤로 뒤에 S1, 앞으로 뒤에 S2: 각 단계에서 **편집창 글 · 테스트 영역 · 실제 영역** 세 칸이 모두 그 상태와 같다. **(B3) 뒤로 · 앞으로 때도 바뀌지 않은 노드는 같은 참조**(`<section>` · `<h2>` · `<p>` · 앞 세 `<li>` · `<button>`)이고, `MutationObserver` 기록은 바뀐 곳(`<ul>`)을 target으로 하는 `childList`뿐이며 그 밖 노드의 기록은 0건이다. 한 번 더 뒤로(S1 → 초기, 글자 되돌리기)는 `characterData` 1건뿐이다 ("역패치로 바뀐 곳만 되돌린다") | `e2e/phase1-history.spec.ts` |
| QA-12 | P1-28 · P1-29 · §3.3 경계 | 초기 상태(처음 기록) / Patch 한 번 한 최신 상태(끝 기록) | 처음에서 뒤로, 끝에서 앞으로 | 아무 일 없다: DOM 변경 기록 0건. 편집창에 쳐 둔 글도 그대로 | `e2e/phase1-history.spec.ts` |
| QA-13 | P1-26 · §3.3 undo 뒤 새 변경 | Patch A → Patch B 한 상태 | 뒤로(A 상태) → 새 Patch C → 앞으로 | 앞으로는 아무 일 없다(B로 못 감). 뒤로 → A, 뒤로 → 초기, 그 뒤엔 더 못 감. 각 단계 세 칸 일치 | `e2e/phase1-history.spec.ts` |
| QA-14 | P1-30 · §3.3 미저장 편집 | Patch 2회 한 상태 | 편집창에 새 글을 치고(Patch 안 함) 뒤로, 다시 글을 치고 앞으로 | 이동하면 편집창 글 · 테스트 영역 · 실제 영역 모두 그 기록 상태 (친 글은 사라짐) | `e2e/phase1-history.spec.ts` |
| QA-15 | P1-27 · T-08 | 초기 → Patch 3회 (S1 · S2 · S3) | 뒤로를 끝까지, 앞으로를 끝까지 | 각 칸에서 세 칸이 Patch 당시 그 상태와 같다 (뒤에 한 편집 · Patch가 과거 상태를 바꾸지 않음) | `e2e/phase1-history.spec.ts` |
| QA-16 | §5 실행 가능한 HTML · §5 오류 | 초기 상태 | (a) `<img src="x" onerror="…">`, (b) `<script>…</script>`, (c) `<a href="javascript:…">`를 각각 넣고 Patch | alert에 `[위험한 코드]`와 `다시 작성해 주세요`. 확인을 누르면 실제 영역 · 기록은 그대로(구조 변화 없음, 뒤로 무시) | `e2e/phase1-guard.spec.ts` |
| QA-17 | §5 HTML 편집 · 오류 | 초기 상태 | `<ul>`의 닫는 태그를 지우고(`</ul>` 삭제) Patch | alert에 `[태그 짝]`. 실제 영역 · 기록 그대로 | `e2e/phase1-guard.spec.ts` |
| QA-18 | §5 HTML 편집 · 오류 | 초기 상태 | `<p><div>x</div></p>`를 넣고(짝은 맞지만 브라우저가 고쳐 읽음) Patch | alert에 `[구조 불일치]`. 실제 영역 · 기록 그대로 (`tbody` 자동 추가만 예외로 허용되며 이것은 QA-28) | `e2e/phase1-guard.spec.ts` |
| QA-19 | §5 HTML · SVG 범위 | 초기 상태 | `<svg><circle r="3"></circle></svg>`를 넣고 Patch | alert에 `[SVG 미지원]`. 실제 영역 · 기록 그대로 | `e2e/phase1-guard.spec.ts` |
| QA-20 | §5 오류 | 초기 상태 | `<p><div>x</div></p><span>`(구조도 틀리고 닫는 태그도 빠짐)를 넣고 Patch | alert가 **한 번** 뜨고 `[태그 짝]`과 `[구조 불일치]`가 함께 들어 있다 | `e2e/phase1-guard.spec.ts` |
| QA-21 | §5 실행 가능한 HTML (미리보기) | 초기 상태 | 편집창에 `<img src="x" onerror="window.__pwned=1">` · `<script>window.__pwned=1</script>` · `<a href="javascript:window.__pwned=1">링크</a>`를 친다 (Patch는 안 누름) | 입력 중에는 alert가 안 뜬다. `window.__pwned`가 정의되지 않는다. 테스트 영역의 `<img>`에 `onerror` 속성이 없고 `<script>`가 없고 `<a>`에 `href`가 없다 | `e2e/phase1-guard.spec.ts` |
| QA-22 | Diff 시각화 (확장) · A1 | 초기 상태 | 처음엔 스위치 꺼짐: Patch(글자 하나). 스위치를 켜고: 글자 하나 Patch → 뒤로 → 앞으로 → `<li>` 하나 삭제 Patch. 스위치를 끄고 Patch | **(A1) 고정 숫자 대신 "깜빡임 개수 = 이번 동작의 patch 개수"로 확인한다.** 페이지가 `viz-overlay`에 이번 동작의 patch 개수(`data-last-patch-count`)와 그린 깜빡임 상자 수(`data-last-flash-count`)를 함께 남긴다. 꺼짐에서는 `data-last-flash-count`가 0(patch 개수는 1 이상). 켠 뒤 글자 Patch · 뒤로 · 앞으로 · `<li>` 삭제 Patch 모두 **깜빡임 개수 = patch 개수**. **정확한 숫자로 확인하는 것은 글자 하나 Patch(= 1)뿐**: 글자 하나 Patch는 둘 다 1 (뒤로 · 앞으로도 같은 1개짜리 patch라 1). `<li>` 삭제는 공백 글자 노드가 함께 바뀌어 patch가 2 이상일 수 있으므로 숫자를 고정하지 않고 "patch 개수 ≥ 1, 깜빡임 개수 = patch 개수(지우기 전 위치)"만 본다. 끄면 다시 0. 켜고 쓰는 동안 실제 영역에 표시용 class · 속성이 붙지 않고(구조 · 속성이 patch 결과 그대로) 오버레이는 실제 영역 **밖**에 있다 | `e2e/phase1-visual.spec.ts` |
| QA-23 | P1-13 · P1-23 · T-04 · B4 | 초기 상태 | (a) 편집창에 글자 하나를 쳤다가 지워 원래 글로 되돌린 뒤(미리보기가 편집창 글로 다시 그려짐) Patch. (b) 초기 상태에서 Patch 한 번(글자 하나) → 뒤로 → 편집창(이제 스냅샷을 HTML 글로 바꾼 글)을 건드리지 않고 Patch | **(B4)** (a) 실제 영역 DOM 변경 0건, 기록이 안 늘어난다(뒤로 무시). (b) 편집창 글 → 파싱 → VNode 왕복이 어긋나지 않아 DOM 변경 0건이고 기록이 안 늘어난다 (`vnodesToHtml` → 파싱 왕복을 브라우저에서 확인) | `e2e/phase1-roundtrip.spec.ts` (Dev-19에서 분리) |
| QA-24 | P1-13 · T-04 · B5 | 초기 상태 | 편집창에서 `안녕` → `반가워`로 고쳤다가(Patch 안 함) 다시 `안녕`으로 고친 뒤 Patch | **(B5)** 실제 영역 DOM 변경 0건, 기록이 안 늘어난다 ("고친 적 있음"이 아니라 값으로 비교) | 위와 같음 |
| QA-25 | P1-23 · T-07 · B6 | 초기 상태 | 편집창에 글자를 치자마자(기다림 없이) Patch (예: `안녕` 뒤에 `요!!`를 한 글자씩 입력하고 바로 클릭) | **(B6)** 마지막 글자까지 실제 영역에 반영된다(미리보기 갱신이 늦게 따라와 옛 글로 Patch되지 않음) | 위와 같음 |
| QA-26 | P1-07 ~ P1-11 · §5 · B8 | 초기 상태 | 빈 태그: `<img alt="a">`를 넣고 Patch → `alt`를 바꾸고 Patch → `<br>` · `<hr>` · `<input>`을 넣고 Patch → 셋을 지우고 Patch | **(B8)** 매 Patch마다 실제 영역 구조가 테스트 영역과 같다. 빈 태그의 속성 변경(`alt`)은 같은 `<img>` 참조. `<br>` · `<hr>` · `<input>`은 요소로 생기고 지우면 사라진다 | 위와 같음 |
| QA-27 | P1-02 · P1-12 · P1-18 · B9 | 초기 상태 | 인라인 중첩 · 글자 사이 요소: `<p>`의 글을 `안<b>녕</b>하세요`로 바꾸고 Patch → `<b>`만 `<i>`로 바꾸고 Patch | **(B9)** 두 번째 Patch에서 `<i>`는 새 노드로 교체(`<b>`는 분리)되고, 앞뒤 글자 노드(`안` · `하세요`)는 같은 참조 · 같은 위치(자식 0번 · 2번), `<p>`도 같은 참조. 구조가 테스트 영역과 같다 | 위와 같음 |
| QA-28 | P1-10 · P1-14 · §5 · B10 · C1 | 초기 상태 | (a) `<table><tbody><tr><td>1</td></tr></tbody></table>`를 넣고 Patch → 칸 글자를 `2`로 수정하고 Patch → 행 하나 추가하고 Patch. (b) 초기 상태에서 `tbody` 없이 `<table><tr><td>1</td></tr></table>`를 넣고 Patch → 이어서 칸 글자를 고쳐 Patch | **(B10)** (a) 매 Patch마다 정상 반영(구조가 테스트 영역과 같다). **(C1) (b) `[구조 불일치]` alert가 뜨지 않고(선언 없는 alert는 실패) 정상 반영**된다: 실제 영역의 표에 `<tbody>`가 들어 있고 테스트 영역과 같으며, 이어서 고친 칸 글자도 반영된다. `tbody`가 아닌 자동 보정(QA-18의 `<p><div>`)은 여전히 막힌다 | 위와 같음 |
| QA-29 | §5 실행 가능한 HTML · B11 · C3 | 초기 상태 | (a) 편집창에 `<iframe srcdoc="<script>parent.__pwned=1</script>"></iframe>`을 친다(Patch 안 함). (b) 같은 글로 Patch. (c) `<object data="x.html"></object>` · `<embed src="x.html">`로도 (a) (b) | **(B11 · C3)** (a) 입력 중에는 alert가 안 뜨고 `window.__pwned`가 정의되지 않으며 테스트 영역에 `<iframe>` · `<object>` · `<embed>`가 없다(미리보기에서 뺌). (b)(c) Patch는 `[위험한 코드]`(요소 이름 포함)로 막히고 실제 영역 · 기록 그대로 | `e2e/phase1-guard.spec.ts` |
| QA-30 | §5 실행 가능한 HTML · B12 | 초기 상태 | `javascript:`를 숨긴 글을 각각 넣는다: `<a href="jav&#x61;script:window.__pwned=1">`(문자 참조), `<a href=" JAVA[탭 문자]script:window.__pwned=1">`(앞 공백 + 대문자 + 값 안에 실제 탭 문자 하나 — 테스트 코드에서는 `\t`로 씀). 칠 때(Patch 안 함)와 Patch 때 | **(B12)** 칠 때: alert 없음, `window.__pwned` 없음, 테스트 영역 `<a>`에 `href`가 없다(파싱한 뒤의 값으로 검사). Patch 때: `[위험한 코드]` alert, 실제 영역 · 기록 그대로 | `e2e/phase1-guard.spec.ts` |
| QA-31 | §5 · P1-19 · B13 · C4 | 초기 상태에서 `<a href="https://example.com">링크</a>`와 `<form><button>보내기</button></form>`을 넣고 Patch 한 번(두 영역에 모두 있고 기록이 한 칸 있음) | 테스트 영역 안의 링크 클릭 · 폼 버튼 클릭, 실제 영역 안의 링크 클릭 · 폼 버튼 클릭 | **(B13 · C4)** 페이지가 이동 · 새로고침되지 않는다(주소 그대로, 페이지 안 표시용 변수 `window.__stay`가 살아 있음, 문서 이동 요청 0건). 클릭 뒤에도 뒤로가 동작해 기록이 살아 있다. 콘솔 오류 없음. (두 영역 안의 클릭 · 제출은 검증 페이지에서 기본 동작을 막음) | `e2e/phase1-guard.spec.ts` |
| QA-32 | §5 실행 가능한 HTML · C5 | 초기 상태 | `<style>p { color: blue }</style>`와 `<link rel="stylesheet" href="x.css">`를 각각 편집창에 친다(Patch 안 함), 같은 글로 Patch | **(C5)** 칠 때: alert 없음, 테스트 영역에 `<style>` · `<link>`가 없고 페이지 모양이 바뀌지 않는다(두 영역 글자 색 그대로). Patch는 `[위험한 코드]`(요소 이름 포함)로 막히고 실제 영역 · 기록 그대로. (페이지에서는 `<style>`이 막히므로 `<style>` 안 글의 짝 검사 · 변환 경계는 단위 테스트로만 확인) | `e2e/phase1-guard.spec.ts` |
| QA-33 | P1-28 · P1-29 · §5 오류 · C2 | Patch 한 번 한 상태(S1), 실제 영역의 `<p>`를 페이지 안에서 바깥으로 뗀다 | (a) 뒤로. (b) 복구 뒤 다시 뒤로 → 초기 상태에서 `<p>`를 떼고 (c) 앞으로 | **(C2)** `[Patch 오류]` alert가 한 번 뜬다(뒤로 · 앞으로 모두). 확인 뒤 실제 영역이 지금 기록의 VNode 상태로 다시 그려지고, 편집창 글 · 테스트 영역은 그대로이며, 기록은 움직이지 않아 이어서 정상 뒤로 · 앞으로가 된다 (Dev-18에서 추가) | `e2e/phase1-history.spec.ts` |

## 공격적 시나리오

| QA | 시나리오 | Then | 덮는 것 | 스펙 파일 |
| --- | --- | --- | --- | --- |
| QA-A1 | 특수문자: `<p>&lt;b&gt;굵게 아님&lt;/b&gt; &amp;amp; 😀</p>`를 편집창에 넣고 Patch | 실제 영역 글자가 `<b>굵게 아님</b> &amp; 😀`이고 `<b>` 요소가 없다. 뒤로 → 앞으로 해도 편집창 · 영역이 같다 | P1-02 · T-01 · T-07 | `e2e/phase1-attack.spec.ts` |
| QA-A2 | 연타: Patch 5회 연타(첫 번째만 변경, 나머지는 무변경), 뒤로 연타 10회, 앞으로 연타 10회 | 콘솔 오류 · 경고 없음. 끝난 뒤 세 칸이 일치. 뒤로를 누른 만큼만 이동(경계에서 멈춤) | P1-25 · P1-28 · P1-29 · §3.3 경계 · 무변경 | `e2e/phase1-attack.spec.ts` |
| QA-A3 | 빈 입력: 편집창을 비우고 Patch, 이어서 뒤로 | 비움은 허용(최상위 0개): 실제 영역 · 테스트 영역이 빈 상태, 오류 없음. 뒤로 하면 이전 샘플 상태로 복귀하고 편집창에 글이 다시 채워진다 | §5 빈 트리 · 빈 입력 · P1-30 | `e2e/phase1-attack.spec.ts` |
| QA-A4 | 새로고침: Patch 한 뒤 새로고침 | 초기 샘플로 다시 뜬다. 뒤로가 무시된다(기록이 비어 있음). 콘솔 오류 · 경고 없음 | P1-20 · §3.3 초기 상태 | `e2e/phase1-render.spec.ts` |
| QA-A5 | 들여쓰기만 변경: `<li>` 앞 공백을 바꾸고 Patch | 공백 글자가 실제 영역에 그대로 반영된다(공백도 노드). 요소는 같은 참조 | §5 공백 · P1-06 · P1-18 | `e2e/phase1-attack.spec.ts` |
| QA-A6 | 주석: 주석 글 수정 → Patch, 주석 삭제 → Patch, 새 주석 추가 → Patch | 실제 영역의 주석 노드가 편집창과 같다 (경로가 주석 번호를 센다) | §5 주석 · P1-06 · P1-10 · P1-11 | `e2e/phase1-attack.spec.ts` |
| QA-A7 | 복수 루트 · 0개: `<section>`을 `<p>a</p><p>b</p>` 두 개로 바꾸고 Patch → 뒤로 | 최상위가 두 개인 상태가 반영되고 뒤로 하면 `<section>` 하나로 복귀 (영역 상자 자체는 비교 안 함) | §5 단일 · 복수 루트 · P1-12 · P1-14 | `e2e/phase1-attack.spec.ts` |
| QA-A8 | boolean 속성: `<button disabled>`에서 `disabled`를 지우고 Patch → 다시 넣고 Patch | 속성이 사라지고 다시 `""`로 생긴다. `<button>`은 같은 참조(교체 안 함) | §5 boolean · P1-08 · P1-09 · T-06 | `e2e/phase1-attack.spec.ts` |
| QA-A9 | style 항목: `style="color: red; font-size: 16px"`에서 `font-size`만 바꾸고 Patch → `color` 항목 삭제 → Patch. 별도 판으로 `foo: bar`(브라우저가 버리는 모르는 항목)를 추가하고 Patch | 바뀐 항목만 바뀐다(다른 항목 그대로). `<p>`는 같은 참조. 마지막 항목까지 지우면 `style`이 없어진다. **(A4) `foo: bar`는 `el.style.cssText`에는 안 보여도 `style` 속성 글을 쪼갠 항목 집합에서 실제 영역과 테스트 영역이 같다** | §5 style · P1-08 · P1-09 · T-06 · A4 | `e2e/phase1-attack.spec.ts` |
| QA-A10 | 검사 알림 뒤 복구: 짝이 틀린 글로 Patch(alert) → 글을 고치고 다시 Patch | 첫 번째는 막히고(실제 영역 · 기록 그대로), 고친 뒤엔 정상 반영되어 기록이 한 칸만 늘어난다 | §5 오류 복구 · §6.2 | `e2e/phase1-attack.spec.ts` |
| QA-A11 | 경계에서 미저장 편집 유지: 처음 상태에서 편집창에 글을 치고 뒤로를 누름 | 이동이 없으므로(무시) 친 글 · 미리보기가 그대로 남는다 | §3.3 경계 · 미저장 편집 | `e2e/phase1-attack.spec.ts` |
| QA-A12 | Patch 도중 예외(C2): 페이지 안에서 실제 영역의 `<ul>`을 바깥에서 뗀 다음(경로가 사라짐) 편집창에서 `<li>` 글자 · `<p>` 글자를 고쳐 Patch. 이어서 같은 편집으로 다시 Patch | **(C2 · B22)** `[Patch 오류]` alert가 한 번 뜬다. 확인 뒤 실제 영역이 마지막 기록(초기 샘플)의 VNode 상태로 다시 그려져 `<ul>`도 돌아와 있고(적용되다 만 `<p>` 글자 변경도 되돌려짐, 이 복구에서만 영역을 다시 그림), 기록은 그대로(뒤로 무시 · 기록 안 늘어남), 편집창 글 · 테스트 영역은 친 그대로다. 다시 Patch하면 정상 반영되고 기록이 정확히 한 칸 늘어난다. 콘솔 오류 없음(예외는 페이지가 잡아 alert로만 알림) | §5 오류 · 복구 · §6.2 · C2 | `e2e/phase1-guard.spec.ts` (Dev-17에서 작성, 공격 시나리오지만 alert 시나리오라 guard 스펙에 둠) |

## 필수 확인 (이 task)
- [ ] Diff 기본 케이스 D-01 ~ D-05: QA-2 ~ QA-6
- [ ] History 동기화: Patch 2회 이상 → 뒤로 → 앞으로, 편집창 · 테스트 영역 · 실제 영역 일치: QA-11 · QA-15
- [ ] 무변경(T-04) · 부분 갱신(T-06): QA-8 · QA-9 · QA-A8 · QA-A9. **부분 갱신을 `MutationObserver` 숫자로 증명(우선순위 1): QA-2 · QA-9 · QA-11 (B1 · B2 · B3)**
- [ ] 경계 · 갈림길 · 미저장 편집: QA-12 · QA-13 · QA-14 · QA-A11
- [ ] Patch 때 검사 alert (위험 코드 · 짝 · 구조 · SVG) + 미리보기 무실행: QA-16 ~ QA-21
- [ ] 보안 · 페이지 보호(우선순위 2): QA-29(iframe · object · embed) · QA-30(숨긴 `javascript:`) · QA-31(링크 · 폼 기본 동작 막기) · QA-32(`<style>` · `<link>`)
- [ ] 오류 복구: QA-A10(검사 알림 뒤) · QA-A12(Patch 도중 예외)
- [ ] 편집창 왕복 · 다양한 태그 · 표(우선순위 3): QA-23 ~ QA-28
- [ ] 공통 확인: 모든 스펙에서 콘솔 error 0건 · 선언 없는 dialog는 실패 (A5)
- [ ] desktop · mobile 캡처 (`04_qa_evidence/screenshot_NN_<desktop|mobile>.png`)
- [ ] (확장) 시각화 스위치: QA-22. 확장을 미루면 "제외 이유"를 기록하고 해당 없음 처리하지 않는다
- 화면에서 못 덮는 것(단위 테스트로만): 보관 한도 50(한도 근처 갈림길 B17 포함), Key 비교(화면에는 key 없음), 깊이 300 · 형제 2,000 트리(B20), `<style>` 안 글의 짝 검사 · 변환(B16 · B18, 페이지에서는 C5로 막힘), 인접 글자 노드(B19), style 경계(B21) — `dev_todo.md` Dev-1 · 4 · 6 · 7 · 10 · 11 · 12 · 13 · 21 ~ 23
