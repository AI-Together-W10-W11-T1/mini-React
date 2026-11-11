import { describe, it, expect, vi } from 'vitest';
import { h, useState } from '@mini-react/react';
import type { AreaChildren, Patch, VNode } from '@mini-react/shared';
import { FunctionComponent } from '../FunctionComponent';
import type { FunctionComponentHost } from '../FunctionComponent';
import { el, flush, text } from '../../../shared/src/__tests__/helpers';

type Setter<S> = (next: S | ((prev: S) => S)) => void;

function makeHost() {
  const calls: { kind: 'mount' | 'apply'; arg: unknown }[] = [];
  const host: FunctionComponentHost = {
    mount: (children: AreaChildren) => calls.push({ kind: 'mount', arg: children }),
    apply: (patches: readonly Patch[]) => calls.push({ kind: 'apply', arg: patches }),
  };
  return { host, calls };
}

/** 카운터 루트: 렌더 횟수는 상태가 아닌 바깥 변수로 센다 */
function makeCounter(initial: number | (() => number) = 0) {
  const ctx = { renders: 0, count: -1, setCount: (() => {}) as Setter<number> };
  const App = (): VNode => {
    ctx.renders++;
    const [count, setCount] = useState(initial);
    ctx.count = count;
    ctx.setCount = setCount;
    return h('p', null, String(count));
  };
  const { host, calls } = makeHost();
  const fc = new FunctionComponent(App, {}, host);
  return { ctx, fc, calls };
}

