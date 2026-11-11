# 발표 QnA 대비

> 발표자가 읽는 용도. README에는 넣지 않는다. 답은 체크포인트에서 사용자가 한 말을 요약한 그대로 둔다. 「보충 받음」 = 답이 틀려 마스터 보충 설명을 받은 뒤 확인한 질문.

## 모듈별 질문

### Diff · Patch (task_001)

- Q: `<p>안녕</p><ul>하나 둘 셋</ul>` → `<p>반가워</p><ul>하나 셋</ul>`의 고칠 일 목록과 역패치를 예측하면? (알고리즘 결정 2 · 3 · 4, 역순)
  - A(한 줄 요약, 사용자 말): "위치 기반에서는 가운데를 지우면 \"둘\"이 없으니까 그 <li>를 삭제를 하는 것이 아니라 해당 텍스트만 수정하고 맨 뒤 <li>를 삭제한다"
  - 1차 답: `[0,0]` 안녕→반가워 맞음 · `<ul>`은 `[1,0]`부터 비교 맞음 · "둘이 없으니까 그 `<li>` 삭제" 틀림 · 역패치는 패치의 역순 부분 맞음
  - 확인: 승인된 `diff` · `invertPatches`를 임시 테스트로 실행 → `SET_TEXT [0,0] 안녕→반가워` · `SET_TEXT [1,1,0] 둘→셋` · `REMOVE [1,2] <li>셋`, 역패치 `INSERT [1,2] <li>셋` · `SET_TEXT [1,1,0] 셋→둘` · `SET_TEXT [0,0] 반가워→안녕`
  - 보충 받음: 위치 기반은 같은 자리끼리만 비교 → 가운데 삭제 = 글자 바꾸기 + 맨 뒤 삭제. "둘 삭제"는 Key 확장의 동작
  - 출처: task_001 `00_master_dialogue.md` [CheckPoint] 2026-11-11T04:09

- Q: 같은 자리 비교(위치 기반)만으로 "가운데 항목 삭제"는 어떻게 처리되나?
  - A: 가운데 자리의 글자를 뒤 항목 글자로 고쳐 쓰고, 맨 뒤 항목을 삭제한다. 결과는 목표와 같다.
  - 출처: task_001 `03_development/dev_todo.md` Dev-4 「가운데 형제를 지우면 위치 비교 결과(…)지만 최종 결과는 목표와 같다」 · `04_qa_evidence/qa_todo_result.md` QA-5 (A2)

### State History (task_001)

- Q: 0번 → Patch A → Patch B → 뒤로 → Patch C 뒤 연결 리스트 모양은? 앞으로 · 뒤로 두 번의 결과는? B는 어떻게 되나, 왜 버리나?
  - A(사용자 말, 갈림길 이유): "일반적인 프로그램에서는 분기를 나누지 않으니까 나도 그렇게 구현했어."
  - 1차 답: 뒤로를 두 번 누르면 A에 머문다고 함 · B 노드는 목록에서 pop된다고 함
  - 확인: 승인된 `History`를 임시 테스트로 실행 → `0번(초기) ⇄ A ⇄ C(current)`, 개수 3, 앞으로는 무시, 뒤로 1회 = A, 뒤로 2회 = 0번, 뒤로 3회 = 무시(바닥)
  - 보충 받음: 0번 초기 기록을 빠뜨렸음(뒤로 두 번이면 A가 아니라 0번). B는 배열처럼 빼는 것이 아니라 A.next를 C로 바꿔 연결이 끊기고 개수에서 빠짐
  - 버린 후보: 기록을 나무 모양으로 남기는 방식
  - 출처: task_001 `00_master_dialogue.md` [CheckPoint] 2026-11-11T04:13 · `01_request_spec.md` 정책 「undo 뒤 새 변경」

- Q: 보관 한도 50은 왜 50인가?
  - A(사용자 말): "미니 리액트니까 50정도가 적당하다고 생각했음" (출처: task_002 `00_master_dialogue.md` 4단계)
  - 참고 (사용자 제안, 구조): 50개를 넘으면 맨 앞(가장 오래된) 기록부터 뺀다. 0번 포함.
  - 출처: task_001 `01_request_spec.md` 정책 「§3.3 보관 한도」 · `00_master_dialogue.md` Q6-3

### 실제 React와 차이 (task_001)

