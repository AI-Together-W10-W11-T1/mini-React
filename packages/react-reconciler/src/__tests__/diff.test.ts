import { describe, it, expect } from 'vitest';
import { diff } from '../diff';
import { applyPatches, normalizeTree } from './applyPatches';
import { comment, el, text } from '../../../shared/src/__tests__/helpers';
import type { AreaChildren, Patch } from '@mini-react/shared';

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

/** diff를 돌리고 applyPatches(old, patches)가 new와 같은지 함께 확인한다 (T-03) */
function run(oldTree: AreaChildren, newTree: AreaChildren): Patch[] {
  const patches = diff(deepFreeze(oldTree), deepFreeze(newTree));
  expect(normalizeTree(applyPatches(oldTree, patches))).toEqual(normalizeTree(newTree));
  return patches;
}

describe('diff 기본 — 글자 · 주석 글', () => {
  it('D-01 글자가 바뀌면 SET_TEXT 한 줄 (P1-06)', () => {
    const patches = run([el('p', {}, text('안녕'))], [el('p', {}, text('잘가'))]);
    expect(patches).toEqual([{ kind: 'SET_TEXT', path: [0, 0], before: '안녕', after: '잘가' }]);
  });

  it('D-01 중첩 안의 글자: 경로가 영역 상자 안 자식부터', () => {
    const patches = run(
      [el('ul', {}, el('li', {}, text('a')), el('li', {}, text('b')))],
      [el('ul', {}, el('li', {}, text('a')), el('li', {}, text('B')))],
    );
    expect(patches).toEqual([{ kind: 'SET_TEXT', path: [0, 1, 0], before: 'b', after: 'B' }]);
  });

  it('D-01 최상위 글자 노드도 비교한다 (영역 상자 바로 아래)', () => {
    expect(run([text('a')], [text('b')])).toEqual([{ kind: 'SET_TEXT', path: [0], before: 'a', after: 'b' }]);
  });

  it('주석 글이 바뀌면 SET_TEXT (주석 노드의 nodeValue)', () => {
    const patches = run([el('div', {}, comment(' 옛 '))], [el('div', {}, comment(' 새 '))]);
    expect(patches).toEqual([{ kind: 'SET_TEXT', path: [0, 0], before: ' 옛 ', after: ' 새 ' }]);
  });

  it('공백 글자 노드의 변경도 글자 바꾸기 (들여쓰기 비용)', () => {
    const patches = run([el('ul', {}, text('\n  '), el('li'))], [el('ul', {}, text('\n    '), el('li'))]);
    expect(patches).toEqual([{ kind: 'SET_TEXT', path: [0, 0], before: '\n  ', after: '\n    ' }]);
  });
});

describe('diff 기본 — 속성', () => {
  it('D-02 속성 추가: before null (P1-07)', () => {
    const patches = run([el('p', { id: 'a' })], [el('p', { id: 'a', class: 'x' })]);
    expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'class', before: null, after: 'x' }]);
  });

  it('D-02 속성 수정 (P1-08)', () => {
    const patches = run([el('p', { class: 'a' })], [el('p', { class: 'b' })]);
    expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'class', before: 'a', after: 'b' }]);
  });

  it('D-02 속성 삭제: after null (P1-09)', () => {
    const patches = run([el('p', { class: 'a', id: 'i' })], [el('p', { id: 'i' })]);
    expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'class', before: 'a', after: null }]);
  });

  it('D-02 한 요소의 속성 추가 · 수정 · 삭제가 함께 있어도 줄이 따로 나온다', () => {
    const patches = run([el('p', { a: '1', b: '2' })], [el('p', { a: 'X', c: '3' })]);
    expect(patches).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'a', before: '1', after: 'X' },
      { kind: 'SET_ATTR', path: [0], name: 'b', before: '2', after: null },
      { kind: 'SET_ATTR', path: [0], name: 'c', before: null, after: '3' },
    ]);
  });

  it('boolean 속성 켜기: 값 "" 으로 속성 추가 (교체 아님, §5)', () => {
    const patches = run([el('button', {}, text('x'))], [el('button', { disabled: '' }, text('x'))]);
    expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'disabled', before: null, after: '' }]);
  });

  it('boolean 속성 끄기: 속성 삭제 (교체 아님, §5)', () => {
    const patches = run([el('button', { disabled: '' })], [el('button', {})]);
    expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'disabled', before: '', after: null }]);
  });

  it('속성 값 정규화: true → "", 숫자 → 문자열, false · null · undefined → 속성 없음', () => {
    const patches = run(
      [el('input', { disabled: true, tabindex: 3, hidden: false, a: null, b: undefined })],
      [el('input', { disabled: '', tabindex: '3' })],
    );
    expect(patches).toEqual([]);
    const toggled = run([el('input', {})], [el('input', { disabled: true, tabindex: 4, hidden: false })]);
    expect(toggled).toEqual([
      { kind: 'SET_ATTR', path: [0], name: 'disabled', before: null, after: '' },
      { kind: 'SET_ATTR', path: [0], name: 'tabindex', before: null, after: '4' },
    ]);
  });

  it('함수 · style이 아닌 객체 props는 속성으로 다루지 않는다 (이벤트는 phase2)', () => {
    const patches = diff([el('button', { onClick: () => {}, data: { a: 1 } })], [el('button', { onClick: () => {} })]);
    expect(patches).toEqual([]);
  });

  it('key는 props가 아니라 비교하지 않는다 (필수 위치 비교)', () => {
    const a = { ...el('li', { id: 'x' }), key: 1 };
    const b = { ...el('li', { id: 'x' }), key: 2 };
    expect(diff([a], [b])).toEqual([]);
  });
});

