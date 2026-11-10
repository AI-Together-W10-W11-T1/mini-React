# dev_todo: phase1

- 명세: `../01_request_spec.md` · 브랜치: `feature/phase1`
- 테스트 케이스 확인 반영: `../02_planning_review/02_user_test_case_review.md`의 A1~A5 · B1~B22 · C1~C5 (대조표는 `../02_planning_review/03_worker_revised.md`)
- 규칙: 항목 하나 = 커밋 하나 (`<type>(<package>): <요약> (Dev-N)`, push 없음). 체크할 때 완료 근거 필수 (근거 없는 체크는 무효, 실제로 돌린 명령과 결과만 적는다)
- 순서: **필수 Dev-1 ~ Dev-20을 앞에, 확장 Dev-21 ~ Dev-26을 맨 뒤에** (확장 순서 = Key 비교 Dev-21 ~ 23 → Diff 시각화 Dev-24 ~ 26). 늦어지면 확장을 뒤(Dev-26)부터 미루고 이유를 기록한다. 그래도 늦으면 검사기(Dev-10)를 줄일지 사용자에게 묻는다
- 하는 방식: 화면에 보이는 Dev(14 · 15 · 16 · 17 · 18 · 19 · 20 · 26)는 `e2e/*.spec.ts`를 먼저 쓰고 실패를 확인한 뒤(`mini-react-kit:atdd-acceptance`), 안쪽 단위 테스트는 실패 테스트 → 최소 구현 → 리팩터(`mini-react-kit:test-driven-development`)
- 인수 시나리오는 `../04_qa_evidence/qa_todo.md`의 QA 번호로 가리킨다
- 번호 바뀜(초안 → 이 문서): 초안 Dev-17(뒤로 · 앞으로) → **Dev-18**, 초안 Dev-18(공격적 모음) → **Dev-20**, 초안 Dev-19 ~ 24(확장) → **Dev-21 ~ 26**. 새로 생긴 것: **Dev-17**(페이지 보호 · 오류 복구), **Dev-19**(편집창 왕복 · 다양한 태그 e2e). Dev-1 ~ 16은 번호 그대로

## 시간이 모자랄 때 먼저 할 순서 (테스트 케이스 확인 B1 ~ B22)

사용자 결정: **B1~B3(부분 갱신 숫자 증명) → B11~B13(보안 · 페이지 보호) → 나머지**. 시간이 모자라면 아래 순서대로 남기고, 3순위부터 뒤로 미룬다 (미룬 이유는 기록). B 항목은 "테스트를 더하는 것"이라 Dev를 통째로 빼지 않고, 그 Dev의 해당 테스트 케이스만 미룰 수 있다. 단 **C1 ~ C5는 구현 결정이라 미루지 않는다** (C3 · C5 = Dev-8 · 9, C1 = Dev-10, C2 = Dev-12 · 13 · 17, C4 = Dev-17).

| 순위 | B 번호 | 내용 | 들어 있는 Dev (QA) |
| --- | --- | --- | --- |
| 1 | B1 · B2 · B3 | `MutationObserver` 숫자로 부분 갱신 증명 | Dev-14(헬퍼 `observeMutations`) · Dev-15(QA-2 · QA-9) · Dev-18(QA-11) |
| 2 | B11 · B12 · B13 | srcdoc iframe · 숨긴 `javascript:` · 링크 · 폼 기본 동작 막기 | Dev-8 · 9(단위, C3) · Dev-16(QA-29 · QA-30) · Dev-17(QA-31, C4) |
| 3 | B7 | Patch 뒤 편집창 글 그대로 | Dev-15(QA-2에 덧붙임) |
| 3 | B4 · B5 · B6 · B8 · B9 · B10 | 편집창 왕복 · 다양한 태그 | Dev-19(QA-23 ~ QA-28) — 통째로 미룰 수 있음 |
| 3 | B14 · B15 · B16 | 검사기 오탐 없음 | Dev-10(단위) |
| 3 | B17 · B22 | History 한도 근처 갈림길 · Patch 도중 예외 | Dev-11 · Dev-12(단위) |
| 3 | B18 · B19 · B20 · B21 | 변환기 · 깊은 트리 · style 경계 | Dev-1 · Dev-4 · Dev-6 · Dev-7(단위) |

## 공통 약속 (모든 Dev에 적용)

- **패키지 경계**: DOM(`document` · `window` · `Element` …)은 `react-dom-bindings`에서만 만진다. `react-reconciler`의 `diff`는 DOM 없이 `AreaChildren` 두 개를 받아 `Patch[]`만 돌려준다. History(양방향 연결 리스트)는 `react-dom`. 페이지 연결 · 오버레이 그리기 · 링크 · 폼 기본 동작 막기는 `fixtures/phase1-vdom-playground`
- **`types.ts` · `h()`는 고치지 않는다.** 바꿔야 할 것 같으면 `BLOCK:SPEC_GAP`. `packages/react`는 이번 task에서 코드를 바꾸지 않고 Key 단위 테스트용 VNode를 만드는 데만 쓴다
- **경로 규칙**: 영역 상자 안 자식부터, 공백 · 주석도 번호를 차지(VNode 번호 = DOM `childNodes` 번호)
- **patch 순서 규칙(알고리즘 결정 3 · 4)**: 목록은 순서대로 하나씩 적용하고 경로는 그 순간의 트리 기준. 그래서 `diff`는 같은 부모의 자식에서 ① 겹치는 자리부터 재귀 → ② 남는 옛 자식은 **뒤에서부터** REMOVE → ③ 남는 새 자식은 **앞에서부터** INSERT 순서로 낸다
- **역패치**: 전후 뒤집기 + 역순. `HistoryEntry.inverse`는 이미 역순이므로 그대로 순서대로 적용
- **속성 값 정규화(diff · renderVNode · patch 공통)**: 문자열 · 숫자 → 문자열, `true` → `""`, `false` · `null` · `undefined` → 속성 없음. 함수 · 객체(`style` 제외)는 Phase 1에서 속성으로 안 다룬다 (이벤트는 phase2)
- **style 해석(`client/style.ts`)**: `style` 속성 글을 직접 쪼갠다 (`;`로 나누되 괄호 · 따옴표 · `/* … */` 주석 안은 제외, 첫 `:`로 이름 · 값, 이름은 소문자(`--` 시작은 그대로), 값은 앞뒤 공백만 제거하고 `!important` · 값 안 주석은 값의 일부로 그대로 둠, 값이 빈 항목(`color:`)은 버림(브라우저도 버림), 끝 `;` 여러 개 · 빈 조각은 무시, 같은 이름은 뒤가 이김). 쓸 때는 `이름: 값; 이름: 값`. 브라우저 CSSOM(`el.style`)으로 읽지 않는다 (축약형 `background`가 11개 낱개로 풀리고 모르는 항목이 사라져 VNode와 DOM이 어긋남 — jsdom에서 확인). 항목이 하나도 없으면 `style` props를 두지 않는다 (B21)
- **미리보기에서 빼고 Patch 때 막는 목록(C3 · C5 포함, `sanitize.ts`의 `scanDangerous`가 단 하나의 기준)**: `on…` 속성 · `<script>` · `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`(`rel` 값을 공백으로 쪼갠 낱말 중 `stylesheet`가 있으면 해당, 대소문자 무시) · `javascript:` 주소(`href` · `src` · `action` · `formaction`). **`javascript:` 판정은 브라우저가 글을 읽은 뒤의 값으로 한다**: 문자 참조(`jav&#x61;script:`)는 이미 풀려 있고, 값 앞의 공백 · 제어문자를 자르고 값 안의 탭 · 줄바꿈을 지운 뒤 소문자로 비교 (B12). 문제 종류는 기존 `DANGEROUS` 하나로 묶고 알림 글에 요소 · 속성 이름을 적는다
- **검사기 구조 비교 예외(C1)**: 엔진이 훑은 구조에는 없는데 브라우저가 `<table>` 안에 `<tbody>`를 **자동으로 끼워 넣은 경우만** 같은 것으로 본다(그 `<tbody>`의 자식을 `<table>`의 자식으로 놓고 비교). `<tr>` · `<tbody>` 이외의 자동 보정(`<table><td>`의 `<tr>` 자동 추가, `<p><div>` 등)은 그대로 `STRUCTURE`
- **Patch 도중 예외 복구(C2)**: `patch` 적용 중 예외(경로가 없는 DOM 등)가 나면 `createVDomRoot`는 ① 기록(History)은 그대로 둔다(새 기록을 붙이지 않고 current도 안 움직임) ② 실제 영역을 **지금(current) 기록의 VNode로 다시 그린다**(`renderAreaChildren`) ③ 원래 예외를 다시 던진다. 페이지(fixture)가 받아서 `[Patch 오류]` alert. 영역을 통째로 다시 그리는 것은 **이 오류 복구 때만** 허용 (`// [AI Note]`로 남김). `update` · `back` · `forward` 모두 같은 규칙
- **공개 API 이름(초안, Dev가 바꾸면 이 표와 `qa_todo`의 화면 약속을 함께 고침)**

| 패키지 | 이름 |
| --- | --- |
| `react-dom-bindings` | `renderVNode(vnode)`, `renderAreaChildren(area, children)`, `domToVNode(node)`, `readAreaChildren(area)`, `patch(area, patches, observer?)`, `vnodesToHtml(children)`, `setAreaHtml(area, html)`, `checkHtml(html)` → `HtmlProblem[]`, `formatProblems(problems)` |
| `react-reconciler` | `diff(oldChildren, newChildren)` → `Patch[]`, `invertPatches(patches)` → `Patch[]` |
| `react-dom` | `History`(연결 리스트), `createVDomRoot(realArea, options?)` → `{ snapshot(), update(next), back(), forward() }` |

- **화면 약속(fixture ↔ e2e, Dev-14에서 확정)**: `data-testid` = `real-area` · `test-area` · `html-editor`(textarea) · `btn-patch` · `btn-back` · `btn-forward` · `viz-toggle`(확장) · `viz-overlay`(확장). 눈에 보이는 이름표 "실제 영역" · "테스트 영역". 확장에서 `viz-overlay`에 `data-last-patch-count`(마지막 동작의 patch 개수, 스위치와 무관하게 남김) · `data-last-flash-count`(그린 깜빡임 상자 수, 꺼져 있으면 0)
- **e2e 공통 장치(A4 · A5, Dev-14의 `e2e/phase1-helpers.ts`가 만들고 모든 스펙이 이것을 씀)**:
  - `test`(Playwright `test.extend`): 자동 장치 둘. ① **dialog 감시** — alert · confirm · prompt는 시나리오가 `captureAlert(page, 동작)`으로 미리 선언한 것만 허용하고, 선언 없이 뜨면 닫은 뒤 **테스트 실패**(Playwright가 예상 못 한 alert를 조용히 닫아 버리는 것을 막음, A5) ② **콘솔 감시** — `console.error` · `pageerror`가 한 건이라도 있으면 **모든 스펙의 모든 테스트가 실패**(A5). QA-1 · QA-A2 · QA-A4는 추가로 경고(`warning`)도 0건
  - `structureOf(영역)` · `structureOfHtml(글)`: 요소 태그 · 속성 · 글자(공백 포함) · 주석을 번호 순서대로. **속성은 이름 → 값 집합으로 비교(순서 무시)**, **`style`은 `el.style.cssText` 비교 + `getAttribute('style')` 글을 엔진의 `parseStyleText`(DOM 없는 순수 함수, 상대 경로 import)로 쪼갠 항목 집합 비교**(브라우저가 모르는 항목을 버려서 둘이 같아 보이는 경우를 잡음, A4)
  - `holdNodes` · `sameNode`(`window.__keep`으로 참조 유지 확인), `observeMutations(영역)`(`MutationObserver`를 심고 종류별 개수 · target 태그를 요약: `characterData` · `attributes` · `childList`, B1 ~ B3 · QA-8), `edit(page, fn)`(편집창 글을 읽어 일부만 바꿔 다시 채움)
- **실제 영역 초기 샘플(Dev-14, `index.html`에 직접 써 둠, P1-20)**:
  ```html
  <section id="card" class="card">
    <h2>제목</h2>
    <!-- 안내 문구 -->
    <p class="note" style="color: red; font-size: 16px">안녕</p>
    <ul>
      <li>하나</li>
      <li>둘</li>
      <li>셋</li>
    </ul>
    <button disabled>잠김</button>
  </section>
  ```
- **Patch 때 검사 알림 문구(Dev-9 · 10에서 확정, `qa_todo`가 이 말마디로 확인)**: 문제 한 줄 = `[위험한 코드] …` · `[태그 짝] …` · `[구조 불일치] …` · `[SVG 미지원] …`, 마지막 줄 "다시 작성해 주세요." 문제가 여러 개면 한 번의 alert에 모두 담는다. `<iframe>` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`는 `[위험한 코드]` 줄에 요소 이름을 적는다. **Patch 도중 예외(C2)는 별도 말마디 `[Patch 오류]`**(Dev-17): "실제 영역을 마지막 기록 상태로 되돌렸습니다" 안내 포함

## Dev 항목 — 필수

- [x] **Dev-1** (`react-dom-bindings`): `renderVNode`가 주석 · style(StyleMap)을 그리고, 영역 상자 안을 통째로 그리는 `renderAreaChildren`을 추가한다 [P1-05 · T-02 · B21]
  - 의존: 없음
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/renderVNode.ts`(주석 분기 `createComment`, `style` 객체 → 속성 글, `renderAreaChildren`), `packages/react-dom-bindings/src/client/style.ts`(`parseStyleText` · `styleMapToText`), `packages/react-dom-bindings/src/index.ts`(내보내기), `packages/shared/src/__tests__/helpers.ts`(테스트용 `comment()` 추가)
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/renderVNode.test.ts`(고침) — 주석 VNode → Comment 노드, `style` StyleMap → 속성 글(경고 없음, 기존 "객체 props 경고" 테스트는 `style` 아닌 객체만 경고하도록 고침), `renderAreaChildren`(여러 개 · 0개 · 공백 텍스트 유지) / `packages/react-dom-bindings/src/client/__tests__/style.test.ts`(새로) — 쪼개기(세미콜론 · `url(data:…;…)` · 따옴표 · 대문자 이름 · 같은 이름 · 빈 글), 다시 쓰기, **경계(B21): `!important`(값의 일부로 유지) · 값 안 주석 `/* ; */`(주석 안 `;`로 쪼개지 않음) · 끝 `;` 여러 개(`a:b;;;`) · 빈 값 `color:`(항목으로 안 남김) · 빈 값 뒤에 정상 항목이 이어지는 경우** (T-02 · P1-05)
  - 알고리즘: 공백 · 주석 유지(결정 5) · 영역 상자 = 보이지 않는 감싸개(§5)
  - 완료 근거로 남길 것: `renderVNode.test.ts` · `style.test.ts` 통과 개수, 기존 UT 4+6건이 그대로 통과(경고 테스트만 수정), `npx tsc --noEmit` 0
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/renderVNode.ts`(주석 분기 `createComment`, `style` 객체 → 속성 글, `renderAreaChildren`), `packages/react-dom-bindings/src/client/style.ts`(`parseStyleText` · `styleMapToText`), `packages/react-dom-bindings/src/index.ts`(내보내기), `packages/shared/src/__tests__/helpers.ts`(`comment()`)
    - 테스트: `style.test.ts` 18건 통과(쪼개기 · 다시 쓰기 · B21 경계 `!important` / 값 안 주석 `/* ; */` / 끝 `;;;` / 빈 값 `color:` / 빈 값 뒤 정상 항목), `renderVNode.test.ts` 21건 통과(기존 4+6건 유지, "객체 props 경고"는 `style` 아닌 객체(`data`)만 경고하도록 수정, 주석 · style · `renderAreaChildren` 추가). 먼저 모듈이 없는 상태에서 두 파일이 실패하는 것을 확인한 뒤 구현
    - 실행: `npx vitest run` 3 files · 46 passed, `npx tsc --noEmit` 오류 0, 커밋 ea9b0d8

