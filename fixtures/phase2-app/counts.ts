import type { Patch } from '@mini-react/shared';

// [AI Note]: 기록판 횟수는 렌더 결과에 영향을 주지 않게 "상태가 아닌 바깥 변수"로 센다 (기록하려고 setter를 부르면 렌더가 또 생기므로).
// 이 모듈은 값만 들고 있고 DOM · Hook과 상관없다. App(루트)이 올리고, 기록판이 읽는다.
export const counts = {
  renderRuns: 0,
  effectRuns: 0,
  memoRuns: 0,
};

// [AI Note]: 마지막 update의 patch 목록을 읽는 통로. render()가 인스턴스를 돌려주기 전에 mount의 effect가 먼저 돌기 때문에
// main.ts가 인스턴스를 받은 뒤에 연결하고, 그 전에는 빈 목록(= mount 직후는 patch 0줄)이다.
export const engine: { lastPatches: () => readonly Patch[] } = {
  lastPatches: () => [],
};
