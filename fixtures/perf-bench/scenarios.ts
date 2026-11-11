import { h } from '@mini-react/react';
import { diff, resolveComponents } from '@mini-react/react-reconciler';
import { patch, renderAreaChildren } from '@mini-react/react-dom-bindings';
import type { PatchObserver } from '@mini-react/react-dom-bindings';
import type { Patch, VNode } from '@mini-react/shared';
import { BenchApp, describeTree, makeItem, makeState } from './benchApp';
import type { BenchState, TreeInfo } from './benchApp';
import { runScenario } from './runner';
import type { ScenarioResult } from './runner';

// [AI Note]: 성능 대시보드 시나리오 (확장 1, PRD §7 M-02 ~ M-06 · §8.1 B-01 ~ B-05).
// 측정 공정성 규칙 (PRD §8.2)을 코드 구조로 지킨다:
//  - "같은 초기 트리 · 같은 변경": 모든 시나리오는 같은 fixture(benchApp)와 같은 처음 state에서 출발하고, 변경은 state 몇 개를 미리 만들어 둔 것뿐이다.
//  - 초기 렌더링과 업데이트 분리: 처음 그리기(mountBase)와 state 만들기는 setup, 잰 구간(step)은 "업데이트"뿐이다.
//  - 단계별 시간: M-04 VNode 생성(컴포넌트 실행 + 풀기) · M-05 diff · M-06 patch를 단계마다 performance.now()로 따로 잰다.
//    FunctionComponent.update()가 하는 일(렌더 → 풀기 → diff → host.apply)과 같은 순서로 단계 함수를 직접 부른다 (Hook 없는 순수 루트라 setter 없이도 같은 일).
//  - 집계와 시간 측정을 분리: DOM 작업 집계(onPatch · MutationObserver)는 "집계 실행" 한 번에서만 하고, 시간을 재는 반복에는 관찰자를 붙이지 않는다.
//    관찰 콜백 · 기록 쌓기가 patch 시간에 섞이지 않게 하려는 것이다. 집계는 매번 같으므로(countsStable) 한 번으로 충분하다.
//  - 계측 패널 밖: 이 파일은 측정 영역(area)만 만진다. 결과 표 · 진행 표시는 main.ts가 영역 밖에 그린다.

export const DEFAULT_ITEM_COUNT = 100;

export type ScenarioId = 'B-01' | 'B-02' | 'B-03' | 'B-04' | 'B-05' | 'B-06' | 'B-07';
type PatchKind = Patch['kind'];

/** B-01 ~ B-05: state 몇 개를 차례로 적용하고 단계별로 잰다 */
export interface StageScenario {
  readonly kind: 'stages';
  readonly id: ScenarioId;
  readonly title: string;
  readonly what: string;
  /** 처음 state에서 출발해 차례로 적용할 state 목록 (매 반복 setup에서 만든다 — 만드는 시간은 재지 않는다) */
  changes(base: BenchState): BenchState[];
  /** 기대한 patch 종류별 개수 (단위 테스트가 확인) */
  readonly expected: Readonly<Partial<Record<PatchKind, number>>>;
}

const MID = 50; // 항목 100개 기준 가운데쯤 (0부터 센 번호)

function replaceItem(state: BenchState, index: number, change: (item: BenchState['items'][number]) => BenchState['items'][number]): BenchState {
  return { ...state, items: state.items.map((item, i) => (i === index ? change(item) : item)) };
}

