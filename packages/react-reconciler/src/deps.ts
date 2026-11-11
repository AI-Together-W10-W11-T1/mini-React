import type { Deps } from '@mini-react/shared';

// [AI Note]: effect · memo 공통 의존성 비교 (정책 「§4.2 의존성 비교」).
// null(생략)이면 항상 바뀐 것 → 매 렌더 다시 실행. 아니면 길이가 다르면 바뀜, 같으면 항목마다 Object.is.
// [] vs []는 안 바뀜 → "처음 한 번만". === 대신 Object.is라 NaN은 같고 +0 / -0은 다르다 (useState 같은 값 판정과 같은 규칙).
export function depsChanged(prev: Deps, next: Deps): boolean {
  if (prev === null || next === null) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}
