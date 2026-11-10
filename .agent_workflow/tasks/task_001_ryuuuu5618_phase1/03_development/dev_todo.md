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
    - 실행: `npx vitest run` 3 files · 46 passed, `npx tsc --noEmit` 오류 0, 커밋: 메시지 `(Dev-1)` (`git log --oneline --grep "Dev-1)"`)

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
    - 실행: `npx vitest run` 4 files · 70 passed, `npx tsc --noEmit` 오류 0, 커밋: 메시지 `(Dev-2)`

- [x] **Dev-3** (`react-reconciler`): `diff` 기본 — 글자 · 주석 글 · 속성 추가 · 수정 · 삭제 · style 항목 · 교체 · 무변경 (자식은 같은 길이까지) [P1-06 ~ P1-09 · P1-12 · P1-13 · P1-33 · T-03 · T-04]
  - 의존: 없음 (DOM 없이 VNode만)
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`, `packages/react-reconciler/src/index.ts`(새로), `packages/react-reconciler/src/__tests__/applyPatches.ts`(**테스트 전용 검산기**: VNode 목록에 patch를 순서대로 적용해 새 VNode 목록을 만든다. MOVE 포함 7종)
  - 테스트: `packages/react-reconciler/src/__tests__/diff.test.ts` — D-01 글자(SET_TEXT) · 주석 글 · D-02 속성 추가 / 수정 / 삭제(SET_ATTR before · after null) · boolean 속성 켜기 · 끄기(교체 아님) · style 항목 추가 / 수정 / 삭제(SET_STYLE) · D-05 태그가 다르면 REPLACE(before · after 통째) · 글자 ↔ 요소 ↔ 주석 종류가 다르면 REPLACE · 같은 입력이면 빈 목록(T-04) · 입력 VNode를 고치지 않음(깊은 얼림) · `applyPatches(old, diff(old, new))`가 new와 같음 (T-03 · T-04)
  - 알고리즘: 결정 2 (필수: 위치 기반) · 결정 3 A · 결정 4 A
  - 완료 근거로 남길 것: `diff.test.ts` 통과 개수, D-01 ~ D-05 중 D-01 · D-02 · D-05가 이 Dev에서 통과함을 테스트 이름으로 표시
  - **완료 근거 (Evidence)**:
    - 만든 · 고친 파일: `packages/react-reconciler/src/diff.ts`(`diff` · `diffNode` — TEXT/COMMENT 분기 SET_TEXT, 속성 · style 항목 비교, 종류 · 태그가 다르면 REPLACE, 자식은 겹치는 길이까지만), `packages/react-reconciler/src/index.ts`(새로, `diff` 내보내기), `packages/react-reconciler/src/__tests__/applyPatches.ts`(테스트 전용 검산기, MOVE 포함 7종 + `normalizeTree`)
    - 테스트: `diff.test.ts` 30건 통과 (`npx vitest run packages/react-reconciler`). 모듈이 없는 상태에서 실패하는 것을 먼저 확인. 이 Dev에서 통과한 기본 케이스: `D-01 글자가 바뀌면 SET_TEXT 한 줄`, `D-01 중첩 안의 글자`, `D-02 속성 추가 · 수정 · 삭제`, `D-05 태그가 다르면 REPLACE`, `D-05 중첩 안의 교체`, `글자 ↔ 요소 ↔ 주석 종류가 다르면 REPLACE`, `같은 입력이면 빈 목록 (P1-13)`, `입력 VNode를 고치지 않는다(깊게 얼린 입력)`, 모든 `run()` 테스트가 `applyPatches(old, diff(old, new))`가 new와 같음을 함께 확인
    - 실행: `npx vitest run` 5 files · 100 passed, `npx tsc --noEmit` 오류 0, 커밋: 메시지 `(Dev-3)`

- [ ] **Dev-4** (`react-reconciler`): `diff` 자식 추가 · 삭제 · 중첩 · 복합 — 길이가 다른 자식 목록(INSERT 앞에서 · REMOVE 뒤에서) [P1-10 · P1-11 · P1-14 ~ P1-16 · T-03 · T-05 · B20]
  - 의존: Dev-3
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`
  - 테스트: `packages/react-reconciler/src/__tests__/diff.test.ts` — D-03 끝에 추가 · D-04 끝 삭제(REMOVE의 node = 원본 통째) · 여러 형제 한꺼번에 삭제(경로가 뒤에서부터) · 여러 개 한꺼번에 추가(앞에서부터) · 가운데 형제 삭제는 위치 비교 결과(뒤 형제 글자 바꾸기 + 마지막 REMOVE)가 되어도 최종 결과가 목표와 같음 · 중첩 3단계 안의 변경 · 삭제와 수정이 함께 있을 때 다른 노드를 잘못 건드리지 않음 · 복합(글자 + 속성 + 추가 + 삭제 + 교체 동시) · 빈 목록 ↔ 여러 개 · 경로가 공백 · 주석 번호를 센다 · 무작위(고정 씨앗) 트리 쌍 200개에서 `applyPatches(old, diff(old, new))`가 new와 같음 (T-03 · T-05) · **깊은 트리 · 넓은 트리(B20): 깊이 300 중첩의 맨 아래 글자 바꾸기 · 형제 2,000개에서 끝에 추가 / 전부 삭제가 스택 넘침 없이 끝나고 `applyPatches` 결과가 목표와 같음(시간 제한은 걸지 않음)**
  - 알고리즘: 결정 2 (위치 기반: 남으면 추가 · 삭제) · 결정 4 A (그 순간 기준 경로)
  - 완료 근거로 남길 것: `diff.test.ts` 통과 개수, D-03 · D-04 · T-05 해당 테스트 이름, 무작위 200쌍 통과, 깊이 300 · 형제 2,000 테스트 이름

