import { describe, it, expect } from 'vitest';
import { patch } from '../patch';
import { readAreaChildren } from '../domToVNode';
import { renderAreaChildren } from '../renderVNode';
import { diff, invertPatches } from '@mini-react/react-reconciler';
import { makeRng, mutateTree, randomTree } from '../../../../react-reconciler/src/__tests__/randomTree';
import { normalizeTree } from '../../../../react-reconciler/src/__tests__/applyPatches';
import { comment, el, text } from '../../../../shared/src/__tests__/helpers';
import type { AreaChildren, Patch, VNode } from '@mini-react/shared';

function area(html: string): HTMLElement {
  const box = document.createElement('div');
  box.id = 'box';
  box.innerHTML = html;
  return box;
}

function observe(target: Node): MutationObserver {
  const observer = new MutationObserver(() => {});
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return observer;
}

describe('patch — 종류별 반영 (손으로 쓴 Patch 목록)', () => {
  it('D-01 SET_TEXT: 글자 노드의 nodeValue만 바꾼다 (노드 참조 유지, P1-06)', () => {
    const box = area('<p>안녕</p>');
    const textNode = box.firstChild!.firstChild!;
    patch(box, [{ kind: 'SET_TEXT', path: [0, 0], before: '안녕', after: '잘가' }]);
    expect(box.innerHTML).toBe('<p>잘가</p>');
    expect(box.firstChild!.firstChild).toBe(textNode);
  });

  it('SET_TEXT는 주석 노드 글도 바꾼다', () => {
    const box = area('<div><!-- 옛 --></div>');
    const note = box.firstChild!.firstChild!;
    patch(box, [{ kind: 'SET_TEXT', path: [0, 0], before: ' 옛 ', after: ' 새 ' }]);
    expect(box.innerHTML).toBe('<div><!-- 새 --></div>');
    expect(box.firstChild!.firstChild).toBe(note);
  });

  it('D-02 SET_ATTR 추가 · 수정 · 삭제 (P1-07 ~ 09)', () => {
    const box = area('<p class="a" id="i"></p>');
    const p = box.firstChild as Element;
    patch(box, [
      { kind: 'SET_ATTR', path: [0], name: 'class', before: 'a', after: 'b' },
      { kind: 'SET_ATTR', path: [0], name: 'id', before: 'i', after: null },
      { kind: 'SET_ATTR', path: [0], name: 'title', before: null, after: 't' },
    ]);
    expect(p.getAttribute('class')).toBe('b');
    expect(p.hasAttribute('id')).toBe(false);
    expect(p.getAttribute('title')).toBe('t');
    expect(box.firstChild).toBe(p);
  });

  it('boolean 속성은 값 ""으로 켜고, 삭제로 끈다', () => {
    const box = area('<button>x</button>');
    const button = box.firstChild as Element;
    patch(box, [{ kind: 'SET_ATTR', path: [0], name: 'disabled', before: null, after: '' }]);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('disabled')).toBe('');
    patch(box, [{ kind: 'SET_ATTR', path: [0], name: 'disabled', before: '', after: null }]);
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('SET_STYLE 항목별: 다른 항목은 유지한다', () => {
    const box = area('<p style="color: red; margin: 0"></p>');
    patch(box, [
      { kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: 'blue' },
      { kind: 'SET_STYLE', path: [0], property: 'top', before: null, after: '1px' },
    ]);
    expect(readAreaChildren(box)[0].props).toEqual({ style: { color: 'blue', margin: '0', top: '1px' } });
  });

  it('SET_STYLE 마지막 항목을 지우면 style 속성도 제거한다', () => {
    const box = area('<p style="color: red; margin: 0"></p>');
    const p = box.firstChild as Element;
    patch(box, [
      { kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: null },
      { kind: 'SET_STYLE', path: [0], property: 'margin', before: '0', after: null },
    ]);
    expect(p.hasAttribute('style')).toBe(false);
  });

  it('style 속성이 없던 요소에 항목을 추가하면 style 속성이 생긴다', () => {
    const box = area('<p></p>');
    patch(box, [{ kind: 'SET_STYLE', path: [0], property: 'color', before: null, after: 'red' }]);
    expect((box.firstChild as Element).getAttribute('style')).toBe('color: red');
  });

  it('SET_STYLE은 브라우저가 모르는 항목도 그대로 유지한다', () => {
    const box = area('<p style="not-a-real-prop: x; color: red"></p>');
    patch(box, [{ kind: 'SET_STYLE', path: [0], property: 'color', before: 'red', after: 'blue' }]);
    expect(readAreaChildren(box)[0].props).toEqual({ style: { 'not-a-real-prop': 'x', color: 'blue' } });
  });

  it('D-03 INSERT: path 마지막 번호 자리에 끼운다 (P1-10)', () => {
    const box = area('<ul><li>a</li><li>c</li></ul>');
    patch(box, [{ kind: 'INSERT', path: [0, 1], node: el('li', {}, text('b')) }]);
    expect(box.innerHTML).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
  });

  it('INSERT는 맨 끝(길이와 같은 번호)에도 붙인다', () => {
    const box = area('<ul></ul>');
    patch(box, [{ kind: 'INSERT', path: [0, 0], node: el('li') }, { kind: 'INSERT', path: [1], node: el('p') }]);
    expect(box.innerHTML).toBe('<ul><li></li></ul><p></p>');
  });

  it('D-04 REMOVE: 그 노드를 뺀다 (P1-11)', () => {
    const box = area('<ul><li>a</li><li>b</li></ul>');
    const first = box.firstChild!.firstChild;
    patch(box, [{ kind: 'REMOVE', path: [0, 1], node: el('li', {}, text('b')) }]);
    expect(box.innerHTML).toBe('<ul><li>a</li></ul>');
    expect(box.firstChild!.firstChild).toBe(first);
  });

  it('D-05 REPLACE: 새 노드로 바뀌고 옛 노드는 분리된다 (P1-12)', () => {
    const box = area('<p class="a">x</p><i>y</i>');
    const oldP = box.firstChild!;
    const sibling = box.childNodes[1];
    patch(box, [{ kind: 'REPLACE', path: [0], before: el('p', { class: 'a' }, text('x')), after: el('h2', { id: 'n' }, text('새')) }]);
    expect(box.innerHTML).toBe('<h2 id="n">새</h2><i>y</i>');
    expect(oldP.parentNode).toBeNull();
    expect(box.childNodes[1]).toBe(sibling);
  });

  it('INSERT 하는 새 노드는 주석 · 글자 · style도 그대로 그린다', () => {
    const box = area('');
    patch(box, [
      { kind: 'INSERT', path: [0], node: comment(' c ') },
      { kind: 'INSERT', path: [1], node: el('p', { style: { color: 'red' }, hidden: '' }, text('x')) },
    ]);
    expect(box.innerHTML).toBe('<!-- c --><p style="color: red" hidden="">x</p>');
  });
});

describe('patch — 경로 · 순서', () => {
  it('경로가 영역 상자 안 자식부터이고 공백 · 주석 번호를 센다', () => {
    const box = area('<ul>\n  <!-- c -->\n  <li>a</li>\n</ul>');
    // ul 안: 0 공백, 1 주석, 2 공백, 3 li, 4 공백
    patch(box, [{ kind: 'SET_TEXT', path: [0, 3, 0], before: 'a', after: 'b' }]);
    expect(box.querySelector('li')!.textContent).toBe('b');
  });

  it('한 목록 안에서 INSERT(앞에서) · REMOVE(뒤에서)를 순서대로 적용한다 (그 순간 트리 기준)', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>');
    const ul = box.firstChild as Element;
    patch(box, [
      { kind: 'REMOVE', path: [0, 3], node: el('li') },
      { kind: 'REMOVE', path: [0, 2], node: el('li') },
      { kind: 'INSERT', path: [0, 2], node: el('li', {}, text('x')) },
      { kind: 'INSERT', path: [0, 3], node: el('li', {}, text('y')) },
    ]);
    expect(box.innerHTML).toBe('<ul><li>a</li><li>b</li><li>x</li><li>y</li></ul>');
    expect(box.firstChild).toBe(ul);
  });

  it('빈 목록이면 MutationObserver 기록 0건 (T-04, P1-13)', () => {
    const box = area('<p class="a">x</p>');
    const observer = observe(box);
    patch(box, []);
    expect(observer.takeRecords().length).toBe(0);
    observer.disconnect();
  });

  it('글자 하나 바꾸기는 기록 1건(characterData)뿐이다 (T-06)', () => {
    const box = area('<div><p>a</p><p>b</p></div>');
    const observer = observe(box);
    patch(box, [{ kind: 'SET_TEXT', path: [0, 1, 0], before: 'b', after: 'B' }]);
    const records = observer.takeRecords();
    expect(records.map((r) => r.type)).toEqual(['characterData']);
    observer.disconnect();
  });

  it('속성 하나 바꾸기는 기록 1건(attributes)뿐이다', () => {
    const box = area('<div><p>a</p></div>');
    const observer = observe(box);
    patch(box, [{ kind: 'SET_ATTR', path: [0, 0], name: 'class', before: null, after: 'x' }]);
    expect(observer.takeRecords().map((r) => r.type)).toEqual(['attributes']);
    observer.disconnect();
  });
});

