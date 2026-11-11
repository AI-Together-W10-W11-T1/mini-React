# 01 작업자 기획 초안: mini-figma

- 근거: `01_request_spec.md`(승인, MF-01 ~ MF-34) · `00_master_dialogue.md` · 현재 코드(HEAD f224bdd, 브랜치 `feature/mini-figma`) · 참고 구현 `fixtures/phase2-app/` · `e2e/phase2-helpers.ts`
- 초안: `../03_development/dev_todo.md`(Dev 12개) · `../04_qa_evidence/qa_todo.md`(인수 25 · 공격 17 · 단위 5파일 · 회귀 5)
- 코드는 쓰지 않았다 (기획 문서만). `packages/` · `types.ts`는 건드리지 않는 계획이다 (MF-02)

## ① Dev 요약

| Dev | 위치 | 한 줄 | MF · PRD |
| --- | --- | --- | --- |
| Dev-1 | `fixtures/mini-figma/model.ts` (DOM 없음) | 시작 데이터 · override 합치기(키가 있으면 override) · 칸 바꾸기 · ↻ = 키 지우기. 바뀐 게 없으면 같은 객체 | MF-10 · 11 · 12 · 13 · 16 |
| Dev-2 | `model.ts` | 인스턴스 추가(끝, override 없음) · 삭제(`filter`) · 순서(±1) · 선택 정리(없는 id → `null`) | MF-22 · 23 · 25 · 26 · 32 |
| Dev-3 | `undo.ts` (DOM 없음) | Undo 기록: 같은 대상 + 같은 칸 연달아 = 한 단계, 50개, Undo · Redo, Undo 뒤 새 수정이면 Redo 버림 | MF-30 · 31 · 32 |
| Dev-4 | `keys.ts` (DOM 없음) | 키 판정: 눌린 키 정보 → 지우기 · Undo · Redo · 없음, 입력칸 안은 무시 | MF-33 · 34 |
| Dev-5 | `index.html` · `main.ts` · `App.ts` · `Canvas` · `Button` · 껍데기 `LayerPanel` · `PropertyPanel` · `rootOnlyHooks.test.ts` · `app.test.ts` | 앱 뼈대 + 시작 화면 + 세 영역 배치(desktop 가로 · mobile 세로). Hook은 `App`에만 | MF-01 · 03 · 04 · 05 · 10 · 11 · 16 · P2-02 · 07 · 09 · 10 · 22 |
| Dev-6 | `LayerPanel` · `Canvas` · `PropertyPanel` 머리 | 캔버스 · 레이어에서 고르기, 패널 머리 표시, 빈 상태(D-05) | MF-20 |
| Dev-7 | `PropertyPanel` · `Button` · 아이콘 | **메인** 속성 편집 5칸 + Boolean 아이콘(노드 생김 · 사라짐) + Instance swap | MF-12 · 14 · 15 · D-01 ~ 04 |
| Dev-8 | `PropertyPanel` | **인스턴스** 편집 + override 색 구분 + ↻ + 「메인 따름」 | MF-12 · 13 · 14 · 15 · 21 |
| Dev-9 | `LayerPanel` · `PropertyPanel` | [+ 인스턴스] · [삭제] · 메인에는 삭제 없음 · 고른 것 삭제 → 선택 풀림 | MF-22 · 23 · 24 · 26 |
| Dev-10 | `LayerPanel` | 레이어 행 [↑] [↓] = 배열 순서 + MOVE (DOM 노드 유지) | MF-25 · 26 · 결정 2 B |
| Dev-11 | `App.ts` | `useEffect`로 `document` keydown 등록 + cleanup, Delete · Backspace · Undo · Redo 연결, Undo로 선택 사라지면 풀림 | MF-30 ~ 34 |
| Dev-12 | `e2e/` | 공격 · 경계 시나리오 마무리 + 전체 회귀 + `packages/` 무수정 확인 | MF-02 · 03 · 전체 |

