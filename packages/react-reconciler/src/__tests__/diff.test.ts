import { describe, it, expect } from 'vitest';
import { diff } from '../diff';
import { applyPatches, normalizeTree } from './applyPatches';
import { comment, el, text } from '../../../shared/src/__tests__/helpers';
import { makeRng, mutateTree, randomTree } from './randomTree';
import type { AreaChildren, Patch, VNode } from '@mini-react/shared';

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

  describe('속성 이름 __proto__ (검수 2회차 B-1)', () => {
    // [AI Note]: `{ __proto__: 'x' }` 리터럴은 프로토타입 설정이라 속성이 되지 않는다. fromEntries로 자기 속성을 만든다.
    const attrs = (entries: Array<[string, string]>) => Object.fromEntries(entries);
    // run()은 검산기가 양쪽을 같은 방식으로 정규화해 `__proto__`가 사라져도 같아 보일 수 있다 — 적용 결과에 자기 속성이 남았는지 따로 본다.
    const own = (list: AreaChildren) => Object.hasOwn(list[0].props, '__proto__');

    it('__proto__ 속성 추가는 SET_ATTR before null', () => {
      const oldTree = [el('p', attrs([['id', 'a']]))];
      const patches = run(oldTree, [el('p', attrs([['id', 'a'], ['__proto__', 'x']]))]);
      expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: '__proto__', before: null, after: 'x' }]);
      expect(own(applyPatches(oldTree, patches))).toBe(true);
    });

    it('__proto__ 속성 삭제는 SET_ATTR after null', () => {
      const oldTree = [el('p', attrs([['id', 'a'], ['__proto__', 'x']]))];
      const patches = run(oldTree, [el('p', attrs([['id', 'a']]))]);
      expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: '__proto__', before: 'x', after: null }]);
      expect(own(applyPatches(oldTree, patches))).toBe(false);
      expect(own(normalizeTree(oldTree))).toBe(true); // 비교용 정규화도 __proto__ 항목을 지우지 않는다
    });

    it('__proto__ 속성 값 수정은 SET_ATTR 전 · 후 값', () => {
      const oldTree = [el('p', attrs([['__proto__', 'x']]))];
      const patches = run(oldTree, [el('p', attrs([['__proto__', 'y']]))]);
      expect(patches).toEqual([{ kind: 'SET_ATTR', path: [0], name: '__proto__', before: 'x', after: 'y' }]);
      expect(Object.getOwnPropertyDescriptor(applyPatches(oldTree, patches)[0].props, '__proto__')?.value).toBe('y');
    });
  });

  it('이벤트가 아닌 함수 · style이 아닌 객체 props는 속성으로 다루지 않는다 (on + 대문자 함수는 SET_EVENT, diffEvents.test.ts)', () => {
    const patches = diff([el('button', { render: () => {}, data: { a: 1 } })], [el('button', { render: () => {} })]);
    expect(patches).toEqual([]);
  });

  it('key는 props가 아니라 위치 비교 목록에서는 비교하지 않는다 (key 없는 자식이 섞인 목록)', () => {
    // [AI Note]: Key 확장(Dev-21) 이후 "모든 자식에 key가 있는" 목록은 key 비교로 간다 (diffKeyed.test.ts).
    // 이 테스트는 key 없는 자식이 섞여 있어 위치 비교로 돌아가는 목록에서 key 자체는 patch를 만들지 않음을 확인한다.
    const a = { ...el('li', { id: 'x' }), key: 1 };
    const b = { ...el('li', { id: 'x' }), key: 2 };
    expect(diff([a, el('li')], [b, el('li')])).toEqual([]);
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

  // 검수 1회차 B-1: style 항목 이름이 Object.prototype 이름과 겹쳐도 "있는지 · 값"을 자기 것만 본다
  describe('프로토타입 이름 항목 (constructor · __proto__ · toString)', () => {
    // [AI Note]: `{ __proto__: 'x' }` 리터럴은 프로토타입 설정이라 항목이 되지 않는다. parseStyleText와 같은 방식(fromEntries)으로 자기 속성을 만든다.
    const style = (entries: Array<[string, string]>) => Object.fromEntries(entries);

    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      it(`${name} 항목 추가는 SET_STYLE before null`, () => {
        const patches = run([el('p', { style: style([['color', 'red']]) })], [el('p', { style: style([['color', 'red'], [name, 'x']]) })]);
        expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: name, before: null, after: 'x' }]);
      });

      it(`${name} 항목 삭제는 SET_STYLE after null (함수가 아니라 null)`, () => {
        const patches = run([el('p', { style: style([['color', 'red'], [name, 'x']]) })], [el('p', { style: style([['color', 'red']]) })]);
        expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: name, before: 'x', after: null }]);
      });

      it(`${name} 항목 값 수정은 SET_STYLE 전 · 후 값`, () => {
        const patches = run([el('p', { style: style([[name, 'x']]) })], [el('p', { style: style([[name, 'y']]) })]);
        expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: name, before: 'x', after: 'y' }]);
      });
    }

    it('style이 통째로 없어질 때도 프로토타입 이름 항목을 지운다', () => {
      const patches = run([el('p', { style: style([['__proto__', 'x']]) })], [el('p', {})]);
      expect(patches).toEqual([{ kind: 'SET_STYLE', path: [0], property: '__proto__', before: 'x', after: null }]);
    });
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

