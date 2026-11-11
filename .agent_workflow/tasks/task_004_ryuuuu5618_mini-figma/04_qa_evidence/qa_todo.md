# qa_todo: mini-figma

- 명세: `../01_request_spec.md` · Dev 목록: `../03_development/dev_todo.md` (확정 설계 결정 표 = Q17 · 작업자 추천 수용)
- 실행: `npx playwright test e2e/mini-figma-<이름>.spec.ts` (desktop 1280x800 · mobile 375x812 두 프로젝트, 모든 시나리오가 두 프로젝트에서 돈다). 기존 Phase 1 · 2 e2e는 회귀로 그대로 통과해야 한다
- 시나리오 하나 = `e2e/*.spec.ts` 테스트 하나. 테스트 이름은 시나리오 문장 그대로
- 근거 ID: 이 task의 `MF-xx`(명세 번호) · PRD ID(`P2-xx` · `T-xx`) · Diff 기본 케이스 `D-01 ~ 05`(앱 화면에서 본 대응. 엔진 자체의 D-01 ~ 05는 Phase 1 단위 테스트가 이미 덮고, 이번 task는 엔진을 안 바꾸므로 회귀로 확인). History 동기화(Phase 1 두 영역) 시나리오는 이 task에 해당 없음
- **공통 확인 (모든 스펙 · 모든 테스트)**: 콘솔 `error`가 한 건이라도 있으면 실패, 선언 안 한 dialog(앱에는 alert가 없음)가 뜨면 실패 (`phase1-helpers.ts`의 `test` 확장 재사용)
- **노드 참조**: `holdNodes` · `sameNode`로 페이지 안 JS 변수에 붙잡아 두었다가 `===` 비교 (영역 상자 `app-root`). 「바뀐 곳만 고침」 = 수정 전후 같은 DOM 노드 (MF-25 순서 바꾸기 포함)
- **DOM 변경 관찰**: `watchApp(page, 'canvas')`처럼 칸마다 `MutationObserver`를 심어 변경 종류 · 개수를 센다 (본문 변경이 없어야 하는 시나리오에 사용). 속성 패널의 `value` / `checked` 대입은 DOM 변경이 아니라서 캔버스 관찰에는 안 잡힌다
- **화면에 patch · 렌더 횟수가 없으므로**(MF-05) e2e는 patch 종류를 직접 읽지 않는다. patch 종류 · 개수와 렌더 1번은 `fixtures/mini-figma/__tests__/app.test.ts`가 아래 「patch 기대 표」로 확인한다
- 입력 · 클릭은 사용자처럼: `fill` · `pressSequentially` · `click` · `selectOption` · `check`. 키는 `page.keyboard.press`. **Undo · Redo를 확인하기 전에는 `pressUndo` · `pressRedo` 도우미가 포커스를 입력칸 밖으로 뺀다 — 늘 있는 요소를 쓰는 `document.activeElement?.blur()`** (선택이 없을 때 사라지는 `property-title`을 누르지 않는다, 1회차 BLOCKING 2)
- 시작 화면은 `selectedId = null`(아무것도 안 고름). 레이어 행 이름 · 패널 머리 이름은 인스턴스의 지금 글자(글자가 `''`면 id). 아이콘 자리 · Undo 49번 · 수정키 · 줄바꿈 · Undo 버튼 없음은 확정 (dev_todo 「확정 설계 결정」)

## 화면 약속 (`data-testid` · 표시 상태, Dev-5 ~ 10에서 지킴)

| 영역 | testid | 설명 |
| --- | --- | --- |
| 영역 상자 | `app-root` | `index.html`의 보이지 않는 감싸개. 그 안 최상위는 `<div class="app">` 하나 |
| 세 영역 | `layer-panel` · `canvas` · `property-panel` | 레이어 창 · 캔버스 · 속성 패널. `div.app`의 자식 순서 0 · 1 · 2 고정 (경로 접두 `[0,0]` · `[0,1]` · `[0,2]`) |
| 레이어 | `layer-main` · `layer-item`(`data-id`) · `layer-up` · `layer-down` · `add-instance` | 메인 행(이름 고정 「메인 Button」) · 인스턴스 행(이름 = 지금 글자, 빈 글자면 id) · 그 행의 [↑] [↓] · [+ 인스턴스] |
| 캔버스 | `canvas-main` · `canvas-instances` · `figma-button`(`data-id` = `main` 또는 `b1` …) · `btn-label` · `btn-icon` | 메인 버튼 상자 · 인스턴스 줄(`flex-wrap`) · 버튼 하나(`<button>`) · 글자 `<span>`(key `label`) · 아이콘 `<span>`(key `icon`, 아이콘 보이기가 켜졌을 때만 있고 **글자 앞**) |
| 속성 패널 | `property-title` · `property-empty` · `prop-row`(`data-field` = `label` · `size` · `hasIcon` · `icon` · `color`) | 머리 **`<h2>`** 「메인 Button」/「인스턴스 · 이름」 · 빈 상태 **`<p>`**(같은 자리 · 다른 태그 → D-05 `REPLACE`) · 칸 하나 |
| 칸 안 | `prop-label`(글자 칸) · `prop-size` · `prop-hasicon` · `prop-icon` · `prop-color`(선택 상자 · 체크박스) · `prop-follow`(「메인 따름」 글자) · `prop-reset`(↻) · `delete-instance` | 인스턴스를 골랐을 때만 `delete-instance`, override인 칸에만 `prop-reset`, 아닌 칸에는 `prop-follow`. 선택 상자 · 체크박스는 `onInput`으로만 받음 |
| 상태 표시 | 고른 것: 캔버스 버튼 · 레이어 행에 클래스 `selected`. override 칸: `prop-row`에 클래스 `override`. 크기 · 색: 버튼 클래스에 `btn-S/M/L` · `btn-blue/red/green` | 테스트는 `toHaveClass(/selected/)` · 클래스 글자 포함으로 확인 |

## 인수 시나리오

