import type { Summary } from './stats';
import type { BenchRow } from './scenarios';

// [AI Note]: 결과 표의 글을 만드는 순수 함수 (DOM을 모른다). 표 그리기는 main.ts가 이 글을 `data-col` 칸에 넣는다.
// 없는 값은 "—", 실패는 "집계 실패"로 보여 준다 — 비어 있는 칸을 0처럼 보이게 하지 않으려는 것이다 (측정하지 않은 수치를 만들지 않는다).

export const COLUMNS = [
  { key: 'name', label: '시나리오' },
  { key: 'fixture', label: '항목 · 노드 · 깊이' },
  { key: 'repeat', label: '반복' },
  { key: 'errors', label: '오류' },
  { key: 'total', label: '전체 M-07 p50 / p95 (ms)' },
  { key: 'vnode', label: 'VNode M-04 p50 / p95 (ms)' },
  { key: 'diff', label: 'Diff M-05 p50 / p95 (ms)' },
  { key: 'patch', label: 'Patch M-06 p50 / p95 (ms)' },
  { key: 'dom', label: 'DOM 작업 M-02 (patch 줄)' },
  { key: 'mutations', label: 'MutationObserver' },
  { key: 'preserved', label: '노드 유지 M-03' },
  { key: 'correct', label: '최종 화면 = 상태' },
  { key: 'extra', label: '비고' },
] as const;

export type ColumnKey = (typeof COLUMNS)[number]['key'];

export function fmtMs(value: number | null): string {
  return value === null ? '—' : value.toFixed(3);
}

/** "p50 / p95". 값이 없으면(성공한 측정 0개) "—" */
export function fmtPair(summary: Summary): string {
  if (summary.n === 0 || summary.p50 === null || summary.p95 === null) return '—';
  return `${fmtMs(summary.p50)} / ${fmtMs(summary.p95)}`;
}

const FAILED = '집계 실패';

function errorCell(row: BenchRow): string {
  const { errors, errorMessages, warmupErrors } = row.run;
  if (errors === 0 && warmupErrors === 0) return '0';
  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors}건 (${errorMessages.join(' | ')})`);
  else parts.push('0');
  if (warmupErrors > 0) parts.push(`준비 중 ${warmupErrors}건`);
  return parts.join(' · ');
}

function extraCell(row: BenchRow): string {
  const { counts, countsStable } = row.run;
  const parts: string[] = [];
  if (row.id === 'B-06') parts.push(`setter ${counts.setters ?? '?'}번 → 렌더 ${counts.renders ?? '?'}번`);
  else if (row.id === 'B-07') parts.push(`동작 ${counts.actions ?? '?'}번 → 렌더 ${counts.renders ?? '?'}번`);
  else parts.push(`측정 반복마다 patch ${counts.patches ?? '?'}줄`);
  if (!countsStable) parts.push('반복마다 개수가 달라졌습니다');
  if (row.countError !== null) parts.push(`집계 실행 오류: ${row.countError}`);
  return parts.join(' · ');
}

export function cellsOf(row: BenchRow): Record<ColumnKey, string> {
  const kinds = row.dom === null ? '' : Object.entries(row.dom.byKind).map(([kind, count]) => `${kind} ${count}`).join(' · ');
  const phase = (key: string): string => (row.phases && row.run.metrics[key] !== undefined ? fmtPair(row.run.metrics[key]) : '—');
  return {
    name: `${row.id} ${row.title}`,
    fixture: `항목 ${row.fixture.items} · 노드 ${row.fixture.nodes} · 깊이 ${row.fixture.depth}`,
    repeat: `준비 ${row.run.warmup} · 측정 ${row.run.runs}`,
    errors: errorCell(row),
    total: fmtPair(row.run.metrics.total),
    vnode: phase('vnode'),
    diff: phase('diff'),
    patch: phase('patch'),
    dom: row.dom === null ? FAILED : `patch ${row.dom.patchLines}줄${kinds === '' ? '' : ` (${kinds})`}`,
    mutations: row.dom === null ? FAILED : `기록 ${row.dom.mutationRecords} · 추가 노드 ${row.dom.nodesAdded} · 제거 노드 ${row.dom.nodesRemoved}`,
    preserved: row.preserved === null ? FAILED : `${row.preserved.same} / ${row.preserved.targets}`,
    correct: row.stateMatches === null ? FAILED : row.stateMatches ? '일치' : '불일치',
    extra: extraCell(row),
  };
}