describe('patch — 참조 유지 (T-06 · P1-17 · P1-18)', () => {
  it('대상 · 부모 · 형제 요소의 참조가 유지된다', () => {
    const box = area('<section><h2>제목</h2><p>글</p><ul><li>a</li></ul></section>');
    const section = box.firstChild as Element;
    const h2 = section.children[0];
    const p = section.children[1];
    const ul = section.children[2];
    const li = ul.firstChild;
    patch(box, [
      { kind: 'SET_TEXT', path: [0, 1, 0], before: '글', after: '새 글' },
      { kind: 'SET_ATTR', path: [0, 1], name: 'class', before: null, after: 'x' },
    ]);
    expect(box.firstChild).toBe(section);
    expect(section.children[0]).toBe(h2);
    expect(section.children[1]).toBe(p);
    expect(section.children[2]).toBe(ul);
    expect(ul.firstChild).toBe(li);
  });

  it('추가 · 삭제 때도 관련 없는 형제 노드의 참조가 유지된다', () => {
    const box = area('<ul><li>a</li><li>b</li></ul><p>x</p>');
    const [ul, p] = [box.childNodes[0], box.childNodes[1]];
    const a = ul.firstChild;
    patch(box, [
      { kind: 'INSERT', path: [0, 2], node: el('li', {}, text('c')) },
      { kind: 'REMOVE', path: [0, 1], node: el('li') },
    ]);
    expect(box.childNodes[0]).toBe(ul);
    expect(box.childNodes[1]).toBe(p);
    expect(ul.firstChild).toBe(a);
  });
});

