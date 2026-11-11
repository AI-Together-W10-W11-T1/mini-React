import { describe, it, expect } from 'vitest';
import { diff } from '../diff';
import { invertPatches } from '../invertPatches';
import { applyPatches, normalizeTree } from './applyPatches';
import { makeRng, mutateTree, randomTree } from './randomTree';
import { comment, el, text } from '../../../shared/src/__tests__/helpers';
import type { Patch } from '@mini-react/shared';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

describe('invertPatches — 종류별 뒤집기', () => {
  it('SET_TEXT는 before ↔ after', () => {
    expect(invertPatches([{ kind: 'SET_TEXT', path: [0, 0], before: 'a', after: 'b' }])).toEqual([
      { kind: 'SET_TEXT', path: [0, 0], before: 'b', after: 'a' },
    ]);
  });

  it('SET_ATTR는 before ↔ after (추가 ↔ 삭제, null 포함)', () => {
    expect(invertPatches([{ kind: 'SET_ATTR', path: [1], name: 'class', before: null, after: 'x' }])).toEqual([
      { kind: 'SET_ATTR', path: [1], name: 'class', before: 'x', after: null },
    ]);
    expect(invertPatches([{ kind: 'SET_ATTR', path: [1], name: 'class', before: 'a', after: 'b' }])).toEqual([
      { kind: 'SET_ATTR', path: [1], name: 'class', before: 'b', after: 'a' },
    ]);
  });

  it('SET_STYLE은 before ↔ after', () => {
    expect(invertPatches([{ kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: null }])).toEqual([
      { kind: 'SET_STYLE', path: [0], property: 'color', before: null, after: 'red' },
    ]);
  });

  it('INSERT ↔ REMOVE: 같은 경로 · 같은 node', () => {
    const node = el('li', {}, text('x'));
    expect(invertPatches([{ kind: 'INSERT', path: [0, 2], node }])).toEqual([{ kind: 'REMOVE', path: [0, 2], node }]);
    expect(invertPatches([{ kind: 'REMOVE', path: [0, 2], node }])).toEqual([{ kind: 'INSERT', path: [0, 2], node }]);
    expect((invertPatches([{ kind: 'INSERT', path: [0], node }])[0] as { node: unknown }).node).toBe(node);
  });

  it('REPLACE는 before ↔ after', () => {
    const before = el('p');
    const after = el('h1');
    expect(invertPatches([{ kind: 'REPLACE', path: [3], before, after }])).toEqual([
      { kind: 'REPLACE', path: [3], before: after, after: before },
    ]);
  });

  it('MOVE는 from ↔ to', () => {
    expect(invertPatches([{ kind: 'MOVE', parent: [0], from: 3, to: 1 }])).toEqual([{ kind: 'MOVE', parent: [0], from: 1, to: 3 }]);
  });

  it('SET_EVENT는 before ↔ after (null 포함), event · path는 그대로 (Phase 2)', () => {
    const a = () => undefined;
    const b = () => undefined;
    const [added] = invertPatches([{ kind: 'SET_EVENT', path: [0, 1], event: 'click', before: null, after: a }]);
    expect(added).toEqual({ kind: 'SET_EVENT', path: [0, 1], event: 'click', before: a, after: null });
    const [swapped] = invertPatches([{ kind: 'SET_EVENT', path: [2], event: 'input', before: a, after: b }]);
    expect(swapped).toEqual({ kind: 'SET_EVENT', path: [2], event: 'input', before: b, after: a });
    // 함수는 같은 참조 그대로 (복사하지 않음)
    expect((swapped as { before: unknown }).before).toBe(b);
    expect((swapped as { after: unknown }).after).toBe(a);
  });

  it('SET_PROP은 before ↔ after (null 포함), name · path는 그대로 (Phase 2)', () => {
    expect(invertPatches([{ kind: 'SET_PROP', path: [0], name: 'value', before: null, after: 'x' }])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: 'x', after: null },
    ]);
    expect(invertPatches([{ kind: 'SET_PROP', path: [1, 0], name: 'checked', before: false, after: true }])).toEqual([
      { kind: 'SET_PROP', path: [1, 0], name: 'checked', before: true, after: false },
    ]);
  });
});

