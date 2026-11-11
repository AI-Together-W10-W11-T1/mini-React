import { afterEach, describe, expect, it } from 'vitest';
import { diff, resolveComponents } from '@mini-react/react-reconciler';
import { h } from '@mini-react/react';
import { BenchApp, describeTree, makeState } from '../benchApp';
import { ALL_SCENARIOS, DEFAULT_ITEM_COUNT, ENGINE_SCENARIOS, STAGE_SCENARIOS, runEngineScenario, runScenarioById, runStageScenario } from '../scenarios';
import type { EngineScenario, StageScenario } from '../scenarios';

// [AI Note]: 시나리오가 "정해 둔 변경"만 정확히 일으키는지(기대한 patch 종류 · 개수), 집계 단위가 patch 목록과 맞는지,
// 노드 수 · 항목 수가 결과에 들어가는지 본다. 시간 값은 기기마다 달라 단언하지 않는다 (형태 · 개수만).
const areas: HTMLElement[] = [];
function makeArea(): HTMLElement {
  const area = document.createElement('div');
  document.body.appendChild(area);
  areas.push(area);
  return area;
}
afterEach(() => areas.splice(0).forEach((a) => a.remove()));

const SMALL = { itemCount: 100, warmup: 1, runs: 3 } as const;
const byId = (id: string): StageScenario => {
  const found = STAGE_SCENARIOS.find((s) => s.id === id);
  if (found === undefined) throw new Error(`시나리오 ${id} 없음`);
  return found;
};

describe('공통 fixture (benchApp) — 같은 초기 트리 · 노드 수 · 항목 수 · 깊이', () => {
  it('항목 100개면 노드 507개(요소 + 글자) · 깊이 5, 항목 수 ≠ 노드 수', () => {
    const tree = resolveComponents(h(BenchApp, { state: makeState(100) }));
    const info = describeTree(tree);
    expect(info.nodes).toBe(5 * 100 + 7);
    expect(info.elements + info.texts).toBe(info.nodes);
    expect(info.depth).toBe(5);
    expect(info.nodes).not.toBe(100);
  });

  it('같은 state로 두 번 풀면 diff 0건 (핸들러 참조가 같아 SET_EVENT도 없음)', () => {
    const state = makeState(10);
    const a = resolveComponents(h(BenchApp, { state }));
    const b = resolveComponents(h(BenchApp, { state }));
    expect(diff([a], [b])).toEqual([]);
  });
});

describe('B-01 ~ B-05: 기대한 patch 종류 · 개수 (Dev-25 · PRD §8.1)', () => {
  it('시나리오는 B-01 ~ B-05 다섯 개이고 id · 제목 · 설명이 있다', () => {
    expect(STAGE_SCENARIOS.map((s) => s.id)).toEqual(['B-01', 'B-02', 'B-03', 'B-04', 'B-05']);
    for (const s of STAGE_SCENARIOS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.what.length).toBeGreaterThan(0);
    }
    expect(DEFAULT_ITEM_COUNT).toBe(100);
  });

  const expectations: Record<string, Record<string, number>> = {
    'B-01': {},
    'B-02': { SET_TEXT: 1 },
    'B-03': { SET_ATTR: 1 },
    'B-04': { INSERT: 1, REMOVE: 1 },
    'B-05': { SET_TEXT: 3, SET_ATTR: 1, INSERT: 1 },
  };

  for (const [id, kinds] of Object.entries(expectations)) {
    it(`${id}: patch 종류별 개수 = ${JSON.stringify(kinds)} (집계 단위 = patch 한 줄)`, () => {
      const row = runStageScenario(makeArea(), byId(id), SMALL);
      expect(row.countError).toBeNull();
      expect(row.dom?.byKind).toEqual(kinds);
      const total = Object.values(kinds).reduce((a, b) => a + b, 0);
      expect(row.dom?.patchLines).toBe(total);
      // 시간 측정 쪽 반복이 센 patch 줄 수(counts)도 같다 — 집계 실행과 측정 실행이 같은 일을 한다
      expect(row.run.counts.patches).toBe(total);
      expect(row.run.countsStable).toBe(true);
    });
  }

  it('집계 개수는 diff가 낸 patch 목록과 정확히 일치한다 (B-05)', () => {
    const base = makeState(100);
    const s = byId('B-05');
    let prev = resolveComponents(h(BenchApp, { state: base }));
    let lines = 0;
    for (const state of s.changes(base)) {
      const next = resolveComponents(h(BenchApp, { state }));
      lines += diff([prev], [next]).length;
      prev = next;
    }
    expect(runStageScenario(makeArea(), s, SMALL).dom?.patchLines).toBe(lines);
  });
});

