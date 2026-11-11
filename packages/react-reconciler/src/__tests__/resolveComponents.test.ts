import { describe, it, expect, afterEach } from 'vitest';
import { h, useState, useEffect, useMemo, setHookDispatcher } from '@mini-react/react';
import type { HookDispatcher } from '@mini-react/react';
import { TEXT_NODE } from '@mini-react/shared';
import type { ElementVNode, Props, VNode } from '@mini-react/shared';
import { resolveComponents } from '../resolveComponents';
import { diff } from '../diff';
import { el, text } from '../../../shared/src/__tests__/helpers';

afterEach(() => setHookDispatcher(null));

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

/** 풀린 트리에 함수 type이 남아 있는가 */
function hasComponent(node: VNode): boolean {
  if (typeof node.type === 'function') return true;
  return node.children.some(hasComponent);
}

const Greeting = (props: Props): VNode => h('p', { class: 'g' }, `안녕하세요, ${String(props.name)}님`);
const Card = (props: Props): VNode => h('section', null, h(Greeting, { name: props.who }), h('span', null, String(props.n ?? 0)));

describe('resolveComponents — 컴포넌트 풀기 (P2-02 · P2-09 · P2-10 · P2-18)', () => {
  it('컴포넌트 VNode를 실행해 요소로 바꾼다', () => {
    const out = resolveComponents(h(Greeting, { name: '철수' }));
    expect(out).toEqual(el('p', { class: 'g' }, text('안녕하세요, 철수님')));
  });

  it('안쪽 중첩 컴포넌트까지 푼다 (결과가 또 컴포넌트여도, 요소의 children 안에 있어도)', () => {
    const Wrapper = (): VNode => h(Card, { who: '영희', n: 3 }); // 결과가 컴포넌트
    const out = resolveComponents(h('main', null, h(Wrapper, null)));
    expect(hasComponent(out)).toBe(false);
    expect(out).toEqual(
      el('main', {}, el('section', {}, el('p', { class: 'g' }, text('안녕하세요, 영희님')), el('span', {}, text('3')))),
    );
  });

  it('props가 그대로 전달되어 UI에 반영된다 (P2-10), 같은 컴포넌트를 다른 props로 풀면 결과가 다르다', () => {
    const a = resolveComponents(h(Greeting, { name: 'A' }));
    const b = resolveComponents(h(Greeting, { name: 'B' }));
    expect(JSON.stringify(a)).toContain('A님');
    expect(JSON.stringify(b)).toContain('B님');
    expect(a).not.toEqual(b);
  });

  it('컴포넌트 children은 props로 넘기지 않는다', () => {
    let received: Props | undefined;
    const Probe = (props: Props): VNode => {
      received = props;
      return h('i', null);
    };
    resolveComponents(h(Probe, { a: 1 }, 'ignored', h('b', null)));
    expect(received).toEqual({ a: 1 });
    expect('children' in (received as object)).toBe(false);
  });

  it('요소 · 글자 · 주석은 그대로 (새 객체로) 돌려준다', () => {
    const tree = h('div', { id: 'x' }, '글자', h('b', null, 'b'));
    const out = resolveComponents(tree);
    expect(out).toEqual(tree);
    expect(out).not.toBe(tree);
    const t = text('t');
    expect(resolveComponents(t)).toEqual(t);
    expect(resolveComponents(t)).not.toBe(t);
    const c = { type: '#comment', props: { nodeValue: 'c' }, children: [] } as const;
    expect(resolveComponents(c)).toEqual(c);
  });

  it('입력 VNode를 고치지 않는다 (깊게 얼린 입력)', () => {
    const input = deepFreeze(h('main', null, h(Card, { who: 'Z', n: 1 }), '끝'));
    expect(() => resolveComponents(input)).not.toThrow();
  });

  it('풀 때마다 새 객체를 만든다', () => {
    const input = h(Greeting, { name: 'A' });
    expect(resolveComponents(input)).not.toBe(resolveComponents(input));
  });
});

