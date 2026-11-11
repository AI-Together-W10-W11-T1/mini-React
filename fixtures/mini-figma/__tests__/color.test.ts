import { describe, expect, it } from 'vitest';
import { PALETTE, buttonStyle, isHexColor, isVarRef, resolveColor, textColorFor, varIdOf, varRef } from '../color';

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

// [AI Note]: task_007 변수 연결 (VR-02 · 03). RC-1 ~ RC-8 + A57.
describe('resolveColor · 연결 표현 (RC-1 ~ RC-8, A57)', () => {
  const vars = [
    { id: 'primary', name: 'Primary', value: '#f4b000' },
    { id: 'danger', name: 'Danger', value: '#cf202f' },
  ];

  it('RC-1 hex는 그대로', () => {
    expect(resolveColor('#112233', vars)).toBe('#112233');
  });
  it('RC-2 var:id는 그 변수 값 (값이 바뀌면 같이 바뀜)', () => {
    expect(resolveColor('var:primary', vars)).toBe('#f4b000');
    expect(resolveColor('var:primary', [{ id: 'primary', name: 'Primary', value: '#111111' }])).toBe('#111111');
  });
  it('RC-3 없는 id는 fallback이 hex면 그것', () => {
    expect(resolveColor('var:ghost', vars, '#05b169')).toBe('#05b169');
  });
  it('RC-4 fallback이 var:이면 풀어서', () => {
    expect(resolveColor('var:ghost', vars, 'var:danger')).toBe('#cf202f');
  });
  it('RC-5 fallback도 못 풀거나 없으면 #0052ff', () => {
    expect(resolveColor('var:ghost', vars, 'var:ghost')).toBe('#0052ff');
    expect(resolveColor('var:ghost', vars)).toBe('#0052ff');
    expect(resolveColor('var:primary', [])).toBe('#0052ff');
  });
  it('RC-6 빈 id · 대소문자 다른 id · 공백 낀 id는 없는 id 취급', () => {
    for (const bad of ['var:', 'var:Primary', 'var:primary ']) {
      expect(resolveColor(bad, vars), bad).toBe('#0052ff');
      expect(resolveColor(bad, vars, '#05b169'), bad).toBe('#05b169');
    }
  });
  it('RC-7 varRef · varIdOf · isVarRef 왕복, hex는 연결이 아님', () => {
    expect(varRef('primary')).toBe('var:primary');
    expect(isVarRef('var:primary')).toBe(true);
    expect(varIdOf('var:primary')).toBe('primary');
    expect(isVarRef('#0052ff')).toBe(false);
    expect(varIdOf('#0052ff')).toBeNull();
  });
  it('RC-8 var:는 hex가 아니고, 푼 색에 textColorFor가 대비를 정한다', () => {
    expect(isHexColor('var:primary')).toBe(false);
    expect(textColorFor(resolveColor('var:primary', vars))).toBe(INK);
    expect(textColorFor(resolveColor('var:primary', [{ id: 'primary', name: 'Primary', value: '#0052ff' }]))).toBe(WHITE);
  });
});
