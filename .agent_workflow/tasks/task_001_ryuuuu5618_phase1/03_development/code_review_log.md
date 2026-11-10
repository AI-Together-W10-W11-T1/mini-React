# code_review_log: phase1

> 검수자(`mr-reviewer`, Opus) 답을 마스터가 그대로 옮긴다. [NON-BLOCKING]은 아래 「NON-BLOCKING 모음」에 모아 task 끝나기 전에 반영 여부를 정한다.

## 1회차 (2026-11-11) — 대상 c9d94c5..214a09b (`01_diff_src.patch` · `01_diff.patch`), Dev-1~26

판정: **REJECT (회차 1/3)**

1. [BLOCKING] [Dev-3 · Dev-6 · P1-15 · 두 영역 불일치] style 항목 비교가 프로토타입 체인을 탄다. `packages/react-reconciler/src/diff.ts:143`의 `after[property]`와 `:148`의 `property in before`는 `Object.fromEntries`로 만든 보통 객체(`parseStyleText` 결과)를 보기 때문에 `constructor` · `__proto__` 같은 이름에서 틀린 값을 낸다.
   - 재현: 편집창에서 `<p style="color: red; constructor: x">`처럼 항목을 더하면 `'constructor' in {}`가 true라 SET_STYLE이 안 나온다. 실제 영역에는 그 항목이 빠지고 테스트 영역에는 남아, 속성 글 기준으로 두 영역이 어긋난다(QA-A9의 `foo: bar`와 같은 "모르는 항목"인데 결과가 다르다). 반대로 항목을 지우면 `after['constructor']`가 `Object` 함수라 `after`에 함수가 담긴 SET_STYLE이 나온다(타입은 `string | null`). 그러면 실제 DOM에 `constructor: function Object() { [native code] }`가 쓰인다.
   - 같은 문제가 `packages/react-dom-bindings/src/client/patch.ts:45`에도 있다. `map[p.property] = p.after`에서 property가 `__proto__`면 항목이 아니라 프로토타입이 바뀐다(`style.ts`는 `__proto__`를 보통 항목으로 담는데 patch에서 깨진다).
   - 고칠 방법: diff.ts에서는 `Object.hasOwn(before, property)`로 비교하고, `Object.hasOwn(after, property) ? after[property] : undefined`로 값을 읽는다. patch.ts에서는 `new Map(Object.entries(parseStyleText(...)))`로 고친 뒤 `styleMapToText(Object.fromEntries(map))`로 쓴다.
   - 테스트: `diff.test.ts`에 `constructor` · `__proto__` 항목 추가 · 삭제 케이스를 넣는다(`run()`으로 applyPatches 결과까지 확인). `patch.test.ts`에는 `__proto__` 항목 SET_STYLE 추가 · 삭제를 넣는다. 결과를 근거에 적는다.

2. [BLOCKING] [Dev-17 · C4] 링크 클릭 막기가 `a[href]`만 본다(`fixtures/phase1-vdom-playground/main.ts:90`). 막히지 않는 링크가 두 가지 있다.
   - `<area href>`(이미지 맵, 예: `<img src="data:," width="100" height="100" usemap="#m"><map name="m"><area shape="default" href="https://example.com"></map>`): 클릭 대상이 `<area>`라 막히지 않는다. 이 입력은 Patch 검사도 통과하므로 두 영역 모두 해당된다.
   - SVG `<a xlink:href="…">`: `[href]`는 이름공간 없는 속성만 맞추므로 xlink 이름공간 속성이 걸리지 않는다. 테스트 영역(미리보기)이 해당된다.
   - 둘 다 클릭하면 페이지가 이동해 기록이 날아간다. 이것이 C4가 막으려던 바로 그 상황이다.
   - 고칠 방법: `closest('a, area')`처럼 href 종류와 상관없이 링크 요소를 잡는다(타입 선택자 `a`는 SVG `<a>`도 맞춘다).
   - 테스트: QA-31(`e2e/phase1-guard.spec.ts`)에 `<area>` 링크(두 영역)와 SVG `<a xlink:href>`(테스트 영역) 클릭을 더해, `framenavigated` 0건 · 주소 그대로를 확인하고 근거에 적는다.

