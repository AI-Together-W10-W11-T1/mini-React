import { describe, it, expect } from 'vitest';
import { diff } from '../diff';
import { applyPatches, normalizeTree } from './applyPatches';
import { makeRng, mutateTree, randomTree } from './randomTree';
import { el, text } from '../../../shared/src/__tests__/helpers';
import type { AreaChildren, ElementVNode, Patch, VNode } from '@mini-react/shared';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

/** diff를 돌리고 applyPatches(old, patches)가 new와 같은지 함께 확인한다 */
function run(oldTree: AreaChildren, newTree: AreaChildren): Patch[] {
  const patches = diff(deepFreeze(oldTree), deepFreeze(newTree));
  expect(normalizeTree(applyPatches(oldTree, patches))).toEqual(normalizeTree(newTree));
  return patches;
}

const f1 = () => undefined;
const f2 = () => undefined;

describe('diff — 이벤트 props (결정 8 B, SET_EVENT)', () => {
  it('같은 함수 참조는 patch 0건 (T-04, 무변경 렌더에 작업이 생기지 않음)', () => {
    expect(run([el('button', { onClick: f1 }, text('a'))], [el('button', { onClick: f1 }, text('a'))])).toEqual([]);
  });

  it('다른 함수는 SET_EVENT 한 줄: 전 · 후 함수 (이름 click)', () => {
    expect(run([el('button', { onClick: f1 })], [el('button', { onClick: f2 })])).toEqual([
      { kind: 'SET_EVENT', path: [0], event: 'click', before: f1, after: f2 },
    ]);
  });

  it('처음 붙음: before null', () => {
    expect(run([el('button', {})], [el('button', { onClick: f1 })])).toEqual([
      { kind: 'SET_EVENT', path: [0], event: 'click', before: null, after: f1 },
    ]);
  });

  it('빠짐: after null (핸들러만 비우는 줄)', () => {
    expect(run([el('button', { onClick: f1 })], [el('button', {})])).toEqual([
      { kind: 'SET_EVENT', path: [0], event: 'click', before: f1, after: null },
    ]);
  });

  it('이벤트 둘 이상은 독립: 바뀐 것만 줄이 생김', () => {
    const patches = run([el('input', { onClick: f1, onInput: f1 })], [el('input', { onClick: f1, onInput: f2 })]);
    expect(patches).toEqual([{ kind: 'SET_EVENT', path: [0], event: 'input', before: f1, after: f2 }]);
    const both = run([el('input', { onClick: f1, onInput: f1 })], [el('input', { onClick: f2, onInput: f2 })]);
    expect(both.map((p) => (p as { event: string }).event).sort()).toEqual(['click', 'input']);
  });

  it('이벤트 이름은 on 뒤 전부 소문자: onClick → click, onInput → input', () => {
    const patches = diff([el('a', { onClick: f1, onInput: f1 })], [el('a', {})]);
    expect(patches.map((p) => (p as { event: string }).event).sort()).toEqual(['click', 'input']);
  });

  it('on 뒤가 소문자이거나 값이 함수가 아니면 이벤트가 아니다 (문자열 onclick="x"는 속성)', () => {
    // 문자열 onclick: 보통 속성 (SET_ATTR)
    expect(diff([el('a', {})], [el('a', { onclick: 'x' })])).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'onclick', before: null, after: 'x' }]);
    // 함수 값이어도 on 뒤가 대문자가 아니면 이벤트가 아님 → 아무 줄도 없음 (함수는 속성으로 다루지 않음)
    expect(diff([el('a', {})], [el('a', { onclick: f1 })])).toEqual([]);
    expect(diff([el('a', {})], [el('a', { on: f1 })])).toEqual([]);
    // 이름이 on + 대문자여도 값이 문자열이면 보통 속성
    expect(diff([el('a', {})], [el('a', { onClick: 'x' })])).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'onClick', before: null, after: 'x' }]);
  });

  it('이벤트가 있어도 SET_ATTR가 생기지 않는다', () => {
    const patches = diff([el('button', { class: 'a', onClick: f1 })], [el('button', { class: 'a', onClick: f2 })]);
    expect(patches.every((p) => p.kind === 'SET_EVENT')).toBe(true);
  });

  it('속성과 이벤트가 함께 바뀌면 각자 줄 (같은 요소 안에서 순서가 고정)', () => {
    const a = diff([el('button', { class: 'a', onClick: f1 })], [el('button', { class: 'b', onClick: f2 })]);
    const b = diff([el('button', { class: 'a', onClick: f1 })], [el('button', { class: 'b', onClick: f2 })]);
    expect(a.map((p) => p.kind)).toEqual(['SET_ATTR', 'SET_EVENT']);
    expect(b).toEqual(a);
  });

  it('새로 INSERT되는 요소 안의 이벤트는 SET_EVENT를 내지 않는다 (요소째 새로 그림)', () => {
    const node = el('li', { onClick: f1 }, text('x'));
    expect(run([el('ul', {})], [el('ul', {}, node)])).toEqual([{ kind: 'INSERT', path: [0, 0], node }]);
  });

  it('REPLACE되는 요소 안의 이벤트도 SET_EVENT를 내지 않는다', () => {
    const patches = run([el('p', { onClick: f1 })], [el('h1', { onClick: f2 })]);
    expect(patches.map((p) => p.kind)).toEqual(['REPLACE']);
  });

  it('자식 요소의 이벤트: 경로가 그 요소를 가리킨다', () => {
    const patches = run([el('div', {}, el('b', {}), el('button', { onClick: f1 }))], [el('div', {}, el('b', {}), el('button', { onClick: f2 }))]);
    expect(patches).toEqual([{ kind: 'SET_EVENT', path: [0, 1], event: 'click', before: f1, after: f2 }]);
  });

  it('같은 key 이동(MOVE)과 함께여도 경로가 맞다 (이동한 뒤 최종 자리 기준)', () => {
    const li = (key: string, fn: () => void): VNode => ({ type: 'li', props: { onClick: fn }, children: [text(key)], key });
    const oldList = [el('ul', {}, li('a', f1), li('b', f1), li('c', f1))];
    const newList = [el('ul', {}, li('c', f2), li('a', f1), li('b', f2))];
    const patches = run(oldList, newList);
    expect(patches.filter((p) => p.kind === 'MOVE').length).toBeGreaterThan(0);
    // 이동이 끝난 뒤 c는 0번, b는 2번 자리
    const events = patches.filter((p): p is Extract<Patch, { kind: 'SET_EVENT' }> => p.kind === 'SET_EVENT');
    expect(events.map((p) => p.path)).toEqual([[0, 0], [0, 2]]);
  });

  it('입력 VNode를 고치지 않는다 (깊게 얼린 입력)', () => {
    expect(() => diff(deepFreeze([el('a', { onClick: f1 })]), deepFreeze([el('a', { onClick: f2 })]))).not.toThrow();
  });

  it('무작위(고정 씨앗) 200쌍에 이벤트 props를 섞어도 applyPatches(old, diff) = new', () => {
    const rng = makeRng(20261112);
    const sprinkle = (list: AreaChildren, r: () => number): AreaChildren =>
      list.map((node) => {
        if (typeof node.type !== 'string' || node.type.startsWith('#')) return node;
        const props: { [name: string]: unknown } = { ...node.props };
        const x = r();
        if (x < 0.3) props.onClick = f1;
        else if (x < 0.5) props.onClick = f2;
        if (r() < 0.2) props.onInput = r() < 0.5 ? f1 : f2;
        return { ...(node as ElementVNode), props, children: sprinkle(node.children, r) };
      });
    const mix = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const base = randomTree(rng);
      const oldTree = sprinkle(base, mix);
      const newTree = sprinkle(i % 2 === 0 ? randomTree(rng) : mutateTree(rng, base), mix);
      const patches = diff(oldTree, newTree);
      expect(normalizeTree(applyPatches(oldTree, patches))).toEqual(normalizeTree(newTree));
    }
  });
});
