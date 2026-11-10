# 01 작업자 기획 초안: phase1

- 쓴 문서: `../03_development/dev_todo.md` (Dev 24개 = 필수 18 + 확장 6), `../04_qa_evidence/qa_todo.md` (인수 22 + 공격적 11)
- 기준: `../01_request_spec.md` (승인본). 코드는 고치지 않았고 커밋도 하지 않았다.

## 1. 요약

### Dev 항목 (필수 18 → 확장 6)

| Dev | 패키지 | 내용 | 의존 |
| --- | --- | --- | --- |
| 1 | `react-dom-bindings` | `renderVNode`가 주석 · style을 그림 + `renderAreaChildren` | - |
| 2 | `react-dom-bindings` | `domToVNode` · `readAreaChildren` (공백 · 주석 · boolean · style) | 1 |
| 3 | `react-reconciler` | `diff` 기본: 글자 · 속성 · style · 교체 · 무변경 | - |
| 4 | `react-reconciler` | `diff` 자식 추가 · 삭제 · 중첩 · 복합 (INSERT 앞에서 · REMOVE 뒤에서) | 3 |
| 5 | `react-reconciler` | `invertPatches` (전후 뒤집기 + 역순) | 3 |
| 6 | `react-dom-bindings` | `patch` (경로 + 순서대로, MOVE 제외) | 1 · 2 · 4 |
| 7 | `react-dom-bindings` | `vnodesToHtml` (스냅샷 → 편집창 글) | 1 · 2 |
| 8 | `react-dom-bindings` | `setAreaHtml` (미리보기, 위험한 것 빼고 그림) | 1 · 2 |
| 9 | `react-dom-bindings` | `checkHtml` 1: 위험 코드 · SVG · 알림 글 | 8 |
| 10 | `react-dom-bindings` | `checkHtml` 2: 태그 짝 + 구조 비교 | 9 · 7 |
| 11 | `react-dom` | `History` 양방향 연결 리스트 (0번 · 갈림길 · 경계 · 한도 50) | - |
| 12 | `react-dom` | `createVDomRoot` 1: 로드 때 읽기 + `update`(diff → patch → 기록) | 2 · 3 · 4 · 5 · 6 · 11 |
| 13 | `react-dom` | `createVDomRoot` 2: `back` · `forward` | 12 |
| 14 | fixture + e2e | 검증 페이지(두 영역 · 편집창 · 버튼), 기존 최소 페이지 · e2e 대체 | 2 · 7 · 8 · 12 |
| 15 | fixture + e2e | Patch 버튼 흐름 (D-01 ~ D-05 · 무변경 · 부분 갱신 · 연속) | 14 |
| 16 | fixture + e2e | Patch 때 검사 alert (위험 · 짝 · 구조 · SVG) | 10 · 15 |
| 17 | fixture + e2e | 뒤로 · 앞으로 (세 칸 일치 · 경계 · 갈림길 · 미저장 편집) | 13 · 15 |
| 18 | e2e | 공격적 시나리오 + 전체 확인 | 14 ~ 17 |
| 19 | `react-reconciler` | (확장 1) Key 비교: key 표 + MOVE | 3 · 4 · 5 |
| 20 | `react-dom-bindings` | (확장 1) `patch`의 MOVE | 6 · 19 |
| 21 | `react-dom` | (확장 1) Key 통합 테스트: 참조 유지 · MOVE 역패치 | 19 · 20 |
| 22 | `react-dom-bindings` | (확장 2) `patch` 관찰 콜백 | 6 |
| 23 | `react-dom` | (확장 2) 콜백 전달 | 22 · 13 |
| 24 | fixture + e2e | (확장 2) [시각화 켜기] 스위치 + 오버레이 | 23 · 17 |

Dev-3 ~ 5(reconciler), Dev-11(History)은 DOM이 필요 없어 처음부터 나란히 시작할 수 있다.

