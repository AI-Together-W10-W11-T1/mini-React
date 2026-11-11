# dev_todo: mini-figma

- 명세: `../01_request_spec.md` · 브랜치: `feature/mini-figma`
- 규칙: 항목 하나 = 커밋 하나. 체크할 때 완료 근거 필수 (근거 없는 체크는 무효). 커밋 메시지 `<type>(mini-figma): <요약> (Dev-N)`, push 안 함
- 범위: `fixtures/mini-figma/` · `e2e/mini-figma-*.spec.ts` · `e2e/mini-figma-helpers.ts`뿐. **`packages/`는 한 줄도 바꾸지 않는다 (MF-02)**. `types.ts` 변경 없음. 완료 때 `git diff --stat f224bdd -- packages/`가 비어 있음을 근거에 붙인다
- 바깥 루프(ATDD): 인수 시나리오가 있는 Dev(5 ~ 11)는 `04_qa_evidence/qa_todo.md`의 해당 QA를 **먼저 e2e로 써서 desktop에서 실패하는 것을 확인**한 뒤 구현한다. 안쪽 루프는 Vitest(`fixtures/mini-figma/__tests__/`)
- 순서: Dev-1 ~ 4 (DOM 없는 순수 함수, 단위 테스트만) → Dev-5 ~ 10 (화면, 기능별) → Dev-11 (키보드 · Undo 연결) → Dev-12 (공격 · 경계 마무리)
- 기준 코드: `fixtures/phase2-app/`(App · components · `todoOps.ts` · `__tests__/rootOnlyHooks.test.ts`), `e2e/phase2-helpers.ts`(`holdNodes` · `sameNode` · `watchApp`)
- patch 종류 · 개수의 **기대값 표는 `qa_todo.md` 「patch 기대 표」 하나가 기준**이다. Dev 항목의 `app.test.ts` 단언은 그 표를 그대로 옮긴다 (아래 공통 주의 13)

## 확정 설계 결정 (사용자 확정 — 개발자는 다시 묻지 않는다)

출처: `00_master_dialogue.md` Q17 (1단계 기획 검수 1회차 뒤) · 나머지는 작업자 추천을 사용자가 수용.

| # | 결정 | 값 |
| --- | --- | --- |
| Q17-1 (④-1) | 아이콘 자리 | 후보 B. **버튼 안 자식 모두에 key**: 아이콘 = `'icon'`, 글자 = `'label'`. 켜기 = `INSERT [.., 0]` 1줄, 끄기 = `REMOVE [.., 0]` 1줄, 글자 `<span>` 노드는 유지 |
| Q17-2 (④-6) | Undo 한도 | Phase 1과 같은 뜻: **처음 상태 포함 기록 50개 = Undo 49번**. 상수 `UNDO_LIMIT = 50`(뜻 주석 필수) → `past` 최대 49칸 |
| Q17-3 (④-5) | state 칸 | `doc = { main, instances }`(한 칸) · `selectedId` · `history`(Undo) · `nextId`(4칸). `nextId`는 Undo로 되돌리지 않음 (b4 추가 → Undo → 다시 추가 = **b5**) |
| Q17-4 (④-8) | 지우기 키 | Delete · Backspace는 **Ctrl · Cmd(Meta) · Alt · Shift가 하나도 없을 때만** 지움. Undo/Redo는 Alt가 있으면 무시. `preventDefault` 안 함. 키 반복(`repeat`)도 그대로 처리 |
| Q17-5 | 캔버스 배치 | 인스턴스 버튼 줄은 `display:flex; flex-wrap:wrap`(줄바꿈). mobile에서도 가로 스크롤 없음 |
| Q17-6 (④-11) | Undo 버튼 | **없음** (단축키만, 명세 그대로) |
| ④-2 | 처음 고른 것 | `selectedId = null` (속성 패널 빈 상태로 시작) |
| ④-3 | 인스턴스 이름 | 레이어 행 · 패널 머리 「인스턴스 · 이름」의 이름 = **그 인스턴스의 지금 글자**(`mergeProps` 결과의 `label`). 글자가 `''`이면 id(`b3`)로 대신 표시. 메인 행 · 머리는 고정 문구 「메인 Button」 |
| ④-4 | [↑] [↓] | 인스턴스 **행마다** 있음. 누르면 고르기는 안 바뀜 (`stopPropagation`). 메인 행에는 없음 |
| ④-7 | 고르기와 묶음 | 고르기만 바꿔도 Undo 묶음은 **안 끝남** (명세 글자 그대로, 고르기는 기록 밖) |
| ④-9 | 크기 · 색 | 클래스: `btn-S/M/L` · `btn-blue/red/green` (인라인 `style` 안 씀) |
| ④-10 | 추가 뒤 선택 | 안 바뀜 |
| ④-12 | 아이콘 종류 → 컴포넌트 | state는 문자열(`'star'` / `'heart'`). **`Canvas`가** 문자열 → 컴포넌트(`StarIcon` / `HeartIcon`)로 바꿔 `Button`에 `icon` prop으로 넘기고, `Button`이 `h(icon, { key: 'icon' })`로 부름 |
| ④-13 | 경계 [↑] [↓] | 버튼은 그대로 있고 눌러도 아무 일 없음 (같은 `doc` → 렌더 · 기록 없음) |

> 인스턴스가 없을 때 「인스턴스가 없어요」 같은 안내 문구는 **만들지 않는다**(명세에 없음, 1회차 NON-BLOCKING 11).

## 폴더 구성 (제안)

```
fixtures/mini-figma/
  index.html                영역 상자 <div data-testid="app-root"> + <style>
  main.ts                   render(App, root) 연결만
  App.ts                    루트. useState · useEffect는 여기에만
  model.ts                  (DOM 없음) 시작 데이터 · override 합치기 · 칸 바꾸기 · ↻ · 추가 · 삭제 · 순서 · 선택 정리
  undo.ts                   (DOM 없음) Undo 기록: 묶음 · 50개(= Undo 49번) · Undo · Redo
  keys.ts                   (DOM 없음) 키 판정: 눌린 키 정보 → 'delete' | 'undo' | 'redo' | null
  components/               정확히 5개: Button.ts · Canvas.ts · Icons.ts(StarIcon · HeartIcon) · LayerPanel.ts · PropertyPanel.ts
                            (속성 한 줄 부품은 PropertyPanel.ts 안에 둔다. 파일을 더 만들면 rootOnlyHooks.test.ts의 목록 단언도 같은 커밋에서 고친다)
  __tests__/                model · undo · keys · rootOnlyHooks · app (jsdom)
```

화면 뼈대 (patch 경로 판정의 기준): `App`이 돌려주는 최상위는 `<div class="app">` **하나**이고, 그 자식 순서는 **레이어 창(0) · 캔버스(1) · 속성 패널(2)** 고정이다 (mobile은 CSS만 바뀜, DOM 순서 그대로). 따라서 영역 상자 기준 경로 접두는 레이어 `[0, 0]` · 캔버스 `[0, 1]` · 속성 패널 `[0, 2]`.

## 공통 주의 (엔진과 부딪히는 곳 — 개발자 · 검수자 모두 확인)