describe('실제 DOM 쪽 집계 · 노드 참조 유지 · 최종 상태 (M-02 · M-03)', () => {
  it('B-01: DOM 변경 기록 0건, 노드 전부 같은 참조, 화면 = 다시 그린 것과 같음', () => {
    const row = runStageScenario(makeArea(), byId('B-01'), SMALL);
    expect(row.dom).toMatchObject({ patchLines: 0, mutationRecords: 0, nodesAdded: 0, nodesRemoved: 0 });
    expect(row.preserved).toEqual({ same: 507, targets: 507 });
    expect(row.stateMatches).toBe(true);
  });

  it('B-02: 글자 하나만 — MutationObserver 기록 1건(characterData), 추가 · 제거 노드 0', () => {
    const row = runStageScenario(makeArea(), byId('B-02'), SMALL);
    expect(row.dom).toMatchObject({ patchLines: 1, mutationRecords: 1, nodesAdded: 0, nodesRemoved: 0 });
    expect(row.preserved).toEqual({ same: 507, targets: 507 });
    expect(row.stateMatches).toBe(true);
  });

  it('B-03: 속성 하나만 — 기록 1건(attributes), 노드 전부 유지', () => {
    const row = runStageScenario(makeArea(), byId('B-03'), SMALL);
    expect(row.dom).toMatchObject({ patchLines: 1, mutationRecords: 1, nodesAdded: 0, nodesRemoved: 0 });
    expect(row.preserved).toEqual({ same: 507, targets: 507 });
  });

  it('B-04: 추가 1 + 삭제 1 — 기록 2건(childList), 추가 · 제거 노드 각 1 (복합 INSERT의 하위 노드는 따로 세지 않음), 원래 노드 전부 유지', () => {
    const row = runStageScenario(makeArea(), byId('B-04'), SMALL);
    expect(row.dom).toMatchObject({ patchLines: 2, mutationRecords: 2, nodesAdded: 1, nodesRemoved: 1 });
    expect(row.preserved).toEqual({ same: 507, targets: 507 });
    expect(row.stateMatches).toBe(true);
  });

  it('B-05: 여러 위치 동시 변경 — 최종 화면이 다시 그린 것과 같고 원래 노드는 전부 유지', () => {
    const row = runStageScenario(makeArea(), byId('B-05'), SMALL);
    expect(row.dom?.patchLines).toBe(5);
    expect(row.dom?.nodesAdded).toBe(1);
    expect(row.preserved).toEqual({ same: 507, targets: 507 });
    expect(row.stateMatches).toBe(true);
  });
});

