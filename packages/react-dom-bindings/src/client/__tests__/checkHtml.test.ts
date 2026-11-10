import { describe, it, expect } from 'vitest';
import { checkHtml, formatProblems } from '../checkHtml';
import type { HtmlProblem } from '../checkHtml';
import { scanHtml } from '../htmlScan';
import { readAreaChildren } from '../domToVNode';
import { vnodesToHtml } from '../vnodesToHtml';
import { comment, el, text } from '../../../../shared/src/__tests__/helpers';

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

function kinds(html: string): string[] {
  return checkHtml(html).map((p) => p.kind);
}

describe('checkHtml 1 — 위험 코드', () => {
  it('on… 속성이 있으면 DANGEROUS (속성 이름이 메시지에 들어감)', () => {
    const problems = checkHtml('<img src="a.png" onerror="alert(1)">');
    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe('DANGEROUS');
    expect(problems[0].message).toContain('<img>');
    expect(problems[0].message).toContain('onerror');
  });

  it('<script>가 있으면 DANGEROUS', () => {
    const problems = checkHtml('<p>글</p><script>alert(1)</script>');
    expect(problems.map((p) => p.kind)).toEqual(['DANGEROUS']);
    expect(problems[0].message).toContain('<script>');
  });

  it('javascript: 주소가 있으면 DANGEROUS', () => {
    const problems = checkHtml('<a href="javascript:alert(1)">링크</a>');
    expect(problems.map((p) => p.kind)).toEqual(['DANGEROUS']);
    expect(problems[0].message).toContain('href');
    expect(problems[0].message).toContain('javascript:');
  });

  it('숨긴 javascript:(문자 참조 · 값 안 탭 · 앞 공백 + 대문자)도 DANGEROUS — 파싱한 뒤의 값으로 검사 (B12)', () => {
    expect(kinds('<a href="jav&#x61;script:alert(1)">1</a>')).toEqual(['DANGEROUS']);
    expect(kinds('<a href="&#106;avascript:alert(1)">2</a>')).toEqual(['DANGEROUS']);
    expect(kinds('<a href="java\tscript:alert(1)">3</a>')).toEqual(['DANGEROUS']);
    expect(kinds('<a href=" JAVA\tscript:alert(1)">4</a>')).toEqual(['DANGEROUS']);
  });

  it('SVG <a xlink:href="javascript:…">도 DANGEROUS이고 xlink:href가 메시지에 들어간다 (검수 1회차 B-3)', () => {
    const problems = checkHtml('<svg><a xlink:href="javascript:alert(1)"><text y="20">x</text></a></svg>');
    expect(problems.map((p) => p.kind)).toContain('DANGEROUS');
    const dangerous = problems.find((p) => p.kind === 'DANGEROUS')!;
    expect(dangerous.message).toContain('xlink:href');
    expect(dangerous.message).toContain('javascript:');
  });

  it('<iframe srcdoc="<script>…">도 DANGEROUS이고 요소 이름이 들어간다 (B11 · C3)', () => {
    const problems = checkHtml('<iframe srcdoc="&lt;script&gt;parent.__pwned=1&lt;/script&gt;"></iframe>');
    expect(problems.map((p) => p.kind)).toEqual(['DANGEROUS']);
    expect(problems[0].message).toContain('<iframe>');
  });

  it('<object> · <embed> · <style> · <link rel="stylesheet">도 DANGEROUS이고 알림 글에 요소 이름이 들어간다 (C3 · C5)', () => {
    const problems = checkHtml('<object data="x"></object><embed src="x"><style>p{}</style><link rel="stylesheet" href="a.css">');
    expect(problems.map((p) => p.kind)).toEqual(['DANGEROUS', 'DANGEROUS', 'DANGEROUS', 'DANGEROUS']);
    const text = formatProblems(problems);
    expect(text).toContain('<object>');
    expect(text).toContain('<embed>');
    expect(text).toContain('<style>');
    expect(text).toContain('<link rel="stylesheet">');
  });

  it('<meta http-equiv="refresh"> · <base>도 DANGEROUS이고 알림 글에 요소 이름이 들어간다 (검수 1회차 NB-4)', () => {
    const problems = checkHtml('<meta http-equiv="Refresh" content="0;url=https://example.com"><base href="https://example.com/">');
    expect(problems.map((p) => p.kind)).toEqual(['DANGEROUS', 'DANGEROUS']);
    const text = formatProblems(problems);
    expect(text).toContain('<meta http-equiv="refresh">');
    expect(text).toContain('<base>');
  });

  it('다른 <meta>(charset · name · 다른 http-equiv)는 문제 없음 (검수 1회차 NB-4)', () => {
    expect(checkHtml('<meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="content-type" content="text/html">')).toEqual([]);
  });

  it('<link rel="icon">은 문제 없음 (C5)', () => {
    expect(checkHtml('<link rel="icon" href="a.ico">')).toEqual([]);
  });
});