- Q: React에도 patch 목록이 있나? key를 쓰나? React 앱의 Undo는 누가 무엇을 저장하나?
  - A(한 줄 요약, 사용자 말): "같은 점은 고칠 목록을 만들고 목록을 바탕으로 수정된 부분만 고친다는 것이고 우리는 리액트 튜토리얼에서 권장하는 방식과 달라"
  - 보충 받음: ① 목록 대신 노드마다 표시(flag)를 남김, 비교 대상은 이전 트리 ↔ 컴포넌트가 만든 새 트리 ② key 사용: key 없으면 위치로 짝짓고 경고, `[a,b,c]→[b,c,a]`는 우리 2번 · React 1번 ③ React에는 History가 없고, 공식 튜토리얼(틱택토 시간 여행)은 앱이 상태 스냅샷을 쌓음
  - 출처: task_001 `00_master_dialogue.md` [CheckPoint] 2026-11-11T04:17

### 시연 앱 mini-figma (task_004)

- Q: Figma는 React로 만들었나? 캔버스도 React인가?
  - A(마스터 설명, 사용자 질문 "피그마 컴포넌트를 리액트 라이브러리를 사용하여 만들걸로 알고 있는데 맞아?"): 절반 맞음. 패널 UI(도구 막대 · 레이어 · 속성)는 React, 캔버스는 C++ → WebAssembly + WebGL 자체 렌더러. 이 앱은 캔버스도 div + CSS라 전부 미니 React가 그림.
  - 출처: task_004 `00_master_dialogue.md` 0단계

- Q: Figma 컴포넌트 프로퍼티는 React props 아닌가?
  - A(마스터 설명, 사용자 질문 "엥 그럼 피그마 컴포넌트 프로퍼티는 리액트 props가 아니야?"): 「피그마 컴포넌트」는 두 뜻. (가) Figma 앱의 UI 부품 = React 컴포넌트, (나) Figma 안의 Components · Component properties = 디자인 파일 속 데이터. (나)는 React props가 아니지만 개념이 거의 같고, Code Connect가 둘을 잇는다.
  - 출처: task_004 `00_master_dialogue.md` 0단계

- Q: 메인 편집 한 번 · 여러 setter를 쓰는 동작(삭제)은 렌더가 몇 번 일어나나?
  - A: 렌더 1번. 한 동작의 setter 값(`doc` · `selectedId` · `history`)은 같은 렌더의 값에서 계산한다 (Batching, 결정 9 B). 단위 테스트: 메인 편집 = 렌더 1번, 삭제 = 렌더 +1.
  - 출처: task_004 `03_development/dev_todo.md` 공통 주의 6 · Dev-7 · Dev-9 · `code_review_log.md` 묶음 2 NB 4

- Q: 메인 한 번 편집 뒤 Undo 한 번에 무엇이 되돌아가나? 왜 49번인가?
  - A: 같은 대상 + 같은 칸이 연달아 바뀐 것이 한 단계 (시간 기준 없음). 다른 칸 · 다른 대상, 추가 · 삭제 · 순서 · ↻ · Undo/Redo는 묶음을 끝낸다. 기록은 처음 상태 포함 50개 = Undo 49번 (Phase 1과 같은 뜻, 이 앱은 `UNDO_LIMIT = 50` 별도 상수).
  - 사용자 말(Q14): "다른 속성을 건드렸나면 그건 묶음이 끝났지" · "기록 개수는 50개로~"
  - 출처: task_004 `00_master_dialogue.md` Q14 · Q17 · `03_development/dev_todo.md` Dev-3 · 공통 주의 14

- Q: 고르기(선택)는 Undo 기록에 왜 안 넣나?
  - A(사용자 말, Q14): "2번은 안 해도 될 것 같아" → 고르기는 기록 밖. 되돌려서 고른 인스턴스가 사라지면 선택은 `null`로 풀린다 (`reconcileSelection`).
  - 출처: task_004 `00_master_dialogue.md` Q14 · `01_request_spec.md` MF-32

- Q: Undo로 지운 인스턴스 번호를 다시 쓰나? (추가 → Undo → 추가)
  - A: 안 쓴다. `nextId`는 Undo로 되돌리지 않는다. b4 추가 → Undo → 추가 = b5 (QA-A18). 이유는 "지운 번호 재사용 안 함" (Q17-3, 추천안 수용, 이유 미기재).
  - 출처: task_004 `00_master_dialogue.md` Q17 · `04_qa_evidence/qa_todo.md` QA-A18 · `03_development/dev_todo.md` Dev-11