export const STAGE_SCENARIOS: readonly StageScenario[] = [
  {
    kind: 'stages',
    id: 'B-01',
    title: '변경 없음',
    what: '같은 state로 다시 그린다. 불필요한 patch · DOM 작업이 0이어야 한다',
    changes: (base) => [{ ...base }],
    expected: {},
  },
  {
    kind: 'stages',
    id: 'B-02',
    title: '텍스트 하나 변경',
    what: `항목 하나(${MID + 1}번째)의 글자만 바꾼다`,
    changes: (base) => [replaceItem(base, MID, (item) => ({ ...item, text: `${item.text} (수정)` }))],
    expected: { SET_TEXT: 1 },
  },
  {
    kind: 'stages',
    id: 'B-03',
    title: '속성 하나 변경',
    what: `항목 하나(${MID + 1}번째)를 완료로 바꿔 class 속성 하나만 바뀐다`,
    changes: (base) => [replaceItem(base, MID, (item) => ({ ...item, done: true }))],
    expected: { SET_ATTR: 1 },
  },
  {
    kind: 'stages',
    id: 'B-04',
    title: '자식 하나 추가 · 삭제',
    what: `가운데(${MID + 1}번째 자리)에 항목 하나를 추가하고, 이어서 그 항목을 삭제한다 (두 단계 = 같은 반복 안의 업데이트 2번)`,
    changes: (base) => {
      const inserted: BenchState = {
        ...base,
        items: [...base.items.slice(0, MID), makeItem('item-new'), ...base.items.slice(MID)],
      };
      return [inserted, { ...base }];
    },
    expected: { INSERT: 1, REMOVE: 1 },
  },
  {
    kind: 'stages',
    id: 'B-05',
    title: '여러 위치 동시 변경',
    what: '제목 글자 · 카운터 글자 · 항목 하나의 class · 다른 항목 하나의 글자 · 끝에 항목 하나 추가를 한 번에 바꾼다',
    changes: (base) => {
      const edited = replaceItem(replaceItem(base, 9, (item) => ({ ...item, done: true })), MID, (item) => ({ ...item, text: `${item.text} (수정)` }));
      return [
        {
          title: `${base.title} (갱신)`,
          counter: base.counter + 1,
          items: [...edited.items, makeItem('item-new')],
        },
      ];
    },
    expected: { SET_TEXT: 3, SET_ATTR: 1, INSERT: 1 },
  },
];

// ---------------------------------------------------------------------------
// 결과 형태
// ---------------------------------------------------------------------------

export interface DomCounts {
  /** patch 목록 줄 수 (집계 단위: patch 한 줄 = 복합 작업 하나, 다른 구현의 DOM API 호출 1개와 같은 단위가 아님) */
  readonly patchLines: number;
  /** 종류별 줄 수 — `onPatch`가 알린 것을 센 것 (SET_TEXT · SET_ATTR · INSERT …) */
  readonly byKind: Readonly<Record<string, number>>;
  /** MutationObserver가 모은 기록 수 (DOM API 호출 수와 같지 않다) */
  readonly mutationRecords: number;
  /** 기록에 실린 추가된 노드 수 · 제거된 노드 수 (복합 INSERT는 하위 노드까지 한 덩어리로 1개) */
  readonly nodesAdded: number;
  readonly nodesRemoved: number;
}

export interface BenchRow {
  readonly id: ScenarioId;
  readonly title: string;
  readonly what: string;
  /** 항목 수 · 노드 수 · 깊이 (섞어 쓰지 않으려고 따로 적는다) */
  readonly fixture: TreeInfo & { readonly items: number };
  /** 시간 요약 · 반복 횟수 · 오류 */
  readonly run: ScenarioResult;
  /** M-04 ~ M-06 단계별 시간을 따로 쟀는가 (엔진 update() 한 덩어리로만 잰 시나리오는 false) */
  readonly phases: boolean;
  /** M-02: 집계 실행의 DOM 작업. 집계 실행이 실패하면 null */
  readonly dom: DomCounts | null;
  /** M-03: 보존 대상 노드 중 같은 참조가 남은 수 / 대상 수. 집계 실행이 실패하면 null */
  readonly preserved: { readonly same: number; readonly targets: number } | null;
  /** 최종 화면이 같은 state를 처음부터 다시 그린 것과 같은가 (정확성). 집계 실행이 실패하면 null */
  readonly stateMatches: boolean | null;
  /** 집계 실행이 던진 오류 메시지 (없으면 null) — 설명 없이 빼지 않으려고 남긴다 */
  readonly countError: string | null;
}

export interface BenchOptions {
  readonly itemCount?: number;
  readonly warmup?: number;
  readonly runs?: number;
}

// ---------------------------------------------------------------------------
// 단계 함수 (엔진 update()와 같은 순서)
// ---------------------------------------------------------------------------

function mountBase(area: Element, state: BenchState): VNode {
  const first = resolveComponents(h(BenchApp, { state }));
  renderAreaChildren(area, [first]); // 처음 그리기 — 잰 구간 밖 (setup)
  return first;
}

interface Stage {
  readonly next: VNode;
  readonly patches: readonly Patch[];
  readonly vnode: number;
  readonly diff: number;
  readonly patch: number;
}

/** 업데이트 한 번: M-04 VNode 생성 → M-05 diff → M-06 patch. 단계마다 따로 잰다 */
function updateStage(area: Element, previous: VNode, state: BenchState, onPatch?: PatchObserver): Stage {
  const t0 = performance.now();
  const next = resolveComponents(h(BenchApp, { state }));
  const t1 = performance.now();
  const patches = diff([previous], [next]);
  const t2 = performance.now();
  patch(area, patches, onPatch);
  const t3 = performance.now();
  return { next, patches, vnode: t1 - t0, diff: t2 - t1, patch: t3 - t2 };
}