- [x] **Dev-2** (`react-dom-bindings`): `domToVNode` · `readAreaChildren` — 요소 · 텍스트(공백 포함) · 주석 · 속성 · boolean · style · 중첩을 VNode로 [P1-01 ~ P1-04 · P1-20 · P1-23 · T-01]
  - 의존: Dev-1 (`style.ts`, 되돌려 그리는 비교용 `renderVNode`)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/domToVNode.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/domToVNode.test.ts` — 요소 태그 · 중첩 · 형제 순서(P1-01 · 04), 텍스트와 글자 사이 위치(P1-02), 속성 이름 · 값(P1-03), 공백 텍스트 · 주석을 번호 그대로 남김, boolean 속성 = 값 `""`, `style` → StyleMap(빈 style은 props 없음), 영역 상자 안 자식 목록(여러 개 · 하나 · 0개, 영역 상자 자신의 속성은 읽지 않음), 특수문자 텍스트, DOM → VNode → DOM 되돌려 그린 결과가 원본과 같음 (T-01 · T-02)
  - 알고리즘: 결정 1 B · 결정 5 B · §5 boolean · style · 단일 · 복수 루트
  - 완료 근거로 남길 것: `domToVNode.test.ts` 통과 개수, 샘플 HTML(위 샘플)을 읽은 VNode 요약 1건
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/domToVNode.ts`(`domToVNode` · `readAreaChildren` · 속성 읽기, `style`은 `parseStyleText`로 StyleMap, 빈 style은 props 없음), `packages/react-dom-bindings/src/index.ts`(내보내기)
    - 테스트: `domToVNode.test.ts` 24건 통과 (태그 · 중첩 · 형제 순서 · 글자 사이 위치 · 속성 · boolean `""` · style StyleMap · 공백 텍스트 · 주석 · 번호 일치 · 영역 상자 0 · 1 · 여러 개 · 상자 자신 속성 안 읽음 · 특수문자 · DOM → VNode → DOM 왕복). 모듈이 없는 상태에서 실패하는 것을 먼저 확인
    - 샘플 HTML 읽은 VNode 요약(테스트 "샘플 HTML을 읽은 VNode (요약)"): `section{id:card,class:card}` 자식 종류 = `#text, h2, #text, #comment, #text, p{class:note, style:{color:red,font-size:16px}}, #text, ul, #text, button{disabled:""}, #text` (11개)
    - 실행: `npx vitest run` 4 files · 70 passed, `npx tsc --noEmit` 오류 0, 커밋 7e744c4

- [x] **Dev-3** (`react-reconciler`): `diff` 기본 — 글자 · 주석 글 · 속성 추가 · 수정 · 삭제 · style 항목 · 교체 · 무변경 (자식은 같은 길이까지) [P1-06 ~ P1-09 · P1-12 · P1-13 · P1-33 · T-03 · T-04]
  - 의존: 없음 (DOM 없이 VNode만)
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`, `packages/react-reconciler/src/index.ts`(새로), `packages/react-reconciler/src/__tests__/applyPatches.ts`(**테스트 전용 검산기**: VNode 목록에 patch를 순서대로 적용해 새 VNode 목록을 만든다. MOVE 포함 7종)
  - 테스트: `packages/react-reconciler/src/__tests__/diff.test.ts` — D-01 글자(SET_TEXT) · 주석 글 · D-02 속성 추가 / 수정 / 삭제(SET_ATTR before · after null) · boolean 속성 켜기 · 끄기(교체 아님) · style 항목 추가 / 수정 / 삭제(SET_STYLE) · D-05 태그가 다르면 REPLACE(before · after 통째) · 글자 ↔ 요소 ↔ 주석 종류가 다르면 REPLACE · 같은 입력이면 빈 목록(T-04) · 입력 VNode를 고치지 않음(깊은 얼림) · `applyPatches(old, diff(old, new))`가 new와 같음 (T-03 · T-04)
  - 알고리즘: 결정 2 (필수: 위치 기반) · 결정 3 A · 결정 4 A
  - 완료 근거로 남길 것: `diff.test.ts` 통과 개수, D-01 ~ D-05 중 D-01 · D-02 · D-05가 이 Dev에서 통과함을 테스트 이름으로 표시
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-reconciler/src/diff.ts`(`diff` · `diffNode` — TEXT/COMMENT 분기 SET_TEXT, 속성 · style 항목 비교, 종류 · 태그가 다르면 REPLACE, 자식은 겹치는 길이까지만), `packages/react-reconciler/src/index.ts`(새로, `diff` 내보내기), `packages/react-reconciler/src/__tests__/applyPatches.ts`(테스트 전용 검산기, MOVE 포함 7종 + `normalizeTree`)
    - 테스트: `diff.test.ts` 30건 통과 (`npx vitest run packages/react-reconciler`). 모듈이 없는 상태에서 실패하는 것을 먼저 확인. 이 Dev에서 통과한 기본 케이스: `D-01 글자가 바뀌면 SET_TEXT 한 줄`, `D-01 중첩 안의 글자`, `D-02 속성 추가 · 수정 · 삭제`, `D-05 태그가 다르면 REPLACE`, `D-05 중첩 안의 교체`, `글자 ↔ 요소 ↔ 주석 종류가 다르면 REPLACE`, `같은 입력이면 빈 목록 (P1-13)`, `입력 VNode를 고치지 않는다(깊게 얼린 입력)`, 모든 `run()` 테스트가 `applyPatches(old, diff(old, new))`가 new와 같음을 함께 확인
    - 실행: `npx vitest run` 5 files · 100 passed, `npx tsc --noEmit` 오류 0, 커밋 d88c6e4

- [x] **Dev-4** (`react-reconciler`): `diff` 자식 추가 · 삭제 · 중첩 · 복합 — 길이가 다른 자식 목록(INSERT 앞에서 · REMOVE 뒤에서) [P1-10 · P1-11 · P1-14 ~ P1-16 · T-03 · T-05 · B20]
  - 의존: Dev-3
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`
  - 테스트: `packages/react-reconciler/src/__tests__/diff.test.ts` — D-03 끝에 추가 · D-04 끝 삭제(REMOVE의 node = 원본 통째) · 여러 형제 한꺼번에 삭제(경로가 뒤에서부터) · 여러 개 한꺼번에 추가(앞에서부터) · 가운데 형제 삭제는 위치 비교 결과(뒤 형제 글자 바꾸기 + 마지막 REMOVE)가 되어도 최종 결과가 목표와 같음 · 중첩 3단계 안의 변경 · 삭제와 수정이 함께 있을 때 다른 노드를 잘못 건드리지 않음 · 복합(글자 + 속성 + 추가 + 삭제 + 교체 동시) · 빈 목록 ↔ 여러 개 · 경로가 공백 · 주석 번호를 센다 · 무작위(고정 씨앗) 트리 쌍 200개에서 `applyPatches(old, diff(old, new))`가 new와 같음 (T-03 · T-05) · **깊은 트리 · 넓은 트리(B20): 깊이 300 중첩의 맨 아래 글자 바꾸기 · 형제 2,000개에서 끝에 추가 / 전부 삭제가 스택 넘침 없이 끝나고 `applyPatches` 결과가 목표와 같음(시간 제한은 걸지 않음)**
  - 알고리즘: 결정 2 (위치 기반: 남으면 추가 · 삭제) · 결정 4 A (그 순간 기준 경로)
  - 완료 근거로 남길 것: `diff.test.ts` 통과 개수, D-03 · D-04 · T-05 해당 테스트 이름, 무작위 200쌍 통과, 깊이 300 · 형제 2,000 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-reconciler/src/diff.ts`(`diffChildren`에 ② 남는 옛 자식 뒤에서부터 REMOVE → ③ 남는 새 자식 앞에서부터 INSERT 추가), `packages/react-reconciler/src/__tests__/diff.test.ts`(Dev-4 테스트 추가), `packages/react-reconciler/src/__tests__/randomTree.ts`(테스트 전용 고정 씨앗 무작위 트리 · 변형 생성기, Dev-5도 재사용)
    - 테스트: `diff.test.ts` 45건 통과 (`npx vitest run packages/react-reconciler`). INSERT 케이스가 없는 상태(Dev-3 구현)에서 "형제 2,000개 끝에 추가"가 실패하는 것을 먼저 확인한 뒤 구현
    - 테스트 이름: `D-03 끝에 노드 추가`, `D-04 끝 노드 삭제: REMOVE의 node는 원본 VNode 통째`, `여러 형제를 한꺼번에 삭제하면 경로가 뒤에서부터`, `여러 개를 한꺼번에 추가하면 경로가 앞에서부터`, `가운데 형제를 지우면 위치 비교 결과(…)지만 최종 결과는 목표와 같다`, `삭제와 수정이 함께 있어도 다른 노드를 잘못 수정하지 않는다`, `중첩 3단계 안의 변경이 올바른 대상에 반영된다`, `복합 변경: 글자 + 속성 + 추가 + 삭제 + 교체가 한꺼번에 (P1-15 · T-05)`, `경로가 공백 글자 · 주석 번호를 센다`, `빈 목록 ↔ 여러 개`
    - 무작위 200쌍: `무작위(고정 씨앗) 트리 쌍 200개에서 applyPatches(old, diff(old, new))가 new와 같다 (T-03 · T-05)` 통과 (씨앗 20261111, 100쌍 독립 생성 + 100쌍 변형)
    - B20: `깊이 300 중첩의 맨 아래 글자 바꾸기가 스택 넘침 없이 끝난다 (B20)`(경로 길이 302), `형제 2,000개에서 끝에 추가 · 전부 삭제가 끝나고 결과가 목표와 같다 (B20)` 통과
    - 실행: `npx vitest run` 5 files · 115 passed, `npx tsc --noEmit` 오류 0, 커밋 ca7e230

- [x] **Dev-5** (`react-reconciler`): `invertPatches` — 전후 뒤집기 + 역순 (역패치) [P1-26 · T-08]
  - 의존: Dev-3 (`applyPatches` 검산기 · patch 종류)
  - 만들 · 고칠 파일: `packages/react-reconciler/src/invertPatches.ts`, `packages/react-reconciler/src/index.ts`
  - 테스트: `packages/react-reconciler/src/__tests__/invertPatches.test.ts` — 종류별 뒤집기(SET_TEXT · SET_ATTR · SET_STYLE는 before ↔ after, INSERT ↔ REMOVE는 같은 경로 · 같은 node, REPLACE는 before ↔ after, MOVE는 from ↔ to), 순서가 뒤집힘, 두 번 뒤집으면 원래 목록, 입력 목록을 고치지 않음, `applyPatches(new, invert(diff(old, new)))`가 old와 같음 (Dev-4의 무작위 200쌍 재사용) (T-08)
  - 알고리즘: 되돌리는 순서 = 역순 (결정 7 세부)
  - 완료 근거로 남길 것: `invertPatches.test.ts` 통과 개수, 무작위 200쌍 왕복 통과
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-reconciler/src/invertPatches.ts`(`invertPatches` — 종류별 전후 뒤집기 + `reverse()`), `packages/react-reconciler/src/index.ts`(내보내기)
    - 테스트: `packages/react-reconciler/src/__tests__/invertPatches.test.ts` 13건 통과 (`npx vitest run packages/react-reconciler/src/__tests__/invertPatches.test.ts`). 모듈이 없는 상태에서 실패하는 것을 먼저 확인. 종류별 뒤집기 6건(SET_TEXT · SET_ATTR · SET_STYLE · INSERT↔REMOVE · REPLACE · MOVE), 순서 뒤집힘, 두 번 뒤집으면 원래 목록, 입력을 고치지 않음(깊게 얼림), 빈 목록, 손으로 쓴 변경 왕복, MOVE 왕복
    - 무작위 200쌍 왕복: `무작위(고정 씨앗) 트리 쌍 200개에서 applyPatches(new, invert(diff(old, new)))가 old와 같다 (왕복)` 통과 (Dev-4와 같은 `randomTree.ts` 재사용, 앞으로 적용 결과가 new인 것도 함께 확인)
    - 실행: `npx vitest run` 6 files · 128 passed, `npx tsc --noEmit` 오류 0, 커밋 f9a897e

- [x] **Dev-6** (`react-dom-bindings`): `patch` — 경로 + 순서대로 하나씩 실제 DOM에 반영 (SET_TEXT · SET_ATTR · SET_STYLE · INSERT · REMOVE · REPLACE) [P1-34 · P1-13 · P1-17 · P1-18 · T-03 · T-04 · T-06 · B20]
  - 의존: Dev-1 (INSERT · REPLACE가 `renderVNode` 사용), Dev-2 (결과를 `domToVNode`로 비교), Dev-4 (diff 결과 모양 확인)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/patch.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/patch.test.ts` — 손으로 쓴 Patch 목록으로: 종류별 반영(D-01 ~ D-05), 글자 노드의 `nodeValue`만 바꿈(노드 참조 유지), 속성 추가 / 수정 / 삭제 · boolean(`""`) · style 항목별(다른 항목 유지, 마지막 항목을 지우면 `style` 속성도 제거), 경로가 영역 상자 안 자식부터이고 공백 · 주석 번호를 셈, 한 목록 안에서 INSERT(앞에서) · REMOVE(뒤에서)를 순서대로 적용, 빈 목록이면 `MutationObserver` 기록 0건(T-04), 대상 · 부모 · 형제 요소의 참조 유지(T-06 · P1-17 · P1-18), REPLACE는 새 노드로 바뀜(옛 참조 분리), MOVE는 이 Dev에서는 "Key 확장에서 구현" 오류를 낸다(`// [AI Note]`로 표시), 경로가 없으면 분명한 오류(C2 복구의 재료), **깊이 300 중첩 · 형제 2,000개에 `diff` 결과를 적용해도 스택 넘침 없이 끝나고 결과가 목표와 같음(B20)** (T-03 · T-04 · T-06)
  - 알고리즘: 결정 4 A (경로 + 순서대로) · 공백 · 주석 유지 · boolean · style
  - 완료 근거로 남길 것: `patch.test.ts` 통과 개수, `MutationObserver` 0건 테스트 이름, 참조 유지 테스트 이름, 깊이 300 · 형제 2,000 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/patch.ts`(`patch(area, patches)` — SET_TEXT · SET_ATTR · SET_STYLE · INSERT · REMOVE · REPLACE를 경로 + 순서대로 하나씩 적용, MOVE는 "Key 확장(Dev-22)에서 구현" 오류, 경로가 없으면 `경로 [..]에 해당하는 노드가 DOM에 없습니다` 오류), `packages/react-dom-bindings/src/index.ts`(내보내기). 세 번째 인자 `observer?`는 Dev-24(PatchObserver)에서 추가하므로 이 Dev에서는 `patch(area, patches)` 두 인자만 둠
    - 테스트: `packages/react-dom-bindings/src/client/__tests__/patch.test.ts` 31건 통과 (`npx vitest run packages/react-dom-bindings/src/client/__tests__/patch.test.ts`). 모듈이 없는 상태에서 실패하는 것을 먼저 확인
    - MutationObserver 0건: `빈 목록이면 MutationObserver 기록 0건 (T-04, P1-13)` (+ `글자 하나 바꾸기는 기록 1건(characterData)뿐이다`, `속성 하나 바꾸기는 기록 1건(attributes)뿐이다`)
    - 참조 유지: `D-01 SET_TEXT: 글자 노드의 nodeValue만 바꾼다 (노드 참조 유지, P1-06)`, `대상 · 부모 · 형제 요소의 참조가 유지된다`, `추가 · 삭제 때도 관련 없는 형제 노드의 참조가 유지된다`, `일부 변경에서 바뀌지 않는 노드의 참조가 유지된다 (T-06)`, `D-05 REPLACE: 새 노드로 바뀌고 옛 노드는 분리된다`
    - diff 결합 검증: D-01 ~ D-05 · 복합 · 복수 루트 · 0개 · 역패치 왕복, 무작위 200쌍(실제 DOM에 적용 후 `readAreaChildren` 결과가 목표와 같고 역패치로 원래대로)
    - B20: `깊이 300 중첩의 맨 아래 글자 바꾸기가 스택 넘침 없이 끝나고 결과가 목표와 같다 (B20)`, `형제 2,000개에서 끝에 추가 · 전부 삭제가 끝나고 결과가 목표와 같다 (B20)` 통과
    - 실행: `npx vitest run` 7 files · 159 passed, `npx tsc --noEmit` 오류 0, 커밋 0dc2b24

- [x] **Dev-7** (`react-dom-bindings`): `vnodesToHtml` — 저장한 VNode를 편집창에 채울 HTML 글로 [P1-22 · P1-30 · §5 공백 · 주석 · B18 · B19]
  - 의존: Dev-1 (`styleMapToText`), Dev-2 (왕복 검증)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/vnodesToHtml.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/vnodesToHtml.test.ts` — 공백 텍스트 · 줄바꿈 그대로, 주석 `<!--…-->`, 값 있는 속성 `name="value"`(값의 `&` · `"` 이스케이프), boolean `name=""`, style 속성 글, 빈 태그(`br` `hr` `img` `input` …)는 닫는 태그 없음, 텍스트의 `<` `>` `&` 이스케이프(특수문자 `<b>굵게 아님</b> & &amp; 😀`), `pre` · `textarea` 첫 줄바꿈 보존, 0개 · 여러 개 최상위, 왕복(`HTML 글 → 파싱 → domToVNode`가 원래 VNode와 같음: 샘플 · 중첩 · 주석 · 특수문자) / **원문 글 요소(B18, 변환기 견고성 단위 테스트 — 페이지에서는 `<style>`이 C5로 막힘): `<style>` 안의 `a > b` · `&`는 이스케이프하지 않고 그대로 쓰며 왕복해도 같다. `<textarea>` 안은 이스케이프(`&gt;` → 글자 `>`로 읽힘)하는 것과 대비** / **나란히 붙은 글자 노드 두 개(B19): `"a"`, `"b"`는 글 `ab`로 합쳐지므로, 왕복 비교는 인접한 글자 노드를 합친 뒤 비교한다(`mergeAdjacentText` 테스트용 도우미). 무작위 왕복 생성기는 인접 글자 노드를 만들지 않는다. 참고: DOM에서 읽은 VNode에는 인접 글자 노드가 생기지 않는다**
  - 알고리즘: 결정 5 B · 편집창 글 = 스냅샷을 HTML 글로 (명세 4절)
  - 완료 근거로 남길 것: `vnodesToHtml.test.ts` 통과 개수, 샘플 왕복 통과, `<style>` 원문 · 인접 글자 노드 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/vnodesToHtml.ts`(`vnodesToHtml(children)` — 글자 `& < >` 이스케이프, 속성 값 `& "` 이스케이프, 주석, boolean `name=""`, style StyleMap → 속성 글, 빈 태그 닫는 태그 없음, `style` · `script` 등 원문 글 요소 안은 이스케이프 안 함, `pre` · `textarea` 첫 줄바꿈 보존, 컴포넌트 VNode는 오류), `packages/react-dom-bindings/src/index.ts`(내보내기)
    - 테스트: `packages/react-dom-bindings/src/client/__tests__/vnodesToHtml.test.ts` 27건 통과 (`npx vitest run packages/react-dom-bindings/src/client/__tests__/vnodesToHtml.test.ts`). 모듈이 없는 상태(`Failed to resolve import "../vnodesToHtml"`)에서 실패하는 것을 먼저 확인한 뒤 구현
    - 샘플 왕복: `샘플을 읽은 VNode를 글로 쓰고 다시 읽으면 같다`, `샘플은 글로도 원문과 같다 (style 항목 사이 구분자 형식까지)`, `중첩 · 주석 · 최상위 여러 개 · 특수문자가 섞인 입력`, `표 · 목록 · 폼 요소` 통과
    - B18: `<style> 안의 a > b · &는 이스케이프하지 않고 그대로 쓴다`, `<script> 안도 이스케이프하지 않는다`, `<textarea> 안은 이스케이프한다 (&gt; → 글자 > 로 읽힘) — 원문 글 요소와 대비`
    - B19: `글자 노드 "a" · "b"는 글 ab로 합쳐진다`, `왕복 비교는 인접 글자 노드를 합친 뒤 한다 (mergeAdjacentText)`(테스트 파일 안 도우미, 빈 글자 ""도 버림), `DOM에서 읽은 VNode에는 인접 글자 노드가 생기지 않는다`
    - 무작위 왕복 생성기는 이 Dev에서 쓰지 않음(손으로 쓴 왕복 케이스로 대신, 따라서 "생성기가 인접 글자 노드를 만들지 않는다"는 해당 없음)
    - 실행: `npx vitest run` 8 files · 186 passed, `npx tsc --noEmit` 오류 0, 커밋 f7858c2