순서와 커밋: Dev-1 → 12, 항목 하나 = 커밋 하나, 메시지 `<type>(mini-figma): <요약> (Dev-N)`. Dev-1 ~ 4는 DOM이 없는 순수 함수라 Vitest만으로 끝낸다. Dev-5 ~ 11은 **e2e를 먼저 써서 desktop에서 실패를 확인**하고 구현한다 (바깥 루프). Dev-7은 ④-1 · ④-12가 정해진 뒤에 시작한다.

핵심 설계 요약 (구현 지시 아님, 확인용):
- `App`의 state: `doc`(`{ main, instances }`) · `selectedId` · `history`(Undo) · `nextId`. 모든 수정은 `applyEdit(next, group)` 하나를 거쳐 `doc`과 `history`를 같이 바꾼다. 한 동작의 setter 여러 개는 Batching으로 렌더 한 번
- 순수 함수는 바뀐 게 없으면 같은 객체를 돌려줘서(`todoOps.ts` 방식) 렌더도 기록도 안 생긴다
- 캔버스 · 레이어의 인스턴스 목록은 형제 전부에 key(= id)를 둔다 — 하나라도 key가 없으면 엔진이 위치 비교로 돌아가 MOVE가 안 나온다 (dev_todo 공통 주의 1)
- patch는 화면에 안 보이므로(MF-05), patch 종류는 jsdom 단위 테스트가 `render()`가 돌려주는 인스턴스의 `lastPatches`로, 「바뀐 곳만 고침」은 e2e가 같은 DOM 노드 + `MutationObserver`로 확인한다

## ② 사용자 확인용 테스트 케이스

### 인수 (e2e, desktop · mobile 모두)