- [ ] **Dev-5** (`react-reconciler`): `invertPatches` — 전후 뒤집기 + 역순 (역패치) [P1-26 · T-08]
  - 의존: Dev-3 (`applyPatches` 검산기 · patch 종류)
  - 만들 · 고칠 파일: `packages/react-reconciler/src/invertPatches.ts`, `packages/react-reconciler/src/index.ts`
  - 테스트: `packages/react-reconciler/src/__tests__/invertPatches.test.ts` — 종류별 뒤집기(SET_TEXT · SET_ATTR · SET_STYLE는 before ↔ after, INSERT ↔ REMOVE는 같은 경로 · 같은 node, REPLACE는 before ↔ after, MOVE는 from ↔ to), 순서가 뒤집힘, 두 번 뒤집으면 원래 목록, 입력 목록을 고치지 않음, `applyPatches(new, invert(diff(old, new)))`가 old와 같음 (Dev-4의 무작위 200쌍 재사용) (T-08)
  - 알고리즘: 되돌리는 순서 = 역순 (결정 7 세부)
  - 완료 근거로 남길 것: `invertPatches.test.ts` 통과 개수, 무작위 200쌍 왕복 통과

- [ ] **Dev-6** (`react-dom-bindings`): `patch` — 경로 + 순서대로 하나씩 실제 DOM에 반영 (SET_TEXT · SET_ATTR · SET_STYLE · INSERT · REMOVE · REPLACE) [P1-34 · P1-13 · P1-17 · P1-18 · T-03 · T-04 · T-06 · B20]
  - 의존: Dev-1 (INSERT · REPLACE가 `renderVNode` 사용), Dev-2 (결과를 `domToVNode`로 비교), Dev-4 (diff 결과 모양 확인)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/patch.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/patch.test.ts` — 손으로 쓴 Patch 목록으로: 종류별 반영(D-01 ~ D-05), 글자 노드의 `nodeValue`만 바꿈(노드 참조 유지), 속성 추가 / 수정 / 삭제 · boolean(`""`) · style 항목별(다른 항목 유지, 마지막 항목을 지우면 `style` 속성도 제거), 경로가 영역 상자 안 자식부터이고 공백 · 주석 번호를 셈, 한 목록 안에서 INSERT(앞에서) · REMOVE(뒤에서)를 순서대로 적용, 빈 목록이면 `MutationObserver` 기록 0건(T-04), 대상 · 부모 · 형제 요소의 참조 유지(T-06 · P1-17 · P1-18), REPLACE는 새 노드로 바뀜(옛 참조 분리), MOVE는 이 Dev에서는 "Key 확장에서 구현" 오류를 낸다(`// [AI Note]`로 표시), 경로가 없으면 분명한 오류(C2 복구의 재료), **깊이 300 중첩 · 형제 2,000개에 `diff` 결과를 적용해도 스택 넘침 없이 끝나고 결과가 목표와 같음(B20)** (T-03 · T-04 · T-06)
  - 알고리즘: 결정 4 A (경로 + 순서대로) · 공백 · 주석 유지 · boolean · style
  - 완료 근거로 남길 것: `patch.test.ts` 통과 개수, `MutationObserver` 0건 테스트 이름, 참조 유지 테스트 이름, 깊이 300 · 형제 2,000 테스트 이름

- [ ] **Dev-7** (`react-dom-bindings`): `vnodesToHtml` — 저장한 VNode를 편집창에 채울 HTML 글로 [P1-22 · P1-30 · §5 공백 · 주석 · B18 · B19]
  - 의존: Dev-1 (`styleMapToText`), Dev-2 (왕복 검증)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/vnodesToHtml.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/vnodesToHtml.test.ts` — 공백 텍스트 · 줄바꿈 그대로, 주석 `<!--…-->`, 값 있는 속성 `name="value"`(값의 `&` · `"` 이스케이프), boolean `name=""`, style 속성 글, 빈 태그(`br` `hr` `img` `input` …)는 닫는 태그 없음, 텍스트의 `<` `>` `&` 이스케이프(특수문자 `<b>굵게 아님</b> & &amp; 😀`), `pre` · `textarea` 첫 줄바꿈 보존, 0개 · 여러 개 최상위, 왕복(`HTML 글 → 파싱 → domToVNode`가 원래 VNode와 같음: 샘플 · 중첩 · 주석 · 특수문자) / **원문 글 요소(B18, 변환기 견고성 단위 테스트 — 페이지에서는 `<style>`이 C5로 막힘): `<style>` 안의 `a > b` · `&`는 이스케이프하지 않고 그대로 쓰며 왕복해도 같다. `<textarea>` 안은 이스케이프(`&gt;` → 글자 `>`로 읽힘)하는 것과 대비** / **나란히 붙은 글자 노드 두 개(B19): `"a"`, `"b"`는 글 `ab`로 합쳐지므로, 왕복 비교는 인접한 글자 노드를 합친 뒤 비교한다(`mergeAdjacentText` 테스트용 도우미). 무작위 왕복 생성기는 인접 글자 노드를 만들지 않는다. 참고: DOM에서 읽은 VNode에는 인접 글자 노드가 생기지 않는다**
  - 알고리즘: 결정 5 B · 편집창 글 = 스냅샷을 HTML 글로 (명세 4절)
  - 완료 근거로 남길 것: `vnodesToHtml.test.ts` 통과 개수, 샘플 왕복 통과, `<style>` 원문 · 인접 글자 노드 테스트 이름