- [x] **Dev-8** (`react-dom-bindings`): `setAreaHtml` — 편집창 글을 위험한 것을 빼고 미리보기(테스트 영역)에 그린다 [P1-21 · P1-22 · §5 실행 가능한 HTML · C3 · C5 · B11 · B12]
  - 의존: Dev-1 (`renderAreaChildren`), Dev-2 (결과를 `readAreaChildren`으로 확인)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/sanitize.ts`(`scanDangerous(root)` — 위 「미리보기에서 빼고 Patch 때 막는 목록」의 **단 하나의 기준**, 찾아서 알려 주는 함수 + 빼는 함수, Dev-9가 재사용), `packages/react-dom-bindings/src/client/setAreaHtml.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/setAreaHtml.test.ts` — `on…` 속성(대소문자 섞어도) 제거, `<script>` 제거, `javascript:` 주소 제거(앞 공백 · 제어문자 · 대문자 섞어도, `href` · `src` · `action` · `formaction`), **`javascript:`를 숨긴 것(B12): 문자 참조 `jav&#x61;script:` · `&#106;avascript:` · 값 안 탭 · 줄바꿈 `java\tscript:` · 앞 공백 + 대문자 `" JAVA\tscript:"` 모두 `href`가 빠짐**, **`<iframe>`(`srcdoc` 안에 `<script>parent.__pwned=1</script>` 포함 · `src`) · `<object>` · `<embed>` 제거(B11 · C3): 영역에 남지 않고 `window.__pwned`가 정의되지 않음**, **`<style>` · `<link rel="stylesheet">`(`rel="Stylesheet"` · `rel="alternate stylesheet"` 포함) 제거(C5), `<link rel="icon">` 등 다른 `rel`은 그대로 둠**, 나머지 속성 · 구조 · 공백 · 주석 · 인라인 `style` 속성은 그대로, 빈 글 → 영역 비움, 글을 `<template>`로 파싱한 뒤 영역에 옮겨서 **파싱 중에 코드가 실행되지 않음**(`<img src=x onerror=…>`를 넣어도 전역 변수가 안 바뀜), 영역 상자 자신은 그대로, 다시 호출하면 이전 내용이 완전히 바뀜 (§5 실행 가능한 HTML)
  - 알고리즘: §5 실행 가능한 HTML (미리보기는 빼고 그림). 살아 있는 요소에 `innerHTML`로 바로 넣지 않는다 (`<img onerror>`가 파싱 중 실행될 수 있음 → `<template>` 안에서 먼저 정리) `// [AI Note]`
  - 완료 근거로 남길 것: `setAreaHtml.test.ts` 통과 개수, "파싱 중 실행 안 됨" · "srcdoc iframe 제거" · "숨긴 javascript: 제거" 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/sanitize.ts`(`scanDangerous(root)` — 찾기만 함, `DangerousFinding { node, element, attribute, kind }` 문서 순서, 반복문 순회(깊은 트리 안전), 막힌 요소 안쪽은 따로 세지 않음, `<template>` 내용도 훑음 / `removeDangerous(root)` — 속성은 `removeAttribute`, 요소는 `remove`), `packages/react-dom-bindings/src/client/setAreaHtml.ts`(`<template>`에 파싱 → `removeDangerous` → `area.replaceChildren(template.content)`, 영역 상자 자신은 그대로), `packages/react-dom-bindings/src/index.ts`(내보내기: `setAreaHtml` · `scanDangerous` · `removeDangerous` · 타입)
    - 테스트: `setAreaHtml.test.ts` 22건 + `sanitize.test.ts` 12건 = 34건 통과 (`npx vitest run packages/react-dom-bindings/src/client/__tests__/setAreaHtml.test.ts packages/react-dom-bindings/src/client/__tests__/sanitize.test.ts`). 모듈이 없는 상태(`Failed to resolve import`)에서 두 파일 모두 실패하는 것을 먼저 확인한 뒤 구현
    - 테스트 이름: `javascript:를 숨긴 것(B12): 문자 참조 · 탭 · 줄바꿈 · 앞 공백 + 대문자 모두 href가 빠진다`(`jav&#x61;script:` · `&#106;avascript:` · `java	script:` · `java
script:` · `" JAVA	script:"`), `<iframe> 제거 — srcdoc 안에 <script>parent.__pwned=1</script>가 있어도 영역에 안 남고 실행되지 않는다 (B11 · C3)`, `<iframe src> · <object> · <embed> 제거 (C3)`, `<style> 제거 (C5)`, `<link rel="stylesheet"> 제거 — rel="Stylesheet" · "alternate stylesheet" 포함 (C5)`, `<link rel="icon"> 등 다른 rel은 그대로 둔다 (C5)`, `글을 <template>로 파싱한 뒤 옮기므로 파싱 중에 코드가 실행되지 않는다 (<img onerror>)`, `javascript: 주소 제거 — %s on <%s>`(href · src · action · formaction, 앞 공백 · 제어문자 포함 6건), on… 속성(대소문자 섞어도) · `<script>` 제거 · 나머지 속성 · 구조 · 공백 · 주석 · 인라인 style 보존 · 빈 글 · 영역 상자 그대로 · 다시 호출 · 특수문자
    - 한계(숨기지 않고 기록): 이 jsdom 설정은 인라인 핸들러 · 스크립트를 실제로 실행하지 않는다(처음에 "innerHTML로 바로 넣으면 `onclick`이 돈다"는 대조 테스트를 넣었더니 실행이 안 돼 실패 → 그 대조 테스트와 `click()` 호출은 뺌). 그래서 `window.__pwned` 미정의 확인은 보조이고, 핵심 확인은 "영역에 그 요소 · 속성이 남지 않았다"이다. 실제 브라우저에서 코드가 안 도는지는 e2e(Dev-16 QA-29 · QA-30)가 본다
    - 실행: `npx vitest run` 10 files · 220 passed, `npx tsc --noEmit` 오류 0, 커밋 090b2b6

- [x] **Dev-9** (`react-dom-bindings`): `checkHtml` 1 — 위험 코드 · SVG · 알림 글 만들기 [§5 실행 가능한 HTML · §5 HTML 범위(SVG 미지원) · §6.2 지원하지 않는 입력 · C3 · C5 · B11 · B12]
  - 의존: Dev-8 (`scanDangerous`)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/checkHtml.ts`(`checkHtml` · `formatProblems` · `HtmlProblem` 타입), `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts` — 위험 코드(`on…` · `<script>` · `javascript:`)가 있으면 `DANGEROUS` 문제, **숨긴 `javascript:`(문자 참조 · 값 안 탭 · 앞 공백 + 대문자)도 `DANGEROUS`(파싱한 뒤의 값으로 검사, B12)**, **`<iframe srcdoc="<script>…">` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`도 `DANGEROUS`이고 알림 글에 요소 이름이 들어감(C3 · C5 · B11), `<link rel="icon">`은 문제 없음**, `<svg>`(대소문자 섞어도, 안에 자식이 있어도)가 있으면 `SVG` 문제, 정상 샘플 · 빈 글 · 공백만 · 주석만 · 최상위 여러 개는 문제 없음(`[]`), 문제가 여러 개면 모두 돌려줌, 알림 글이 `[위험한 코드]` · `[SVG 미지원]` 말마디와 "다시 작성해 주세요."를 담음
  - 알고리즘: §5 HTML 편집 · 오류 (Patch 때 검사, 문제가 있으면 Patch를 막는다)
  - 완료 근거로 남길 것: `checkHtml.test.ts` 통과 개수, 알림 글 예시 1건 (`<iframe>` 포함)
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/checkHtml.ts`(`checkHtml(html)` — `<template>`에 파싱 → `scanDangerous` 결과를 `DANGEROUS` 문제로, `<svg>`(중첩 · 대소문자 무관)가 있으면 `SVG` 문제 한 줄. `formatProblems(problems)` — 문제 한 줄 = `[말머리] 설명` + 마지막 줄 "다시 작성해 주세요.". `HtmlProblem { kind, message }` · `HtmlProblemKind` = `DANGEROUS | UNPAIRED | STRUCTURE | SVG | PATCH_ERROR` · `PROBLEM_LABELS` = 말머리 5종), `packages/react-dom-bindings/src/index.ts`(내보내기)
    - 테스트: `packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts` 19건 통과 (`npx vitest run packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts`). 모듈이 없는 상태에서 실패하는 것을 먼저 확인한 뒤 구현
    - 테스트 이름: `숨긴 javascript:(문자 참조 · 값 안 탭 · 앞 공백 + 대문자)도 DANGEROUS — 파싱한 뒤의 값으로 검사 (B12)`, `<iframe srcdoc="<script>…">도 DANGEROUS이고 요소 이름이 들어간다 (B11 · C3)`, `<object> · <embed> · <style> · <link rel="stylesheet">도 DANGEROUS이고 알림 글에 요소 이름이 들어간다 (C3 · C5)`, `<link rel="icon">은 문제 없음 (C5)`, SVG 3건(대소문자 · 중첩 · `<svg onload>`는 DANGEROUS + SVG 둘 다), 정상 샘플 · 빈 글 · 공백만 · 주석만 · 최상위 여러 개 `[]`, 문제 여러 개 모두 돌려줌
    - 알림 글 예시 (테스트 `알림 글 예시 (<iframe> 포함)`): `checkHtml('<p>글</p><iframe src="https://example.com"></iframe>')` → `formatProblems` = `"[위험한 코드] <iframe> 요소
다시 작성해 주세요."`. `[위험한 코드]` · `[SVG 미지원]` 조합 예: `[위험한 코드] <iframe> 요소` / `[SVG 미지원] <svg> 요소는 지원하지 않습니다.` / `다시 작성해 주세요.`
    - 말머리 5종(`[위험한 코드]` · `[태그 짝]` · `[구조 불일치]` · `[SVG 미지원]` · `[Patch 오류]`)은 `PROBLEM_LABELS`로 테스트(`말머리 5종: …`). `[Patch 오류]`(`PATCH_ERROR`)만 있으면 "다시 작성해 주세요." 줄을 붙이지 않는다(Dev-17이 자체 안내 "실제 영역을 마지막 기록 상태로 되돌렸습니다"를 message에 담는 전제)
    - 짝(`UNPAIRED`) · 구조(`STRUCTURE`) 검사는 Dev-10 몫이라 이 Dev의 `checkHtml`은 아직 내지 않는다(타입 · 말머리만 준비)
    - 실행: `npx vitest run` 11 files · 239 passed, `npx tsc --noEmit` 오류 0, 커밋 443ca67

