import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderVNode } from '../renderVNode';
import { el, text } from '../../../../shared/src/__tests__/helpers';
import type { VNode } from '@mini-react/shared';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

describe('renderVNode', () => {
  it('요소 VNode로 같은 태그의 Element를 만든다 (UT-RV-01)', () => {
    const node = renderVNode(deepFreeze(el('section')));
    expect(node.nodeType).toBe(Node.ELEMENT_NODE);
    expect((node as Element).tagName.toLowerCase()).toBe('section');
  });

  it('props를 속성으로 설정한다 (UT-RV-02)', () => {
    const node = renderVNode(deepFreeze(el('div', { id: 'a', class: 'x y', tabindex: 3 }))) as Element;
    expect(node.getAttribute('id')).toBe('a');
    expect(node.getAttribute('class')).toBe('x y');
    expect(node.getAttribute('tabindex')).toBe('3');
  });

  it('#text VNode로 Text 노드를 만든다 (UT-RV-03)', () => {
    const node = renderVNode(deepFreeze(text('안녕')));
    expect(node.nodeType).toBe(Node.TEXT_NODE);
    expect(node.nodeValue).toBe('안녕');
  });

  it('중첩 자식을 순서대로 붙인다 (UT-RV-04)', () => {
    const vnode: VNode = deepFreeze(el('ul', {}, el('li', {}, text('a')), el('li', {}, text('b'), el('b', {}, text('c')))));
    const node = renderVNode(vnode) as Element;
    expect(node.outerHTML).toBe('<ul><li>a</li><li>b<b>c</b></li></ul>');
  });
});

describe('renderVNode props 규칙', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('true props는 빈 문자열 속성으로 설정한다 (UT-RV-P1)', () => {
    const node = renderVNode(deepFreeze(el('input', { disabled: true }))) as Element;
    expect(node.getAttribute('disabled')).toBe('');
  });

  it('false · null · undefined props는 속성을 설정하지 않는다 (UT-RV-P2)', () => {
    const node = renderVNode(deepFreeze(el('li', { hidden: false, a: null, b: undefined }))) as Element;
    expect(node.attributes.length).toBe(0);
  });

  it('함수 props는 속성을 설정하지 않고 console.warn을 낸다 (UT-RV-P3)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const node = renderVNode(deepFreeze(el('button', { onClick: () => {} }))) as Element;
    expect(node.attributes.length).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('onClick');
    expect(String(warn.mock.calls[0][0])).toContain('button');
  });

  it('객체 props는 속성을 설정하지 않고 console.warn을 낸다 (UT-RV-P4)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const node = renderVNode(deepFreeze(el('div', { style: { color: 'red' } }))) as Element;
    expect(node.attributes.length).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('style');
  });

  it('컴포넌트 VNode는 명확한 메시지로 오류를 낸다 (UT-RV-P5)', () => {
    const vnode: VNode = deepFreeze({ type: () => el('div'), props: {}, children: [] });
    expect(() => renderVNode(vnode)).toThrow(/컴포넌트/);
  });

  it('텍스트에 < · &가 있어도 마크업이 아니라 텍스트 노드로 만든다 (UT-RV-P6)', () => {
    const s = '<b>굵게 아님</b> & &amp;';
    const node = renderVNode(deepFreeze(el('p', {}, text(s)))) as Element;
    expect(node.querySelector('b')).toBeNull();
    expect(node.textContent).toBe(s);
  });
});
