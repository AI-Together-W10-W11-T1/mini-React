import { describe, it, expect, afterEach } from 'vitest';
import { setAreaHtml } from '../setAreaHtml';
import { readAreaChildren } from '../domToVNode';
import { comment, el, text } from '../../../../shared/src/__tests__/helpers';

// [AI Note]: 이 jsdom 설정은 인라인 핸들러 · 스크립트를 실제로 실행하지 않는다(`runScripts` 꺼짐).
// 그래서 `__pwned`가 정의되지 않았다는 확인은 보조일 뿐이고, 핵심 확인은 "영역에 그 속성 · 요소가 남지 않았다"이다.
// 실제 브라우저에서 코드가 안 도는지는 e2e(Dev-16)가 본다.
const globals = window as unknown as { __pwned?: unknown };

function makeArea(): HTMLElement {
  const box = document.createElement('div');
  box.id = 'test-area';
  box.setAttribute('class', 'area-attr');
  document.body.appendChild(box);
  return box;
}

afterEach(() => {
  document.body.replaceChildren();
  delete globals.__pwned;
});

describe('setAreaHtml — 정상 HTML은 그대로 그린다', () => {
  it('나머지 속성 · 구조 · 공백 · 주석 · 인라인 style 속성은 그대로', () => {
    const box = makeArea();
    setAreaHtml(box, '<section id="card">\n  <!-- 안내 -->\n  <p class="note" style="color: red">안녕</p>\n  <button disabled>잠김</button>\n</section>');
    expect(readAreaChildren(box)).toEqual([
      el(
        'section',
        { id: 'card' },
        text('\n  '),
        comment(' 안내 '),
        text('\n  '),
        el('p', { class: 'note', style: { color: 'red' } }, text('안녕')),
        text('\n  '),
        el('button', { disabled: '' }, text('잠김')),
        text('\n'),
      ),
    ]);
  });

  it('최상위가 여러 개여도 그린다', () => {
    const box = makeArea();
    setAreaHtml(box, '앞<b>가운데</b>뒤');
    expect(readAreaChildren(box)).toEqual([text('앞'), el('b', {}, text('가운데')), text('뒤')]);
  });

  it('빈 글 → 영역을 비운다', () => {
    const box = makeArea();
    setAreaHtml(box, '<p>있음</p>');
    setAreaHtml(box, '');
    expect(box.childNodes.length).toBe(0);
  });

  it('영역 상자 자신(id · class)은 그대로', () => {
    const box = makeArea();
    setAreaHtml(box, '<p>글</p>');
    expect(box.id).toBe('test-area');
    expect(box.getAttribute('class')).toBe('area-attr');
  });

  it('다시 호출하면 이전 내용이 완전히 바뀐다', () => {
    const box = makeArea();
    setAreaHtml(box, '<p>하나</p><p>둘</p>');
    setAreaHtml(box, '<h1>새로</h1>');
    expect(box.innerHTML).toBe('<h1>새로</h1>');
  });

  it('특수문자 글자는 마크업이 아니라 글자로 보인다', () => {
    const box = makeArea();
    setAreaHtml(box, '<p>&lt;b&gt;굵게 아님&lt;/b&gt; &amp; 😀</p>');
    expect(box.querySelector('b')).toBeNull();
    expect(box.textContent).toBe('<b>굵게 아님</b> & 😀');
  });
});