- [ ] **Dev-8** (`react-dom-bindings`): `setAreaHtml` — 편집창 글을 위험한 것을 빼고 미리보기(테스트 영역)에 그린다 [P1-21 · P1-22 · §5 실행 가능한 HTML · C3 · C5 · B11 · B12]
  - 의존: Dev-1 (`renderAreaChildren`), Dev-2 (결과를 `readAreaChildren`으로 확인)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/sanitize.ts`(`scanDangerous(root)` — 위 「미리보기에서 빼고 Patch 때 막는 목록」의 **단 하나의 기준**, 찾아서 알려 주는 함수 + 빼는 함수, Dev-9가 재사용), `packages/react-dom-bindings/src/client/setAreaHtml.ts`, `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/setAreaHtml.test.ts` — `on…` 속성(대소문자 섞어도) 제거, `<script>` 제거, `javascript:` 주소 제거(앞 공백 · 제어문자 · 대문자 섞어도, `href` · `src` · `action` · `formaction`), **`javascript:`를 숨긴 것(B12): 문자 참조 `jav&#x61;script:` · `&#106;avascript:` · 값 안 탭 · 줄바꿈 `java\tscript:` · 앞 공백 + 대문자 `" JAVA\tscript:"` 모두 `href`가 빠짐**, **`<iframe>`(`srcdoc` 안에 `<script>parent.__pwned=1</script>` 포함 · `src`) · `<object>` · `<embed>` 제거(B11 · C3): 영역에 남지 않고 `window.__pwned`가 정의되지 않음**, **`<style>` · `<link rel="stylesheet">`(`rel="Stylesheet"` · `rel="alternate stylesheet"` 포함) 제거(C5), `<link rel="icon">` 등 다른 `rel`은 그대로 둠**, 나머지 속성 · 구조 · 공백 · 주석 · 인라인 `style` 속성은 그대로, 빈 글 → 영역 비움, 글을 `<template>`로 파싱한 뒤 영역에 옮겨서 **파싱 중에 코드가 실행되지 않음**(`<img src=x onerror=…>`를 넣어도 전역 변수가 안 바뀜), 영역 상자 자신은 그대로, 다시 호출하면 이전 내용이 완전히 바뀜 (§5 실행 가능한 HTML)
  - 알고리즘: §5 실행 가능한 HTML (미리보기는 빼고 그림). 살아 있는 요소에 `innerHTML`로 바로 넣지 않는다 (`<img onerror>`가 파싱 중 실행될 수 있음 → `<template>` 안에서 먼저 정리) `// [AI Note]`
  - 완료 근거로 남길 것: `setAreaHtml.test.ts` 통과 개수, "파싱 중 실행 안 됨" · "srcdoc iframe 제거" · "숨긴 javascript: 제거" 테스트 이름

- [ ] **Dev-9** (`react-dom-bindings`): `checkHtml` 1 — 위험 코드 · SVG · 알림 글 만들기 [§5 실행 가능한 HTML · §5 HTML 범위(SVG 미지원) · §6.2 지원하지 않는 입력 · C3 · C5 · B11 · B12]
  - 의존: Dev-8 (`scanDangerous`)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/checkHtml.ts`(`checkHtml` · `formatProblems` · `HtmlProblem` 타입), `packages/react-dom-bindings/src/index.ts`
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts` — 위험 코드(`on…` · `<script>` · `javascript:`)가 있으면 `DANGEROUS` 문제, **숨긴 `javascript:`(문자 참조 · 값 안 탭 · 앞 공백 + 대문자)도 `DANGEROUS`(파싱한 뒤의 값으로 검사, B12)**, **`<iframe srcdoc="<script>…">` · `<object>` · `<embed>` · `<style>` · `<link rel="stylesheet">`도 `DANGEROUS`이고 알림 글에 요소 이름이 들어감(C3 · C5 · B11), `<link rel="icon">`은 문제 없음**, `<svg>`(대소문자 섞어도, 안에 자식이 있어도)가 있으면 `SVG` 문제, 정상 샘플 · 빈 글 · 공백만 · 주석만 · 최상위 여러 개는 문제 없음(`[]`), 문제가 여러 개면 모두 돌려줌, 알림 글이 `[위험한 코드]` · `[SVG 미지원]` 말마디와 "다시 작성해 주세요."를 담음
  - 알고리즘: §5 HTML 편집 · 오류 (Patch 때 검사, 문제가 있으면 Patch를 막는다)
  - 완료 근거로 남길 것: `checkHtml.test.ts` 통과 개수, 알림 글 예시 1건 (`<iframe>` 포함)

