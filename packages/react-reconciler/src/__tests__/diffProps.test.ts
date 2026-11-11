import { describe, it, expect } from 'vitest';
import { diff } from '../diff';
import { applyPatches, normalizeTree } from './applyPatches';
import { makeRng, mutateTree, randomTree } from './randomTree';
import { el, text } from '../../../shared/src/__tests__/helpers';
import type { AreaChildren, ElementVNode, Patch } from '@mini-react/shared';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

function run(oldTree: AreaChildren, newTree: AreaChildren): Patch[] {
  const patches = diff(deepFreeze(oldTree), deepFreeze(newTree));
  expect(normalizeTree(applyPatches(oldTree, patches))).toEqual(normalizeTree(newTree));
  return patches;
}

describe('diff — DOM 프로퍼티 value · checked (SET_PROP)', () => {
  it('value가 바뀌면 SET_PROP 한 줄 (SET_ATTR 아님)', () => {
    expect(run([el('input', { value: 'a' })], [el('input', { value: 'b' })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: 'a', after: 'b' },
    ]);
  });

  it('같은 value는 patch 0건 (T-04)', () => {
    expect(run([el('input', { value: 'a' })], [el('input', { value: 'a' })])).toEqual([]);
  });

  it('처음 붙음(before null) · 빠짐(after null)', () => {
    expect(run([el('input', {})], [el('input', { value: 'x' })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: null, after: 'x' },
    ]);
    expect(run([el('input', { value: 'x' })], [el('input', {})])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: 'x', after: null },
    ]);
  });

  it('빈 문자열 value는 "없음"이 아니다 (null → "" 도 한 줄)', () => {
    expect(diff([el('input', {})], [el('input', { value: '' })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: null, after: '' },
    ]);
  });

  it('숫자 value는 문자열로 정규화: 1 → "1", 같은 값이면 0건', () => {
    expect(diff([el('input', { value: 1 })], [el('input', { value: '1' })])).toEqual([]);
    expect(run([el('input', { value: 1 })], [el('input', { value: 2 })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: '1', after: '2' },
    ]);
  });

  it('value로 쓸 수 없는 값(null · undefined · boolean · 함수)은 없음', () => {
    expect(diff([el('input', {})], [el('input', { value: null })])).toEqual([]);
    expect(diff([el('input', {})], [el('input', { value: undefined })])).toEqual([]);
    expect(diff([el('input', {})], [el('input', { value: true })])).toEqual([]);
    expect(diff([el('input', {})], [el('input', { value: () => undefined })])).toEqual([]);
  });

  it('checked true ↔ false', () => {
    expect(run([el('input', { checked: false })], [el('input', { checked: true })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'checked', before: false, after: true },
    ]);
    expect(run([el('input', { checked: true })], [el('input', { checked: false })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'checked', before: true, after: false },
    ]);
  });

  it('checked "" (boolean 속성 식) 은 true로 본다', () => {
    expect(diff([el('input', { checked: '' })], [el('input', { checked: true })])).toEqual([]);
  });

  it('checked 처음 붙음 · 빠짐', () => {
    expect(run([el('input', {})], [el('input', { checked: true })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'checked', before: null, after: true },
    ]);
    expect(run([el('input', { checked: true })], [el('input', {})])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'checked', before: true, after: null },
    ]);
  });

  it('value · checked가 SET_ATTR로 새지 않는다', () => {
    const patches = diff([el('input', { type: 'checkbox', value: 'a', checked: false })], [el('input', { type: 'checkbox', value: 'b', checked: true })]);
    expect(patches.some((p) => p.kind === 'SET_ATTR')).toBe(false);
    expect(patches.map((p) => p.kind)).toEqual(['SET_PROP', 'SET_PROP']);
  });

  it('다른 속성(type · class)은 기존 그대로 SET_ATTR', () => {
    const patches = run([el('input', { type: 'text', class: 'a', value: 'x' })], [el('input', { type: 'password', class: 'b', value: 'x' })]);
    expect(patches).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'type', before: 'text', after: 'password' },
      { kind: 'SET_ATTR', path: [0], name: 'class', before: 'a', after: 'b' },
    ]);
  });

  it('요소 종류가 다르면 REPLACE만 (프로퍼티 줄 없음)', () => {
    expect(run([el('input', { value: 'a' })], [el('textarea', { value: 'b' })]).map((p) => p.kind)).toEqual(['REPLACE']);
  });

  it('자식 요소의 프로퍼티: 경로가 그 요소를 가리킨다', () => {
    expect(run([el('div', {}, text('x'), el('input', { value: 'a' }))], [el('div', {}, text('x'), el('input', { value: 'b' }))])).toEqual([
      { kind: 'SET_PROP', path: [0, 1], name: 'value', before: 'a', after: 'b' },
    ]);
  });

  it('무작위(고정 씨앗) 200쌍에 value · checked를 섞어도 applyPatches(old, diff) = new', () => {
    const rng = makeRng(20261113);
    const mix = makeRng(11);
    const sprinkle = (list: AreaChildren): AreaChildren =>
      list.map((node) => {
        if (typeof node.type !== 'string' || node.type.startsWith('#')) return node;
        const props: { [name: string]: unknown } = { ...node.props };
        const x = mix();
        if (x < 0.3) props.value = ['a', 'b', 1, ''][Math.floor(mix() * 4)];
        const y = mix();
        if (y < 0.15) props.checked = true;
        else if (y < 0.3) props.checked = false;
        else if (y < 0.4) props.checked = '';
        return { ...(node as ElementVNode), props, children: sprinkle(node.children) };
      });
    for (let i = 0; i < 200; i++) {
      const base = randomTree(rng);
      const oldTree = sprinkle(base);
      const newTree = sprinkle(i % 2 === 0 ? randomTree(rng) : mutateTree(rng, base));
      const patches = diff(oldTree, newTree);
      expect(normalizeTree(applyPatches(oldTree, patches))).toEqual(normalizeTree(newTree));
    }
  });
});