### 인수 시나리오
`qa_todo.md`의 QA-1 ~ QA-22 + 공격적 QA-A1 ~ A11 (desktop · mobile 모두에서 실행). 파일 6개: `phase1-render` · `phase1-patch` · `phase1-history` · `phase1-guard` · `phase1-attack` · `phase1-visual`.

## 2. 테스트 케이스 표 (사용자 확인용)

### 표 1 — 인수 시나리오 (브라우저에서 사람이 하는 것처럼)

| 이름 | 한 줄 요약 (이럴 때 · 이렇게 하면 · 이렇게 된다) | 덮는 PRD · T |
| --- | --- | --- |
| 초기 화면 | 페이지를 열면 → 실제 영역과 테스트 영역이 이름표로 구별되고, 같은 내용이며, 편집창에 샘플 글이 있고, 버튼 3개가 보인다 (오류 없음, 모바일 가로 스크롤 없음) | P1-19 · 20 · 21 · 22 |
| D-01 글자 바꾸기 | 편집창에서 글자 하나 고치고 Patch → 실제 영역 글자가 바뀌고 다른 노드는 그대로 | P1-06 · D-01 · T-03 · T-07 |
| D-02 속성 | 속성 추가 · 수정 · 삭제 후 Patch → 실제 영역 속성이 테스트 영역과 같다 | P1-07 · 08 · 09 · D-02 · T-03 · T-07 |
| D-03 노드 추가 | 목록 끝에 항목 추가 후 Patch → 항목이 4개가 되고 앞 항목은 그대로 | P1-10 · D-03 · T-03 · T-07 |
| D-04 노드 삭제 | 가운데 항목 삭제 / 항목 둘 + 글자를 함께 고치고 Patch → 남은 구조가 맞고 엉뚱한 노드가 안 바뀐다 | P1-11 · 16 · D-04 · T-03 · T-05 · T-07 |
| D-05 노드 교체 | `<ul>` → `<ol>`로 바꾸고 Patch → 새 태그 · 같은 항목 3개, 주변은 그대로 | P1-12 · D-05 · T-03 · T-07 |
| 중첩 · 복합 변경 | 여러 단계 · 여러 종류(글자 · 속성 · 추가 · 삭제 · 교체)를 한 번에 바꾸고 Patch → 실제 영역이 테스트 영역과 같다 | P1-14 · 15 · 16 · T-05 · T-07 |
| 무변경 Patch | 아무것도 안 고치고 Patch → 실제 영역 DOM 변경 0건, 뒤로도 안 생김 | P1-13 · T-04 · 무변경 정책 |
| 부분 갱신 참조 유지 | 글자 · class만 바꾸고 Patch → 바뀐 요소와 부모 · 형제가 같은 DOM 노드로 남는다 | P1-17 · 18 · T-06 |
| 연속 Patch | Patch 뒤 또 고치고 Patch → 직전 반영 상태 기준으로 맞게 동작 | P1-25 · T-07 |
| 뒤로 · 앞으로 세 칸 일치 | Patch 2번 → 뒤로 → 앞으로 → 매번 편집창 글 · 테스트 영역 · 실제 영역이 그 상태와 같다 | P1-26 · 28 · 29 · 30 · T-08 |
| 경계 이동 무시 | 처음에서 뒤로 / 끝에서 앞으로 → 아무 일 없음 (친 글도 그대로) | P1-28 · 29 · 경계 정책 |
| 갈림길 | A → B 뒤 뒤로, 새 Patch C → 앞으로가 안 되고 뒤로는 A → 초기 | P1-26 · 갈림길 정책 |
| 미저장 편집 버림 | 편집창에 글 치고 Patch 안 한 채 뒤로 / 앞으로 → 세 칸 모두 그 기록 상태 | P1-30 · 미저장 편집 정책 |
| 과거 기록 보존 | Patch 3번 뒤 뒤로 끝까지 · 앞으로 끝까지 → 각 상태가 Patch 당시와 같다 | P1-27 · T-08 |
| 위험 코드 막기 | `onerror` · `<script>` · `javascript:`를 넣고 Patch → "[위험한 코드]… 다시 작성해 주세요" alert, 실제 영역 · 기록 그대로 | §5 실행 가능한 HTML · 오류 |
| 태그 짝 막기 | 닫는 태그를 빼고 Patch → "[태그 짝]" alert, 그대로 | §5 HTML 편집 · 오류 |
| 구조 불일치 막기 | `<p><div>x</div></p>`처럼 브라우저가 고쳐 읽는 글 → "[구조 불일치]" alert, 그대로 | §5 HTML 편집 · 오류 |
| SVG 막기 | `<svg>`를 넣고 Patch → "[SVG 미지원]" alert, 그대로 | §5 HTML · SVG 범위 |
| 문제 둘 다 알림 | 짝도 구조도 틀린 글 → alert 한 번에 두 문제가 같이 | §5 오류 |
| 미리보기 무실행 | 편집창에 `onerror` · `<script>` · `javascript:`를 치기만 해도 → 실행 안 되고 미리보기에서 빠진다 (alert도 안 뜸) | §5 실행 가능한 HTML |
| 시각화 스위치 (확장) | 기본 꺼짐. 켜면 Patch · 뒤로 · 앞으로에서 바뀐 노드만 오버레이에서 깜빡이고 실제 DOM에는 표시가 안 붙는다. 끄면 다시 없음 | Diff 시각화 확장 |
| (공격) 특수문자 | `<b>` · `&amp;` · 이모지를 글자로 넣고 Patch → 글자 그대로, `<b>` 요소 안 생김 | P1-02 · T-01 |
| (공격) 연타 | Patch 5회 · 뒤로 10회 · 앞으로 10회 연타 → 오류 없고 끝에서 멈추고 세 칸 일치 | P1-25 · 경계 · 무변경 |
| (공격) 빈 입력 | 편집창 비우고 Patch → 빈 영역 허용, 뒤로로 복귀 | §5 빈 트리 |
| (공격) 새로고침 | Patch 뒤 새로고침 → 초기 샘플, 뒤로 무시, 오류 없음 | P1-20 · 초기 상태 정책 |
| (공격) 들여쓰기 | 공백만 바꾸고 Patch → 공백도 그대로 반영 | §5 공백 |
| (공격) 주석 | 주석 수정 · 삭제 · 추가 → 그대로 반영 | §5 주석 |
| (공격) 복수 루트 | 최상위 두 개로 바꾸고 Patch → 뒤로 → 하나로 복귀 | §5 복수 루트 |
| (공격) boolean 속성 | `disabled`를 지웠다 넣었다 → 속성만 바뀌고 요소는 그대로 | §5 boolean · T-06 |
| (공격) style 항목 | style의 한 항목만 바꾸거나 지움 → 그 항목만 바뀜 | §5 style · T-06 |
| (공격) 검사 뒤 복구 | 막힌 뒤 글을 고쳐 다시 Patch → 정상 반영, 기록 한 칸 | §5 오류 복구 |
| (공격) 경계에서 편집 유지 | 처음 상태에서 글 치고 뒤로 → 이동이 없으니 친 글이 그대로 | 경계 · 미저장 편집 정책 |

