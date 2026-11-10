import { describe, it, expect, afterEach, vi } from 'vitest';
import { useState, useEffect, useMemo, setHookDispatcher } from '../index';
import type { HookDispatcher } from '../index';

afterEach(() => setHookDispatcher(null));

// [AI Note]: 가짜 디스패처 — 받은 인자를 기록하고 미리 정한 값을 돌려준다 (react 패키지는 위임만 하는지 확인)
function makeFake() {
  const calls: { name: string; args: unknown[] }[] = [];
  const setter = vi.fn();
  const dispatcher: HookDispatcher = {
    useState: ((initial: unknown) => {
      calls.push({ name: 'useState', args: [initial] });
      return [42, setter];
    }) as HookDispatcher['useState'],
    useEffect: (effect, deps) => {
      calls.push({ name: 'useEffect', args: [effect, deps] });
    },
    useMemo: ((factory: () => unknown, deps: unknown) => {
      calls.push({ name: 'useMemo', args: [factory, deps] });
      return 'memo-result';
    }) as HookDispatcher['useMemo'],
  };
  return { calls, setter, dispatcher };
}

describe('Hook 공개 API — 디스패처가 없으면 오류 (P2-08 · T-16)', () => {
  it('렌더 밖(디스패처 없음)에서 useState를 부르면 오류', () => {
    expect(() => useState(0)).toThrow('Hook은 함수형 컴포넌트 렌더 중에만 부를 수 있습니다');
  });
  it('렌더 밖에서 useEffect를 부르면 오류', () => {
    expect(() => useEffect(() => {})).toThrow('Hook은 함수형 컴포넌트 렌더 중에만 부를 수 있습니다');
  });
  it('렌더 밖에서 useMemo를 부르면 오류', () => {
    expect(() => useMemo(() => 1, [])).toThrow('Hook은 함수형 컴포넌트 렌더 중에만 부를 수 있습니다');
  });
  it('이벤트 핸들러 안에서 부르는 경우도 같다 — 렌더가 끝나 디스패처가 내려간 뒤', () => {
    const { dispatcher } = makeFake();
    setHookDispatcher(dispatcher);
    setHookDispatcher(null); // 렌더 끝
    const handler = () => useState(0);
    expect(handler).toThrow('Hook은 함수형 컴포넌트 렌더 중에만');
  });
});

describe('Hook 공개 API — 디스패처로 위임', () => {
  it('useState: 초기값(또는 함수)을 그대로 넘기고 돌려받은 [값, setter]를 그대로 돌려준다', () => {
    const { calls, dispatcher, setter } = makeFake();
    setHookDispatcher(dispatcher);
    const init = () => 7;
    const result = useState(init);
    expect(result).toEqual([42, setter]);
    expect(result[1]).toBe(setter);
    expect(calls).toEqual([{ name: 'useState', args: [init] }]);
    expect(calls[0].args[0]).toBe(init);
  });

  it('useEffect: 함수와 의존성을 그대로 넘긴다 (의존성 생략도 그대로)', () => {
    const { calls, dispatcher } = makeFake();
    setHookDispatcher(dispatcher);
    const fx = () => {};
    const deps = [1, 'a'];
    useEffect(fx, deps);
    useEffect(fx);
    expect(calls[0].args[0]).toBe(fx);
    expect(calls[0].args[1]).toBe(deps);
    expect(calls[1].args[0]).toBe(fx);
    expect(calls[1].args[1]).toBeUndefined();
  });

  it('useMemo: factory와 의존성을 그대로 넘기고 반환값을 그대로 돌려준다', () => {
    const { calls, dispatcher } = makeFake();
    setHookDispatcher(dispatcher);
    const factory = () => 'x';
    const deps = [1];
    expect(useMemo(factory, deps)).toBe('memo-result');
    expect(calls[0].args[0]).toBe(factory);
    expect(calls[0].args[1]).toBe(deps);
  });

  it('여러 Hook은 부른 순서대로 디스패처에 도착한다', () => {
    const { calls, dispatcher } = makeFake();
    setHookDispatcher(dispatcher);
    useState(0);
    useMemo(() => 1, []);
    useEffect(() => {}, []);
    expect(calls.map((c) => c.name)).toEqual(['useState', 'useMemo', 'useEffect']);
  });

  it('setHookDispatcher(null)로 되돌리면 다시 오류', () => {
    const { dispatcher } = makeFake();
    setHookDispatcher(dispatcher);
    expect(useState(0)).toBeDefined();
    setHookDispatcher(null);
    expect(() => useState(0)).toThrow();
  });

  it('setHookDispatcher는 바꾸기 전 디스패처를 돌려준다 (자식 실행 중 잠깐 바꿨다 되돌릴 때)', () => {
    const a = makeFake();
    const b = makeFake();
    expect(setHookDispatcher(a.dispatcher)).toBeNull();
    expect(setHookDispatcher(b.dispatcher)).toBe(a.dispatcher);
    expect(setHookDispatcher(a.dispatcher)).toBe(b.dispatcher);
  });

  it('디스패처를 바꿔 꽂으면 새 디스패처로 간다', () => {
    const a = makeFake();
    const b = makeFake();
    setHookDispatcher(a.dispatcher);
    useState(1);
    setHookDispatcher(b.dispatcher);
    useState(2);
    expect(a.calls).toHaveLength(1);
    expect(b.calls).toHaveLength(1);
  });
});

describe('Hook 공개 API — 타입 (any 없이 추론)', () => {
  it('useState<number>(0)은 [number, setter]로 추론된다', () => {
    const { dispatcher } = makeFake();
    setHookDispatcher(dispatcher);
    const [count, setCount] = useState<number>(0);
    // 컴파일 단언 (tsc가 검사): count는 number, setter는 number 또는 (prev: number) => number를 받는다
    expectTypeOf(count).toEqualTypeOf<number>();
    expectTypeOf(setCount).parameter(0).toEqualTypeOf<number | ((prev: number) => number)>();
    const [name] = useState('a');
    expectTypeOf(name).toEqualTypeOf<string>();
    const [lazy] = useState(() => [1, 2]);
    expectTypeOf(lazy).toEqualTypeOf<number[]>();
    const memo = useMemo(() => ({ a: 1 }), []);
    expectTypeOf(memo).toEqualTypeOf<{ a: number }>();
  });
});

describe('react 패키지 경계', () => {
  it('DOM 전역(document · window)이 없어도 동작한다 (react는 DOM을 만지지 않음)', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    try {
      const { dispatcher } = makeFake();
      setHookDispatcher(dispatcher);
      expect(useState(0)[0]).toBe(42);
      setHookDispatcher(null);
      expect(() => useState(0)).toThrow('Hook은 함수형 컴포넌트 렌더 중에만');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
