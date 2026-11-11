import { describe, expect, it } from 'vitest';
import { percentile, summarize } from '../stats';

// [AI Note]: 백분위 정의 = 선형 보간(인접한 두 순위 사이를 비례로 나눔, numpy 기본과 같음). 결과 표 설명에도 이 정의를 적는다.
// 위치 = (n - 1) × p / 100. 짝수 개 p50은 가운데 두 값의 평균이 된다.
describe('percentile — 경계 (Dev-24 · PRD §8.2 p50 · p95)', () => {
  it('값이 1개면 어떤 p든 그 값', () => {
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([7], 100)).toBe(7);
  });

  it('홀수 개 p50은 가운데 값', () => {
    expect(percentile([1, 2, 3], 50)).toBe(2);
    expect(percentile([5, 1, 9, 3, 7], 50)).toBe(5); // 정렬 안 된 입력
  });

  it('짝수 개 p50은 가운데 두 값의 평균 (선형 보간)', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([4, 1], 50)).toBe(2.5);
  });

  it('p95: 값 1..100이면 위치 94.05 → 95.05, 값 1..30이면 위치 27.55로 보간', () => {
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(hundred, 95)).toBeCloseTo(95.05, 10);
    const thirty = Array.from({ length: 30 }, (_, i) => i + 1);
    // 위치 = 29 × 0.95 = 27.55 → 28번째 값(28)과 29번째 값(29) 사이 0.55
    expect(percentile(thirty, 95)).toBeCloseTo(28.55, 10);
  });

  it('p0은 최솟값 · p100은 최댓값', () => {
    expect(percentile([3, 1, 2], 0)).toBe(1);
    expect(percentile([3, 1, 2], 100)).toBe(3);
  });

  it('같은 값이 여럿이어도 정상', () => {
    expect(percentile([5, 5, 5, 5], 95)).toBe(5);
    expect(percentile([1, 1, 1, 9], 50)).toBe(1);
  });

  it('입력 배열을 고치지 않는다 (정렬은 복사본에서)', () => {
    const input = [3, 1, 2];
    percentile(input, 50);
    expect(input).toEqual([3, 1, 2]);
    const frozen = Object.freeze([3, 1, 2]);
    expect(() => percentile(frozen as number[], 50)).not.toThrow();
  });

  it('빈 배열 · 범위 밖 p · 유한하지 않은 값은 오류 (조용히 NaN을 만들지 않는다)', () => {
    expect(() => percentile([], 50)).toThrow('빈');
    expect(() => percentile([1], -1)).toThrow('p');
    expect(() => percentile([1], 101)).toThrow('p');
    expect(() => percentile([1, NaN], 50)).toThrow('유한');
    expect(() => percentile([1, Infinity], 50)).toThrow('유한');
  });
});

describe('summarize', () => {
  it('{ n, p50, p95, min, max }', () => {
    const s = summarize([4, 1, 3, 2]);
    expect(s.n).toBe(4);
    expect(s.p50).toBe(2.5);
    expect(s.p95).toBeCloseTo(3.85, 10);
    expect(s.min).toBe(1);
    expect(s.max).toBe(4);
  });

  it('값이 1개면 모두 그 값, n = 1', () => {
    expect(summarize([2])).toEqual({ n: 1, p50: 2, p95: 2, min: 2, max: 2 });
  });

  it('빈 배열은 n = 0이고 나머지는 null (없는 숫자를 지어내지 않는다)', () => {
    expect(summarize([])).toEqual({ n: 0, p50: null, p95: null, min: null, max: null });
  });

  it('입력을 고치지 않는다', () => {
    const input = [3, 1, 2];
    summarize(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