| 이름 | 이럴 때 · 이렇게 하면 · 이렇게 된다 | 덮는 ID |
| --- | --- | --- |
| QA-1 시작 화면 | 처음 열면 · (보기만) · 메인 + b1 b2 b3 버튼과 레이어 행, `b3`만 빨강, 속성 패널은 빈 상태, patch · 렌더 횟수 표시 없음 | MF-01 · 04 · 05 · 11 · 16 · P2-22 |
| QA-2 세 영역 배치 | 화면이 1280 / 375일 때 · 위치를 재면 · 1280 = 가로 3칸, 375 = 위아래로 쌓임, 가로 스크롤 없음 | MF-03 |
| QA-3 캔버스에서 고르기 | `b2` 버튼을 누르면 · 머리 「인스턴스 · 취소」, 캔버스 · 레이어에 고른 표시, 빈 안내는 교체됨, 버튼 노드 같은 참조 | MF-20 · D-05 |
| QA-4 레이어 · 메인 고르기 | 레이어의 `b3` → 메인 행 → 캔버스 메인 버튼을 누르면 · 머리가 「인스턴스 · 삭제」 → 「메인 Button」, 고른 표시가 양쪽에 같이 | MF-20 |
| QA-5 메인 라벨 입력 | 메인을 고르고 라벨 칸에 한 글자씩 입력하면 · 메인과 `b1`만 바뀌고 `b2` `b3`는 그대로, 입력칸 포커스 · 노드 유지, 글자 변경만 일어남 | MF-12 · 14 · 15 · P2-10 · D-01 |
| QA-6 메인 크기 | 크기를 `L`로 바꾸면 · 크기 override 없는 4개 버튼이 모두 `L`, 노드 같은 참조 | MF-14 · D-02 |
| QA-7 메인 색, override 유지 | `b3`만 빨강인 상태에서 메인 색을 초록으로 · 메인 `b1` `b2`는 초록, `b3`는 빨강 그대로 | MF-12 · 14 · D-02 |
| QA-8 아이콘 켜기 · 끄기 | 메인의 아이콘 보이기를 켜고 끄면 · 4개 버튼에 아이콘 노드가 생기고 사라짐, 글자 노드는 같은 참조 (④-1 후보에 따름) | MF-14 · D-03 · D-04 |
| QA-9 아이콘 종류 바꾸기 | 아이콘을 켠 채 `♥`로 · 글자만 `♥`, 아이콘 노드는 같은 참조 (같은 태그라 글자 변경으로만 보임 — 정상) | MF-14 · D-01 |
| QA-10 인스턴스 하나만 | `b1`을 고르고 라벨을 `확인`으로 · `b1`만 바뀜, 라벨 칸에 override 표시 + ↻ | MF-12 · 14 · 21 |
| QA-11 override는 메인이 바뀌어도 그대로 | `b1` 라벨 `확인` 상태에서 메인 라벨을 `저장`으로 · `b1`은 `확인` 그대로 | MF-12 |
| QA-12 ↻ | `b1` 라벨 ↻ → 메인 라벨 변경 · ↻ 뒤 메인 값을 따르고 글자가 안 사라짐, 이후 메인 변경도 따라감 | MF-13 |
| QA-13 override 표시 | `b2` → `b3` → `b1`을 차례로 고르면 · override 칸만 색 구분 + ↻, 나머지는 「메인 따름」 | MF-21 |
| QA-14 [+ 인스턴스] | 누르면 · 끝에 `b4`, 전부 메인 따름, 기존 노드 같은 참조, 추가 1건만 | MF-22 · D-03 |
| QA-15 삭제 | `b2`를 고르고 [삭제] · 캔버스 · 레이어에서 함께 사라짐, 선택 풀림, 다시 추가하면 `b4` (번호 재사용 안 함) | MF-23 · D-04 · D-05 |
| QA-16 메인은 못 지움 | 메인을 고르면 · [삭제] 없음, Delete · Backspace 눌러도 아무 일 없음 | MF-24 |
| QA-17 순서 바꾸기 | 레이어 `b1` [↓], `b3` [↑] · 캔버스 · 레이어 순서가 함께 바뀌고 **버튼 · 행 DOM 노드는 전부 같은 참조**(MOVE) | MF-25 |
| QA-18 고른 채 순서 바꾸기 | `b2`를 고르고 순서를 두 번 바꾸면 · `b2`가 계속 골라져 있음 (id로 고름) | MF-26 |
| QA-19 Ctrl+Z · Ctrl+Shift+Z | 메인 색 수정 뒤 · 되돌리기 → 파랑, 다시 하기 → 빨강 | MF-30 · 33 |
| QA-20 Cmd | 위와 같이 `Meta+Z` · `Meta+Shift+Z` · 같은 결과 | MF-33 |
| QA-21 한 단계 묶음 | `삭제` → `지우기`를 한 글자씩 입력 후 Ctrl+Z 한 번 · `삭제`로 돌아감 | MF-31 |
| QA-22 묶음이 끝나는 경우 | 다른 칸 · 다른 대상 수정, 추가 · 삭제 · 순서 · ↻를 섞어 8단계 · Ctrl+Z가 한 번에 한 단계씩, 9번째는 무시 | MF-31 |
| QA-23 Undo 뒤 새 수정 | Undo 두 번 뒤 새 수정을 하면 · 다시 하기가 버려짐 | MF-30 |
| QA-24 Undo로 선택 풀림 | 방금 추가한 `b4`를 고르고 Ctrl+Z · `b4` 사라지고 선택 풀림. 고르기만 한 것은 기록에 없음 | MF-30 · 32 |
| QA-25 Delete · Backspace | `b2` Delete, `b3` Backspace, Ctrl+Z · 지워지고 선택 풀림, Ctrl+Z로 원래 자리에 복귀 | MF-33 · 23 |

### 공격 · 경계 (e2e)

