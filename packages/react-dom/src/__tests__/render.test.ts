import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, useEffect, useState } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { render } from '../render';

// [AI Note]: Dev-16(엔진 통합 테스트)을 제외한 대신, 엔진(react + reconciler + bindings)을 처음 실제 DOM(jsdom)에 이어 붙이는
// 이 파일이 "옮긴 검사 ① ~ ⑥"까지 맡는다. 테스트 앱은 이 파일 안의 작은 카운터 · 입력창 · 목록이다.

type Setter<S> = (next: S | ((prev: S) => S)) => void;

const mounted: HTMLElement[] = [];

/** 영역 상자: 문서에 붙여 둔다(포커스 · 선택 범위는 문서에 붙은 요소에서만 동작). 이 안 자식만 엔진이 그린다 */
function makeContainer(): HTMLElement {
  const box = document.createElement('div');
  box.id = 'root-box';
  box.className = 'box';
  document.body.appendChild(box);
  mounted.push(box);
  return box;
}

afterEach(() => {
  mounted.splice(0).forEach((box) => box.remove());
  vi.restoreAllMocks();
});

/** MutationObserver 기록을 바로(동기로) 꺼내 센다 */
function watch(target: Node): { take(): MutationRecord[] } {
  const observer = new MutationObserver(() => {});
  observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true });
  return { take: () => observer.takeRecords() };
}