describe('invertPatches — 순서 · 불변', () => {
  const list: Patch[] = [
    { kind: 'SET_TEXT', path: [0], before: 'a', after: 'b' },
    { kind: 'INSERT', path: [1], node: el('p') },
    { kind: 'MOVE', parent: [], from: 0, to: 1 },
    { kind: 'REMOVE', path: [2], node: el('i') },
    { kind: 'SET_EVENT', path: [0], event: 'click', before: null, after: () => undefined },
    { kind: 'SET_PROP', path: [0], name: 'value', before: 'a', after: 'b' },
  ];

  it('목록 순서가 뒤집힌다 (되돌릴 때는 역순, 알고리즘 결정 7 세부)', () => {
    expect(invertPatches(list).map((p) => p.kind)).toEqual(['SET_PROP', 'SET_EVENT', 'INSERT', 'MOVE', 'REMOVE', 'SET_TEXT']);
  });

  it('두 번 뒤집으면 원래 목록', () => {
    expect(invertPatches(invertPatches(list))).toEqual(list);
  });

  it('입력 목록과 그 안의 patch를 고치지 않는다 (깊게 얼린 입력)', () => {
    const frozen = deepFreeze(list.map((p) => ({ ...p })) as Patch[]);
    const snapshot = JSON.stringify(frozen);
    expect(() => invertPatches(frozen)).not.toThrow();
    expect(JSON.stringify(frozen)).toBe(snapshot);
  });

  it('빈 목록은 빈 목록', () => {
    expect(invertPatches([])).toEqual([]);
  });
});

describe('invertPatches — 역패치로 되돌리기 (T-08)', () => {
  it('손으로 쓴 변경: applyPatches(new, invert(diff(old, new)))가 old와 같다', () => {
    const oldTree = [el('ul', { id: 'u', style: { color: 'red' } }, text('\n'), comment('c'), el('li', {}, text('a')), el('li', {}, text('b')), el('li', {}, text('c')))];
    const newTree = [el('ul', { class: 'x', style: { color: 'blue', top: '1px' } }, text('\n  '), comment('d'), el('b', {}, text('a')), el('li', {}, text('B')))];
    const patches = diff(oldTree, newTree);
    const restored = applyPatches(applyPatches(oldTree, patches), invertPatches(patches));
    expect(normalizeTree(restored)).toEqual(normalizeTree(oldTree));
  });

  it('무작위(고정 씨앗) 트리 쌍 200개에서 applyPatches(new, invert(diff(old, new)))가 old와 같다 (왕복)', () => {
    const rng = makeRng(20261111);
    for (let i = 0; i < 200; i++) {
      const oldTree = randomTree(rng);
      const newTree = i % 2 === 0 ? randomTree(rng) : mutateTree(rng, oldTree);
      const patches = diff(oldTree, newTree);
      const forward = applyPatches(oldTree, patches);
      expect(normalizeTree(forward)).toEqual(normalizeTree(newTree));
      const back = applyPatches(newTree, invertPatches(patches));
      expect(normalizeTree(back)).toEqual(normalizeTree(oldTree));
    }
  });

  it('MOVE가 들어 있어도 역패치가 원래 순서로 되돌린다', () => {
    const items = ['a', 'b', 'c', 'd'].map((s) => el('li', {}, text(s)));
    const oldTree = [el('ul', {}, ...items)];
    const patches: Patch[] = [
      { kind: 'MOVE', parent: [0], from: 0, to: 3 },
      { kind: 'MOVE', parent: [0], from: 2, to: 0 },
    ];
    const moved = applyPatches(oldTree, patches);
    expect(moved[0].children.map((c) => (c.children[0].props as { nodeValue: string }).nodeValue)).toEqual(['d', 'b', 'c', 'a']);
    expect(applyPatches(moved, invertPatches(patches))).toEqual(oldTree);
  });
});
