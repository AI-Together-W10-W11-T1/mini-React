import { summarize } from './stats';
import type { Summary } from './stats';

// [AI Note]: 측정 러너 (PRD §8.2). 규칙을 코드로 고정한다.
// ① 매 반복(준비 포함) 전에 setup으로 상태를 초기화한다 — 초기 렌더링과 업데이트(step)를 분리한다.
// ② 시간은 step 구간만 잰다 (setup · teardown은 안 잼). 준비 5회는 같은 경로를 돌리되 결과에서 뺀다.
// ③ 오류가 난 반복은 조용히 버리지 않는다: errors 개수와 메시지로 남기고, 준비 중 오류도 warmupErrors로 센다.
//    성공한 반복의 시간만 요약하므로 측정 n + errors = runs 이다.
// DOM · 엔진을 모른다 (step이 무엇을 하는지는 시나리오가 정한다).
// 동기 step용 runScenario(B-01 ~ B-05)와 마이크로태스크를 기다리는 runScenarioAsync(B-06 · B-07, Batching)가 같은 규칙을 쓴다.

export const DEFAULT_WARMUP = 5;
export const DEFAULT_RUNS = 30;
/** 오류 메시지는 이만큼만 보관한다 (같은 오류가 30번 쌓이는 것을 막는다). 개수(errors)는 전부 센다 */
export const MAX_ERROR_MESSAGES = 10;

/** step이 돌려줄 수 있는 것: 단계별 시간(ms)과 개수. 둘 다 없어도 된다 */
export interface StepResult {
  /** 이름 → 걸린 시간(ms). step이 안에서 `performance.now()`로 나눠 잰 것 (예: vnode · diff · patch) */
  readonly timings?: Readonly<Record<string, number>>;
  /** 이름 → 개수. 매 반복 같아야 하는 값 (예: patch 줄 수) */
  readonly counts?: Readonly<Record<string, number>>;
}

export interface RunOptions<C> {
  /** 매 반복 전에 불린다 — 상태를 처음으로 되돌리고 step이 쓸 것(ctx)을 만든다 */
  setup: () => C;
  /** 잴 구간. 던지면 그 반복은 오류 */
  step: (ctx: C) => StepResult | void;
  /** 반복이 끝날 때마다(step이 던져도) 부른다. 영역 비우기 · 인스턴스 정리용 */
  teardown?: (ctx: C) => void;
  /** 준비 실행 횟수 (기본 5). 결과에서 빠진다 */
  warmup?: number;
  /** 측정 횟수 (기본 30) */
  runs?: number;
  /** 시계 (기본 `performance.now()`). 테스트가 가짜를 꽂는다 */
  now?: () => number;
}

