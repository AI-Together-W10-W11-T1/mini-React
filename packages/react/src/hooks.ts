import type { Deps, EffectCallback } from '@mini-react/shared';

/** setter가 받는 값: 새 값 또는 이전 값을 받아 새 값을 돌려주는 함수 (함수형 setter) */
export type SetStateAction<S> = S | ((prev: S) => S);

/**
 * 엔진(react-reconciler)이 렌더 중에 꽂는 Hook 구현.
 * 공개 Hook 함수는 지금 꽂힌 디스패처에 그대로 위임만 한다.
 */
export interface HookDispatcher {
  useState<S>(initial: S | (() => S)): [S, (next: SetStateAction<S>) => void];
  useEffect(effect: EffectCallback, deps?: Deps | undefined): void;
  useMemo<T>(factory: () => T, deps?: Deps | undefined): T;
}

// [AI Note]: react 패키지는 Hook의 "겉모습"만 가진다. 상태를 어디에 저장할지는 렌더 중인 FunctionComponent가 정하고,
// 렌더하는 동안만 setHookDispatcher로 자기 구현을 꽂는다. 디스패처가 없으면(렌더 밖 · 이벤트 핸들러 안) 오류 — P2-08.
// 의존 방향: react-reconciler → react (react는 reconciler를 모른다).
let currentDispatcher: HookDispatcher | null = null;

const OUTSIDE_RENDER_ERROR = 'Hook은 함수형 컴포넌트 렌더 중에만 부를 수 있습니다';

/**
 * 엔진용: 렌더 시작 때 꽂고 끝나면 `null`로 되돌린다.
 * 바꾸기 전 디스패처를 돌려준다 — 렌더 안에서 잠깐 바꿨다가(자식 컴포넌트 실행) 원래대로 되돌릴 때 쓴다.
 */
export function setHookDispatcher(dispatcher: HookDispatcher | null): HookDispatcher | null {
  const previous = currentDispatcher;
  currentDispatcher = dispatcher;
  return previous;
}

function resolveDispatcher(): HookDispatcher {
  if (currentDispatcher === null) throw new Error(OUTSIDE_RENDER_ERROR);
  return currentDispatcher;
}

export function useState<S>(initial: S | (() => S)): [S, (next: SetStateAction<S>) => void] {
  return resolveDispatcher().useState(initial);
}

export function useEffect(effect: EffectCallback, deps?: Deps): void {
  resolveDispatcher().useEffect(effect, deps);
}

export function useMemo<T>(factory: () => T, deps?: Deps): T {
  return resolveDispatcher().useMemo(factory, deps);
}