- Q: Instance swap(★ → ♥)은 patch로 어떻게 보이나?
  - A: 엔진이 컴포넌트를 diff 전에 풀어서, 같은 태그(`<span>`)의 글자만 바뀐다 → `SET_TEXT`. 그래서 `StarIcon` · `HeartIcon`은 태그 · 속성이 같고 글자만 달라야 한다. 아이콘 4개 ★ → ♥ = `SET_TEXT` 4 (P-8). (사용자 답은 아직 없음, 「아직 답이 약한 질문」)
  - 출처: task_004 `01_request_spec.md` 4절 · `03_development/dev_todo.md` 공통 주의 10 · `04_qa_evidence/qa_todo.md` P-8

- Q: 아이콘을 켜고 끌 때 글자 노드는 왜 다시 안 만들어지나?
  - A: 버튼 안 자식 모두에 key를 줬다 (`icon` · `label`). 켜기 · 끄기 = `INSERT` · `REMOVE` 1줄, 글자 `<span>` 노드 유지. key가 하나라도 빠지면 엔진이 조용히 위치 비교로 돌아가 `REPLACE` + `INSERT`가 된다 (Q17-1, 추천안 수용).
  - 출처: task_004 `01_request_spec.md` 4절 · `03_development/dev_todo.md` 공통 주의 12 · `04_qa_evidence/qa_todo.md` QA-8 · P-6

- Q: 화면에 patch를 왜 안 보이나? 「바뀐 곳만 고침」은 어떻게 보여 주나?
  - A(사용자 말, Q7): "아예 안 보여주지 않는 것도 좋지 않아? 일반적으로 안 보이잖아" → 확정. 시연은 Chrome DevTools Elements 패널의 바뀐 노드 표시로 보여 주고, 「바뀐 곳만 고침」은 e2e에서 수정 전후 같은 DOM 노드가 남는지로 확인.
  - 출처: task_004 `00_master_dialogue.md` Q7 · `01_request_spec.md` 4절

- Q: 라벨 칸에 글자를 칠 때 포커스가 왜 안 날아가나?
  - A: 입력칸을 다시 만들지 않고 그 자리에서 고친다. `value`는 실제 값과 다를 때만 넣는다. 라벨 칸은 `onInput`으로 한 글자마다 반영.
  - 출처: task_004 `01_request_spec.md` MF-15 · task_002 `01_request_spec.md` §4.3 · `04_qa_evidence/qa_todo.md` QA-5

- Q: 버튼 안 `...it`에 `id`가 들어 있으면 DOM 속성이 되지 않나?
  - A: `Button`이 쓸 props만 하나씩 꺼내 속성을 만든다. 검수에서 `id`는 `data-id`로만 나오는 것을 확인.
  - 출처: task_004 `03_development/dev_todo.md` 공통 주의 2 · `code_review_log.md` 묶음 2

- Q: Delete · Backspace는 왜 입력칸 안에서 안 지워지나? Shift+Delete는?
  - A: 입력칸 · 선택 상자 · 체크박스 안의 Delete · Backspace는 앱이 무시하고 막지 않는다 (브라우저 기본 그대로). 지우기는 Ctrl · Cmd · Alt · Shift가 하나도 없을 때만 (Q17-4) → Shift+Delete 등은 안 지운다.
  - 출처: task_004 `01_request_spec.md` MF-33 · MF-34 · `03_development/dev_todo.md` Q17-4 · `04_qa_evidence/qa_todo.md` QA-A11

### 시연 앱 mini-figma · 버그와 수정 (Q18)

- Q: Ctrl+Z 한 번에 두 단계가 되돌아간 이유는?
  - A: 재현 (묶음 3 1회차): 메인 고르기 → 라벨 `새` 입력 → 색 빨강 → 포커스를 빼고 Ctrl+Z = 글자 `버튼` + 색 파랑 (두 단계), Ctrl+Shift+Z = 라벨만 `새` (빨강 단계 사라짐). 원인: Chromium의 글자 되돌리기 기록이 포커스를 빼도 남아, Ctrl+Z에 기본 Undo가 라벨 칸에 적용되고 그 `input`을 `onInput`이 새 편집으로 기록 (`future` 비움). `onKey`가 `preventDefault`를 하지 않았다.
  - 출처: task_004 `03_development/code_review_log.md` 묶음 3 1회차 BLOCKING 1 · 재현

- Q: 어떻게 고쳤나?
  - A(사용자 결정 Q18, 2026-11-11T19:19 "응" · 19:23 ② 변경): 입력칸 밖 · 선택 상자 · 체크박스 = 앱 Undo/Redo + 브라우저 기본 동작 막기. 라벨 글자 칸 안 = 앱 동작 없음 · 막지 않음 (브라우저 글자 되돌리기, 결과는 일반 수정). Delete · Backspace는 입력칸 · 선택 상자 · 체크박스 안에서 무시 · 막지 않음.
  - 사용자 말(② 변경): "그러면 추천대로 수정해도 브라우저에서도 undo가 가능하다면 추전하는대로 수정해줘"
  - 출처: task_004 `00_master_dialogue.md` 2단계 Q18