describe('checkHtml 1 — SVG 미지원', () => {
  it('<svg>가 있으면 SVG 문제', () => {
    const problems = checkHtml('<svg width="10" height="10"><circle cx="5" cy="5" r="4"/></svg>');
    expect(problems.map((p) => p.kind)).toEqual(['SVG']);
    expect(problems[0].message).toContain('<svg>');
  });

  it('대소문자를 섞어도 SVG 문제 (<SVG>, <Svg>)', () => {
    expect(kinds('<SVG></SVG>')).toEqual(['SVG']);
    expect(kinds('<div><Svg><g><path d="M0 0"/></g></Svg></div>')).toEqual(['SVG']);
  });

  it('안에 자식이 있거나 중첩돼도 한 줄로만 알린다', () => {
    const problems = checkHtml('<svg><svg></svg><g></g></svg>');
    expect(problems.map((p) => p.kind)).toEqual(['SVG']);
  });

  it('<svg onload>는 위험 코드와 SVG 문제를 둘 다 돌려준다', () => {
    expect(kinds('<svg onload="alert(1)"></svg>')).toEqual(['DANGEROUS', 'SVG']);
  });
});

describe('checkHtml 1 — 문제 없음', () => {
  it('정상 샘플은 문제 없음 ([])', () => {
    expect(checkHtml(SAMPLE)).toEqual([]);
  });

  it('빈 글 · 공백만 · 주석만 · 최상위 여러 개는 문제 없음', () => {
    expect(checkHtml('')).toEqual([]);
    expect(checkHtml('   \n\t ')).toEqual([]);
    expect(checkHtml('<!-- 주석만 -->')).toEqual([]);
    expect(checkHtml('앞<b>가운데</b><p>뒤</p>')).toEqual([]);
  });

  it('javascript:라는 글자가 글이나 다른 속성에 있어도 문제 아님', () => {
    expect(checkHtml('<a title="javascript:x" href="/javascript:y">javascript:z</a>')).toEqual([]);
  });
});

describe('checkHtml 1 — 여러 문제', () => {
  it('문제가 여러 개면 모두 돌려준다 (문서 순서 → SVG)', () => {
    const problems = checkHtml('<div onclick="a()"><script>1</script></div><svg></svg><iframe></iframe>');
    expect(problems.map((p) => p.kind)).toEqual(['DANGEROUS', 'DANGEROUS', 'DANGEROUS', 'SVG']);
  });
});

describe('formatProblems — 알림 글', () => {
  it('[위험한 코드] · [SVG 미지원] 말머리와 마지막 줄 "다시 작성해 주세요."를 담는다', () => {
    const text = formatProblems(checkHtml('<iframe src="x"></iframe><svg></svg>'));
    expect(text.split('\n')).toEqual(['[위험한 코드] <iframe> 요소', '[SVG 미지원] <svg> 요소는 지원하지 않습니다.', '다시 작성해 주세요.']);
  });

  it('알림 글 예시 (<iframe> 포함)', () => {
    expect(formatProblems(checkHtml('<p>글</p><iframe src="https://example.com"></iframe>'))).toBe(
      '[위험한 코드] <iframe> 요소\n다시 작성해 주세요.',
    );
  });

  it('말머리 5종: 위험한 코드 · 태그 짝 · 구조 불일치 · SVG 미지원 · Patch 오류', () => {
    const problems: HtmlProblem[] = [
      { kind: 'DANGEROUS', message: 'a' },
      { kind: 'UNPAIRED', message: 'b' },
      { kind: 'STRUCTURE', message: 'c' },
      { kind: 'SVG', message: 'd' },
    ];
    expect(formatProblems(problems).split('\n').slice(0, 4)).toEqual([
      '[위험한 코드] a',
      '[태그 짝] b',
      '[구조 불일치] c',
      '[SVG 미지원] d',
    ]);
    expect(formatProblems([{ kind: 'PATCH_ERROR', message: 'e' }])).toBe('[Patch 오류] e');
  });

  it('Patch 오류만 있으면 "다시 작성해 주세요."를 붙이지 않는다 (자체 안내를 가짐)', () => {
    expect(formatProblems([{ kind: 'PATCH_ERROR', message: 'x' }])).not.toContain('다시 작성해 주세요.');
    expect(formatProblems([{ kind: 'PATCH_ERROR', message: 'x' }, { kind: 'SVG', message: 'y' }])).toContain('다시 작성해 주세요.');
  });
});