- [ ] **Dev-10** (`react-dom-bindings`): `checkHtml` 2 — 태그 짝 검사 + 구조 비교(`tbody` 자동 추가만 예외) [§5 HTML 편집 · 오류 · §6.2 지원하지 않는 입력과 오류 복구 · C1 · B14 · B15 · B16]
  - 의존: Dev-9, Dev-7 (`vnodesToHtml` 결과가 항상 통과하는지 확인)
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/htmlScan.ts`(글을 훑는 간단한 분석기: 태그 열기 · 닫기 · 주석 · 따옴표 안의 `>` · 빈 태그(`area base br col embed hr img input link meta param source track wbr`) · 원문 그대로 읽는 `style` · `textarea` · `script` · `iframe` 안은 건너뜀, `<` 뒤가 글자가 아니면(`1 < 2`, `x <= y`) 태그로 세지 않음, 태그 이름은 대소문자 무시), `packages/react-dom-bindings/src/client/checkHtml.ts`(짝 · 구조 문제 추가, `tbody` 예외)
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/checkHtml.test.ts`(추가) — 닫는 태그 빠짐(`<div><p>글</div>`) · 여는 태그 없이 닫기 · 순서 어긋남(`<b><i></b></i>`) → `UNPAIRED`, 빈 태그(`<br>` `<img …>`)와 `<br/>`는 짝 없이도 정상, 주석 안의 `<div>`는 무시, 속성값 안의 `>`는 무시, 짝은 맞지만 브라우저가 고쳐 읽는 입력(`<p><div>x</div></p>`)은 `STRUCTURE`, **표(C1): `<table><tr><td>1</td></tr></table>` · 행 여러 개 · `<table><tbody><tr>…` 직접 쓴 `tbody`는 모두 문제 없음(`[]`, `tbody` 자동 추가는 예외). 반면 `<table><td>1</td></table>`(`tbody` 말고 `<tr>`도 자동 추가됨)은 여전히 `STRUCTURE`**, 짝과 구조가 둘 다 틀리면 한 번에 둘 다 돌려줌, `vnodesToHtml`로 만든 글(샘플 · 중첩 · 주석 · 빈 태그 · 특수문자 · `pre` 줄바꿈 · 표)은 항상 `[]` / **오탐 없음: 글자 안의 `<`(`1 < 2` · `x <= y` · `a<b` 뒤에 공백)는 태그로 세지 않아 `[]`(B14), 대소문자 섞인 짝 `<DIV>글</div>` · `<Ul><LI>가</li></uL>` → `[]`(B15), `<textarea>` 안의 `</div>` 같은 글은 짝 검사에서 무시 → `[]`(B16). `<style>` 안의 `</div>`는 `htmlScan` 단위 테스트에서 무시됨을 확인하고(페이지에서는 `<style>`이 C5로 막히므로 분석기 견고성 테스트임을 테스트 이름에 표시), `checkHtml`로는 `DANGEROUS`만 나오고 `UNPAIRED` 오탐이 없음(B16)**
  - 알고리즘: §5 HTML 편집 · 오류 (엔진이 훑은 구조 ↔ 브라우저가 읽은 구조 비교, 태그 이름 · 중첩만 비교, `tbody` 자동 추가만 예외)
  - 완료 근거로 남길 것: `checkHtml.test.ts` 통과 개수, `vnodesToHtml` 왕복 통과 테스트 이름, 표 예외 · 오탐 없음(B14 ~ B16) 테스트 이름

- [ ] **Dev-11** (`react-dom`): `History` — 양방향 연결 리스트 (초기 0번 · 갈림길 끊기 · 경계 무시 · 한도 50) [P1-26 · P1-27 · T-08 · §3.3 · B17]
  - 의존: 없음 (타입만. 데이터 구조라 DOM 없음)
  - 만들 · 고칠 파일: `packages/react-dom/src/history.ts`, `packages/react-dom/src/index.ts`(새로)
  - 테스트: `packages/react-dom/src/__tests__/history.test.ts` — 만들 때 넘긴 초기 기록이 0번(바닥), `push`가 current 뒤에 이어 붙임(head · current · 개수), `back` · `forward`는 prev · next 따라 이동하고 이동한 기록을 돌려줌, 처음에서 뒤로 · 끝에서 앞으로는 `null`을 돌려주고 아무 것도 안 바뀜(경계 무시), 뒤로 간 뒤 `push`하면 앞쪽(redo) 기록이 끊겨 앞으로가 안 됨(갈림길), 51번째 기록을 넣으면 head를 다음으로 옮기고 개수 50 유지(0번 초기도 한 개로 셈), 60번 `push` 뒤 뒤로를 끝까지 하면 49번 이동 후 멈춤, 저장한 snapshot · patches · inverse를 이후 `push`가 바꾸지 않음(깊게 얼린 기록으로 확인, P1-27) / **한도 근처 갈림길(B17): 50개 꽉 찬 상태(0번 포함)에서 뒤로 10번 → `push` → 개수 41(갈림길로 잘린 10개를 개수에서 뺌) · head는 그대로 · 앞으로 불가, 이어서 9번 `push` → 50, 한 번 더 `push` → head가 다음으로 밀리고 개수 50 유지(잘린 만큼 개수를 안 줄이면 head를 잘못 빼는 버그를 잡음), 그 뒤 뒤로 끝까지 = 49번**
  - 알고리즘: History 자료구조 = 양방향 연결 리스트(head · current · 개수) · 정책(§3.3)
  - 완료 근거로 남길 것: `history.test.ts` 통과 개수, 한도 50 · 갈림길 · 경계 · 한도 근처 갈림길(B17) 테스트 이름