/** 영역 안 모든 노드(요소 + 글자)를 모은다 — 노드 참조 유지(M-03)의 "보존 대상" */
function collectNodes(area: Element): Node[] {
  const out: Node[] = [];
  const walk = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      out.push(child);
      walk(child);
    }
  };
  walk(area);
  return out;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface CountPass {
  readonly dom: DomCounts;
  readonly preserved: { same: number; targets: number };
  readonly stateMatches: boolean;
}

// 집계 실행 (시간은 안 잼): onPatch로 종류별 patch 줄 수, MutationObserver로 기록 수 · 추가/제거 노드 수, 노드 참조 유지, 최종 화면 정확성
function countPass(area: Element, scenario: StageScenario, itemCount: number): CountPass {
  const base = makeState(itemCount);
  const states = scenario.changes(base);
  area.replaceChildren();
  let previous = mountBase(area, base);
  const targets = collectNodes(area); // 보존 대상 = 처음 그린 노드 전부
  const observer = new MutationObserver(() => {});
  observer.observe(area, { subtree: true, childList: true, attributes: true, characterData: true });
  const byKind: Record<string, number> = {};
  const onPatch: PatchObserver = (event) => {
    byKind[event.patch.kind] = (byKind[event.patch.kind] ?? 0) + 1;
  };
  let patchLines = 0;
  try {
    for (const state of states) {
      const stage = updateStage(area, previous, state, onPatch);
      patchLines += stage.patches.length;
      previous = stage.next;
    }
    const records = observer.takeRecords();
    let nodesAdded = 0;
    let nodesRemoved = 0;
    for (const record of records) {
      nodesAdded += record.addedNodes.length;
      nodesRemoved += record.removedNodes.length;
    }
    // 정확성: 마지막 state를 처음부터 다시 그린 화면과 같은가 (비교용 영역은 문서 밖)
    const expected = document.createElement('div');
    renderAreaChildren(expected, [resolveComponents(h(BenchApp, { state: states[states.length - 1] ?? base }))]);
    return {
      dom: { patchLines, byKind, mutationRecords: records.length, nodesAdded, nodesRemoved },
      preserved: { same: targets.filter((node) => area.contains(node)).length, targets: targets.length },
      stateMatches: area.innerHTML === expected.innerHTML,
    };
  } finally {
    observer.disconnect();
    area.replaceChildren();
  }
}

/**
 * B-01 ~ B-05 한 시나리오를 실행한다: 집계 실행 1번(시간 안 잼) + 시간 측정(준비 5 · 측정 30, 매 반복 처음 상태로 되돌림).
 * `area`는 측정 영역(계측 패널 밖)이다. 끝나면 영역을 비운다.
 */
export function runStageScenario(area: Element, scenario: StageScenario, options: BenchOptions = {}): BenchRow {
  const itemCount = options.itemCount ?? DEFAULT_ITEM_COUNT;
  const tree = resolveComponents(h(BenchApp, { state: makeState(itemCount) }));
  const fixture = { items: itemCount, ...describeTree(tree) };

  let counted: CountPass | null = null;
  let countError: string | null = null;
  try {
    counted = countPass(area, scenario, itemCount);
  } catch (error) {
    countError = messageOf(error);
  }

  interface Ctx {
    previous: VNode;
    states: BenchState[];
  }
  const run = runScenario<Ctx>({
    warmup: options.warmup,
    runs: options.runs,
    setup: () => {
      const base = makeState(itemCount);
      const states = scenario.changes(base); // 변경 만들기는 잰 구간 밖
      area.replaceChildren();
      return { previous: mountBase(area, base), states };
    },
    step: (ctx) => {
      let previous = ctx.previous;
      let vnode = 0;
      let diffMs = 0;
      let patchMs = 0;
      let lines = 0;
      for (const state of ctx.states) {
        const stage = updateStage(area, previous, state);
        vnode += stage.vnode;
        diffMs += stage.diff;
        patchMs += stage.patch;
        lines += stage.patches.length;
        previous = stage.next;
      }
      return { timings: { vnode, diff: diffMs, patch: patchMs }, counts: { patches: lines } };
    },
    teardown: () => area.replaceChildren(),
  });

  return {
    id: scenario.id,
    title: scenario.title,
    what: scenario.what,
    fixture,
    run,
    phases: true,
    dom: counted?.dom ?? null,
    preserved: counted?.preserved ?? null,
    stateMatches: counted?.stateMatches ?? null,
    countError,
  };
}
