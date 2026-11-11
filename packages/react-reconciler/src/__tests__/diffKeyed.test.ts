import { describe, it, expect } from 'vitest';
import { h } from '@mini-react/react';
import { diff } from '../diff';
import { invertPatches } from '../invertPatches';
import { applyPatches, normalizeTree } from './applyPatches';
import { makeRng } from './randomTree';
import type { AreaChildren, ElementVNode, Key, Patch, VNode } from '@mini-react/shared';

// Key 확장 (알고리즘 결정 2 B). key VNode는 h()로 만든다 (Phase 1 화면에는 key가 없고 단위 테스트로만 검증).

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

const li = (key: Key, label: string = String(key)): ElementVNode => h('li', { key }, label) as ElementVNode;
const plainLi = (label: string): ElementVNode => h('li', null, label) as ElementVNode;
const list = (...items: VNode[]): AreaChildren => [h('ul', null, ...items) as ElementVNode];
const keysOf = (tree: AreaChildren): unknown[] => tree[0].children.map((c) => (c as ElementVNode).key);

/** key 속성을 모든 단계에서 뺀 복사본 (위치 비교에서는 key가 patch로 안 옮겨지므로 비교에서 제외) */
function stripKeys(tree: AreaChildren): AreaChildren {
  return tree.map((node) => {
    const { key: _key, ...rest } = node as ElementVNode;
    return { ...rest, children: stripKeys(node.children) } as VNode;
  });
}

/**
 * diff를 돌리고 applyPatches(old, patches) = new, applyPatches(new, 역패치) = old 를 함께 확인한다.
 * 위치 비교로 돌아가는 목록은 key를 patch로 옮기지 않으므로(key는 props가 아님) `positional`일 때 key는 비교에서 뺀다.
 */
function run(oldTree: AreaChildren, newTree: AreaChildren, positional = false): Patch[] {
  const patches = diff(deepFreeze(oldTree), deepFreeze(newTree));
  const norm = (tree: AreaChildren) => normalizeTree(positional ? stripKeys(tree) : tree);
  expect(norm(applyPatches(oldTree, patches))).toEqual(norm(newTree));
  expect(norm(applyPatches(newTree, invertPatches(patches)))).toEqual(norm(oldTree));
  return patches;
}

describe('diff Key — 삽입 · 삭제 · 재정렬', () => {
  it('중간 삽입: INSERT 한 줄만, 이동 · 다른 patch 없음', () => {
    const patches = run(list(li('a'), li('c')), list(li('a'), li('b'), li('c')));
    expect(patches).toEqual([{ kind: 'INSERT', path: [0, 1], node: li('b') }]);
  });

  it('맨 앞 삽입도 INSERT 한 줄 (위치 비교였다면 글자 바꾸기 + 끝 INSERT가 됐을 일)', () => {
    const patches = run(list(li('a'), li('b')), list(li('z'), li('a'), li('b')));
    expect(patches).toEqual([{ kind: 'INSERT', path: [0, 0], node: li('z') }]);
  });

  it('중간 삭제: REMOVE 한 줄만, node는 원본 VNode 통째', () => {
    const oldTree = list(li('a'), li('b'), li('c'));
    const patches = run(oldTree, list(li('a'), li('c')));
    expect(patches).toEqual([{ kind: 'REMOVE', path: [0, 1], node: oldTree[0].children[1] }]);
  });

  it('여러 개 삭제는 뒤에서부터 REMOVE (앞 번호가 안 밀림)', () => {
    const patches = run(list(li('a'), li('b'), li('c'), li('d')), list(li('b'), li('d')));
    expect(patches.map((p) => (p.kind === 'REMOVE' ? p.path : null))).toEqual([[0, 2], [0, 0]]);
  });

  it('재정렬: MOVE만 나오고 SET_TEXT · INSERT · REMOVE가 없다 (노드는 새로 안 만든다)', () => {
    const patches = run(list(li('a'), li('b'), li('c')), list(li('c'), li('a'), li('b')));
    expect(patches).toEqual([{ kind: 'MOVE', parent: [0], from: 2, to: 0 }]);
  });

  it('두 칸 맞바꿈: MOVE 한 번 (from 1 → to 0)', () => {
    const patches = run(list(li('a'), li('b')), list(li('b'), li('a')));
    expect(patches).toEqual([{ kind: 'MOVE', parent: [0], from: 1, to: 0 }]);
  });

  it('여러 번 이동: 각 MOVE의 from · to는 그 순간(앞 MOVE가 끝난 뒤) 목록 기준', () => {
    // [a,b,c] → [b,c,a]: ① b를 0번으로 [b,a,c] ② c를 1번으로 [b,c,a]
    const patches = run(list(li('a'), li('b'), li('c')), list(li('b'), li('c'), li('a')));
    expect(patches).toEqual([
      { kind: 'MOVE', parent: [0], from: 1, to: 0 },
      { kind: 'MOVE', parent: [0], from: 2, to: 1 },
    ]);
  });

  it('이미 자리가 맞는 key는 건드리지 않는다 (patch 없음)', () => {
    expect(run(list(li('a'), li('b')), list(li('a'), li('b')))).toEqual([]);
  });

  it('삽입 + 삭제 + 재정렬 동시: 순서는 REMOVE(뒤에서) → 새 목록 앞에서부터 MOVE · INSERT', () => {
    const oldTree = list(li('a'), li('b'), li('c'), li('d'));
    const newTree = list(li('d'), li('x'), li('a'), li('c'));
    const patches = run(oldTree, newTree);
    // 지움 b → [a,c,d] / d를 0번 [d,a,c] / x를 1번에 끼움 [d,x,a,c]
    expect(patches).toEqual([
      { kind: 'REMOVE', path: [0, 1], node: li('b') },
      { kind: 'MOVE', parent: [0], from: 2, to: 0 },
      { kind: 'INSERT', path: [0, 1], node: li('x') },
    ]);
  });

  it('key 숫자도 쓸 수 있다 (숫자 1 과 문자열 "1"은 다른 key)', () => {
    const patches = run(list(li(1), li(2), li(3)), list(li(3), li(1), li(2)));
    expect(patches).toEqual([{ kind: 'MOVE', parent: [0], from: 2, to: 0 }]);
    const mixed = run(list(li(1)), list(li('1')));
    expect(mixed.map((p) => p.kind)).toEqual(['REMOVE', 'INSERT']);
  });
});