- [x] **Dev-10** (`react-dom-bindings`): `checkHtml` 2 — 태그 짝 검사 + 구조 비교(`tbody` 자동 추가만 예외) [§5 HTML 편집 · 오류 · §6.2 지원하지 않는 입력과 오류 복구 · C1 · B14 · B15 · B16]
  - 의존: Dev-9, Dev-7 (`vnodesToHtml` 결과가 항상 통과하는지 확인)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/htmlScan.ts`(글을 훑는 간단한 분석기: 태그 열기 · 닫기 · 주석 · 따옴표 안의 `>` · 빈 태그(`area base br col embed hr img input link meta param source track wbr`) · 원문 그대로 읽는 `style` · `textarea` · `script` · `iframe` 안은 건너뜀, `<` 뒤가 글자가 아니면(`1 < 2`, `x <= y`) 태그로 세지 않음, 태그 이름은 대소문자 무시), `packages/react-dom-bindings/src/client/checkHtml.ts`(짝 · 구조 문제 추가, `tbody` 예외)
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts`(추가) — 닫는 태그 빠짐(`<div><p>글</div>`) · 여는 태그 없이 닫기 · 순서 어긋남(`<b><i></b></i>`) → `UNPAIRED`, 빈 태그(`<br>` `<img …>`)와 `<br/>`는 짝 없이도 정상, 주석 안의 `<div>`는 무시, 속성값 안의 `>`는 무시, 짝은 맞지만 브라우저가 고쳐 읽는 입력(`<p><div>x</div></p>`)은 `STRUCTURE`, **표(C1): `<table><tr><td>1</td></tr></table>` · 행 여러 개 · `<table><tbody><tr>…` 직접 쓴 `tbody`는 모두 문제 없음(`[]`, `tbody` 자동 추가는 예외). 반면 `<table><td>1</td></table>`(`tbody` 말고 `<tr>`도 자동 추가됨)은 여전히 `STRUCTURE`**, 짝과 구조가 둘 다 틀리면 한 번에 둘 다 돌려줌, `vnodesToHtml`로 만든 글(샘플 · 중첩 · 주석 · 빈 태그 · 특수문자 · `pre` 줄바꿈 · 표)은 항상 `[]` / **오탐 없음: 글자 안의 `<`(`1 < 2` · `x <= y` · `a<b` 뒤에 공백)는 태그로 세지 않아 `[]`(B14), 대소문자 섞인 짝 `<DIV>글</div>` · `<Ul><LI>가</li></uL>` → `[]`(B15), `<textarea>` 안의 `</div>` 같은 글은 짝 검사에서 무시 → `[]`(B16). `<style>` 안의 `</div>`는 `htmlScan` 단위 테스트에서 무시됨을 확인하고(페이지에서는 `<style>`이 C5로 막히므로 분석기 견고성 테스트임을 테스트 이름에 표시), `checkHtml`로는 `DANGEROUS`만 나오고 `UNPAIRED` 오탐이 없음(B16)**
  - 알고리즘: §5 HTML 편집 · 오류 (엔진이 훑은 구조 ↔ 브라우저가 읽은 구조 비교, 태그 이름 · 중첩만 비교, `tbody` 자동 추가만 예외)
  - 완료 근거로 남길 것: `checkHtml.test.ts` 통과 개수, `vnodesToHtml` 왕복 통과 테스트 이름, 표 예외 · 오탐 없음(B14 ~ B16) 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/htmlScan.ts`(`scanHtml(html)` → `{ tree, issues }` — 글을 직접 훑는 분석기: 주석 · `<!…>` · `<?…>` · `</` 뒤가 글자가 아닌 것은 건너뜀, 태그 이름 소문자, 속성은 따옴표 안 `>` 무시, `<` 뒤가 글자가 아니면 글자로 취급, 빈 태그는 열지 않음, `style` `textarea` `script` `iframe` `title` `xmp` `noembed` `noframes` 안은 닫는 태그까지 건너뜀, `<svg>` · `<math>` 안의 `/>`는 자기 닫는 태그, 닫는 태그 때 스택 맞춤 · 안쪽 미닫힘 보고, 글 끝 미닫힘 보고, `>`가 없는 미완성 태그 보고(브라우저가 글째 버리므로)), `packages/react-dom-bindings/src/client/checkHtml.ts`(`UNPAIRED`: `scanHtml` issues를 5줄까지 + "그 밖에 N건" 한 줄 / `STRUCTURE`: 엔진이 훑은 나무 ↔ 브라우저가 읽은 나무(`<template>`)를 위에서부터 비교해 처음 다른 형제 목록 한 줄. 태그 이름 · 중첩만 비교. **C1 예외**: 입력에 그 자리 `<tbody>`가 없는데 브라우저가 `<table>` 안에 끼운 `<tbody>`만 자식을 `<table> 자식으로 펼쳐서 비교`)
    - 테스트: `packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts` 59건 통과 (Dev-9 19건 + Dev-10 40건; `npx vitest run packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts`). `htmlScan` 모듈이 없는 상태(`Failed to resolve import "../htmlScan"`)에서 실패하는 것을 먼저 확인한 뒤 구현. `checkHtml` 안에 짝 · 구조가 없던 중간에도 `<table><td>…` · `<table>…<p><div>` 기대가 실패하는 것을 훅 출력으로 확인
    - `vnodesToHtml` 왕복 통과 테스트: `checkHtml 2 — vnodesToHtml로 만든 글은 항상 통과 (Dev-7 왕복)` 안의 `샘플` · `중첩` · `주석` · `빈 태그` · `특수문자` · `pre 줄바꿈` · `표` + `VNode로 직접 만든 표 · 폼 · 목록` (전부 `[]`)
    - C1 표: `<table><tr><td>1</td></tr></table>는 문제 없음 ([])`, `행이 여러 개여도 문제 없음`, `직접 쓴 <tbody>는 문제 없음`, `caption · colgroup · thead와 tbody 없는 행이 섞여도 문제 없음`, `<tr> 사이에 직접 쓴 <tbody>가 끼어 있어도 문제 없음`, `중첩된 표 · 공백과 주석이 섞인 표도 문제 없음` / 반대로 `<table><td>1</td></table>는 <tr>도 자동 추가되므로 여전히 STRUCTURE`, `tbody 예외는 표 안의 다른 보정(<p><div>)까지 봐주지 않는다`
    - B14: `B14: 글자 안의 `<`(`1 < 2` · `x <= y`)는 태그로 세지 않아 []` (`a <> b, a<3, x<=y, 끝 <` · `<p>1 < 2 && 3 > 2</p>` 포함) / B15: `B15: 대소문자 섞인 짝 …` (`<DIV>글</div>` · `<Ul><LI>가</li></uL>`) / B16: `B16: <textarea> 안의 `</div>` 같은 글은 짝 검사에서 무시 → []`, `B16: <title> 안의 `</div>`도 무시 (RCDATA)`, `B16: <style> · <script> 안의 `</div>`는 UNPAIRED 오탐 없이 DANGEROUS만 나온다 (페이지에서는 C5 · 위험 코드로 막힘)`, `htmlScan (분석기 견고성)` 안의 `B16 (분석기 견고성): <style> 안의 `</div>`는 짝으로 세지 않고 요소는 잎으로 남는다 — 페이지에서는 <style>이 C5로 막혀 이 테스트로만 확인`
    - 알림 글 예시 (실제 출력): `<div><p>글</div>` → `[태그 짝] <p> 태그가 닫히지 않았습니다 (</div>를 먼저 만났습니다).` / `다시 작성해 주세요.`; `<p><div>x</div></p><b>` → `[태그 짝] <b> 태그가 닫히지 않았습니다.` / `[구조 불일치] 최상위에서 입력한 구조(<p><div></div></p><b></b>)와 브라우저가 읽은 구조(<p></p><div></div><p></p><b></b>)가 다릅니다.` / `다시 작성해 주세요.`; `<table><td>1</td></table>` → `[구조 불일치] <table> 안에서 입력한 구조(<td></td>)와 브라우저가 읽은 구조(<tr><td></td></tr>)가 다릅니다.`
    - 명세에 없어 판단한 세부(검수 확인 요청): ① 선택적 닫는 태그(`<li>` · `<p>` · `<td>` 생략)도 엄격히 짝 문제로 본다(명세 예 `<div><p>글</div>` 따름) ② `a<b`처럼 `<` 바로 뒤가 글자면 HTML 표준대로 태그로 본다(dev_todo의 "`a<b` 뒤에 공백"은 `a < b`로 읽고 테스트 — 글자 바로 붙은 `a<b`는 태그가 맞아 `>`가 없으면 UNPAIRED로 알림) ③ `>`로 닫히지 않은 태그는 브라우저가 글째 버려 글이 사라지므로 UNPAIRED로 알림 ④ 짝 문제 줄은 5줄까지 + "그 밖에 N건" ⑤ 구조 문제는 처음 다른 곳 한 줄만 ⑥ SVG 안 `/>`는 자기 닫는 태그로 봐서 짝 오탐을 막음 ⑦ `<meta http-equiv=refresh>` · `<base>` 등 위험 목록(C3 · C5)에 없는 요소는 막지 않음
    - 실행: `npx vitest run` 11 files · 279 passed, `npx tsc --noEmit` 오류 0, 커밋 4a0e885

- [x] **Dev-11** (`react-dom`): `History` — 양방향 연결 리스트 (초기 0번 · 갈림길 끊기 · 경계 무시 · 한도 50) [P1-26 · P1-27 · T-08 · §3.3 · B17]
  - 의존: 없음 (타입만. 데이터 구조라 DOM 없음)
  - 만들 · 고칠 파일: `packages/react-dom/src/history.ts`, `packages/react-dom/src/index.ts`(새로)
  - 테스트: `packages/react-dom/src/__tests__/history.test.ts` — 만들 때 넘긴 초기 기록이 0번(바닥), `push`가 current 뒤에 이어 붙임(head · current · 개수), `back` · `forward`는 prev · next 따라 이동하고 이동한 기록을 돌려줌, 처음에서 뒤로 · 끝에서 앞으로는 `null`을 돌려주고 아무 것도 안 바뀜(경계 무시), 뒤로 간 뒤 `push`하면 앞쪽(redo) 기록이 끊겨 앞으로가 안 됨(갈림길), 51번째 기록을 넣으면 head를 다음으로 옮기고 개수 50 유지(0번 초기도 한 개로 셈), 60번 `push` 뒤 뒤로를 끝까지 하면 49번 이동 후 멈춤, 저장한 snapshot · patches · inverse를 이후 `push`가 바꾸지 않음(깊게 얼린 기록으로 확인, P1-27) / **한도 근처 갈림길(B17): 50개 꽉 찬 상태(0번 포함)에서 뒤로 10번 → `push` → 개수 41(갈림길로 잘린 10개를 개수에서 뺌) · head는 그대로 · 앞으로 불가, 이어서 9번 `push` → 50, 한 번 더 `push` → head가 다음으로 밀리고 개수 50 유지(잘린 만큼 개수를 안 줄이면 head를 잘못 빼는 버그를 잡음), 그 뒤 뒤로 끝까지 = 49번**
  - 알고리즘: History 자료구조 = 양방향 연결 리스트(head · current · 개수) · 정책(§3.3)
  - 완료 근거로 남길 것: `history.test.ts` 통과 개수, 한도 50 · 갈림길 · 경계 · 한도 근처 갈림길(B17) 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 파일: `packages/react-dom/src/history.ts`(`class History` — `head` · `current` · `size` getter, `push(entry)` · `back()` · `forward()`. 생성자에 넘긴 초기 기록이 0번(바닥). `push`는 current.next 이후를 끊으며 끊은 개수만큼 size를 빼고, size가 `HISTORY_LIMIT`(50)을 넘으면 head를 다음으로 옮겨 옛 head와 연결을 끊음. `back` · `forward`는 이동한 `HistoryEntry`를 돌려주고 경계에서는 `null`. 저장한 entry는 고치지 않고 노드의 prev · next만 바꿈), `packages/react-dom/src/index.ts`(새로, `History` 내보냄)
    - 테스트: `packages/react-dom/src/__tests__/history.test.ts` 18건 통과 (`npx vitest run packages/react-dom/src` 18 passed). `../history` 모듈이 없는 상태(`Failed to resolve import "../history"`)에서 실패하는 것을 먼저 확인한 뒤 구현
    - 한도 50: `한도 상수는 HISTORY_LIMIT = 50` · `50개까지는 head가 그대로이고 개수가 50이다 (0번 + 49번 push)` · `51번째 기록을 넣으면 head를 다음으로 옮기고 개수 50을 유지한다 (0번 초기도 한 개로 셈)` · `60번 push 뒤 뒤로를 끝까지 하면 49번 이동 후 멈춘다 (새 맨 앞이 새 바닥)` · `빠진 head는 연결 리스트에서 완전히 떨어져 나간다`
    - 경계: `경계 무시: 처음에서 뒤로는 null을 돌려주고 아무 것도 안 바뀐다` · `경계 무시: 끝에서 앞으로는 null을 돌려주고 아무 것도 안 바뀐다` · `0번만 있을 때는 뒤로 · 앞으로 모두 null (0번이 바닥)`
    - 갈림길: `뒤로 간 뒤 push하면 앞쪽(redo) 기록이 끊겨 앞으로가 안 된다` · `갈림길 뒤에는 갈림길 쪽 기록만 이어진다`
    - 저장 기록 불변(P1-27): `깊게 얼린 기록을 넣어도 push · back · forward · 갈림길 · 한도 제거가 snapshot · patches · inverse를 고치지 않는다`(`deepFreeze`한 기록 55개 push + 이동 + 갈림길 + 한도 제거를 예외 없이 마침) · `push한 기록 객체를 그대로 보관한다 (복사 · 변형 없음)`
    - B17: `50개 꽉 찬 상태에서 뒤로 10번 → push: 개수 41(잘린 10개를 뺌) · head 그대로 · 앞으로 불가` · `이어서 9번 push → 50, 한 번 더 push → head가 다음으로 밀리고 개수 50 유지` · `그 뒤 뒤로를 끝까지 하면 49번 이동하고, 앞으로로 current까지 되돌아온다`. 변이 확인: `push`의 끊기 루프에서 `this.#size--`를 빼면 위 B17 3건 + 갈림길 1건, 총 4건이 실패하는 것을 확인한 뒤 되돌림
    - 실행: `npx tsc --noEmit` 오류 0, 커밋 21fb97c