describe('patch — MOVE (Key 확장, 같은 DOM 노드를 옮긴다)', () => {
  const texts = (ul: Element) => Array.from(ul.children).map((c) => c.textContent);

  it('뒤로 이동: from번을 빼서 뺀 뒤 목록의 to번 자리에 넣는다', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>');
    const ul = box.firstChild as Element;
    patch(box, [{ kind: 'MOVE', parent: [0], from: 0, to: 2 }]);
    expect(texts(ul)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('앞으로 이동', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>');
    const ul = box.firstChild as Element;
    patch(box, [{ kind: 'MOVE', parent: [0], from: 3, to: 1 }]);
    expect(texts(ul)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('맨 끝으로 · 맨 앞으로 · 제자리(from = to)는 아무 일 없음', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li></ul>');
    const ul = box.firstChild as Element;
    patch(box, [{ kind: 'MOVE', parent: [0], from: 0, to: 2 }]);
    expect(texts(ul)).toEqual(['b', 'c', 'a']);
    patch(box, [{ kind: 'MOVE', parent: [0], from: 2, to: 0 }]);
    expect(texts(ul)).toEqual(['a', 'b', 'c']);
    const observer = observe(box);
    patch(box, [{ kind: 'MOVE', parent: [0], from: 1, to: 1 }]);
    expect(observer.takeRecords()).toHaveLength(0);
    expect(texts(ul)).toEqual(['a', 'b', 'c']);
  });

  it('이동한 노드의 참조가 그대로다 (===): 새로 만들지 않고 같은 DOM 노드를 옮긴다', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li></ul>');
    const ul = box.firstChild as Element;
    const [a, b, c] = Array.from(ul.children);
    const aText = a.firstChild;
    patch(box, [{ kind: 'MOVE', parent: [0], from: 0, to: 2 }]);
    expect(Array.from(ul.children)).toEqual([b, c, a]);
    expect(ul.children[2]).toBe(a);
    expect(a.firstChild).toBe(aText);
    // 이동하지 않은 형제 · 부모의 참조도 그대로
    expect(ul.children[0]).toBe(b);
    expect(ul.children[1]).toBe(c);
    expect(box.firstChild).toBe(ul);
  });

  it('이동 중에 다른 형제를 새로 만들거나 지우지 않는다 (childList 기록은 옮긴 노드 하나의 제거 + 삽입뿐)', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li></ul>');
    const ul = box.firstChild as Element;
    const observer = observe(box);
    patch(box, [{ kind: 'MOVE', parent: [0], from: 0, to: 2 }]);
    const records = observer.takeRecords();
    const a = ul.children[2];
    const removed = records.flatMap((r) => Array.from(r.removedNodes));
    const added = records.flatMap((r) => Array.from(r.addedNodes));
    expect(removed).toEqual([a]);
    expect(added).toEqual([a]);
    expect(records.every((r) => r.type === 'childList')).toBe(true);
  });

  it('영역 맨 위 목록도 옮긴다 (parent가 [])', () => {
    const box = area('<p>a</p><p>b</p><p>c</p>');
    const [a, b, c] = Array.from(box.children);
    patch(box, [{ kind: 'MOVE', parent: [], from: 2, to: 0 }]);
    expect(Array.from(box.children)).toEqual([c, a, b]);
  });

  it('공백 · 글자 노드도 번호를 차지하므로 번호는 childNodes 기준이다', () => {
    const box = area('<ul> <li>a</li> <li>b</li> </ul>');
    const ul = box.firstChild as Element;
    const [, a, , b] = Array.from(ul.childNodes);
    patch(box, [{ kind: 'MOVE', parent: [0], from: 3, to: 1 }]);
    expect(Array.from(ul.childNodes).slice(1, 3)).toEqual([b, a]);
  });

  it('MOVE 뒤에 이어지는 INSERT · REMOVE · SET_TEXT의 경로는 그 순간의 트리 기준이다 (결정 4 A)', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li></ul>');
    const ul = box.firstChild as Element;
    const [a, b, c] = Array.from(ul.children);
    patch(box, [
      { kind: 'MOVE', parent: [0], from: 2, to: 0 }, // [c,a,b]
      { kind: 'INSERT', path: [0, 1], node: el('li', {}, text('x')) }, // [c,x,a,b]
      { kind: 'REMOVE', path: [0, 3], node: el('li', {}, text('b')) }, // [c,x,a]
      { kind: 'SET_TEXT', path: [0, 2, 0], before: 'a', after: 'A' }, // a가 2번 자리
    ]);
    expect(texts(ul)).toEqual(['c', 'x', 'A']);
    expect(ul.children[0]).toBe(c);
    expect(ul.children[2]).toBe(a);
    expect(b.isConnected).toBe(false);
  });

  it('MOVE의 역(from ↔ to)이 원래 순서와 같은 참조로 되돌린다', () => {
    const box = area('<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>');
    const ul = box.firstChild as Element;
    const before = Array.from(ul.children);
    const moves: Patch[] = [
      { kind: 'MOVE', parent: [0], from: 0, to: 3 },
      { kind: 'MOVE', parent: [0], from: 2, to: 0 },
    ];
    patch(box, moves);
    expect(Array.from(ul.children)).not.toEqual(before);
    patch(box, invertPatches(moves));
    expect(Array.from(ul.children)).toEqual(before);
  });

  it('대상이 없으면 어느 경로 · 번호인지 적힌 오류를 낸다 (C2 복구의 재료)', () => {
    const box = area('<ul><li>a</li><li>b</li></ul>');
    expect(() => patch(box, [{ kind: 'MOVE', parent: [0], from: 5, to: 0 }])).toThrow(/from 5/);
    expect(() => patch(box, [{ kind: 'MOVE', parent: [0], from: 0, to: 5 }])).toThrow(/to 5/);
    expect(() => patch(box, [{ kind: 'MOVE', parent: [3], from: 0, to: 1 }])).toThrow(/3/);
  });

  it('diff(Key) 결과를 그대로 적용하면 같은 key 노드의 참조가 유지되고 결과가 목표와 같다', () => {
    const k = (key: string, label: string) => ({ ...el('li', {}, text(label)), key });
    const oldTree = [el('ul', {}, k('a', 'A'), k('b', 'B'), k('c', 'C'))];
    const newTree = [el('ul', {}, k('c', 'C'), k('a', 'A'), k('b', 'B!'))];
    const box = area('');
    renderAreaChildren(box, oldTree);
    const [a, b, c] = Array.from((box.firstChild as Element).children);
    const patches = diff(oldTree, newTree);
    expect(patches.some((p) => p.kind === 'MOVE')).toBe(true);
    patch(box, patches);
    const ul = box.firstChild as Element;
    expect(Array.from(ul.children)).toEqual([c, a, b]);
    expect(texts(ul)).toEqual(['C', 'A', 'B!']);
  });
});