### 표 2 — 단위 테스트 (코드 안에서 부품 하나씩 확인)

| 파일 | 검사 내용 | 덮는 PRD · T |
| --- | --- | --- |
| `react-dom-bindings/.../renderVNode.test.ts` (고침) | 주석 · style을 DOM으로 그림, 영역 통째 그리기(여러 개 · 0개 · 공백) | P1-05 · T-02 |
| `react-dom-bindings/.../style.test.ts` | style 글을 항목으로 쪼개고 다시 쓰기 (`url(data:…;…)` · 따옴표 · 대문자 · 같은 이름) | P1-05 · §5 style |
| `react-dom-bindings/.../domToVNode.test.ts` | 태그 · 중첩 · 형제 순서 · 글자 위치 · 속성 · boolean · style · 공백 · 주석 · 0개 / 여러 개 루트, DOM → VNode → DOM 왕복 | P1-01 ~ 04 · 20 · 23 · T-01 · T-02 |
| `react-reconciler/src/__tests__/diff.test.ts` | D-01 ~ D-05 각각의 patch, 무변경이면 빈 목록, 입력을 안 고침, 길이가 다른 자식(INSERT 앞에서 · REMOVE 뒤에서), 중첩 · 복합 · 삭제와 수정 동시, 공백 · 주석 번호, 무작위 200쌍 "diff 적용 = 목표" | P1-06 ~ 16 · 33 · T-03 · T-04 · T-05 |
| `react-reconciler/.../invertPatches.test.ts` | 종류별 전후 뒤집기, 순서 뒤집기, 두 번 뒤집으면 원래, 무작위 200쌍 "되돌리면 원래" | P1-26 · T-08 |
| `react-dom-bindings/.../patch.test.ts` | 종류별 DOM 반영, 경로 · 순서대로 적용, 빈 목록이면 DOM 변경 0건, 관련 없는 노드 · 대상 요소 참조 유지, REPLACE는 새 노드, (확장) MOVE 참조 유지 · 관찰 콜백 순서 | P1-34 · 13 · 17 · 18 · T-03 · T-04 · T-06 |
| `react-dom-bindings/.../vnodesToHtml.test.ts` | VNode → HTML 글(공백 · 주석 · 이스케이프 · 빈 태그 · boolean · style), 글 → 파싱 → VNode 왕복 | P1-22 · 30 · §5 공백 · 주석 |
| `react-dom-bindings/.../setAreaHtml.test.ts` | 미리보기: `on…` · `<script>` · `javascript:` 제거, 나머지는 그대로, 파싱 중 실행 안 됨, 빈 글 | P1-21 · 22 · §5 실행 가능한 HTML |
| `react-dom-bindings/.../checkHtml.test.ts` | 위험 코드 · SVG · 태그 짝 · 구조 비교 판정, 문제 여러 개 한꺼번에, 알림 글, 정상 글(샘플 · 주석 · 빈 태그)은 통과 | §5 HTML 편집 · 오류 · §6.2 |
| `react-dom/src/__tests__/history.test.ts` | 연결 리스트 이동, 0번 바닥, 경계 무시, 갈림길 끊기, 한도 50(오래된 것부터 뺌), 저장한 기록 불변 | P1-26 · 27 · T-08 · §3.3 |
| `react-dom/src/__tests__/createVDomRoot.test.ts` | 저장한 VNode만 기준으로 diff, `update` 반영 · 무변경 0건 · 참조 유지 · 연속 Patch, `back` · `forward`가 실제 영역을 그 기록으로, 경계 · 갈림길 · 한도, (확장) 콜백 전달 | P1-24 · 25 · 26 · 28 ~ 30 · 33 · T-03 ~ T-06 · T-08 |
| `react-reconciler/.../diffKeyed.test.ts` (확장) | key 목록의 삽입 · 삭제 · 재정렬 patch, key 같고 태그 다르면 교체, key 없음 · 중복은 위치 비교, 무작위 200쌍 왕복 | PRD §5 Key · §6.2 |
| `react-dom/.../diffPatchKeyed.test.ts` (확장) | 삽입 · 삭제 · 재정렬 뒤에도 같은 key 노드가 `===` 유지, MOVE 역패치로 원래 순서 · 같은 참조 | PRD §5 Key · §6.2 |