- [x] **Dev-12** (`react-dom`): `createVDomRoot` 1 — 로드 때 실제 영역을 읽어 0번 기록으로, `update`(Patch 흐름)로 diff → patch → 기록, Patch 도중 예외 복구 [P1-24 · P1-25 · P1-26 · P1-13 · P1-33 · P1-34 · T-03 ~ T-06 · C2 · B22]
  - 의존: Dev-2, Dev-3, Dev-4, Dev-5, Dev-6, Dev-11
  - 만들 · 고칠 파일: `packages/react-dom/src/createVDomRoot.ts`, `packages/react-dom/src/index.ts`
  - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts` — 만들 때 `readAreaChildren(realArea)`로 0번 기록을 만듦(P1-20), `update(next)`: 이전 기록의 VNode와 `next`만 비교하고 실제 영역을 `domToVNode`로 다시 읽어 비교하지 않음(P1-33 — 실제 영역 DOM을 일부러 어긋나게 고쳐 둬도 diff 기준은 저장한 VNode), D-01 ~ D-05 각각 반영 후 `readAreaChildren(realArea)`가 `next`와 같음, 무변경이면 `false`를 돌려주고 DOM 변경 0건(`MutationObserver`) · 기록 안 늘어남(T-04), 부분 갱신 때 관련 없는 노드 참조 유지(T-06), 연속 `update` 2회 · 3회가 직전 반영 상태 기준(P1-25), 기록에 snapshot · patches · inverse가 들어가고 snapshot은 새 객체(P1-26 · 27), 영역 상자가 비어 있는 입력 · 최상위 여러 개 입력(T-05 · §5), 복합 변경 · 여러 형제 삭제 · 삭제와 수정 동시(P1-15 · 16) / **Patch 도중 예외(C2 · B22): 실제 영역을 바깥에서 고쳐 경로가 사라지게 한 뒤(예: `<ul>`을 뗌) `update(next)` → 예외가 다시 던져짐 · 기록이 안 늘고 `back()`이 `null`(current 안 움직임) · `readAreaChildren(realArea)`가 지금(current) 기록의 snapshot과 같음(적용되다 만 patch도 되돌려짐) · 이어서 정상 `update`가 성공하고 기록이 정확히 한 칸 늘어남**
  - 알고리즘: 결정 7 B + VNode(기록마다 VNode · patch · 역패치) · 정책 무변경 Patch 기록 안 함 · C2(복구 경로 한 개, `renderAreaChildren`으로 다시 그리는 것은 이 복구에서만 `// [AI Note]`)
  - 완료 근거로 남길 것: `createVDomRoot.test.ts` 통과 개수, "저장한 VNode만 기준" · "무변경 0건" · "Patch 도중 예외 뒤 복구"(B22) 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom/src/createVDomRoot.ts`(`createVDomRoot(realArea)` → `{ snapshot(), update(next) }`. 만들 때 `readAreaChildren(realArea)`로 0번 기록을 딱 한 번 읽음. `update`: `diff(현재 기록 snapshot, next)` → 빈 목록이면 `false` · 아니면 `patch(realArea, patches)` → 성공하면 `History.push({ snapshot: next, patches, inverse: invertPatches(patches) })` 후 `true`. patch 도중 예외면 `recoverAndRethrow`: 기록은 그대로 두고 `renderAreaChildren(realArea, 현재 기록 snapshot)`으로 복구한 뒤 원래 예외를 다시 던짐 — 전체 다시 그리기는 이 한 곳뿐이고 `// [AI Note]`로 남김. DOM은 전부 `@mini-react/react-dom-bindings` 경유), `packages/react-dom/src/index.ts`(`createVDomRoot` · `VDomRoot` 타입 내보냄)
    - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts` 23건 통과 (`npx vitest run packages/react-dom/src` 2 files · 41 passed = history 18 + createVDomRoot 23). `../createVDomRoot` 모듈이 없는 상태(`Failed to resolve import "../createVDomRoot"`)에서 실패하는 것을 먼저 확인한 뒤 구현
    - 저장한 VNode만 기준(P1-33): `저장한 VNode만 기준: 실제 영역을 바깥에서 어긋나게 고쳐 둬도 diff는 저장한 VNode와 next만 비교한다`. 변이 확인: diff 기준을 `readAreaChildren(realArea)`로 바꾸면 이 테스트를 포함해 5건 실패하는 것을 확인하고 되돌림
    - D-01 ~ D-05: `D-01 텍스트 변경` · `D-02 속성 추가 · 수정 · 삭제` · `D-03 노드 추가` · `D-04 노드 삭제` · `D-05 노드 교체`, `복합 변경 한 번에`, `여러 형제 삭제 · 삭제와 수정이 함께 일어나도 …`, `공백 · 주석이 번호를 차지해도 …`, `영역 상자가 빈 입력 · 최상위가 여러 개인 입력도 같은 규칙`(각각 반영 뒤 `area.innerHTML`과 `readAreaChildren(area)`가 목표와 같음)
    - 무변경 0건(T-04): `무변경 무시: false를 돌려주고 DOM 변경 0건 · 기록이 안 늘어난다` (`MutationObserver.takeRecords()` 0건 · snapshot 참조 그대로). 부분 갱신(T-06): `부분 갱신: 글자 하나를 바꿔도 관련 없는 노드 · 부모의 참조가 그대로다` (변경 기록 1건 = `characterData`). 연속 Patch(P1-25): `연속 update 3회가 매번 직전 반영 상태를 기준으로 정확하다`. 기록 불변(P1-26 · 27): `update마다 snapshot이 새 객체로 쌓이고, 이미 저장한 과거 snapshot의 내용은 안 바뀐다`
    - Patch 도중 예외 복구(C2 · B22): `B22: 실제 영역을 바깥에서 망가뜨려 경로가 사라지면 원래 예외가 다시 던져지고, 기록은 안 늘고 current는 안 움직인다` · `B22: 적용되다 만 patch도 되돌려져 실제 영역이 지금(current) 기록의 snapshot과 같아진다`(`<ul>`을 뗀 뒤 `<li>` INSERT가 `<p>`에 먼저 들어가고 다음 patch에서 실패하는 반쯤 적용된 상태) · `B22: 영역을 통째로 비워 첫 patch부터 실패해도 같은 복구가 된다` · `B22: 복구 뒤 이어서 정상 update가 성공하고 기록이 정확히 한 칸 늘어난다`. 변이 확인: 복구의 `renderAreaChildren` 줄을 지우면 B22 3건 실패하는 것을 확인하고 되돌림
    - 미룬 확인: `back()`이 필요한 단언(처음에 뒤로 · 앞으로가 `null` · 무변경 · 예외 뒤 "기록이 늘지 않음" · 복구 뒤 "정확히 한 칸 늘어남")은 `back`이 Dev-13에서 만들어지므로 Dev-13 테스트에 이어서 넣음. Dev-12에서는 `snapshot()` 참조 그대로로 같은 사실을 확인
    - 실행: `npx tsc --noEmit` 오류 0, 커밋 a4ec636

- [x] **Dev-13** (`react-dom`): `createVDomRoot` 2 — `back` · `forward`: 실제 영역은 역패치 · patch로, 돌려주는 스냅샷으로 테스트 영역 · 편집창이 따라가게 [P1-28 ~ P1-30 · T-08 · §3.3 · C2]
  - 의존: Dev-12
  - 만들 · 고칠 파일: `packages/react-dom/src/createVDomRoot.ts`
  - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts`(추가) — Patch 2회 → `back` → `forward`마다 `readAreaChildren(realArea)`가 그 기록의 snapshot과 같음, `back`은 이동한 기록의 snapshot을 돌려줌, 처음 · 끝에서는 `null`을 돌려주고 DOM 변경 0건(경계 무시), 뒤로 간 뒤 새 `update`를 하면 앞으로가 안 됨(갈림길), 한도 50을 넘겨도 뒤로가 남은 기록 안에서 맞게 동작, 되돌린 뒤 다음 `update`의 기준이 되돌린 상태의 snapshot(P1-25 · 30), 뒤로 때 관련 없는 노드 참조가 유지됨(역패치도 부분 갱신), 최상위 여러 개 · 0개 상태 사이 이동 / **`back` · `forward` 도중 예외(C2): 실제 영역을 바깥에서 망가뜨린 뒤 `back()` → 예외가 다시 던져짐 · current가 안 움직임(이동 도중 실패한 이동은 없던 일) · 실제 영역이 current 기록의 snapshot으로 다시 그려짐 · 이어서 정상 `back()`이 성공**
  - 알고리즘: 결정 7 B + VNode · 되돌리는 순서 = 역순 · 정책(경계 무시 · 갈림길) · C2(이동은 patch가 성공한 뒤에 확정한다: 예 — 먼저 엿보고 성공하면 이동, 또는 실패하면 되돌려 놓기. 방식은 Dev에서 정하되 결과만 위 테스트로 고정)
  - 완료 근거로 남길 것: `createVDomRoot.test.ts` 통과 개수, `npx vitest run` 전체 통과 개수 · `npx tsc --noEmit` 0
  - **완료 근거 (Evidence)**:
    - 고친 파일: `packages/react-dom/src/createVDomRoot.ts`(`VDomRoot`에 `back()` · `forward()` 추가. `update` · `back` · `forward`가 모두 `applyOrRecover(patches)`를 지남 — `patch` 성공 뒤에만 `history.push` · `history.back()` · `history.forward()`로 current를 옮기고, 도중 예외면 `renderAreaChildren(realArea, current 기록 snapshot)`으로 복구한 뒤 원래 예외를 다시 던짐(`// [AI Note]`). `back`은 current 기록의 `inverse`(이미 역순)를 그대로 순서대로 적용, `forward`는 다음 기록의 `patches`를 적용. 경계(`prev`/`next`가 `null`)면 아무것도 안 하고 `null`. 이동한 기록의 snapshot을 돌려줘 호출한 쪽이 테스트 영역 · 편집창을 채움)
    - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts` 37건 통과 (Dev-12 23건 + Dev-13 14건; `npx vitest run packages/react-dom/src` 2 files · 55 passed = history 18 + createVDomRoot 37). `root.back is not a function`으로 14건이 실패하는 것을 먼저 확인한 뒤 구현
    - 이동: `Patch 2회 → back → back → forward → forward: 매번 실제 영역이 그 기록의 snapshot과 같고, 이동한 기록의 snapshot을 돌려준다` · `D-01 ~ D-05를 차례로 Patch한 뒤 끝까지 뒤로 · 끝까지 앞으로 가면 매 단계가 맞다` · `최상위가 여러 개 · 0개인 상태 사이를 오가도 맞다`
    - 경계 · 갈림길 · 한도: `처음에는 뒤로 · 앞으로 모두 null이고 DOM 변경 0건 (0번이 바닥, 경계 무시)` · `경계 무시: 처음에서 뒤로 · 끝에서 앞으로는 null이고 DOM 변경 0건 · snapshot 그대로` · `무변경 update는 기록이 안 늘어난다 …` · `갈림길: 뒤로 간 뒤 새 update를 하면 앞쪽 기록이 끊겨 앞으로가 안 된다` · `한도 50을 넘겨도 뒤로가 남은 기록 안에서 맞게 동작한다 (60번 update → 뒤로 49번 → 11번 기록에서 멈춤)` · `되돌린 뒤 다음 update의 기준은 되돌린 상태의 snapshot이다`
    - 부분 갱신: `뒤로 · 앞으로도 부분 갱신이다: 관련 없는 노드의 참조가 유지된다` (역패치 · patch 모두 변경 기록 1건 `characterData`, 부모 · 형제 · 자식 참조 그대로)
    - 이동 도중 예외(C2): `back 도중 예외: 원래 예외가 다시 던져지고 current가 안 움직이며 실제 영역이 current 기록으로 다시 그려진다` · `back 도중 일부만 적용되다 실패해도 되돌려진다 (역패치 첫 줄은 성공, 둘째 줄에서 실패)` · `forward 도중 예외: …` (각각 이어서 정상 back · forward가 성공). Dev-12에서 미룬 `B22(이어서): update 도중 예외 뒤에도 기록이 안 늘어난다 - 뒤로가 없고, 복구 뒤 정상 update는 정확히 한 칸 늘린다`도 여기서 확인
    - 변이 확인: `back`에서 `history.back()`을 patch보다 먼저 하면(이동 먼저) back 예외 테스트 2건이 실패 · 역패치를 다시 뒤집어 적용하면 `최상위가 여러 개 · 0개인 상태 사이를 오가도 맞다` 실패하는 것을 확인하고 되돌림
    - 실행: `npx vitest run` 13 files · 334 passed, `npx tsc --noEmit` 오류 0, 커밋 d022767

- [x] **Dev-14** (`fixture` + `e2e`): 검증 페이지 — 실제 영역 · 테스트 영역(편집창 + 미리보기) · 버튼 3개를 놓고, 로드 때 실제 영역을 읽어 편집창 · 테스트 영역을 채운다. 기존 최소 페이지를 대체한다. e2e 헬퍼에 구조 비교 · dialog 감시 · 콘솔 감시를 둔다 [P1-19 ~ P1-22 · P1-32 · A4 · A5]
  - 의존: Dev-2, Dev-7, Dev-8, Dev-12
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/index.html`(샘플 HTML을 `real-area` 안에 직접 씀, 이름표 · 편집창 · 버튼 3개, 모바일에서 위아래로 쌓임 · 가로 스크롤 없음), `fixtures/phase1-vdom-playground/main.ts`(`createVDomRoot(realArea)` → `renderAreaChildren(testArea, snapshot)` → `html-editor.value = vnodesToHtml(snapshot)`, **입력 때마다 즉시** `setAreaHtml(testArea, 글)` — 타이머 · debounce를 쓰지 않는다, B6), `e2e/phase1-helpers.ts`(새로: 위 「e2e 공통 장치」 전부 — `test` 확장(dialog 감시 · 콘솔 감시) · `structureOf` · `structureOfHtml`(속성 이름 → 값 집합, style cssText + 쪼갠 항목 집합) · `holdNodes` · `observeMutations` · `edit` · `captureAlert`), `e2e/phase1-render.spec.ts`(**고쳐 쓴다**)
  - 기존 e2e 처리: `phase1-render.spec.ts` 파일 이름은 유지하고 **내용을 새 페이지 기준으로 고친다**. 유지 = "페이지를 연다(콘솔 오류 · 경고 없음)" · "새로고침" · "mobile 가로 스크롤 없음" 3건(검사 대상만 새 화면으로), 대체 = 최소 페이지 전용 4건(`main#app` · `h1` 문구 · `hidden:false` li · 특수문자 `<p>`)은 QA-1(초기 화면, 특수문자는 미리보기에 글자로 보임까지)과 QA-A1(특수문자를 Patch까지, Dev-20)로 옮겨 쓴다. 최소 페이지와 같은 커밋에서 함께 고쳐 e2e가 깨진 채 남지 않게 한다
  - 헬퍼 자체 확인: 속성 순서만 다른 구조를 같다고 판정하는지는 QA-3(Dev-15)이, 속성 글 항목 집합 비교는 QA-A9(Dev-20)가 실제 시나리오 안에서 확인한다
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase1-render.spec.ts` — QA-1, QA-A4(새로고침), mobile · desktop / 단위: 없음 (엔진 로직 없음)
  - 알고리즘: 결정 6 A (HTML 편집창 + 미리보기) · P1-20 실제 영역 샘플은 페이지에 미리 써 두고 로드 때 `domToVNode`로 읽음
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-render.spec.ts` desktop · mobile 통과 개수, 옛 4건이 어느 QA로 옮겨졌는지, 헬퍼의 dialog 감시 · 콘솔 감시가 동작함(일부러 선언 없는 alert · `console.error`를 낸 임시 테스트가 실패하는 것을 한 번 확인하고 지움), `npx vitest run` 영향 없음
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `fixtures/phase1-vdom-playground/index.html`(두 영역 이름표 "실제 영역" · "테스트 영역", `real-area` 안에 샘플 HTML 직접 기록, 편집창 `html-editor` + 미리보기 `test-area`, 버튼 3개 `btn-patch` · `btn-back` · `btn-forward`, 720px 이하에서 위아래로 쌓임), `fixtures/phase1-vdom-playground/main.ts`(`createVDomRoot(realArea)` → `renderAreaChildren(testArea, snapshot)` → `html-editor.value = vnodesToHtml(snapshot)`, `input` 이벤트마다 즉시 `setAreaHtml(testArea, 글)` — 타이머 · debounce 없음), `e2e/phase1-helpers.ts`(새로: `test` 확장(auto 장치 dialog 감시 · 콘솔 error · pageerror 감시) · `captureAlert` · `expectNoConsoleWarnings` · `structureOf` · `structureOfHtml`(속성 이름 → 값 집합, style은 `cssText` + `parseStyleText` 항목 집합) · `expectThreeSame` · `holdNodes` · `sameNode` · `isStillConnected` · `observeMutations` · `edit` · `editorValue` · `SAMPLE_HTML`), `e2e/phase1-render.spec.ts`(새 페이지 기준으로 고쳐 씀)
    - 테스트(바깥 루프): 먼저 스펙 · 헬퍼만 쓰고 옛 페이지에서 `npx playwright test e2e/phase1-render.spec.ts` 10 failed(`getByTestId('real-area')` element(s) not found)를 확인한 뒤 구현. 구현 후 `npx playwright test e2e/phase1-render.spec.ts` desktop 5 · mobile 5 = 10 passed
    - 테스트 이름: `QA-1 페이지를 처음 연다: 이름표 · 두 영역 구조 · 편집창 · 버튼 · 특수문자는 글자로` · `페이지를 연다 (콘솔 오류 · 경고 없음)` · `새로고침` · `QA-A4 새로고침: 편집한 글은 사라지고 초기 샘플로 다시 뜨며 뒤로가 무시된다` · `가로 스크롤이 없다 (mobile 375x812에서는 두 영역이 위아래로 쌓인다)`
    - 옛 4건 이동: `main#app` · `h1` 문구 → QA-1(샘플 `section#card` · `h2` 구조 비교), `hidden:false` li · `disabled` → QA-1(`<button disabled>` 확인) + QA-A8(boolean 속성, Dev-20), 특수문자 `<p>` → QA-1(편집창에 `<p>&lt;b&gt; 😀</p>`를 쳐 미리보기에 글자로 보임, `<b>` 요소 없음) + QA-A1(Patch까지, Dev-20). 유지 3건(페이지를 연다 · 새로고침 · mobile 가로 스크롤)은 검사 대상만 새 화면으로 고침
    - 헬퍼 감시 확인: 임시 스펙으로 선언 없는 `alert('몰래')` → `선언하지 않은 dialog가 떴다`로 실패, `console.error('몰래 오류')` → `콘솔 error · pageerror가 있다`로 실패, 던진 `Error('boom')` → `pageerror: boom`으로 실패하는 것을 확인한 뒤 임시 스펙을 지움
    - QA-A4는 Patch 단계(Dev-15) 전이라 "편집창에 친 글(Patch 안 함) → 새로고침 → 초기 샘플 · 뒤로 무시"로 두었고, Dev-15가 같은 테스트에 "Patch 한 뒤"를 덧붙임
    - 실행: `npx vitest run` 13 files · 334 passed (영향 없음), `npx tsc --noEmit` 오류 0, 커밋 9024c56