1. **key 목록은 형제 전부에 key가 있어야 한다.** `diff`는 한 부모의 자식이 하나라도 key가 없거나 중복이면 위치 비교로 돌아간다 (`isKeyed`). 캔버스의 인스턴스 줄 · 레이어 창의 인스턴스 `<ul>`에는 `h(…, { key: id })` 자식만 둔다. 메인 버튼은 별도 상자 `canvas-main`에 둔다. MF-25 MOVE가 이것에 달려 있다
2. **`...it`에는 `id`가 들어 있다.** `h(Button, { key: it.id, ...main, ...it })`로 넘어간 props를 `Button`이 그대로 DOM 속성으로 펼치면 `label` · `size` · `id` 같은 이름이 속성이 되어 버린다. `Button`은 쓸 props를 하나씩 꺼내 명시적으로 속성을 만든다
3. **이벤트 버블링은 브라우저 그대로다.** 레이어 행 안의 [↑] · [↓]가 행의 고르기 `onClick`보다 안쪽에 있으면 같이 불린다. 순서 버튼 · 삭제 버튼의 핸들러는 `event.stopPropagation()`한다 (④-4)
4. **지원 이벤트는 `click` · `input`뿐.** 라벨 칸 · **선택 상자 · 체크박스는 모두 `onInput`으로만** 받는다 (Chromium은 select · checkbox도 `input`을 낸다). 선택 상자를 `onClick`으로 받으면 열 때마다 불리므로 쓰지 않는다. 버튼(고르기 · [+ 인스턴스] · [삭제] · [↑] [↓] · ↻)만 `onClick`. `change` · `keydown`을 `onChange` · `onKeyDown`으로 쓰지 않는다
5. **빈 글자 `''`는 글자 노드 하나로 남는다** (`h`는 `''` 문자열도 `#text`로 만든다). 빈 라벨 override는 빈 글자 노드로 그려지고, 이후 SET_TEXT로 다시 채워진다
6. **Batching(결정 9 B)**: 한 동작 안의 setter(삭제 = `doc` + `selectedId` + `history`)는 렌더 한 번. 칸 값은 setter 즉시 바뀌지만 화면은 마이크로태스크 뒤. 단위 테스트는 `await Promise.resolve()` 한 번(또는 `setTimeout 0`)으로 기다린다
7. **setter는 새 값을 넘겨야 다시 그린다 (`Object.is`).** 순수 함수는 바뀐 것이 없으면(없는 id 삭제, 경계 이동, 없는 키 ↻, 같은 값 쓰기) **같은 객체를 그대로** 돌려준다 (`todoOps.ts` 방식). 기록에도 안 남는다
8. **키보드 핸들러가 옛 state를 보지 않게**: `useEffect(() => { … addEventListener; return () => removeEventListener }, [doc, selectedId, history, …핸들러가 읽는 모든 state])`. 의존성이 빠지면 "고른 것을 바꾼 뒤 Delete"가 옛 선택을 지운다. 핸들러가 읽는 값은 전부 deps에 적는다
9. **Hook 개수 고정**: `App`의 `useState`/`useEffect` 호출 개수와 순서는 렌더마다 같아야 한다 (조건 안에서 부르지 않는다)
10. **Instance swap**: 엔진이 컴포넌트를 diff 전에 풀므로 ★ → ♥는 같은 `<span>`의 글자 바뀜(`SET_TEXT`)으로만 보인다 (정상). 그러려면 `StarIcon` · `HeartIcon`이 **태그 · 속성이 완전히 같고 글자(★ / ♥)만 다르게** 그려야 한다 (속성이 다르면 `SET_ATTR`이 섞인다). 테스트에 그대로 적는다
11. **`SET_EVENT` 줄**: 렌더마다 핸들러가 새 함수라 이벤트 교체 줄이 생기는 것은 task_002의 알려진 한계 그대로다. patch 종류를 세는 단위 테스트는 `SET_EVENT`를 빼고 센다
12. **`Button` 안 자식은 모두 key를 가진다 (Q17-1).** 아이콘 `h(icon, { key: 'icon' })`(컴포넌트의 key는 결과 요소로 물려진다, `resolveComponents.ts:51-56`), 글자 `h('span', { key: 'label', … }, label)`. 하나라도 key가 빠지면 엔진이 **조용히** 위치 비교로 돌아가 아이콘 켜기가 `REPLACE` + `INSERT`로 바뀌고 글자 노드가 다시 만들어진다 → 이 규칙은 공통 주의 13의 「캔버스 patch 개수」 단언이 지킨다
13. **patch 단언은 「캔버스 경로」로 한정해 개수까지 적는다.** 속성 패널의 입력칸 · 선택 상자 · 체크박스는 VNode의 `value` / `checked`가 바뀔 때마다 **`SET_PROP` 줄을 함께 만든다** (`diff.ts:109`, `:211-218` — DOM 대입을 건너뛰는 것은 patch 단계뿐, `patch.ts:105-110`). 또 레이어 행 이름이 글자를 따라가므로(④-3) 메인 라벨 입력에는 레이어의 `SET_TEXT`도 섞인다. 그래서 `app.test.ts`는 다음 도우미로만 센다 — `canvasCounts(patches)`: `patch.path`(`MOVE`는 `patch.parent`)가 `[0, 1]`로 시작하는 줄만 모아 `SET_EVENT`를 빼고 `{ [kind]: 개수 }`로 돌려줌 → `expect(canvasCounts(p)).toEqual({ SET_TEXT: 2 })`. 같은 방식의 `layerCounts`(접두 `[0, 0]`)도 둔다. 속성 패널(`[0, 2]`) 줄은 센 값을 단언하지 않는다 (고르기 · 삭제의 `REPLACE`만 D-05로 따로 확인). 접두가 맞는지 `root.firstElementChild.children[1]`의 `data-testid`가 `canvas`인지 한 줄 단언으로 같이 지킨다
14. **`UNDO_LIMIT`은 `@mini-react/shared`의 `HISTORY_LIMIT`과 뜻이 같되 따로 둔 상수다** (`HISTORY_LIMIT`은 `history.test.ts:145`처럼 「0번 초기 기록 포함 50」). 이 앱의 Undo는 `past`에 「지금 모습을 뺀 이전 모습」을 쌓으므로 `past` 최대 = `UNDO_LIMIT - 1` = 49. 헷갈리지 않게 `UNDO_LIMIT = 50` 옆에 뜻 주석을 달고, `HISTORY_LIMIT`을 import하지 않는다

## Dev 항목

