import { NESTED_RENDER_LIMIT } from '@mini-react/shared';

// [AI Note]: 재렌더 예약 (알고리즘 결정 9 A — 즉시 동기). setter가 불리면 곧바로 task(렌더 + diff + patch)를 실행하고 반환 전에 끝낸다.
// 시간 분할 · 우선순위는 없다 (명세 제외 범위). Batching(마이크로태스크로 모아서 한 번 렌더)은 확장 2(Dev-27)에서 이 파일을 승격한다.
// 즉시 동기라서 effect 안에서 setter를 부르면 렌더가 중첩된다 — 무한 렌더 안전장치로 중첩 깊이가 한도(50)를 넘으면 오류를 낸다.
// 나란히 부르는 것은 중첩이 아니므로(깊이가 매번 0으로 돌아옴) 몇 번을 불러도 괜찮다.
let depth = 0;

export function scheduleRender(task: () => void): void {
  if (depth >= NESTED_RENDER_LIMIT) {
    throw new Error(
      `무한 렌더: 렌더가 연달아(중첩) ${NESTED_RENDER_LIMIT}번을 넘었습니다. effect 안에서 매번 상태를 바꾸고 있지 않은지 확인하세요.`,
    );
  }
  depth++;
  // task가 예외를 던져도 깊이를 되돌려야 다음 예약이 정상으로 돈다
  try {
    task();
  } finally {
    depth--;
  }
}
