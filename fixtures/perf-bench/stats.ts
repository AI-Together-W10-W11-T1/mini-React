// [AI Note]: 측정값 요약 (PRD §8.2 p50 · p95). 순수 함수라 DOM · 엔진과 상관없다.
// 백분위 정의 = 선형 보간: 정렬한 뒤 위치 (n - 1) × p / 100 의 바로 아래 · 위 값을 비례로 섞는다 (numpy 기본과 같다).
// 그래서 짝수 개의 p50은 가운데 두 값의 평균이고, 값이 1개면 어떤 p든 그 값이다. 결과 표에도 이 정의를 적는다.

export interface Summary {
  /** 요약에 들어간 값(성공한 측정) 개수 */
  readonly n: number;
  readonly p50: number | null;
  readonly p95: number | null;
  readonly min: number | null;
  readonly max: number | null;
}

/** `values`의 p번째 백분위 (0 이상 100 이하). 입력은 고치지 않는다. 빈 배열 · 범위 밖 p · NaN · 무한대는 오류 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error('percentile: 빈 배열의 백분위는 구할 수 없습니다');
  if (!(p >= 0 && p <= 100)) throw new Error(`percentile: p는 0 이상 100 이하여야 합니다 (받은 값 ${p})`);
  if (values.some((v) => !Number.isFinite(v))) throw new Error('percentile: 유한한 숫자만 받습니다 (NaN · Infinity 불가)');
  const sorted = [...values].sort((a, b) => a - b);
  const position = ((sorted.length - 1) * p) / 100;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** { n, p50, p95, min, max }. 빈 배열이면 n = 0이고 나머지는 null (없는 숫자를 지어내지 않는다) */
export function summarize(values: readonly number[]): Summary {
  if (values.length === 0) return { n: 0, p50: null, p95: null, min: null, max: null };
  return {
    n: values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    min: percentile(values, 0),
    max: percentile(values, 100),
  };
}