describe('결과 형태 — 조건 · 반복 · 오류 (PRD §8.2)', () => {
  it('항목 수 · 노드 수 · 깊이가 결과에 들어간다', () => {
    const row = runStageScenario(makeArea(), byId('B-02'), { itemCount: 20, warmup: 1, runs: 2 });
    // 요소 = 항목당 li · span · button 3개 + section · header · h1 · span · ul 5개, 글자 = 항목당 2개 + 제목 · 카운터 2개
    expect(row.fixture).toEqual({ items: 20, nodes: 107, elements: 65, texts: 42, depth: 5 });
  });

  it('기본은 준비 5회 · 측정 30회이고 단계별 시간(vnode · diff · patch)과 전체 시간이 요약된다', () => {
    const row = runStageScenario(makeArea(), byId('B-01'), { itemCount: 10 });
    expect(row.run.warmup).toBe(5);
    expect(row.run.runs).toBe(30);
    expect(row.run.errors).toBe(0);
    expect(Object.keys(row.run.metrics).sort()).toEqual(['diff', 'patch', 'total', 'vnode']);
    for (const summary of Object.values(row.run.metrics)) {
      expect(summary.n).toBe(30);
      expect(typeof summary.p50).toBe('number');
      expect(typeof summary.p95).toBe('number');
    }
    expect(row.phases).toBe(true);
  });

  it('한 반복이 끝나면 영역을 비운다 (다음 시나리오가 이어서 쓸 수 있다)', () => {
    const area = makeArea();
    runStageScenario(area, byId('B-02'), SMALL);
    expect(area.childNodes).toHaveLength(0);
  });

  it('반복 중 오류는 숨기지 않는다: 변경 만들기가 던지면 오류 수 · 메시지가 남고 집계 실행 오류도 기록된다', () => {
    const broken: StageScenario = {
      kind: 'stages',
      id: 'B-02',
      title: '고장 난 시나리오',
      what: '오류 기록 확인용',
      expected: {},
      changes: () => {
        throw new Error('changes boom');
      },
    };
    const row = runStageScenario(makeArea(), broken, SMALL);
    expect(row.run.errors).toBe(3);
    expect(row.run.errorMessages[0]).toBe('changes boom');
    expect(row.run.metrics.total.n).toBe(0);
    expect(row.countError).toBe('changes boom');
    expect(row.dom).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dev-26: B-06 연속 상태 변경 · B-07 개인 앱 대표 동작 (엔진 경로: setter · 이벤트 → 렌더 → diff → patch)
// ---------------------------------------------------------------------------

const engineById = (id: string): EngineScenario => {
  const found = ENGINE_SCENARIOS.find((s) => s.id === id);
  if (found === undefined) throw new Error(`엔진 시나리오 ${id} 없음`);
  return found;
};

describe('B-06 연속 상태 변경 (엔진 경로, M-07)', () => {
  it('시나리오 목록: 단계 시나리오 B-01 ~ B-05 + 엔진 시나리오 B-06 · B-07 = 7개', () => {
    expect(ENGINE_SCENARIOS.map((s) => s.id)).toEqual(['B-06', 'B-07']);
    expect(ALL_SCENARIOS.map((s) => s.id)).toEqual(['B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06', 'B-07']);
  });

  it('setter 10번 → 렌더 10번 · 최종 카운터 10 · 화면 = state (즉시 동기 정책)', () => {
    const area = makeArea();
    const row = runEngineScenario(area, engineById('B-06'), { warmup: 1, runs: 3 });
    expect(row.countError).toBeNull();
    expect(row.run.counts).toEqual({ setters: 10, renders: 10 });
    expect(row.run.countsStable).toBe(true);
    expect(row.stateMatches).toBe(true);
    expect(row.run.errors).toBe(0);
  });

  it('단계별 시간(vnode · diff · patch)은 없고 전체 시간(total)만 있다 — 엔진 update() 한 덩어리', () => {
    const row = runEngineScenario(makeArea(), engineById('B-06'), { warmup: 1, runs: 3 });
    expect(row.phases).toBe(false);
    expect(Object.keys(row.run.metrics)).toEqual(['total']);
    expect(row.run.metrics.total.n).toBe(3);
  });

  it('DOM 작업: 글자 10줄(SET_TEXT)뿐, 추가 · 제거 노드 0, 노드는 전부 같은 참조 (onPatch는 집계 실행에서만 쓴다)', () => {
    const row = runEngineScenario(makeArea(), engineById('B-06'), { warmup: 0, runs: 2 });
    expect(row.dom).toMatchObject({ patchLines: 10, byKind: { SET_TEXT: 10 }, nodesAdded: 0, nodesRemoved: 0 });
    expect(row.preserved).toEqual({ same: 507, targets: 507 });
    expect(row.fixture).toMatchObject({ items: 100, nodes: 507, depth: 5 });
  });
});

describe('B-07 개인 앱 대표 동작 (검증 페이지 App: [+1] · 입력 · 목록)', () => {
  it('동작 13번(클릭 · 입력) → 렌더 16번이고 화면이 상태와 맞다 (카운터 3 · 이름 · 목록 순서 · 체크 · 요약)', () => {
    const row = runEngineScenario(makeArea(), engineById('B-07'), { warmup: 1, runs: 3 });
    expect(row.countError).toBeNull();
    // [+1] 3번 = 3, 이름 입력 2번 = 2, [추가] 3번 = (입력 1 + 추가 2) × 3 = 9, [위로] 1 + 체크 1 = 2 → 렌더 16
    expect(row.run.counts).toEqual({ actions: 13, renders: 16 });
    expect(row.run.countsStable).toBe(true);
    expect(row.stateMatches).toBe(true);
    expect(row.run.errors).toBe(0);
  });

  it('입력창 · 카운터 등 보존 대상 7개가 모두 같은 참조로 남는다 (입력 안정성)', () => {
    const row = runEngineScenario(makeArea(), engineById('B-07'), { warmup: 0, runs: 2 });
    expect(row.preserved).toEqual({ same: 7, targets: 7 });
  });

  it('DOM 작업 집계는 patch 종류별 합이 patch 줄 수와 같고, 단계별 시간은 없다', () => {
    const row = runEngineScenario(makeArea(), engineById('B-07'), { warmup: 0, runs: 2 });
    const sum = Object.values(row.dom?.byKind ?? {}).reduce((a, b) => a + b, 0);
    expect(sum).toBe(row.dom?.patchLines);
    expect(row.dom?.patchLines).toBeGreaterThan(0);
    expect(row.phases).toBe(false);
  });

  it('끝나면 영역을 비우고 탭 제목(document.title)을 원래대로 돌려 놓는다', () => {
    const before = document.title;
    const area = makeArea();
    runEngineScenario(area, engineById('B-07'), { warmup: 1, runs: 2 });
    expect(area.childNodes).toHaveLength(0);
    expect(document.title).toBe(before);
  });

  it('처음 항목 수는 0이고 노드 수 · 깊이가 결과에 들어간다', () => {
    const row = runEngineScenario(makeArea(), engineById('B-07'), { warmup: 0, runs: 1 });
    expect(row.fixture.items).toBe(0);
    expect(row.fixture.nodes).toBeGreaterThan(10);
    expect(row.fixture.depth).toBeGreaterThan(3);
  });
});

describe('runScenarioById — 화면이 부르는 하나의 입구', () => {
  it('B-01 ~ B-07 아무 id나 같은 모양(BenchRow)을 돌려준다', () => {
    for (const id of ['B-01', 'B-06'] as const) {
      const row = runScenarioById(makeArea(), id, { warmup: 0, runs: 1, itemCount: 20 });
      expect(row.id).toBe(id);
      expect(row.run.runs).toBe(1);
    }
  });
});