- [ ] **Dev-12** (`react-dom`): `createVDomRoot` 1 — 로드 때 실제 영역을 읽어 0번 기록으로, `update`(Patch 흐름)로 diff → patch → 기록, Patch 도중 예외 복구 [P1-24 · P1-25 · P1-26 · P1-13 · P1-33 · P1-34 · T-03 ~ T-06 · C2 · B22]
  - 의존: Dev-2, Dev-3, Dev-4, Dev-5, Dev-6, Dev-11
  - 만들 · 고칠 파일: `packages/react-dom/src/createVDomRoot.ts`, `packages/react-dom/src/index.ts`
  - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts` — 만들 때 `readAreaChildren(realArea)`로 0번 기록을 만듦(P1-20), `update(next)`: 이전 기록의 VNode와 `next`만 비교하고 실제 영역을 `domToVNode`로 다시 읽어 비교하지 않음(P1-33 — 실제 영역 DOM을 일부러 어긋나게 고쳐 둬도 diff 기준은 저장한 VNode), D-01 ~ D-05 각각 반영 후 `readAreaChildren(realArea)`가 `next`와 같음, 무변경이면 `false`를 돌려주고 DOM 변경 0건(`MutationObserver`) · 기록 안 늘어남(T-04), 부분 갱신 때 관련 없는 노드 참조 유지(T-06), 연속 `update` 2회 · 3회가 직전 반영 상태 기준(P1-25), 기록에 snapshot · patches · inverse가 들어가고 snapshot은 새 객체(P1-26 · 27), 영역 상자가 비어 있는 입력 · 최상위 여러 개 입력(T-05 · §5), 복합 변경 · 여러 형제 삭제 · 삭제와 수정 동시(P1-15 · 16) / **Patch 도중 예외(C2 · B22): 실제 영역을 바깥에서 고쳐 경로가 사라지게 한 뒤(예: `<ul>`을 뗌) `update(next)` → 예외가 다시 던져짐 · 기록이 안 늘고 `back()`이 `null`(current 안 움직임) · `readAreaChildren(realArea)`가 지금(current) 기록의 snapshot과 같음(적용되다 만 patch도 되돌려짐) · 이어서 정상 `update`가 성공하고 기록이 정확히 한 칸 늘어남**
  - 알고리즘: 결정 7 B + VNode(기록마다 VNode · patch · 역패치) · 정책 무변경 Patch 기록 안 함 · C2(복구 경로 한 개, `renderAreaChildren`으로 다시 그리는 것은 이 복구에서만 `// [AI Note]`)
  - 완료 근거로 남길 것: `createVDomRoot.test.ts` 통과 개수, "저장한 VNode만 기준" · "무변경 0건" · "Patch 도중 예외 뒤 복구"(B22) 테스트 이름

- [ ] **Dev-13** (`react-dom`): `createVDomRoot` 2 — `back` · `forward`: 실제 영역은 역패치 · patch로, 돌려주는 스냅샷으로 테스트 영역 · 편집창이 따라가게 [P1-28 ~ P1-30 · T-08 · §3.3 · C2]
  - 의존: Dev-12
  - 만들 · 고칠 파일: `packages/react-dom/src/createVDomRoot.ts`
  - 테스트: `packages/react-dom/src/__tests__/createVDomRoot.test.ts`(추가) — Patch 2회 → `back` → `forward`마다 `readAreaChildren(realArea)`가 그 기록의 snapshot과 같음, `back`은 이동한 기록의 snapshot을 돌려줌, 처음 · 끝에서는 `null`을 돌려주고 DOM 변경 0건(경계 무시), 뒤로 간 뒤 새 `update`를 하면 앞으로가 안 됨(갈림길), 한도 50을 넘겨도 뒤로가 남은 기록 안에서 맞게 동작, 되돌린 뒤 다음 `update`의 기준이 되돌린 상태의 snapshot(P1-25 · 30), 뒤로 때 관련 없는 노드 참조가 유지됨(역패치도 부분 갱신), 최상위 여러 개 · 0개 상태 사이 이동 / **`back` · `forward` 도중 예외(C2): 실제 영역을 바깥에서 망가뜨린 뒤 `back()` → 예외가 다시 던져짐 · current가 안 움직임(이동 도중 실패한 이동은 없던 일) · 실제 영역이 current 기록의 snapshot으로 다시 그려짐 · 이어서 정상 `back()`이 성공**
  - 알고리즘: 결정 7 B + VNode · 되돌리는 순서 = 역순 · 정책(경계 무시 · 갈림길) · C2(이동은 patch가 성공한 뒤에 확정한다: 예 — 먼저 엿보고 성공하면 이동, 또는 실패하면 되돌려 놓기. 방식은 Dev에서 정하되 결과만 위 테스트로 고정)
  - 완료 근거로 남길 것: `createVDomRoot.test.ts` 통과 개수, `npx vitest run` 전체 통과 개수 · `npx tsc --noEmit` 0