### 표 3 — T-01 ~ T-08 중 아직 안 덮인 것

없음. (T-01 · T-02 = Dev-1 · 2, T-03 · T-04 · T-05 = Dev-3 · 4 · 6 · 12 + e2e, T-06 = Dev-6 · 12 + e2e, T-07 = Dev-15 e2e, T-08 = Dev-5 · 11 · 13 + Dev-17 e2e.)
화면(e2e)이 못 덮는 것: 보관 한도 50 · Key 비교 → 단위 테스트로만 덮음 (표 2).

## 3. 설계 메모

### 패키지 경계
- DOM은 `react-dom-bindings`에서만: `renderVNode` · `renderAreaChildren` · `domToVNode` · `readAreaChildren` · `patch` · `vnodesToHtml` · `setAreaHtml` · `checkHtml`. `vnodesToHtml` · `checkHtml`의 글 쪼개기는 글자만 다루지만 HTML 규칙이라 같은 패키지에 둠 (파싱은 `<template>`).
- `react-reconciler`: `diff(old, new) → Patch[]` · `invertPatches`. DOM 없이 VNode만.
- `react-dom`: `History`(양방향 연결 리스트, 순수 데이터) + `createVDomRoot`(읽기 → diff → patch → 기록 → 이동). 이 둘은 reconciler · bindings를 import.
- fixture: 페이지 연결(편집창 입력 → `setAreaHtml`, Patch → `checkHtml` → `readAreaChildren(테스트 영역)` → `update`, 뒤로 · 앞으로 → 스냅샷을 테스트 영역 · 편집창에 채움) + 오버레이 그리기. 엔진 로직은 없다.

