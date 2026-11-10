import { describe, it, expect } from 'vitest';
import { domToVNode, readAreaChildren } from '../domToVNode';
import { renderAreaChildren, renderVNode } from '../renderVNode';
import { comment, el, text } from '../../../../shared/src/__tests__/helpers';

function area(html: string): HTMLElement {
  const box = document.createElement('div');
  box.id = 'box';
  box.setAttribute('class', 'area-attr');
  box.innerHTML = html;
  return box;
}

const SAMPLE = `<section id="card" class="card">
  <h2>제목</h2>
  <!-- 안내 문구 -->
  <p class="note" style="color: red; font-size: 16px">안녕</p>
  <ul>
    <li>하나</li>
    <li>둘</li>
    <li>셋</li>
  </ul>
  <button disabled>잠김</button>
</section>`;

describe('domToVNode', () => {
  it('요소의 태그 종류를 type으로 표현한다 (P1-01)', () => {
    const box = area('<section></section>');
    expect(domToVNode(box.firstChild!)).toEqual(el('section'));
  });

  it('태그 이름은 소문자', () => {
    const box = area('<DIV></DIV>');
    expect(domToVNode(box.firstChild!).type).toBe('div');
  });

  it('텍스트 노드를 TEXT VNode로 만든다 (P1-02)', () => {
    const box = area('안녕');
    expect(domToVNode(box.firstChild!)).toEqual(text('안녕'));
  });

  it('글자 사이 위치를 보존한다: 글자 · 요소 · 글자 (P1-02)', () => {
    const box = area('<p>앞<b>굵게</b>뒤</p>');
    expect(domToVNode(box.firstChild!)).toEqual(el('p', {}, text('앞'), el('b', {}, text('굵게')), text('뒤')));
  });

  it('속성 이름 · 값을 props로 담는다 (P1-03)', () => {
    const box = area('<a href="/x?a=1&amp;b=2" data-id="7" class="a b">링크</a>');
    expect(domToVNode(box.firstChild!).props).toEqual({ href: '/x?a=1&b=2', 'data-id': '7', class: 'a b' });
  });

  it('값 없는 boolean 속성은 값 ""', () => {
    const box = area('<button disabled>잠김</button><input type="checkbox" checked>');
    expect(domToVNode(box.childNodes[0]).props).toEqual({ disabled: '' });
    expect(domToVNode(box.childNodes[1]).props).toEqual({ type: 'checkbox', checked: '' });
  });

  it('style 속성은 StyleMap으로 담는다', () => {
    const box = area('<p style="color: red; font-size: 16px">x</p>');
    expect(domToVNode(box.firstChild!).props).toEqual({ style: { color: 'red', 'font-size': '16px' } });
  });

  it('브라우저가 모르는 style 항목도 StyleMap에 남는다 (CSSOM으로 읽지 않음)', () => {
    const box = area('<p style="background: red; not-a-real-prop: x; --Mine: 1">x</p>');
    expect(domToVNode(box.firstChild!).props).toEqual({
      style: { background: 'red', 'not-a-real-prop': 'x', '--Mine': '1' },
    });
  });

  it('빈 style · 항목이 하나도 없는 style은 props에 두지 않는다 (B21)', () => {
    const box = area('<p style=""></p><p style=";;"></p><p style="color:"></p>');
    for (const child of Array.from(box.childNodes)) {
      expect(domToVNode(child).props).toEqual({});
      expect('style' in domToVNode(child).props).toBe(false);
    }
  });

  it('중첩 구조와 형제 순서를 보존한다 (P1-04)', () => {
    const box = area('<ul><li>a</li><li>b<b>c</b></li><li>d</li></ul>');
    expect(domToVNode(box.firstChild!)).toEqual(
      el('ul', {}, el('li', {}, text('a')), el('li', {}, text('b'), el('b', {}, text('c'))), el('li', {}, text('d'))),
    );
  });

  it('공백만 있는 텍스트 노드를 번호 그대로 남긴다', () => {
    const box = area('<ul>\n  <li>a</li>\n</ul>');
    expect(domToVNode(box.firstChild!)).toEqual(el('ul', {}, text('\n  '), el('li', {}, text('a')), text('\n')));
  });

  it('주석을 주석 VNode로 남긴다', () => {
    const box = area('<div><!-- 안내 --><p>x</p></div>');
    expect(domToVNode(box.firstChild!)).toEqual(el('div', {}, comment(' 안내 '), el('p', {}, text('x'))));
  });

  it('VNode 자식 번호 = 실제 DOM childNodes 번호', () => {
    const box = area(SAMPLE);
    const section = box.firstChild as Element;
    const vnode = domToVNode(section);
    expect(vnode.children.length).toBe(section.childNodes.length);
    vnode.children.forEach((child, i) => {
      const node = section.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) expect(child.props).toEqual({ nodeValue: node.nodeValue });
      else if (node.nodeType === Node.COMMENT_NODE) expect(child.type).toBe('#comment');
      else expect(child.type).toBe((node as Element).localName);
    });
  });

  it('특수문자 텍스트는 글자 그대로 담는다', () => {
    const s = '<b>굵게 아님</b> & &amp; 😀';
    const p = document.createElement('p');
    p.textContent = s;
    expect(domToVNode(p)).toEqual(el('p', {}, text(s)));
  });

  it('샘플 HTML을 읽은 VNode (요약)', () => {
    const box = area(SAMPLE);
    const [section] = readAreaChildren(box);
    expect(section.type).toBe('section');
    expect(section.props).toEqual({ id: 'card', class: 'card' });
    const kinds = section.children.map((c) => c.type);
    expect(kinds).toEqual(['#text', 'h2', '#text', '#comment', '#text', 'p', '#text', 'ul', '#text', 'button', '#text']);
    expect(section.children[5].props).toEqual({ class: 'note', style: { color: 'red', 'font-size': '16px' } });
    expect(section.children[9].props).toEqual({ disabled: '' });
  });

  it('지원하지 않는 노드 종류는 분명한 오류를 낸다', () => {
    expect(() => domToVNode(document)).toThrow(/지원하지/);
  });
});

