import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

// [AI Note]: 성능 측정용 작은 공통 fixture (PRD §8.2 "동일한 초기 트리 · 데이터 · 변경 동작").
// Hook이 없는 순수 함수 컴포넌트다 — 상태는 props(state)로만 들어온다. 그래서 "같은 state → 같은 트리"이고,
// 시나리오가 state 하나만 바꿔도 어떤 patch가 나와야 하는지 미리 정해 둘 수 있다.
// 이벤트 핸들러는 모듈 안의 같은 함수(NOOP)를 쓴다: 렌더마다 새 함수가 생기면 시나리오와 상관없는 SET_EVENT가 섞여
// "변경 없음(B-01)"이 흐려지므로, 이 측정에서는 핸들러 교체 비용을 일부러 빼 둔다 (결과 표에도 적는다).

export interface BenchItem {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

export interface BenchState {
  readonly title: string;
  readonly counter: number;
  readonly items: readonly BenchItem[];
}

const NOOP = (): void => {};

export function makeItem(id: string, text = `항목 ${id}`, done = false): BenchItem {
  return { id, text, done };
}

/** 항목 `itemCount`개(`item-1` …)의 처음 상태 */
export function makeState(itemCount: number): BenchState {
  return {
    title: '성능 측정 목록',
    counter: 0,
    items: Array.from({ length: itemCount }, (_, i) => makeItem(`item-${i + 1}`)),
  };
}

// 자식 컴포넌트: props만 받아 <li> 하나를 돌려준다. key는 부모가 `h(BenchRow, { key })`로 준다 (풀린 <li>에 물려진다).
export function BenchRow(props: Props): VNode {
  const { item } = props as unknown as { item: BenchItem };
  return h(
    'li',
    { class: item.done ? 'item done' : 'item', 'data-id': item.id },
    h('span', { class: 'text' }, item.text),
    h('button', { type: 'button', onClick: NOOP }, '완료'),
  );
}

// 루트: 헤더(제목 · 카운터) + 목록. 항목 N개면 노드는 5N + 7개, 깊이는 5다 (describeTree가 실제로 센다).
export function BenchApp(props: Props): VNode {
  const { state } = props as unknown as { state: BenchState };
  return h(
    'section',
    { class: 'bench' },
    h('header', null, h('h1', null, state.title), h('span', { class: 'counter' }, state.counter)),
    h('ul', { class: 'list' }, ...state.items.map((item) => h(BenchRow, { key: item.id, item }))),
  );
}

export interface TreeInfo {
  /** 요소 + 글자 노드 전부 */
  readonly nodes: number;
  readonly elements: number;
  readonly texts: number;
  /** 가장 깊은 노드의 깊이 (루트 요소 = 1) */
  readonly depth: number;
}

/** 풀린 VNode(요소 · 글자만)의 노드 수 · 깊이를 센다. "항목 수 ≠ 노드 수"를 구분해 보고하려고 (PRD §8.1) */
export function describeTree(root: VNode): TreeInfo {
  let elements = 0;
  let texts = 0;
  let depth = 0;
  const walk = (node: VNode, level: number): void => {
    if (node.type === '#text') texts++;
    else elements++;
    if (level > depth) depth = level;
    for (const child of node.children) walk(child, level + 1);
  };
  walk(root, 1);
  return { nodes: elements + texts, elements, texts, depth };
}