- Q: 그럼 라벨 칸에서는 Undo가 안 되나? (사용자 질문 "그러면 undo는 못 하는거야?")
  - A(마스터 답): 앱 Undo는 그대로 된다. 막은 것은 브라우저가 같이 하던 글자 되돌리기뿐. 라벨 칸 = 브라우저 글자 되돌리기(일반 수정), 빈 곳 · 선택 상자 · 체크박스 = 앱 Undo.
  - 출처: task_004 `00_master_dialogue.md` 2단계 사용자 질문 3건

- Q: 이 수정은 어떻게 확인했나?
  - A: 재현 e2e를 먼저 실패시킴 (QA-29 `Expected "새" Received "버튼"`). 이어서 QA-30 · QA-A8 추가, 단위 `keys.test.ts`(대상 종류별 판정) · `app.test.ts`(`defaultPrevented`). 2회차 검수 APPROVE, 새 BLOCKING 없음.
  - 출처: task_004 `04_qa_evidence/qa_todo.md` QA-29 · QA-30 · QA-A8 · `03_development/code_review_log.md` 묶음 3 2회차 · `03_development/dev_todo.md` Dev-11 재작업

## 알고리즘 결정: 왜 이걸 골랐나

- Q: diff 자식 비교를 왜 위치 기반 + key 확장(B. key 표)으로 골랐나?
  - A: 필수 — "태그가 같으면 그 자리에서 고치고 다르면 새로 만들어." / Key — "html에서 지정한 id값을 통해 비교하는 방식으로 진행하자"
  - 버린 후보와 이유: C 양끝 비교 · D 최장 증가 부분 수열 — 분기 · 설명량, 마감 (사용자 별도 이유 없음) / 값으로 짝짓기 — 같은 내용 · 내용 변경 · 항목 상태에서 깨짐
  - 출처: task_001 `01_request_spec.md` 결정 2 · `00_master_dialogue.md` Q6 · 알고리즘 결정 문답

- Q: 되돌리기(History)를 왜 "패치 + 역패치 + VNode"로 했나? 스냅샷만 저장하면 안 되나?
  - A: "다중 사용자가 사용할 것으로 고려하여 결정" (최종) · "그래도 b로 변경하여 다른 툴들이 히스토리 구현하는 방식을 공부하고 싶어" (2차 선택 이유)
  - 1차 선택은 VNode 스냅샷(A)이었다: "state_history를 만들어서 vdom 기록을 저장한다고 알고 있어. 현재 이전 혹은 이후 vdom을 불러와서 diff후 dom을 수정하면 될 것 같아"
  - 버린 후보와 이유: A 스냅샷만 — 역패치 공부가 빠짐 / C HTML 문자열 — 전체 교체 · 핸들러 소실 / B 패치만 — 과제 원문과 어긋남
  - 출처: task_001 `01_request_spec.md` 결정 7 · `00_master_dialogue.md` 알고리즘 결정 문답 (결정 7)

- Q: 역패치를 왜 역순으로 적용하나? 인덱스 보정(OT)은 왜 안 쓰나?
  - A: 나중에 한 일부터 거꾸로(역순) 되돌리면 보정 없이 맞는다 (마스터 설명 기준). 역패치 = 전후 뒤집기 + 역순. 인덱스 보정은 혼자 순서대로 고치는 상황이라 불필요 (사용자 별도 이유 없음).
  - 출처: task_001 `01_request_spec.md` 결정 표 「되돌리는 순서」 · `00_master_dialogue.md` 체크포인트 Q9 (결정 1 · 3 · 4)

- Q: 갈림길(뒤로 간 뒤 새 Patch)에서 앞쪽 기록을 왜 버리나?
  - A(사용자 말): "일반적인 프로그램에서는 분기를 나누지 않으니까 나도 그렇게 구현했어."
  - 출처: task_001 `00_master_dialogue.md` [CheckPoint] 2026-11-11T04:13 · `01_request_spec.md` 정책 「§3.3 undo 뒤 새 변경」

- Q: Phase 1 검증 페이지는 왜 Key를 화면에 안 쓰나?
  - A(사용자 말): "사용자가 key값 수정 방지 위해"
  - 버린 후보: 엔진 번호 + 편집창 `data-key` 보이기 (편집창이 지저분) · 숨기고 엔진이 기억했다 다시 넣기 (짝지을 단서가 위치 · 내용뿐)
  - 화면 시연은 Phase 2 목록의 데이터 id (`todo-1` …)로 한다.
  - 출처: task_001 `01_request_spec.md` 「Key 출처 · 표시」 · `00_master_dialogue.md` Q13

