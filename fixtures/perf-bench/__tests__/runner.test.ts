import { describe, expect, it, vi } from 'vitest';
import { runScenario } from '../runner';

// [AI Note]: 시계를 가짜로 꽂아 결정적으로 시험한다. now()를 부를 때마다 준비해 둔 값을 차례로 돌려준다.
function fakeClock(ticks: number[]): () => number {
  let i = 0;
  return () => ticks[Math.min(i++, ticks.length - 1)];
}

describe('runScenario — 준비 5회 · 측정 30회 (PRD §8.2)', () => {
  it('기본값은 준비 5회 + 측정 30회, 준비 5회는 결과에서 빠지고 측정 30회만 요약된다', () => {
    const step = vi.fn();
    const result = runScenario({ setup: () => undefined, step });
    expect(step).toHaveBeenCalledTimes(35);
    expect(result.warmup).toBe(5);
    expect(result.runs).toBe(30);
    expect(result.samples).toHaveLength(30);
    expect(result.metrics.total.n).toBe(30);
    expect(result.errors).toBe(0);
  });

  it('매 반복(준비 포함) 전에 setup이 불리고, 그 결과(ctx)가 step · teardown에 그대로 간다', () => {
    const order: string[] = [];
    let serial = 0;
    runScenario({
      warmup: 2,
      runs: 3,
      setup: () => {
        const id = ++serial;
        order.push(`setup${id}`);
        return id;
      },
      step: (ctx) => void order.push(`step${ctx}`),
      teardown: (ctx) => void order.push(`teardown${ctx}`),
    });
    expect(serial).toBe(5);
    expect(order.slice(0, 6)).toEqual(['setup1', 'step1', 'teardown1', 'setup2', 'step2', 'teardown2']);
  });

  it('step 구간만 잰다: setup · teardown 시간은 total에 들어가지 않는다', () => {
    // now() 호출은 step 시작 전 · 후 한 쌍뿐이다. 100 → 112 = 12ms
    const result = runScenario({
      warmup: 0,
      runs: 1,
      now: fakeClock([100, 112]),
      setup: () => undefined,
      step: () => undefined,
    });
    expect(result.samples).toEqual([12]);
    expect(result.metrics.total).toMatchObject({ n: 1, p50: 12, p95: 12 });
  });

  it('step이 돌려준 단계별 시간(timings)도 키마다 요약한다, 개수(counts)는 첫 측정값과 안정 여부를 남긴다', () => {
    let i = 0;
    const result = runScenario({
      warmup: 1,
      runs: 4,
      setup: () => undefined,
      step: () => {
        i++;
        return { timings: { diff: i, patch: i * 10 }, counts: { patches: 3 } };
      },
    });
    // 준비 1회(i = 1)는 빠지고 i = 2..5
    expect(result.metrics.diff).toMatchObject({ n: 4, min: 2, max: 5 });
    expect(result.metrics.patch).toMatchObject({ n: 4, min: 20, max: 50 });
    expect(result.counts).toEqual({ patches: 3 });
    expect(result.countsStable).toBe(true);
  });

  it('개수가 반복마다 다르면 countsStable = false (조용히 하나만 고르지 않는다)', () => {
    let i = 0;
    const result = runScenario({
      warmup: 0,
      runs: 3,
      setup: () => undefined,
      step: () => ({ counts: { patches: ++i } }),
    });
    expect(result.countsStable).toBe(false);
  });
});

describe('runScenario — 오류는 숨기지 않는다 (PRD §8.2)', () => {
  it('step이 던진 반복은 samples에서 빠지되 errors 개수와 메시지로 남는다 (n + errors = runs)', () => {
    let i = 0;
    const result = runScenario({
      warmup: 0,
      runs: 10,
      setup: () => undefined,
      step: () => {
        i++;
        if (i % 4 === 0) throw new Error(`boom ${i}`);
      },
    });
    expect(result.errors).toBe(2);
    expect(result.errorMessages).toEqual(['boom 4', 'boom 8']);
    expect(result.metrics.total.n).toBe(8);
    expect(result.metrics.total.n + result.errors).toBe(result.runs);
  });

  it('setup이 던진 반복도 오류로 센다 (step · teardown은 부르지 않음)', () => {
    const step = vi.fn();
    const teardown = vi.fn();
    const result = runScenario({
      warmup: 0,
      runs: 3,
      setup: () => {
        throw new Error('setup boom');
      },
      step,
      teardown,
    });
    expect(result.errors).toBe(3);
    expect(step).not.toHaveBeenCalled();
    expect(teardown).not.toHaveBeenCalled();
    expect(result.metrics.total).toEqual({ n: 0, p50: null, p95: null, min: null, max: null });
  });

  it('준비 실행의 오류도 따로 센다 (warmupErrors) — 측정 결과에는 안 들어가지만 설명 없이 사라지지 않는다', () => {
    let i = 0;
    const result = runScenario({
      warmup: 3,
      runs: 2,
      setup: () => undefined,
      step: () => {
        i++;
        if (i <= 2) throw new Error('warm boom');
      },
    });
    expect(result.warmupErrors).toBe(2);
    expect(result.errors).toBe(0);
    expect(result.samples).toHaveLength(2);
  });

  it('step이 던져도 teardown은 부른다 (다음 반복이 오염되지 않게)', () => {
    const teardown = vi.fn();
    runScenario({
      warmup: 0,
      runs: 2,
      setup: () => 'ctx',
      step: () => {
        throw new Error('x');
      },
      teardown,
    });
    expect(teardown).toHaveBeenCalledTimes(2);
    expect(teardown).toHaveBeenCalledWith('ctx');
  });

  it('오류가 아닌 값(문자열)을 던져도 메시지로 남긴다', () => {
    const result = runScenario({
      warmup: 0,
      runs: 1,
      setup: () => undefined,
      step: () => {
        throw 'plain string';
      },
    });
    expect(result.errorMessages).toEqual(['plain string']);
  });

  it('오류 메시지는 최대 개수까지만 보관하고 errors 숫자는 전부 센다', () => {
    const result = runScenario({
      warmup: 0,
      runs: 30,
      setup: () => undefined,
      step: () => {
        throw new Error('same');
      },
    });
    expect(result.errors).toBe(30);
    expect(result.errorMessages.length).toBeLessThanOrEqual(10);
  });
});

describe('runScenario — 인자 검사', () => {
  it('runs가 1보다 작거나 정수가 아니면 오류, warmup이 음수여도 오류', () => {
    expect(() => runScenario({ runs: 0, setup: () => undefined, step: () => undefined })).toThrow('runs');
    expect(() => runScenario({ runs: 2.5, setup: () => undefined, step: () => undefined })).toThrow('runs');
    expect(() => runScenario({ warmup: -1, setup: () => undefined, step: () => undefined })).toThrow('warmup');
  });
});