describe('resolveComponents — key 물려주기 (테스트 케이스 확인 1)', () => {
  const Row = (props: Props): VNode => h('li', null, String(props.label));

  it('컴포넌트 VNode의 key가 결과 요소의 key가 된다', () => {
    const out = resolveComponents(h(Row, { key: 'a', label: 'A' })) as ElementVNode;
    expect(out.key).toBe('a');
  });

  it('결과가 이미 key를 가지면 덮어쓰지 않는다', () => {
    const Keyed = (): VNode => h('li', { key: 'inner' });
    const out = resolveComponents(h(Keyed, { key: 'outer' })) as ElementVNode;
    expect(out.key).toBe('inner');
  });

  it('key가 없으면 key 속성을 만들지 않는다', () => {
    const out = resolveComponents(h(Row, { label: 'x' }));
    expect('key' in out).toBe(false);
  });

  it('목록 안의 컴포넌트가 풀리면 모든 자식이 key를 가져 diff가 key 비교(MOVE)를 한다', () => {
    const list = (order: string[]): VNode =>
      resolveComponents(h('ul', null, order.map((id) => h(Row, { key: id, label: id }))));
    const patches = diff([list(['a', 'b', 'c'])], [list(['b', 'a', 'c'])]);
    expect(patches.map((p) => p.kind)).toEqual(['MOVE']);
  });
});

describe('resolveComponents — 자식 실행 중 Hook 호출은 오류 (P2-08 · T-16)', () => {
  const ROOT_ONLY = 'Hook은 루트 컴포넌트에서만 부를 수 있습니다';

  it('자식이 useState · useEffect · useMemo를 부르면 각각 오류', () => {
    for (const bad of [() => useState(0), () => useEffect(() => {}), () => useMemo(() => 1, [])]) {
      const Bad = (): VNode => {
        bad();
        return h('i', null);
      };
      expect(() => resolveComponents(h(Bad, null))).toThrow(ROOT_ONLY);
    }
  });

  it('깊이 중첩된 자식에서도 오류', () => {
    const Bad = (): VNode => {
      useState(1);
      return h('i', null);
    };
    expect(() => resolveComponents(h('div', null, h('div', null, h(Bad, null))))).toThrow(ROOT_ONLY);
  });

  it('오류가 난 뒤에도 원래 디스패처가 복구된다 (루트 렌더 도중이었다면 그 디스패처)', () => {
    const rootDispatcher: HookDispatcher = {
      useState: ((v: unknown) => [v, () => {}]) as HookDispatcher['useState'],
      useEffect: () => {},
      useMemo: ((f: () => unknown) => f()) as HookDispatcher['useMemo'],
    };
    setHookDispatcher(rootDispatcher);
    const Bad = (): VNode => {
      useState(0);
      return h('i', null);
    };
    expect(() => resolveComponents(h(Bad, null))).toThrow(ROOT_ONLY);
    expect(setHookDispatcher(null)).toBe(rootDispatcher); // 복구돼 있었다
  });

  it('성공했을 때도 원래 디스패처를 되돌려 놓는다 (디스패처가 없었다면 없음 그대로)', () => {
    resolveComponents(h(Greeting, { name: 'x' }));
    expect(() => useState(0)).toThrow('Hook은 함수형 컴포넌트 렌더 중에만'); // null로 돌아와 있음
  });

  it('자식이 일반 예외를 던져도 디스패처가 복구되고 예외는 위로 나간다', () => {
    const Boom = (): VNode => {
      throw new Error('boom');
    };
    expect(() => resolveComponents(h(Boom, null))).toThrow('boom');
    expect(setHookDispatcher(null)).toBeNull();
  });
});

describe('diff — 풀리지 않은 컴포넌트 VNode는 오류', () => {
  it('이전 쪽에 컴포넌트 VNode가 있으면 오류', () => {
    expect(() => diff([h(Greeting, { name: 'a' })], [el('p')])).toThrow('컴포넌트');
  });
  it('새 쪽에 컴포넌트 VNode가 있으면 오류', () => {
    expect(() => diff([el('p')], [h(Greeting, { name: 'a' })])).toThrow('컴포넌트');
  });
  it('안쪽 자식에 있어도 오류', () => {
    expect(() => diff([el('div', {}, el('p'))], [el('div', {}, h(Greeting, { name: 'a' }))])).toThrow('resolveComponents');
  });
  it('풀린 뒤에는 diff가 정상', () => {
    const before = resolveComponents(h('div', null, h(Greeting, { name: 'a' })));
    const after = resolveComponents(h('div', null, h(Greeting, { name: 'b' })));
    expect(diff([before], [after])).toEqual([
      { kind: 'SET_TEXT', path: [0, 0, 0], before: '안녕하세요, a님', after: '안녕하세요, b님' },
    ]);
  });
  it('글자 노드 TEXT_NODE 상수 확인 (풀린 결과의 글자는 #text)', () => {
    expect(resolveComponents(h(Greeting, { name: 'a' })).children[0].type).toBe(TEXT_NODE);
  });
});