- [x] **Dev-1** (`mini-figma`): 모델 순수 함수 ① — 시작 데이터 · override 합치기 · 칸 바꾸기 · ↻ [MF-10 · MF-11 · MF-12 · MF-13 · MF-16]
  - 의존: 없음
  - 대상 파일: `fixtures/mini-figma/model.ts` — 타입(`MainProps` · `Instance` · `Doc = { main, instances }` · `Field = 'label' | 'size' | 'hasIcon' | 'icon' | 'color'`), `INITIAL_DOC`(MF-16 그대로: main `{ label: '버튼', size: 'M', hasIcon: false, icon: 'star', color: 'blue' }`, b1 `{}` · b2 `{ label: '취소' }` · b3 `{ label: '삭제', color: 'red' }`), `mergeProps(main, instance)` (= `{ ...main, ...instance }`, 키가 있으면 override), `isOverridden(instance, field)`(`Object.hasOwn`), `setMainField(doc, field, value)`, `setInstanceField(doc, id, field, value)`, `resetInstanceField(doc, id, field)`(키 지우기, `undefined`를 넣지 않음)
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/model.test.ts`
    - 시작 데이터가 MF-16과 같다. 인스턴스 b1은 키가 `id`뿐
    - `mergeProps`: 키 없는 칸은 메인 값, 키 있는 칸은 인스턴스 값, **`''`도 override**(빈 글자가 메인으로 돌아가지 않음), **메인과 같은 값도 override**(메인을 바꿔도 인스턴스 값 그대로), 메인을 바꾸면 override 없는 칸만 따라 바뀜
    - `setInstanceField`: 키 없던 칸에 쓰면 키가 생김(값이 메인과 같아도). 이미 override인 칸에 같은 값이면 **같은 Doc 객체**(기록 안 남음). 다른 인스턴스 · 메인은 같은 객체(참조 유지)
    - `setMainField`: 같은 값이면 같은 Doc, 다르면 새 Doc이고 `instances` 배열은 같은 참조
    - `resetInstanceField`: 키가 사라짐(`'label' in it === false`, `Object.keys`에 `undefined` 값이 없음), 되돌린 뒤 `mergeProps`가 메인 값을 따름, **이후 메인을 바꾸면 다시 따라감**. 키가 없는 칸 · 없는 id면 같은 Doc
    - 아이콘 칸(`hasIcon` · `icon`)도 같은 규칙: `setInstanceField(doc, 'b2', 'hasIcon', true)` + `'icon' = 'heart'`로 키 생김, 메인 `hasIcon` · `icon`을 바꿔도 b2 값 그대로, `resetInstanceField`로 각각 키 지우면 다시 메인을 따름
    - 입력 객체를 `Object.freeze`한 채로 불러도 안 바뀜(불변)
  - 알고리즘: 「override 판단」(키가 있으면 override · 되돌리기 = 키 지우기)
  - 완료 근거로 남길 것: 테스트 파일 · 건수, `npx vitest run fixtures/mini-figma` 통과 수, `npx tsc --noEmit`, 커밋 해시
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/model.ts`의 `INITIAL_DOC` · `mergeProps` · `isOverridden` · `setMainField` · `setInstanceField` · `resetInstanceField`(키 지우기, `undefined` 안 넣음). 테스트 `fixtures/mini-figma/__tests__/model.test.ts`를 먼저 써서 실패 확인(`Failed to resolve import "../model"`) → 구현 → 36건 통과(`npx vitest run fixtures/mini-figma` 36 passed, Dev-2 합치기 전 시점), `npx tsc --noEmit` 오류 0건, 커밋 aa22ea9

- [x] **Dev-2** (`mini-figma`): 모델 순수 함수 ② — 추가 · 삭제 · 순서 · 선택 정리 [MF-22 · MF-23 · MF-25 · MF-26 · MF-32]
  - 의존: Dev-1
  - 대상 파일: `fixtures/mini-figma/model.ts` — `addInstance(doc, nextId)`(override 없는 `{ id: 'b' + nextId }`를 **배열 끝**에. 번호 `nextId`는 `Doc` 밖, `App`이 세어 넘김 — Q17-3), `removeInstance(doc, id)`(`filter`로 새 배열), `moveInstance(doc, id, delta: -1 | 1)`, `reconcileSelection(selectedId, doc)`(`'main'`은 항상 유효, 인스턴스 id가 `instances`에 없으면 `null`), `instanceName(main, instance)`(레이어 · 패널 머리에 쓸 이름 = `mergeProps`의 `label`, 빈 글자 `''`면 `instance.id` — ④-3)
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/model.test.ts`에 이어서
    - `addInstance`: 끝에 붙음 · override 없음(`Object.keys` = `['id']`) · 기존 인스턴스 객체 같은 참조 · `addInstance(doc, 4)`의 id = `'b4'`
    - **번호 재사용 안 함**: 호출한 쪽이 올리는 `nextId`로 검증 — `removeInstance(doc, 'b3')` 뒤에도 `addInstance(doc, 4)`가 `'b4'`이지 `'b3'`가 아님. `doc`에는 `nextId`가 없음(`Object.keys(doc)` = `['main', 'instances']`)
    - `removeInstance`: 그 id만 빠지고 순서 유지. 없는 id · 메인(`'main'`)은 같은 Doc (메인은 지울 수 없음, MF-24)
    - `moveInstance`: `-1`은 앞과 바꿈, `+1`은 뒤와 바꿈. 항목 객체는 같은 참조(순서만 바뀜). **경계**(맨 위의 -1 · 맨 아래의 +1)와 없는 id는 같은 Doc
    - `reconcileSelection`: `null` → `null`, `'main'` → `'main'`, 있는 id → 그대로, **없는 id → `null`**(삭제 · Undo · Redo로 사라진 경우 모두)
    - `instanceName`: override 글자(`취소`)면 그 글자, 따르면 메인 글자, **`''`이면 `'b1'` 같은 id**, 메인이 `''`이고 따르면 id
  - 알고리즘: 「인스턴스 목록 자료구조」(배열, 삭제 = `filter`), 「선택 · key」(id), 정책 「새 인스턴스 = override 없음」 · 「메인 삭제 = 못 함」
  - 완료 근거로 남길 것: 위와 같음
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/model.ts`에 `addInstance`(번호 `nextId`는 doc 밖) · `removeInstance` · `moveInstance` · `reconcileSelection` · `instanceName` 추가. `model.test.ts`에 이어 쓴 뒤 실패 확인(26 failed / 36 passed) → 구현 → `model.test.ts` 62건 통과(Dev-1 36 + Dev-2 26, `npx vitest run fixtures/mini-figma` 62 passed), `npx tsc --noEmit` 오류 0건, 커밋 825cb95

- [x] **Dev-3** (`mini-figma`): Undo 기록 순수 함수 — 묶음 · 50개(= Undo 49번) · Undo · Redo [MF-30 · MF-31 · MF-32]
  - 의존: Dev-1 (`Doc` 타입)
  - 대상 파일: `fixtures/mini-figma/undo.ts` — `UndoState = { past: Doc[], future: Doc[], group: { target: 'main' | id, field: Field } | null }`, `EMPTY_UNDO`, `recordEdit(state, current, next, group | null)`, `undo(state, current)`, `redo(state, current)`. **한도 상수 `UNDO_LIMIT = 50`** — 뜻 주석 필수: 「처음 상태(지금 모습)를 포함한 기록 개수. Phase 1 `HISTORY_LIMIT`과 같은 뜻이라 `past`는 최대 `UNDO_LIMIT - 1` = 49칸 = Undo 49번」. `@mini-react/shared`의 `HISTORY_LIMIT`은 import하지 않고 이 파일에 따로 둔다 (공통 주의 14, 1회차 NON-BLOCKING 9)
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/undo.test.ts`
    - `next === current`(바뀐 것 없음)면 기록 · 묶음 모두 그대로(같은 객체)
    - 수정 하나 = `past`에 한 칸. 같은 `group`(같은 대상 + 같은 칸)이 **연달아 오면 한 단계로 묶임**(`past` 길이 그대로, 되돌릴 곳 = 묶음 시작 직전). 시간 기준 없음(여러 번, 오래 지나도 같은 묶음)
    - 다른 칸 · 다른 대상(메인 ↔ 인스턴스 id, id ↔ 다른 id)이면 새 단계. `group = null`(추가 · 삭제 · 순서 · ↻)은 항상 새 단계이고 이후 같은 칸 수정도 새 단계(묶음이 끝남)
    - `undo`: 직전 Doc으로, 현재 Doc은 `future`로, 묶음 끝남. `past`가 비면 무시(같은 객체). `redo`: 반대, `future`가 비면 무시. Undo → Redo → 원래 Doc
    - **Undo 뒤 새 수정이면 `future`를 버림** (Redo 불가). 묶음이 Undo/Redo 때문에 끝남(Undo 뒤 같은 칸 수정은 새 단계)
    - **한도 (Undo 49번)**: `UNDO_LIMIT`은 50. 서로 다른 단계 **49개**를 쌓으면 `past` 길이 49이고 **처음 Doc이 아직 있음** → `undo`를 49번 하면 처음 Doc과 같고, 50번째는 같은 객체(무시). 단계를 **50개** 쌓으면 `past` 길이 49 그대로이고 **처음 Doc이 빠짐** → `undo` 49번 뒤의 Doc은 첫 번째 수정 직후 모습, 50번째는 무시. 단계 60개를 쌓아도 `past` 길이는 49. 묶음으로 합쳐진 수정은 개수를 늘리지 않음
    - 한도 뒤에도 `redo`가 `undo` 49번만큼 돌아와 마지막 Doc에 닿음
    - 저장된 Doc을 나중에 고치지 않음(불변)
  - 알고리즘: 「Undo 묶음」(같은 대상 + 같은 칸 연달아 = 한 단계, 시간 기준 없음, 기록 50개 = Undo 49번, `main` · `instances`만 기록 — **선택 · `nextId`는 기록에 없음**)
  - 완료 근거로 남길 것: 위와 같음 (49개 / 50개 경계의 실제 `past.length` 값을 출력에 남김)
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/undo.ts`의 `UNDO_LIMIT = 50`(뜻 주석: 처음 상태 포함 기록 개수, `past` 최대 49 — `HISTORY_LIMIT` import 안 함) · `EMPTY_UNDO` · `recordEdit` · `undo` · `redo`. `undo.test.ts`를 먼저 써서 실패 확인(`Failed to resolve import "../undo"`) → 구현 → 24건 통과(`npx vitest run fixtures/mini-figma/__tests__/undo.test.ts` 24 passed). 경계 실제 출력(`--silent=false`): `[한도] 49단계: past.length = 49 / past[0] === 처음 Doc: true`, `[한도] 50단계: past.length = 49 / past[0] === 처음 Doc: false / past[0] === 첫 수정 직후 Doc: true`, 60단계 `past.length` 49 단언 통과. `npx tsc --noEmit` 오류 0건, 커밋 160f56b