| QA | 근거 ID | Given | When | Then | 스펙 파일 |
| --- | --- | --- | --- | --- | --- |
| QA-1 | MF-01 · 04 · 05 · 10 · 11 · 16 · P2-02 · P2-22 · T-14 | `/mini-figma/`를 처음 연다 | 로드 직후 | 레이어 창에 메인 행 + `b1` `b2` `b3` 행, 캔버스에 메인 버튼 1개 + 인스턴스 버튼 3개(글자 `버튼` · `버튼` · `취소` · `삭제`, 모두 크기 `M`, 색 파랑 · 파랑 · 파랑 · **`b3`만 빨강**, 아이콘 없음). 속성 패널은 빈 상태(`property-empty` `<p>`). **화면에 patch · 줄 수 · 렌더 횟수를 알리는 요소가 없다**(`log-` testid · "patch" 글자 없음). 콘솔 오류 0 | `e2e/mini-figma-render.spec.ts` |
| QA-2 | MF-03 | 화면 크기가 desktop(1280) 또는 mobile(375)인 상태로 연다 | 로드 직후, 레이어 · 캔버스 · 속성 패널의 위치를 잰다 | desktop = 세 영역이 **가로로 나란히**(왼쪽 레이어, 가운데 캔버스, 오른쪽 속성, 위 y가 같은 줄). mobile = **위아래로 쌓임**(레이어 → 캔버스 → 속성 순). 두 경우 모두 가로 스크롤 없음 | `e2e/mini-figma-render.spec.ts` |
| QA-3 | MF-20 · D-05 · T-14 | 처음 상태, 캔버스 버튼 `b1`~`b3` · 빈 상태 안내(`property-empty`)를 붙잡아 둠 | 캔버스의 `b2` 버튼을 누른다 | 속성 패널 머리가 「인스턴스 · 취소」(`<h2>`), `b2`의 캔버스 버튼 · 레이어 행에만 `selected`. 빈 안내 `<p>` 노드는 **분리됨**(D-05 교체: 같은 자리 · 태그가 `<p>` → `<h2>`로 달라 `REPLACE`), 캔버스 버튼 노드는 모두 같은 참조(`b2`에 클래스만 붙음). 다른 `b3`를 누르면 `b2`의 표시는 사라지고 `b3`에 붙음 | `e2e/mini-figma-select.spec.ts` |
| QA-4 | MF-20 | 처음 상태 | 레이어 창의 `b3` 행을 누른다. 이어서 레이어의 메인 행을 누른다. 이어서 캔버스의 메인 버튼을 누른다 | 머리가 「인스턴스 · 삭제」 → 「메인 Button」 → 「메인 Button」(그대로). 고른 표시가 캔버스 · 레이어에서 같은 대상에 붙음 (레이어에서 고르면 캔버스에, 캔버스에서 고르면 레이어에) | `e2e/mini-figma-select.spec.ts` |
| QA-5 | MF-14 · 15 · 12 · P2-10 · T-14 · T-16 · D-01 | 메인을 고른 상태(라벨 칸 `버튼`), 모든 캔버스 버튼 · 라벨 칸 · 글자 노드를 붙잡아 둠, 캔버스에 `MutationObserver` | 라벨 칸 끝에 `!` `?`를 한 글자씩 입력한다 (`pressSequentially`) | 한 글자마다 바로: 메인 버튼 · `b1`(override 없음)의 글자가 `버튼!` → `버튼!?`로. **`b2`(`취소`) · `b3`(`삭제`)는 그대로**(override). 버튼 노드 · 라벨 칸은 같은 참조, **입력칸이 포커스를 유지**하고 커서가 끝에 있음. 캔버스 DOM 변경은 글자 변경(characterData)뿐이고 childList · attributes 0건 | `e2e/mini-figma-main.spec.ts` |
| QA-6 | MF-14 · D-02 | 메인을 고른 상태, 캔버스 버튼 4개 노드를 붙잡아 둠 | 크기 선택을 `L`로 바꾼다 | 크기 override가 없는 버튼 **4개 모두**(메인 · `b1` `b2` `b3`) 클래스가 `btn-L`로, 노드는 같은 참조. 선택 상자 값 `L`. 다시 `S`로 → `btn-S` | `e2e/mini-figma-main.spec.ts` |
| QA-7 | MF-12 · 14 · D-02 (Q3-1) | 처음 상태: `b3`만 색이 빨강(override) | 메인을 고르고 색을 `초록`으로 바꾼다 | 메인 · `b1` · `b2`는 초록(`btn-green`), **`b3`는 빨강 그대로**(`btn-red`, "이미 컬러를 추가했기 때문에 메인이 바꿔도 영향 없음"). 버튼 노드 같은 참조 | `e2e/mini-figma-main.spec.ts` |
| QA-8 | MF-14 · D-03 · D-04 · Q17-1 | 메인을 고른 상태(아이콘 보이기 꺼짐), 캔버스 버튼 4개 · 각 글자 `<span>` 노드를 붙잡아 둠 | 아이콘 보이기 체크박스를 켠다. 이어서 끈다 | 켜면 4개 버튼 모두에 아이콘 `★`(`btn-icon`)이 **글자 앞**에 생기고(노드 **추가**, 개수 4, `btn-icon`의 다음 형제가 `btn-label`), **글자 `<span>` 노드는 4개 모두 같은 참조**(버튼 안 자식이 모두 key라서 위치가 밀려도 글자를 다시 만들지 않음). 끄면 아이콘 노드 **제거**(`btn-icon` 0개)되고 글자 노드는 계속 같은 참조. 캔버스 DOM 변경은 각각 childList 4건(추가 4 · 제거 4)뿐, characterData · attributes 0 | `e2e/mini-figma-main.spec.ts` |
| QA-9 | MF-14 · D-01 (명세 4절 Instance swap) | 메인을 고른 상태에서 아이콘 보이기를 켜 둠, `b1`의 아이콘 `<span>` 노드를 붙잡아 둠 | 아이콘 종류를 `♥`로 바꾼다 | 4개 버튼의 아이콘 글자가 `♥`. **아이콘 `<span>` 노드는 같은 참조**(다시 만들지 않고 같은 태그라 글자만 바뀜 — 엔진이 컴포넌트를 diff 전에 풀기 때문, 정상 동작). 캔버스 DOM 변경은 글자 변경뿐(childList 0) | `e2e/mini-figma-main.spec.ts` |
| QA-10 | MF-12 · 14 · 21 · P2-10 · T-14 · D-01 | `b1`을 고른 상태(칸 5개 모두 「메인 따름」), 메인 · `b1` · `b2` · `b3` 버튼 노드를 붙잡아 둠 | 라벨 칸을 `확인`으로 바꾼다 (`fill`) | **`b1`만** `확인`, 메인 `버튼` · `b2` `취소` · `b3` `삭제` 그대로(그 버튼의 characterData 변경 없음). 라벨 칸은 override 표시(`override` 클래스 + ↻ 버튼이 생김), 나머지 4칸은 계속 「메인 따름」. 레이어의 `b1` 행 이름도 `확인`. 버튼 노드 같은 참조. 이어서 `b1`의 크기를 `S`로 바꾸면 **`b1`만 `btn-S`**(메인 · `b2` · `b3`는 `btn-M` 그대로, 인스턴스 크기 override, P-22), 색 칸까지 같은 방식으로 `b1`만 바뀜(색을 `초록`으로 → `b1`만 `btn-green`) | `e2e/mini-figma-instance.spec.ts` |
| QA-11 | MF-12 (Q3-1 · Q10) | `b1` 라벨을 `확인`으로 바꿔 둠(override) | 메인을 고르고 라벨을 `저장`으로 바꾼다 | 메인 `저장`. **`b1`은 `확인` 그대로**(override는 메인이 바뀌어도 그대로). `b2` `취소` · `b3` `삭제`도 그대로. 다시 `b1`을 고르면 라벨 칸 `확인`에 ↻가 있음 | `e2e/mini-figma-instance.spec.ts` |
| QA-12 | MF-13 | `b1` 라벨 override `확인`, 메인 라벨 `저장` | `b1`의 라벨 ↻를 누른다. 이어서 메인 라벨을 `보관`으로 바꾼다 | ↻ 뒤 `b1` 글자가 **메인 값 `저장`**(글자가 사라지지 않음 = `undefined`를 넣지 않고 키를 지움), 라벨 칸은 다시 「메인 따름」(↻ 사라짐). 이어서 메인을 `보관`으로 바꾸면 `b1`도 `보관`으로 따라감. 버튼 노드 같은 참조 | `e2e/mini-figma-instance.spec.ts` |
| QA-13 | MF-21 | 처음 상태 | `b2`를 고른다. 이어서 `b3`를 고른다. 이어서 `b1`을 고른다 | `b2`: 라벨 칸 override(색 구분 + ↻), 나머지 4칸 「메인 따름」(↻ 없음). `b3`: 라벨(`삭제`) · 색(빨강) 칸이 override + ↻ (MF-16 시작 데이터), 나머지 3칸 「메인 따름」. (마스터 정정: 처음 글귀 「라벨 메인 따름, 색만 override」는 MF-16과 어긋나 고침, 묶음 2 작업자 보고) `b1`: 5칸 모두 「메인 따름」(↻ 0개). 칸마다 값 표시(선택 상자 값)도 맞음 | `e2e/mini-figma-instance.spec.ts` |
| QA-14 | MF-22 · D-03 · T-14 | 처음 상태, 메인을 `확인`/크기 `L`로 바꿔 둠, 기존 버튼 · 레이어 행 노드를 붙잡아 둠, 캔버스 · 레이어에 `MutationObserver` | [+ 인스턴스]를 누른다 | 캔버스 · 레이어 **끝**에 `b4`가 생김. `b4`는 override 없음(글자 `확인`, 크기 `L` 등 전부 메인 따름, 속성 패널을 열면 5칸 「메인 따름」). 기존 노드는 모두 같은 참조, 캔버스 · 레이어 DOM 변경은 각각 childList 1건(추가)뿐. 선택은 안 바뀜(④-10) | `e2e/mini-figma-layers.spec.ts` |
| QA-15 | MF-23 · D-04 · D-05 · T-14 | 처음 상태, `b1` · `b3` 버튼 · 행 노드를 붙잡아 둠 | 캔버스에서 `b2`를 고르고 속성 패널의 [삭제]를 누른다. 이어서 [+ 인스턴스]를 누른다 | `b2`가 캔버스 · 레이어 **둘 다에서** 사라짐(`b1` · `b3` 노드는 같은 참조, DOM 변경은 childList 1건). **선택이 풀리고** 속성 패널은 빈 상태. 이어서 추가하면 새 인스턴스는 `b4`(**지운 `b2`를 다시 쓰지 않음**) | `e2e/mini-figma-layers.spec.ts` |
| QA-16 | MF-24 | 처음 상태 | 메인을 고른다. `[삭제]`가 있는지 본다. `Delete`를 누르고 `Backspace`를 누른다 | **[삭제] 버튼이 없다**(`delete-instance` 0개). 키를 눌러도 메인은 그대로, 인스턴스도 그대로(캔버스 버튼 4개 · 레이어 행 4개), 메인이 계속 골라져 있음, DOM 변경 0건 | `e2e/mini-figma-layers.spec.ts` |
| QA-17 | MF-25 · 결정 2 B · D-03(이동) | 처음 상태, 캔버스 버튼 · 레이어 행 `b1` `b2` `b3` 노드를 붙잡아 둠, 캔버스 · 레이어에 `MutationObserver` | 레이어의 `b1` 행 [↓]를 누른다. 이어서 `b3` 행 [↑]를 누른다 | 순서가 `b2 b1 b3` → `b2 b3 b1`로 **캔버스 · 레이어가 함께** 바뀜. **버튼 · 행 DOM 노드는 전부 같은 참조**(다시 만들지 않고 옮겨짐), 글자 변경(characterData) 0건. 맨 위 행의 [↑] · 맨 아래 행의 [↓]는 눌러도 아무 일 없음(순서 · DOM 변경 0) (④-13) | `e2e/mini-figma-layers.spec.ts` |
| QA-18 | MF-26 · 20 | 캔버스에서 `b2`를 고름, 캔버스 버튼 · 레이어 행 노드를 붙잡아 둠 | 레이어에서 `b1` 행 [↓]로 `b1`과 `b2`의 순서를 바꾼다(`b2 b1 b3`). 이어서 `b3` 행 [↑]를 누른다(`b2 b3 b1`) | 순서가 두 번 바뀌어도 **`b2`가 계속 골라져 있음**(머리 「인스턴스 · 취소」, `selected`가 `b2`의 같은 캔버스 버튼 · 같은 레이어 행 노드에 유지 = id로 고름, 위치로 고르지 않음). `b2`의 속성 패널 라벨 칸 값도 `취소` 그대로 | `e2e/mini-figma-layers.spec.ts` |
| QA-19 | MF-30 · 33 · T-14 | 처음 상태, 메인을 고르고 색을 `빨강`으로 바꿈(한 단계), 포커스는 입력칸 밖 | `Ctrl+Z`를 누른다. 이어서 `Ctrl+Shift+Z`를 누른다 | `Ctrl+Z` → 메인 색 `파랑`으로 돌아가고(메인 · `b1` · `b2` 버튼 클래스 `btn-blue`) 속성 패널의 색 칸도 `파랑`. `Ctrl+Shift+Z` → 다시 `빨강`. 고르기는 그대로(메인) | `e2e/mini-figma-undo.spec.ts` |
| QA-20 | MF-33 (Cmd) | QA-19와 같음 | `Meta+Z`, 이어서 `Meta+Shift+Z`를 누른다 | QA-19와 같은 결과 (맥의 Cmd 키) | `e2e/mini-figma-undo.spec.ts` |
| QA-21 | MF-31 | `b3`를 고르고 라벨 칸에서 `삭제`를 지우고 `지우기`를 한 글자씩 입력해 둠(`fill('')` 뒤 `pressSequentially`), `pressUndo`의 포커스 빼기로 입력칸 밖 | `Ctrl+Z`를 한 번 누른다. 한 번 더 누른다 | 한 번에 **`삭제`로 돌아감**(`삭`·`삭지`… 중간 글자가 아니라 묶음 시작 직전). 한 번 더 누르면 더 되돌릴 것이 없어 아무 일 없음. `Ctrl+Shift+Z` → 다시 `지우기` | `e2e/mini-figma-undo.spec.ts` |
| QA-22 | MF-31 | 처음 상태에서 차례로: `b1` 라벨 `가` → `b1` 크기 `S` → `b1` 라벨 `나` → `b2` 라벨 `다` → [+ 인스턴스] → `b4` [↑] → `b1` 라벨 ↻ → `b4` 삭제 (모두 다른 묶음) | `Ctrl+Z`를 한 번씩 8번 누르며 매번 상태를 본다 (`pressUndo`) | 각 `Ctrl+Z`가 **정확히 한 단계씩**만 되돌림(삭제 → ↻ → 순서 → 추가 → `b2` 라벨 → `b1` 라벨 `나` → 크기 → 라벨 `가`). 다른 칸 · 다른 대상 수정, 추가 · 삭제 · 순서 · ↻가 각각 한 단계이고 묶음을 끝냄. 9번째 `Ctrl+Z`는 아무 일 없음 | `e2e/mini-figma-undo.spec.ts` |
| QA-23 | MF-30 | 메인 색을 `빨강`(단계 1) → 메인 크기 `L`(단계 2)로 바꾼 상태 | `Ctrl+Z`를 두 번 눌러 처음으로 돌아간 뒤, 메인 라벨을 `새`로 바꾸고(새 수정), `Ctrl+Shift+Z`를 누른다 | 새 수정 뒤에는 **다시 하기가 버려짐**: `Ctrl+Shift+Z`가 아무 일도 안 함(색 `파랑` · 크기 `M` 그대로, 라벨 `새`). 이어서 `Ctrl+Z`를 누르면 새 수정(`새`)만 되돌아가 `버튼` | `e2e/mini-figma-undo.spec.ts` |
| QA-24 | MF-30 · 32 | 처음 상태에서 [+ 인스턴스]로 `b4`를 만들고 `b4`를 고름 | `Ctrl+Z`를 누른다. 이어서 `b2` 색을 바꾼 뒤 `b1` · `b3`를 차례로 고르고(고르기만) `Ctrl+Z`를 누른다 | 첫 `Ctrl+Z`: `b4`가 캔버스 · 레이어에서 사라지고 **선택이 풀려** 속성 패널이 빈 상태. 둘째: **고르기는 기록에 없으므로** 색 수정 한 단계만 되돌아감(고른 것이 `b1`로 돌아가지 않고 `b3` 그대로) | `e2e/mini-figma-undo.spec.ts` |
| QA-25 | MF-33 · 23 · 30 | 처음 상태, 포커스는 입력칸 밖(`pressUndo`의 포커스 빼기) | `b2`를 고르고 `Delete`. 이어서 `b3`를 고르고 `Backspace`. 이어서 `Ctrl+Z` | `Delete` → `b2`가 캔버스 · 레이어에서 사라지고 선택이 풀림. `Backspace` → `b3`가 사라지고 선택이 풀림(둘 다 키 한 번 = 한 동작). `Ctrl+Z` → `b3`가 원래 자리(`b1` 뒤)로 돌아옴, 선택은 풀린 채. 남은 `b1` 노드는 계속 같은 참조 | `e2e/mini-figma-undo.spec.ts` |
| QA-26 | MF-14 · 12 · 21 · D-03 · D-04 · D-01 (1회차 BLOCKING 3) | 처음 상태, `b2`를 고름(5칸 중 라벨만 override), 캔버스 버튼 4개 노드 · 각 글자 `<span>`을 붙잡아 둠 | `b2`의 아이콘 보이기를 켠다. 이어서 아이콘 종류를 `♥`로 바꾼다 | 켠 직후 **`b2`에만** 아이콘 `★`이 글자 앞에 생김(메인 · `b1` · `b3` 버튼은 `btn-icon` 0개), `♥`로 바꾸면 **`b2`의 `btn-icon`만 `♥`**. `b2` 패널의 아이콘 보이기 · 아이콘 종류 칸은 override 표시(`override` 클래스 + ↻), 크기 · 색은 「메인 따름」, 라벨(`취소`)은 override 그대로. 모든 버튼 · 글자 `<span>` 노드는 같은 참조, 메인 · `b1` · `b3`의 DOM 변경 0 | `e2e/mini-figma-instance.spec.ts` |
| QA-27 | MF-12 · 14 · D-03 · D-01 (1회차 BLOCKING 3) | QA-26을 마친 상태(`b2`: 아이콘 보이기 켜짐 + `♥` override), `b2`의 아이콘 `<span>` 노드를 붙잡아 둠 | 메인을 고르고 아이콘 보이기를 켠다. 이어서 메인 아이콘 종류를 `♥`로, 다시 `★`로 바꾼다 | 켜면 메인 · `b1` · `b3`에 `★` 아이콘이 생기고(**`b2`는 이미 있던 `♥` 그대로**, 아이콘 노드 같은 참조). 메인을 `♥`로 → 메인 · `b1` · `b3`가 `♥`, 다시 `★`로 → 셋이 `★`로 돌아가는데 **`b2`는 계속 `♥`**(override는 메인이 바뀌어도 그대로). 메인의 아이콘 보이기를 다시 끄면 메인 · `b1` · `b3`의 아이콘만 사라지고 **`b2`의 아이콘은 남음**(`hasIcon` override) | `e2e/mini-figma-instance.spec.ts` |
| QA-28 | MF-13 · 14 (1회차 BLOCKING 3) | QA-27을 마친 상태(메인 아이콘 보이기 꺼짐, 메인 종류 `★`, `b2`는 아이콘 보이기 켜짐 · `♥` override) | `b2`를 고르고 아이콘 보이기의 ↻를 누른다. 이어서 아이콘 종류의 ↻를 누른다. 이어서 메인 아이콘 보이기를 켠다 | 아이콘 보이기 ↻ → `b2`가 메인(꺼짐)을 따라 **`b2`의 아이콘이 사라짐**(`btn-icon` 0개), 그 칸은 「메인 따름」. 아이콘 종류 ↻ → 눈에 보이는 변화 없음(꺼진 상태) 칸만 「메인 따름」. 메인을 켜면 4개 버튼 모두 `★`(`b2`도 이제 메인을 따라 **`★`**, `♥` 아님). `undefined`가 글자 · 클래스에 안 나옴 | `e2e/mini-figma-instance.spec.ts` |