// 브라우저가 읽은 모습을 VNode로 → 다시 HTML 글로: 편집창에 채워지는 글과 같은 종류의 입력
function roundTripHtml(html: string): string {
  const box = document.createElement('div');
  box.innerHTML = html;
  return vnodesToHtml(readAreaChildren(box));
}

describe('checkHtml 2 — 태그 짝 (UNPAIRED)', () => {
  it('닫는 태그가 빠지면 UNPAIRED (`<div><p>글</div>`) — 빠진 태그 이름이 메시지에 들어감', () => {
    const problems = checkHtml('<div><p>글</div>');
    expect(problems.map((p) => p.kind)).toEqual(['UNPAIRED']);
    expect(problems[0].message).toContain('<p>');
  });

  it('끝까지 닫히지 않은 태그도 UNPAIRED', () => {
    const problems = checkHtml('<section><div>글</div>');
    expect(problems.map((p) => p.kind)).toEqual(['UNPAIRED']);
    expect(problems[0].message).toContain('<section>');
  });

  it('여는 태그 없이 닫기도 UNPAIRED', () => {
    const problems = checkHtml('<p>글</p></div>');
    expect(problems.map((p) => p.kind)).toEqual(['UNPAIRED']);
    expect(problems[0].message).toContain('</div>');
  });

  it('순서 어긋남 `<b><i></b></i>` → UNPAIRED', () => {
    const found = kinds('<b><i></b></i>');
    expect(found.length).toBeGreaterThan(0);
    expect(new Set(found)).toEqual(new Set(['UNPAIRED']));
  });

  it('`>`로 닫히지 않은 태그(`<div`, `<a href="x`)는 브라우저가 글째 버리므로 UNPAIRED로 알린다', () => {
    expect(kinds('<p>글</p><div')).toEqual(['UNPAIRED']);
    expect(kinds('<a href="x')).toEqual(['UNPAIRED']);
  });

  it('짝 문제가 많으면 5줄까지 적고 나머지는 한 줄로 묶는다', () => {
    const problems = checkHtml('</a></b></c></d></e></f></g>');
    expect(problems.every((p) => p.kind === 'UNPAIRED')).toBe(true);
    expect(problems).toHaveLength(6);
    expect(problems[5].message).toContain('2건');
  });

  it('빈 태그(`<br>` `<img …>`)와 `<br/>`는 짝 없이도 정상', () => {
    expect(checkHtml('<br><img src="a.png" alt="x"><br/><hr /><input type="text"/><meta charset="utf-8">')).toEqual([]);
  });

  it('주석 안의 <div>는 무시', () => {
    expect(checkHtml('<!-- <div> --><p>글</p><!-- </p> -->')).toEqual([]);
  });

  it('속성값 안의 >는 무시 (큰따옴표 · 작은따옴표)', () => {
    expect(checkHtml('<a title="a>b" href=\'x>y\'>글</a>')).toEqual([]);
    expect(checkHtml('<div data-x=\'</div>\'></div>')).toEqual([]);
  });

  it('표준에서 `/>`는 빈 태그가 아닌 요소를 닫지 못한다: `<div/>`는 열린 채로 본다', () => {
    expect(kinds('<div/>')).toEqual(['UNPAIRED']);
  });
});