- Q: 편집을 `contenteditable`이 아니라 HTML 편집창 + 미리보기로 한 이유는?
  - A(사용자 말): "UI적인 선택"
  - 버린 후보: contenteditable + 태그 입력 변환 — 기존 요소의 태그 · 속성을 바꿀 수 없음 · 둘 다 — e2e 두 벌
  - 출처: task_001 `01_request_spec.md` 결정 6 · `00_master_dialogue.md` Q11

- Q: 이동(뒤로 · 앞으로) 때 편집창 글은 왜 버리나?
  - A(사용자 말): "버린 이유는 편집에 상관없이 현재 상태가 맘에 안 들기 때문에 뒤로가기를 했다고 판단했기 때문이야."
  - 출처: task_001 `00_master_dialogue.md` Q11-2 · `01_request_spec.md` 정책 「§3.3 이동 때 미저장 편집」

- Q: 검사를 왜 Patch 때 하고, 문제가 있으면 왜 alert로 막나?
  - A(사용자 말): "패치 버튼을 눌렀을 때 검사를 해보고 에러가 나오면 다시 작성해달라고 하고 태그를 빠뜨린 거도 고치지 않도록" / "alert창으로 둘 다 알려주자"
  - 미리보기는 칠 때마다 위험 코드를 빼고 그린다. 검사 실패 시 실제 영역과 기록은 그대로.
  - 출처: task_001 `00_master_dialogue.md` Q11-3 · `01_request_spec.md` 정책 「§5 HTML 편집 · 오류」

- Q: `<svg>`는 왜 지원하지 않나?
  - A(사용자 말): "일단은 미지원으로 하고 미니 리액트가 구현이 끝나면 너가 리마인드 시켜줘"
  - 사각형 · 원 · 글상자는 `div` + CSS로 가능, 펜 · 곡선 · 아이콘 패스에는 SVG가 필요 (마스터 설명). Patch 때 `[SVG 미지원]`으로 막는다.
  - 출처: task_001 `01_request_spec.md` 정책 「§5 HTML · SVG 범위」 · `00_master_dialogue.md` Q11-4

- Q: 재렌더는 언제 하나? setter를 부르면 바로 화면이 바뀌나? (결정 9)
  - A(task_002 당시 사용자 말): "그냥 setter 부를 때마다 바로 렌더와 패치를 진행하자." · 이유: "마감이 빠듯해서 시간이 남으면 배칭 구현한다고 메모해줘"
  - 버린 후보(task_002 당시): 마이크로태스크 Batching (마감 · 테스트에 `await` 필요) / `requestAnimationFrame` (최대 약 16ms 늦음, jsdom 테스트 불편)
  - 결과: task_002 마무리 때는 "배칭은 구현하지 말자"였다가, task_003에서 **B. 마이크로태스크 Batching**으로 바꿨다. 이유(사용자 말): "리액트를 공부할려면 배칭 구현하는게 맞는 거 같아서". 지금은 setter가 칸 값을 바로 바꾸고 렌더는 `queueMicrotask`로 컴포넌트당 한 번, 지금 실행 중인 코드가 끝난 직후에 돈다.
  - 출처: task_003 `01_request_spec.md` 결정 9 · `00_master_dialogue.md` / task_002 `01_request_spec.md` 결정 9 · `00_master_dialogue.md` Q4 · 마무리

- Q: 이벤트 핸들러를 왜 "리스너 하나 + 핸들러 교체"로 했나? (결정 8)
  - A(사용자 말): "바뀐 곳만 고친다는 원칙을 지키려고"
  - 1차로 A(매번 remove · add)를 골랐다가, 렌더마다 모든 핸들러가 새 함수라 등록 취소 · 등록이 생긴다는 설명을 듣고 B로 바꿨다.
  - 버린 후보: C 루트 위임 — 구현량, 항목 수가 적어 불필요
  - 출처: task_002 `01_request_spec.md` 결정 8 · `00_master_dialogue.md` Q5

- Q: Phase 2 앱을 피그마 같은 편집기로 만들지 않은 이유는?
  - A(사용자 말): "아니아니 피그마 구현은 내가 미니 리액트를 구현 끝내고 구현을 해야 하는 것이잖아? 일단은 그걸 배제하고 페이즈1을 구현했듯이 페이즈2를 구현하는 것이 맞을 것 같아"
  - 출처: task_002 `00_master_dialogue.md` 「명세 초안 검토」