| 이름 | 이럴 때 · 이렇게 하면 · 이렇게 된다 | 덮는 ID |
| --- | --- | --- |
| QA-A1 특수문자 | 라벨에 `<b>` · `&amp;` · 이모지 · `<img onerror>` · 글자 그대로, 요소 · 스크립트 안 생김 | MF-15 · T-14 |
| QA-A2 긴 글자 | 공백 없는 200자 · 가로 스크롤 없음(mobile 포함), 한 단계로 묶임 | MF-03 · 15 · 31 |
| QA-A3 빈 라벨 override | `b1` 라벨을 비우면 · 빈 글자 그대로(메인 따라가지 않음), 버튼은 화면에 보임, 메인을 바꿔도 빈 그대로 | MF-12 |
| QA-A4 메인과 같은 값 override | `버튼x` → `버튼`으로 되돌려 입력 · override로 남음, 메인을 바꿔도 `버튼` 그대로 | MF-12 |
| QA-A5 ↻ 뒤 메인 변경 | 색 · 라벨 ↻ 뒤 메인을 바꾸면 · 다시 따라감, `undefined`가 클래스 · 글자에 안 나옴 | MF-13 |
| QA-A6 고른 것이 사라짐 | 고른 것을 Delete → Undo → 다시 고름 → Redo · 선택이 풀리고 존재하지 않는 id가 남지 않음 | MF-23 · 32 · 33 |
| QA-A7 메인에서 Delete 연타 | 메인을 고르고 Delete · Backspace 5번씩 · 아무 일 없음 | MF-24 |
| QA-A8 입력칸 안의 키 | 라벨 칸 · 선택 상자 · 체크박스에서 Backspace · Delete · Ctrl+Z · Cmd+Z · 인스턴스 안 지워지고 앱 Undo 안 일어남 | MF-34 |
| QA-A9 Undo 51번째 | [+ 인스턴스] 51번 → Ctrl+Z 50번 · 51번째는 무시, 처음 모습으로는 못 돌아감(④-6), Redo 50번으로 끝까지 복귀 | MF-30 |
| QA-A10 옛 state 키 핸들러 | 고른 것을 바꾼 뒤 Delete · 새로 고른 것이 지워짐. 수정 뒤 Ctrl+Z · 최신 단계만. 상태 20번 바꾼 뒤 Ctrl+Z 한 번 · 한 단계만(리스너 중복 없음) | MF-34 |
| QA-A11 정해진 키 밖 | Ctrl+Y · Esc · z 단독 · Alt+Z · 아무 일 없음 | MF-33 · 제외 범위 |
| QA-A12 연타 | [+ 인스턴스] 20번, [↓] 5번, Delete 3번 · 오류 없음, 기존 노드 같은 참조, 인스턴스는 한 번만 지워짐 | MF-22 · 25 · 23 |
| QA-A13 새로고침 | 고치고 추가 · 삭제 뒤 새로고침 · 시작 데이터, Undo 기록도 비어 있음 | MF-16 · 제외 범위(저장 안 함) |
| QA-A14 입력 100자 | 한 글자씩 100자 · 포커스 · 커서 유지, 한 번의 Ctrl+Z로 되돌아감 | MF-15 · 31 |
| QA-A15 고르기만 바꿔도 묶음 | `b2` 라벨 입력 → 다른 것을 고르고 돌아와 입력 → Ctrl+Z 한 번 · 둘 다 되돌아감 (명세 글자 그대로, ④-7) | MF-31 |
| QA-A16 순서 버튼은 고르기를 안 바꿈 | `b2`를 고른 채 `b1` [↓] · 계속 `b2`가 골라짐 (이벤트 버블링, ④-4) | MF-25 · 26 |
| QA-A17 끼어들어도 고른 것 유지 | `b1` 삭제 → `b3` 고름 → Undo(앞에 끼어듦) → Redo · 계속 `b3` | MF-26 |

### 단위 (Vitest, `fixtures/mini-figma/__tests__/`)

