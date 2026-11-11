import { describe, expect, it } from 'vitest';
import { PALETTE, buttonStyle, isHexColor, textColorFor } from '../color';

// [AI Note]: 색 순수 함수 단위 테스트 (FD-21 · 23 · 24). 글자 색은 ④-1 A = 흰색 · 먹색(#0a0b0d) 중 WCAG 대비가 큰 쪽.
const WHITE = '#ffffff';
const INK = '#0a0b0d';

describe('PALETTE (FD-21)', () => {
  it('칩 8개가 정해진 순서다', () => {
    expect([...PALETTE]).toEqual(['#0052ff', '#cf202f', '#05b169', '#f4b000', '#0a0b0d', '#5b616e', '#a8acb3', '#eef0f3']);
  });

  it('중복이 없고 전부 #rrggbb 형식이다', () => {
    expect(new Set(PALETTE).size).toBe(PALETTE.length);
    for (const color of PALETTE) expect(isHexColor(color), color).toBe(true);
  });
});

describe('isHexColor', () => {
  it.each<[string, boolean]>([
    ['#0052ff', true],
    ['#0052FF', true],
    ['#000000', true],
    ['#fff', false],
    ['blue', false],
    ['', false],
    ['#12345', false],
    ['#12345g', false],
    ['0052ff', false],
    ['#0052ff ', false],
    ['#0052ff00', false],
  ])('%j → %s', (value, expected) => {
    expect(isHexColor(value)).toBe(expected);
  });
});

describe('textColorFor (FD-24, ④-1 A: WCAG 대비가 큰 쪽)', () => {
  it.each<[string, string]>([
    ['#0052ff', WHITE],
    ['#cf202f', WHITE],
    ['#05b169', INK],
    ['#f4b000', INK],
    ['#0a0b0d', WHITE],
    ['#5b616e', WHITE],
    ['#a8acb3', INK],
    ['#eef0f3', INK],
  ])('칩 %s → %s', (bg, expected) => {
    expect(textColorFor(bg)).toBe(expected);
  });

  it('가장 어두운 색은 흰 글자, 가장 밝은 색은 먹 글자다', () => {
    expect(textColorFor('#000000')).toBe(WHITE);
    expect(textColorFor('#ffffff')).toBe(INK);
  });

  it('경계: #777777은 흰 글자, #787878은 먹 글자다', () => {
    expect(textColorFor('#777777')).toBe(WHITE);
    expect(textColorFor('#787878')).toBe(INK);
  });

  it('대문자 #rrggbb도 같은 규칙이다', () => {
    expect(textColorFor('#EEF0F3')).toBe(INK);
    expect(textColorFor('#0052FF')).toBe(WHITE);
  });

  it('형식 밖(이름 · 빈 값 · 3자리)은 방어용으로 흰 글자다', () => {
    for (const bad of ['blue', '', '#fff', '#12345g']) expect(textColorFor(bad), bad).toBe(WHITE);
  });

  it('반환값은 항상 두 값 중 하나다 (여러 색을 훑어서)', () => {
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
          expect([WHITE, INK], hex).toContain(textColorFor(hex));
        }
      }
    }
  });
});

describe('buttonStyle (FD-23)', () => {
  it('배경 + 글자색 두 항목이다: #0052ff → 흰 글자', () => {
    expect(buttonStyle('#0052ff')).toEqual({ 'background-color': '#0052ff', color: WHITE });
  });

  it('밝은 배경은 먹 글자다', () => {
    expect(buttonStyle('#05b169')).toEqual({ 'background-color': '#05b169', color: INK });
  });

  it('키는 정확히 2개이고 이름은 kebab 그대로다 (SET_STYLE의 property가 됨)', () => {
    expect(Object.keys(buttonStyle('#0052ff'))).toEqual(['background-color', 'color']);
  });

  it('입력을 고치지 않는다 (문자열은 그대로, 호출마다 새 객체)', () => {
    const input = '#cf202f';
    const a = buttonStyle(input);
    const b = buttonStyle(input);
    expect(input).toBe('#cf202f');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
