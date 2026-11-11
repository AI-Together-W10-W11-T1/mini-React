import { describe, expect, it, vi } from 'vitest';
import { runScenario, runScenarioAsync } from '../runner';

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

// [AI Note]: Batching(결정 9 B)에서는 setter · 이벤트 뒤 렌더가 마이크로태스크로 돌아서 "잴 구간"도 기다려야 한다. 같은 규칙(준비 · 측정 · 오류 · setup/teardown)을 async step에 그대로 적용하는지 본다.
describe('runScenarioAsync — async step도 같은 규칙으로 잰다 (Batching, PRD §8.2)', () => {
  it('기본값은 준비 5회 + 측정 30회, 준비는 결과에서 빠지고 측정 30회만 요약된다', async () => {
    const step = vi.fn(async () => {});
    const result = await runScenarioAsync({ setup: () => undefined, step });
    expect(step).toHaveBeenCalledTimes(35);
    expect(result.warmup).toBe(5);
    expect(result.runs).toBe(30);
    expect(result.samples).toHaveLength(30);
    expect(result.errors).toBe(0);
  });

  it('step이 끝나기를(Promise가 풀리기를) 기다린 뒤에 시간을 잰다 — 마이크로태스크로 돈 렌더가 구간 안에 들어간다', async () => {
    const done: string[] = [];
    // now() 호출은 step 시작 전 · step이 끝난 뒤 한 쌍. step이 끝나기 전에는 두 번째 now()를 부르지 않는다
    const ticks = [100, 130];
    let i = 0;
    const now = (): number => {
      done.push(`now${i}`);
      return ticks[i++];
    };
    const result = await runScenarioAsync({
      warmup: 0,
      runs: 1,
      now,
      setup: () => undefined,
      step: async () => {
        await Promise.resolve();
        done.push('step 끝');
      },
    });
    expect(done).toEqual(['now0', 'step 끝', 'now1']);
    expect(result.samples).toEqual([30]);
  });

  it('동기 step도 받는다 (같은 모양의 결과)', async () => {
    const result = await runScenarioAsync({ warmup: 1, runs: 2, setup: () => undefined, step: () => ({ counts: { n: 1 } }) });
    expect(result.samples).toHaveLength(2);
    expect(result.counts).toEqual({ n: 1 });
    expect(result.countsStable).toBe(true);
  });

  it('step이 돌려준 단계별 시간 · 개수를 요약하고, 개수가 반복마다 다르면 countsStable = false', async () => {
    let i = 0;
    const result = await runScenarioAsync({
      warmup: 0,
      runs: 3,
      setup: () => undefined,
      step: async () => ({ timings: { patch: ++i }, counts: { patches: i } }),
    });
    expect(result.metrics.patch).toMatchObject({ n: 3, min: 1, max: 3 });
    expect(result.countsStable).toBe(false);
  });

  it('매 반복 전에 setup, 반복이 끝나면(step이 던져도) teardown이 불리고 ctx가 그대로 간다', async () => {
    const order: string[] = [];
    let serial = 0;
    await runScenarioAsync({
      warmup: 1,
      runs: 1,
      setup: () => {
        const id = ++serial;
        order.push(`setup${id}`);
        return id;
      },
      step: async (ctx) => {
        order.push(`step${ctx}`);
        if (ctx === 2) throw new Error('boom');
      },
      teardown: (ctx) => void order.push(`teardown${ctx}`),
    });
    expect(order).toEqual(['setup1', 'step1', 'teardown1', 'setup2', 'step2', 'teardown2']);
  });

  it('step이 reject한 반복은 samples에서 빠지되 errors 개수와 메시지로 남고, 준비 중 오류는 warmupErrors로 센다', async () => {
    let i = 0;
    const result = await runScenarioAsync({
      warmup: 2,
      runs: 4,
      setup: () => undefined,
      step: async () => {
        i++;
        if (i === 1) throw new Error('warm boom');
        if (i > 2 && i % 2 === 0) throw new Error(`boom ${i}`);
      },
    });
    expect(result.warmupErrors).toBe(1);
    expect(result.errors).toBe(2);
    expect(result.errorMessages).toEqual(['boom 4', 'boom 6']);
    expect(result.metrics.total.n + result.errors).toBe(result.runs);
  });

  it('setup이 던진 반복도 오류로 센다 (step · teardown은 부르지 않음)', async () => {
    const step = vi.fn(async () => {});
    const teardown = vi.fn();
    const result = await runScenarioAsync({
      warmup: 0,
      runs: 2,
      setup: () => {
        throw new Error('setup boom');
      },
      step,
      teardown,
    });
    expect(result.errors).toBe(2);
    expect(step).not.toHaveBeenCalled();
    expect(teardown).not.toHaveBeenCalled();
  });

  it('runs가 1보다 작거나 warmup이 음수면 오류 (Promise가 reject)', async () => {
    await expect(runScenarioAsync({ runs: 0, setup: () => undefined, step: async () => {} })).rejects.toThrow('runs');
    await expect(runScenarioAsync({ warmup: -1, setup: () => undefined, step: async () => {} })).rejects.toThrow('warmup');
  });
});
