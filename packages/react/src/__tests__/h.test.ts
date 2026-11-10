import { describe, it, expect } from 'vitest';
import { h } from '../h';
import { el, text } from '../../../shared/src/__tests__/helpers';
import type { Props, VNode, VNodeChild } from '@mini-react/shared';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

describe('h()', () => {
  it('h(div, props, ...children)는 요소 VNode를 만든다 (UT-H-01)', () => {
    const props = deepFreeze({ id: 'a', class: 'x' });
    const child = deepFreeze(el('span'));
    expect(h('div', props, child)).toEqual(el('div', { id: 'a', class: 'x' }, el('span')));
  });

  it('문자열 · 숫자 자식을 #text VNode로 바꾼다 (UT-H-02)', () => {
    expect(h('p', null, 'hi', 7, 0)).toEqual(el('p', {}, text('hi'), text('7'), text('0')));
  });

  it('중첩 배열 자식을 평탄화한다 (UT-H-03)', () => {
    const kids = deepFreeze(['a', ['b', ['c']]]) as unknown as VNodeChild[];
    expect(h('p', null, kids)).toEqual(el('p', {}, text('a'), text('b'), text('c')));
  });

  it('null · undefined · boolean 자식은 무시한다 (UT-H-04)', () => {
    expect(h('p', null, null, undefined, true, false, 'x')).toEqual(el('p', {}, text('x')));
  });

  it('props가 null이면(생략 포함) 빈 객체로 만든다 (UT-H-05)', () => {
    expect(h('div', null).props).toEqual({});
    expect(h('div').props).toEqual({});
  });

  it('함수 type은 컴포넌트 VNode로 표현하고 호출하지 않는다 (UT-H-06)', () => {
    let called = false;
    const Comp = (_props: Props): VNode => {
      called = true;
      return el('div');
    };
    const v = h(Comp, deepFreeze({ a: 1 }), 'kid');
    expect(v.type).toBe(Comp);
    expect(v.props).toEqual({ a: 1 });
    expect(v.children).toEqual([text('kid')]);
    expect(called).toBe(false);
  });

  it('key를 props에서 꺼내 vnode.key에 두고, 없으면 key 속성이 없다 (UT-H-07)', () => {
    const withKey = h('li', deepFreeze({ key: 'k1', id: 'a' }));
    expect(withKey.key).toBe('k1');
    expect(withKey.props).toEqual({ id: 'a' });
    expect(h('li', deepFreeze({ key: 3 })).key).toBe(3);
    expect('key' in h('li', deepFreeze({ id: 'a' }))).toBe(false);
  });
});
