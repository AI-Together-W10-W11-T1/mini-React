import { describe, it, expect } from 'vitest';
import { depsChanged } from '../deps';

describe('depsChanged — 의존성 비교 (정책 「§4.2 의존성 비교」, effect · memo 공통)', () => {
  it('null(생략)이면 항상 바뀐 것이다 — 이전이 null이든 새것이 null이든', () => {
    expect(depsChanged(null, null)).toBe(true);
    expect(depsChanged(null, [])).toBe(true);
    expect(depsChanged([], null)).toBe(true);
    expect(depsChanged([1], null)).toBe(true);
  });

  it('[] 와 []는 바뀌지 않았다', () => {
    expect(depsChanged([], [])).toBe(false);
  });

  it('항목이 모두 같으면 바뀌지 않았다 (Object.is)', () => {
    expect(depsChanged([1, 'a', true], [1, 'a', true])).toBe(false);
  });

  it('하나라도 다르면 바뀌었다', () => {
    expect(depsChanged([1, 2], [1, 3])).toBe(true);
    expect(depsChanged([1, 2], [0, 2])).toBe(true);
  });

  it('길이가 다르면 바뀌었다 (앞부분이 같아도)', () => {
    expect(depsChanged([1], [1, 2])).toBe(true);
    expect(depsChanged([1, 2], [1])).toBe(true);
    expect(depsChanged([], [undefined])).toBe(true);
  });

  it('NaN은 같은 값이다 (Object.is)', () => {
    expect(depsChanged([NaN], [NaN])).toBe(false);
  });

  it('+0과 -0은 다른 값이다 (Object.is)', () => {
    expect(depsChanged([0], [-0])).toBe(true);
  });

  it('객체는 참조로 비교한다 — 같은 참조는 그대로, 모양만 같은 새 객체는 바뀜', () => {
    const o = { a: 1 };
    expect(depsChanged([o], [o])).toBe(false);
    expect(depsChanged([{ a: 1 }], [{ a: 1 }])).toBe(true);
    const arr = [1];
    expect(depsChanged([arr], [arr])).toBe(false);
  });

  it('undefined와 null 항목도 구분한다 (===가 아니라 Object.is, 서로 다른 값)', () => {
    expect(depsChanged([undefined], [null])).toBe(true);
    expect(depsChanged([undefined], [undefined])).toBe(false);
  });

  it('입력 배열을 고치지 않는다', () => {
    const a = Object.freeze([1, 2]);
    const b = Object.freeze([1, 2]);
    expect(() => depsChanged(a, b)).not.toThrow();
  });
});
