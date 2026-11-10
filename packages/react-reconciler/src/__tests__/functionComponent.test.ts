import { describe, it, expect, vi } from 'vitest';
import { h } from '@mini-react/react';
import type { AreaChildren, Patch, Props, VNode } from '@mini-react/shared';
import { FunctionComponent } from '../FunctionComponent';
import type { FunctionComponentHost } from '../FunctionComponent';
import { el, text } from '../../../shared/src/__tests__/helpers';

// [AI Note]: 가짜 host — DOM 없이 엔진이 host에 무엇을 넘기는지만 기록한다. host에는 읽기 메서드가 없다 (mount · apply 둘뿐).
function makeHost() {
  const calls: { kind: 'mount' | 'apply'; arg: unknown }[] = [];
  const host: FunctionComponentHost = {
    mount: (children: AreaChildren) => calls.push({ kind: 'mount', arg: children }),
    apply: (patches: readonly Patch[]) => calls.push({ kind: 'apply', arg: patches }),
  };
  return { host, calls };
}

describe('FunctionComponent — mount() · update() (P2-03 ~ P2-06)', () => {
  it('mount()는 컴포넌트를 1번 실행하고 host.mount에 [VNode] 하나를 넘긴다 (App() 결과 = 영역 자식 목록 [결과])', () => {
    const App = vi.fn((): VNode => h('main', null, '안녕'));
    const { host, calls } = makeHost();
    const fc = new FunctionComponent(App, {}, host);
    expect(App).not.toHaveBeenCalled(); // 만들기만 해서는 실행하지 않음
    fc.mount();
    expect(App).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{ kind: 'mount', arg: [el('main', {}, text('안녕'))] }]);
  });

  it('컴포넌트에 props를 그대로 넘긴다', () => {
    const App = vi.fn((props: Props): VNode => h('p', null, String(props.label)));
    const { host } = makeHost();
    new FunctionComponent(App, { label: 'L' }, host).mount();
    expect(App).toHaveBeenCalledWith({ label: 'L' });
  });

  it('update()는 다시 실행하고 diff 결과(Patch 목록)를 host.apply에 넘긴다', () => {
    let label = 'a';
    const App = vi.fn((): VNode => h('p', null, label));
    const { host, calls } = makeHost();
    const fc = new FunctionComponent(App, {}, host);
    fc.mount();
    label = 'b';
    fc.update();
    expect(App).toHaveBeenCalledTimes(2);
    const patches: Patch[] = [{ kind: 'SET_TEXT', path: [0, 0], before: 'a', after: 'b' }];
    expect(calls[1]).toEqual({ kind: 'apply', arg: patches });
    expect(fc.lastPatches).toEqual(patches);
  });

  it('바뀐 게 없으면(T-04) host.apply를 부르지 않고 lastPatches는 빈 목록', () => {
    const { host, calls } = makeHost();
    const fc = new FunctionComponent((): VNode => h('p', null, 'x'), {}, host);
    fc.mount();
    fc.update();
    expect(calls.map((c) => c.kind)).toEqual(['mount']);
    expect(fc.lastPatches).toEqual([]);
  });

  it('lastPatches는 마지막 update의 결과이고, mount 직후에는 빈 목록 (읽기 전용)', () => {
    let n = 0;
    const { host } = makeHost();
    const fc = new FunctionComponent((): VNode => h('p', null, String(n)), {}, host);
    expect(fc.lastPatches).toEqual([]);
    fc.mount();
    expect(fc.lastPatches).toEqual([]);
    n = 1;
    fc.update();
    expect(fc.lastPatches).toHaveLength(1);
    n = 1; // 그대로
    fc.update();
    expect(fc.lastPatches).toEqual([]);
    // 읽기 전용: setter가 없어 대입하면 오류 (strict 모드)
    expect(() => {
      (fc as unknown as { lastPatches: unknown }).lastPatches = [];
    }).toThrow();
  });

  it('mount() 전에 update()를 부르면 오류, mount()를 두 번 부르면 오류', () => {
    const { host } = makeHost();
    const fc = new FunctionComponent((): VNode => h('p', null), {}, host);
    expect(() => fc.update()).toThrow('mount()');
    fc.mount();
    expect(() => fc.mount()).toThrow('mount()');
  });
});

