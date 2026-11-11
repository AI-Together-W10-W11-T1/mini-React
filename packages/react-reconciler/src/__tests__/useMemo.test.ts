import { describe, it, expect, vi } from 'vitest';
import { h, useMemo, useState } from '@mini-react/react';
import type { AreaChildren, Patch, VNode } from '@mini-react/shared';
import { FunctionComponent } from '../FunctionComponent';
import { flush } from '../../../shared/src/__tests__/helpers';
import type { FunctionComponentHost } from '../FunctionComponent';

const host: FunctionComponentHost = {
  mount: (_children: AreaChildren) => {},
  apply: (_patches: readonly Patch[]) => {},
};

/** 의존성을 바깥에서 바꿔 가며 useMemo를 확인하는 루트 */
function setup<T>(factory: () => T, getDeps: () => readonly unknown[] | undefined) {
  const ctx = { value: undefined as T, renders: 0 };
  const App = (): VNode => {
    ctx.renders++;
    ctx.value = useMemo(factory, getDeps() as readonly unknown[]);
    return h('p', null);
  };
  const fc = new FunctionComponent(App, {}, host);
  return { ctx, fc };
}

describe('useMemo — 계산 저장 · 재사용 (P2-17 · T-13)', () => {
  it('처음 렌더에서 factory를 1번 계산한다', () => {
    const factory = vi.fn(() => 'v');
    const { ctx, fc } = setup(factory, () => [1]);
    fc.mount();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.value).toBe('v');
  });

  it('같은 의존성이면 factory를 부르지 않고 같은 값을 돌려준다 (재사용)', () => {
    const factory = vi.fn(() => ({ big: [1, 2, 3] }));
    const { ctx, fc } = setup(factory, () => [1]);
    fc.mount();
    const first = ctx.value;
    fc.update();
    fc.update();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.value).toBe(first); // 결과가 객체여도 참조 유지
  });

  it('의존성이 바뀌면 다시 계산한다', () => {
    let dep = 1;
    const factory = vi.fn(() => dep * 10);
    const { ctx, fc } = setup(factory, () => [dep]);
    fc.mount();
    expect(ctx.value).toBe(10);
    dep = 2;
    fc.update();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(ctx.value).toBe(20);
    fc.update(); // 다시 같은 의존성 → 재사용
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('의존성을 생략하면 매 렌더 다시 계산한다', () => {
    const factory = vi.fn(() => ({}));
    const { ctx, fc } = setup(factory, () => undefined);
    fc.mount();
    const first = ctx.value;
    fc.update();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(ctx.value).not.toBe(first);
  });

  it('[]는 처음 한 번만 계산한다', () => {
    const factory = vi.fn(() => 'once');
    const { fc } = setup(factory, () => []);
    fc.mount();
    fc.update();
    fc.update();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('의존성 배열의 길이가 달라지면 다시 계산한다', () => {
    let deps: unknown[] = [1];
    const factory = vi.fn(() => 'x');
    const { fc } = setup(factory, () => deps);
    fc.mount();
    deps = [1, 2];
    fc.update();
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('다른 상태가 바뀌어도 의존성이 그대로면 재사용한다 (T-13)', async () => {
    const factory = vi.fn((items: string[]) => items.length);
    const items = ['a', 'b'];
    const ctx = { memo: 0, setOther: (() => {}) as (v: number) => void };
    const App = (): VNode => {
      const [, setOther] = useState(0);
      ctx.setOther = setOther;
      ctx.memo = useMemo(() => factory(items), [items]);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, host);
    fc.mount();
    ctx.setOther(1);
    await flush();
    ctx.setOther(2);
    await flush();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.memo).toBe(2);
  });

  it('슬롯 { kind: memo, value, deps }가 hooks 배열에 쌓인다', () => {
    const { fc } = setup(() => 42, () => [7]);
    fc.mount();
    expect(fc.hooks[0]).toEqual({ kind: 'memo', value: 42, deps: [7] });
  });

  it('useState와 섞여도 각자 슬롯을 쓴다 (부른 순서)', () => {
    const App = (): VNode => {
      useState(1);
      useMemo(() => 2, []);
      useState(3);
      return h('p', null);
    };
    const fc = new FunctionComponent(App, {}, host);
    fc.mount();
    expect(fc.hooks.map((s) => s.kind)).toEqual(['state', 'memo', 'state']);
  });

  it('같은 번호 슬롯의 종류가 memo가 아니면 오류', () => {
    const { fc } = setup(() => 1, () => []);
    fc.mount();
    fc.hooks[0] = { kind: 'state', value: 1, setter: () => {} };
    expect(() => fc.update()).toThrow('Hook 호출 순서');
  });

  it('factory가 던지면 예외가 위로 나가고, 슬롯이 반쯤 만들어지지 않는다', () => {
    const { fc } = setup(() => {
      throw new Error('bad factory');
    }, () => []);
    expect(() => fc.mount()).toThrow('bad factory');
    expect(fc.hooks).toHaveLength(0);
  });
});