3. [BLOCKING] [Dev-8 · §5 실행 가능한 HTML] 미리보기에서 `javascript:` 주소를 빼는 대상에 `xlink:href`가 없다(`packages/react-dom-bindings/src/client/sanitize.ts:10`의 `URL_ATTRIBUTES`, `:52`의 판정).
   - 원인: `getAttributeNames()`는 한정 이름 `xlink:href`를 돌려준다. 그래서 `<svg><a xlink:href="javascript:…"><text y="20">x</text></a></svg>`가 미리보기에 그대로 남는다. SVG는 Patch 때만 막히고 미리보기에는 그려진다.
   - 2번과 겹치면 클릭 한 번에 코드가 실행된다. 명세 §5 "미리보기는 `javascript:` 주소를 빼고 그림"에 어긋난다.
   - 고칠 방법: `URL_ATTRIBUTES`에 `xlink:href`를 더한다(`removeAttribute('xlink:href')`는 한정 이름으로 동작한다). checkHtml도 같은 `scanDangerous`를 쓰므로 함께 고쳐진다.
   - 테스트: `setAreaHtml.test.ts`(빠짐)와 `checkHtml.test.ts`(`DANGEROUS`)에 케이스를 더하고 결과를 근거에 적는다.

4. [NON-BLOCKING] (특히 봐 줄 것 1) 선택적 닫는 태그를 엄격히 `[태그 짝]`으로 보는 판단은 명세("여는 · 닫는 태그 짝 검사, 빈 태그 제외")와 맞다. `vnodesToHtml`은 항상 닫는 태그를 쓰므로 왕복에도 문제가 없다. `<meta http-equiv=refresh>` · `<base>`는 C3 · C5 목록 밖이라 지금 막지 않는 것이 맞다. 다만 meta refresh는 문서에 들어가면 페이지를 옮길 수 있어 C4와 같은 위험이다. 넣을지는 마스터가 사용자에게 물어볼 일이다(검수자가 범위를 넓히지 않음).

5. [NON-BLOCKING] (특히 봐 줄 것 2) `update(next)`가 `next`를 그대로 저장하는 것은 받아들일 수 있다. 타입이 `readonly`이고, 페이지는 매번 `readAreaChildren`으로 새 객체를 넘기고, diff · patch가 VNode를 고치지 않는다(P1-27 테스트도 깊게 얼린 입력으로 확인한다). C2 복구의 `renderAreaChildren`이 던지면 원래 예외가 덮이는 문제는 지금 흐름에서는 일어나기 어렵다. 그래도 복구 쪽을 `try/catch`로 감싸고 원래 예외(필요하면 `cause`)를 던지면 더 안전하다.

6. [NON-BLOCKING] (특히 봐 줄 것 3 · 4 · 5) 셋 다 타당하다고 본다.
   - `diff.test.ts:105`의 테스트 변경은 의도(key는 props가 아님)를 지킨다.
   - `src="data:,"`도 빈 이미지라 디코딩에 실패해 `onerror` 경로가 그대로 시험된다.
   - C2 복구 때 `onPatch`를 부르지 않는 것, 무변경 동작에서 data 속성을 이전 값으로 두는 것은 Dev-26 설계와 맞다.