- [x] **Dev-4** (`mini-figma`): 키 판정 순수 함수 [MF-33 · MF-34]
  - 의존: 없음
  - 대상 파일: `fixtures/mini-figma/keys.ts` — `keyAction(info) → 'delete' | 'undo' | 'redo' | null`. 입력은 DOM 이벤트가 아니라 평범한 객체 `{ key, ctrlKey, metaKey, shiftKey, altKey, targetTag }` (DOM 없는 모듈, `document` · `window` 안 씀). `App`이 `KeyboardEvent`를 이 모양으로 바꿔 넘긴다
  - 테스트(먼저 실패 확인): `fixtures/mini-figma/__tests__/keys.test.ts`
    - `Delete` · `Backspace`(**수정키 Ctrl · Meta · Alt · Shift 모두 없음**) → `'delete'`
    - `Ctrl+z` · `Meta+z` → `'undo'`, `Ctrl+Shift+z` · `Meta+Shift+z`(`key`가 `'Z'`로 오는 경우 포함) → `'redo'`
    - **입력칸 안**(`targetTag`가 `INPUT` · `SELECT` · `TEXTAREA`, 대소문자 무관) → 위 키가 전부 `null`. `BUTTON` · `DIV` · `BODY` · 없음(`null`)은 처리
    - 정해진 키 밖은 `null`: `Ctrl+y` · `Escape` · 수정키 없는 `z` · `Shift+z` 단독 · `Alt+z` · `Ctrl+Alt+z` · **`Delete`/`Backspace`에 Ctrl · Meta · Alt · Shift 중 하나라도 붙은 것**(`Shift+Delete` · `Ctrl+Backspace` · `Meta+Backspace` · `Alt+Delete` 각각)
    - 표 형태(`it.each`)로 위 케이스 전부
  - 알고리즘: 「키보드 받는 방법」(입력칸 안 키 무시), 정책 「단축키」(Delete · Backspace(수정키 없을 때만, Q17-4) · Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z)
  - 완료 근거로 남길 것: 위와 같음
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/keys.ts`의 `keyAction(info)`(+ `KeyInfo` · `KeyAction` 타입, `document` · `window` 없음). `keys.test.ts`를 먼저 써서 실패 확인 → 구현 → 76건 통과(`it.each` 표: 정해진 키 · 정해진 키 밖 · Delete/Backspace + Ctrl/Meta/Alt/Shift 조합 · 입력칸 INPUT/SELECT/TEXTAREA 대소문자 · BUTTON/DIV/BODY/null). `npx vitest run fixtures/mini-figma` 162 passed(model 62 + undo 24 + keys 76), `npx tsc --noEmit` 오류 0건, 커밋 be98199

- [x] **Dev-5** (`mini-figma`): 앱 뼈대 · Button · Canvas · 시작 화면 · 세 영역 배치 [MF-01 · MF-03 · MF-04 · MF-05 · MF-10 · MF-11 · MF-16 · P2-02 · P2-07 · P2-09 · P2-10 · P2-22]
  - 의존: Dev-1 ~ 3
  - 바깥 루프: `e2e/mini-figma-helpers.ts`(아래 「e2e 도우미」) + `e2e/mini-figma-render.spec.ts`(QA-1 · QA-2)를 먼저 써서 실패 확인
  - 대상 파일: `fixtures/mini-figma/index.html`(영역 상자 `data-testid="app-root"`, `<meta name="viewport">`, `<style>`: desktop 가로 3칸 · `@media (max-width: 720px)` 세로 쌓기, **`.canvas-instances { display: flex; flex-wrap: wrap }`**(Q17-5), 라벨 `overflow-wrap: anywhere` + 버튼 `max-width: 100%`로 긴 글자 처리 — 버튼이 flex 항목이라 `break-word`만으로는 가로 스크롤이 남음, QA-A2), `main.ts`, `App.ts`(상태 칸 4개: `doc`(`{ main, instances }`) · `selectedId`(처음 `null`) · `history`(Undo) · `nextId`(처음 4, Undo가 되돌리지 않음). 편집은 하나의 `applyEdit(next, group)`을 거쳐 `doc`과 `history`를 같이 바꿈. 최상위는 `<div class="app">` 하나, 자식 순서 레이어 · 캔버스 · 속성 패널), `components/Canvas.ts`(메인 버튼 상자 `canvas-main` + 인스턴스 줄 `canvas-instances`, `h(Button, { key: it.id, …mergeProps })`, 문자열 `icon` → `StarIcon` · `HeartIcon` 변환), `components/Button.ts`(자식 모두 key — 공통 주의 12), `components/Icons.ts`, `components/LayerPanel.ts` · `components/PropertyPanel.ts`는 이 Dev에서 **빈 껍데기**(제목 + 안내)만. patch 목록 · 줄 수는 화면에 안 그림 (MF-05)
  - 테스트(먼저 실패 확인):
    - `fixtures/mini-figma/__tests__/rootOnlyHooks.test.ts`: `phase2-app`의 검사기 방식 그대로 — `App.ts`만 Hook을 부름, `components/*.ts`와 `model.ts` · `undo.ts` · `keys.ts`는 Hook · `document` · `window` · 엔진 내부 패키지 import가 없음, 검사기가 일부러 틀린 소스를 잡는지도 확인. **컴포넌트 파일 목록 단언**: `['Button.ts', 'Canvas.ts', 'Icons.ts', 'LayerPanel.ts', 'PropertyPanel.ts']`(정렬 비교, `fixtures/phase2-app/__tests__/rootOnlyHooks.test.ts:62-64` 방식) — 새 파일이 검사에서 빠지지 않게 한다 (1회차 NON-BLOCKING 8)
    - `fixtures/mini-figma/__tests__/app.test.ts`(jsdom, `render(App, root)`): 시작 화면 DOM(메인 버튼 1 + 인스턴스 버튼 3, 글자 `버튼` · `버튼` · `취소` · `삭제`), `Button`에 `main` 값이 들어가고 `b3` 색만 다름, 최상위 자식 순서(레이어 · 캔버스 · 속성 = `root.firstElementChild.children[0..2]`의 `data-testid`). **`app.test.ts` 공통 규칙**: 테스트마다 `unmount()`를 `afterEach`에서 부른다(`document`의 keydown 리스너가 다음 테스트로 새지 않게). `document.addEventListener` spy는 **`render()` 호출 전에** 건다 (1회차 NON-BLOCKING 7). patch 단언 도우미 `canvasCounts` · `layerCounts`를 이 파일에 둔다 (공통 주의 13)
  - 알고리즘: 「컴포넌트 나누기」(App → LayerPanel · Canvas(→ Button × N) · PropertyPanel, 자식은 props + 콜백 props만), 「선택 · key」(key = 인스턴스 id), 결정 8 B · 9 B, 공통 주의 1 · 2 · 9 · 12 · 13
  - 완료 근거로 남길 것: e2e 구현 전 실패 로그(desktop), 구현 뒤 `npx playwright test e2e/mini-figma-render.spec.ts` 통과(desktop · mobile), `npx vitest run fixtures/mini-figma`, `git diff --stat f224bdd -- packages/` 비어 있음, 커밋 해시
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/index.html`(영역 상자 `app-root` · viewport · `<style>`: desktop 가로 3칸 / `@media (max-width: 720px)` 세로 쌓기 · `.canvas-instances { display:flex; flex-wrap:wrap }` · 라벨 `overflow-wrap:anywhere` + 버튼 `max-width:100%`), `main.ts`, `App.ts`(상태 4칸 `doc` · `selectedId`(null) · `history` · `nextId`(4), `applyEdit(next, group)`), `components/Button.ts`(자식 모두 key `icon` · `label`) · `Canvas.ts`(`canvas-main` + `canvas-instances`, 문자열 `icon` → `StarIcon` · `HeartIcon`) · `Icons.ts` · `LayerPanel.ts` · `PropertyPanel.ts`. **편차 1건**: `LayerPanel`은 "빈 껍데기"가 아니라 메인 행 + `b1~b3` 행(이름만, 누르기 없음)을 그린다 — QA-1(Dev-5 통과 기준)이 레이어 행을 요구해서. 고르기 · ↑↓ · 추가는 Dev-6 · 9 · 10
  - 바깥 루프: `e2e/mini-figma-helpers.ts` + `e2e/mini-figma-render.spec.ts`(QA-1 · QA-2)를 먼저 써서 실패 확인(`npx playwright test e2e/mini-figma-render.spec.ts --project=desktop` 2 failed, `waiting for getByTestId('layer-panel')` 타임아웃) → 구현 뒤 `npx playwright test e2e/mini-figma-render.spec.ts` 4 passed(desktop · mobile)
  - 안쪽 루프: `__tests__/rootOnlyHooks.test.ts`(phase2 검사기 `stripComments` · `stripNoise` 그대로, 컴포넌트 파일 목록 5개 정렬 단언, 검사기 자체 확인) · `__tests__/app.test.ts`(시작 화면 · 자식 순서 `layer-panel · canvas · property-panel` · `children[1]` = `canvas` 한 줄 단언 · `canvasCounts`/`layerCounts` 도우미와 도우미 자체 테스트 · `afterEach unmount()`)를 먼저 써서 실패 확인(`Failed to resolve import "../App"`) → 구현 → `npx vitest run fixtures/mini-figma` 5 files 187 passed, `npx tsc --noEmit` 오류 0건, `git diff --stat 10dfa4e -- packages/` 비어 있음, 커밋 b9d38a9

- [x] **Dev-6** (`mini-figma`): 고르기 — 캔버스 · 레이어 창 · 속성 패널 머리 [MF-20 · MF-26(고른 채 유지의 기초) · D-05]
  - 의존: Dev-5
  - 바깥 루프: `e2e/mini-figma-select.spec.ts`(QA-3 · QA-4)
  - 대상 파일: `LayerPanel.ts`(메인 행 + 인스턴스 행, 행 누르면 고름, 인스턴스 행 이름 = `instanceName`), `Canvas.ts`/`Button.ts`(누르면 고름 + 고른 것 표시 `selected`), `PropertyPanel.ts`(머리 **`<h2 data-testid="property-title">`** 「메인 Button」 / 「인스턴스 · 이름」, 아무것도 안 골랐으면 빈 상태 **`<p data-testid="property-empty">`** — 같은 자리 · 다른 태그라야 D-05 `REPLACE`가 나온다), `App.ts`(`selectedId` setter를 콜백 props로 내려줌). 고르기는 **Undo 기록에 넣지 않음** (`applyEdit` 안 거침)
  - 테스트(먼저 실패 확인): e2e QA-3 · QA-4, `app.test.ts`: 「고르기는 `history`를 늘리지 않음」(고른 뒤 Undo가 아무것도 안 함은 Dev-11에서), **patch 기대 표** 중 「고르기」 줄 — 처음 → `b2` = 캔버스 `{ SET_ATTR: 1 }` · 레이어 `{ SET_ATTR: 1 }`, 속성 패널 경로에 `REPLACE` 1줄 이상(빈 `<p>` → 머리 `<h2>`), `b2` → `b3` = 캔버스 · 레이어 모두 `{ SET_ATTR: 2 }`
  - 알고리즘: 「화면 배치 (A) 선택해서 고치기」, 「선택 · key」(id)
  - 완료 근거로 남길 것: e2e 실패 로그 · 통과(desktop · mobile), vitest, 커밋 해시
  - **완료 근거 (Evidence)**: `LayerPanel.ts`(행 `onClick` → 고르기, 선택 행 클래스 `selected`, 메인 행 `data-id="main"`), `Canvas.ts` · `Button.ts`(`selected` 클래스 + `onClick`), `PropertyPanel.ts`(머리 `<h2 data-testid="property-title">` 「메인 Button」/「인스턴스 · 이름」, 빈 상태 `<p data-testid="property-empty">` — 같은 0번 자리 · 다른 태그), `App.ts`(`onSelect = id => setSelectedId(id)`, `applyEdit` 안 거침). 바깥 루프: `e2e/mini-figma-select.spec.ts`(QA-3 · QA-4)를 먼저 써서 실패 확인(`npx playwright test e2e/mini-figma-select.spec.ts --project=desktop` 2 failed, `waiting for getByTestId('property-title')`) → 구현 뒤 `npx playwright test e2e/mini-figma-render.spec.ts e2e/mini-figma-select.spec.ts` 8 passed(desktop · mobile)
  - 안쪽 루프: `app.test.ts` 「고르기」 6건을 먼저 써서 실패 확인(5 failed) → 구현 → `npx vitest run fixtures/mini-figma` 5 files 193 passed. 실제 값: P-1 캔버스 `{ SET_ATTR: 1 }` · 레이어 `{ SET_ATTR: 1 }` · 속성 패널 `REPLACE` ≥ 1(빈 `<p>` 노드가 DOM에서 분리됨), P-2 캔버스 `{ SET_ATTR: 2 }` · 레이어 `{ SET_ATTR: 2 }`. 고른 뒤 `instance.hooks[0]`(doc) `toBe(INITIAL_DOC)` · `hooks[2]`(history) `toBe(EMPTY_UNDO)` = 고르기는 Undo 기록에 안 들어감. `npx tsc --noEmit` 오류 0건, 커밋 eff4780

- [x] **Dev-7** (`mini-figma`): 메인 속성 편집 5칸 + 아이콘(Boolean · Instance swap) [MF-11 · MF-12 · MF-14 · MF-15 · P2-10 · D-01 · D-02 · D-03 · D-04]
  - 의존: Dev-6 (④-1 · ④-12는 위 「확정 설계 결정」으로 이미 정해짐)
  - 바깥 루프: `e2e/mini-figma-main.spec.ts`(QA-5 ~ QA-9) + 공격 A1(특수문자) · A2(긴 글자)
  - 대상 파일: `PropertyPanel.ts`(메인을 골랐을 때 5칸: 라벨 글자 칸 `onInput`, 크기 S/M/L · 아이콘 보이기 체크박스 · 아이콘 종류 ★/♥ · 색 파랑/빨강/초록은 **모두 `onInput`만** — 공통 주의 4. 입력칸은 `value`/`checked` 프로퍼티로 그림), `Button.ts`(5개 props 반영(긴 글자 CSS: 라벨 `overflow-wrap: anywhere` + 버튼 `max-width: 100%`, QA-A2): 크기 · 색 = 클래스, 라벨 = 글자 `<span key="label">`, 아이콘 = Boolean이면 `h(icon, { key: 'icon' })`가 글자 앞에 생기고 사라짐), `Icons.ts`, `App.ts`(편집 콜백 → `setMainField` → `applyEdit(next, { target: 'main', field })`)
  - 테스트(먼저 실패 확인):
    - e2e QA-5 ~ QA-9, A1 · A2 (바뀐 곳만 고침 = 수정 전후 같은 DOM 노드, 라벨 입력 때 입력칸 같은 노드 · 포커스 유지)
    - `app.test.ts`(jsdom): **엔진 patch 종류를 `render()`가 돌려주는 인스턴스의 `lastPatches`로 확인** — 앱 화면에는 patch를 안 그리므로 이것이 patch 종류의 유일한 근거다. **`qa_todo.md` 「patch 기대 표」의 메인 줄을 `canvasCounts` · `layerCounts`로 그대로 단언**한다 (속성 패널의 `SET_PROP`은 세지 않음 — 공통 주의 13): 메인 라벨 한 글자 = 캔버스 `{ SET_TEXT: 2 }`(메인 · b1) · 레이어 `{ SET_TEXT: 1 }`(b1 행), 크기 `L` = 캔버스 `{ SET_ATTR: 4 }`, 색 초록 = 캔버스 `{ SET_ATTR: 3 }`(b3는 override), 아이콘 켜기 = 캔버스 `{ INSERT: 4 }`(`REPLACE` · `REMOVE` · `SET_TEXT` 0), 끄기 = 캔버스 `{ REMOVE: 4 }`, ★ → ♥ = 캔버스 `{ SET_TEXT: 4 }`(같은 태그라 글자 변경으로만 보임 — 명세 4절). 메인 한 번 편집 = 렌더 한 번(`App` 실행 횟수 +1). 아이콘 켠 뒤 글자 `<span key="label">` DOM 노드가 같은 참조
  - 알고리즘: 「프로퍼티 종류」(4종 + 색), 「override 판단」, 결정 2 B(Key), Q17-1, 공통 주의 4 · 10 · 12 · 13
  - 완료 근거로 남길 것: e2e 실패 로그 · 통과, `canvasCounts` 실제 값 표, vitest, 커밋 해시
  - **완료 근거 (Evidence)**: `PropertyPanel.ts`(`propRows` — 라벨 글자 칸 · 크기 / 아이콘 종류 / 색 선택 상자 · 아이콘 보이기 체크박스 모두 `onInput`만, `value` / `checked` 프로퍼티), `Button.ts`(5개 props → 클래스 `btn-S/M/L` · `btn-blue/red/green`, 아이콘 `h(icon, { key: 'icon' })`가 글자 `<span key="label">` 앞), `index.html`(`.prop-row` CSS), `App.ts`(`onEdit` → `setMainField` → `applyEdit(next, { target: 'main', field })`). 바깥 루프: `e2e/mini-figma-main.spec.ts`(QA-5 ~ QA-9) + `e2e/mini-figma-attack.spec.ts`(QA-A1 · A2)를 먼저 써서 실패 확인(`--project=desktop` 7 failed, `waiting for getByTestId('prop-label')` 등) → 구현 뒤 `npx playwright test e2e/mini-figma-main.spec.ts e2e/mini-figma-attack.spec.ts` 14 passed(desktop · mobile). A2는 CSS(`overflow-wrap` · `max-width`)를 일부러 빼면 mobile에서 실패하는 것도 확인(검출력), 원복함. A2의 `Ctrl+Z` 한 줄은 Dev-11에서 더한다
  - 안쪽 루프: `app.test.ts` 「메인 속성 편집」 11건 먼저 작성(실패: `data-testid="prop-size"가 없다` 등) → 구현 → `npx vitest run fixtures/mini-figma` 5 files 204 passed. `canvasCounts` / `layerCounts` 실제 값(표와 일치): P-3 라벨 한 글자 캔버스 `{ SET_TEXT: 2 }` · 레이어 `{ SET_TEXT: 1 }` / P-4 크기 L 캔버스 `{ SET_ATTR: 4 }` · 레이어 `{}` / P-5 색 초록 캔버스 `{ SET_ATTR: 3 }` / P-6 아이콘 켜기 캔버스 `{ INSERT: 4 }`(각 INSERT 경로 마지막 `0`, 글자 `<span>` 같은 참조) / P-7 끄기 `{ REMOVE: 4 }` / P-8 ★ → ♥ `{ SET_TEXT: 4 }`(아이콘 노드 같은 참조). 메인 한 번 편집 = 렌더 1번(`CountedApp` 실행 횟수 +1), 같은 값(M → M)은 0번, 같은 칸 연달아 = `past` 1칸으로 묶임 · 다른 칸은 2칸. `npx tsc --noEmit` 오류 0건, 커밋 ad3d7b2

- [x] **Dev-8** (`mini-figma`): 인스턴스 속성 편집(5칸 모두) · override 표시 · ↻ [MF-12 · MF-13 · MF-14 · MF-15 · MF-21 · D-01 · D-02 · D-03 · D-04]
  - 의존: Dev-7
  - 바깥 루프: `e2e/mini-figma-instance.spec.ts`(QA-10 ~ QA-13 · **QA-26 · QA-27 · QA-28**) + 공격 A3(빈 라벨 override) · A4(메인과 같은 값 override) · A5(↻ 뒤 메인 변경)
  - 대상 파일: `PropertyPanel.ts`(인스턴스를 골랐을 때 같은 5칸 — **아이콘 보이기(Boolean) · 아이콘 종류(Instance swap)도 인스턴스에서 편집, MF-14**. 칸마다 override면 색 구분(`override` 클래스) + ↻ 버튼, 아니면 「메인 따름」. 선택 상자 · 체크박스는 `onInput`만), `App.ts`(편집 → `setInstanceField` · ↻ → `resetInstanceField` + `applyEdit(next, null)`), 인스턴스가 보여 주는 값은 `mergeProps` 결과
  - 테스트(먼저 실패 확인):
    - e2e QA-10(b1 크기 `S` · 색 `초록` 포함) ~ QA-13 · **QA-26(인스턴스 아이콘 켜기 + ♥ → 그 인스턴스만) · QA-27(메인을 바꿔도 인스턴스 아이콘 override 유지) · QA-28(아이콘 칸 ↻ → 메인을 따름)** · A3 ~ A5
    - `app.test.ts`: 「↻ 뒤 Button props에 `undefined`가 없음 · 메인 변경이 다시 따라감」. **인스턴스 아이콘 patch (1회차 BLOCKING 3, `qa_todo.md` 「patch 기대 표」 해당 줄)**: ① `b2`를 고르고 아이콘 켜기 = **`b2` 버튼 경로 + `[0]`의 `INSERT` 1줄**(캔버스 `{ INSERT: 1 }`, 레이어 `{}`) ② 이어서 종류 ♥ = 캔버스 `{ SET_TEXT: 1 }` ③ `b2`가 아이콘 override를 가진 채 메인 아이콘 켜기 = 캔버스 `{ INSERT: 3 }`(메인 · b1 · b3, **`b2` 경로의 줄 0**), 메인 종류 ♥ → ★ = 캔버스 `{ SET_TEXT: 3 }`(`b2`는 ♥ 그대로) ④ ↻(`b2` `hasIcon`, 메인이 꺼진 상태) = 캔버스 `{ REMOVE: 1 }` ⑤ `b1` 선택 → 크기 `S` = 캔버스 `{ SET_ATTR: 1 }` · 레이어 `{}`(P-22. 클래스는 `b1`만 `btn-S`, 메인 · `b2` · `b3`는 `btn-M`). 인스턴스 편집 한 번 = 렌더 한 번. **준비 동작마다 `await Promise.resolve()`로 렌더를 끝낸 뒤 센 동작을 한다**(`qa_todo.md` 「patch 기대 표」 첫머리)
  - 알고리즘: 「override 판단」(빈 글자 · 같은 값 포함, 되돌리기 = 키 지우기), 「화면 배치 (A)」(패널 하나, override = 색 + ↻), 「프로퍼티 종류」(4종 모두 메인 · 인스턴스에서 편집)
  - 완료 근거로 남길 것: 위와 같음
  - **완료 근거 (Evidence)**: `PropertyPanel.ts`(인스턴스를 골랐을 때 같은 5칸, 값 = `mergeProps(main, 인스턴스)`, override 칸 = 클래스 `override` + `prop-reset` ↻ 버튼, 아닌 칸 = `prop-follow` 「메인 따름」, 판단은 `isOverridden`), `App.ts`(`onEdit`가 고른 대상에 따라 `setMainField` / `setInstanceField` → `applyEdit(next, { target: 선택 id, field })`, `onReset` → `resetInstanceField` + `applyEdit(next, null)`). 바깥 루프: `e2e/mini-figma-instance.spec.ts`(QA-10 ~ QA-13 · QA-26 ~ QA-28) + `e2e/mini-figma-attack.spec.ts`(QA-A3 ~ A5)를 먼저 써서 실패 확인(`--project=desktop` 10 failed) → 구현 뒤 `npx playwright test e2e/mini-figma-instance.spec.ts e2e/mini-figma-attack.spec.ts e2e/mini-figma-main.spec.ts` 34 passed(desktop · mobile). **qa_todo QA-13 불일치 1건**: QA-13 문장은 b3의 「라벨 메인 따름 · 색만 override」인데 MF-16 시작 데이터는 b3 = `{ label: '삭제', color: 'red' }`(QA-1도 b3 글자 `삭제`)라 라벨도 override다. MF-16대로 구현하고 e2e는 b3의 override 칸을 `['label', 'color']`로 단언(QA-13 표의 글귀는 마스터가 고칠 것)
  - 안쪽 루프: `app.test.ts` 「인스턴스 속성 편집」 13건을 먼저 써서 실패 확인 → 구현 → `npx vitest run fixtures/mini-figma` 5 files 217 passed. 실제 값: P-9 b1 라벨 캔버스 `{ SET_TEXT: 1 }` · 레이어 `{ SET_TEXT: 1 }`(렌더 +1) / P-22 b1 크기 S 캔버스 `{ SET_ATTR: 1 }` · 레이어 `{}`(클래스 `M S M M`) / P-10 b2 아이콘 켜기 캔버스 `{ INSERT: 1 }`, 경로 = `[0, 1, 1, 1, 0]`(b2 버튼 `[0, 1, 1, 1]` + `[0]`) / P-11 ♥ `{ SET_TEXT: 1 }` / P-12 b2에 아이콘 override가 있는 채 메인 켜기 `{ INSERT: 3 }`(b2 경로 줄 0) / P-13 메인 ♥ · ★ 각각 `{ SET_TEXT: 3 }`(b2 줄 0, b2는 ♥ 그대로) / P-14 ① hasIcon ↻ `{ REMOVE: 1 }` ② icon ↻ 렌더 1번이지만 캔버스 줄 `{}` ③ 메인 켜기 `{ INSERT: 4 }`(전부 ★) / P-21 라벨 ↻ 캔버스 `{ SET_TEXT: 1 }` · 레이어 `{ SET_TEXT: 1 }`. ↻ 뒤 `b3` = `{ id: 'b3' }`(`Object.keys` = `['id']`, `undefined` 값 없음) · 메인 변경을 다시 따라감, 빈 라벨 override는 메인으로 안 돌아가고 레이어 이름은 id, ↻는 `group = null`(새 단계). `npx tsc --noEmit` 오류 0건, 커밋 8b45c32

- [ ] **Dev-9** (`mini-figma`): 인스턴스 추가 · 삭제 · 메인 삭제 불가 [MF-22 · MF-23 · MF-24 · MF-26 · D-03 · D-04 · D-05]
  - 의존: Dev-8
  - 바깥 루프: `e2e/mini-figma-layers.spec.ts`(QA-14 · QA-15 · QA-16) + 공격 A6 앞부분(고른 것 삭제)
  - 대상 파일: `LayerPanel.ts`([+ 인스턴스] 버튼), `PropertyPanel.ts`(인스턴스를 골랐을 때만 [삭제], 메인에는 없음), `App.ts`(추가 = `addInstance(doc, nextId)` + `setNextId(nextId + 1)` + `applyEdit(next, null)`, 삭제 = `removeInstance` + `setSelectedId(null)` + 기록, 한 동작 = setter 여럿 → 렌더 한 번)
  - 테스트(먼저 실패 확인): e2e QA-14 ~ QA-16, `app.test.ts`: [+ 인스턴스] 한 번 = 캔버스 `{ INSERT: 1 }` · 레이어 `{ INSERT: 1 }`, 삭제(`b2` 선택) 한 번 = 캔버스 `{ REMOVE: 1 }` · 레이어 `{ REMOVE: 1 }` + 속성 패널 `REPLACE` 1줄 이상(머리 `<h2>` → 빈 `<p>`, D-05), **삭제 동작의 렌더 횟수 +1**(wrapper로 `App` 실행 횟수 확인), 지운 번호 재사용 안 함(b3 지움 → 추가 → b4), `doc`에 `nextId`가 없음
  - 알고리즘: 「인스턴스 목록 자료구조」, 정책 「고른 것 삭제 = 선택 풀림」 · 「메인 삭제 = 못 함」 · 「새 인스턴스 = override 없음」, 결정 9 B, Q17-3
  - 완료 근거로 남길 것: 위와 같음

- [ ] **Dev-10** (`mini-figma`): 순서 바꾸기 [↑] [↓] [MF-25 · MF-26 · 결정 2 B MOVE]
  - 의존: Dev-9
  - 바깥 루프: `e2e/mini-figma-layers.spec.ts`(QA-17 · QA-18) + 공격 A16(순서 버튼이 고르기를 안 바꿈)
  - 대상 파일: `LayerPanel.ts`(인스턴스 행마다 [↑] [↓], `stopPropagation`. 메인 행에는 없음), `App.ts`(`moveInstance` + `applyEdit(next, null)`)
  - 테스트(먼저 실패 확인): e2e QA-17 · QA-18 · A16 (순서를 바꿔도 캔버스 버튼 · 레이어 행 DOM 노드가 **같은 참조**), `app.test.ts`: 순서 바꾸기 한 번 = 캔버스 `{ MOVE: 1 }` · 레이어 `{ MOVE: 1 }`(`INSERT` · `REMOVE` · `REPLACE` · `SET_TEXT` 0), 경계 [↑] · [↓] = 렌더 0번(같은 Doc)
  - 알고리즘: 결정 2 B(key 표 매칭 + MOVE), 「선택 · key」(id), 공통 주의 1 · 3 · 13
  - 완료 근거로 남길 것: 위와 같음

- [ ] **Dev-11** (`mini-figma`): 키보드 · Undo/Redo 연결 [MF-30 · MF-31 · MF-32 · MF-33 · MF-34]
  - 의존: Dev-3 · 4 · 10
  - 바깥 루프: `e2e/mini-figma-undo.spec.ts`(QA-19 ~ QA-25) + 공격 A6(뒷부분) · A7 · A8 · A9 · A10 · A11 · A15 · A17 · **A18 · A19**
  - 대상 파일: `App.ts`(`useEffect`에서 `document.addEventListener('keydown', onKey)`, cleanup에서 `removeEventListener`, deps = 핸들러가 읽는 state 전부. `onKey`는 `KeyboardEvent` → `keyAction` → `'delete'`(고른 인스턴스 삭제, 메인 · 선택 없음은 무시) · `'undo'` · `'redo'`(`undo.ts` 적용 → `doc` · `history` 갱신 + `reconcileSelection`으로 사라진 선택은 `null`. **`nextId`는 건드리지 않음**). 편집에서 쓰는 `applyEdit`은 Dev-5부터 이미 `history`를 거친다
  - 테스트(먼저 실패 확인):
    - e2e QA-19 ~ QA-25 · A6 ~ A11 · A15 · A17 · A18 · A19
    - `app.test.ts`(jsdom, `render()` **전에** spy를 걸고 `afterEach`에서 `unmount()` — Dev-5 공통 규칙): `document.addEventListener`/`removeEventListener` 호출 횟수를 세어 **상태가 여러 번 바뀐 뒤에도 등록된 keydown 리스너는 1개**(`add` 횟수 − `remove` 횟수 = 1), `unmount()` 뒤 keydown을 보내도 아무 일 없음(cleanup, 남은 리스너 0개), 한 키 입력 = 한 단계(Undo 한 번에 한 묶음만), 삭제 · Undo · Redo 한 동작 = 렌더 한 번, 입력칸에서 keydown(`target`이 `input`)이면 doc · history 변화 없음, Undo/Redo 때 선택이 사라지면 `null`, **`b4` 추가 → Undo → 다시 추가 = `b5`** (`nextId`가 안 되돌아감, Q17-3), Undo = 삭제 취소 시 캔버스 `{ INSERT: 1 }` · 레이어 `{ INSERT: 1 }`, Shift+Delete · Ctrl+Backspace 등 수정키 조합은 아무 일 없음
  - 알고리즘: 「키보드 받는 방법」(`useEffect` + `document` 등록 + cleanup — **2.5단계 「왜 이걸 골랐나」 대상**), 「Undo 묶음」, Q17-2 · 3 · 4, 공통 주의 6 · 8 · 14
  - 완료 근거로 남길 것: e2e 실패 로그 · 통과, `app.test.ts`의 리스너 횟수 출력, vitest, 커밋 해시

- [ ] **Dev-12** (`e2e`): 공격 · 경계 시나리오 마무리 + 회귀 확인 [MF-02 · MF-03 · 전체]
  - 의존: Dev-11
  - 대상 파일: `e2e/mini-figma-attack.spec.ts`(A1 ~ A19 중 앞 Dev에서 못 채운 것 — A12 연타(**mobile에서 `noHorizontalScroll` 포함**, Q17-5) · A13 새로고침 · A14 입력 100자), `e2e/mini-figma-helpers.ts` 정리
  - 테스트: `qa_todo.md` 공격 시나리오 전부가 desktop · mobile에서 통과
  - 알고리즘: 해당 없음
  - 완료 근거로 남길 것: `npx vitest run` 전체 통과 수, `npx tsc --noEmit` 오류 0건, `npx playwright test` 전체(기존 Phase 1 · 2 + mini-figma) 통과 수(desktop · mobile), `git diff --stat f224bdd -- packages/` **비어 있음**(MF-02), 콘솔 error 0건, 커밋 해시

## e2e 도우미 (`e2e/mini-figma-helpers.ts`, Dev-5에서 만들고 이후 Dev가 보탬)

- `URL = '/mini-figma/'`, 영역 상자 `app-root` (phase2와 같은 이름이라 `phase2-helpers.ts`의 `holdNodes` · `sameNode` · `isStillConnected` · `watchApp` · `noHorizontalScroll`을 그대로 다시 내보낸다. `test`는 `phase1-helpers`의 확장 = 콘솔 error · 선언 안 한 dialog가 있으면 실패)
- 읽기: `canvasLabels(page)`(캔버스 버튼 글자들, 위치 순), `layerOrder(page)`(레이어 행 id들), `buttonSel(id)` · `layerSel(id)`(`data-id` 선택자), `titleText(page)`
- 동작: `selectOnCanvas(page, id)` · `selectInLayer(page, id)`, `pressUndo(page)` · `pressRedo(page)`. **포커스 빼기는 「늘 있는 요소」로 한다**: `page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())`(입력칸 · 선택 상자에 있던 포커스를 body로). `property-title`은 선택이 없으면 `property-empty`로 바뀌어 사라지므로 쓰지 않는다 (1회차 BLOCKING 2). 이 `evaluate`는 테스트 코드라 `document`를 써도 된다
- `countKeydownListeners` 설치: `page.addInitScript`로 `document.addEventListener` · `removeEventListener`를 감싸 `type === 'keydown'`인 등록 · 해제를 세는 `window.__keydown = { add, remove }`를 만들고, 읽는 쪽이 `add - remove`로 지금 남은 keydown 리스너 수를 구한다 (A10 ③). `page.goto` **전에** 설치해야 한다
- Playwright 키: Ctrl = `'Control+KeyZ'`, Cmd = `'Meta+KeyZ'`, Redo = `'Control+Shift+KeyZ'`
- 렌더 횟수 · patch 줄 수는 화면에 없으므로 e2e에서 읽지 않는다 (「바뀐 곳만 고침」은 같은 DOM 노드 + `MutationObserver`로, patch 종류 · 개수는 `app.test.ts`의 `lastPatches`로)

<!-- 완료 예시
- [x] **Dev-1** (`mini-figma`): 모델 순수 함수 ① [MF-10 · MF-11 · MF-12 · MF-13 · MF-16]
  - **완료 근거 (Evidence)**: `fixtures/mini-figma/model.ts`의 `mergeProps` · `setInstanceField` · `resetInstanceField`,
    `fixtures/mini-figma/__tests__/model.test.ts` N건 통과
    (`npx vitest run fixtures/mini-figma` N passed), 커밋 abc1234
-->
