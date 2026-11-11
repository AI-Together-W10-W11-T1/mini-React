import { describe, it, expect } from 'vitest';
import { parseStyleText, styleMapToText } from '../style';

describe('parseStyleText', () => {
  it('세미콜론으로 나눠 이름 · 값 묶음으로 만든다', () => {
    expect(parseStyleText('color: red; font-size: 16px')).toEqual({ color: 'red', 'font-size': '16px' });
  });

  it('빈 글 · 공백만 있는 글은 빈 묶음', () => {
    expect(parseStyleText('')).toEqual({});
    expect(parseStyleText('   ')).toEqual({});
  });

  it('url(data:…;…) 안의 세미콜론 · 콜론으로 쪼개지 않는다', () => {
    expect(parseStyleText('background: url(data:image/png;base64,AAA=); color: red')).toEqual({
      background: 'url(data:image/png;base64,AAA=)',
      color: 'red',
    });
  });

  it('따옴표 안의 세미콜론으로 쪼개지 않는다', () => {
    expect(parseStyleText('content: "a;b"; color: red')).toEqual({ content: '"a;b"', color: 'red' });
    expect(parseStyleText("font-family: 'A;B', serif")).toEqual({ 'font-family': "'A;B', serif" });
  });

  it('이름은 소문자로, 값은 앞뒤 공백만 제거한다 (대문자 값은 그대로)', () => {
    expect(parseStyleText('  COLOR :  Red  ;Font-Size:16PX')).toEqual({ color: 'Red', 'font-size': '16PX' });
  });

  it('-- 로 시작하는 사용자 정의 속성 이름은 대소문자 그대로', () => {
    expect(parseStyleText('--Main-Color: #fff; COLOR: var(--Main-Color)')).toEqual({
      '--Main-Color': '#fff',
      color: 'var(--Main-Color)',
    });
  });

  it('같은 이름이 여러 번 나오면 뒤가 이긴다', () => {
    expect(parseStyleText('color: red; color: blue')).toEqual({ color: 'blue' });
    expect(parseStyleText('color: red; COLOR: blue')).toEqual({ color: 'blue' });
  });

  it('첫 콜론으로만 이름 · 값을 나눈다 (값 안 콜론 유지)', () => {
    expect(parseStyleText('background: url(http://a/b.png)')).toEqual({ background: 'url(http://a/b.png)' });
    expect(parseStyleText('a: b:c')).toEqual({ a: 'b:c' });
  });

  it('경계(B21): !important 는 값의 일부로 그대로 둔다', () => {
    expect(parseStyleText('color: red !important; margin: 0 !IMPORTANT')).toEqual({
      color: 'red !important',
      margin: '0 !IMPORTANT',
    });
  });

  it('경계(B21): 값 안 주석 /* ; */ 의 세미콜론으로 쪼개지 않고 주석은 값에 남는다', () => {
    expect(parseStyleText('color: red /* ; */; margin: 0')).toEqual({ color: 'red /* ; */', margin: '0' });
    expect(parseStyleText('color: /* a;b */ red')).toEqual({ color: '/* a;b */ red' });
  });

  it('경계(B21): 끝 세미콜론 여러 개 · 빈 조각은 무시한다', () => {
    expect(parseStyleText('a:b;;;')).toEqual({ a: 'b' });
    expect(parseStyleText(';;a:b; ;c:d;')).toEqual({ a: 'b', c: 'd' });
  });

  it('경계(B21): 값이 빈 항목(color:)은 항목으로 남기지 않는다', () => {
    expect(parseStyleText('color:')).toEqual({});
    expect(parseStyleText('color: ;')).toEqual({});
  });

  it('경계(B21): 빈 값 항목 뒤에 정상 항목이 이어져도 정상 항목은 남는다', () => {
    expect(parseStyleText('color:; font-size: 12px')).toEqual({ 'font-size': '12px' });
    expect(parseStyleText('color: red; margin:; padding: 1px')).toEqual({ color: 'red', padding: '1px' });
  });

  it('콜론이 없는 조각 · 이름이 빈 조각은 버린다', () => {
    expect(parseStyleText('oops; color: red')).toEqual({ color: 'red' });
    expect(parseStyleText(': red; color: blue')).toEqual({ color: 'blue' });
  });

  it('__proto__ 같은 이름도 보통 항목으로 담고 프로토타입을 건드리지 않는다', () => {
    const map = parseStyleText('__proto__: x');
    expect(Object.getPrototypeOf(map)).toBe(Object.prototype);
    expect(Object.keys(map)).toEqual(['__proto__']);
  });
});

describe('styleMapToText', () => {
  it('이름: 값; 이름: 값 으로 쓴다', () => {
    expect(styleMapToText({ color: 'red', 'font-size': '16px' })).toBe('color: red; font-size: 16px');
  });

  it('항목이 없으면 빈 글', () => {
    expect(styleMapToText({})).toBe('');
  });

  it('쪼갠 뒤 다시 쓰면 같은 항목 집합 (왕복)', () => {
    const text = 'background: url(data:a;b); color: red !important; --X: 1';
    expect(parseStyleText(styleMapToText(parseStyleText(text)))).toEqual(parseStyleText(text));
  });
});