describe('checkHtml 2 — 구조 비교 (STRUCTURE)', () => {
  it('짝은 맞지만 브라우저가 고쳐 읽는 입력(`<p><div>x</div></p>`)은 STRUCTURE', () => {
    const problems = checkHtml('<p><div>x</div></p>');
    expect(problems.map((p) => p.kind)).toEqual(['STRUCTURE']);
    expect(problems[0].message).toContain('<p>');
    expect(problems[0].message).toContain('<div>');
  });

  it('짝과 구조가 둘 다 틀리면 한 번에 둘 다 돌려준다', () => {
    expect(kinds('<p><div>x</div></p><b>')).toEqual(['UNPAIRED', 'STRUCTURE']);
  });

  it('알림 글에 [태그 짝] · [구조 불일치] 말머리가 들어간다', () => {
    const alertText = formatProblems(checkHtml('<p><div>x</div></p><b>'));
    expect(alertText).toContain('[태그 짝] ');
    expect(alertText).toContain('[구조 불일치] ');
    expect(alertText.endsWith('다시 작성해 주세요.')).toBe(true);
  });

  it('구조가 다른 곳이 여러 군데여도 첫 번째 것만 구조 문제 한 줄로 알린다', () => {
    const problems = checkHtml('<p><div></div></p><p><div></div></p>');
    expect(problems.map((p) => p.kind)).toEqual(['STRUCTURE']);
  });

  describe('표 (C1): tbody 자동 추가는 예외', () => {
    it('<table><tr><td>1</td></tr></table>는 문제 없음 ([])', () => {
      expect(checkHtml('<table><tr><td>1</td></tr></table>')).toEqual([]);
    });

    it('행이 여러 개여도 문제 없음', () => {
      expect(checkHtml('<table><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></table>')).toEqual([]);
    });

    it('직접 쓴 <tbody>는 문제 없음', () => {
      expect(checkHtml('<table><tbody><tr><td>1</td></tr></tbody></table>')).toEqual([]);
    });

    it('caption · colgroup · thead와 tbody 없는 행이 섞여도 문제 없음', () => {
      expect(
        checkHtml('<table><caption>c</caption><colgroup><col></colgroup><thead><tr><th>h</th></tr></thead><tr><td>x</td></tr></table>'),
      ).toEqual([]);
    });

    it('<tr> 사이에 직접 쓴 <tbody>가 끼어 있어도 문제 없음', () => {
      expect(checkHtml('<table><tr><td>1</td></tr><tbody><tr><td>2</td></tr></tbody><tr><td>3</td></tr></table>')).toEqual([]);
    });

    it('중첩된 표 · 공백과 주석이 섞인 표도 문제 없음', () => {
      expect(checkHtml('<table>\n  <!-- 행 -->\n  <tr><td><table><tr><td>안</td></tr></table></td></tr>\n</table>')).toEqual([]);
    });

    it('<table><td>1</td></table>는 <tr>도 자동 추가되므로 여전히 STRUCTURE', () => {
      expect(kinds('<table><td>1</td></table>')).toEqual(['STRUCTURE']);
    });

    it('tbody 예외는 표 안의 다른 보정(<p><div>)까지 봐주지 않는다', () => {
      expect(kinds('<table><tr><td><p><div>x</div></p></td></tr></table>')).toEqual(['STRUCTURE']);
    });
  });
});

describe('checkHtml 2 — vnodesToHtml로 만든 글은 항상 통과 (Dev-7 왕복)', () => {
  const cases: Record<string, string> = {
    샘플: SAMPLE,
    중첩: '<div><section><article><p>글 <b>굵게 <i>기울임</i></b></p></article></section></div>',
    주석: '앞<!-- <div> 안내 --><p>글</p><!-- </p> -->뒤',
    '빈 태그': '<p>줄<br>바꿈</p><hr><img src="a.png" alt="x"><input type="text" disabled>',
    특수문자: '<p>&lt;b&gt;굵게 아님&lt;/b&gt; &amp; &amp;amp; 😀 1 &lt; 2 &gt; 0</p><a title="a &amp; &quot;b&quot; > c">링크</a>',
    'pre 줄바꿈': '<pre>\n첫 줄\n  들여쓰기 </pre><textarea>\n&lt;/div&gt;</textarea>',
    표: '<table><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>',
  };
  for (const [name, html] of Object.entries(cases)) {
    it(`${name}`, () => {
      expect(checkHtml(roundTripHtml(html))).toEqual([]);
    });
  }

  it('VNode로 직접 만든 표 · 폼 · 목록', () => {
    const vnodes = [
      el('table', {}, el('tbody', {}, el('tr', {}, el('td', {}, text('1'))))),
      el('form', {}, el('input', { type: 'checkbox', checked: '' }), el('select', {}, el('option', {}, text('a')))),
      el('ul', {}, el('li', {}, text('a')), comment(' c '), el('li', {}, text('b'))),
    ];
    expect(checkHtml(vnodesToHtml(vnodes))).toEqual([]);
  });
});