describe('diff Key — 짝이 맞은 노드끼리 재귀 diff', () => {
  it('key가 같고 내용이 바뀌면 이동 없이 글자 patch만 (경로는 최종 자리 기준)', () => {
    const patches = run(list(li('a', 'A'), li('b', 'B')), list(li('a', 'A2'), li('b', 'B')));
    expect(patches).toEqual([{ kind: 'SET_TEXT', path: [0, 0, 0], before: 'A', after: 'A2' }]);
  });

  it('이동하면서 내용도 바뀌면 MOVE 뒤에 새 자리 경로로 SET_TEXT', () => {
    const patches = run(list(li('a', 'A'), li('b', 'B')), list(li('b', 'B2'), li('a', 'A')));
    expect(patches).toEqual([
      { kind: 'MOVE', parent: [0], from: 1, to: 0 },
      { kind: 'SET_TEXT', path: [0, 0, 0], before: 'B', after: 'B2' },
    ]);
  });

  it('이동하면서 속성도 바뀌면 새 자리 경로로 SET_ATTR', () => {
    const oldTree = list(h('li', { key: 'a', class: 'x' }, 'A') as ElementVNode, li('b'));
    const newTree = list(li('b'), h('li', { key: 'a', class: 'y' }, 'A') as ElementVNode);
    const patches = run(oldTree, newTree);
    expect(patches).toEqual([
      { kind: 'MOVE', parent: [0], from: 1, to: 0 },
      { kind: 'SET_ATTR', path: [0, 1], name: 'class', before: 'x', after: 'y' },
    ]);
  });

  it('key가 같고 태그가 다르면 REPLACE (그 자리에서 통째로 바꿈, 이동 없음)', () => {
    const oldTree = list(li('a'), h('li', { key: 'b' }, 'B') as ElementVNode);
    const newTree = list(li('a'), h('p', { key: 'b' }, 'B') as ElementVNode);
    const patches = run(oldTree, newTree);
    expect(patches).toEqual([{ kind: 'REPLACE', path: [0, 1], before: oldTree[0].children[1], after: newTree[0].children[1] }]);
  });

  it('중첩 목록 안에서도 목록마다 따로 key 비교 (자식 목록 단위)', () => {
    const inner = (...items: VNode[]) => h('div', { key: 'box' }, h('ul', null, ...items)) as ElementVNode;
    const oldTree: AreaChildren = [inner(li('a'), li('b'))];
    const newTree: AreaChildren = [inner(li('b'), li('a'))];
    const patches = run(oldTree, newTree);
    expect(patches).toEqual([{ kind: 'MOVE', parent: [0, 0], from: 1, to: 0 }]);
  });

  it('영역 맨 위 목록도 key 비교 (부모 경로 [])', () => {
    const patches = run([li('a'), li('b')], [li('b'), li('a')]);
    expect(patches).toEqual([{ kind: 'MOVE', parent: [], from: 1, to: 0 }]);
  });
});