describe('diff — value · checked 프로퍼티는 input · textarea · select에서만 (검수 1회차 NB-4)', () => {
  it('textarea · select의 value는 SET_PROP', () => {
    expect(run([el('textarea', { value: 'a' })], [el('textarea', { value: 'b' })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: 'a', after: 'b' },
    ]);
    expect(run([el('select', { value: 'a' })], [el('select', { value: 'b' })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'value', before: 'a', after: 'b' },
    ]);
  });

  it('div · li · option 같은 다른 요소의 value는 보통 속성(SET_ATTR)이다', () => {
    expect(run([el('div', { value: 'a' })], [el('div', { value: 'b' })])).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'value', before: 'a', after: 'b' },
    ]);
    expect(run([el('li', {})], [el('li', { value: 3 })])).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'value', before: null, after: '3' },
    ]);
    expect(run([el('option', { value: 'x' })], [el('option', {})])).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'value', before: 'x', after: null },
    ]);
  });

  it('다른 요소의 checked는 boolean 속성 규칙(true = 값 "", false = 속성 없음)이고 SET_PROP이 아니다', () => {
    expect(run([el('div', {})], [el('div', { checked: true })])).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'checked', before: null, after: '' },
    ]);
    expect(run([el('div', { checked: true })], [el('div', { checked: false })])).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'checked', before: '', after: null },
    ]);
  });

  it('input은 그대로 SET_PROP (checked 포함)', () => {
    expect(run([el('input', { checked: false })], [el('input', { checked: true })])).toEqual([
      { kind: 'SET_PROP', path: [0], name: 'checked', before: false, after: true },
    ]);
  });

  it('select의 value 변경은 새 option INSERT "뒤"에 온다 (새 option이 있어야 고를 수 있음)', () => {
    const patches = run(
      [el('select', { value: 'a' }, el('option', { value: 'a' }))],
      [el('select', { value: 'b' }, el('option', { value: 'a' }), el('option', { value: 'b' }))],
    );
    expect(patches.map((p) => p.kind)).toEqual(['INSERT', 'SET_PROP']);
  });

  it('같은 자리에서 div → input처럼 태그가 바뀌면 REPLACE (새 요소의 value는 renderVNode가 프로퍼티로)', () => {
    const patches = run([el('div', { value: 'a' })], [el('input', { value: 'a' })]);
    expect(patches.map((p) => p.kind)).toEqual(['REPLACE']);
  });
});