### 시연 앱 mini-figma · 알고리즘 결정 (task_004)

- Q: override를 왜 「키가 있느냐」로 판단하나? 값이 메인과 같으면 메인 따름으로 돌려도 되지 않나?
  - A(사용자 말, Q3-1): "이미 인스턴스에 컬러를 추가했기 때문에 메인 컴포넌트가 컬러를 바꿔도 영향을 받지 않아." · Q10: "빈 글자니까 오버라이드" · "프레이머는 오버라이드였어". 값으로 판단하면 빈 글자 = 메인 따름이 되어 규칙이 둘이 된다.
  - 보충 받음: 이름은 override, 되돌리기는 키를 지움 (`undefined`를 넣으면 스프레드가 메인 값을 덮어 색이 사라짐). 되묻기 3차에서 "오버라이드한 인스턴트가 변하지 않지"로 정리.
  - 버린 후보: 값으로 판단 (빈 글자 = 메인 따름)
  - 출처: task_004 `01_request_spec.md` 알고리즘 결정 「override 판단」 · `00_master_dialogue.md` Q3-1 · Q10 · 되묻기 1~3차

- Q: 화면 배치를 왜 패널 하나(선택해서 고치기)로 했나?
  - A(사용자 말, Q5): "a처럼 가자. 기존 피그마랑 비슷한 것 같아"
  - 버린 후보: 패널 두 개 (모바일에서 좁음) · 탭 (메인 수정 → 인스턴스 변화가 한눈에 안 보임)
  - 출처: task_004 `01_request_spec.md` 알고리즘 결정 「화면 배치」 · `00_master_dialogue.md` Q5

- Q: 인스턴스 목록을 왜 배열로 했나? 연결 리스트가 맞지 않나?
  - A(사용자 말, Q9-2): "그럼 배열로 가자" · 이유: "우리 엔진은 「새 값을 넘겨야 다시 그린다」는 규칙 때문에". 사용자가 먼저 "링크드 리스트가 맞는 거 같아"라고 했고, 노드를 직접 고치면 setter가 같은 참조라 렌더가 안 된다는 설명 뒤 배열로 정함.
  - 보충 받음
  - 버린 후보: 연결 리스트 — 노드를 직접 고치면 렌더 안 함, 복사하면 장점이 사라짐
  - 출처: task_004 `00_master_dialogue.md` Q9 · Q9-2 · Q10 앞 사용자 제안 · `01_request_spec.md` 알고리즘 결정

- Q: 선택 · key를 왜 인스턴스 id로 하나? 인덱스로 하면 무엇이 깨지나?
  - A(사용자 말, Q9-1): "누구를 골랐는지는 id값이 있었던 것 같은데?" · 인덱스면 「삭제」를 고른 채 [↑]를 누를 때 선택이 다른 인스턴스로 바뀌고 key가 자리를 따라간다 (마스터 설명).
  - 출처: task_004 `00_master_dialogue.md` Q9 · Q9-1 · `01_request_spec.md` 알고리즘 결정 「선택 · key」

- Q: 키보드 리스너를 왜 `useEffect` + `document`로 했나?
  - A(사용자 말, Q16 「추천이라서」): 추천안 수용. 버린 후보: 엔진에 `keydown` 추가 — 엔진 수정(MF-02 위반), props 이벤트는 포커스된 요소 안에서만 받아 전역 단축키에 안 맞음.
  - 「이해 체크포인트」 CP1 답은 아래 「Component · State · Hooks」 참고.
  - 출처: task_004 `01_request_spec.md` 알고리즘 결정 「키보드 받는 방법」 · `00_master_dialogue.md` Q13 · Q16

## Hook · 자동 갱신 (task_002)

- Q: [+1]을 누르고 이름을 한 글자 칠 때, (가) memo `[todoList.items]` · (나) effect `[count]` · (다) effect 배열 없음 중 무엇이 다시 도나?
  - A(사용자 말, 요약): "(다)에 두 번째 인자가 비어있기 때문에 무조건 실행이 되는 구나"
  - 결과 (마스터 설명 기준): [+1] → (나) · (다) 실행, (가) 안 돔 · 이름 한 글자 → (다)만 실행
  - 보충 받음: 1차 답은 [+1]에서 (다)만 돈다고 함(→ (나) 빠짐) · 이름 한 글자에서는 실행되는 것이 없다고 함(→ (다) 빠짐). 마스터 힌트 뒤 정정
  - 출처: task_002 `00_master_dialogue.md` 「이해 체크포인트 (2.5단계)」 · `07_pr_body.md` 「동작 원리」

