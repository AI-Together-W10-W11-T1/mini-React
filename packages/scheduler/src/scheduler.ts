import { NESTED_RENDER_LIMIT } from '@mini-react/shared';

// [AI Note]: 재렌더 예약 = 마이크로태스크 Batching (알고리즘 결정 9 B, task_003). 결정 9 A(즉시 동기)였던 task_002에서 승격했다.
// setter는 칸 값을 바로 바꾸고 렌더만 여기로 예약한다. 같은 owner(컴포넌트)는 돌기 전까지 예약 1번만 기억하므로,
// 같은 핸들러(같은 틱)에서 setter를 몇 번 불러도 렌더 + diff + patch + effect는 지금 코드가 끝난 직후 한 번이다.
// 시간 분할 · 우선순위는 없다 (명세 제외 범위). requestAnimationFrame(결정 9 C)도 쓰지 않는다.

/** 렌더(task)에서 난 오류를 받는 함수. 기본은 다시 던지기 — 마이크로태스크에서 던지므로 호출한 쪽이 아니라 콘솔(처리되지 않은 오류)로 나온다 */
export type RenderErrorHandler = (error: unknown) => void;

const rethrow: RenderErrorHandler = (error) => {
  throw error;
};
let errorHandler: RenderErrorHandler = rethrow;

/**
 * 렌더 오류를 받을 함수를 지정한다 (테스트가 오류를 모아 확인할 때 쓴다). `null`이면 기본(다시 던지기)으로 되돌린다.
 * [AI Note]: 예외를 삼키지 않는 것이 기본이다 — setter 호출자에게는 못 가지만(이미 지나간 코드) 콘솔 오류로는 반드시 보인다.
 */
export function setRenderErrorHandler(handler: RenderErrorHandler | null): void {
  errorHandler = handler ?? rethrow;
}

// 예약이 걸려 있는 owner (돌기 전까지 같은 owner의 예약은 무시)
const scheduled = new WeakSet<object>();
// 지금 돌고 있는 렌더가 "연달아 몇 번째"인가. 렌더 밖(사용자 이벤트 · mount)에서 건 예약은 1번째, 렌더(effect 포함) 안에서 건 예약은 이 값 + 1
let currentChain = 0;

function limitError(): Error {
  return new Error(`무한 렌더: 렌더가 연달아 ${NESTED_RENDER_LIMIT}번을 넘었습니다. effect 안에서 매번 상태를 바꾸고 있지 않은지 확인하세요.`);
}

function run(owner: object, task: () => void, chain: number): void {
  // [AI Note]: 예약 표시를 돌기 "전에" 지운다 — effect 안에서 부른 setter가 새 렌더를 예약할 수 있어야 연쇄 렌더가 이어진다.
  // task가 던져도 표시가 남아 큐가 막히지 않는다는 뜻이기도 하다.
  scheduled.delete(owner);
  const outer = currentChain;
  currentChain = chain;
  try {
    // 무한 렌더 안전장치: effect → setter → 렌더가 연달아 NESTED_RENDER_LIMIT(50)번을 넘으면 51번째는 돌리지 않고 오류
    if (chain > NESTED_RENDER_LIMIT) throw limitError();
    task();
  } catch (error) {
    errorHandler(error);
  } finally {
    currentChain = outer; // 오류가 나도(오류 처리 함수가 다시 던져도) 연달아 횟수를 되돌려 다음 예약이 정상으로 돈다
  }
}

/**
 * `owner`의 렌더(`task`)를 마이크로태스크로 예약한다. 이미 예약돼 있으면 아무 일 없다 (처음 예약한 task가 돈다).
 * 오류는 호출한 쪽이 아니라 오류 처리 함수(기본 = 다시 던지기)로 간다.
 */
export function scheduleRender(owner: object, task: () => void): void {
  if (scheduled.has(owner)) return;
  scheduled.add(owner);
  const chain = currentChain + 1;
  queueMicrotask(() => run(owner, task, chain));
}