describe('setAreaHtml — 위험한 것을 빼고 그린다 (§5 실행 가능한 HTML)', () => {
  it('on… 속성 제거 (대소문자 섞어도)', () => {
    const box = makeArea();
    setAreaHtml(box, '<div ONCLICK="window.__pwned=1" onMouseOver="window.__pwned=2" id="a">글</div>');
    const div = box.firstElementChild!;
    expect(div.getAttributeNames()).toEqual(['id']);
    expect(globals.__pwned).toBeUndefined();
  });

  it('<script> 제거', () => {
    const box = makeArea();
    setAreaHtml(box, '<p>앞</p><script>window.__pwned=1</script><p>뒤</p>');
    expect(box.querySelector('script')).toBeNull();
    expect(box.children.length).toBe(2);
    expect(globals.__pwned).toBeUndefined();
  });

  it.each([
    ['href', 'a', 'javascript:window.__pwned=1'],
    ['src', 'img', 'javascript:window.__pwned=1'],
    ['action', 'form', 'javascript:window.__pwned=1'],
    ['formaction', 'button', 'javascript:window.__pwned=1'],
    ['href', 'a', '  JavaScript:window.__pwned=1'],
    ['href', 'a', '\u0001\u0002javascript:window.__pwned=1'],
  ])('javascript: 주소 제거 — %s on <%s> %j', (attribute, tag, value) => {
    const box = makeArea();
    // 값을 그대로 HTML 글로 만들어 넣는다 (따옴표 · 제어문자 포함)
    setAreaHtml(box, `<${tag} ${attribute}="${value}">x</${tag}>`);
    expect(box.firstElementChild!.hasAttribute(attribute)).toBe(false);
  });

  it('javascript:를 숨긴 것(B12): 문자 참조 · 탭 · 줄바꿈 · 앞 공백 + 대문자 모두 href가 빠진다', () => {
    const box = makeArea();
    setAreaHtml(
      box,
      [
        '<a href="jav&#x61;script:window.__pwned=1">1</a>',
        '<a href="&#106;avascript:window.__pwned=1">2</a>',
        '<a href="java\tscript:window.__pwned=1">3</a>',
        '<a href="java\nscript:window.__pwned=1">4</a>',
        '<a href=" JAVA\tscript:window.__pwned=1">5</a>',
        '<a href="https://example.com/ok">정상</a>',
      ].join(''),
    );
    const anchors = Array.from(box.querySelectorAll('a'));
    expect(anchors.map((a) => a.hasAttribute('href'))).toEqual([false, false, false, false, false, true]);
    expect(globals.__pwned).toBeUndefined();
  });

  it('javascript:가 아닌 주소는 그대로 둔다', () => {
    const box = makeArea();
    setAreaHtml(box, '<a href="/javascript:x">a</a><a href="#top">b</a><img src="data:image/png;base64,AAAA">');
    expect(box.querySelectorAll('[href], [src]').length).toBe(3);
  });

  it('<iframe> 제거 — srcdoc 안에 <script>parent.__pwned=1</script>가 있어도 영역에 안 남고 실행되지 않는다 (B11 · C3)', () => {
    const box = makeArea();
    setAreaHtml(box, '<iframe srcdoc="&lt;script&gt;parent.__pwned=1&lt;/script&gt;"></iframe><p>뒤</p>');
    expect(box.querySelector('iframe')).toBeNull();
    expect(box.children.length).toBe(1);
    expect(globals.__pwned).toBeUndefined();
  });

  it('<iframe src> · <object> · <embed> 제거 (C3)', () => {
    const box = makeArea();
    setAreaHtml(box, '<iframe src="https://example.com"></iframe><object data="x.swf"></object><embed src="x.swf"><p>남음</p>');
    expect(box.innerHTML).toBe('<p>남음</p>');
  });

  it('<style> 제거 (C5)', () => {
    const box = makeArea();
    setAreaHtml(box, '<style>body{display:none}</style><p>글</p>');
    expect(box.querySelector('style')).toBeNull();
    expect(box.innerHTML).toBe('<p>글</p>');
  });

  it('<link rel="stylesheet"> 제거 — rel="Stylesheet" · "alternate stylesheet" 포함 (C5)', () => {
    const box = makeArea();
    setAreaHtml(box, '<link rel="stylesheet" href="a.css"><link rel="Stylesheet" href="b.css"><link rel="alternate stylesheet" href="c.css"><p>글</p>');
    expect(box.querySelector('link')).toBeNull();
    expect(box.innerHTML).toBe('<p>글</p>');
  });

  it('<link rel="icon"> 등 다른 rel은 그대로 둔다 (C5)', () => {
    const box = makeArea();
    setAreaHtml(box, '<link rel="icon" href="a.ico"><link rel="preload" href="b">');
    expect(box.querySelectorAll('link').length).toBe(2);
  });

  it('글을 <template>로 파싱한 뒤 옮기므로 파싱 중에 코드가 실행되지 않는다 (<img onerror>)', () => {
    const box = makeArea();
    setAreaHtml(box, '<img src="x" onerror="window.__pwned=1"><img src="y" onload="window.__pwned=2">');
    expect(globals.__pwned).toBeUndefined();
    expect(box.querySelectorAll('img').length).toBe(2);
    expect(box.querySelector('img')!.hasAttribute('onerror')).toBe(false);
  });
});