describe('patch — 오류', () => {
  it('경로에 노드가 없으면 어느 경로인지 적힌 분명한 오류를 낸다 (C2 복구의 재료)', () => {
    const box = area('<p>x</p>');
    expect(() => patch(box, [{ kind: 'SET_TEXT', path: [3, 0], before: 'a', after: 'b' }])).toThrow(/3,0/);
    expect(() => patch(box, [{ kind: 'REMOVE', path: [0, 5], node: el('i') }])).toThrow(/0,5/);
    expect(() => patch(box, [{ kind: 'INSERT', path: [0, 9], node: el('i') }])).toThrow(/0,9/);
  });

  it('요소가 아닌 노드에 속성을 바꾸려 하면 오류', () => {
    const box = area('글자');
    expect(() => patch(box, [{ kind: 'SET_ATTR', path: [0], name: 'a', before: null, after: '1' }])).toThrow();
  });

  it('글자가 아닌 노드에 SET_TEXT를 하면 오류', () => {
    const box = area('<p></p>');
    expect(() => patch(box, [{ kind: 'SET_TEXT', path: [0], before: 'a', after: 'b' }])).toThrow();
  });
});

describe('patch — diff 결과 적용 (T-03 · T-05 · P1-34)', () => {
  function roundTrip(oldTree: AreaChildren, newTree: AreaChildren): { box: HTMLElement; patches: Patch[] } {
    const box = area('');
    renderAreaChildren(box, oldTree);
    const patches = diff(oldTree, newTree);
    patch(box, patches);
    expect(readAreaChildren(box)).toEqual(normalizeTree(newTree));
    return { box, patches };
  }

  it('D-01 ~ D-05 각각 diff → patch 결과가 목표 구조와 같다', () => {
    roundTrip([el('p', {}, text('a'))], [el('p', {}, text('b'))]); // D-01
    roundTrip([el('p', { class: 'a' })], [el('p', { class: 'b', id: 'x' })]); // D-02
    roundTrip([el('ul', {}, el('li'))], [el('ul', {}, el('li'), el('li'))]); // D-03
    roundTrip([el('ul', {}, el('li'), el('li'))], [el('ul', {}, el('li'))]); // D-04
    roundTrip([el('p', {}, text('x'))], [el('h2', { id: 'n' }, text('x'))]); // D-05
  });

  it('복합 변경 · 삭제와 수정 동시 · 복수 루트 · 0개', () => {
    roundTrip(
      [el('main', { id: 'm' }, el('h1', {}, text('t')), el('p', { class: 'a' }, text('p')), el('span', {}, text('s')), el('i'), el('i'))],
      [el('main', { id: 'm', lang: 'ko' }, el('h1', {}, text('T')), el('p', {}, text('p')), el('b', {}, text('s')))],
    );
    roundTrip([], [el('a'), text('x'), comment('c')]);
    roundTrip([el('a'), text('x'), comment('c')], []);
  });

  it('diff → patch 후 역패치를 적용하면 원래 구조로 돌아간다', () => {
    const oldTree = [el('ul', { style: { color: 'red' } }, text('\n'), el('li', {}, text('a')), el('li', {}, text('b')), comment('c'))];
    const newTree = [el('ul', { class: 'x', style: { margin: '0' } }, text('\n  '), el('li', {}, text('A')))];
    const { box, patches } = roundTrip(oldTree, newTree);
    patch(box, invertPatches(patches));
    expect(readAreaChildren(box)).toEqual(normalizeTree(oldTree));
  });

  it('무작위(고정 씨앗) 200쌍: 실제 DOM에 적용한 결과가 목표와 같고, 역패치로 원래대로 돌아온다', () => {
    const rng = makeRng(20261111);
    for (let i = 0; i < 200; i++) {
      const oldTree = randomTree(rng);
      const newTree = i % 2 === 0 ? randomTree(rng) : mutateTree(rng, oldTree);
      const { box, patches } = roundTrip(oldTree, newTree);
      patch(box, invertPatches(patches));
      expect(readAreaChildren(box)).toEqual(normalizeTree(oldTree));
    }
  });

  it('깊이 300 중첩의 맨 아래 글자 바꾸기가 스택 넘침 없이 끝나고 결과가 목표와 같다 (B20)', () => {
    const nest = (leaf: string): VNode[] => {
      let node: VNode = el('span', {}, text(leaf));
      for (let i = 0; i < 300; i++) node = el('div', {}, node);
      return [node];
    };
    const { patches } = roundTrip(nest('a'), nest('b'));
    expect(patches.length).toBe(1);
  });

  it('형제 2,000개에서 끝에 추가 · 전부 삭제가 끝나고 결과가 목표와 같다 (B20)', () => {
    const many = (n: number) => [el('ul', {}, ...Array.from({ length: n }, (_, i) => el('li', {}, text(String(i)))))];
    roundTrip(many(2000), many(2001));
    roundTrip(many(2000), [el('ul')]);
  });

  it('일부 변경에서 바뀌지 않는 노드의 참조가 유지된다 (T-06)', () => {
    const oldTree = [el('div', {}, el('p', {}, text('안 바뀜')), el('p', {}, text('바뀜')), el('ul', {}, el('li')))];
    const newTree = [el('div', {}, el('p', {}, text('안 바뀜')), el('p', {}, text('바뀐')), el('ul', {}, el('li')))];
    const box = area('');
    renderAreaChildren(box, oldTree);
    const div = box.firstChild as Element;
    const pick = () => [div.children[0], div.children[0].firstChild, div.children[2], div.children[2].firstChild];
    const keep = pick();
    patch(box, diff(oldTree, newTree));
    expect(box.firstChild).toBe(div);
    pick().forEach((node, i) => expect(node).toBe(keep[i]));
  });
});