- Q: `hooks` 배열에서 이름 없는 `useState`를 엔진은 어떻게 구분하나?
  - A(사용자 말, 요약): "hook을 부르는 순서는 정해져 있으니까 순서를 보고 값을 꺼내온다"
  - 1차 답: 값 `''` 중 가장 앞의 칸에서 꺼낸다고 함 → 칸 번호(1)는 맞고 이유(값으로 찾기)는 틀림. 렌더마다 번호를 0으로 되돌리고 Hook이 불릴 때마다 1씩 올린다.
  - 보충 받음
  - 출처: task_002 `00_master_dialogue.md` 「이해 체크포인트」 Hook 호출 순서 · `07_pr_body.md`

- Q: `if` 안에서 `useState`를 부르면 무슨 일이 생기나?
  - A(사용자 말, 요약): "if를 넣으면 조건문 조건에 따라 훅이 실행될 수도 있고 아닐 수도 있기 때문에 훅 호출 순서가 달라지기 때문이야"
  - 보충 받음: 칸이 밀려 이름 칸이 다른 칸의 값을 받음 → 우리 엔진은 Hook 개수가 달라지면 오류
  - 출처: task_002 `00_master_dialogue.md` 「이해 체크포인트」 Hook 호출 순서 · if 안 Hook

- Q: 이벤트 리스너는 [+1] 뒤 다시 렌더할 때 어떻게 되나?
  - 1차 답(요약): "이벤트 리스너를 새로 등록해. 아니면 동일한 컴포넌트를 눌렀을 때 SET_EVENT 개수가 무한히 늘어나기 때문이야" → 틀림
  - A(사용자 확인 요약): "리스너는 한 번만 등록하고, 렌더할 때는 함수만 갈아 끼운다."
  - 보충 받음: SET_EVENT는 저장된 핸들러만 바꾸고, `addEventListener`는 요소 · 이벤트마다 처음 한 번만 한다
  - 출처: task_002 `00_master_dialogue.md` 「이해 체크포인트」 · `07_pr_body.md` 「동작 원리」

- Q: `setter`를 여러 번 부르면 렌더는 몇 번 일어나나? ([+3])
  - A: Batching이라 같은 핸들러(같은 틱)의 setter는 모아서 렌더 1번이다. [+3]은 렌더 1번(task_002 즉시 동기 때는 3번). 같은 값(`Object.is`)이면 예약하지 않아 렌더 0번.
  - 출처: task_003 `01_request_spec.md` 「정책」 · task_002 `01_request_spec.md` 4절 「렌더 횟수 기록」

- Q: effect에서 setter를 부르면 무한 반복되지 않나?
  - A: effect → setter → 렌더가 연달아 50번을 넘으면 오류 (task_003 Batching 기준. task_002 즉시 동기 때는 "중첩 50번"). 의존성 배열로 실행 조건을 건다. 렌더 본문에서 setter를 부르면 오류.
  - 출처: task_002 `01_request_spec.md` 정책 · `00_master_dialogue.md` Q4-1 (의존성 개념 질문)

## Component · State · Hooks (task_004 체크포인트)

- Q: 엔진의 props 이벤트는 ①(요소마다) · ②(document 하나) 중 어디에 가까운가? 왜 Figma식 단축키에 안 맞나? ([CheckPoint] Component · State)
  - A(사용자 말): "2번 아닐까?" → 다름.
  - 보충 받음: `events.ts:35`의 `element.addEventListener`는 요소마다(①, 알고리즘 결정 8 B). 키는 포커스가 그 요소 안에 있을 때만 들어오므로, 전역 단축키에는 ②(`document`) 리스너가 필요.
  - 출처: task_004 `00_master_dialogue.md` 「이해 체크포인트 · Component · State」 Q1

- Q: cleanup(`return () => removeEventListener`)은 무슨 일을 하나? 없으면 어떻게 되나?
  - A(사용자 말): "이벤트 리스너를 때는 작업 아니야? 11개가 붙이 있지 않을까? 엉뚱한 걸 지울 것 같아"
  - 보충 받음: 맞음 (떼는 작업 · 11개). 11개 핸들러가 각자 붙잡은 옛 값으로 모두 실행되고, 같은 틱의 setter는 마지막 등록 값이 이겨 겉으로는 맞아 보일 수 있음. cleanup을 빼면 `Expected 1 Received 43`으로 잡힘.
  - 출처: task_004 `00_master_dialogue.md` 「이해 체크포인트 · Component · State」 Q2 · `03_development/dev_todo.md` Dev-11 검출력

