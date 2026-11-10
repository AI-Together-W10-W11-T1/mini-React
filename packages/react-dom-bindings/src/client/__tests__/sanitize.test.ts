import { describe, it, expect } from 'vitest';
import { removeDangerous, scanDangerous } from '../sanitize';

// 파서가 글을 읽은 뒤의 모습으로 검사한다. 살아 있는 문서에 넣지 않고 <template> 안에서 읽는다
function parse(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
}

function summarize(html: string): string[] {
  return scanDangerous(parse(html)).map((f) => (f.attribute === null ? `<${f.element}>` : `<${f.element}> ${f.attribute}`));
}

describe('scanDangerous — 미리보기에서 빼고 Patch 때 막는 단 하나의 기준', () => {
  it('정상 HTML은 빈 목록', () => {
    expect(summarize('<div class="a" style="color:red"><p>글</p><a href="https://example.com">링크</a></div>')).toEqual([]);
  });

  it('on… 속성 (대소문자 무시)', () => {
    expect(summarize('<div ONCLICK="a()" onMouseOver="b()" id="x"></div>')).toEqual(['<div> onclick', '<div> onmouseover']);
  });

  it('차단 요소: script · iframe · object · embed · style', () => {
    expect(summarize('<script>1</script><iframe></iframe><object></object><embed><style>a{}</style>')).toEqual([
      '<script>',
      '<iframe>',
      '<object>',
      '<embed>',
      '<style>',
    ]);
  });

  it('<link rel="stylesheet">만 차단 (rel 낱말 중 stylesheet, 대소문자 무시)', () => {
    expect(summarize('<link rel="stylesheet" href="a.css"><link rel="Stylesheet"><link rel="alternate stylesheet">')).toEqual([
      '<link>',
      '<link>',
      '<link>',
    ]);
    expect(summarize('<link rel="icon" href="a.ico"><link href="a"><link rel="preload stylesheeted">')).toEqual([]);
  });

  it('javascript: 주소 — href · src · action · formaction만', () => {
    expect(
      summarize(
        '<a href="javascript:a()"></a><img src="javascript:b()"><form action="javascript:c()"><button formaction="javascript:d()"></button></form>',
      ),
    ).toEqual(['<a> href', '<img> src', '<form> action', '<button> formaction']);
    expect(summarize('<a title="javascript:a()" data-x="javascript:b()">javascript:c()</a>')).toEqual([]);
  });

  it('SVG <a xlink:href="javascript:…">도 찾는다 (한정 이름 xlink:href)', () => {
    expect(summarize('<svg><a xlink:href="javascript:x"><text y="1">t</text></a><a xlink:href="https://example.com"></a></svg>')).toEqual([
      '<a> xlink:href',
    ]);
  });

  it('javascript: 판정은 파서가 읽은 값으로: 문자 참조 · 탭 · 줄바꿈 · 앞 공백 · 대문자', () => {
    expect(summarize('<a href="jav&#x61;script:x"></a>')).toEqual(['<a> href']);
    expect(summarize('<a href="&#106;avascript:x"></a>')).toEqual(['<a> href']);
    expect(summarize('<a href="java\tscript:x"></a>')).toEqual(['<a> href']);
    expect(summarize('<a href="java\nscript:x"></a>')).toEqual(['<a> href']);
    expect(summarize('<a href=" JAVA\tscript:x"></a>')).toEqual(['<a> href']);
    expect(summarize('<a href="\u0001\u0002javascript:x"></a>')).toEqual(['<a> href']);
  });

  it('javascript:가 아닌 비슷한 값은 그대로 둔다', () => {
    expect(summarize('<a href="/javascript:x"></a><a href="java script:x"></a><a href="#javascript:x"></a>')).toEqual([]);
  });

  it('차단 요소 안의 것은 따로 세지 않는다 (요소째 빠지므로)', () => {
    expect(summarize('<object><img onerror="a()"></object>')).toEqual(['<object>']);
  });

  it('<template> 안(비활성 내용)도 훑는다', () => {
    expect(summarize('<template><img onerror="a()"></template>')).toEqual(['<img> onerror']);
  });

  it('깊이 중첩된 곳도 찾는다 (스택 넘침 없음)', () => {
    const depth = 300;
    const html = '<div>'.repeat(depth) + '<a href="javascript:x"></a>' + '</div>'.repeat(depth);
    expect(summarize(html)).toEqual(['<a> href']);
  });

  it('찾기만 하고 DOM은 고치지 않는다', () => {
    const fragment = parse('<div onclick="a()"><script>1</script></div>');
    scanDangerous(fragment);
    expect((fragment.firstChild as Element).getAttribute('onclick')).toBe('a()');
    expect(fragment.querySelector('script')).not.toBeNull();
  });
});

describe('removeDangerous', () => {
  it('찾은 속성은 빼고, 요소는 통째로 뺀다. 나머지는 그대로', () => {
    const fragment = parse('<div id="a" onclick="x()"><script>1</script><p class="k">글</p><iframe src="a"></iframe></div>');
    const removed = removeDangerous(fragment);
    expect(removed.map((f) => (f.attribute === null ? f.element : `${f.element}.${f.attribute}`))).toEqual([
      'div.onclick',
      'script',
      'iframe',
    ]);
    const div = fragment.firstChild as Element;
    expect(div.outerHTML).toBe('<div id="a"><p class="k">글</p></div>');
  });
});
