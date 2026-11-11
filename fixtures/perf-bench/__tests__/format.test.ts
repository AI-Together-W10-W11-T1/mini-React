import { describe, expect, it } from 'vitest';
import { cellsOf, fmtMs, fmtPair } from '../format';
import type { BenchRow } from '../scenarios';

// [AI Note]: 표에 쓰는 글을 만드는 순수 함수만 시험한다. 숫자 자체(시간)는 값을 정해 주고 모양만 본다.
const summary = (p50: number | null, p95: number | null, n = 30) => ({ n, p50, p95, min: p50, max: p95 });

function row(overrides: Partial<BenchRow> = {}): BenchRow {
  return {
    id: 'B-05',
    title: '여러 위치 동시 변경',
    what: '설명',
    fixture: { items: 100, nodes: 507, elements: 305, texts: 202, depth: 5 },
    run: {
      warmup: 5,
      runs: 30,
      samples: [],
      metrics: { total: summary(1.2346, 2.5), vnode: summary(0.5, 0.75), diff: summary(0.25, 0.5), patch: summary(0.125, 0.25) },
      counts: { patches: 5 },
      countsStable: true,
      errors: 0,
      errorMessages: [],
      warmupErrors: 0,
    },
    phases: true,
    dom: { patchLines: 5, byKind: { SET_TEXT: 3, SET_ATTR: 1, INSERT: 1 }, mutationRecords: 5, nodesAdded: 1, nodesRemoved: 0 },
    preserved: { same: 507, targets: 507 },
    stateMatches: true,
    countError: null,
    ...overrides,
  };
}

describe('숫자 글', () => {
  it('fmtMs: 소수 셋째 자리, null은 "—"', () => {
    expect(fmtMs(1.23456)).toBe('1.235');
    expect(fmtMs(0)).toBe('0.000');
    expect(fmtMs(null)).toBe('—');
  });

  it('fmtPair: "p50 / p95", 값이 없으면(n = 0) "—"', () => {
    expect(fmtPair(summary(1.5, 2.25))).toBe('1.500 / 2.250');
    expect(fmtPair({ n: 0, p50: null, p95: null, min: null, max: null })).toBe('—');
  });
});

describe('cellsOf — 한 행의 칸 글 (QA-20이 읽는 data-col)', () => {
  it('이름 · 항목 수 · 노드 수 · 깊이 · 반복(준비 5 · 측정 30) · 오류 0', () => {
    const cells = cellsOf(row());
    expect(cells.name).toBe('B-05 여러 위치 동시 변경');
    expect(cells.fixture).toBe('항목 100 · 노드 507 · 깊이 5');
    expect(cells.repeat).toBe('준비 5 · 측정 30');
    expect(cells.errors).toBe('0');
  });

  it('시간 칸 = p50 / p95, 단계별 시간이 없는 시나리오(phases false)는 "—"', () => {
    expect(cellsOf(row()).total).toBe('1.235 / 2.500');
    expect(cellsOf(row()).vnode).toBe('0.500 / 0.750');
    const engine = cellsOf(row({ phases: false }));
    expect([engine.vnode, engine.diff, engine.patch]).toEqual(['—', '—', '—']);
    expect(engine.total).toBe('1.235 / 2.500');
  });

  it('DOM 작업 = patch 줄 수와 종류별 개수, MutationObserver 기록 · 추가 · 제거 노드는 따로', () => {
    const cells = cellsOf(row());
    expect(cells.dom).toBe('patch 5줄 (SET_TEXT 3 · SET_ATTR 1 · INSERT 1)');
    expect(cells.mutations).toBe('기록 5 · 추가 노드 1 · 제거 노드 0');
    expect(cellsOf(row({ dom: { patchLines: 0, byKind: {}, mutationRecords: 0, nodesAdded: 0, nodesRemoved: 0 } })).dom).toBe('patch 0줄');
  });

  it('노드 참조 유지 · 최종 상태', () => {
    expect(cellsOf(row()).preserved).toBe('507 / 507');
    expect(cellsOf(row()).correct).toBe('일치');
    expect(cellsOf(row({ stateMatches: false })).correct).toBe('불일치');
  });

  it('오류는 숨기지 않는다: 오류 수 · 메시지, 준비 중 오류, 집계 실행 오류가 칸에 나온다', () => {
    const base = row();
    const withErrors = cellsOf(row({ run: { ...base.run, errors: 2, errorMessages: ['boom 1', 'boom 2'], warmupErrors: 1 } }));
    expect(withErrors.errors).toContain('2건');
    expect(withErrors.errors).toContain('boom 1');
    expect(withErrors.errors).toContain('준비 중 1건');
    const failed = cellsOf(row({ dom: null, preserved: null, stateMatches: null, countError: 'count boom' }));
    expect(failed.dom).toBe('집계 실패');
    expect(failed.preserved).toBe('집계 실패');
    expect(failed.correct).toBe('집계 실패');
    expect(failed.extra).toContain('count boom');
  });

  it('비고: 개수(counts)를 시나리오 모양대로 적고, 반복마다 달라지면 알린다', () => {
    const b06 = cellsOf(row({ id: 'B-06', run: { ...row().run, counts: { setters: 10, renders: 10 } } }));
    expect(b06.extra).toBe('setter 10번 → 렌더 10번');
    const b07 = cellsOf(row({ id: 'B-07', run: { ...row().run, counts: { actions: 13, renders: 16 } } }));
    expect(b07.extra).toBe('동작 13번 → 렌더 16번');
    expect(cellsOf(row()).extra).toBe('측정 반복마다 patch 5줄');
    expect(cellsOf(row({ run: { ...row().run, countsStable: false } })).extra).toContain('반복마다 개수가 달라졌습니다');
  });
});