## 공격적 시나리오

공격 시나리오도 하나 = 테스트 하나. 앞 Dev에서 채울 수 있는 것은 그 Dev에서 쓴다 (「Dev」 열).

| QA | 시나리오 | Then | Dev | 스펙 파일 |
| --- | --- | --- | --- | --- |
| QA-A1 | 특수문자 라벨: 메인 라벨 칸에 `<b>굵게</b> &amp; 😀`, 이어서 `<img src=x onerror="window.__pwned=1">`를 입력 | 캔버스 버튼 글자가 **마크업이 아니라 글자 그대로**(`btn-label` textContent), `<b>` · `<img>` 요소가 생기지 않고 `onerror`도 실행 안 됨(`window.__pwned` 없음), 입력칸 값 그대로 | 7 | `e2e/mini-figma-attack.spec.ts` |
| QA-A2 | 아주 긴 글자: 메인 라벨 칸에 공백 없는 200자 문자열 입력 (mobile 포함) | 가로 스크롤 없음(`noHorizontalScroll`), 버튼이 영역 밖으로 삐져나가지 않음(CSS: 라벨 `overflow-wrap: anywhere` + 버튼 `max-width: 100%` — 버튼이 flex 항목이라 `break-word`로는 최소 너비가 안 줄어 넘칠 수 있음), 입력은 한 단계로 묶여 `Ctrl+Z` 한 번에 `버튼`으로 | 7 · 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A3 | 빈 라벨 override: `b1`의 라벨 칸을 `fill('')`로 비움. 이어서 메인 라벨을 `저장`으로 바꿈 | `b1` 버튼 글자가 `''`(**override이므로 메인 값으로 안 돌아감**), 버튼은 글자 없이 배경 색만 있는 채 **화면에 보임**(크기 > 0), 라벨 칸에 ↻가 있음. 레이어의 `b1` 행 이름은 id `b1`로 표시(빈 글자 대신). 메인을 바꿔도 `b1`은 `''` 그대로. ↻를 누르면 `저장`으로 | 8 | `e2e/mini-figma-attack.spec.ts` |
| QA-A4 | 메인과 같은 값 override: `b1` 라벨을 `버튼x`로 바꿨다가 `버튼`으로 되돌려 입력(메인 값과 같아짐). 이어서 메인 라벨을 `저장`으로 바꿈 | 값이 메인과 같아도 **override로 남아** 있음(라벨 칸에 ↻ 계속 보임). 메인이 `저장`이 돼도 `b1`은 `버튼` 그대로 | 8 | `e2e/mini-figma-attack.spec.ts` |
| QA-A5 | ↻ 뒤 메인 변경: `b3`의 색 ↻ → 메인 색을 `초록`으로. 이어서 `b3`의 라벨 ↻ → 메인 라벨을 비움(`''`) | `b3`가 메인을 다시 따라감(색 `btn-green`, 라벨도 메인 값). 클래스 글에 `undefined`가 없고 글자가 `undefined`로 나오지 않음(키를 지웠지 `undefined`를 넣지 않음). 메인을 `''`로 비우면 메인 · `b3`가 같이 빈 글자 | 8 | `e2e/mini-figma-attack.spec.ts` |
| QA-A6 | 고른 것이 Delete · Undo · Redo로 사라짐: `b2`를 고르고 `Delete` → `Ctrl+Z`(`b2` 복귀) → `b2`를 고름 → `Ctrl+Shift+Z`(Redo로 `b2`가 다시 삭제) | `Delete` 뒤 선택 풀림, `Ctrl+Z`로 `b2`가 돌아와도 **선택은 풀린 채**(자동으로 다시 고르지 않음). 다시 `b2`를 고른 뒤 `Ctrl+Shift+Z`로 `b2`가 사라지면 **선택이 다시 풀리고** 속성 패널 빈 상태. 존재하지 않는 id가 골라진 채 남지 않음 | 9 · 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A7 | 메인에서 Delete 연타: 메인을 고르고 `Delete` · `Backspace`를 각각 5번 연달아 누름 | 아무 일 없음(버튼 4 · 레이어 행 4, 메인 계속 골라짐), DOM 변경 0건, 콘솔 오류 0 | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A8 | 입력칸 안의 키는 앱 동작 없음 (먼저 메인 색을 `빨강`으로 바꿔 Undo 한 단계를 만들어 둠): ① `b2`를 고르고 라벨 칸(글자 `취소`)에 포커스, `Backspace` · `Delete` · `Ctrl+Z` · `Meta+Z` ② 크기 선택 상자에 포커스를 두고 `Delete` · `Backspace` · `Ctrl+Z` ③ 체크박스에 포커스를 두고 같은 키 | `Backspace` **직후**에만 칸 글자 `취`(브라우저 기본: 입력칸 글자만 한 글자 지움, 그 결과가 `b2` 라벨로 반영됨)를 단언한다. 그 뒤 `Ctrl+Z` · `Meta+Z`는 **Chromium의 입력칸 글자 되돌리기**라서(`input` 이벤트 → `취소`로 복원 + `b2` 라벨 수정으로 기록되고, `Meta+Z`는 Mac에서만 동작) 칸 글자는 단언하지 않는다. 모든 키 뒤에 확인하는 것은 **앱 Undo가 안 일어남 = 메인 색 `빨강` 그대로**, 인스턴스는 **지워지지 않음**(버튼 · 행 4개 그대로), 선택 `b2` 유지뿐이다. 선택 상자 · 체크박스에서도 같음 | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A9 | Undo 한도 — 50단계를 쌓으면 처음 모습이 빠짐(Undo 49번, Q17-2): [+ 인스턴스]를 **50번** 누름(`b4`~`b53`, 서로 다른 50단계 → 처음 포함 51개 중 처음이 빠짐), 이어서 `Ctrl+Z`를 49번 | 49번째까지 한 단계씩 줄어 **`b1 b2 b3 b4`(첫 추가만 남음)에서 멈추고, 50번째 `Ctrl+Z`는 아무 일 없음**(처음 모습 `b1 b2 b3`로는 못 돌아감). 이어서 `Ctrl+Shift+Z`를 49번 누르면 `b1`~`b53`으로 끝까지 돌아옴 | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A10 | 옛 state를 보는 키 핸들러 · 리스너 정리: ① `b1`을 고르고 `b2`를 고른 뒤 `Delete` ② 메인 색을 `빨강`으로, 이어서 메인 크기 `L`로 바꾼 뒤 `Ctrl+Z`(한 번) ③ `page.addInitScript`로 `document`의 `keydown` 등록 · 해제를 센 뒤(`window.__keydown`), 상태를 20번 이상 바꾼다(고르기 · 수정 섞어서) | ① 지워지는 것은 **지금 골라진 `b2`**(옛 선택 `b1`이 아님) ② 되돌아가는 것은 **가장 최근 단계(크기)**, 색 `빨강`은 남음 ③ **등록 − 해제 = 로드 직후 값과 같음**(상태가 20번 바뀌어도 keydown 리스너가 1개로 유지 = 쌓이지 않음 — 이것이 직접 증거). 이 뒤 `Ctrl+Z` 한 번 = 한 단계만 되돌아가는지는 **보조 확인**일 뿐이다(리스너가 쌓여도 최신 리스너가 마지막에 돌아 덮어쓰므로 e2e의 되돌리기 결과만으로는 누적을 못 잡는다 — 1회차 NON-BLOCKING 4) | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A11 | 정해진 키 밖 · 수정키 조합: 메인을 고른 상태에서 `Ctrl+Y` · `Escape` · `z`(수정키 없음) · `Alt+Z`를 누르고, `b2`를 고른 상태에서도 같은 키 + **`Shift+Delete` · `Ctrl+Backspace` · `Alt+Backspace` · `Meta+Backspace`**(Q17-4: 수정키가 하나라도 있으면 안 지움)를 누름. 수정 한 단계(메인 색)를 해 둠 | 아무 일 없음(Undo · Redo · 삭제 모두 안 일어남, 인스턴스 · 색 그대로, 선택 유지) — 명세에 없는 키 · 수정키 조합은 구현하지 않음. 이어서 수정키 없는 `Delete`를 누르면 그때 `b2`가 지워짐(대조) | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A12 | 연타: ① [+ 인스턴스]를 20번 연달아 클릭 ② `b1` 행 [↓]를 5번 연달아 ③ `b2`를 고르고 `Delete`를 3번 | ① `b4`~`b23`이 순서대로 생기고 기존 `b1`~`b3` 노드는 같은 참조, 오류 없음, **캔버스 버튼 줄이 줄바꿈되어(`flex-wrap`, Q17-5) `noHorizontalScroll(page)` 통과(mobile 375 포함)이고 버튼 23개 모두의 오른쪽 끝이 캔버스 오른쪽 끝을 넘지 않음** ② 맨 아래에서 멈추고 오류 없음, 노드 같은 참조 ③ `b2`는 한 번만 지워지고 나머지 `Delete`는 무시(다른 인스턴스가 지워지지 않음) | 12 | `e2e/mini-figma-attack.spec.ts` |
| QA-A13 | 새로고침: 메인 · 인스턴스를 고치고 추가 · 삭제 · 순서 변경까지 한 뒤 `page.reload()` | 시작 데이터(MF-16)로 돌아옴(저장 안 함), 콘솔 오류 0, 선택 없음, **Undo 기록도 비어 있어** `Ctrl+Z`를 눌러도 아무 일 없음 | 12 | `e2e/mini-figma-attack.spec.ts` |
| QA-A14 | 입력 100자: 메인 라벨 칸에 100자를 한 글자씩 입력 (`pressSequentially`) | 입력칸 노드가 같은 참조이고 **포커스 · 커서 유지**(끝에 계속 입력됨), 최종 글자가 입력한 100자 그대로, 포커스를 뺀 뒤 `Ctrl+Z` 한 번에 `버튼`으로(한 단계로 묶임) | 12 | `e2e/mini-figma-attack.spec.ts` |
| QA-A15 | 고르기만 바꿔도 묶음은 안 끝남 (명세 글자 그대로, ④-7): `b2` 라벨 `A` 입력 → `b3`를 고르고 다시 `b2`를 고름 → `b2` 라벨 칸에 `B` 추가 입력 → 포커스 빼고 `Ctrl+Z` | 같은 대상 · 같은 칸이 연달아 바뀐 것이므로 **한 번에 둘 다**(`취소`로) 되돌아감 | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A16 | [↑] · [↓] 버튼이 고르기를 안 바꿈 (이벤트 버블링, ④-4): `b2`를 고른 채 `b1` 행의 [↓]를 누름. 이어서 `b3` 행의 [↑]를 누름 | 계속 `b2`가 골라져 있음(머리 「인스턴스 · 취소」), `b1` · `b3`에 `selected`가 붙지 않음, 순서만 바뀜. 레이어 행의 순서 버튼이 행의 "고르기"를 같이 부르지 않음 | 10 | `e2e/mini-figma-attack.spec.ts` |
| QA-A17 | 다른 것이 사라지거나 끼어들어도 고른 것 유지 (id, MF-26): `b1`을 고르고 `Delete` → `b3`를 고름 → `Ctrl+Z`(`b1`이 `b3` 앞에 다시 끼어듦) → `Ctrl+Shift+Z`(`b1`이 다시 삭제) | 두 번 다 **`b3`가 계속 골라져 있음**(머리 「인스턴스 · 삭제」, `selected`가 같은 `b3` 노드에). 인덱스로 고르고 있었다면 앞에 끼어들 때 다른 인스턴스로 옮겨 갔을 것 | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A18 | 추가를 Undo한 뒤 다시 추가하면 번호가 이어짐 (`nextId`는 Undo로 안 되돌아감, Q17-3): [+ 인스턴스]로 `b4` 생성 → `Ctrl+Z`(`b4` 사라짐) → [+ 인스턴스] | 새로 생기는 인스턴스는 **`b5`**(`b4`를 다시 쓰지 않음). `b4`는 캔버스 · 레이어 어디에도 없음. 이어서 `Ctrl+Z`로 `b5`를 지우고 [+ 인스턴스]하면 `b6` | 11 | `e2e/mini-figma-attack.spec.ts` |
| QA-A19 | Undo 한도 경계 — 49단계면 처음 모습까지 돌아옴 (Q17-2): [+ 인스턴스]를 **49번** 누름(`b4`~`b52`), 이어서 `Ctrl+Z`를 49번 | 49번째 `Ctrl+Z`에서 **처음 모습 `b1 b2 b3`로 돌아옴**(처음 포함 50개 = 한도 안), 50번째는 아무 일 없음. `Ctrl+Shift+Z`를 49번 누르면 `b1`~`b52` | 11 | `e2e/mini-figma-attack.spec.ts` |