### diff가 낸 순서가 경로를 맞게 한다 (결정 3 · 4)
같은 부모의 자식에서: ① 겹치는 자리(0 ~ 짧은 쪽 길이 - 1)를 순서대로 재귀 → ② 옛 자식이 남으면 **뒤에서부터** REMOVE → ③ 새 자식이 남으면 **앞에서부터** INSERT. 이렇게 하면 각 patch를 하나씩 적용할 때 경로가 그 순간의 트리와 맞고(뒤에서 지우면 앞 번호가 안 밀림, 앞에서 넣으면 뒤 번호가 아직 없음), 재귀가 건드리는 자리는 뒤따르는 INSERT · REMOVE가 건드리는 자리보다 항상 앞이라 서로 간섭하지 않는다. 가운데 항목을 지우면 위치 비교라 "뒤 항목 글자 바꾸기 + 마지막 REMOVE"가 나오지만 최종 결과는 목표와 같다 (Key 확장에서는 이동 · 삭제로 정확히 나옴).

### 역패치
`invertPatches`는 patch마다 전후를 뒤집고 목록 순서를 뒤집는다. History는 patch를 적용한 직후 `invertPatches(patches)`를 `inverse`로 저장한다. 뒤로 = 현재 기록의 `inverse`를 순서대로 `patch`, 앞으로 = 다음 기록의 `patches`를 순서대로 `patch`.
검증은 테스트 전용 검산기 `applyPatches`(VNode 목록에 patch를 적용)로 DOM 없이 하고, DOM 쪽은 `patch.test.ts` · `createVDomRoot.test.ts`가 맡는다.

### style은 속성 글을 직접 쪼갠다
jsdom으로 확인한 결과 `el.style`(CSSOM)로 읽으면 `background:url(…)` 하나가 낱개 11개로 풀리고 `foo:bar` 같은 모르는 항목은 사라진다. 그러면 VNode(스냅샷)와 실제 DOM이 어긋나므로 `style` 속성 글을 `;` · 첫 `:`로 직접 쪼개 StyleMap으로 담고(`client/style.ts`), 쓸 때는 속성 글을 다시 만들어 `setAttribute('style', …)`로 넣는다. 항목이 하나도 안 남으면 `style` 속성을 지운다.