describe('diff 기본 — style 항목', () => {
  it('style 항목 추가 (SET_STYLE before null)', () => {
    const patches = run([el('p', { style: { color: 'red' } })], [el('p', { style: { color: 'red', 'font-size': '12px' } })]);
    expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: 'font-size', before: null, after: '12px' }]);
  });

  it('style 항목 수정', () => {
    const patches = run([el('p', { style: { color: 'red', margin: '0' } })], [el('p', { style: { color: 'blue', margin: '0' } })]);
    expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: 'blue' }]);
  });

  it('style 항목 삭제 (SET_STYLE after null)', () => {
    const patches = run([el('p', { style: { color: 'red', margin: '0' } })], [el('p', { style: { margin: '0' } })]);
    expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: null }]);
  });

  it('style 자체가 처음 생기면 항목별 SET_STYLE (속성 교체 아님)', () => {
    const patches = run([el('p', { id: 'a' })], [el('p', { id: 'a', style: { color: 'red' } })]);
    expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: 'color', before: null, after: 'red' }]);
  });

  it('style이 통째로 없어지면 항목마다 삭제', () => {
    const patches = run([el('p', { style: { color: 'red', margin: '0' } })], [el('p', {})]);
    expect(patches).toEqual([
      { kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: null },
      { kind: 'SET_STYLE', path: [0], property: 'margin', before: '0', after: null },
    ]);
  });

  it('style 항목이 같으면(순서만 달라도) 패치 없음', () => {
    expect(diff([el('p', { style: { a: '1', b: '2' } })], [el('p', { style: { b: '2', a: '1' } })])).toEqual([]);
  });

  it('문자열 style 속성은 보통 속성으로 비교한다', () => {
    const patches = run([el('p', { style: 'color: red' })], [el('p', { style: 'color: blue' })]);
    expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: 'style', before: 'color: red', after: 'color: blue' }]);
  });
});

describe('diff 기본 — 교체', () => {
  it('D-05 태그가 다르면 REPLACE: before · after는 원본 VNode 통째 (P1-12)', () => {
    const oldNode = el('p', { class: 'a' }, text('안'));
    const newNode = el('h2', { id: 'b' }, text('녕'));
    const patches = run([oldNode], [newNode]);
    expect(patches).toEqual([{ kind: 'REPLACE', path: [0], before: oldNode, after: newNode }]);
    expect((patches[0] as { before: unknown }).before).toBe(oldNode);
    expect((patches[0] as { after: unknown }).after).toBe(newNode);
  });

  it('D-05 교체되면 그 안은 더 비교하지 않는다 (하위 구조도 통째)', () => {
    const patches = run([el('div', {}, el('p', {}, text('a')))], [el('section', {}, el('p', {}, text('b')))]);
    expect(patches.length).toBe(1);
    expect(patches[0].kind).toBe('REPLACE');
  });

  it('D-05 중첩 안의 교체: 경로가 그 자리', () => {
    const patches = run([el('div', {}, el('p'), el('span'))], [el('div', {}, el('p'), el('b'))]);
    expect(patches).toEqual([{ kind: 'REPLACE', path: [0, 1], before: el('span'), after: el('b') }]);
  });

  it('글자 ↔ 요소 ↔ 주석 종류가 다르면 REPLACE', () => {
    expect(run([text('a')], [el('b')])).toEqual([{ kind: 'REPLACE', path: [0], before: text('a'), after: el('b') }]);
    expect(run([el('b')], [text('a')])).toEqual([{ kind: 'REPLACE', path: [0], before: el('b'), after: text('a') }]);
    expect(run([text('a')], [comment('a')])).toEqual([{ kind: 'REPLACE', path: [0], before: text('a'), after: comment('a') }]);
    expect(run([comment('a')], [el('i')])).toEqual([{ kind: 'REPLACE', path: [0], before: comment('a'), after: el('i') }]);
  });
});

describe('diff 기본 — 무변경 (T-04)', () => {
  it('같은 입력이면 빈 목록 (P1-13)', () => {
    const tree = [el('div', { id: 'a', style: { color: 'red' } }, text('x'), comment('c'), el('p', { disabled: '' }))];
    expect(diff(tree, tree)).toEqual([]);
  });

  it('값이 같은 서로 다른 객체여도 빈 목록', () => {
    const make = () => [el('ul', {}, el('li', { class: 'a' }, text('1')), el('li', {}, text('2')))];
    expect(diff(make(), make())).toEqual([]);
  });

  it('빈 목록 둘이면 빈 목록', () => {
    expect(diff([], [])).toEqual([]);
  });
});

describe('diff 기본 — 입력 불변 · 검산 (T-03)', () => {
  it('입력 VNode를 고치지 않는다 (깊게 얼린 입력으로 확인)', () => {
    const oldTree = deepFreeze([el('div', { a: '1', style: { color: 'red' } }, text('x'), el('p', {}, text('y')))]);
    const newTree = deepFreeze([el('div', { b: '2', style: { margin: '0' } }, text('z'), el('b', {}, text('y')))]);
    expect(() => diff(oldTree, newTree)).not.toThrow();
  });

  it('여러 종류가 섞인 변경도 applyPatches(old, diff(old, new))가 new와 같다', () => {
    run(
      [el('section', { id: 'a', class: 'c', style: { color: 'red' } }, text('안녕'), el('p', {}, text('p')), comment(' c '), el('i', {}, text('i')))],
      [el('section', { id: 'a2', style: { color: 'blue', top: '1px' } }, text('잘가'), el('p', { x: '1' }, text('P')), comment(' d '), el('b', {}, text('b')))],
    );
  });
});
