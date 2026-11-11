# 개발 검수 기록: mini-figma

> `mr-reviewer`(Opus) 판정을 마스터가 그대로 옮긴다. 진행 모드: 기본 (Dev 묶음마다).

## 묶음 1 · Dev-1 ~ 4 · 회차 1/3 — APPROVE (2026-11-11T18:22)
- 대상: `01_diff_dev1-4.patch` (`10dfa4e..fff6ca3`), 마스터 실행: `vitest run fixtures/mini-figma` 3 files · 162 passed, `tsc --noEmit` 0, `packages/` diff 비어 있음

BLOCKING 없음. 확인한 것:
- 완료 근거: 함수가 모두 `model.ts` · `undo.ts` · `keys.ts`에 있음. 테스트 건수 model 36 + 26 = 62, undo 24, keys 76 = 162 (마스터 실행과 같음). 커밋 aa22ea9 · 825cb95 · 160f56b · be98199, 제목 형식 지킴
- override: `Object.hasOwn`(`model.ts:47`, prototype 키 제외 · `toString` 테스트), ↻는 키 자체를 뺌(`model.ts:78`, `'label' in` · `Object.keys` · `Object.values`로 확인), 키 없던 칸에 메인과 같은 값 = 키 생김, 이미 override인 칸에 같은 값 = 같은 Doc(`model.ts:63`), 빈 글자 · 아이콘 칸도 같은 규칙
- Undo: 같은 대상 + 같은 칸이면 `past` 안 늘림(시간 기준 없음), `null` 묶음은 늘 새 단계 + 묶음 끝, 새 수정이면 `future` 비움, Undo · Redo 뒤 묶음 `null`, `MAX_PAST = UNDO_LIMIT - 1 = 49`(`HISTORY_LIMIT` import 없음, 뜻 주석), 49 · 50 · 60단계 경계 테스트는 한도를 50 · 48로 잘못 두면 실패
- 키 판정: 명세 · Q17-4대로. `Ctrl+Meta+z` = undo 판단 괜찮음 (명세는 Ctrl/Cmd+Z, Q17-4가 빼는 것은 Alt뿐)
- `nextId`는 Doc 밖, `addInstance`가 인자로 받음(Q17-3). 삭제 · 순서 경계 · 없는 id에서 같은 객체
- 세 모듈에 `document` · `window` 사용 · Hook · 엔진 import 없음 (`undo.ts` → `./model` 타입 import 하나뿐)
- 기획 NON-BLOCKING 1 ~ 4가 ec98662에 모두 반영

[NON-BLOCKING]
1. `Ctrl+Meta+z` → `'undo'`, `Ctrl+Meta+Shift+Z` → `'redo'` 단언이 `keys.test.ts`에 없음 → 표에 한 줄씩
2. `keys.ts:1`(`:16` 근처) 주석에 `document · window` 단어 → Dev-5 `rootOnlyHooks.test.ts`는 `fixtures/phase2-app/__tests__/rootOnlyHooks.test.ts:17-27`의 `stripComments` · `stripNoise`를 그대로 가져갈 것
3. `undo.test.ts:175` `toEqual(docOf(99))`는 값만 비교해 약함 → 같은 변수 + `toBe` (바로 위 `future === []`가 이미 잡고 있어 동작 문제는 아님)
4. `undo.ts:17` `target: 'main' | string`은 타입상 `string`과 같음 (문서용 표기, 동작 영향 없음)

- 처리 계획 (마스터): 1 · 2 · 3은 묶음 2 작업 때 반영, 4는 주석으로 뜻을 남기거나 그대로 (작업자 판단, 동작 영향 없음)