## patch 기대 표 (`app.test.ts`가 `lastPatches`로 단언 — 1회차 BLOCKING 1)

- 센 방법: `canvasCounts` = `patch.path`(`MOVE`는 `patch.parent`)가 캔버스 접두 `[0, 1]`로 시작하는 줄만 모아 **`SET_EVENT`를 뺀** 종류별 개수. `layerCounts`는 접두 `[0, 0]`. **속성 패널(`[0, 2]`)은 `value` / `checked`가 바뀔 때마다 `SET_PROP` 줄이 함께 생기므로(`diff.ts:109`, `:211-218`) 센 값을 단언하지 않는다** — 고르기 · 삭제의 `REPLACE`(D-05)만 「1줄 이상」으로 따로 본다. 캔버스에는 입력칸이 없어 `SET_PROP`이 나오지 않는다
- 도우미가 맞는 칸을 보는지 `root.firstElementChild.children[1]`의 `data-testid`가 `canvas`인지 한 줄로 확인한다
- 시작 상태(`INITIAL_DOC`, 선택 없음)에서 각 행을 독립된 `it`으로 돌린다. 「Given」에 적은 준비 편집이 있으면 그 뒤의 렌더만 센다. **준비 동작마다 `await Promise.resolve()`로 렌더를 끝낸 뒤 센 동작을 한다** (Batching, 결정 9 B: 준비 동작과 센 동작을 같은 틱에 보내면 렌더가 합쳐져 `lastPatches`에 준비 동작의 줄이 섞인다 — 예: 메인 고르기의 `SET_ATTR`이 P-3에 섞임)

