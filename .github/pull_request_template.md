<!--
PR 제목 규칙: <type>(<package>): <요약>
  예) feat(react-reconciler): key 기반 자식 재정렬 Diff 추가
  type: feat | fix | refactor | test | docs | chore | style
브랜치 흐름: feature/* → develop → main
  - 기능 PR의 base는 develop 입니다. main으로는 develop에서만 머지합니다.
해당 없는 항목은 지우지 말고 "해당 없음"이라고 적어 주세요.
-->

## 📌 개요
<!-- 이 PR이 무엇을, 왜 하는지 1~3줄로 적어 주세요. -->

- 관련 이슈: close #

## 🌿 브랜치
- [ ] `feature/*` → `develop`
- [ ] `develop` → `main` (릴리스/통합)
- [ ] 기타: 

## 🧭 Phase
- [ ] Phase 1 — Virtual DOM · Diff · Patch · DOM → VNode · State History
- [ ] Phase 2 — FunctionComponent · Hooks(`useState` / `useEffect` / `useMemo`) · 리렌더
- [ ] 공통 / 설정 / 문서
- [ ] 기타 추가사항

## 📦 수정 패키지
- [ ] `packages/shared` 
- [ ] `packages/react` 
- [ ] `packages/react-reconciler` 
- [ ] `packages/react-dom-bindings` 
- [ ] `packages/react-dom`
- [ ] `packages/scheduler`
- [ ] `fixtures/` 

## ✨ 변경 사항
<!-- 파일·함수 단위로 무엇이 바뀌었는지 적어 주세요. -->
- 

## ⚙️ 동작 원리
<!--
핵심 로직을 팀원이 이해하고 발표에서 설명할 수 있도록 적어 주세요.
(과제 원칙: AI가 생성한 코드라도 핵심 로직은 설명할 수 있어야 합니다.)
예시
- Diff: 어떤 케이스(추가 / 삭제 / 타입 교체 / 텍스트 변경 / 속성 변경 / key 재정렬)를 어떻게 판별하는지
- Hooks: hooks 배열과 호출 순서 인덱스로 상태를 어떻게 유지하는지, mount()와 update()의 차이
- 리렌더: setState → 새 VNode 생성 → Diff → Patch 흐름
-->

## 🧪 검증 (비고)
### 단위 테스트
- [ ] 관련 패키지의 `src/__tests__/`에 테스트를 추가/수정했습니다.
- [ ] 전체 테스트가 통과합니다.

<!-- 추가한 테스트 케이스를 적어 주세요. 예) diff: 같은 key의 순서만 바뀐 경우 이동 패치만 생성 -->
- 

### 엣지 케이스 (비고)
<!-- 고려한 경계 상황. 예) 빈 children, null/boolean 자식, 텍스트↔엘리먼트 교체, 중복 key, deps 생략/빈 배열, effect cleanup -->
- 

## 🖼️ 스크린샷 / GIF
<!-- UI나 fixture 동작이 바뀌었다면 첨부해 주세요. -->

## ✅ 체크리스트
- [ ] base 브랜치가 맞습니다 (기능 PR → `develop`).
- [ ] 외부 프레임워크(React, Vue 등)를 사용하지 않았습니다. (Vanilla JS/TS)
- [ ] 패키지 간 의존 방향을 지켰습니다. (`react`는 DOM을 직접 만지지 않고, DOM 조작은 `react-dom-bindings`에서만)
- [ ] Hook 제약을 지켰습니다. (Hook·state는 루트 컴포넌트에서만, 자식은 props만 받는 순수 함수)
- [ ] 불필요한 `console.log`, 주석 처리된 코드, `.gitkeep` 잔여물을 정리했습니다.
- [ ] 필요한 경우 README / 문서를 업데이트했습니다.

## 💬 리뷰어에게 참고 및 건의사항
<!-- 특히 봐 줬으면 하는 부분, 고민한 점, 남은 TODO -->

