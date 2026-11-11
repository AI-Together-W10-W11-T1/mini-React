import { describe, it, expect } from 'vitest';
import { h } from '@mini-react/react';
import { diff, invertPatches } from '@mini-react/react-reconciler';
import { patch, renderAreaChildren } from '@mini-react/react-dom-bindings';
import { createVDomRoot } from '../createVDomRoot';
import type { AreaChildren, ElementVNode, Key, Patch } from '@mini-react/shared';

// Key 확장 통합 (알고리즘 결정 2 B · 7). Phase 1 화면에는 key가 없고, 이 파일이 "같은 key의 노드가 유지된다"(PRD §5)를 증명한다.
// key VNode는 h()로 만든다. diff → patch(react-dom-bindings)는 DOM을 쓰므로 jsdom 위에서 돈다.

const li = (key: Key, label: string = String(key), props: { [name: string]: unknown } = {}): ElementVNode =>
  h('li', { key, ...props }, label) as ElementVNode;
const list = (...items: ElementVNode[]): AreaChildren => [h('ul', { id: 'todo' }, ...items) as ElementVNode];

function makeArea(tree: AreaChildren): HTMLElement {
  const area = document.createElement('div');
  area.id = 'real-area';
  renderAreaChildren(area, tree);
  return area;
}

/** 목표 VNode를 새로 그린 DOM의 모양 (renderVNode(new)와 구조가 같은지 비교하는 기준) */
function expectedHtml(tree: AreaChildren): string {
  return makeArea(tree).innerHTML;
}

/** key → 그 key의 <li> DOM 노드 */
function nodesByKey(area: Element, tree: AreaChildren): Map<Key, Element> {
  const ul = area.firstElementChild as Element;
  const map = new Map<Key, Element>();
  (tree[0].children as readonly ElementVNode[]).forEach((child, i) => map.set(child.key as Key, ul.children[i]));
  return map;
}

function liOrder(area: Element): string[] {
  return Array.from((area.firstElementChild as Element).children).map((c) => c.textContent ?? '');
}

/** diff → patch를 적용하고 결과 DOM이 목표와 같은지 확인 */
function applyDiff(area: HTMLElement, oldTree: AreaChildren, newTree: AreaChildren): Patch[] {
  const patches = diff(oldTree, newTree);
  patch(area, patches);
  expect(area.innerHTML).toBe(expectedHtml(newTree));
  return patches;
}