| # | 동작 (Given → When) | 캔버스 | 레이어 | 속성 패널 | 근거 |
| --- | --- | --- | --- | --- | --- |
| P-1 | 처음 → `b2` 고르기 | `{ SET_ATTR: 1 }` (b2 버튼 `selected`) | `{ SET_ATTR: 1 }` | `REPLACE` ≥ 1 (빈 `<p>` → `<h2>`) | MF-20 · D-05 |
| P-2 | `b2` 선택 → `b3` 고르기 | `{ SET_ATTR: 2 }` | `{ SET_ATTR: 2 }` | 세지 않음 | MF-20 |
| P-3 | 메인 선택 → 라벨 `버튼!` (한 글자) | `{ SET_TEXT: 2 }` (메인 · b1. b2 · b3는 override) | `{ SET_TEXT: 1 }` (b1 행 이름. 메인 행은 고정 문구) | 세지 않음 (`SET_PROP` 1 포함) | MF-14 · 15 · D-01 · ④-3 |
| P-4 | 메인 선택 → 크기 `L` | `{ SET_ATTR: 4 }` (class) | `{}` | 세지 않음 | MF-14 · D-02 |
| P-5 | 메인 선택 → 색 초록 | `{ SET_ATTR: 3 }` (메인 · b1 · b2. b3는 빨강 override) | `{}` | 세지 않음 | MF-12 · D-02 |
| P-6 | 메인 선택 → 아이콘 켜기 | `{ INSERT: 4 }` (`REPLACE` · `REMOVE` · `SET_TEXT` 0, 각 INSERT 경로 마지막 = `0`) | `{}` | 세지 않음 | MF-14 · D-03 · Q17-1 |
| P-7 | P-6 뒤 → 아이콘 끄기 | `{ REMOVE: 4 }` | `{}` | 세지 않음 | MF-14 · D-04 |
| P-8 | P-6 뒤 → 종류 `♥` | `{ SET_TEXT: 4 }` (같은 태그라 글자 변경으로만 보임 — 명세 4절) | `{}` | 세지 않음 | MF-14 · D-01 |
| P-9 | `b1` 선택 → 라벨 `확인` | `{ SET_TEXT: 1 }` | `{ SET_TEXT: 1 }` | 세지 않음 | MF-12 · 14 · D-01 |
| P-10 | `b2` 선택 → 아이콘 보이기 켜기 (`hasIcon` override 생김) | `{ INSERT: 1 }` — **경로 = `b2` 버튼 경로 + `[0]`** | `{}` | 세지 않음 | MF-14 · 1회차 BLOCKING 3 |
| P-11 | P-10 뒤 → 아이콘 종류 `♥` | `{ SET_TEXT: 1 }` (`b2` 아이콘 글자) | `{}` | 세지 않음 | MF-14 |
| P-12 | `b2`에 아이콘 override(켜짐 + `♥`)가 있는 채 → 메인 아이콘 켜기 | `{ INSERT: 3 }` (메인 · b1 · b3, **`b2` 경로 줄 0**) | `{}` | 세지 않음 | MF-12 · 14 |
| P-13 | P-12 뒤 → 메인 종류 `♥`, 이어서 `★` | 각각 `{ SET_TEXT: 3 }` (메인 · b1 · b3, **`b2` 줄 0** — `b2`는 `♥` 그대로) | `{}` | 세지 않음 | MF-12 · 14 |
| P-14 | `b2`: 켜짐 + `♥` override, 메인 꺼짐 → ① `b2` `hasIcon` ↻ ② `b2` `icon` ↻ ③ 메인 켜기 | ① `{ REMOVE: 1 }` ② `{}` (렌더는 되지만 캔버스 줄 0) ③ `{ INSERT: 4 }` (`b2`도 `★`) | 모두 `{}` | 세지 않음 | MF-13 · 14 |
| P-15 | 레이어 `b1` 행 [↓] | `{ MOVE: 1 }` (`INSERT` · `REMOVE` · `REPLACE` · `SET_TEXT` 0) | `{ MOVE: 1 }` | 세지 않음 | MF-25 · 결정 2 B |
| P-16 | [+ 인스턴스] | `{ INSERT: 1 }` | `{ INSERT: 1 }` | 세지 않음 | MF-22 · D-03 |
| P-17 | `b2` 선택 → [삭제] | `{ REMOVE: 1 }` | `{ REMOVE: 1 }` | `REPLACE` ≥ 1 (`<h2>` → 빈 `<p>`) | MF-23 · D-04 · D-05 |
| P-18 | P-17 뒤 → Undo | `{ INSERT: 1 }` | `{ INSERT: 1 }` | 세지 않음 | MF-30 · D-03 |
| P-19 | 메인 색 빨강(1단계) → Undo | `{ SET_ATTR: 3 }` | `{}` | 세지 않음 | MF-30 |
| P-20 | 맨 위 [↑] · 맨 아래 [↓] · 같은 값 다시 쓰기 | 렌더 0번 (`App` 실행 횟수 그대로, `lastPatches` 그대로) | 〃 | 〃 | ④-13 · 공통 주의 7 |
| P-21 | `b1` 라벨 override(`확인`) 상태 → ↻ | `{ SET_TEXT: 1 }` (메인 글자로) | `{ SET_TEXT: 1 }` | 세지 않음 | MF-13 |
| P-22 | `b1` 선택 → 크기 `S` | `{ SET_ATTR: 1 }` (b1 버튼 class만. 메인 · b2 · b3는 그대로) | `{}` | 세지 않음 | MF-12 · 14 · D-02 |