- [x] **Dev-15** (`fixture` + `e2e`): Patch 버튼 흐름 — 편집창 글 → 테스트 영역 DOM 읽기 → diff → 실제 영역 반영 → 기록 [P1-23 ~ P1-25 · P1-32 · T-03 · T-04 · T-06 · T-07 · B1 · B2 · B7 · A2 · A3]
  - 의존: Dev-14
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(`btn-patch` 클릭 → **편집창 글로 미리보기를 한 번 더 그린 뒤**(입력 처리가 늦어도 옛 글로 Patch되지 않게, B6) `readAreaChildren(testArea)` → `root.update(next)`, 무변경이면 아무 일 없음. **Patch 성공 뒤 편집창 글은 친 그대로 둔다**(B7)), `e2e/phase1-patch.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-patch.spec.ts` — QA-2 ~ QA-10 (D-01 ~ D-05 · 중첩 · 복합 · 무변경 · 부분 갱신 · 연속 Patch). 숫자로 증명하는 덧붙임: **QA-2(B1 · B7)** 글자 하나 Patch가 `MutationObserver` 기록 `characterData` 정확히 1건 · `childList` 0건이고 편집창 글이 친 그대로, **QA-9(B2)** 글자 + `class` 변경이 `characterData` 1건 + `attributes` 1건 · `childList` 0건. **QA-5(a)(A2)** · **QA-6(A3)** Then는 위치 비교 결과(남는 노드 · 새 노드 참조)를 구체적으로 확인
  - 알고리즘: 결정 3 · 4 · 7 · 정책 무변경 Patch 무시
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-patch.spec.ts` desktop · mobile 통과 개수, QA-2 ~ QA-10 각각의 테스트 이름, QA-2 · QA-9의 `MutationObserver` 기록 개수
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `fixtures/phase1-vdom-playground/main.ts`(`btn-patch` 클릭 → `setAreaHtml(testArea, editor.value)`로 미리보기를 한 번 더 그림(B6) → `readAreaChildren(testArea)` → `root.update(next)`. 무변경이면 `update`가 `false`라 아무 일 없음. Patch 성공 뒤 편집창 글은 건드리지 않음(B7)), `e2e/phase1-patch.spec.ts`(새로), `e2e/phase1-render.spec.ts`(QA-A4에 "Patch한 뒤 새로고침" 단계 덧붙임), `e2e/phase1-helpers.ts`(`edit`가 글이 안 바뀌면 오류를 냄 — `replace`가 대상을 못 찾아 조용히 지나가는 것 방지. 예: boolean 속성은 편집창에서 `disabled=""`로 보임)
    - 테스트(바깥 루프): 스펙만 먼저 쓰고 Patch 미연결 상태에서 `npx playwright test e2e/phase1-patch.spec.ts` 16 failed(`toHaveText` · `toHaveAttribute` · `toHaveCount` 기대 불일치, 무변경 QA-8 2건만 통과) 확인 뒤 연결. 연결 후 `npx playwright test e2e/phase1-patch.spec.ts e2e/phase1-render.spec.ts` 28 passed (patch 18 = desktop 9 · mobile 9, render 10 = desktop 5 · mobile 5)
    - 테스트 이름: `QA-2 글자 하나를 고치고 Patch하면 그 글자만 바뀌고 MutationObserver 기록은 characterData 1건뿐이다` · `QA-3 속성 추가 · 수정 · 삭제를 Patch하면 실제 영역 속성이 같아지고 요소는 같은 참조다 (속성 순서는 비교하지 않는다)` · `QA-4 <ul> 끝에 <li>를 추가하고 Patch하면 <li>가 4개가 되고 앞 세 <li>는 같은 참조다` · `QA-5 가운데 <li>를 지우면 위치 비교라서 둘째 노드는 남고 셋째 노드가 지워진다 / 여러 개를 한꺼번에 지워도 맞다`(A2: 둘째 `<li>` `===` 유지 · 셋째 `isConnected` 거짓) · `QA-6 <ul>을 <ol>로 바꾸고 Patch하면 <ol>과 그 안의 <li>는 새 노드이고 주변 요소는 같은 참조다`(A3: `<li>` 세 개 `!==`) · `QA-7 글자 · 속성 · 삭제 · 추가 · 교체를 한꺼번에 Patch해도 실제 영역이 테스트 영역과 같다` · `QA-8 편집 없이 Patch를 누르면 실제 영역 DOM 변경이 0건이고 뒤로를 눌러도 아무 일 없다` · `QA-9 글자 하나와 class만 바꾸고 Patch하면 characterData 1건 + attributes 1건뿐이고 부모 · 형제는 같은 참조다` · `QA-10 편집 → Patch → 같은 편집창에서 다른 편집 → Patch해도 직전 반영 상태 기준으로 맞다`
    - `MutationObserver` 기록 개수: QA-2 = `characterData` 1 · `childList` 0 · `attributes` 0 · total 1, targets `['characterData:#text']`, 편집창 글이 Patch 직전 값 그대로(B1 · B7). QA-9 = `characterData` 1 · `attributes` 1 · `childList` 0 · total 2, targets `['attributes:p', 'characterData:#text']`(B2). QA-3에서 실제 영역 `<p>` 속성 순서 `['class','style','title']` vs 테스트 영역 `['title','class','style']`로 달라도 `structureOf`가 같다고 판정(A4)
    - QA-8의 "뒤로를 눌러도 아무 일 없다"는 뒤로 버튼이 Dev-18에서 연결되기 전에는 단순히 아무 일 없는 버튼이라 자명하게 통과한다. Dev-18 이후에도 같은 시나리오가 통과해야 "기록이 안 생김"의 증거가 된다(Dev-18 완료 때 재실행 필요)
    - 실행: `npx tsc --noEmit` 오류 0, 커밋 4cb6a8b

- [x] **Dev-16** (`fixture` + `e2e`): Patch 때 검사 — `checkHtml`에 걸리면 alert로 "다시 작성해 주세요"를 알리고 Patch를 안 한다. 위험 코드 우회 · 삽입 요소 · 스타일 요소 포함 [§5 HTML 편집 · 오류 · 실행 가능한 HTML · §6.2 · P1-32 · B11 · B12 · C3 · C5]
  - 의존: Dev-10, Dev-15
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(Patch 클릭 맨 앞에 `checkHtml(편집창 글)` → 문제가 있으면 `alert(formatProblems(문제들))` 후 끝), `e2e/phase1-guard.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-guard.spec.ts` — QA-16 ~ QA-21 (위험 코드 · 태그 짝 · 구조 · SVG · 둘 다 한 번에 · 미리보기 onerror 미실행) + **QA-29**(srcdoc iframe · object · embed, B11 · C3) + **QA-30**(숨긴 `javascript:`, B12) + **QA-32**(`<style>` · `<link rel="stylesheet">`, C5). alert는 `captureAlert(page, 동작)`으로 선언해 메시지를 확인하고 accept (선언 없는 alert는 실패, A5)
  - 알고리즘: §5 HTML 편집 · 오류 · 실행 가능한 HTML
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-guard.spec.ts` desktop · mobile 통과 개수, 확인한 알림 말마디 4종, QA-29 · 30 · 32 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `fixtures/phase1-vdom-playground/main.ts`(Patch 클릭 맨 앞에 `checkHtml(editor.value)` → 문제가 있으면 `alert(formatProblems(problems))` 후 `return`. 편집창 글 · 실제 영역 · 기록 그대로), `e2e/phase1-guard.spec.ts`(새로)
    - 테스트(바깥 루프): 스펙만 먼저 쓰고 `checkHtml` 미연결 상태에서 `npx playwright test e2e/phase1-guard.spec.ts` 18 failed(`선언한 alert가 뜨지 않았다` 등)를 확인한 뒤 연결. 연결 후 `npx playwright test e2e/phase1-guard.spec.ts` 18 passed (desktop 9 · mobile 9)
    - 확인한 알림 말마디 4종: `[위험한 코드]`(QA-16 · 29 · 30 · 32) · `[태그 짝]`(QA-17 · 20) · `[구조 불일치]`(QA-18 · 20) · `[SVG 미지원]`(QA-19), 모두 `다시 작성해 주세요` 포함. QA-20은 alert가 정확히 한 번이고 `[태그 짝]` · `[구조 불일치]`가 함께 담김
    - 막힌 Patch 공통 확인(`patchBlocked`): 실제 영역 `MutationObserver` 기록 0건, 구조 그대로, 뒤로를 눌러도 그대로(기록이 안 늘어남 — 뒤로 연결(Dev-18) 이후 의미가 생김), 편집창 글 그대로. 요소 이름 확인: QA-29 `<iframe>` · `<object>` · `<embed>`, QA-32 `<style>` · `<link rel="stylesheet">`, QA-30 `javascript:`, QA-16 `onerror` · `script`
    - 테스트 이름: `QA-16 위험한 코드(on… 속성 · script · javascript:)를 넣고 Patch하면 [위험한 코드] alert로 막힌다` · `QA-17 </ul>을 지우고 Patch하면 [태그 짝] alert로 막힌다` · `QA-18 짝은 맞지만 브라우저가 고쳐 읽는 <p><div>x</div></p>를 Patch하면 [구조 불일치] alert로 막힌다` · `QA-19 <svg>를 넣고 Patch하면 [SVG 미지원] alert로 막힌다` · `QA-20 구조도 틀리고 닫는 태그도 빠진 글은 alert 한 번에 [태그 짝]과 [구조 불일치]가 함께 담긴다` · `QA-21 편집창에 위험한 코드를 쳐도(Patch 안 함) 코드가 실행되지 않고 미리보기에서는 빠진다` · `QA-29 <iframe srcdoc> · <object> · <embed>는 미리보기에서 빠지고 Patch는 [위험한 코드]로 막힌다` · `QA-30 javascript:를 문자 참조 · 앞 공백 · 대문자 · 탭으로 숨겨도 미리보기에서 빠지고 Patch는 막힌다`(`jav&#x61;script:` · `" JAVA	script:"`) · `QA-32 <style> · <link rel="stylesheet">는 미리보기에서 빠져 모양이 안 바뀌고 Patch는 [위험한 코드]로 막힌다`(`x.css` 요청 0건, 파랑 `rgb(0, 0, 255)` 안 됨)
    - 명세에 없어 판단한 세부: QA-16 · QA-21의 `<img src="x" …>`를 `<img src="data:," onerror=…>`로 썼다. `src="x"`는 미리보기가 이미지를 실제로 요청해 404가 되고 크로미움이 `console.error: Failed to load resource … 404`를 남겨 공통 콘솔 감시(A5)에 걸리기 때문이다(실제로 QA-21이 그 한 건으로 실패하는 것을 확인). 깨진 이미지라 `onerror`가 노리는 모양은 같고 네트워크 요청이 없다. 공통 감시는 약하게 만들지 않았다
    - 실행: `npx tsc --noEmit` 오류 0, 커밋 e04da24

- [x] **Dev-17** (`fixture` + `e2e`): 페이지 보호 · 오류 복구 — 두 영역 안 링크 클릭 · 폼 제출은 기본 동작을 막고, Patch 도중 예외는 복구 뒤 `[Patch 오류]` alert [§5 · P1-19 · P1-32 · C2 · C4 · B13]
  - 의존: Dev-12, Dev-15, Dev-16 (`captureAlert` · alert 흐름)
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(`real-area` · `test-area`에 **캡처 단계** `click`(대상이 `a[href]` 안이면 `preventDefault`) · `submit`(`preventDefault`) 리스너. Patch 클릭의 `root.update(…)`를 `try/catch`로 감싸 예외가 나면 `alert('[Patch 오류] …실제 영역을 마지막 기록 상태로 되돌렸습니다. 다시 작성해 주세요.')`, 편집창 · 테스트 영역은 그대로. 이 오류 알림 함수는 Dev-18이 `back` · `forward`에도 씀), `e2e/phase1-guard.spec.ts`(추가)
  - 테스트(바깥 루프): **QA-31**(B13 · C4: 두 영역의 링크 클릭 · 폼 버튼 클릭에도 페이지가 이동 · 새로고침되지 않고 기록이 살아 있음) · **QA-A12**(C2: 실제 영역을 바깥에서 망가뜨린 뒤 Patch → `[Patch 오류]` alert, 실제 영역이 마지막 기록 상태로 복구, 기록 그대로, 편집창 글 유지, 다시 Patch하면 성공 · 기록 한 칸). 스펙 파일은 `e2e/phase1-guard.spec.ts`
  - 알고리즘: C2(기록 그대로 + 실제 영역을 마지막 기록 VNode로 다시 그림) · C4(기본 동작 막기는 엔진이 아니라 검증 페이지의 일)
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-guard.spec.ts` desktop · mobile 통과 개수, QA-31 · QA-A12 테스트 이름, 링크 클릭 뒤 `framenavigated` 0건 확인
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `fixtures/phase1-vdom-playground/main.ts`(`real-area` · `test-area`에 캡처 단계 `click` 리스너 — 대상이 `a[href]` 안이면 `preventDefault` — 와 `submit` 리스너 `preventDefault`(C4). Patch 클릭의 `root.update(…)`를 `try/catch`로 감싸 `reportPatchError(error)` → `alert('[Patch 오류] Patch를 적용하는 중 오류가 났습니다 (…). 실제 영역을 마지막 기록 상태로 되돌렸습니다. 다시 작성해 주세요.')`(`formatProblems([{ kind: 'PATCH_ERROR', … }])`로 만듦, 편집창 · 테스트 영역은 건드리지 않음). `reportPatchError`는 Dev-18이 `back` · `forward` 예외에도 쓴다), `e2e/phase1-guard.spec.ts`(QA-31 · QA-A12 추가)
    - 테스트(바깥 루프): 먼저 쓰고 미연결 상태에서 `npx playwright test e2e/phase1-guard.spec.ts -g "QA-31|QA-A12"` 4 failed 확인(QA-31: 링크 클릭이 막히지 않아 30s 시간 초과 — 페이지 이동 시도, QA-A12: `선언한 alert가 뜨지 않았다` + 콘솔 `Unhandled error: patch: 경로 [1,7,1,0]에 해당하는 노드가 DOM에 없습니다`) 뒤 구현. 구현 후 `npx playwright test e2e/phase1-guard.spec.ts` 22 passed (desktop 11 · mobile 11, QA-16~21 · 29 · 30 · 32 + QA-31 · QA-A12)
    - 테스트 이름: `QA-31 두 영역 안의 링크 클릭 · 폼 버튼 클릭에도 페이지가 이동하거나 새로고침되지 않는다`(테스트 영역 링크 · 폼 버튼, 실제 영역 링크 · 폼 버튼 4회 클릭 뒤 주소 그대로 · `window.__stay` 살아 있음 · `framenavigated` 0건 · 문서 이동 요청 0건 · 실제 영역 구조 그대로 · 편집창 글 그대로 · 콘솔 오류 없음) · `QA-A12 Patch 도중 예외가 나면 [Patch 오류] alert 뒤 실제 영역이 마지막 기록 상태로 복구되고 다시 Patch하면 성공한다`(실제 영역 `<ul>`을 `remove()`한 뒤 `<li>` · `<p>` 글자를 고쳐 Patch → alert `[Patch 오류]` · `되돌렸습니다`, `<p>` 글자 · `<ul>`이 마지막 기록(초기 샘플) 구조로 복구, 편집창 글 · 테스트 영역 그대로, 다시 Patch하면 성공 — 첫 실패가 기록을 앞으로 보냈다면 두 번째 diff가 비어 실패했을 것이라 "기록 그대로"의 간접 증거)
    - 미룬 것(이유): QA-31의 "클릭 뒤에도 뒤로가 동작해 기록이 살아 있다", QA-A12의 "뒤로 무시 · 다시 Patch 뒤 기록이 정확히 한 칸"은 뒤로 버튼이 Dev-18에서 연결되므로 **Dev-18이 같은 두 테스트에 덧붙여야 한다**(테스트 안 `// [AI Note]`에 표시해 둠). 그 외 C 항목(C2 · C4)은 미루지 않았다
    - 전체 실행(Dev-14 ~ 17 끝): `npx vitest run` 13 files · 334 passed, `npx tsc --noEmit` 오류 0, `npx playwright test` 50 passed (render 10 · patch 18 · guard 22, desktop 25 · mobile 25), 끝난 뒤 5199 대기 중인 프로세스 없음, 커밋 846a80a