확인한 것(특히 봐 줄 것 6):
- 의존 방향: 바인딩 밖 소스에 `document` · `window` · `Node.` 사용이 없다. react-dom은 바인딩만 거친다.
- `innerHTML`: 비활성 `<template>` 파싱에만 쓴다. 실제 영역을 통째로 다시 그리는 곳은 `createVDomRoot`의 C2 복구 한 곳뿐이다.
- 알고리즘 결정: 위치 기반(겹치는 자리 → 뒤에서 REMOVE → 앞에서 INSERT), key 표(REMOVE → MOVE/INSERT → 재귀), MOVE의 patch 인덱스 계산, 역패치(전후 + 역순), 연결 리스트(갈림길 size 감소 · head 빼기), patch 성공 뒤에만 current를 옮기는 것 모두 결정대로다.
- 그 밖: `any` · `@ts-ignore` 없음. 완료 근거의 파일 · 함수 · 테스트 이름이 실제 파일과 맞다.

### 마스터 처리 (1회차)
- [BLOCKING] 1 · 2 · 3 → 작업자 재작업 (Dev-3 · 6 · 8 · 17 범위)
- [NON-BLOCKING] 5 (복구 try/catch + cause) → 작은 안전장치라 이번 재작업에 함께 넣음 (마스터 결정)
- [NON-BLOCKING] 4 (`<meta http-equiv=refresh>` · `<base>`) → 범위를 넓히는 정책 결정이라 사용자에게 물음
- [NON-BLOCKING] 6 → 반영할 것 없음

## NON-BLOCKING 모음
| 회차 | 번호 | 내용 | 반영 여부 |
| --- | --- | --- | --- |
| 1 | 4 | `<meta http-equiv=refresh>` · `<base>` 막기 여부 | 사용자 결정 "막기" → 반영 (5406529) |
| 1 | 5 | C2 복구 `renderAreaChildren` try/catch, 원래 예외 유지 | 반영 (e2def72, `recoveryError`) |
| 1 | 6 | 테스트 변경 · `src="data:,"` · 시각화 설계 타당 | 반영 없음 |
| 2 | 2 | 복구 실패(`recoveryError`) 때 `[Patch 오류]` 문구가 "되돌렸습니다"로 사실과 다름 | 반영 (3970fc2) |

## 2회차 (2026-11-11) — 대상 214a09b..52a2b79 (`02_diff.patch`), Dev-3 · 6 · 8 · 9 · 12 · 17

판정: **REJECT (회차 2/3)** — 1회차 [BLOCKING] 1 · 2 · 3 해결, NB-4 · NB-5 반영 확인. B-1과 같은 원인의 새 지적 1건 (같은 지적 반복이 아니라 DEADLOCK 아님)

1. [BLOCKING] [Dev-6 · 두 영역 불일치 · B-1과 같은 원인] `domToVNode`의 `readProps`가 속성 이름 `__proto__`를 버립니다 (`packages/react-dom-bindings/src/client/domToVNode.ts:32-39`).
   - 원인: `const props = {}` 뒤에 `props[attr.name] = attr.value`를 씁니다. 이름이 `__proto__`이면 항목이 생기지 않고 프로토타입 setter가 불리는데, 값이 문자열이라 setter는 아무것도 하지 않습니다. 그래서 이 속성이 VNode에서 사라집니다.
   - 재현: 편집창에 `<p __proto__="x">a</p>`를 넣고 Patch합니다. HTML 파서는 `__proto__`를 보통 속성 이름으로 받아들이고 checkHtml도 통과합니다. 테스트 영역에는 속성이 남지만 `readAreaChildren` 결과에는 없어서 diff가 SET_ATTR을 내지 않습니다. 그 결과 실제 영역에는 속성이 빠져 두 영역의 속성 글이 어긋납니다. 1회차 B-1(style 항목 `__proto__`)과 같은 종류이고, 그때 BLOCKING으로 판정했으니 같은 기준을 적용합니다.
   - 범위 확인: `diff.ts`의 `readAttrs`는 `Object.entries` + `Map`, `renderVNode`·`vnodesToHtml`은 `Object.entries`, `patch.ts` SET_ATTR은 `setAttribute`만 써서 이 문제가 없습니다. `constructor`·`toString` 같은 이름은 대입해도 자기 속성이 생기므로 괜찮습니다. 문제는 `__proto__` 대입뿐입니다.
   - 고칠 방법: `readProps`에서 `[이름, 값]` 쌍을 모은 뒤 `Object.fromEntries`로 만들거나, `Object.defineProperty(props, attr.name, { value, enumerable: true, writable: true, configurable: true })`로 넣습니다. 테스트 검산기 `packages/react-reconciler/src/__tests__/applyPatches.ts:41-43`(SET_ATTR `props[patch.name] = …`)과 :92-98(`normalizeTree`)도 같은 방식으로 고칩니다.
   - 테스트: `domToVNode.test.ts`에서 `<p __proto__="x">`의 props에 `Object.hasOwn(props, '__proto__')`가 true이고 값이 `'x'`인지 확인합니다. `diff.test.ts`에는 `__proto__` 속성 추가·삭제를 `run()`으로 넣습니다. `createVDomRoot.test.ts`(또는 `patch.test.ts`)에는 update 뒤 실제 영역 요소에 `__proto__` 속성이 생기는지 확인하는 테스트를 넣습니다. 고치기 전에 실패하는 것을 먼저 보고, 결과를 근거에 적습니다.

