import { describe, it, expect } from 'vitest';
import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, VNode } from '@mini-react/shared';
import { readAreaChildren } from '../domToVNode';
import { vnodesToHtml } from '../vnodesToHtml';
import { comment, el, text } from '../../../../shared/src/__tests__/helpers';

function area(html: string): HTMLElement {
  const box = document.createElement('div');
  box.innerHTML = html;
  return box;
}

// [테스트용 도우미] 나란히 붙은 글자 노드는 HTML 글로 쓰면 하나로 합쳐지므로(B19),
// 왕복 비교 전에 인접한 글자 노드를 합치고 빈 글자("")는 버린다. DOM에서 읽은 VNode에는 이런 경우가 생기지 않는다.
function mergeAdjacentText(nodes: readonly VNode[]): VNode[] {
  const out: VNode[] = [];
  for (const node of nodes) {
    if (node.type === TEXT_NODE) {
      const value = (node.props as { nodeValue: string }).nodeValue;
      if (value === '') continue;
      const last = out[out.length - 1];
      if (last !== undefined && last.type === TEXT_NODE) {
        out[out.length - 1] = text((last.props as { nodeValue: string }).nodeValue + value);
        continue;
      }
      out.push(text(value));
    } else if (typeof node.type === 'string' && node.type !== COMMENT_NODE) {
      out.push({ ...node, children: mergeAdjacentText(node.children) });
    } else {
      out.push(node);
    }
  }
  return out;
}