describe('FunctionComponent — 이전 VNode 보관 · 새 VNode (P2-18 · P2-19)', () => {
  it('이전 VNode는 mount 때 만든 것을 저장해 쓴다 (host에서 다시 읽지 않음)', () => {
    let tag = 'p';
    const { host, calls } = makeHost();
    const fc = new FunctionComponent((): VNode => h(tag, null, 'x'), {}, host);
    fc.mount();
    const mounted = (calls[0].arg as AreaChildren)[0];
    tag = 'section';
    fc.update();
    const [patch] = calls[1].arg as Patch[];
    // REPLACE.before = 저장해 둔 이전 VNode 그 자체 (mount 때 host에 넘긴 것과 같은 참조)
    expect(patch.kind).toBe('REPLACE');
    expect((patch as Extract<Patch, { kind: 'REPLACE' }>).before).toBe(mounted);
  });

  it('update마다 새 VNode를 만든다 (직전 것과 !==), 그 새 VNode가 다음 update의 이전이 된다', () => {
    let tag = 'p';
    const { host, calls } = makeHost();
    const fc = new FunctionComponent((): VNode => h(tag, null, 'x'), {}, host);
    fc.mount();
    const first = (calls[0].arg as AreaChildren)[0];
    tag = 'section';
    fc.update();
    const second = (calls[1].arg as Extract<Patch, { kind: 'REPLACE' }>[])[0].after;
    expect(second).not.toBe(first);
    tag = 'div';
    fc.update();
    const third = calls[2].arg as Extract<Patch, { kind: 'REPLACE' }>[];
    expect(third[0].before).toBe(second); // 이전 = 직전 update가 만든 VNode
    expect(third[0].after).not.toBe(second);
  });

  it('바뀐 게 없는 update 뒤에도 다음 diff는 정상이다', () => {
    let label = 'a';
    const { host, calls } = makeHost();
    const fc = new FunctionComponent((): VNode => h('p', null, label), {}, host);
    fc.mount();
    fc.update(); // 변경 없음
    label = 'b';
    fc.update();
    expect(calls.map((c) => c.kind)).toEqual(['mount', 'apply']);
    expect((calls[1].arg as Patch[])[0]).toEqual({ kind: 'SET_TEXT', path: [0, 0], before: 'a', after: 'b' });
  });
});

describe('FunctionComponent — 자식 컴포넌트 (P2-01 · P2-02 · P2-09 · P2-10)', () => {
  const Label = (props: Props): VNode => h('span', null, String(props.text));

  it('h(Child, props)로 쓴 트리가 풀려서 host에 요소 · 글자만 넘어간다 (patch에 컴포넌트 VNode가 없음)', () => {
    let text_ = 'a';
    const App = (): VNode => h('div', null, h(Label, { text: text_ }));
    const { host, calls } = makeHost();
    const fc = new FunctionComponent(App, {}, host);
    fc.mount();
    expect(JSON.stringify(calls[0].arg)).not.toContain('function');
    expect(calls[0].arg).toEqual([el('div', {}, el('span', {}, text('a')))]);
    text_ = 'b';
    fc.update();
    // 자식의 props가 바뀌면 자식 UI에도 반영된다 (P2-10)
    expect(calls[1].arg).toEqual([{ kind: 'SET_TEXT', path: [0, 0, 0], before: 'a', after: 'b' }]);
  });

  it('래퍼 클래스(FunctionComponent)와 함수형 UI 컴포넌트(App)는 구분된다 (P2-01)', () => {
    const App = (): VNode => h('p', null);
    const fc = new FunctionComponent(App, {}, makeHost().host);
    expect(typeof App).toBe('function');
    expect(App).not.toBeInstanceOf(FunctionComponent);
    expect(fc).toBeInstanceOf(FunctionComponent);
    expect(typeof fc).toBe('object');
  });
});

describe('FunctionComponent — hooks 배열 (P2-04)', () => {
  it('hooks는 배열이고 Hook 호출이 없으면 비어 있다', () => {
    const { host } = makeHost();
    const fc = new FunctionComponent((): VNode => h('p', null), {}, host);
    expect(Array.isArray(fc.hooks)).toBe(true);
    expect(fc.hooks).toHaveLength(0);
    fc.mount();
    fc.update();
    expect(fc.hooks).toHaveLength(0);
  });
});

describe('FunctionComponent — 패키지 경계', () => {
  it('DOM 전역(document · window)이 없어도 동작한다 (react-reconciler는 DOM을 만지지 않음)', () => {
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', undefined);
    try {
      let n = 0;
      const { host, calls } = makeHost();
      const fc = new FunctionComponent((): VNode => h('p', null, String(n)), {}, host);
      fc.mount();
      n = 1;
      fc.update();
      expect(calls).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