2. [NON-BLOCKING] 복구까지 실패해 `recoveryError`가 붙은 경우에도 `main.ts`의 `reportPatchError`는 "실제 영역을 마지막 기록 상태로 되돌렸습니다"라고 알립니다. 실제로는 되돌리지 못한 상황이라 알림 글이 사실과 다릅니다. `recoveryError`가 있으면 문구를 바꾸는 정도로 충분합니다. 지금 흐름에서는 거의 일어나지 않는 경우입니다.

확인한 것: B-1 · B-2 · B-3 해결(재현 경로 · 고치기 전 실패 테스트 포함), NB-4 정책 표와 일치, NB-5 `recoveryError` 방식 타당(`cause`는 방향이 반대), 검산기 `Map` 변경이 기존 동작을 깨지 않음, 의존 방향 위반 · `any` · 명세 밖 기능 없음, 완료 근거가 diff와 맞음.

### 마스터 처리 (2회차)
- 가벼운 모드 규칙: 2회차에도 REJECT → 3회차로 가지 않고 쟁점을 정리해 사용자에게 바로 물음
- 사용자 결정 (원문): "1번으로 가자" = (1) 고치고, 확인은 마스터가 (3회차 Opus 검수 없음). [BLOCKING] 1 + [NON-BLOCKING] 2를 작업자 재작업으로

## 2회차 재작업 확인 (마스터, 2026-11-11) — 대상 81ac068..12443c0 (`03_diff.patch`)

사용자 선택 (1)에 따라 3회차 Opus 검수 대신 마스터가 확인. 판정: **통과 (마스터 확인, 개발 단계 종료)**
- 커밋: a842724 (B-1, `domToVNode` `readProps` · 검산기 `fromEntries`) · 3970fc2 (NB-2, `patchErrorMessage.ts`) · 12443c0 (dev_todo 근거)
- 고치기 전 실패 확인: `domToVNode.ts` · `applyPatches.ts`를 81ac068 판으로 되돌리고 새 테스트로 `npx vitest run` → **4 failed** | 428 passed (domToVNode 1 · diff 2(추가 · 삭제) · createVDomRoot 1). 확인 뒤 `git checkout --`로 원래대로
- 고친 뒤: `npx vitest run` 16 files · **432 passed**, `npx tsc --noEmit` exit 0, `npx playwright test` **96 passed**, 5199 LISTEN 없음
- 작업자 grep 보고: 같은 패턴은 고친 3곳뿐, 나머지는 `Map` · `Object.entries` · `setAttribute` · 고정 이름 배열이라 해당 없음 — 마스터가 보고 내용과 diff가 맞는 것 확인