| 파일 | 검사 내용 | 덮는 ID |
| --- | --- | --- |
| `model.test.ts` | 시작 데이터, override 합치기(빈 글자 · 같은 값 포함), 칸 바꾸기, ↻ = 키 지우기(`undefined` 없음, 이후 다시 따라감), 추가 · 삭제 · 순서(없는 id · 경계 · 메인은 같은 객체), 선택 정리, 입력 불변 | MF-11 ~ 13 · 16 · 22 · 23 · 25 · 32 |
| `undo.test.ts` | 묶음(같은 대상 + 같은 칸 연달아, 시간 기준 없음), 다른 칸 · 대상 · 추가 · 삭제 · 순서 · ↻는 새 단계, Undo · Redo, Undo 뒤 새 수정이면 Redo 버림, 50개(51번째가 가장 오래된 것을 뺌), 바뀐 게 없으면 기록 안 함 | MF-30 · 31 |
| `keys.test.ts` | 키 표(Delete · Backspace · Ctrl/Meta+Z · +Shift, `'Z'` 포함), 입력칸 안 무시, 정해진 키 밖은 null | MF-33 · 34 |
| `rootOnlyHooks.test.ts` | `App.ts`만 Hook, 자식 · 순수 모듈에 Hook · `document` · `window` · 엔진 내부 import 없음, 검사기가 틀린 소스를 잡음 | MF-04 · P2-07 ~ 09 · T-16 |
| `app.test.ts` (jsdom) | 시작 DOM · `lastPatches` 종류(라벨 = SET_TEXT, 크기 · 색 = SET_ATTR, 아이콘 켜기 = INSERT / 끄기 = REMOVE, ★ → ♥ = SET_TEXT, 순서 = MOVE, 추가 = INSERT, 삭제 = REMOVE, `SET_EVENT` 제외) · 한 동작 = 렌더 한 번 · keydown 리스너 1개 유지 + `unmount()` cleanup · 입력칸 keydown 무시 · 고르기는 기록에 안 들어감 | MF-04 · 10 · 31 · 32 · 34 · 명세 4절 |

### 회귀

`git diff --stat f224bdd -- packages/` 비어 있음 · `npx vitest run` · `npx tsc --noEmit` · `npx playwright test` 전체(기존 Phase 1 · 2 + 새 mini-figma) · Phase 1 · 2 검증 페이지와 성능 대시보드가 그대로 열림.

## ③ 아직 안 덮인 MF · PRD ID와 사유

| ID | 사유 |
| --- | --- |
| MF-02 엔진 무수정 | e2e로 못 본다. `git diff --stat f224bdd -- packages/`가 비어 있는지와 기존 vitest · playwright 통과(QA-R1 ~ R4)로 확인 |
| MF-05 patch 비표시 | QA-1이 "알리는 요소가 없음"(`log-` testid · "patch" 글자)만 확인한다. "화면에 어떤 것도 안 보임"의 완전한 증명은 아님 |
| MF-10 state 칸 구성 | 내부 구조라 e2e에 안 보인다. `rootOnlyHooks.test.ts` + `app.test.ts`가 동작으로만 확인 (state 칸 이름 자체는 검사 안 함) |
| MF-34 listener 등록 · cleanup | 브라우저에서는 결과(A10의 "Ctrl+Z 한 번 = 한 단계")로 간접 확인. 등록 개수 · `unmount()` cleanup은 jsdom `app.test.ts`만 직접 본다 |
| 명세 4절 「Batching」 · 「SET_EVENT」 · patch 종류 | 화면에 렌더 횟수 · patch가 없어 e2e로 못 본다 → `app.test.ts`의 `lastPatches` · `App` 실행 횟수로 대신 (실제 값은 개발 때 근거에 적음) |
| 「Undo 묶음에 시간 기준 없음」 | e2e는 기다리기에 기대지 않는다. `undo.ts`에 시간 입력이 아예 없다는 것을 단위 테스트(여러 번 · 간격 없이)로만 확인 |
| D-01 ~ 05 엔진 자체 | 이 task는 엔진을 안 바꿔서 새로 안 쓴다. 앱 화면 대응만 QA에 표시(위 표의 D-0x), 엔진은 Phase 1 회귀로 확인 |
| History 동기화 (두 영역) | **해당 없음** — Phase 1 검증 페이지 전용 |
| P2-24 중 touch · 실제 모바일 키보드 | mobile 프로젝트도 Playwright 키 입력으로 돌린다. 실제 터치 기기에는 단축키를 못 쓴다 (④-11) |
| Delete · Backspace 이외 키, Shift+Delete 등 수정키 조합 | 명세 밖(제외 범위)이거나 ④-8 결정 대기 |