describe('useState — 초기값 · 유지 (P2-11 · P2-12 · T-10)', () => {
  it('최초 렌더링에서 초기값을 쓴다', () => {
    const { ctx, fc, calls } = makeCounter(5);
    fc.mount();
    expect(ctx.count).toBe(5);
    expect(calls[0].arg).toEqual([el('p', {}, text('5'))]);
  });

  it('지연 초기화 함수는 처음 한 번만 실행되고 다시 렌더해도 부르지 않는다', async () => {
    const init = vi.fn(() => 10);
    const { ctx, fc } = makeCounter(init);
    fc.mount();
    expect(init).toHaveBeenCalledTimes(1);
    expect(ctx.count).toBe(10);
    fc.update();
    fc.update();
    ctx.setCount(11);
    await flush();
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('렌더가 또 돌아도(update) 상태가 초기값으로 돌아가지 않는다', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(7);
    await flush();
    expect(ctx.count).toBe(7);
    fc.update();
    expect(ctx.count).toBe(7);
  });

  it('hooks 배열에 상태 슬롯이 부른 순서대로 쌓인다', () => {
    const { fc } = makeCounter(3);
    fc.mount();
    expect(fc.hooks).toHaveLength(1);
    expect(fc.hooks[0]).toMatchObject({ kind: 'state', value: 3 });
    fc.update();
    expect(fc.hooks).toHaveLength(1); // 렌더마다 늘지 않음
  });

  it('상태가 렌더 사이에 객체 참조를 유지한다', () => {
    const seen: object[] = [];
    const App = (): VNode => {
      const [obj] = useState(() => ({ n: 1 }));
      seen.push(obj);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, makeHost().host);
    fc.mount();
    fc.update();
    fc.update();
    expect(seen[1]).toBe(seen[0]);
    expect(seen[2]).toBe(seen[0]);
  });
});

describe('useState — 여러 상태의 구분 (P2-13 · T-11)', () => {
  it('여러 useState가 서로 섞이지 않는다', async () => {
    const ctx = { a: 0, b: '', c: false, setA: (() => {}) as Setter<number>, setB: (() => {}) as Setter<string>, setC: (() => {}) as Setter<boolean> };
    const App = (): VNode => {
      const [a, setA] = useState(1);
      const [b, setB] = useState('x');
      const [c, setC] = useState(false);
      Object.assign(ctx, { a, b, c, setA, setB, setC });
      return h('p', null, `${a}/${b}/${c}`);
    };
    const { host, calls } = makeHost();
    const fc = new FunctionComponent(App, {}, host);
    fc.mount();
    expect([ctx.a, ctx.b, ctx.c]).toEqual([1, 'x', false]);
    ctx.setB('y');
    await flush();
    expect([ctx.a, ctx.b, ctx.c]).toEqual([1, 'y', false]);
    ctx.setA((n) => n + 1);
    await flush();
    ctx.setC(true);
    await flush();
    expect([ctx.a, ctx.b, ctx.c]).toEqual([2, 'y', true]);
    expect(fc.hooks.map((s) => s.kind)).toEqual(['state', 'state', 'state']);
    expect((calls[calls.length - 1].arg as Patch[])[0]).toMatchObject({ kind: 'SET_TEXT', after: '2/y/true' });
  });

  it('같은 값을 가진 서로 다른 상태도 따로 바뀐다', async () => {
    const ctx = { x: 0, y: 0, setX: (() => {}) as Setter<number> };
    const App = (): VNode => {
      const [x, setX] = useState(0);
      const [y] = useState(0);
      Object.assign(ctx, { x, y, setX });
      return h('p', null);
    };
    new FunctionComponent(App, {}, makeHost().host).mount();
    ctx.setX(9);
    await flush();
    expect([ctx.x, ctx.y]).toEqual([9, 0]);
  });
});

describe('useState — setter (P2-14 · P2-15)', () => {
  it('setter 함수는 렌더 사이에 같은 참조다', () => {
    const setters: unknown[] = [];
    const App = (): VNode => {
      const [, set] = useState(0);
      setters.push(set);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, makeHost().host);
    fc.mount();
    fc.update();
    fc.update();
    expect(setters[1]).toBe(setters[0]);
    expect(setters[2]).toBe(setters[0]);
  });

  it('setter 한 번에 렌더 1번 + host.apply 반영 — 별도 update() 호출이 없어도 화면이 갱신된다 (P2-15)', async () => {
    const { ctx, fc, calls } = makeCounter(0);
    fc.mount();
    expect(ctx.renders).toBe(1);
    ctx.setCount(1);
    await flush();
    expect(ctx.renders).toBe(2);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ kind: 'apply', arg: [{ kind: 'SET_TEXT', path: [0, 0], before: '0', after: '1' }] });
    expect(fc.lastPatches).toHaveLength(1);
  });

  it('같은 값 setter는 렌더 0번 (Object.is)', async () => {
    const { ctx, fc, calls } = makeCounter(3);
    fc.mount();
    ctx.setCount(3);
    await flush();
    ctx.setCount(3);
    await flush();
    expect(ctx.renders).toBe(1);
    expect(calls).toHaveLength(1);
  });

  it('Object.is: NaN은 같은 값(렌더 0번), 새 객체 {}는 다른 값(렌더 1번)', async () => {
    const ctx = { renders: 0, setNum: (() => {}) as Setter<number>, setObj: (() => {}) as Setter<object> };
    const App = (): VNode => {
      ctx.renders++;
      const [, setNum] = useState(NaN);
      const [, setObj] = useState<object>({});
      ctx.setNum = setNum;
      ctx.setObj = setObj;
      return h('p', null);
    };
    new FunctionComponent(App, {}, makeHost().host).mount();
    ctx.setNum(NaN);
    await flush();
    expect(ctx.renders).toBe(1);
    ctx.setObj({});
    await flush();
    expect(ctx.renders).toBe(2);
  });

  it('+0과 -0은 다른 값이다 (Object.is)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(-0);
    await flush();
    expect(ctx.renders).toBe(2);
  });

  it('함수형 setter: 이전 값을 받아 새 값을 만든다', async () => {
    const { ctx, fc } = makeCounter(1);
    fc.mount();
    ctx.setCount((c) => c + 1);
    await flush();
    expect(ctx.count).toBe(2);
  });

  it('한 핸들러에서 함수형 setter를 3번 부르면 +3이고 렌더는 1번뿐이다 ([+3] Batching 기록, task_002 즉시 동기 때는 렌더 3번)', async () => {
    const { ctx, fc, calls } = makeCounter(0);
    fc.mount();
    const set = ctx.setCount;
    set((c) => c + 1);
    set((c) => c + 1);
    set((c) => c + 1);
    expect(ctx.renders).toBe(1); // 부른 직후에는 아직 렌더 전 (렌더는 지금 코드가 끝난 직후)
    await flush();
    expect(ctx.count).toBe(3);
    expect(ctx.renders).toBe(1 + 1);
    expect(calls.filter((c) => c.kind === 'apply')).toHaveLength(1);
    expect(calls[calls.length - 1]).toEqual({ kind: 'apply', arg: [{ kind: 'SET_TEXT', path: [0, 0], before: '0', after: '3' }] });
  });

  it('값 setter를 연달아 3번 부르면 마지막 값이 남고 렌더는 1번뿐이다 (task_002 즉시 동기 때는 렌더 3번)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(1);
    ctx.setCount(2);
    ctx.setCount(3);
    await flush();
    expect(ctx.count).toBe(3);
    expect(ctx.renders).toBe(2);
  });

  it('setter를 부르면 칸 값은 바로 바뀌고 화면(렌더)만 나중이다', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(5);
    expect(fc.hooks[0]).toMatchObject({ kind: 'state', value: 5 }); // 칸 값은 즉시
    expect(ctx.count).toBe(0); // 이번 틱의 렌더 결과는 아직 옛 값
    await flush();
    expect(ctx.count).toBe(5);
  });

  it('값 setter 다음 함수형 setter는 방금 쓴 값을 이어받는다 (같은 틱에서도 가장 최근 값)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(10);
    ctx.setCount((c) => c + 1);
    ctx.setCount((c) => c * 2);
    await flush();
    expect(ctx.count).toBe(22);
    expect(ctx.renders).toBe(2);
  });

  it('같은 틱에서 바꿨다가 처음 값으로 되돌려도 렌더 1번 · patch 0건이다 (모은 결과가 처음과 같으면 diff가 무변경)', async () => {
    const { ctx, fc, calls } = makeCounter(0);
    fc.mount();
    ctx.setCount(1);
    ctx.setCount(0);
    await flush();
    expect(ctx.renders).toBe(2); // 예약은 이미 걸렸으므로 렌더는 한 번 돈다
    expect(fc.lastPatches).toEqual([]);
    expect(calls.map((c) => c.kind)).toEqual(['mount']); // host.apply 없음
  });

  it('처음 값과 같은 값만 부르면 예약 자체를 하지 않는다 (렌더 0번)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(0);
    ctx.setCount((c) => c);
    await flush();
    expect(ctx.renders).toBe(1);
  });

  it('렌더가 끝난 뒤 다시 부르면 새 렌더가 예약된다 (틱마다 1번)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    ctx.setCount(1);
    await flush();
    ctx.setCount(2);
    await flush();
    expect(ctx.renders).toBe(3);
  });

  it('옛 값을 읽는 클로저로 3번 부르면 +1만 된다 (정책 기록용 — 그래서 [+3]은 함수형 setter를 쓴다)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    const stale = ctx.count; // 핸들러가 잡고 있는 옛 값
    ctx.setCount(stale + 1);
    await flush();
    ctx.setCount(stale + 1);
    await flush();
    ctx.setCount(stale + 1);
    await flush();
    expect(ctx.count).toBe(1);
    expect(ctx.renders).toBe(2); // 첫 호출만 렌더, 나머지는 같은 값
  });

  it('함수형 setter가 이전 값을 그대로 돌려주면 렌더 0번', async () => {
    const { ctx, fc } = makeCounter(4);
    fc.mount();
    ctx.setCount((c) => c);
    await flush();
    expect(ctx.renders).toBe(1);
  });

  it('함수형 setter는 항상 가장 최근 값을 받는다 (렌더 사이에도)', async () => {
    const { ctx, fc } = makeCounter(0);
    fc.mount();
    const seen: number[] = [];
    ctx.setCount((c) => (seen.push(c), c + 10));
    await flush();
    ctx.setCount((c) => (seen.push(c), c + 10));
    await flush();
    expect(seen).toEqual([0, 10]);
    expect(ctx.count).toBe(20);
  });
});

describe('useState — 호출 순서 (정책 「§4.2 Hook 구분」)', () => {
  it('같은 번호 슬롯의 종류가 state가 아니면 오류', () => {
    const App = (): VNode => {
      useState(0);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, makeHost().host);
    fc.mount();
    // 지난 렌더에서 0번이 다른 종류였던 것처럼 바꿔 놓는다
    fc.hooks[0] = { kind: 'memo', value: 1, deps: null };
    expect(() => fc.update()).toThrow('Hook 호출 순서');
  });
});
