# 04 검수자 판정: 기획 2회차 — APPROVE (회차 2/3)

> `mr-reviewer`(Opus) 답을 마스터가 그대로 저장 (요약 없이 항목 유지). 검수 대상: `03_worker_revised.md` · `03_development/dev_todo.md` · `04_qa_evidence/qa_todo.md`

판정: 1회차 BLOCKING 1·2·3은 모두 해소됐고, 새로 찾은 BLOCKING은 없음. 엔진 코드(`diff.ts`·`resolveComponents.ts`·`h.ts`·`FunctionComponent.ts`·`events.ts`)로 P-1 ~ P-21을 직접 계산해 21줄 모두 맞음. Undo 49번 계산과 `nextId` 기대값도 맞음. NON-BLOCKING 4 ~ 10 반영과 11 제거는 제대로 됐고, 명세 밖 기능은 들어오지 않음.

## 확인한 것
**BLOCKING 1 (patch 기대 표)**
- 경로 접두: `update()`는 `diff([previous], [next])` (`FunctionComponent.ts:90`) → `div.app` = `[0]`, 레이어 `[0,0]`, 캔버스 `[0,1]`, 속성 `[0,2]`. `canvasCounts`가 MOVE를 `patch.parent`로 보는 것도 타입과 맞음 (`types.ts:114`).
- key 있는 버튼 자식: 컴포넌트 key가 결과 요소로 (`resolveComponents.ts:51-56`) → 인스턴스 줄과 버튼 안 `[icon?, label]` 모두 `diffKeyedChildren`.
  - P-6: 버튼마다 `INSERT [..,0]` 1줄, label은 from = to라 MOVE 없음 → 4 / P-7: `REMOVE [..,0]` → 4 / P-10: b2 경로 + `[0]` 1줄 / P-12: 3 (b2 줄 0) / P-14: ① `REMOVE` 1, ② `{}`, ③ `INSERT` 4
- MOVE와 추가·삭제: P-15 `[b1,b2,b3]→[b2,b1,b3]` MOVE 1줄(from 1 → to 0). P-16·17·18 각각 INSERT·REMOVE·INSERT 1줄. 경계 버튼에 `disabled`가 없어(④-13) 레이어에 SET_ATTR 안 섞임.
- 글자·속성: P-1·2 class 1·2줄, P-4 4, P-5 · P-19 3(b3 override), P-8 4, P-9 · P-21 1.
- 레이어 이름 SET_TEXT: P-3의 b1 행 이름은 `[0,0]` 아래라 캔버스 개수에 안 섞임. 캔버스에는 입력칸이 없어 SET_PROP 없음 (`diff.ts:196-218`).

**BLOCKING 2**: `pressUndo`·`pressRedo`가 `document.activeElement?.blur()` (dev_todo.md:199, qa_todo.md:11). 선택이 없어도 실패 안 함.

**BLOCKING 3**: 인스턴스 아이콘 켜기·끄기와 Instance swap을 QA-26 ~ 28, P-10 ~ P-14, Dev-8 테스트 목록이 덮음 (qa_todo.md:55-57, :102-106, dev_todo.md:152-160).

**Undo 49번 계산**
- QA-A9: 50번 추가 → 상태 s0 ~ s50, `past`는 49칸까지라 s1 ~ s49, 지금 s50. Undo 49번 = s1(b1 ~ b4), Redo 49번 = b4 ~ b53. 맞음.
- QA-A19: 49번 추가면 s0까지 남아 처음 모습. 맞음.
- `nextId`는 기록 밖이라 계속 커짐 → A18의 b5 → b6 맞음, Redo를 버린 뒤에도 id 겹칠 경로 없음. Redo 버림은 QA-23과 `undo.test.ts`.

**NON-BLOCKING 4 ~ 11**: 4 `addInitScript`로 등록·해제 수 / 5 A8은 Backspace 직후에만 `취` / 6 빈 상태 `<p>` · 머리 `<h2>` / 7 `afterEach` `unmount()`, spy는 `render()` 전 / 8 컴포넌트 파일 5개 목록 / 9 `UNDO_LIMIT` 따로 / 10 선택 상자·체크박스 `onInput`만 (`events.ts:10`) / 11 「인스턴스가 없어요」 제거.

**작업자가 알린 가정 2개**는 명세와 안 부딪힘: `div.app` 자식 순서 고정(mobile 쌓는 순서 = DOM 순서, 차이는 CSS만), 「메인 Button」 고정(MF-20 문구).

`vite.config.ts`는 `root: 'fixtures'`, vitest include에 `fixtures/**/__tests__`가 이미 있음 → 설정 파일 수정 불필요.

## [NON-BLOCKING]
1. 준비 동작과 센 동작 사이에 기다리기: qa_todo.md:89 「그 뒤의 렌더만 센다」만 있음. Batching(결정 9 B) 때문에 준비 동작(메인 고르기)과 센 동작(라벨 입력)을 같은 틱에 보내면 렌더가 합쳐져 `lastPatches`에 고르기의 SET_ATTR이 섞임 → P-3 · P-14 ③ 등이 틀어짐. → 「준비 동작마다 `await Promise.resolve()`로 렌더를 끝낸 뒤 센 동작」을 89줄에.
2. 인스턴스 크기·색 편집 단언 없음: QA-22(b1 크기 S) · QA-24(b2 색)에 준비 단계로만. → patch 기대 표에 「`b1` 선택 → 크기 `S` = 캔버스 `{ SET_ATTR: 1 }`, 레이어 `{}`」, QA-10이나 QA-13의 Then에 「b1 크기만 `btn-S`」.
3. 오타: dev_todo.md:32 「아이콘이 없을 때」 → 「인스턴스가 없을 때」.
4. QA-A2 긴 글자 CSS: 버튼이 flex 항목이라 `overflow-wrap: break-word`는 최소 너비를 안 줄여 가로 스크롤 가능 → 라벨에 `overflow-wrap: anywhere`(+ 버튼 `max-width: 100%`).

## 사용자 결정 필요 (확인만, 진행해도 무방)
- ④-8 ②~④가 기록에 빠짐: dev_todo.md:20의 「Undo/Redo는 Alt가 있으면 무시 · `preventDefault` 안 함 · `repeat` 그대로 처리」는 초안 ④-8 ②~④(01_worker_draft.md:142) 작업자 추천인데, `00_master_dialogue.md:70-73` Q17 기록에는 ④-8 ①만 있고 「나머지 작업자 추천」 목록(2·3·4·7·9·10·12·13)에 8이 없음. 마스터 지시대로 보면 문제없고 새 기능도 아님. 추적용으로 dialogue에 「④-8 ②~④도 추천 수용」 한 줄 권함.