### 미리보기는 `<template>`에서 먼저 정리한다
살아 있는 요소에 `innerHTML`로 바로 넣으면 `<img src=x onerror=…>`가 파싱 중에 실행될 수 있다. `<template>`의 내용은 비활성이므로 거기서 `on…` · `<script>` · `javascript:`를 빼고 영역으로 옮긴다. 검사기도 같은 방식으로 파싱해 위험 요소를 찾는다 (`scanDangerous` 공유). `DOMParser`는 머리글 요소를 `<head>`로 옮기므로 쓰지 않는다.

### Patch 때 검사기
- 위험 코드: `<template>`에 파싱한 결과에서 `<script>` · `on…` 속성 · `javascript:` 주소(앞 공백 · 제어문자 · 대문자 무시) 탐색.
- 태그 짝: 글을 직접 훑는 간단한 분석기(`htmlScan.ts`)로 열기 · 닫기 짝을 센다. 주석 · 따옴표 안 `>` · 빈 태그 · `style`/`textarea` 안은 건너뜀. `<div/>`는 브라우저처럼 여는 태그로 본다(빈 태그 아님).
- 구조 비교: 분석기가 센 태그 트리 ↔ 브라우저가 파싱한 요소 트리(태그 이름 · 중첩만 비교). `<p><div>` · `tbody` 자동 추가 같은 보정을 잡는다.
- 문제는 모두 모아 한 번의 alert로 보여 준다. 문구 말마디는 `dev_todo.md` 공통 약속과 qa가 같다.
- 시간이 모자라면 줄일 후보는 Dev-10(짝 + 구조) 하나다 (위험 코드 · SVG는 Dev-9에 남김). 사용자에게 먼저 묻는다.

### Diff 시각화 (확장)
- `patch(area, patches, observer?)`에 콜백을 둔다: `{ patch, node, stage }`. REMOVE는 **지우기 직전**(`before`)에 아직 붙어 있는 노드를, 나머지는 **적용 직후**(`after`)에 바뀐 노드(INSERT · REPLACE는 새 노드)를 넘긴다. `createVDomRoot`가 `update` · `back` · `forward` 모두에 같은 콜백을 전달한다.
- fixture 오버레이는 실제 영역 **밖**에 겹쳐 놓은 `pointer-events:none` 층이다. 스위치가 꺼져 있으면 아무것도 안 잰다. 켜져 있으면 patch마다 위치를 재서(글자 노드는 `Range`, 0 크기 · 주석은 부모 요소) 한 번의 동작이 끝나면 상자를 그리고 애니메이션 뒤에 지운다. 상자 개수를 `data-last-flash-count`에 남겨 e2e가 깜빡임 시간에 흔들리지 않게 한다. 실제 DOM에는 class · 속성을 붙이지 않는다.
- 한계(알려 둠): REMOVE의 위치는 지우기 직전에 재므로, 같은 목록의 뒤 patch가 레이아웃을 바꾸면 상자가 조금 어긋날 수 있다.

### Key 확장 (화면에는 key 없음, 단위 테스트만)
- 자식 목록 단위로: 옛 · 새 목록의 모든 자식이 key가 있고 중복이 없을 때만 key 비교(① 새 목록에 없는 key를 뒤에서부터 REMOVE → ② 새 목록 앞에서부터 보며 자리가 다르면 MOVE, 없으면 INSERT → ③ 짝끼리 재귀 diff), 아니면 그 목록은 위치 비교. 최소 이동 수는 보장하지 않는다(`[a,b,c]→[b,c,a]`가 이동 2번).
- `patch`의 MOVE: `parent`의 자식 `from`번을 빼서 뺀 뒤 목록의 `to`번 자리에 다시 끼운다. 같은 DOM 노드를 옮기므로 참조가 유지된다.
- 단위 테스트의 key VNode는 `h()`로 만든다 (`packages/react`는 안 고침).