export interface ScenarioResult {
  readonly warmup: number;
  /** 요청한 측정 횟수 */
  readonly runs: number;
  /** 성공한 측정의 step 전체 시간(ms) — 요약 `metrics.total`의 원본 */
  readonly samples: readonly number[];
  /** `total` + step이 돌려준 timings 키마다 요약 */
  readonly metrics: Readonly<Record<string, Summary>>;
  /** 첫 성공 측정의 counts */
  readonly counts: Readonly<Record<string, number>>;
  /** 모든 성공 측정에서 counts가 같았는가 */
  readonly countsStable: boolean;
  /** 측정 중 오류 난 반복 수 */
  readonly errors: number;
  readonly errorMessages: readonly string[];
  /** 준비 중 오류 난 반복 수 (측정 결과에는 안 들어가지만 숨기지 않는다) */
  readonly warmupErrors: number;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sameCounts(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

// 준비 · 측정 결과를 모으는 부분. 동기 · 비동기 러너가 같은 규칙(준비는 결과에서 뺌, 오류는 개수 · 메시지로 남김)을 쓰도록 한곳에 둔다
function createCollector(options: { warmup?: number; runs?: number; now?: () => number }, who: string) {
  const warmup = options.warmup ?? DEFAULT_WARMUP;
  const runs = options.runs ?? DEFAULT_RUNS;
  const now = options.now ?? (() => performance.now());
  if (!Number.isInteger(warmup) || warmup < 0) throw new Error(`${who}: warmup은 0 이상의 정수여야 합니다 (받은 값 ${warmup})`);
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`${who}: runs는 1 이상의 정수여야 합니다 (받은 값 ${runs})`);

  const samples: number[] = [];
  const timingSamples = new Map<string, number[]>();
  let firstCounts: Readonly<Record<string, number>> | null = null;
  let countsStable = true;
  let errors = 0;
  let warmupErrors = 0;
  const errorMessages: string[] = [];

  return {
    warmup,
    runs,
    now,
    /** 반복 한 번이 성공했다. 준비 반복이면 버린다 */
    success(isWarmup: boolean, total: number, result: StepResult | void): void {
      if (isWarmup) return;
      samples.push(total);
      for (const [key, value] of Object.entries(result?.timings ?? {})) {
        const list = timingSamples.get(key) ?? [];
        list.push(value);
        timingSamples.set(key, list);
      }
      const counts = result?.counts ?? {};
      if (firstCounts === null) firstCounts = counts;
      else if (!sameCounts(firstCounts, counts)) countsStable = false;
    },
    /** 반복 한 번이 오류였다 */
    failure(isWarmup: boolean, error: unknown): void {
      if (isWarmup) {
        warmupErrors++;
      } else {
        errors++;
        if (errorMessages.length < MAX_ERROR_MESSAGES) errorMessages.push(messageOf(error));
      }
    },
    finish(): ScenarioResult {
      const metrics: Record<string, Summary> = { total: summarize(samples) };
      for (const [key, list] of timingSamples) metrics[key] = summarize(list);
      return { warmup, runs, samples, metrics, counts: firstCounts ?? {}, countsStable, errors, errorMessages, warmupErrors };
    },
  };
}

export function runScenario<C>(options: RunOptions<C>): ScenarioResult {
  const collector = createCollector(options, 'runScenario');
  const { now } = collector;

  // 반복 한 번. 성공하면 { total, result }, 실패하면 오류를 던진다 (teardown은 ctx가 만들어졌을 때만, 항상 부른다)
  function once(): { total: number; result: StepResult | void } {
    const ctx = options.setup();
    try {
      const start = now();
      const result = options.step(ctx);
      const end = now();
      return { total: end - start, result };
    } finally {
      options.teardown?.(ctx);
    }
  }

  for (let i = 0; i < collector.warmup + collector.runs; i++) {
    const isWarmup = i < collector.warmup;
    try {
      const { total, result } = once();
      collector.success(isWarmup, total, result);
    } catch (error) {
      collector.failure(isWarmup, error);
    }
  }
  return collector.finish();
}

export interface AsyncRunOptions<C> extends Omit<RunOptions<C>, 'step'> {
  /** 잴 구간. Promise가 풀릴 때까지가 구간이다 (던지거나 reject하면 그 반복은 오류) */
  step: (ctx: C) => StepResult | void | Promise<StepResult | void>;
}

// [AI Note]: 마이크로태스크 Batching(결정 9 B, task_003): setter · 이벤트가 만든 렌더는 호출한 코드가 끝난 직후에 돈다.
// 그래서 "setter 호출부터 DOM 반영 완료까지"(M-07)를 재려면 step이 마이크로태스크를 기다려야 하고, 시간은 그 Promise가 풀린 뒤에 잰다.
// 규칙(준비 · 측정 · 오류 · setup/teardown)은 runScenario와 같다 (createCollector 공유). B-01 ~ B-05(단계 시나리오)는 동기라 runScenario를 그대로 쓴다.
export async function runScenarioAsync<C>(options: AsyncRunOptions<C>): Promise<ScenarioResult> {
  const collector = createCollector(options, 'runScenarioAsync');
  const { now } = collector;

  async function once(): Promise<{ total: number; result: StepResult | void }> {
    const ctx = options.setup();
    try {
      const start = now();
      const result = await options.step(ctx);
      const end = now();
      return { total: end - start, result };
    } finally {
      options.teardown?.(ctx);
    }
  }

  for (let i = 0; i < collector.warmup + collector.runs; i++) {
    const isWarmup = i < collector.warmup;
    try {
      const { total, result } = await once();
      collector.success(isWarmup, total, result);
    } catch (error) {
      collector.failure(isWarmup, error);
    }
  }
  return collector.finish();
}
