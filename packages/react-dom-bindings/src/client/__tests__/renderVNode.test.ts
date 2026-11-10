import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderVNode, renderAreaChildren } from '../renderVNode';
import { comment, el, text } from '../../../../shared/src/__tests__/helpers';
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

  it('style이 아닌 객체 props는 속성을 설정하지 않고 console.warn을 낸다 (UT-RV-P4)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const node = renderVNode(deepFreeze(el('div', { data: { a: 1 } }))) as Element;
    expect(node.attributes.length).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('data');
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

describe('renderVNode 주석 · style (Dev-1)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('주석 VNode는 Comment 노드가 된다', () => {
    const node = renderVNode(deepFreeze(comment(' 안내 문구 ')));
    expect(node.nodeType).toBe(Node.COMMENT_NODE);
    expect(node.nodeValue).toBe(' 안내 문구 ');
  });

  it('주석 안의 < · &는 그대로 남는다', () => {
    const node = renderVNode(deepFreeze(el('div', {}, comment(' <b> & '))));
    expect(node.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
    expect(node.childNodes[0].nodeValue).toBe(' <b> & ');
  });

  it('style StyleMap은 경고 없이 style 속성 글이 된다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const node = renderVNode(deepFreeze(el('p', { style: { color: 'red', 'font-size': '16px' } }))) as Element;
    expect(node.getAttribute('style')).toBe('color: red; font-size: 16px');
    expect(warn).not.toHaveBeenCalled();
  });

  it('브라우저가 모르는 style 항목도 속성 글에 그대로 남는다 (CSSOM으로 쓰지 않음)', () => {
    const node = renderVNode(deepFreeze(el('p', { style: { 'not-a-real-prop': 'x', '--Mine': '1' } }))) as Element;
    expect(node.getAttribute('style')).toBe('not-a-real-prop: x; --Mine: 1');
  });

  it('빈 style 묶음은 style 속성을 만들지 않는다', () => {
    const node = renderVNode(deepFreeze(el('p', { style: {} }))) as Element;
    expect(node.hasAttribute('style')).toBe(false);
  });

  it('style이 문자열이면 보통 속성으로 설정한다', () => {
    const node = renderVNode(deepFreeze(el('p', { style: 'color: blue' }))) as Element;
    expect(node.getAttribute('style')).toBe('color: blue');
  });
});

describe('renderAreaChildren', () => {
  function makeArea(): HTMLElement {
    const area = document.createElement('div');
    area.id = 'area';
    area.setAttribute('class', 'box');
    return area;
  }

  it('여러 개의 최상위 자식을 순서대로 그린다', () => {
    const area = makeArea();
    renderAreaChildren(area, deepFreeze([el('h2', {}, text('제목')), el('p', {}, text('글'))]));
    expect(area.innerHTML).toBe('<h2>제목</h2><p>글</p>');
  });

  it('0개면 영역을 비운다', () => {
    const area = makeArea();
    area.innerHTML = '<p>옛 내용</p>';
    renderAreaChildren(area, []);
    expect(area.childNodes.length).toBe(0);
  });

  it('이전 내용을 완전히 바꾼다', () => {
    const area = makeArea();
    renderAreaChildren(area, [el('p', {}, text('1'))]);
    renderAreaChildren(area, [el('b', {}, text('2'))]);
    expect(area.innerHTML).toBe('<b>2</b>');
  });

  it('공백 텍스트 · 주석을 번호 그대로 유지한다', () => {
    const area = makeArea();
    renderAreaChildren(area, deepFreeze([text('\n  '), comment(' c '), el('p'), text('\n')]));
    expect(area.childNodes.length).toBe(4);
    expect(area.childNodes[0].nodeValue).toBe('\n  ');
    expect(area.childNodes[1].nodeType).toBe(Node.COMMENT_NODE);
    expect(area.childNodes[2].nodeName).toBe('P');
    expect(area.childNodes[3].nodeValue).toBe('\n');
  });

  it('영역 상자 자신(id · class)은 그대로 둔다', () => {
    const area = makeArea();
    renderAreaChildren(area, [el('p')]);
    expect(area.id).toBe('area');
    expect(area.getAttribute('class')).toBe('box');
  });
});