- [ ] **Dev-14** (`fixture` + `e2e`): 검증 페이지 — 실제 영역 · 테스트 영역(편집창 + 미리보기) · 버튼 3개를 놓고, 로드 때 실제 영역을 읽어 편집창 · 테스트 영역을 채운다. 기존 최소 페이지를 대체한다. e2e 헬퍼에 구조 비교 · dialog 감시 · 콘솔 감시를 둔다 [P1-19 ~ P1-22 · P1-32 · A4 · A5]
  - 의존: Dev-2, Dev-7, Dev-8, Dev-12
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/index.html`(샘플 HTML을 `real-area` 안에 직접 씀, 이름표 · 편집창 · 버튼 3개, 모바일에서 위아래로 쌓임 · 가로 스크롤 없음), `fixtures/phase1-vdom-playground/main.ts`(`createVDomRoot(realArea)` → `renderAreaChildren(testArea, snapshot)` → `html-editor.value = vnodesToHtml(snapshot)`, **입력 때마다 즉시** `setAreaHtml(testArea, 글)` — 타이머 · debounce를 쓰지 않는다, B6), `e2e/phase1-helpers.ts`(새로: 위 「e2e 공통 장치」 전부 — `test` 확장(dialog 감시 · 콘솔 감시) · `structureOf` · `structureOfHtml`(속성 이름 → 값 집합, style cssText + 쪼갠 항목 집합) · `holdNodes` · `observeMutations` · `edit` · `captureAlert`), `e2e/phase1-render.spec.ts`(**고쳐 쓴다**)
  - 기존 e2e 처리: `phase1-render.spec.ts` 파일 이름은 유지하고 **내용을 새 페이지 기준으로 고친다**. 유지 = "페이지를 연다(콘솔 오류 · 경고 없음)" · "새로고침" · "mobile 가로 스크롤 없음" 3건(검사 대상만 새 화면으로), 대체 = 최소 페이지 전용 4건(`main#app` · `h1` 문구 · `hidden:false` li · 특수문자 `<p>`)은 QA-1(초기 화면, 특수문자는 미리보기에 글자로 보임까지)과 QA-A1(특수문자를 Patch까지, Dev-20)로 옮겨 쓴다. 최소 페이지와 같은 커밋에서 함께 고쳐 e2e가 깨진 채 남지 않게 한다
  - 헬퍼 자체 확인: 속성 순서만 다른 구조를 같다고 판정하는지는 QA-3(Dev-15)이, 속성 글 항목 집합 비교는 QA-A9(Dev-20)가 실제 시나리오 안에서 확인한다
  - 테스트(바깥 루프, 먼저 쓰고 실패 확인): `e2e/phase1-render.spec.ts` — QA-1, QA-A4(새로고침), mobile · desktop / 단위: 없음 (엔진 로직 없음)
  - 알고리즘: 결정 6 A (HTML 편집창 + 미리보기) · P1-20 실제 영역 샘플은 페이지에 미리 써 두고 로드 때 `domToVNode`로 읽음
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-render.spec.ts` desktop · mobile 통과 개수, 옛 4건이 어느 QA로 옮겨졌는지, 헬퍼의 dialog 감시 · 콘솔 감시가 동작함(일부러 선언 없는 alert · `console.error`를 낸 임시 테스트가 실패하는 것을 한 번 확인하고 지움), `npx vitest run` 영향 없음

- [ ] **Dev-15** (`fixture` + `e2e`): Patch 버튼 흐름 — 편집창 글 → 테스트 영역 DOM 읽기 → diff → 실제 영역 반영 → 기록 [P1-23 ~ P1-25 · P1-32 · T-03 · T-04 · T-06 · T-07 · B1 · B2 · B7 · A2 · A3]
  - 의존: Dev-14
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(`btn-patch` 클릭 → **편집창 글로 미리보기를 한 번 더 그린 뒤**(입력 처리가 늦어도 옛 글로 Patch되지 않게, B6) `readAreaChildren(testArea)` → `root.update(next)`, 무변경이면 아무 일 없음. **Patch 성공 뒤 편집창 글은 친 그대로 둔다**(B7)), `e2e/phase1-patch.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-patch.spec.ts` — QA-2 ~ QA-10 (D-01 ~ D-05 · 중첩 · 복합 · 무변경 · 부분 갱신 · 연속 Patch). 숫자로 증명하는 덧붙임: **QA-2(B1 · B7)** 글자 하나 Patch가 `MutationObserver` 기록 `characterData` 정확히 1건 · `childList` 0건이고 편집창 글이 친 그대로, **QA-9(B2)** 글자 + `class` 변경이 `characterData` 1건 + `attributes` 1건 · `childList` 0건. **QA-5(a)(A2)** · **QA-6(A3)** Then는 위치 비교 결과(남는 노드 · 새 노드 참조)를 구체적으로 확인
  - 알고리즘: 결정 3 · 4 · 7 · 정책 무변경 Patch 무시
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-patch.spec.ts` desktop · mobile 통과 개수, QA-2 ~ QA-10 각각의 테스트 이름, QA-2 · QA-9의 `MutationObserver` 기록 개수

- [ ] **Dev-16** (`fixture` + `e2e`): Patch 때 검사 — `checkHtml`에 걸리면 alert로 "다시 작성해 주세요"를 알리고 Patch를 안 한다. 위험 코드 우회 · 삽입 요소 · 스타일 요소 포함 [§5 HTML 편집 · 오류 · 실행 가능한 HTML · §6.2 · P1-32 · B11 · B12 · C3 · C5]
  - 의존: Dev-10, Dev-15
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(Patch 클릭 맨 앞에 `checkHtml(편집창 글)` → 문제가 있으면 `alert(formatProblems(문제들))` 후 끝), `e2e/phase1-guard.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-guard.spec.ts` — QA-16 ~ QA-21 (위험 코드 · 태그 짝 · 구조 · SVG · 둘 다 한 번에 · 미리보기 onerror 미실행) + **QA-29**(srcdoc iframe · object · embed, B11 · C3) + **QA-30**(숨긴 `javascript:`, B12) + **QA-32**(`<style>` · `<link rel="stylesheet">`, C5). alert는 `captureAlert(page, 동작)`으로 선언해 메시지를 확인하고 accept (선언 없는 alert는 실패, A5)
  - 알고리즘: §5 HTML 편집 · 오류 · 실행 가능한 HTML
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-guard.spec.ts` desktop · mobile 통과 개수, 확인한 알림 말마디 4종, QA-29 · 30 · 32 테스트 이름

- [ ] **Dev-17** (`fixture` + `e2e`): 페이지 보호 · 오류 복구 — 두 영역 안 링크 클릭 · 폼 제출은 기본 동작을 막고, Patch 도중 예외는 복구 뒤 `[Patch 오류]` alert [§5 · P1-19 · P1-32 · C2 · C4 · B13]
  - 의존: Dev-12, Dev-15, Dev-16 (`captureAlert` · alert 흐름)
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(`real-area` · `test-area`에 **캡처 단계** `click`(대상이 `a[href]` 안이면 `preventDefault`) · `submit`(`preventDefault`) 리스너. Patch 클릭의 `root.update(…)`를 `try/catch`로 감싸 예외가 나면 `alert('[Patch 오류] …실제 영역을 마지막 기록 상태로 되돌렸습니다. 다시 작성해 주세요.')`, 편집창 · 테스트 영역은 그대로. 이 오류 알림 함수는 Dev-18이 `back` · `forward`에도 씀), `e2e/phase1-guard.spec.ts`(추가)
  - 테스트(바깥 루프): **QA-31**(B13 · C4: 두 영역의 링크 클릭 · 폼 버튼 클릭에도 페이지가 이동 · 새로고침되지 않고 기록이 살아 있음) · **QA-A12**(C2: 실제 영역을 바깥에서 망가뜨린 뒤 Patch → `[Patch 오류]` alert, 실제 영역이 마지막 기록 상태로 복구, 기록 그대로, 편집창 글 유지, 다시 Patch하면 성공 · 기록 한 칸). 스펙 파일은 `e2e/phase1-guard.spec.ts`
  - 알고리즘: C2(기록 그대로 + 실제 영역을 마지막 기록 VNode로 다시 그림) · C4(기본 동작 막기는 엔진이 아니라 검증 페이지의 일)
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-guard.spec.ts` desktop · mobile 통과 개수, QA-31 · QA-A12 테스트 이름, 링크 클릭 뒤 `framenavigated` 0건 확인