### 기존 코드를 고쳐 쓰는 방법
- `renderVNode`: 주석 분기와 `style`(객체) 분기를 더한다. 지금 "객체 props → 경고" 테스트는 `style`이 아닌 객체에서만 경고하도록 고친다.
- `h()` · `types.ts`: 그대로.
- 최소 페이지(`main.ts`의 `h()` 샘플)와 `e2e/phase1-render.spec.ts`: Dev-14에서 **한 커밋으로** 새 페이지로 바꾸고 e2e를 같이 고친다. 파일 이름은 유지, 열기 · 새로고침 · mobile 가로 스크롤 3건은 새 화면 기준으로 유지, 최소 페이지 전용 4건은 QA-1 · QA-A1로 옮긴다.
- 실제 영역 초기 샘플은 `index.html`에 직접 쓰고(P1-20) 로드 때 `createVDomRoot`가 `readAreaChildren`으로 읽는다. 편집창 첫 글은 `vnodesToHtml(첫 스냅샷)`.

### 위험 · 일정
- 마감이 2026-11-11(오늘)이고 필수 Dev가 18개라 빠듯하다. 규칙대로 확장을 Dev-24 → 22 · 23 → 19 ~ 21 순으로 미룬다. 그래도 늦으면 Dev-10을 줄일지 사용자에게 묻는다.
- 공백을 노드로 남기므로 들여쓰기만 바꿔도 "글자 바꾸기" patch가 생긴다 (알려 둔 비용, QA-A5로 확인).
- 알려 둔 한계: `<template>` 안쪽 내용, `<svg>` 외 `<math>`는 검사하지 않는다 (미지원 입력을 Patch가 가져가도 실제 영역은 빈 `<template>` 정도로만 남음).

## 4. 명세에 없어서 내가 정해 둔 작은 것 (마스터 확인 요청)

명세 · 타입이 명시하지 않아 기획에서 제안으로 적었다. 틀리면 알려 달라 (Dev에서 막히지 않도록 미리 적어 둠).

1. **보관 한도 50 = 0번(초기) 포함 기록 개수.** 51번째를 넣으면 head를 뺀다 → 뒤로는 최대 49번.
2. **Key 비교는 "자식 목록 단위".** 그 목록의 모든 자식이 key가 있고 중복이 없을 때만 key 비교, 하나라도 key 없음 · 중복이면 그 목록은 위치 비교. (명세의 "key 없는 자식 · 중복 key는 위치 비교"를 목록 단위로 읽음. 자식 하나 단위로 섞어 쓰는 방식은 이동 계산이 크게 복잡해져서 택하지 않음)
3. **style 해석**: 속성 글을 직접 쪼개고(축약형 유지 · 모르는 항목 보존), 항목이 없으면 `style` props를 두지 않는다. 항목이 다 지워지면 `style` 속성도 제거.
4. **diff에 컴포넌트 VNode가 오면 오류** (Phase 2에서 FunctionComponent가 요소 VNode로 풀어서 넘김).
5. **경계 이동(무시)에서는 미저장 편집도 그대로 남는다** ("아무 일 없음"). 이동이 일어날 때만 편집을 버린다.
6. **Patch 성공 뒤 편집창 글은 친 그대로** 둔다 (뒤로 · 앞으로 때만 스냅샷 글로 채움).
7. **편집창 빈 글 = 최상위 0개로 허용** (§5 빈 트리). 위험 · 짝 · 구조 · SVG 중 하나라도 걸리면 막는다.
8. **알림 문구 말마디 4종**(`[위험한 코드]` · `[태그 짝]` · `[구조 불일치]` · `[SVG 미지원]` + "다시 작성해 주세요."), **시각화는 patch 하나 = 상자 하나**.
9. **화면 약속 `data-testid`** (`real-area` · `test-area` · `html-editor` · `btn-patch` · `btn-back` · `btn-forward` · `viz-toggle` · `viz-overlay`)와 초기 샘플 HTML은 `dev_todo.md`의 것으로 고정.
10. **`types.ts` 변경은 필요 없다** (모든 Dev가 지금 타입으로 가능). Dev 중 필요해지면 `BLOCK:SPEC_GAP`.
