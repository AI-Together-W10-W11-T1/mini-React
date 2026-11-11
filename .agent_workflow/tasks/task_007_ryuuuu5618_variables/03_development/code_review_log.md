# 개발 검수 기록: variables

## 회차 1/3 — Dev-1~5 (diff `01_diff_dev1-5.patch`, 618e1a0..HEAD, 사용자 커밋 3f005b2 · 281d17a 제외) — **APPROVE**

검수자: mr-reviewer (Opus). BLOCKING 없음.
- ① `var:` 오해 없음: `isHexColor('var:primary')` false, 푸는 곳 = `Canvas.ts:35` · `PropertyPanel.ts:101-106`뿐 → `textColorFor` · `buttonStyle`은 hex만, 팔레트 pressed = `link === null && value === hex`, 실제 영역엔 푼 hex만(RV-2 · QA-72), doc 사본에 변수 포함(PD-6)
- ② `setVariableValue`(`model.ts:136-139`) 같은 값 · 없는 id · 형식 밖 = 같은 Doc, 기존 doc 함수 6개 `variables` 같은 참조 (VP-10 · A44 · A48)
- ③ 연결 / 「없음」 / 칩 모두 기존 `setMainField` · `setInstanceField` 경로, ↻ = 키 지우기 → 메인 연결 따름 (VP-9 · QA-71)
- ④ 변수 패널 = `LayerPanel.ts:84` 맨 끝 자식(`ul` 밖), `.collapsed`는 `.layer-list`에만
- Hook 8칸 · 새 칸 없음, `VariablePanel` props만, packages 0. 사용자 CSS는 Dev 기능을 깨지 않음 (QA-76 · A58)

**NON-BLOCKING**
1. A46 e2e에 [Patch] 단계 빠짐 (`mini-figma-variables.spec.ts:121-141`), 동작은 단위 RV-4가 확인 → `patchNow` + back false 단언 추가
2. 레이어 접은 뒤 변수 구역이 보이는 단언 없음 → `layer-toggle` 뒤 `variable-panel` 3줄 단언 추가
3. `dev_todo.md:90` Dev-1 미체크 → **마스터가 [x]로 고침**
4. `App.ts:21` 주석 `doc = { main, instances }` → variables 추가
5. `setVariableValue`가 대문자 hex(`#F4B000`)를 그대로 저장 (FD-20 소문자) — UI에선 안 나옴, 소문자로 저장 권장

### 마스터 처리
- 1 · 2 · 4 · 5 → mr-worker 한 번에 (작은 수정), 끝나면 QA
