# 개발 검수 기록: patch-preview

## 회차 1/3 — Dev-1~7 (diff `01_diff_dev1-7.patch`, 969edc4..HEAD) — **REJECT**

검수자: mr-reviewer (Opus). 코드 쪽 BLOCKING 없음. BLOCKING은 `qa_todo.md` 문서 하나.

**코드 확인 (통과)**
- Hook은 `App.ts`에만 7칸 (state ×3 · memo · effect · state · effect), `app.test.ts:1295` 확인. `PreviewPanel` · `Toolbar` · `Canvas`는 props만. `real-area`(`inert`) · `real-overlay`는 자식 없는 빈 요소, 미니 React가 안을 건드리지 않음 = MutationObserver 테스트(`app.test.ts:1312`)
- PP-05 `toRealVNodes` 입력 불변, `selected` 토큰 단위 제거, testid에 `real-` 접두, 제목은 최상위에서만 제거. 겹치지 않음 = 단위 + e2e QA-47
- PP-06 · 11 `previewNav.ts` 엔진 History 대조(무작위 2000번 포함), 함수형 setter, 경계에서 같은 객체. `keys.ts` Q18 규칙 그대로, `app.test.ts:1057-1232`
- PP-12 `undo.ts` · `undo.test.ts` · `mini-figma-undo.spec.ts` 삭제, `undo-button` · `redo-button`은 "없다" 단언에만. `packages/` 변경 없음
- 완료 근거 건수 일치: previewVNode 16 · previewNav 11 · preview 25 · 「실제 영역」 describe 12
- 깨짐 확인 ①~⑤: 읽기 전용이라 실행 못 함, 단언 구조상 잡을 수 있음

**지적**
1. [BLOCKING] `qa_todo.md`가 최신 명세 · 실제 e2e와 어긋남 (글자만 바뀌고 PP-07 · 12 미반영)
   - QA-54 (74행): 「앱 [↶] · [↷] 켜짐 같음」 「Ctrl+Z는 테스트 영역만 되돌림」 → 실제 e2e(`mini-figma-preview.spec.ts:340-391`)는 Ctrl+Z = 실제 영역 [실행 취소], 테스트 영역 그대로, 앱 Undo 없음
   - QA-52 (72행): 「앱 [↶] 켜짐 유지」 남음
   - 화면 약속 표 (20행): 버튼 자리 「머리글 오른쪽」 → 도구 막대
   - 바뀌는 기존 단언 표 (35 · 38 · 39행): Hook 8 · `slot(7)` → 7칸 · `slot(5)`, rootOnlyHooks `undo` 삭제 미표시, 「QA-3~41 · A1~A29 변화 없음」 → 실제 삭제 QA-19~25 · 29 · 30 · 32 · 33 · A9 · A15 · A17 · A19 · A20 · A21 · A25 · A27, 변경 QA-1 · 31 · 34 · 37 · 40 · A6 · A8 · A10 · A13 · A14 · A18 · A22 · A24 · A26 · A28
   - 3행 머리: PP-01~10만, PP-11 · 12 → QA 연결 없음 (실제는 QA-52 · 54 · A8 · A10 · A28 · A31)
   - 고칠 방법: 문서만 (코드 변경 없음)
2. [NON-BLOCKING] `rootOnlyHooks.test.ts:101` `` new RegExp(`\b${hook}\b`) ``는 템플릿 안 `\b` = 백스페이스라 늘 통과 (106-111행이 `\b`로 제대로 검사해 빈틈은 없음) → `\b`로 고치거나 지움
3. [NON-BLOCKING] 옛 Undo 설명 주석: `Toolbar.ts:18`, `App.ts:39 · 46 · 52 · 60 · 63`, `model.ts:3 · 25 · 88-89 · 117`, `ColorPalette.ts:16-17`, `PropertyPanel.ts:92`
4. [NON-BLOCKING · 마스터] 명세 §5 「버튼 자리 = 실제 영역 머리글」 행, `CLAUDE.md` 79 · 82행 Undo 설명이 task_006 결정과 겹쳐 읽힘
5. [NON-BLOCKING] `dev_todo.md` 머리 「PP-01 ~ 10」 → 12

다음 회차 확인 범위: 1번 `qa_todo.md` (코드 변경이 없으면 vitest · playwright 재실행 불필요)

### 마스터 처리
- 1 · 2 · 3 · 5 → mr-worker에 한 번에 맡김 (2 · 3은 주석 · 테스트 정규식만, 동작 변경 없음)
- 4 → 마스터가 명세 §5 · `CLAUDE.md`에 「task_006에서 제거 / 변경」 표시만 (이미 승인된 PP-07 · 12 결정 반영, 새 결정 아님)

## 회차 2/3 — Dev-7 재작업 (diff `02_diff_review1_fix.patch`, 커밋 47b6478) — **APPROVE**

- 지적 1 해소: QA-52 · 54 · A31 문장 = e2e(`mini-figma-preview.spec.ts:266-311 · 340-391 · 424-492`)와 한 단계씩 일치. 옛 문구는 「PP-12 반영 전 값」 설명으로만 남음. Hook 7칸 · `slot(5)` · nextId `slot(2)` = `app.test.ts:1296 · 1300 · 804`. 삭제 · 변경 목록 · PP-11 · 12 → QA 연결 반영
- 지적 2: `\b`로 실제 단어 경계 검사, 일부러 깨서 3건 실패 확인 근거 있음
- 지적 3 · 5: 주석만 바뀜 (코드 줄 변경 없음), dev_todo 머리 PP-01 ~ 12
- A33 · 34 · 35 · 37 「계획」: 문제 없음 (명세 §6 「빠르게」 범위 = QA-46~54 · A30~32, A36은 단위). QA는 통과로 세지 말고 「범위 밖(계획)」으로만 표시
- NON-BLOCKING 없음. 재실행 불필요 (마스터 확인 vitest 1178 · packages diff 0)