/** VNode → HTML 글 → 파싱 → domToVNode. 왕복 결과 */
function roundTrip(children: AreaChildren): AreaChildren {
  return readAreaChildren(area(vnodesToHtml(children)));
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

describe('vnodesToHtml', () => {
  it('요소 · 글자를 HTML 글로 쓴다', () => {
    expect(vnodesToHtml([el('p', {}, text('안녕'))])).toBe('<p>안녕</p>');
  });

  it('공백 텍스트 · 줄바꿈을 그대로 쓴다 (결정 5 B)', () => {
    const children = [el('ul', {}, text('\n  '), el('li', {}, text('하나')), text('\n'))];
    expect(vnodesToHtml(children)).toBe('<ul>\n  <li>하나</li>\n</ul>');
  });

  it('주석을 <!--…-->로 쓴다', () => {
    expect(vnodesToHtml([comment(' 안내 '), el('p')])).toBe('<!-- 안내 --><p></p>');
  });

  it('값 있는 속성은 name="value"로 쓴다', () => {
    expect(vnodesToHtml([el('a', { href: '/x', class: 'link' })])).toBe('<a href="/x" class="link"></a>');
  });

  it('속성 값의 & · "를 이스케이프한다', () => {
    expect(vnodesToHtml([el('a', { title: 'a & "b"' })])).toBe('<a title="a &amp; &quot;b&quot;"></a>');
  });

  it('boolean 속성(값 "")은 name=""로 쓴다', () => {
    expect(vnodesToHtml([el('button', { disabled: '' }, text('잠김'))])).toBe('<button disabled="">잠김</button>');
  });

  it('style StyleMap은 style 속성 글로 쓴다', () => {
    const html = vnodesToHtml([el('p', { style: { color: 'red', 'font-size': '16px' } })]);
    expect(html).toBe('<p style="color: red; font-size: 16px"></p>');
  });

  it('빈 style 묶음이면 style 속성을 쓰지 않는다 (B21)', () => {
    expect(vnodesToHtml([el('p', { style: {} })])).toBe('<p></p>');
  });

  it('style 값 안의 따옴표도 속성 값으로 이스케이프되어 왕복한다', () => {
    const children = [el('p', { style: { 'font-family': '"Noto Sans", serif' } })];
    expect(roundTrip(children)).toEqual(children);
  });

  it('빈 태그(br hr img input …)는 닫는 태그를 쓰지 않는다', () => {
    expect(vnodesToHtml([el('br'), el('hr'), el('img', { src: 'a.png' }), el('input', { type: 'text' })])).toBe(
      '<br><hr><img src="a.png"><input type="text">',
    );
  });

  it('텍스트의 < > &를 이스케이프한다 (특수문자)', () => {
    const value = '<b>굵게 아님</b> & &amp; 😀';
    expect(vnodesToHtml([el('p', {}, text(value))])).toBe('<p>&lt;b&gt;굵게 아님&lt;/b&gt; &amp; &amp;amp; 😀</p>');
    expect(roundTrip([el('p', {}, text(value))])).toEqual([el('p', {}, text(value))]);
  });

  it('pre · textarea는 첫 줄바꿈이 파서에 먹히지 않게 보존한다', () => {
    const children = [el('pre', {}, text('\n첫 줄')), el('textarea', {}, text('\n둘째'))];
    expect(roundTrip(children)).toEqual(children);
  });

  it('pre의 첫 글자가 줄바꿈이 아니면 그대로 쓴다', () => {
    expect(vnodesToHtml([el('pre', {}, text('줄\n바꿈'))])).toBe('<pre>줄\n바꿈</pre>');
  });

  it('최상위 0개 → 빈 글, 여러 개 → 이어 붙임', () => {
    expect(vnodesToHtml([])).toBe('');
    expect(vnodesToHtml([text('앞'), el('b', {}, text('가운데')), comment('c'), text('뒤')])).toBe('앞<b>가운데</b><!--c-->뒤');
  });

  it('props 값 정규화: 숫자 → 문자열, true → "", false · null · undefined · 함수는 쓰지 않는다', () => {
    const html = vnodesToHtml([el('div', { tabindex: 3, hidden: true, a: false, b: null, c: undefined, d: () => 1 })]);
    expect(html).toBe('<div tabindex="3" hidden=""></div>');
  });

  it('key는 HTML 글에 쓰지 않는다', () => {
    expect(vnodesToHtml([{ ...el('li', {}, text('a')), key: 1 }])).toBe('<li>a</li>');
  });

  it('컴포넌트 VNode는 쓸 수 없다', () => {
    expect(() => vnodesToHtml([{ type: () => el('div'), props: {}, children: [] }])).toThrow();
  });

  describe('왕복 (HTML 글 → 파싱 → domToVNode)', () => {
    it('샘플을 읽은 VNode를 글로 쓰고 다시 읽으면 같다', () => {
      const vnodes = readAreaChildren(area(SAMPLE));
      expect(roundTrip(vnodes)).toEqual(vnodes);
    });

    it('샘플은 글로도 원문과 같다 (style 항목 사이 구분자 형식까지)', () => {
      expect(vnodesToHtml(readAreaChildren(area(SAMPLE)))).toBe(SAMPLE.replace('<button disabled>', '<button disabled="">'));
    });

    it('중첩 · 주석 · 최상위 여러 개 · 특수문자가 섞인 입력', () => {
      const html =
        '앞<!-- c1 --><div id="a" data-x="1 &amp; 2"><span>&lt;tag&gt;</span><br><img src="x.png" alt=\'q"q\'></div>\n<p>😀 &amp;amp; </p>끝';
      const vnodes = readAreaChildren(area(html));
      expect(roundTrip(vnodes)).toEqual(vnodes);
    });

    it('표 · 목록 · 폼 요소', () => {
      const html =
        '<table><tbody><tr><td>1</td><td>2</td></tr></tbody></table><form><input type="checkbox" checked><select><option selected>a</option></select></form>';
      const vnodes = readAreaChildren(area(html));
      expect(roundTrip(vnodes)).toEqual(vnodes);
    });
  });

  describe('원문 글 요소 (B18, 변환기 견고성 — 페이지에서는 <style>이 막힘)', () => {
    it('<style> 안의 a > b · &는 이스케이프하지 않고 그대로 쓴다', () => {
      const children = [el('style', {}, text('a > b { content: "&"; }'))];
      expect(vnodesToHtml(children)).toBe('<style>a > b { content: "&"; }</style>');
      expect(roundTrip(children)).toEqual(children);
    });

    it('<script> 안도 이스케이프하지 않는다', () => {
      const children = [el('script', {}, text('if (a < b && c > d) {}'))];
      expect(vnodesToHtml(children)).toBe('<script>if (a < b && c > d) {}</script>');
      expect(roundTrip(children)).toEqual(children);
    });

    it('<textarea> 안은 이스케이프한다 (&gt; → 글자 > 로 읽힘) — 원문 글 요소와 대비', () => {
      const children = [el('textarea', {}, text('a > b & c'))];
      expect(vnodesToHtml(children)).toBe('<textarea>a &gt; b &amp; c</textarea>');
      expect(roundTrip(children)).toEqual(children);
    });
  });

  describe('인접한 글자 노드 (B19)', () => {
    it('글자 노드 "a" · "b"는 글 ab로 합쳐진다', () => {
      expect(vnodesToHtml([el('p', {}, text('a'), text('b'))])).toBe('<p>ab</p>');
    });

    it('왕복 비교는 인접 글자 노드를 합친 뒤 한다 (mergeAdjacentText)', () => {
      const children = [el('p', {}, text('a'), text('b'), el('b', {}, text('c'), text(''), text('d')), text('e'), text('f'))];
      expect(roundTrip(children)).toEqual(mergeAdjacentText(children));
      expect(mergeAdjacentText(children)).toEqual([el('p', {}, text('ab'), el('b', {}, text('cd')), text('ef'))]);
    });

    it('DOM에서 읽은 VNode에는 인접 글자 노드가 생기지 않는다', () => {
      const vnodes = readAreaChildren(area('a<b>c</b>d &amp; e'));
      expect(mergeAdjacentText(vnodes)).toEqual(vnodes);
    });
  });
});