describe('checkHtml 2 — 오탐 없음 (B14 · B15 · B16)', () => {
  it('B14: 글자 안의 `<`(`1 < 2` · `x <= y`)는 태그로 세지 않아 []', () => {
    expect(checkHtml('1 < 2')).toEqual([]);
    expect(checkHtml('x <= y')).toEqual([]);
    expect(checkHtml('<p>1 < 2 && 3 > 2</p>')).toEqual([]);
    expect(checkHtml('a <> b, a<3, x<=y, 끝 <')).toEqual([]);
    expect(checkHtml('<div>if (a < b) { c <<= 2 }</div>')).toEqual([]);
  });

  it('B15: 대소문자 섞인 짝 `<DIV>글</div>` · `<Ul><LI>가</li></uL>` → []', () => {
    expect(checkHtml('<DIV>글</div>')).toEqual([]);
    expect(checkHtml('<Ul><LI>가</li></uL>')).toEqual([]);
  });

  it('B16: <textarea> 안의 `</div>` 같은 글은 짝 검사에서 무시 → []', () => {
    expect(checkHtml('<textarea></div><p></textarea>')).toEqual([]);
    expect(checkHtml('<div><textarea>a </div> b</textarea></div>')).toEqual([]);
  });

  it('B16: <title> 안의 `</div>`도 무시 (RCDATA)', () => {
    expect(checkHtml('<title></div></title>')).toEqual([]);
  });

  it('B16: <style> · <script> 안의 `</div>`는 UNPAIRED 오탐 없이 DANGEROUS만 나온다 (페이지에서는 C5 · 위험 코드로 막힘)', () => {
    expect(kinds('<style>a > b </div> { }</style>')).toEqual(['DANGEROUS']);
    expect(kinds('<script>if (a<b) { x = "</div>" }</script>')).toEqual(['DANGEROUS']);
  });

  it('SVG 안의 <circle/> 같은 자기 닫는 태그는 짝 오탐이 없다 (SVG 문제만)', () => {
    expect(kinds('<svg width="10"><circle r="1"/><path d="M0 0"/></svg>')).toEqual(['SVG']);
  });
});

describe('htmlScan (분석기 견고성)', () => {
  it('B16 (분석기 견고성): <style> 안의 `</div>`는 짝으로 세지 않고 요소는 잎으로 남는다 — 페이지에서는 <style>이 C5로 막혀 이 테스트로만 확인', () => {
    const { tree, issues } = scanHtml('<style>a > b </div> { content: "<p>" }</style><p>글</p>');
    expect(issues).toEqual([]);
    expect(tree.map((n) => n.tag)).toEqual(['style', 'p']);
    expect(tree[0].children).toEqual([]);
  });

  it('태그 이름은 소문자로 맞추고 중첩 구조를 만든다', () => {
    const { tree, issues } = scanHtml('<DIV><P>a</P><Br><SPAN><B>b</B></SPAN></DIV>');
    expect(issues).toEqual([]);
    expect(tree).toEqual([
      {
        tag: 'div',
        children: [
          { tag: 'p', children: [] },
          { tag: 'br', children: [] },
          { tag: 'span', children: [{ tag: 'b', children: [] }] },
        ],
      },
    ]);
  });

  it('주석 · 글자 · 문서 종류 선언 · 처리 명령은 구조에 안 들어간다', () => {
    const { tree, issues } = scanHtml('<!DOCTYPE html><?xml x?><!-- c --><!--><!--->글<p>a</p>');
    expect(issues).toEqual([]);
    expect(tree.map((n) => n.tag)).toEqual(['p']);
  });

  it('깊이 300 중첩도 스택 넘침 없이 훑는다', () => {
    const html = '<div>'.repeat(300) + '</div>'.repeat(300);
    expect(scanHtml(html).issues).toEqual([]);
  });
});