## ④ 마스터 · 사용자가 정해야 할 것 (추천 포함)

### ④-1 아이콘 자리 (명세 4절 열린 질문 — 정하지 않고 후보만 적는다)

문제: Boolean 아이콘을 글자 **앞**에 두면 위치 비교 때문에 글자 노드가 아이콘 자리를 차지한다. 아이콘 `<span>`이 앞에 생기면 엔진은 「0번 자리의 옛 글자 `<span>`을 새 아이콘으로 고치고, 1번 자리에 새 글자 `<span>`을 추가」한다 (태그가 다르면 `REPLACE` + `REMOVE`). 한 칸 껐다 켰을 뿐인데 **글자 노드가 다시 만들어지고**, 「바뀐 곳만 고침」이 거짓이 된다.

| 후보 | 방법 | on / off 때 patch | 장점 | 단점 |
| --- | --- | --- | --- | --- |
| A | DOM에서는 글자 **뒤**에 두고 CSS로 앞에 보이게 (`order: -1`) | INSERT 1줄 / REMOVE 1줄, 글자 노드 유지 | 엔진의 기본 규칙(위치)만 씀, 구현 가장 단순 | DOM 순서 ≠ 화면 순서. Elements 패널로 시연할 때 설명이 필요, 읽는 순서(접근성)가 뒤 |
| B | 버튼 안 자식 **모두에 key**(`'icon'` · `'label'`)를 줌 → 형제가 전부 key라서 엔진이 key 표 매칭 | INSERT 1줄(0번 자리) / REMOVE 1줄, 글자 노드 유지 | DOM 순서 = 화면 순서. 이미 쓰는 Key 확장(결정 2 B)을 한 곳 더 보여 줌 | 자식 하나라도 key가 빠지면 **조용히** 위치 비교로 돌아가 같은 문제가 되살아남 → 단위 테스트(`lastPatches`에 REPLACE · REMOVE가 없음)가 지켜야 함. 아이콘 컴포넌트에 key를 물려주는 호출 규칙이 하나 더 |
| C | 아이콘 칸을 **항상** 두고 꺼지면 숨김(`hidden`) · 비움 | SET_ATTR 1줄(또는 SET_TEXT) | 가장 단순, 노드가 안 움직임 | Q4에서 정한 「Boolean = 노드가 생기고 사라짐(INSERT · REMOVE)」 시연이 사라지고, 안 보이는 빈 `<span>`이 남음. Boolean이 속성 변경처럼 보임 |
| D | 앞에 두고 그대로 (명세 4절의 문제 상황) | REPLACE 또는 SET_ATTR + SET_TEXT에 INSERT 1줄 (태그에 따라 2줄 이상) | 코드 변화 없음 | 글자 노드가 다시 만들어지거나 아이콘 노드로 재활용되어 「바뀐 곳만 고침」 시연 · 단언이 깨짐. 비추천 |