- [x] **Dev-18** (`fixture` + `e2e`): 뒤로 · 앞으로 버튼 — 세 칸(편집창 · 테스트 영역 · 실제 영역)이 그 기록 상태로 [P1-26 ~ P1-30 · P1-32 · T-08 · B3]
  - 의존: Dev-13, Dev-15, Dev-17 (오류 알림 함수)
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(`btn-back` · `btn-forward` → `root.back()` / `root.forward()`가 스냅샷을 돌려주면 `renderAreaChildren(testArea, 스냅샷)` + `html-editor.value = vnodesToHtml(스냅샷)`, `null`이면 아무 일 없음, 예외가 나면 Dev-17의 `[Patch 오류]` 알림), `e2e/phase1-history.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-history.spec.ts` — QA-11 ~ QA-15 (Patch 2회 이상 → 뒤로 → 앞으로 세 칸 일치 · 경계 · 갈림길 · 미저장 편집 버림 · 과거 기록 보존). **QA-11(B3)**: Patch 1회 = 글자 하나, 2회 = `<ul>` 끝에 `<li>` 추가 → 뒤로 · 앞으로 때 `MutationObserver` 기록이 바뀐 곳(`<ul>`) 쪽 `childList`뿐이고 그 밖 노드의 기록 · 참조 변화 없음, 한 번 더 뒤로(글자 되돌리기)는 `characterData` 1건뿐
  - 알고리즘: 결정 7 B + VNode · 정책(§3.3 전부)
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-history.spec.ts` desktop · mobile 통과 개수, QA-11 ~ QA-15 테스트 이름, QA-11의 `MutationObserver` 기록 개수
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `fixtures/phase1-vdom-playground/main.ts`(`btn-back` · `btn-forward` → `move(() => root.back() / root.forward())`: 스냅샷이 오면 `renderAreaChildren(testArea, 스냅샷)` + `editor.value = vnodesToHtml(스냅샷)`(미저장 편집 버림), `null`이면 아무 일 없음(경계 무시 · 편집창 글 유지), 예외면 `reportPatchError(error, '뒤로 이동하는 중' | '앞으로 이동하는 중')`. `reportPatchError`에 "무엇을 하다 났는지" 인자를 더해 알림 글이 Patch가 아닌 이동에도 맞게 함 — `[Patch 오류]` · `되돌렸습니다` 말마디는 그대로), `e2e/phase1-history.spec.ts`(새로), `e2e/phase1-guard.spec.ts`(QA-31 · QA-A12에 Dev-17이 미룬 뒤로 단언 덧붙임), `04_qa_evidence/qa_todo.md`(QA-33 행 추가)
    - 테스트(바깥 루프): 스펙을 먼저 쓰고 `main.ts` 변경을 되돌린 상태(`git stash`)에서 `npx playwright test e2e/phase1-history.spec.ts` **10 failed · 2 passed**(QA-12는 버튼이 아무 일도 안 해도 "아무 일 없음"이라 자명하게 통과, 나머지 QA-11 · 13 · 14 · 15 · 예외 테스트는 모두 실패)를 확인한 뒤 변경을 복원. 구현 후 `npx playwright test e2e/phase1-history.spec.ts` **12 passed**(desktop 6 · mobile 6). 편집창 글이 `vnodesToHtml(스냅샷)`과 같은지는 편집창 글 **문자열 그대로**(S1 · S2 · … 때 친 글과 같음, 구조 비교 + 글 비교)로 확인했고 모두 일치(앱 결함 없음)
    - 테스트 이름: `QA-11 Patch 두 번 뒤 뒤로 · 앞으로를 누르면 세 칸이 그 상태가 되고, 바뀌지 않은 노드는 같은 참조이며 바뀐 곳만 변경된다` · `QA-12 처음에서 뒤로, 끝에서 앞으로를 눌러도 아무 일 없고 편집창에 쳐 둔 글도 그대로다` · `QA-13 뒤로 간 뒤 새 Patch를 하면 앞쪽 기록이 끊겨 앞으로가 아무 일도 없고, 뒤로는 A → 초기에서 멈춘다` · `QA-14 이동하면 미저장 편집은 버려지고 세 칸이 모두 그 기록 상태가 된다` · `QA-15 Patch 세 번 뒤 뒤로를 끝까지, 앞으로를 끝까지 가도 각 칸이 Patch 당시 상태와 같다` · `QA-33 뒤로 · 앞으로 도중 예외(C2)가 나면 [Patch 오류] alert 뒤 실제 영역이 그 기록 상태로 복구되고 기록은 움직이지 않는다`
    - QA-11(B3) `MutationObserver` 기록: S1 = 글자 하나, S2 = `<ul>` 끝에 `<li>넷</li>` 추가. 뒤로(S2 → S1) · 앞으로(S1 → S2) 때 `characterData` 0 · `attributes` 0 · `childList` 1 이상이고 모든 기록의 target이 `<ul>`뿐(`['childList:ul', …]`의 집합 = `{childList:ul}`). 뒤로 · 앞으로 모두 `section` · `h2` · `p` · `p` 안 글자 노드 · `ul` · `li` 3개 · `button`이 같은 참조(`===`). 한 번 더 뒤로 두 번(S2 → S1 → 초기)의 마지막(S1 → 초기, 글자 되돌리기)은 `characterData` 1 · `childList` 0 · `attributes` 0 · total 1
    - Dev-14 ~ 17이 미룬 뒤로 단언 채움: QA-31(링크 · 폼 클릭 뒤 뒤로 → Patch 전 샘플로 돌아가고 세 칸 일치 = 기록이 살아 있음), QA-A12(복구 뒤 뒤로가 무시됨 = 기록이 안 늘어남 · MutationObserver 0건 · 편집창 글 그대로 / 다시 Patch 뒤 뒤로 → 초기 샘플, 한 번 더 뒤로는 무시 = 정확히 한 칸), `patchBlocked`(QA-16 ~ QA-21 · 29 · 30 · 32)의 뒤로 단언과 QA-8의 뒤로도 이제 실제로 뒤로 버튼을 누르는 의미가 있으며 모두 통과. `reportPatchError`를 back · forward 예외에도 씀(QA-33)
    - 명세에 없어 판단한 세부: ① 뒤로 · 앞으로 예외 알림 글을 Patch용 문구("Patch를 적용하는 중")가 아니라 "뒤로 이동하는 중" · "앞으로 이동하는 중"으로 나눔(말머리 `[Patch 오류]`는 약속대로 유지). ② `[Patch 오류]` 도중 예외 e2e(QA-33)는 qa_todo에 번호가 없어 QA-33으로 새로 붙임
    - 실행: `npx playwright test e2e/phase1-guard.spec.ts e2e/phase1-patch.spec.ts e2e/phase1-render.spec.ts` 50 passed(변경 없이 기존 통과 유지), `npx vitest run` 13 files · 334 passed, `npx tsc --noEmit` 오류 0, 커밋 8c44e31

- [x] **Dev-19** (`e2e`): 편집창 왕복 · 다양한 태그 인수 테스트 — 브라우저에서 `vnodesToHtml` → 파싱 왕복을 확인하고, 빈 태그 · 인라인 중첩 · 표(`tbody` 유무)를 Patch한다. 발견된 결함이 있으면 앱 코드를 고친다(`fix(...)` 별도 커밋) [P1-13 · P1-23 · T-04 · T-07 · P1-07 ~ P1-12 · §5 · B4 · B5 · B6 · B8 · B9 · B10 · C1]
  - 의존: Dev-15, Dev-18 (QA-23 (b)가 뒤로를 씀) — **시간이 모자라면 이 Dev를 통째로 미룰 수 있다 (우선순위 3, `dev_todo` 위 표)**
  - 만들 · 고칠 파일: `e2e/phase1-patch.spec.ts`(추가) 또는 `e2e/phase1-roundtrip.spec.ts`(새로, 분리해도 됨. 정하면 `qa_todo` 스펙 파일 열을 함께 고침)
  - 테스트(바깥 루프): QA-23(B4) · QA-24(B5) · QA-25(B6) · QA-26(B8 빈 태그) · QA-27(B9 인라인 중첩) · QA-28(B10 표 + C1 `tbody` 없는 표 허용)
  - 알고리즘: 결정 5 · 6 · §5 (C1: `tbody` 자동 추가 허용)
  - 완료 근거로 남길 것: `npx playwright test <해당 파일>` desktop · mobile 통과 개수, QA-23 ~ QA-28 테스트 이름, 고친 결함 목록
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `e2e/phase1-roundtrip.spec.ts`(새로, 분리), `04_qa_evidence/qa_todo.md`(QA-23 ~ QA-28 스펙 파일 열을 `e2e/phase1-roundtrip.spec.ts`로 고침). 앱 코드는 고치지 않음
    - 실행: `npx playwright test e2e/phase1-roundtrip.spec.ts` **12 passed**(desktop 6 · mobile 6). 이미 구현된 동작을 인수 시나리오로 확인하는 Dev라 "먼저 실패" 단계는 없고(Dev-15 · 18에서 구현된 Patch · 뒤로가 이 시나리오를 그대로 통과하는지 보는 것), 첫 실행에서 모두 통과했다. 통과했다는 것은 앱 결함이 발견되지 않았다는 뜻이다
    - 테스트 이름: `QA-23 글을 쳤다 지워 원래 글로 되돌리거나 스냅샷 글(뒤로 뒤 편집창)을 그대로 Patch해도 DOM 변경 0건이고 기록이 안 늘어난다` · `QA-24 편집창에서 안녕 → 반가워 → 안녕으로 고쳐 두고 Patch하면 값이 같아 DOM 변경 0건이고 기록이 안 늘어난다` · `QA-25 글자를 치자마자(기다림 없이) Patch해도 마지막 글자까지 실제 영역에 반영된다` · `QA-26 빈 태그(img · br · hr · input)를 넣고 속성을 바꾸고 지워도 매번 실제 영역이 테스트 영역과 같다` · `QA-27 글자 사이 요소(안<b>녕</b>하세요)에서 <b>만 <i>로 바꾸면 <i>는 새 노드이고 앞뒤 글자 노드 · <p>는 같은 참조다` · `QA-28 표: tbody 있는 표를 넣고 고치고 행을 더해도 맞고, tbody 없는 표는 [구조 불일치] alert 없이 반영된다 (C1)`
    - 확인한 것: QA-23(b)는 뒤로 뒤 편집창 글이 처음 글과 문자열까지 같고(`vnodesToHtml` → 파싱 왕복 안정), 그대로 Patch하면 `MutationObserver` 0건이며, 이어서 앞으로가 여전히 S1로 가서(무변경 Patch가 기록 · redo를 건드리지 않음) 기록이 안 늘었음을 증명한다. QA-25는 `안녕` 바로 뒤에 커서를 두고 `page.keyboard.type('요!!')` 직후 기다림 없이 Patch → `안녕요!!` 반영. QA-27은 두 번째 Patch에서 `<i>`가 새 노드(옛 `<b>`와 `!==`, `<b>`는 `isConnected` 거짓)이고 앞 · 뒤 글자 노드(자식 0번 · 2번)와 `<p>`는 같은 참조. QA-28(b) `tbody` 없는 표는 선언 없는 alert가 없고(있으면 헬퍼가 실패시킴) 실제 영역 표에 `<tbody>`가 들어가며 이어서 고친 칸 글자도 반영
    - 고친 결함: 없음
    - 전체 실행: Dev-19 시점 `npx vitest run` 13 files · 334 passed · `npx tsc --noEmit` 오류 0 (아래 Dev-20 기록에 최종 전체 실행 포함), 커밋 577f2f5

- [x] **Dev-20** (`e2e`): 공격적 시나리오 모음 + 전체 확인 — 발견된 결함이 있으면 앱 코드를 고친다 (결함마다 별도 커밋은 `fix(...)`로) [P1-32 · §6.2 경계 조건 · A4 · A5]
  - 의존: Dev-14 ~ Dev-19
  - 만들 · 고칠 파일: `e2e/phase1-attack.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-attack.spec.ts` — QA-A1 ~ QA-A3 · QA-A5 ~ QA-A11 (특수문자를 Patch까지 · 연타 · 빈 입력 · 들여쓰기만 변경 · 주석 · 복수 루트 · boolean 속성 · style 항목(속성 글 항목 집합 비교, A4) · 검사 알림 후 복구 · 경계에서 편집창 글 유지). QA-A4(새로고침)는 Dev-14의 `phase1-render.spec.ts`에, QA-A12(Patch 도중 예외 복구)는 Dev-17의 `phase1-guard.spec.ts`에 있음
  - 알고리즘: 해당 없음 (결정 5 · §5 정책 확인)
  - 완료 근거로 남길 것: `npx vitest run`(전체 통과 개수) · `npx playwright test`(desktop · mobile 전체 통과 개수, **dialog 감시 · 콘솔 error 0건 공통 장치 아래에서**) · `npx tsc --noEmit` 0, 고친 결함이 있으면 그 목록
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `e2e/phase1-attack.spec.ts`(새로). 앱 코드 · 헬퍼는 고치지 않음
    - 실행: `npx playwright test e2e/phase1-attack.spec.ts` **20 passed**(desktop 10 · mobile 10). 이미 구현된 동작을 공격적으로 확인하는 Dev라 첫 실행에서 모두 통과했고, 통과했다는 것은 앱 결함이 발견되지 않았다는 뜻이다
    - 테스트 이름: `QA-A1 특수문자(&lt; &amp; 이모지)를 Patch하면 글자 그대로 실제 영역에 들어가고 뒤로 → 앞으로 해도 같다` · `QA-A2 Patch 5회 · 뒤로 10회 · 앞으로 10회를 연타해도 오류 없이 뒤로를 누른 만큼만 이동하고 경계에서 멈춘다` · `QA-A3 편집창을 비우고 Patch하면 영역이 비고 오류가 없으며, 뒤로 하면 이전 샘플 상태로 돌아오고 편집창에 글이 다시 채워진다` · `QA-A5 들여쓰기만 바꾸고 Patch하면 공백 글자가 실제 영역에 반영되고 요소는 같은 참조다` · `QA-A6 주석 글을 고치고 지우고 새로 넣어도 실제 영역의 주석이 편집창과 같다` · `QA-A7 최상위가 두 개인 상태(<p>a</p><p>b</p>)도 반영되고 뒤로 하면 <section> 하나로 돌아온다` · `QA-A8 boolean 속성: disabled를 지우면 사라지고 다시 넣으면 ""로 생기며 <button>은 같은 참조다` · `QA-A9 style 항목: 바뀐 항목만 바뀌고 <p>는 같은 참조이며 마지막 항목을 지우면 style이 없어진다 (모르는 항목도 속성 글 기준으로 같다)` · `QA-A10 검사 알림으로 막힌 뒤 글을 고치고 다시 Patch하면 정상 반영되고 기록이 한 칸만 늘어난다` · `QA-A11 처음 상태에서 편집창에 글을 치고 뒤로를 누르면 이동이 없어 친 글 · 미리보기가 그대로 남는다`. QA-A4(새로고침)는 `phase1-render.spec.ts`, QA-A12(Patch 도중 예외)는 `phase1-guard.spec.ts`에 이미 있음
    - 확인한 숫자: QA-A2 연타 한 번에(`el.click()` 5회) = `characterData` 1 · total 1(첫 Patch만 반영, 나머지 4회 무변경), 뒤로 10회 → 초기에서 멈춤 · 앞으로 10회 → 끝에서 멈춤 · 뒤로 2 · 앞으로 1은 정확히 그만큼만 이동. QA-A5 `characterData` 1 · total 1(공백 노드가 같은 참조). QA-A8 `attributes` 1 · total 1(지울 때 · 넣을 때 각각). QA-A9 별도 판에서 `foo: bar`는 `style` 속성 글에는 남고 `el.style.cssText`에는 없으며, `structureOf`의 항목 집합에서 실제 · 테스트 영역이 같고 `["foo","bar"]`가 들어 있음(A4)
    - 고친 결함: 없음
    - **전체 확인(Dev-14 ~ 20 끝)**: `npx vitest run` 13 files · **334 passed**, `npx tsc --noEmit` 오류 **0**, `npx playwright test` **94 passed**(render 10 · patch 18 · guard 22 · history 12 · roundtrip 12 · attack 20, desktop 47 · mobile 47, dialog 감시 · 콘솔 error 0건 공통 장치 아래), 끝난 뒤 5199 대기 중인 프로세스 없음. 미룬 테스트 케이스 없음(B1 ~ B13 · C1 ~ C5 모두 수행 — Dev-19도 미루지 않음), 커밋 7b6ba80

## Dev 항목 — 선택 확장 (필수 뒤, 이 순서)

- [x] **Dev-21** (`react-reconciler`): Key 비교 — key 표 매칭 + MOVE [Key 확장 · PRD §5 · §6.2]
  - 의존: Dev-3, Dev-4, Dev-5
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`(자식 목록 비교에 key 분기 추가), `packages/react-reconciler/src/__tests__/applyPatches.ts`(MOVE 검산 확인)
  - 규칙: **자식 목록 단위**로 판단한다. 그 목록(옛 · 새 모두)의 모든 자식이 key가 있고 목록 안에서 중복이 없을 때만 key 비교, 아니면 그 목록은 위치 비교(필수 동작 그대로). key 비교 순서: ① 새 목록에 없는 옛 key를 **뒤에서부터** REMOVE → ② 새 목록을 앞에서부터 보며 key가 현재 목록에 있으면 자리(`from`)가 다를 때 MOVE(`from` → `to`), 없으면 INSERT → ③ 짝이 맞은 노드끼리 재귀 diff(태그가 다르면 REPLACE). 최소 이동 수는 보장하지 않는다
  - 테스트: `packages/react-reconciler/src/__tests__/diffKeyed.test.ts` — `h()`로 key를 준 VNode: 중간 삽입(INSERT) · 중간 삭제(REMOVE) · 재정렬(MOVE) · 삽입 + 삭제 + 재정렬 동시, key가 같고 내용이 바뀌면 이동 없이 글자 · 속성 patch만, key가 같고 태그가 다르면 REPLACE, 같은 key 중복 · key 없는 자식이 섞인 목록은 위치 비교로 돌아감(필수 동작과 같은 결과), 무작위 key 순열(고정 씨앗) 200쌍에서 `applyPatches(old, diff(old, new))`가 new와 같고 `applyPatches(new, invertPatches(…))`가 old와 같음 (PRD §5 Key 검증)
  - 알고리즘: 결정 2 B (Key 확장: key 표) · Key 출처 = 단위 테스트로만
  - 완료 근거로 남길 것: `diffKeyed.test.ts` 통과 개수, `diff.test.ts` · `invertPatches.test.ts` 회귀 통과 개수, 무작위 200쌍
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-reconciler/src/diff.ts`(`isKeyed` · `diffKeyedChildren` 추가, `diffChildren`이 목록 단위로 분기), `packages/react-reconciler/src/__tests__/diffKeyed.test.ts`(새로, 25건). `applyPatches.ts`(MOVE 검산) · `invertPatches.ts`(MOVE 역)는 이미 있어 고치지 않음
    - 실행: `npx vitest run packages/react-reconciler` 3 files · **83 passed**(diffKeyed 25 · diff 45 · invertPatches 13). 전체 `npx vitest run` 14 files · **359 passed**(334 + 25), `npx tsc --noEmit` 0
    - 무작위 200쌍: `고정 씨앗 200쌍: applyPatches(old, diff) = new, 역패치로 old 복원, key 순서 일치`(씨앗 20261111, 12개 key 풀에서 부분집합 · 섞기, 같은 key의 내용 · 속성 · 태그 변경 섞임, MOVE가 합계 200개 넘게 나왔는지도 확인)
    - 기존 테스트 변경 1건: `diff.test.ts`의 `key는 props가 아니라 비교하지 않는다`는 "모든 자식에 key가 있는 목록"이 이제 key 비교로 가서(key 1 → 2는 REMOVE + INSERT) 그대로는 성립하지 않아, 같은 의도(key는 props가 아님)를 key 없는 자식이 섞인 목록(위치 비교)에서 확인하도록 고침
    - 결정한 세부: 이동 수 최소 보장 안 함(`[a,b,c] → [b,c,a]`는 2번), 숫자 `1`과 문자열 `"1"`은 다른 key, 글자 · 주석 노드는 key가 없어 섞이면 위치 비교, 빈 목록은 key 목록으로 취급(결과는 위치 비교와 같음), 위치 비교로 돌아간 목록에서 key는 patch로 옮기지 않음(key는 props가 아님)
    - 커밋: (해시는 이 Dev 묶음의 마지막 docs 커밋에 기록)

- [x] **Dev-22** (`react-dom-bindings`): `patch`의 MOVE — 같은 DOM 노드를 옮긴다 [Key 확장]
  - 의존: Dev-6, Dev-21
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/patch.ts`(Dev-6의 "MOVE 오류" 자리를 구현: `parent` 경로의 자식 `from`번을 빼서 뺀 뒤 목록의 `to`번 자리에 넣음)
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/patch.test.ts`(추가) — MOVE 앞으로 · 뒤로 이동, 이동한 노드의 참조가 그대로(`===`), 이동 중에 다른 형제 참조도 그대로, MOVE 뒤 INSERT · REMOVE가 이어질 때 경로가 그 순간 기준, MOVE의 역(from ↔ to)이 원래 순서를 되돌림, Dev-6의 "MOVE 오류" 테스트는 제거 (PRD §5)
  - 알고리즘: 결정 2 B (이동) · 결정 4 A (그 순간 기준)
  - 완료 근거로 남길 것: `patch.test.ts` 통과 개수, 참조 유지 테스트 이름
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-dom-bindings/src/client/patch.ts`(`case 'MOVE'` 구현: `parent.insertBefore(moved, 뺀 뒤 목록의 to번 노드)`), `packages/react-dom-bindings/src/client/__tests__/patch.test.ts`(Dev-6의 "MOVE 오류" 테스트 1건 제거, `patch — MOVE (Key 확장…)` 11건 추가)
    - 실행: `npx vitest run packages/react-dom-bindings` 8 files · **224 passed**(patch.test.ts 41건). 전체 `npx vitest run` · `npx tsc --noEmit` 결과는 이 묶음 마지막 커밋의 확인에 기록
    - 참조 유지 테스트 이름: `이동한 노드의 참조가 그대로다 (===): 새로 만들지 않고 같은 DOM 노드를 옮긴다`(이동하지 않은 형제 · 부모도 `toBe`), `이동 중에 다른 형제를 새로 만들거나 지우지 않는다 (childList 기록은 옮긴 노드 하나의 제거 + 삽입뿐)`(`MutationObserver`), `MOVE의 역(from ↔ to)이 원래 순서와 같은 참조로 되돌린다`, `MOVE 뒤에 이어지는 INSERT · REMOVE · SET_TEXT의 경로는 그 순간의 트리 기준이다 (결정 4 A)`, `diff(Key) 결과를 그대로 적용하면 같은 key 노드의 참조가 유지되고 결과가 목표와 같다`
    - 결정한 세부: `from === to`는 DOM을 건드리지 않음(기록 0건 확인), `from` · `to`가 목록 밖이면 `from N` · `to N`이 적힌 오류(C2 복구 재료), `parent: []`는 영역 상자 자신의 자식 목록
    - 커밋: (해시는 이 Dev 묶음의 마지막 docs 커밋에 기록)

