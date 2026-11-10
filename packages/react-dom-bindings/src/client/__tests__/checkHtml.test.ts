import { describe, it, expect } from 'vitest';
import { checkHtml, formatProblems } from '../checkHtml';
import type { HtmlProblem } from '../checkHtml';

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