추천: **B** (DOM 순서가 화면과 같고 patch 1줄, Key 확장을 한 번 더 시연). 키 하나라도 빠지면 조용히 깨진다는 위험은 QA-8과 `app.test.ts`가 잡도록 해 둔다. 구현이 부담이거나 key 의존을 피하고 싶으면 **A**. 정해지면 QA-8의 단언 하나만 달라진다 (C를 고르면 "글자 노드 같은 참조" 대신 "아이콘 칸의 `hidden`이 바뀜").

### ④-2 ~ 13 기획이 부딪힌 빈 곳 (개발 전에 확인 필요, 추천 = 기본값으로 계획에 반영해 둠)

명세에 없는 기능을 더한 것은 없다. 아래는 구현하다 반드시 만나는 「명세가 말 안 한 곳」이고, 이의가 없으면 추천대로 진행한다.

| # | 빈 곳 | 추천 (계획에 반영한 값) | 영향 |
| --- | --- | --- | --- |
| ④-2 | **처음 열 때 고른 것** (MF-10 `selectedId`의 시작값 · MF-16 시작 데이터에 없음) | `null` (Figma처럼 아무것도 안 고름, 속성 패널 빈 상태가 처음에 보임). 대안: `'main'`(열자마자 속성이 보여 시연이 빠름) | QA-1 · QA-3 |
| ④-3 | **인스턴스 이름**: 레이어 행 · 패널 머리 「인스턴스 · 삭제」의 이름은 인스턴스의 **지금 글자**인가, id(`b3`)인가. 글자가 `''`이면? | 지금 보이는 글자(MF-20 예시와 일치, 글자를 입력하면 레이어 이름도 같이 바뀜). 글자가 비면 id로 대신 표시 | QA-3 · 4 · 10 · 레이어 단언 |
| ④-4 | **[↑] [↓] 위치**: 행마다 있는 버튼인가, 고른 것 하나를 옮기는 버튼인가. 행의 버튼을 누르면 그 행이 고르기도 되는가 | **행마다** (phase2 목록과 같은 모양), 순서 버튼은 고르기를 바꾸지 않는다(`stopPropagation` 또는 형제 구조) — MF-26 「고른 채 순서를 바꿔도」에 맞음. 이 방식이 아니면 QA-17 · 18 · A16이 바뀜 | Dev-10 · QA-17 · 18 · A16 |
| ④-5 | **`nextId` · state 칸 구성**: MF-10의 state 목록(`main` · `instances` · `selectedId` · Undo 기록)에 「다음 번호」가 없다. 지운 번호를 안 쓰려면 별도 카운터가 필요(`최대 번호 + 1`은 맨 끝을 지우면 번호가 재사용됨). 또 `main` · `instances`를 칸 둘로 둘지 `doc` 하나로 묶을지 | `nextId`는 **Undo가 되돌리지 않는 별도 state 칸**(Undo로 추가를 취소해도 번호는 계속 증가 → 어떤 경우에도 번호가 안 겹침). `main` · `instances`는 순수 함수가 한 번에 다루기 쉬운 `doc = { main, instances }` 칸 하나(같은 객체면 `Object.is`로 렌더 생략). 칸 수는 4개(`doc` · `selectedId` · `history` · `nextId`) | Dev-1 · 2 · 5 · QA-15 |
| ④-6 | **「최대 50개」의 뜻**: Undo 50번 가능인가(51번 수정하면 시작 모습으로는 못 돌아감), 시작 모습도 1개로 세어 49번인가 | **50번 Undo 가능** (51번째 수정이 가장 오래된 것을 뺌). Phase 1의 「보관 한도 50」은 시작 모습을 0번 기록으로 세지만, 여기서는 Undo 칸 수를 센다 | Dev-3 · QA-A9 |
| ④-7 | **고르기만 바꿔도 묶음이 끝나는가** (MF-31은 「수정」만 묶음을 끝낸다고 씀 — `b2` 라벨 입력 → 다른 것을 고름 → 돌아와 같은 칸 입력) | **명세 글자 그대로: 안 끝남**(고르기는 기록 밖이라는 결정과 일관). 부자연스러우면 「고르기도 끝낸다」로 바꿀 수 있고, 그러면 `undo.ts`에 고르기 신호가 하나 더 생기고 QA-A15 기대값만 바뀜 | Dev-3 · 11 · QA-A15 |
| ④-8 | **단축키 세부**: ① `Delete`/`Backspace`에 Ctrl · Alt · Meta가 같이 눌렸을 때(맥의 Cmd+Backspace 등) ② Undo에 Alt가 있을 때 ③ 처리한 키의 `preventDefault` ④ 키를 길게 눌러 반복될 때(`repeat`) | ① 수정키 없을 때만 지우기 ② Alt가 있으면 무시 ③ `preventDefault` 안 함(명세에 없고, 입력칸 밖에서는 기본 동작이 없어 필요 없음) ④ 반복도 그대로 처리(지우기는 선택이 풀려 한 번뿐, Undo는 눌린 만큼) | Dev-4 · QA-A11 |
| ④-9 | **색 · 크기를 어떻게 그리나** (명세에 없음) | 크기 = 클래스 `btn-S/M/L`, 색 = 클래스 `btn-blue/red/green`. 인라인 `style`(SET_STYLE로 나오는 쪽)로 하고 싶으면 알려 주세요 — Elements 시연에서 patch 종류가 하나 더 보이는 장점, 테스트가 클래스 대신 계산된 CSS를 읽게 됨 | 화면 약속 표 · QA-6 · 7 |
| ④-10 | **추가한 뒤 선택**: [+ 인스턴스] 뒤 새 인스턴스를 자동으로 고를까 | **안 바뀜** (명세가 「끝에 생김」만 말함) | QA-14 |
| ④-11 | **Undo / Redo 버튼 없음**: 명세(MF-33)는 단축키만 정한다. 터치 화면(mobile)에서는 되돌릴 방법이 없다 | 이번 범위에서는 **버튼 안 만듦**(명세 밖). 필요하면 후속 task | MF-33 · mobile |
| ④-12 | **아이콘 종류를 어디서 컴포넌트로 바꾸나**: state에는 `icon: 'star'`(MF-16), 명세 14는 「컴포넌트를 prop 값으로 넘김」 | state는 문자열(`'star'`/`'heart'`) 그대로 두고, **`Canvas`가 문자열 → 컴포넌트(`StarIcon`/`HeartIcon`)로 바꿔** `Button`에 `icon` prop으로 넘긴다(`Button`은 `h(icon, …)`로 부름 — Button 안에서 컴포넌트가 컴포넌트를 부름, 엔진이 재귀로 풂). 아이콘 컴포넌트는 Hook · DOM 없음 | Dev-7 · QA-9 |
| ④-13 | **경계의 [↑] · [↓]** (맨 위 행의 [↑] · 맨 아래 행의 [↓]) | 버튼은 그대로 있고 눌러도 아무 일 없음(같은 Doc → 렌더 · 기록 없음), phase2 목록과 같음 | QA-17 · A12 |

### 기타 메모
- e2e 도우미는 `phase2-helpers.ts`의 `holdNodes` · `sameNode` · `watchApp`을 그대로 쓰려고 **영역 상자 이름을 `app-root`로 같게** 한다 (새 도우미 파일 `e2e/mini-figma-helpers.ts`가 다시 내보냄).
- `playwright.config.ts` · `vite.config.ts`(root = `fixtures`) · `vitest.config.ts`(`fixtures/**/__tests__` 포함) · `tsconfig.json`(`fixtures` · `e2e` 포함)은 **고칠 필요가 없다** — `/mini-figma/`가 저절로 열린다.
- `rootOnlyHooks.test.ts` 검사기는 `phase2-app` 것을 참고해 `fixtures/mini-figma/` 쪽으로 새로 쓴다 (엔진 코드가 아니므로 복사해도 MF-02 위반이 아님).