describe('readAreaChildren', () => {
  it('영역 상자 안 자식 목록 여러 개를 읽는다', () => {
    const box = area('<h1>a</h1><p>b</p>글');
    expect(readAreaChildren(box)).toEqual([el('h1', {}, text('a')), el('p', {}, text('b')), text('글')]);
  });

  it('하나만 있으면 길이 1', () => {
    expect(readAreaChildren(area('<p>x</p>'))).toEqual([el('p', {}, text('x'))]);
  });

  it('0개면 빈 목록', () => {
    expect(readAreaChildren(area(''))).toEqual([]);
  });

  it('영역 상자 자신의 속성은 읽지 않는다', () => {
    const children = readAreaChildren(area('<p>x</p>'));
    expect(JSON.stringify(children)).not.toContain('area-attr');
    expect(JSON.stringify(children)).not.toContain('box');
  });

  it('최상위 공백 · 주석도 읽는다', () => {
    expect(readAreaChildren(area('\n<!-- c -->\n<p>x</p>\n'))).toEqual([
      text('\n'),
      comment(' c '),
      text('\n'),
      el('p', {}, text('x')),
      text('\n'),
    ]);
  });
});

describe('DOM → VNode → DOM 되돌려 그리기 (T-01 · T-02)', () => {
  it('샘플을 되돌려 그린 구조가 원본과 같다', () => {
    const original = area(SAMPLE);
    const vnodes = readAreaChildren(original);
    const copy = area('');
    renderAreaChildren(copy, vnodes);
    expect(copy.innerHTML).toBe(original.innerHTML);
  });

  it('특수문자 · 중첩 · 주석 · boolean 왕복', () => {
    const html = '<div a="&quot;q&quot; &amp; &lt;">x &lt; y <br><!--c--><input disabled value="1"><p>😀 &amp;amp;</p></div>';
    const original = area(html);
    const copy = area('');
    renderAreaChildren(copy, readAreaChildren(original));
    expect(copy.innerHTML).toBe(original.innerHTML);
    expect(readAreaChildren(copy)).toEqual(readAreaChildren(original));
  });

  it('renderVNode로 만든 노드를 다시 읽으면 같은 VNode', () => {
    const vnode = el('p', { class: 'a', style: { color: 'red' }, hidden: '' }, text('글'), comment('c'));
    expect(domToVNode(renderVNode(vnode))).toEqual(vnode);
  });
});