- [x] **Dev-23** (`react-dom`): Key 통합 테스트 — 삽입 · 삭제 · 재정렬 뒤에도 같은 key 노드가 유지되고, 역패치(MOVE 포함)로 되돌아온다 [Key 확장 · PRD §5 · §6.2]
  - 의존: Dev-21, Dev-22
  - 만들 · 고칠 파일: `packages/react-dom/src/__tests__/diffPatchKeyed.test.ts` (테스트만, 필요한 경우에 한해 `createVDomRoot`의 작은 고침)
  - 테스트: `h()`로 만든 key 목록을 `renderAreaChildren`으로 그린 뒤 `patch(area, diff(old, new))`: 삽입 · 삭제 · 재정렬 각각에서 같은 key 요소의 참조가 `===`로 유지(PRD §5 "같은 Key의 노드가 유지"), 새로 생긴 key만 새 노드, 지워진 key만 분리, 결과 DOM이 `renderVNode(new)`와 구조가 같음, 같은 patch를 `invertPatches`로 되돌리면(MOVE 역 포함) 원래 순서 · 같은 참조, `createVDomRoot`에 key VNode를 `update` → `back` → `forward`해도 기록 일치(필요 시 `update(next)`는 `h()` VNode를 그대로 받음)
  - 알고리즘: 결정 2 B · 결정 7 · Key 출처 = 단위 테스트로만 (화면에는 key 없음)
  - 완료 근거로 남길 것: `diffPatchKeyed.test.ts` 통과 개수, 참조 유지 · MOVE 역패치 테스트 이름, `npx vitest run` 전체 통과 개수
  - **완료 근거 (Evidence)**:
    - 만든 파일: `packages/react-dom/src/__tests__/diffPatchKeyed.test.ts`(새로, 12건, 테스트만). `createVDomRoot` · 앱 코드는 고치지 않음(`update(next)`가 `h()` VNode를 그대로 받아 필요 없었음)
    - 실행: `npx vitest run packages/react-dom/src/__tests__/diffPatchKeyed.test.ts` **12 passed**. 이 Dev는 Dev-21 · 22가 이미 끝난 위에 통합만 확인하는 테스트라 처음부터 통과했고, 대신 `patch.ts`의 MOVE를 일부러 `cloneNode` 복제로 바꿔 보면 6건이 실패하는 것(참조 유지를 정말 잡는 것)을 확인한 뒤 되돌림
    - 참조 유지 테스트 이름: `중간 삽입: 기존 key 노드는 모두 ===, 새 key만 새 노드`, `중간 삭제: 지워진 key만 분리되고 남은 key 노드는 ===`, `재정렬: 모든 key 노드가 ===이고 순서만 바뀐다 (MOVE만, 새 노드 없음)`, `삽입 + 삭제 + 재정렬 + 내용 변경이 한 번에: …`, `같은 key인데 태그가 다르면 그 key만 새 노드(REPLACE), 나머지는 ===`
    - MOVE 역패치 테스트 이름: `재정렬을 invertPatches로 되돌리면 원래 순서 · 같은 참조`, `삽입 + 삭제 + 재정렬을 되돌리면 원래 모양이고, 남아 있던 key는 같은 참조 (지워졌던 key는 다시 만들어진 새 노드)`, `왕복을 여러 번 반복해도 같은 참조 · 같은 모양`
    - History: `key가 snapshot에 담긴 뒤부터 MOVE · INSERT · REMOVE로 움직이고, back · forward가 기록과 일치하며 참조가 유지된다`, `저장한 VNode(snapshot)는 이동 · 갱신으로 바뀌지 않고…`, `같은 key 목록을 다시 update하면(무변경) 기록하지 않고 DOM도 건드리지 않는다`
    - 알게 된 점: `createVDomRoot`의 0번 기록은 DOM에서 읽은 VNode라 key가 없다 → key VNode가 처음 들어오는 update는 위치 비교, 그 기록에 key가 담긴 뒤의 update부터 key 비교 · MOVE. 무변경 update는 기록하지 않으므로 key가 담기려면 모양이 바뀌는 update여야 한다. Phase 2 앱이 처음부터 key VNode를 그리면 해당 없음(phase2 task에서 확인)
    - 전체: `npx vitest run` 15 files · **381 passed**(334 + Dev-21 25 + Dev-22 순증 10 + Dev-23 12), `npx tsc --noEmit` 0
    - 커밋: (해시는 이 Dev 묶음의 마지막 docs 커밋에 기록)

- [ ] **Dev-24** (`react-dom-bindings`): `patch`가 적용하는 노드를 바깥에 알리는 콜백 (`PatchObserver`) — Diff 시각화 재료 [Diff 시각화 확장]
  - 의존: Dev-6 (MOVE까지 알리려면 Dev-22)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/patch.ts`(`patch(area, patches, observer?)`), `packages/react-dom-bindings/src/index.ts`(타입 내보내기)
  - 설계: `PatchObserver = (event: { patch: Patch; node: Node; stage: 'before' | 'after' }) => void`. **REMOVE는 지우기 직전에 `stage: 'before'`로**(위치를 재야 하므로 아직 붙어 있는 노드를 넘김), 나머지(SET_TEXT · SET_ATTR · SET_STYLE · INSERT · REPLACE · MOVE)는 **적용 직후 `stage: 'after'`로** 바뀐 노드(INSERT · REPLACE는 새 노드)를 넘긴다. 콜백이 없으면 지금과 똑같이 동작. 실제 DOM에 표시용 class · 속성을 붙이지 않는다
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/patch.test.ts`(추가) — 콜백이 patch 개수만큼 순서대로 불림, REMOVE는 `before` · 노드가 아직 `isConnected`, 나머지는 `after` · 노드가 이미 반영됨(`nodeValue` · 속성 확인), 콜백이 없을 때 결과 DOM 동일, 콜백을 넘겨도 `MutationObserver` 기록이 콜백 없을 때와 같음(표시용 변경 없음)
  - 알고리즘: 해당 없음 (Diff 시각화 명세: patch가 바꾼 노드 정보를 넘겨 줌)
  - 완료 근거로 남길 것: `patch.test.ts` 통과 개수, 콜백 순서 테스트 이름

- [ ] **Dev-25** (`react-dom`): `createVDomRoot`가 `update` · `back` · `forward`의 patch에 같은 콜백을 전달한다 [Diff 시각화 확장]
  - 의존: Dev-24, Dev-13
  - 만들 · 고칠 파일: `packages/react-dom/src/createVDomRoot.ts`(`options.onPatch`를 `patch(…, observer)`에 그대로 전달)
  - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts`(추가) — `update` · `back` · `forward` 각각에서 콜백이 해당 patch 수만큼 불림(역패치는 `inverse` 개수), 무변경 `update` · 경계 이동에서는 불리지 않음, 콜백을 안 줘도 기존 테스트 통과
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: `createVDomRoot.test.ts` 통과 개수

- [ ] **Dev-26** (`fixture` + `e2e`): [시각화 켜기] 스위치(기본 꺼짐) + 오버레이 깜빡임 — Patch · 뒤로 · 앞으로 [Diff 시각화 확장 · A1]
  - 의존: Dev-25, Dev-18
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/index.html`(스위치 `viz-toggle`, 실제 영역을 감싼 상대 위치 박스 안에 `pointer-events:none` 오버레이 `viz-overlay` — 실제 영역 **밖**에 둠), `fixtures/phase1-vdom-playground/overlay.ts`(새로: 콜백으로 받은 노드의 위치를 재서 상자를 그림), `fixtures/phase1-vdom-playground/main.ts`(`createVDomRoot(…, { onPatch })`에 연결), `e2e/phase1-visual.spec.ts`
  - 설계: 스위치가 꺼져 있으면 콜백이 아무것도 재지 않음(**patch 개수만 세서 `viz-overlay`의 `data-last-patch-count`에 남김**). 켜져 있으면 patch 하나마다 상자 하나: `before`(REMOVE)는 그 순간 재서 저장, `after`는 바로 잰다. 글자 노드는 `Range`로 재고, 크기가 0이거나 주석이면 부모 요소로 대신한다. 한 번의 `update` · `back` · `forward`가 끝나면 저장한 위치에 상자를 그리고 CSS 애니메이션이 끝나면 지운다. **그린 상자 개수는 `data-last-flash-count`, 이번 동작의 patch 개수는 `data-last-patch-count`에 다음 동작 전까지 남겨** e2e가 깜빡임 시간에 흔들리지 않게 한다(A1). 실제 DOM에는 class · 속성을 붙이지 않는다
  - 테스트(바깥 루프): `e2e/phase1-visual.spec.ts` — QA-22 (기본 꺼짐 · 켜면 Patch · 뒤로 · 앞으로에서 **깜빡임 개수 = 그 동작의 patch 개수** · 정확한 숫자(= 1)는 글자 하나 Patch만 · 실제 영역에 표시용 변경 없음 · 끄면 깜빡임 0)
  - 알고리즘: Diff 시각화 (스위치 + 오버레이 깜빡임만, 실제 노드에 class 안 붙임)
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-visual.spec.ts` desktop · mobile 통과 개수, `npx playwright test` 전체 통과 개수

<!-- 완료 예시
- [x] **Dev-3** (`react-reconciler`): diff 기본 ...
  - **완료 근거 (Evidence)**: `packages/react-reconciler/src/diff.ts`의 `diffNode()` ...
    `npx vitest run packages/react-reconciler/src/__tests__/diff.test.ts` N passed, 커밋 abc1234
-->

## 의존 한눈에

```
reconciler:  Dev-3 → Dev-4 → Dev-5          (DOM 없음, 바로 시작 가능)
bindings:    Dev-1 → Dev-2 → Dev-6          Dev-7 · 8 → 9 → 10
react-dom:   Dev-11 ─┐
                     └→ Dev-12 (2·3·4·5·6·11) → Dev-13
fixture/e2e: Dev-14 (2·7·8·12) → 15 → 16 (10) → 17 (12·16) → 18 (13·17) → 19 (15·18) → 20 (14~19)
확장:        Dev-21 → 22 → 23 → 24 → 25 → 26
```