describe('diff Key — key 비교를 안 하고 위치 비교로 돌아가는 목록', () => {
  it('key 없는 자식이 하나라도 섞이면 그 목록은 위치 비교 (MOVE 없음)', () => {
    const oldTree = list(li('a'), plainLi('plain'));
    const newTree = list(plainLi('plain'), li('a'));
    const patches = run(oldTree, newTree, true);
    expect(patches.some((p) => p.kind === 'MOVE')).toBe(false);
    // 위치 비교: 0번 · 1번이 같은 태그라 그 자리에서 고친다
    expect(patches.every((p) => p.kind === 'SET_TEXT' || p.kind === 'SET_ATTR')).toBe(true);
  });

  it('새 목록에만 key 없는 자식이 있어도 위치 비교', () => {
    const patches = run(list(li('a'), li('b')), list(li('b'), plainLi('x')), true);
    expect(patches.some((p) => p.kind === 'MOVE')).toBe(false);
  });

  it('옛 목록에 같은 key 중복이 있으면 위치 비교', () => {
    const patches = run(list(li('a', '1'), li('a', '2')), list(li('a', '2'), li('a', '1')), true);
    expect(patches).toEqual([
      { kind: 'SET_TEXT', path: [0, 0, 0], before: '1', after: '2' },
      { kind: 'SET_TEXT', path: [0, 1, 0], before: '2', after: '1' },
    ]);
  });

  it('새 목록에 같은 key 중복이 있어도 위치 비교', () => {
    const patches = run(list(li('a'), li('b')), list(li('b'), li('b')), true);
    expect(patches.some((p) => p.kind === 'MOVE')).toBe(false);
  });

  it('key가 전혀 없는 목록은 필수 동작(위치 비교) 그대로', () => {
    const patches = run(list(plainLi('a'), plainLi('b')), list(plainLi('b'), plainLi('a')), true);
    expect(patches).toEqual([
      { kind: 'SET_TEXT', path: [0, 0, 0], before: 'a', after: 'b' },
      { kind: 'SET_TEXT', path: [0, 1, 0], before: 'b', after: 'a' },
    ]);
  });

  it('글자 노드가 자식에 섞여 있으면 (글자는 key가 없다) 위치 비교', () => {
    const oldTree: AreaChildren = [h('ul', null, 'x', li('a')) as ElementVNode];
    const newTree: AreaChildren = [h('ul', null, 'x', li('b')) as ElementVNode];
    expect(run(oldTree, newTree, true).some((p) => p.kind === 'MOVE')).toBe(false);
  });

  it('빈 목록 ↔ key 목록', () => {
    expect(run(list(), list(li('a'), li('b'))).map((p) => p.kind)).toEqual(['INSERT', 'INSERT']);
    expect(run(list(li('a'), li('b')), list()).map((p) => p.kind)).toEqual(['REMOVE', 'REMOVE']);
  });
});

describe('diff Key — 무작위 key 순열 200쌍 (PRD §5 Key 검증)', () => {
  function shuffle<T>(rng: () => number, items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  it('고정 씨앗 200쌍: applyPatches(old, diff) = new, 역패치로 old 복원, key 순서 일치', () => {
    const rng = makeRng(20261111);
    const pool = Array.from({ length: 12 }, (_, i) => `k${i}`);
    const pickSubset = (): string[] => shuffle(rng, pool.filter(() => rng() < 0.6));
    // 같은 key라도 가끔 내용 · 속성 · 태그가 달라진다 (REPLACE · SET_TEXT · SET_ATTR이 이동과 섞이는 경우)
    const make = (keys: string[], version: 0 | 1): AreaChildren =>
      list(
        ...keys.map((k, i) => {
          const changed = version === 1 && (k.length + i) % 3 === 0;
          const tag = version === 1 && (i + k.length) % 7 === 0 ? 'p' : 'li';
          return h(tag, { key: k, 'data-v': changed ? '1' : '0' }, changed ? `${k}-new` : k) as ElementVNode;
        }),
      );
    let moveCount = 0;
    for (let n = 0; n < 200; n++) {
      const oldKeys = pickSubset();
      const newKeys = pickSubset();
      const oldTree = make(oldKeys, 0);
      const newTree = make(newKeys, 1);
      const patches = diff(oldTree, newTree);
      moveCount += patches.filter((p) => p.kind === 'MOVE').length;
      const applied = applyPatches(oldTree, patches);
      expect(normalizeTree(applied), `쌍 ${n}`).toEqual(normalizeTree(newTree));
      expect(keysOf(applied)).toEqual(newKeys);
      expect(normalizeTree(applyPatches(newTree, invertPatches(patches))), `역 ${n}`).toEqual(normalizeTree(oldTree));
    }
    // 이동이 실제로 많이 섞였는지(검증이 빈 껍데기가 아닌지) 확인
    expect(moveCount).toBeGreaterThan(200);
  });

  it('같은 key 집합을 섞으면 MOVE만 나오고, 이동 수는 (길이 - 1) 이하 (최소 이동은 보장하지 않음)', () => {
    const rng = makeRng(7);
    for (let n = 0; n < 50; n++) {
      const keys = Array.from({ length: 8 }, (_, i) => `k${i}`);
      const shuffled = shuffle(rng, [...keys]);
      const patches = diff(list(...keys.map((k) => li(k))), list(...shuffled.map((k) => li(k))));
      expect(patches.every((p) => p.kind === 'MOVE')).toBe(true);
      expect(patches.length).toBeLessThanOrEqual(keys.length - 1);
    }
  });
});