- [ ] **Dev-18** (`fixture` + `e2e`): 뒤로 · 앞으로 버튼 — 세 칸(편집창 · 테스트 영역 · 실제 영역)이 그 기록 상태로 [P1-26 ~ P1-30 · P1-32 · T-08 · B3]
  - 의존: Dev-13, Dev-15, Dev-17 (오류 알림 함수)
  - 만들 · 고칠 파일: `fixtures/phase1-vdom-playground/main.ts`(`btn-back` · `btn-forward` → `root.back()` / `root.forward()`가 스냅샷을 돌려주면 `renderAreaChildren(testArea, 스냅샷)` + `html-editor.value = vnodesToHtml(스냅샷)`, `null`이면 아무 일 없음, 예외가 나면 Dev-17의 `[Patch 오류]` 알림), `e2e/phase1-history.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-history.spec.ts` — QA-11 ~ QA-15 (Patch 2회 이상 → 뒤로 → 앞으로 세 칸 일치 · 경계 · 갈림길 · 미저장 편집 버림 · 과거 기록 보존). **QA-11(B3)**: Patch 1회 = 글자 하나, 2회 = `<ul>` 끝에 `<li>` 추가 → 뒤로 · 앞으로 때 `MutationObserver` 기록이 바뀐 곳(`<ul>`) 쪽 `childList`뿐이고 그 밖 노드의 기록 · 참조 변화 없음, 한 번 더 뒤로(글자 되돌리기)는 `characterData` 1건뿐
  - 알고리즘: 결정 7 B + VNode · 정책(§3.3 전부)
  - 완료 근거로 남길 것: `npx playwright test e2e/phase1-history.spec.ts` desktop · mobile 통과 개수, QA-11 ~ QA-15 테스트 이름, QA-11의 `MutationObserver` 기록 개수

- [ ] **Dev-19** (`e2e`): 편집창 왕복 · 다양한 태그 인수 테스트 — 브라우저에서 `vnodesToHtml` → 파싱 왕복을 확인하고, 빈 태그 · 인라인 중첩 · 표(`tbody` 유무)를 Patch한다. 발견된 결함이 있으면 앱 코드를 고친다(`fix(...)` 별도 커밋) [P1-13 · P1-23 · T-04 · T-07 · P1-07 ~ P1-12 · §5 · B4 · B5 · B6 · B8 · B9 · B10 · C1]
  - 의존: Dev-15, Dev-18 (QA-23 (b)가 뒤로를 씀) — **시간이 모자라면 이 Dev를 통째로 미룰 수 있다 (우선순위 3, `dev_todo` 위 표)**
  - 만들 · 고칠 파일: `e2e/phase1-patch.spec.ts`(추가) 또는 `e2e/phase1-roundtrip.spec.ts`(새로, 분리해도 됨. 정하면 `qa_todo` 스펙 파일 열을 함께 고침)
  - 테스트(바깥 루프): QA-23(B4) · QA-24(B5) · QA-25(B6) · QA-26(B8 빈 태그) · QA-27(B9 인라인 중첩) · QA-28(B10 표 + C1 `tbody` 없는 표 허용)
  - 알고리즘: 결정 5 · 6 · §5 (C1: `tbody` 자동 추가 허용)
  - 완료 근거로 남길 것: `npx playwright test <해당 파일>` desktop · mobile 통과 개수, QA-23 ~ QA-28 테스트 이름, 고친 결함 목록

- [ ] **Dev-20** (`e2e`): 공격적 시나리오 모음 + 전체 확인 — 발견된 결함이 있으면 앱 코드를 고친다 (결함마다 별도 커밋은 `fix(...)`로) [P1-32 · §6.2 경계 조건 · A4 · A5]
  - 의존: Dev-14 ~ Dev-19
  - 만들 · 고칠 파일: `e2e/phase1-attack.spec.ts`
  - 테스트(바깥 루프): `e2e/phase1-attack.spec.ts` — QA-A1 ~ QA-A3 · QA-A5 ~ QA-A11 (특수문자를 Patch까지 · 연타 · 빈 입력 · 들여쓰기만 변경 · 주석 · 복수 루트 · boolean 속성 · style 항목(속성 글 항목 집합 비교, A4) · 검사 알림 후 복구 · 경계에서 편집창 글 유지). QA-A4(새로고침)는 Dev-14의 `phase1-render.spec.ts`에, QA-A12(Patch 도중 예외 복구)는 Dev-17의 `phase1-guard.spec.ts`에 있음
  - 알고리즘: 해당 없음 (결정 5 · §5 정책 확인)
  - 완료 근거로 남길 것: `npx vitest run`(전체 통과 개수) · `npx playwright test`(desktop · mobile 전체 통과 개수, **dialog 감시 · 콘솔 error 0건 공통 장치 아래에서**) · `npx tsc --noEmit` 0, 고친 결함이 있으면 그 목록