## 단위 테스트 (Vitest, `fixtures/mini-figma/__tests__/`) — 인수와 별개로 확인

| 파일 | 검사 내용 | 근거 ID |
| --- | --- | --- |
| `model.test.ts` | 시작 데이터 · override 합치기(빈 글자 · 같은 값 포함 · **아이콘 칸 `hasIcon` · `icon`도 같은 규칙**) · 칸 바꾸기 · ↻ = 키 지우기(`undefined` 없음, 다시 따라감) · 추가(끝, override 없음, `nextId` 밖에서 받음 · `doc`에 `nextId` 없음) · 삭제(없는 id · 메인은 같은 객체) · 순서(경계는 같은 객체) · 선택 정리(없는 id → null) · 이름(지금 글자, 빈 글자면 id) · 입력 불변 | MF-11 · 12 · 13 · 14 · 16 · 22 · 23 · 25 · 32 |
| `undo.test.ts` | 같은 대상 + 같은 칸 연달아 = 한 단계(시간 기준 없음) · 다른 칸 · 다른 대상 · `null` 묶음(추가 · 삭제 · 순서 · ↻)은 새 단계이자 묶음 끝 · Undo/Redo · Undo 뒤 새 수정이면 Redo 버림 · **`UNDO_LIMIT = 50`: 49단계면 `past` 49 · 처음까지 Undo 가능, 50단계면 처음이 빠져 Undo 49번 · 50번째 무시, 60단계여도 `past` 49** · 바뀐 게 없으면 기록 안 남김 | MF-30 · 31 |
| `keys.test.ts` | Delete · Backspace(**수정키 Ctrl · Meta · Alt · Shift 없을 때만**) · Ctrl/Meta+Z · Ctrl/Meta+Shift+Z(`'Z'` 포함) 표 · 입력칸(`INPUT` · `SELECT` · `TEXTAREA`) 안은 전부 무시 · 정해진 키 밖 · `Shift+Delete` · `Ctrl+Backspace` · `Meta+Backspace` · `Alt+Delete` · `Alt+z`는 null | MF-33 · 34 |
| `rootOnlyHooks.test.ts` | `App.ts`만 `useState` · `useEffect` 호출, `components/*.ts` · `model.ts` · `undo.ts` · `keys.ts`는 Hook · `document` · `window` · 엔진 내부 패키지 import 없음, 검사기가 일부러 틀린 소스를 잡음, **컴포넌트 파일 목록 = `Button.ts` · `Canvas.ts` · `Icons.ts` · `LayerPanel.ts` · `PropertyPanel.ts`**(새 파일이 검사 밖으로 새지 않게) | MF-04 · P2-07 · 08 · 09 · T-16 |
| `app.test.ts` (jsdom) | 시작 화면 DOM · 최상위 자식 순서(레이어 · 캔버스 · 속성) · **위 「patch 기대 표」 P-1 ~ P-22를 `canvasCounts` · `layerCounts`로 그대로** (인스턴스 아이콘 켜기 P-10 ~ P-14 포함) · 삭제 · Undo · Redo · 메인 편집 · 인스턴스 편집 한 동작 = 렌더 한 번(`App` 실행 횟수) · **keydown 리스너는 상태가 여러 번 바뀌어도 1개(`add` − `remove` = 1, `document.addEventListener` spy는 `render()` 전에 걸고 테스트마다 `unmount()`로 정리)**, `unmount()` 뒤 keydown 무시 · 입력칸에서 보낸 keydown은 무시 · 수정키 조합 무시 · 고르기는 Undo 기록에 안 들어감 · `b4` 추가 → Undo → 추가 = `b5`(`nextId` 안 되돌림) | MF-04 · 10 · 14 · 31 · 32 · 34 · 명세 4절(Instance swap · SET_EVENT · Batching) |