- Q: 의존성 배열이 빈 칸이면 계속 실행되나? `[]`에서 b1 → b2 → Delete 하면 무엇이 지워지나? ([CheckPoint] Hooks · 의존성 `[]`)
  - A(사용자 말, 1차): "의존성이 빈 칸이면 계속 실행되는 거 아니야?" → 섞인 곳: 「생략」(두 번째 인자 없음) = 매 렌더 실행, `[]` = 처음 한 번만 실행.
  - A(사용자 말, 예측 질문 답): "아하 그러면 처음 렌더될 때만 실행되고 안 되겠네" → 맞음. 처음 등록된 핸들러가 처음 `selectedId = null`을 붙잡아 아무것도 안 지워진다. 마스터가 흉내 낸 결과: `[]` = 지울 대상 `null`, `[selectedId]` = b2.
  - 보충 받음. 검출력: deps `[]`면 app 테스트 11 · e2e 15 실패.
  - 출처: task_004 `00_master_dialogue.md` 「이해 체크포인트 · Hooks」 · `03_development/dev_todo.md` 공통 주의 8

## 실제 React와 차이

- Q: 우리 구현과 실제 React의 가장 큰 차이 2가지는?
  - A: 변경 적용 방식 — 우리는 고칠 목록(패치)을 만들고, React는 목록 대신 노드마다 표시(flag)를 남긴다 (보충 받음). History — 우리에게는 있고 React에는 없다 (보충 받음).
  - 출처: task_001 `00_master_dialogue.md` CheckPoint 2026-11-11T04:17 · `01_request_spec.md`

- Q: 재렌더 시점은 React와 어떻게 다른가?
  - A: 우리도 같은 틱의 setter를 모아 한 번 렌더한다 (결정 9 B, `queueMicrotask`, 컴포넌트당 1번). React 18 이후도 setter를 모아 한 번 렌더 (배칭). 우리는 우선순위 · 시간 분할 없이 마이크로태스크 한 가지다. (task_002 당시는 setter마다 즉시 동기 렌더였음)
  - 출처: task_003 `01_request_spec.md` 결정 9 · task_002 `00_master_dialogue.md` Q4

- Q: effect의 실행 시점은 React와 어떻게 다른가? ([CheckPoint] Hooks 🔁 실제 React 비교)
  - A(마스터 설명): 같은 점 = 생략 · `[]` · 값 배열 규칙, stale closure + 의존성 검사 도구. 다른 점 = 실제 React는 실행 시점이 더 복잡하고, 우리는 patch 직후 한 번.
  - 출처: task_004 `00_master_dialogue.md` 「이해 체크포인트 · Hooks」 🔁

## 아직 답이 약한 질문

- 보충 받음 목록: task_001 Diff · Patch / State History 갈림길 / 실제 React와 차이 · task_002 의존성 · Hook 호출 순서(두 문항: 칸 구분, if) · 이벤트 리스너 (결정 8) · task_004 키보드 리스너 (CP1 Q1 · Q2) · 의존성 `[]` (CP2) · override 판단 (Q3-1) · 배열 (Q9-2)
- 답한 사람이 없는 질문:
  - Reflow / Repaint와 VDOM 관계: README 「핵심 기술 포인트」 (마스터가 쓰고 사용자 확인)
  - task_004 CP1 · CP2 한 줄 요약: 따로 받지 않음 (사용자 "질문 일단 넘어가고 구현하자", 19:47). 자기 말 답(CP1 리스너 떼기 · 11개, CP2 처음 한 번만)으로 갈음 — 발표 전 「단축키는 document에 붙이고, 의존성에 쓰는 값을 넣고, cleanup으로 뗀다」를 한 번 말해 보기
  - task_004 CP3 Instance swap patch: 건너뜀 (사용자 요청, 19:47). 정답(기록): diff 전에 컴포넌트를 풀어 ★ → ♥는 같은 `<span>`의 글자 변경 = 캔버스 `SET_TEXT` 4줄 (P-8). 사용자 답은 없음 — 발표 전 다시 할 후보
- 0번 기록에 key가 없어 첫 key update가 위치 비교가 되는 문제(task_001 `07_pr_body.md`): 해결됨: Phase 2는 `mount()` · `update()` 때 만든 VNode 자체를 이전 VNode로 저장해 DOM에서 다시 읽지 않으므로 첫 화면부터 key가 들어 있다 (task_002 `01_request_spec.md` 「정책」 이전 VNode 보관). Phase 1 검증 페이지는 key를 쓰지 않는다
- 기록된 한계(답 있음): select 역패치 순서 한계 · value · checked 속성 한계 (task_002 `01_request_spec.md` 4절)