function byId<T extends Element>(box: Element, testId: string): T {
  const found = box.querySelector(`[data-testid="${testId}"]`);
  if (found === null) throw new Error(`data-testid="${testId}"가 없다`);
  return found as T;
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('render — 진입점 (P2-05 · P2-06 · P2-15 · P2-21)', () => {
  function Counter(): VNode {
    const [count, setCount] = useState(0);
    return h(
      'main',
      null,
      h('p', { 'data-testid': 'value' }, count),
      h('p', { 'data-testid': 'static' }, '고정'),
      h('button', { 'data-testid': 'plus', onClick: () => setCount((c) => c + 1) }, '+1'),
    );
  }

  it('render(App, container)가 컨테이너 안에 초기 UI를 그린다 (P2-05)', () => {
    const box = makeContainer();
    render(Counter, box);
    expect(box.children).toHaveLength(1);
    expect(box.firstElementChild?.localName).toBe('main');
    expect(byId(box, 'value').textContent).toBe('0');
  });

  it('컨테이너 자신(영역 상자)은 건드리지 않는다: 같은 요소 · id · class', () => {
    const box = makeContainer();
    render(Counter, box);
    expect(box.id).toBe('root-box');
    expect(box.className).toBe('box');
    expect(box.attributes).toHaveLength(2);
    expect(document.getElementById('root-box')).toBe(box);
  });

  it('클릭 → setter → 별도 렌더 호출 없이 DOM이 바뀐다 (P2-15 · P2-06)', () => {
    const box = makeContainer();
    render(Counter, box);
    click(byId(box, 'plus'));
    expect(byId(box, 'value').textContent).toBe('1');
    click(byId(box, 'plus'));
    expect(byId(box, 'value').textContent).toBe('2');
  });

  it('바뀐 글자 노드만 바뀌고 형제 · 부모 요소는 같은 참조다 (P2-21 · T-06)', () => {
    const box = makeContainer();
    render(Counter, box);
    const main = box.firstElementChild;
    const value = byId(box, 'value');
    const text = value.firstChild;
    const fixed = byId(box, 'static');
    const button = byId(box, 'plus');
    const watcher = watch(box);
    click(button);
    expect(box.firstElementChild).toBe(main);
    expect(byId(box, 'value')).toBe(value);
    expect(byId(box, 'value').firstChild).toBe(text);
    expect(byId(box, 'static')).toBe(fixed);
    expect(byId(box, 'plus')).toBe(button);
    const records = watcher.take();
    expect(records.map((r) => r.type)).toEqual(['characterData']);
  });

  it('바뀐 게 없으면 DOM 변경이 0건이다 (T-04)', () => {
    let bump: Setter<number> = () => {};
    function Quiet(): VNode {
      const [tick, setTick] = useState(0);
      bump = setTick;
      void tick; // 화면에 안 쓰는 상태: 렌더는 다시 되지만 결과는 같다
      return h('main', null, h('p', null, '그대로'));
    }
    const box = makeContainer();
    const fc = render(Quiet, box);
    const watcher = watch(box);
    bump((t) => t + 1);
    expect(fc.lastPatches).toEqual([]);
    expect(watcher.take()).toHaveLength(0);
  });

  it('컨테이너를 통째로 다시 그리지 않는다: replaceChildren은 mount 때 한 번뿐, innerHTML 쓰기 없음', () => {
    const box = makeContainer();
    const replace = vi.spyOn(box, 'replaceChildren');
    const writeHtml = vi.fn();
    Object.defineProperty(box, 'innerHTML', { configurable: true, get: () => '', set: writeHtml });
    render(Counter, box);
    expect(replace).toHaveBeenCalledTimes(1);
    click(byId(box, 'plus'));
    click(byId(box, 'plus'));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(writeHtml).not.toHaveBeenCalled();
  });

  it('render가 돌려준 인스턴스의 unmount()가 cleanup을 실행한다', () => {
    const cleanup = vi.fn();
    function WithEffect(): VNode {
      useEffect(() => cleanup, []);
      return h('main', null);
    }
    const box = makeContainer();
    const fc = render(WithEffect, box);
    expect(cleanup).not.toHaveBeenCalled();
    fc.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('인스턴스가 hooks 배열과 lastPatches를 읽기 전용으로 보여 준다 (T-15)', () => {
    const box = makeContainer();
    const fc = render(Counter, box);
    expect(fc.hooks).toHaveLength(1);
    expect(fc.lastPatches).toEqual([]);
    click(byId(box, 'plus'));
    // 글자 바꾸기 1줄 + 핸들러가 새 함수라 이벤트 교체 1줄
    expect(fc.lastPatches.map((p) => p.kind).sort()).toEqual(['SET_EVENT', 'SET_TEXT']);
  });
});

describe('옮긴 검사 ① 입력 이벤트 → value · 같은 입력창 · 포커스 · selectionStart (T-10 · T-14 · §4.3)', () => {
  function Greeting(): VNode {
    const [name, setName] = useState('');
    const [count, setCount] = useState(0);
    return h(
      'main',
      null,
      h('input', {
        'data-testid': 'name',
        value: name,
        onInput: (e: Event) => setName((e.target as HTMLInputElement).value),
      }),
      h('p', { 'data-testid': 'greet' }, name === '' ? '이름을 입력해 주세요' : `안녕하세요, ${name}님`),
      h('button', { 'data-testid': 'plus', onClick: () => setCount((c) => c + 1) }, count),
    );
  }

  it('input 이벤트 → 상태 → 인사 글자 · input.value 프로퍼티가 맞는다', () => {
    const box = makeContainer();
    render(Greeting, box);
    const input = byId<HTMLInputElement>(box, 'name');
    typeInto(input, '민수');
    expect(byId(box, 'greet').textContent).toBe('안녕하세요, 민수님');
    expect(input.value).toBe('민수');
    typeInto(input, '');
    expect(byId(box, 'greet').textContent).toBe('이름을 입력해 주세요');
  });

  it('입력 도중 입력창은 같은 노드 · 포커스 · 선택 위치가 유지된다 (값이 같으면 다시 대입하지 않음)', () => {
    const box = makeContainer();
    render(Greeting, box);
    const input = byId<HTMLInputElement>(box, 'name');
    input.focus();
    typeInto(input, '가다');
    input.setSelectionRange(1, 1);
    // 커서 자리(1)에 `나`를 끼워 넣는다: 값 `가나다`, 커서는 2
    input.setRangeText('나', 1, 1, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('가나다');
    expect(byId(box, 'greet').textContent).toBe('안녕하세요, 가나다님');
    expect(byId(box, 'name')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
  });

  it('다른 상태가 바뀌어도(버튼 클릭) 입력창 노드 · 값 · 포커스 · 커서가 그대로다', () => {
    const box = makeContainer();
    render(Greeting, box);
    const input = byId<HTMLInputElement>(box, 'name');
    input.focus();
    typeInto(input, '영희');
    input.setSelectionRange(1, 1);
    click(byId(box, 'plus'));
    click(byId(box, 'plus'));
    expect(byId(box, 'plus').textContent).toBe('2');
    expect(byId(box, 'name')).toBe(input);
    expect(input.value).toBe('영희');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
  });
});

describe('옮긴 검사 ② 렌더 20번 뒤 클릭 1번 = 핸들러 정확히 1번 (§6.2 핸들러 교체 · §4.3)', () => {
  it('핸들러를 계속 바꿔 끼워도 한 번 누르면 한 번만 불린다', () => {
    let calls = 0;
    function Busy(): VNode {
      const [tick, setTick] = useState(0);
      const [total, setTotal] = useState(0);
      return h(
        'main',
        null,
        h('button', { 'data-testid': 'tick', onClick: () => setTick((t) => t + 1) }, tick),
        h(
          'button',
          {
            'data-testid': 'target',
            onClick: () => {
              calls += 1;
              setTotal((t) => t + 1);
            },
          },
          total,
        ),
      );
    }
    const box = makeContainer();
    const addListener = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    render(Busy, box);
    for (let i = 0; i < 20; i += 1) click(byId(box, 'tick'));
    expect(byId(box, 'tick').textContent).toBe('20');
    click(byId(box, 'target'));
    expect(calls).toBe(1);
    expect(byId(box, 'target').textContent).toBe('1');
    // 요소마다 이벤트 이름당 리스너는 한 번만 등록했다: 버튼 둘 × click = 2번
    expect(addListener.mock.calls.filter(([name]) => name === 'click')).toHaveLength(2);
  });
});

describe('옮긴 검사 ③ key 목록 순서 바꾸기 → 같은 <li> 유지 · 이동 뒤 삭제가 맞는 항목 (§5 Key)', () => {
  function Row(props: Props): VNode {
    const { id, label, onUp, onRemove } = props as { id: string; label: string; onUp: () => void; onRemove: () => void };
    return h(
      'li',
      { 'data-id': id },
      h('span', null, label),
      h('button', { 'data-testid': `up-${id}`, onClick: onUp }, '위로'),
      h('button', { 'data-testid': `remove-${id}`, onClick: onRemove }, '삭제'),
    );
  }
  function List(): VNode {
    const [items, setItems] = useState(['a', 'b', 'c']);
    const up = (id: string) =>
      setItems((list) => {
        const i = list.indexOf(id);
        if (i <= 0) return list;
        const copy = [...list];
        [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
        return copy;
      });
    return h(
      'ul',
      null,
      items.map((id) => h(Row, { key: id, id, label: id.toUpperCase(), onUp: () => up(id), onRemove: () => setItems((l) => l.filter((x) => x !== id)) })),
    );
  }
  const order = (box: Element): string[] => Array.from(box.querySelectorAll('li')).map((li) => li.getAttribute('data-id') ?? '');

  it('[위로] 뒤 순서가 바뀌고 세 <li> · <ul>이 모두 같은 참조다 (MOVE)', () => {
    const box = makeContainer();
    render(List, box);
    const ul = box.querySelector('ul');
    const before = Array.from(box.querySelectorAll('li'));
    const watcher = watch(box);
    click(byId(box, 'up-c'));
    expect(order(box)).toEqual(['a', 'c', 'b']);
    expect(box.querySelector('ul')).toBe(ul);
    const after = Array.from(box.querySelectorAll('li'));
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[2]);
    expect(after[2]).toBe(before[1]);
    // 글자 · 속성 기록은 없고 <ul>의 childList(이동)뿐
    const records = watcher.take();
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((r) => r.type === 'childList' && r.target === ul)).toBe(true);
  });

  it('이동 뒤 [삭제]가 맞는 항목에 걸리고 나머지 <li>는 같은 참조다', () => {
    const box = makeContainer();
    render(List, box);
    const [a, b, c] = Array.from(box.querySelectorAll('li'));
    click(byId(box, 'up-c')); // a c b
    click(byId(box, 'remove-c')); // a b
    expect(order(box)).toEqual(['a', 'b']);
    const rest = Array.from(box.querySelectorAll('li'));
    expect(rest[0]).toBe(a);
    expect(rest[1]).toBe(b);
    expect(c.isConnected).toBe(false);
    click(byId(box, 'remove-a'));
    expect(order(box)).toEqual(['b']);
  });
});

describe('옮긴 검사 ④ 목록 한 바퀴 — 안내 ↔ 목록 · 추가 · 삭제 · class 변경 (D-02 ~ D-05)', () => {
  interface Item {
    id: number;
    text: string;
    done: boolean;
  }
  function Todos(): VNode {
    const [items, setItems] = useState<Item[]>([]);
    const [nextId, setNextId] = useState(1);
    return h(
      'main',
      null,
      h(
        'button',
        {
          'data-testid': 'add',
          onClick: () => {
            setItems((l) => [...l, { id: nextId, text: `할 일 ${nextId}`, done: false }]);
            setNextId((n) => n + 1);
          },
        },
        '추가',
      ),
      items.length === 0
        ? h('p', { 'data-testid': 'empty' }, '할 일이 없어요')
        : h(
            'ul',
            { 'data-testid': 'list' },
            items.map((it) =>
              h(
                'li',
                { key: it.id, class: it.done ? 'todo done' : 'todo' },
                h('input', { type: 'checkbox', checked: it.done, onClick: () => setItems((l) => l.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x))) }),
                h('span', null, it.text),
                h('button', { 'data-testid': `rm-${it.id}`, onClick: () => setItems((l) => l.filter((x) => x.id !== it.id)) }, '삭제'),
              ),
            ),
          ),
    );
  }

  it('빈 목록 안내 → 추가(D-05 교체, D-03 추가) → class 변경(D-02) → 삭제(D-04) → 안내로 되돌아옴(D-05)', () => {
    const box = makeContainer();
    render(Todos, box);
    const empty = byId(box, 'empty');
    expect(empty.textContent).toBe('할 일이 없어요');

    click(byId(box, 'add'));
    expect(empty.isConnected).toBe(false); // D-05: 안내 <p> → <ul>
    const ul = byId(box, 'list');
    expect(ul.children).toHaveLength(1);

    click(byId(box, 'add')); // D-03
    expect(ul.children).toHaveLength(2);
    const first = ul.children[0];
    expect(byId(box, 'list')).toBe(ul);

    const checkbox = first.querySelector('input') as HTMLInputElement;
    click(checkbox); // D-02: class 속성 변경 (checked는 프로퍼티)
    expect(first.getAttribute('class')).toBe('todo done');
    expect(ul.children[0]).toBe(first);
    expect(ul.children[1].getAttribute('class')).toBe('todo');
    click(checkbox);
    expect(first.getAttribute('class')).toBe('todo');

    const second = ul.children[1];
    click(byId(box, 'rm-1')); // D-04
    expect(ul.children).toHaveLength(1);
    expect(ul.children[0]).toBe(second); // 엉뚱한 줄이 지워지지 않고 남은 줄은 같은 참조
    expect(first.isConnected).toBe(false);

    click(byId(box, 'rm-2')); // 목록 → 안내 (D-05 반대 방향)
    expect(ul.isConnected).toBe(false);
    expect(byId(box, 'empty').textContent).toBe('할 일이 없어요');
  });
});

describe('옮긴 검사 ⑤ effect는 patch 직후: 본문에서 DOM을 읽으면 이미 새 값 (T-12 · §4.2)', () => {
  it('mount · update 모두 effect 본문 안에서 읽은 DOM이 이번 렌더 값이다', () => {
    const seen: string[] = [];
    const box = makeContainer();
    function Watcher(): VNode {
      const [n, setN] = useState(0);
      useEffect(() => {
        seen.push(box.querySelector('p')?.textContent ?? '(없음)');
      }, [n]);
      return h('main', null, h('p', null, `값 ${n}`), h('button', { 'data-testid': 'plus', onClick: () => setN((c) => c + 1) }, '+'));
    }
    render(Watcher, box);
    click(byId(box, 'plus'));
    click(byId(box, 'plus'));
    expect(seen).toEqual(['값 0', '값 1', '값 2']);
  });
});

describe('옮긴 검사 ⑥ [+3] 렌더 3번 · 같은 값 렌더 0번 + DOM 변경 0건 (T-04 · T-14 · §4.2)', () => {
  it('함수형 setter 세 번 = 렌더 3번 · 최종 3, 같은 값 setter = 렌더 0번 · DOM 변경 0건', () => {
    let renders = 0; // 바깥 변수로 센다 (상태가 아님)
    function Counter(): VNode {
      renders += 1;
      const [count, setCount] = useState(0);
      return h(
        'main',
        null,
        h('p', { 'data-testid': 'value' }, count),
        h(
          'button',
          {
            'data-testid': 'plus3',
            onClick: () => {
              setCount((c) => c + 1);
              setCount((c) => c + 1);
              setCount((c) => c + 1);
            },
          },
          '+3',
        ),
        h('button', { 'data-testid': 'same', onClick: () => setCount(count) }, '그대로'),
      );
    }
    const box = makeContainer();
    render(Counter, box);
    expect(renders).toBe(1);
    click(byId(box, 'plus3'));
    expect(byId(box, 'value').textContent).toBe('3');
    expect(renders).toBe(4); // 즉시 동기: setter 수만큼 렌더
    const watcher = watch(box);
    click(byId(box, 'same'));
    expect(renders).toBe(4);
    expect(byId(box, 'value').textContent).toBe('3');
    expect(watcher.take()).toHaveLength(0);
  });
});

describe('update 중 patch 예외 복구 (검수 1회차 NB-7 · 정책 「§5」)', () => {
  it('실제 DOM이 밖에서 망가져 patch가 던지면 영역을 마지막 성공 모습으로 다시 그리고 예외는 setter 호출자에게 간다', () => {
    const box = makeContainer();
    let setN: Setter<number> = () => {};
    const App = (): VNode => {
      const [n, s] = useState(0);
      setN = s;
      return h('main', null, h('p', null, `n=${n}`));
    };
    render(App, box);
    expect(box.textContent).toBe('n=0');
    box.querySelector('p')!.remove(); // 밖에서 DOM을 망가뜨림 → 다음 patch의 경로가 없다
    expect(() => setN(1)).toThrow('patch:');
    expect(box.textContent).toBe('n=0'); // 마지막으로 성공한 VNode로 다시 그려 짐 (새 n=1이 아님)
    expect(box.querySelectorAll('p')).toHaveLength(1);
    // 이후 setter는 복구된 DOM 위에서 정상으로 돈다
    setN(2);
    expect(box.textContent).toBe('n=2');
  });
});

describe('render 옵션 onPatch — patch 관찰 콜백 (확장 1 Dev-23 · PRD §7 M-02)', () => {
  type Seen = { kind: string; stage: string; tag: string };

  function observed(): { seen: Seen[]; onPatch: (e: { patch: { kind: string }; node: Node; stage: 'before' | 'after' }) => void } {
    const seen: Seen[] = [];
    return {
      seen,
      onPatch: (e) => seen.push({ kind: e.patch.kind, stage: e.stage, tag: e.node.nodeName.toLowerCase() }),
    };
  }

  function Panel(): VNode {
    const [n, setN] = useState(0);
    const [name, setName] = useState('');
    return h(
      'main',
      null,
      h('p', null, `n=${n}`),
      h('input', { value: name, onInput: () => {} }),
      h('button', { onClick: () => setN((c) => c + 1) }, '+1'),
      h('i', { 'data-id': name }),
    );
  }

  it('update의 patch마다 { patch, node, stage }로 불린다 (SET_TEXT → 글자 노드, stage after)', () => {
    const box = makeContainer();
    const { seen, onPatch } = observed();
    render(Panel, box, { onPatch });
    expect(seen).toEqual([]); // 처음 그리기(mount)는 patch가 아니라서 알리지 않는다
    click(box.querySelector('button')!);
    expect(seen.filter((s) => s.kind === 'SET_TEXT')).toEqual([{ kind: 'SET_TEXT', stage: 'after', tag: '#text' }]);
  });

  it('무변경 update(같은 값 setter 아님, 다시 그려도 diff 0건)는 불리지 않는다', () => {
    const box = makeContainer();
    const { seen, onPatch } = observed();
    let force: () => void = () => {};
    const inst = render(
      (): VNode => {
        const [, setTick] = useState(0);
        force = () => setTick((t) => t + 1);
        return h('p', null, '고정'); // tick이 바뀌어 다시 그려도 결과가 같다
      },
      box,
      { onPatch },
    );
    force();
    force();
    expect(inst.lastPatches).toEqual([]);
    expect(seen).toEqual([]);
  });

  it('SET_PROP · SET_EVENT · SET_ATTR도 알린다 (입력창 값 · 핸들러 교체 · 속성)', () => {
    const box = makeContainer();
    const { seen, onPatch } = observed();
    let setName: Setter<string> = () => {};
    render(
      (): VNode => {
        const [name, s] = useState('');
        setName = s;
        return h('main', null, h('input', { value: name, onInput: () => {} }), h('i', { 'data-id': name }));
      },
      box,
      { onPatch },
    );
    setName('가');
    expect(seen.map((s) => s.kind).sort()).toEqual(['SET_ATTR', 'SET_EVENT', 'SET_PROP']);
    expect(seen.every((s) => s.stage === 'after')).toBe(true);
    expect(seen.find((s) => s.kind === 'SET_PROP')?.tag).toBe('input');
  });

  it('REMOVE는 지우기 직전(stage before), INSERT는 적용 직후(stage after)', () => {
    const box = makeContainer();
    const { seen, onPatch } = observed();
    let setN: Setter<number> = () => {};
    render(
      (): VNode => {
        const [n, s] = useState(2);
        setN = s;
        return h('ul', null, ...Array.from({ length: n }, (_, i) => h('li', { key: `k${i}` }, `i${i}`)));
      },
      box,
      { onPatch },
    );
    setN(3);
    expect(seen).toEqual([{ kind: 'INSERT', stage: 'after', tag: 'li' }]);
    seen.length = 0;
    setN(1);
    expect(seen.map((s) => `${s.kind}:${s.stage}`)).toEqual(['REMOVE:before', 'REMOVE:before']);
  });

  it('콜백이 없으면 동작이 이전과 똑같다 (옵션 없이 · 빈 옵션으로 불러도 정상)', () => {
    const a = makeContainer();
    const b = makeContainer();
    render(Panel, a);
    render(Panel, b, {});
    click(a.querySelector('button')!);
    click(b.querySelector('button')!);
    expect(a.innerHTML).toBe(b.innerHTML);
    expect(a.querySelector('p')!.textContent).toBe('n=1');
  });

  it('콜백 안에서 DOM을 읽을 수 있고 표시용 class · 속성이 실제 DOM에 붙지 않는다', () => {
    const box = makeContainer();
    const texts: string[] = [];
    render(Panel, box, { onPatch: (e) => texts.push(e.node.textContent ?? '') });
    const before = box.innerHTML;
    click(box.querySelector('button')!);
    expect(texts[0]).toBe('n=1'); // 첫 patch(SET_TEXT) 시점에 이미 새 글자가 DOM에 있다 (뒤따르는 줄은 새 핸들러 SET_EVENT)
    expect(box.innerHTML).toBe(before.replace('n=0', 'n=1'));
  });
});