describe('Key 통합 — diff → patch (같은 key 노드의 참조 유지, PRD §5)', () => {
  it('중간 삽입: 기존 key 노드는 모두 ===, 새 key만 새 노드', () => {
    const oldTree = list(li('a'), li('b'), li('d'));
    const newTree = list(li('a'), li('b'), li('c'), li('d'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const patches = applyDiff(area, oldTree, newTree);
    expect(patches.map((p) => p.kind)).toEqual(['INSERT']);
    const after = nodesByKey(area, newTree);
    for (const key of ['a', 'b', 'd']) expect(after.get(key)).toBe(before.get(key));
    expect(Array.from(before.values())).not.toContain(after.get('c'));
  });

  it('중간 삭제: 지워진 key만 분리되고 남은 key 노드는 ===', () => {
    const oldTree = list(li('a'), li('b'), li('c'), li('d'));
    const newTree = list(li('a'), li('d'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const patches = applyDiff(area, oldTree, newTree);
    expect(patches.map((p) => p.kind)).toEqual(['REMOVE', 'REMOVE']);
    const after = nodesByKey(area, newTree);
    expect(after.get('a')).toBe(before.get('a'));
    expect(after.get('d')).toBe(before.get('d'));
    expect(before.get('b')!.isConnected).toBe(false);
    expect(before.get('c')!.isConnected).toBe(false);
  });

  it('재정렬: 모든 key 노드가 ===이고 순서만 바뀐다 (MOVE만, 새 노드 없음)', () => {
    const oldTree = list(li('a'), li('b'), li('c'), li('d'));
    const newTree = list(li('d'), li('b'), li('a'), li('c'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const ul = area.firstElementChild as Element;
    const patches = applyDiff(area, oldTree, newTree);
    expect(patches.every((p) => p.kind === 'MOVE')).toBe(true);
    const after = nodesByKey(area, newTree);
    for (const key of ['a', 'b', 'c', 'd']) expect(after.get(key)).toBe(before.get(key));
    expect(area.firstElementChild).toBe(ul);
    expect(liOrder(area)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('삽입 + 삭제 + 재정렬 + 내용 변경이 한 번에: 살아남은 key는 ===, 내용 변경은 그 노드 안에서', () => {
    const oldTree = list(li('a', 'A'), li('b', 'B'), li('c', 'C'), li('d', 'D'));
    const newTree = list(li('d', 'D'), li('x', 'X'), li('a', 'A2', { class: 'hot' }), li('c', 'C'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const aText = before.get('a')!.firstChild;
    const patches = applyDiff(area, oldTree, newTree);
    expect(new Set(patches.map((p) => p.kind))).toEqual(new Set(['REMOVE', 'MOVE', 'INSERT', 'SET_TEXT', 'SET_ATTR']));
    const after = nodesByKey(area, newTree);
    for (const key of ['a', 'c', 'd']) expect(after.get(key)).toBe(before.get(key));
    expect(after.get('a')!.firstChild).toBe(aText); // 글자 노드도 그대로 (nodeValue만 바뀜)
    expect(after.get('a')!.getAttribute('class')).toBe('hot');
    expect(before.get('b')!.isConnected).toBe(false);
  });

  it('같은 key인데 태그가 다르면 그 key만 새 노드(REPLACE), 나머지는 ===', () => {
    const oldTree = list(li('a'), li('b'), li('c'));
    const newTree = list(li('a'), h('p', { key: 'b' }, 'b') as ElementVNode, li('c'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const patches = applyDiff(area, oldTree, newTree);
    expect(patches.map((p) => p.kind)).toEqual(['REPLACE']);
    const after = nodesByKey(area, newTree);
    expect(after.get('a')).toBe(before.get('a'));
    expect(after.get('c')).toBe(before.get('c'));
    expect(after.get('b')).not.toBe(before.get('b'));
  });

  it('위치 비교 목록(key 없음)은 그대로 위치로 고친다 — 필수 동작과 같다', () => {
    const plain = (label: string) => h('li', null, label) as ElementVNode;
    const oldTree = list(plain('a'), plain('b'));
    const newTree = list(plain('b'), plain('a'));
    const area = makeArea(oldTree);
    const before = Array.from((area.firstElementChild as Element).children);
    const patches = applyDiff(area, oldTree, newTree);
    expect(patches.every((p) => p.kind === 'SET_TEXT')).toBe(true);
    // 위치 비교는 노드를 옮기지 않고 그 자리에서 글자만 바꾼다
    expect(Array.from((area.firstElementChild as Element).children)).toEqual(before);
  });
});

describe('Key 통합 — 역패치 (MOVE 역 포함)', () => {
  it('재정렬을 invertPatches로 되돌리면 원래 순서 · 같은 참조', () => {
    const oldTree = list(li('a'), li('b'), li('c'), li('d'));
    const newTree = list(li('c'), li('d'), li('a'), li('b'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const patches = applyDiff(area, oldTree, newTree);
    expect(patches.some((p) => p.kind === 'MOVE')).toBe(true);
    patch(area, invertPatches(patches));
    expect(area.innerHTML).toBe(expectedHtml(oldTree));
    const back = nodesByKey(area, oldTree);
    for (const key of ['a', 'b', 'c', 'd']) expect(back.get(key)).toBe(before.get(key));
  });

  it('삽입 + 삭제 + 재정렬을 되돌리면 원래 모양이고, 남아 있던 key는 같은 참조 (지워졌던 key는 다시 만들어진 새 노드)', () => {
    const oldTree = list(li('a', 'A'), li('b', 'B'), li('c', 'C'), li('d', 'D'));
    const newTree = list(li('d', 'D'), li('x', 'X'), li('a', 'A2'), li('c', 'C'));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const patches = applyDiff(area, oldTree, newTree);
    patch(area, invertPatches(patches));
    expect(area.innerHTML).toBe(expectedHtml(oldTree));
    const back = nodesByKey(area, oldTree);
    for (const key of ['a', 'c', 'd']) expect(back.get(key)).toBe(before.get(key));
    expect(back.get('b')).not.toBe(before.get('b')); // REMOVE의 역 = INSERT: 원본 VNode로 새로 그림
  });

  it('왕복을 여러 번 반복해도 같은 참조 · 같은 모양', () => {
    const oldTree = list(li(1), li(2), li(3));
    const newTree = list(li(3), li(1), li(2));
    const area = makeArea(oldTree);
    const before = nodesByKey(area, oldTree);
    const patches = diff(oldTree, newTree);
    for (let i = 0; i < 5; i++) {
      patch(area, patches);
      expect(area.innerHTML).toBe(expectedHtml(newTree));
      patch(area, invertPatches(patches));
      expect(area.innerHTML).toBe(expectedHtml(oldTree));
    }
    const back = nodesByKey(area, oldTree);
    for (const key of [1, 2, 3]) expect(back.get(key)).toBe(before.get(key));
  });
});

describe('Key 통합 — createVDomRoot update → back → forward (결정 7: VNode · 패치 · 역패치 저장)', () => {
  // [AI Note]: createVDomRoot의 0번 기록은 실제 영역 DOM에서 읽은 VNode라 key가 없다 (DOM에는 key를 쓰지 않음).
  // 그래서 key가 있는 VNode가 처음 들어오는 update(v1)는 위치 비교고, 그 기록(snapshot)에 key가 담긴 뒤의 update부터 key 비교 · MOVE가 쓰인다.
  // v1은 모양이 바뀌는(d 추가) 첫 update여야 기록된다 — 무변경 update는 기록하지 않으므로(§3.3) key가 snapshot에 안 들어간다.
  it('key가 snapshot에 담긴 뒤부터 MOVE · INSERT · REMOVE로 움직이고, back · forward가 기록과 일치하며 참조가 유지된다', () => {
    const area = makeArea(list(li('a'), li('b'), li('c')));
    const root = createVDomRoot(area);
    const ul = area.firstElementChild as Element;
    const initial = nodesByKey(area, list(li('a'), li('b'), li('c')));

    const v1 = list(li('a'), li('b'), li('c'), li('d'));
    expect(root.update(v1)).toBe(true); // 위치 비교(0번에는 key가 없음): d 추가
    expect(area.innerHTML).toBe(expectedHtml(v1));
    const nodes = nodesByKey(area, v1);
    for (const key of ['a', 'b', 'c']) expect(nodes.get(key)).toBe(initial.get(key));

    const v2 = list(li('c'), li('a'), li('d'), li('b')); // 재정렬만
    expect(root.update(v2)).toBe(true);
    expect(area.innerHTML).toBe(expectedHtml(v2));
    const afterV2 = nodesByKey(area, v2);
    for (const key of ['a', 'b', 'c', 'd']) expect(afterV2.get(key)).toBe(nodes.get(key)); // 새 노드 없이 모두 같은 참조

    const v3 = list(li('c'), li('x'), li('a'), li('d')); // b 삭제 · x 삽입
    expect(root.update(v3)).toBe(true);
    expect(area.innerHTML).toBe(expectedHtml(v3));
    const afterV3 = nodesByKey(area, v3);
    for (const key of ['a', 'c', 'd']) expect(afterV3.get(key)).toBe(nodes.get(key));
    expect(area.firstElementChild).toBe(ul);

    // 뒤로: v3 → v2 (역패치 = INSERT의 역 · REMOVE의 역 · MOVE의 역이 섞여 있어도 기록과 같음)
    expect(root.back()).toBe(v2);
    expect(area.innerHTML).toBe(expectedHtml(v2));
    const backV2 = nodesByKey(area, v2);
    for (const key of ['a', 'c', 'd']) expect(backV2.get(key)).toBe(nodes.get(key));

    // 뒤로: v2 → v1 (MOVE의 역만): 네 노드 모두 처음 그 노드
    expect(root.back()).toBe(v1);
    expect(area.innerHTML).toBe(expectedHtml(v1));
    const backV1 = nodesByKey(area, v1);
    for (const key of ['a', 'c', 'd']) expect(backV1.get(key)).toBe(nodes.get(key));
    expect(liOrder(area)).toEqual(['a', 'b', 'c', 'd']);

    // 앞으로 두 칸: 기록의 patches 그대로
    expect(root.forward()).toBe(v2);
    expect(area.innerHTML).toBe(expectedHtml(v2));
    expect(root.forward()).toBe(v3);
    expect(area.innerHTML).toBe(expectedHtml(v3));
    expect(root.forward()).toBeNull(); // 끝 경계는 무시
    const forwardV3 = nodesByKey(area, v3);
    for (const key of ['a', 'c', 'd']) expect(forwardV3.get(key)).toBe(nodes.get(key));
  });

  it('저장한 VNode(snapshot)는 이동 · 갱신으로 바뀌지 않고, 이동한 기록의 snapshot 그대로 돌아온다 (P1-27)', () => {
    const area = makeArea(list(li('a'), li('b')));
    const root = createVDomRoot(area);
    const v1 = list(li('a'), li('b'), li('c'));
    const v2 = list(li('c'), li('b'), li('a'));
    root.update(v1);
    root.update(v2);
    expect(root.snapshot()).toBe(v2);
    expect(root.back()).toBe(v1);
    expect(root.snapshot()).toBe(v1);
    expect(root.forward()).toBe(v2);
    expect(liOrder(area)).toEqual(['c', 'b', 'a']);
  });

  it('같은 key 목록을 다시 update하면(무변경) 기록하지 않고 DOM도 건드리지 않는다 (T-04)', () => {
    const area = makeArea(list(li('a'), li('b')));
    const root = createVDomRoot(area);
    root.update(list(li('a'), li('b'), li('c')));
    const observer = new MutationObserver(() => {});
    observer.observe(area, { subtree: true, childList: true, attributes: true, characterData: true });
    expect(root.update(list(li('a'), li('b'), li('c')))).toBe(false);
    expect(observer.takeRecords()).toHaveLength(0);
  });
});