const pathOf = (p: Patch): readonly number[] => ('path' in p ? p.path : []);
const li = (s: string) => el('li', {}, text(s));

describe('diff 자식 추가 · 삭제 (Dev-4, 위치 기반)', () => {
  it('D-03 끝에 노드 추가: INSERT 한 줄, 경로의 마지막 번호가 끼울 자리 (P1-10)', () => {
    const patches = run([el('ul', {}, li('a'))], [el('ul', {}, li('a'), li('b'))]);
    expect(patches).toEqual([{ kind: 'INSERT', path: [0, 1], node: li('b') }]);
  });

  it('D-04 끝 노드 삭제: REMOVE의 node는 원본 VNode 통째 (P1-11)', () => {
    const removed = li('b');
    const patches = run([el('ul', {}, li('a'), removed)], [el('ul', {}, li('a'))]);
    expect(patches).toEqual([{ kind: 'REMOVE', path: [0, 1], node: removed }]);
    expect((patches[0] as { node: unknown }).node).toBe(removed);
  });

  it('여러 형제를 한꺼번에 삭제하면 경로가 뒤에서부터 (P1-16)', () => {
    const patches = run([el('ul', {}, li('a'), li('b'), li('c'), li('d'))], [el('ul', {}, li('a'))]);
    expect(patches.map((p) => p.kind)).toEqual(['REMOVE', 'REMOVE', 'REMOVE']);
    expect(patches.map((p) => pathOf(p))).toEqual([[0, 3], [0, 2], [0, 1]]);
  });

  it('여러 개를 한꺼번에 추가하면 경로가 앞에서부터', () => {
    const patches = run([el('ul', {}, li('a'))], [el('ul', {}, li('a'), li('b'), li('c'), li('d'))]);
    expect(patches.map((p) => p.kind)).toEqual(['INSERT', 'INSERT', 'INSERT']);
    expect(patches.map((p) => pathOf(p))).toEqual([[0, 1], [0, 2], [0, 3]]);
  });

  it('가운데 형제를 지우면 위치 비교 결과(뒤 형제 글자 바꾸기 + 마지막 REMOVE)지만 최종 결과는 목표와 같다 (P1-16)', () => {
    const patches = run([el('ul', {}, li('a'), li('b'), li('c'))], [el('ul', {}, li('a'), li('c'))]);
    expect(patches).toEqual([
      { kind: 'SET_TEXT', path: [0, 1, 0], before: 'b', after: 'c' },
      { kind: 'REMOVE', path: [0, 2], node: li('c') },
    ]);
  });

  it('최상위(영역 상자 바로 아래) 추가 · 삭제도 같은 규칙', () => {
    expect(run([el('p')], [el('p'), el('h1')])).toEqual([{ kind: 'INSERT', path: [1], node: el('h1') }]);
    expect(run([el('p'), el('h1')], [el('p')])).toEqual([{ kind: 'REMOVE', path: [1], node: el('h1') }]);
  });

  it('빈 목록 ↔ 여러 개 (복수 루트 · 0개)', () => {
    expect(run([], [el('a'), text('x'), comment('c')]).map((p) => p.kind)).toEqual(['INSERT', 'INSERT', 'INSERT']);
    expect(run([el('a'), text('x'), comment('c')], []).map((p) => pathOf(p))).toEqual([[2], [1], [0]]);
  });

  it('중첩 3단계 안의 변경이 올바른 대상에 반영된다 (P1-14)', () => {
    const make = (leaf: string, extra: boolean) => [
      el('div', {}, el('section', {}, el('ul', {}, li('a'), li(leaf), ...(extra ? [li('z')] : []))), el('p', {}, text('안 바뀜'))),
    ];
    const patches = run(make('b', false), make('B', true));
    expect(patches).toEqual([
      { kind: 'SET_TEXT', path: [0, 0, 0, 1, 0], before: 'b', after: 'B' },
      { kind: 'INSERT', path: [0, 0, 0, 2], node: li('z') },
    ]);
  });

  it('삭제와 수정이 함께 있어도 다른 노드를 잘못 수정하지 않는다 (P1-16)', () => {
    const oldTree = [el('div', {}, el('p', { id: 'a' }, text('1')), el('p', { id: 'b' }, text('2')), el('p', { id: 'c' }, text('3')))];
    const newTree = [el('div', {}, el('p', { id: 'a', class: 'x' }, text('1')), el('p', { id: 'b' }, text('two')))];
    const patches = run(oldTree, newTree);
    // 위치 기반: 0번은 속성 추가, 1번은 글자만, 마지막(2번)이 삭제
    expect(patches).toEqual([
      { kind: 'SET_ATTR', path: [0, 0], name: 'class', before: null, after: 'x' },
      { kind: 'SET_TEXT', path: [0, 1, 0], before: '2', after: 'two' },
      { kind: 'REMOVE', path: [0, 2], node: oldTree[0].children[2] },
    ]);
  });

  it('복합 변경: 글자 + 속성 + 추가 + 삭제 + 교체가 한꺼번에 (P1-15 · T-05)', () => {
    const oldTree = [
      el('main', { id: 'm' }, el('h1', {}, text('제목')), el('p', { class: 'a' }, text('본문')), el('span', {}, text('s')), el('i', {}, text('끝1')), el('i', {}, text('끝2'))),
    ];
    const newTree = [
      el('main', { id: 'm', lang: 'ko' }, el('h1', {}, text('새 제목')), el('p', { class: 'b' }, text('본문')), el('b', {}, text('s')), el('i', {}, text('끝1'))),
    ];
    const patches = run(oldTree, newTree);
    expect(new Set(patches.map((p) => p.kind))).toEqual(new Set(['SET_ATTR', 'SET_TEXT', 'REPLACE', 'REMOVE']));
    // 추가 포함 복합도 확인
    const patches2 = run(newTree, [el('main', { id: 'm' }, el('h1', {}, text('새 제목')), el('p', { class: 'b' }, text('본문')), el('b', {}, text('s')), el('i', {}, text('끝1')), el('i'), el('u'))]);
    expect(patches2.map((p) => p.kind)).toContain('INSERT');
  });

  it('경로가 공백 글자 · 주석 번호를 센다 (VNode 번호 = DOM childNodes 번호)', () => {
    const make = (leaf: string) => [el('ul', {}, text('\n  '), comment(' c '), text('\n  '), el('li', {}, text(leaf)), text('\n'))];
    const patches = run(make('a'), make('b'));
    expect(patches).toEqual([{ kind: 'SET_TEXT', path: [0, 3, 0], before: 'a', after: 'b' }]);
  });

  it('INSERT · REMOVE도 주석 · 공백이 차지한 번호 기준', () => {
    const oldTree = [el('ul', {}, text('\n'), comment('c'))];
    const newTree = [el('ul', {}, text('\n'), comment('c'), text('\n'), el('li'))];
    expect(run(oldTree, newTree)).toEqual([
      { kind: 'INSERT', path: [0, 2], node: text('\n') },
      { kind: 'INSERT', path: [0, 3], node: el('li') },
    ]);
  });

  it('무작위(고정 씨앗) 트리 쌍 200개에서 applyPatches(old, diff(old, new))가 new와 같다 (T-03 · T-05)', () => {
    const rng = makeRng(20261111);
    for (let i = 0; i < 200; i++) {
      const oldTree = randomTree(rng);
      const newTree = i % 2 === 0 ? randomTree(rng) : mutateTree(rng, oldTree);
      run(oldTree, newTree);
    }
  });

  it('깊이 300 중첩의 맨 아래 글자 바꾸기가 스택 넘침 없이 끝난다 (B20)', () => {
    const nest = (leaf: string): VNode[] => {
      let node: VNode = el('span', {}, text(leaf));
      for (let i = 0; i < 300; i++) node = el('div', {}, node);
      return [node];
    };
    const patches = run(nest('a'), nest('b'));
    expect(patches.length).toBe(1);
    expect(patches[0].kind).toBe('SET_TEXT');
    expect(pathOf(patches[0]).length).toBe(302);
  });

  it('형제 2,000개에서 끝에 추가 · 전부 삭제가 끝나고 결과가 목표와 같다 (B20)', () => {
    const many = (n: number) => [el('ul', {}, ...Array.from({ length: n }, (_, i) => li(String(i))))];
    const added = run(many(2000), many(2001));
    expect(added).toEqual([{ kind: 'INSERT', path: [0, 2000], node: li('2000') }]);
    const removed = run(many(2000), [el('ul')]);
    expect(removed.length).toBe(2000);
    expect(pathOf(removed[0])).toEqual([0, 1999]);
    expect(pathOf(removed[1999])).toEqual([0, 0]);
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