## 회귀 · 환경

| QA | 확인 | Then |
| --- | --- | --- |
| QA-R1 | `git diff --stat f224bdd -- packages/` | **비어 있음** (엔진 무수정, MF-02) |
| QA-R2 | `npx vitest run` 전체 | 기존 테스트 + 새 단위 테스트 모두 통과 |
| QA-R3 | `npx tsc --noEmit` | 오류 0건 (`fixtures` · `e2e` 포함) |
| QA-R4 | `npx playwright test` 전체 (desktop · mobile) | 기존 Phase 1 · 2 e2e 전부 + `mini-figma-*.spec.ts` 통과 |
| QA-R5 | Phase 1 · Phase 2 검증 페이지 · 성능 대시보드 | 열리고 동작이 그대로 (task_004가 건드리지 않음, MF 제외 범위) |

## 필수 확인 (해당하는 것만)
- [ ] Diff 기본 케이스 D-01 ~ 05의 화면 대응: 글자 변경(QA-5 · 9 · 10) · 속성 변경(QA-6 · 7) · 노드 추가(QA-8 · 14 · 26) · 노드 삭제(QA-8 · 15 · 28) · 노드 교체(QA-3의 빈 안내 `<p>` → 머리 `<h2>`) — 엔진 자체는 Phase 1 회귀로 확인
- [ ] History 동기화(두 영역 DOM 일치): **이 task에 해당 없음** (Phase 1 검증 페이지 전용)
- [ ] desktop · mobile 캡처 (`04_qa_evidence/screenshot_NN_<desktop|mobile>.png`): 시작 화면 · 메인 수정 뒤 · 인스턴스 override 표시 · 순서 바꾼 뒤 · mobile에서 인스턴스 20개 이상일 때 줄바꿈
- [ ] 시연 보조(선택): Chrome DevTools Elements 패널에서 메인 라벨 수정 때 바뀐 노드만 깜빡이는 장면