## Dev 항목 — 선택 확장 (필수 뒤, 이 순서)

- [ ] **Dev-21** (`react-reconciler`): Key 비교 — key 표 매칭 + MOVE [Key 확장 · PRD §5 · §6.2]
  - 의존: Dev-3, Dev-4, Dev-5
  - 만들 · 고칠 파일: `packages/react-reconciler/src/diff.ts`(자식 목록 비교에 key 분기 추가), `packages/react-reconciler/src/__tests__/applyPatches.ts`(MOVE 검산 확인)
  - 규칙: **자식 목록 단위**로 판단한다. 그 목록(옛 · 새 모두)의 모든 자식이 key가 있고 목록 안에서 중복이 없을 때만 key 비교, 아니면 그 목록은 위치 비교(필수 동작 그대로). key 비교 순서: ① 새 목록에 없는 옛 key를 **뒤에서부터** REMOVE → ② 새 목록을 앞에서부터 보며 key가 현재 목록에 있으면 자리(`from`)가 다를 때 MOVE(`from` → `to`), 없으면 INSERT → ③ 짝이 맞은 노드끼리 재귀 diff(태그가 다르면 REPLACE). 최소 이동 수는 보장하지 않는다
  - 테스트: `packages/react-reconciler/src/__tests__/diffKeyed.test.ts` — `h()`로 key를 준 VNode: 중간 삽입(INSERT) · 중간 삭제(REMOVE) · 재정렬(MOVE) · 삽입 + 삭제 + 재정렬 동시, key가 같고 내용이 바뀌면 이동 없이 글자 · 속성 patch만, key가 같고 태그가 다르면 REPLACE, 같은 key 중복 · key 없는 자식이 섞인 목록은 위치 비교로 돌아감(필수 동작과 같은 결과), 무작위 key 순열(고정 씨앗) 200쌍에서 `applyPatches(old, diff(old, new))`가 new와 같고 `applyPatches(new, invertPatches(…))`가 old와 같음 (PRD §5 Key 검증)
  - 알고리즘: 결정 2 B (Key 확장: key 표) · Key 출처 = 단위 테스트로만
  - 완료 근거로 남길 것: `diffKeyed.test.ts` 통과 개수, `diff.test.ts` · `invertPatches.test.ts` 회귀 통과 개수, 무작위 200쌍

- [ ] **Dev-22** (`react-dom-bindings`): `patch`의 MOVE — 같은 DOM 노드를 옮긴다 [Key 확장]
  - 의존: Dev-6, Dev-21
  - 만들 · 고칠 파일: `packages/react-dom-bindings/src/client/patch.ts`(Dev-6의 "MOVE 오류" 자리를 구현: `parent` 경로의 자식 `from`번을 빼서 뺀 뒤 목록의 `to`번 자리에 넣음)
  - 테스트: `packages/react-dom-bindings/src/client/__tests__/patch.test.ts`(추가) — MOVE 앞으로 · 뒤로 이동, 이동한 노드의 참조가 그대로(`===`), 이동 중에 다른 형제 참조도 그대로, MOVE 뒤 INSERT · REMOVE가 이어질 때 경로가 그 순간 기준, MOVE의 역(from ↔ to)이 원래 순서를 되돌림, Dev-6의 "MOVE 오류" 테스트는 제거 (PRD §5)
  - 알고리즘: 결정 2 B (이동) · 결정 4 A (그 순간 기준)
  - 완료 근거로 남길 것: `patch.test.ts` 통과 개수, 참조 유지 테스트 이름

- [ ] **Dev-23** (`react-dom`): Key 통합 테스트 — 삽입 · 삭제 · 재정렬 뒤에도 같은 key 노드가 유지되고, 역패치(MOVE 포함)로 되돌아온다 [Key 확장 · PRD §5 · §6.2]
  - 의존: Dev-21, Dev-22
  - 만들 · 고칠 파일: `packages/react-dom/src/__tests__/diffPatchKeyed.test.ts` (테스트만, 필요한 경우에 한해 `createVDomRoot`의 작은 고침)
  - 테스트: `h()`로 만든 key 목록을 `renderAreaChildren`으로 그린 뒤 `patch(area, diff(old, new))`: 삽입 · 삭제 · 재정렬 각각에서 같은 key 요소의 참조가 `===`로 유지(PRD §5 "같은 Key의 노드가 유지"), 새로 생긴 key만 새 노드, 지워진 key만 분리, 결과 DOM이 `renderVNode(new)`와 구조가 같음, 같은 patch를 `invertPatches`로 되돌리면(MOVE 역 포함) 원래 순서 · 같은 참조, `createVDomRoot`에 key VNode를 `update` → `back` → `forward`해도 기록 일치(필요 시 `update(next)`는 `h()` VNode를 그대로 받음)
  - 알고리즘: 결정 2 B · 결정 7 · Key 출처 = 단위 테스트로만 (화면에는 key 없음)
  - 완료 근거로 남길 것: `diffPatchKeyed.test.ts` 통과 개수, 참조 유지 · MOVE 역패치 테스트 이름, `npx vitest run` 전체 통과 개수

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
