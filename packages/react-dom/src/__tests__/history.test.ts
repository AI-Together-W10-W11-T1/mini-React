import { describe, it, expect } from 'vitest';
import { History } from '../history';
import { HISTORY_LIMIT } from '@mini-react/shared';
import { el, text } from '../../../shared/src/__tests__/helpers';
import type { HistoryEntry } from '@mini-react/shared';

/** n번 기록: snapshot에 번호를 담아 어느 기록인지 알아볼 수 있게 한다 */
function entry(n: number): HistoryEntry {
  return {
    snapshot: [el('p', { 'data-n': String(n) }, text(`기록 ${n}`))],
    patches: [{ kind: 'SET_TEXT', path: [0, 0], before: `기록 ${n - 1}`, after: `기록 ${n}` }],
    inverse: [{ kind: 'SET_TEXT', path: [0, 0], before: `기록 ${n}`, after: `기록 ${n - 1}` }],
  };
}

function initial(): HistoryEntry {
  return { snapshot: [el('p', { 'data-n': '0' }, text('기록 0'))], patches: [], inverse: [] };
}

function numberOf(e: HistoryEntry): number {
  return Number((e.snapshot[0].props as { readonly [name: string]: unknown })['data-n']);
}

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v as object).forEach(deepFreeze);
  }
  return v;
}

/** 0번 + (count - 1)번 push로 count개 기록을 가진 History */
function filled(count: number): History {
  const h = new History(initial());
  for (let i = 1; i < count; i++) h.push(entry(i));
  return h;
}

/** 뒤로를 더 못 갈 때까지 눌러 이동한 횟수를 센다 */
function backToEnd(h: History): number {
  let moves = 0;
  while (h.back() !== null) moves++;
  return moves;
}

/** 지금 기록에서 앞(next) 쪽으로 이어진 기록 수 */
function afterCurrent(h: History): number {
  let n = 0;
  for (let x = h.current.next; x !== null; x = x.next) n++;
  return n;
}

describe('History — 만들기 · 이어 붙이기 (T-08)', () => {
  it('만들 때 넘긴 초기 기록이 0번(바닥): head = current, 개수 1', () => {
    const first = initial();
    const h = new History(first);
    expect(h.head.entry).toBe(first);
    expect(h.current).toBe(h.head);
    expect(h.current.prev).toBeNull();
    expect(h.current.next).toBeNull();
    expect(h.size).toBe(1);
  });

  it('push는 current 뒤에 이어 붙이고 current를 새 기록으로 옮긴다 (head는 그대로, 개수 +1)', () => {
    const h = new History(initial());
    const zero = h.current;
    const e1 = entry(1);
    h.push(e1);
    expect(h.current.entry).toBe(e1);
    expect(h.current.prev).toBe(zero);
    expect(zero.next).toBe(h.current);
    expect(h.head).toBe(zero);
    expect(h.size).toBe(2);
    h.push(entry(2));
    expect(h.size).toBe(3);
    expect(numberOf(h.current.entry)).toBe(2);
    expect(h.current.prev!.prev).toBe(zero);
  });
});

describe('History — 뒤로 · 앞으로 (prev · next)', () => {
  it('back · forward는 prev · next를 따라 이동하고 이동한 기록을 돌려준다', () => {
    const h = filled(3);
    expect(numberOf(h.back()!)).toBe(1);
    expect(numberOf(h.current.entry)).toBe(1);
    expect(numberOf(h.back()!)).toBe(0);
    expect(numberOf(h.forward()!)).toBe(1);
    expect(numberOf(h.forward()!)).toBe(2);
    expect(h.size).toBe(3);
  });

  it('경계 무시: 처음에서 뒤로는 null을 돌려주고 아무 것도 안 바뀐다', () => {
    const h = filled(3);
    backToEnd(h);
    const before = h.current;
    expect(h.back()).toBeNull();
    expect(h.current).toBe(before);
    expect(h.head).toBe(before);
    expect(h.size).toBe(3);
  });

  it('경계 무시: 끝에서 앞으로는 null을 돌려주고 아무 것도 안 바뀐다', () => {
    const h = filled(3);
    const last = h.current;
    expect(h.forward()).toBeNull();
    expect(h.current).toBe(last);
    expect(h.size).toBe(3);
  });

  it('0번만 있을 때는 뒤로 · 앞으로 모두 null (0번이 바닥)', () => {
    const h = new History(initial());
    expect(h.back()).toBeNull();
    expect(h.forward()).toBeNull();
    expect(numberOf(h.current.entry)).toBe(0);
  });
});

describe('History — 갈림길 (뒤로 간 뒤 push)', () => {
  it('뒤로 간 뒤 push하면 앞쪽(redo) 기록이 끊겨 앞으로가 안 된다', () => {
    const h = filled(4); // 0 1 2 3
    h.back(); // 2
    h.back(); // 1
    const fork = entry(99);
    h.push(fork);
    expect(h.current.entry).toBe(fork);
    expect(h.current.next).toBeNull();
    expect(h.forward()).toBeNull();
    expect(h.size).toBe(3); // 0 1 99
  });

  it('갈림길 뒤에는 갈림길 쪽 기록만 이어진다 (끊긴 기록으로 돌아가지 않음)', () => {
    const h = filled(4);
    h.back();
    h.back();
    h.push(entry(99));
    const seen = [numberOf(h.current.entry)];
    while (h.back() !== null) seen.push(numberOf(h.current.entry));
    expect(seen).toEqual([99, 1, 0]);
    const forwardSeen: number[] = [];
    while (h.forward() !== null) forwardSeen.push(numberOf(h.current.entry));
    expect(forwardSeen).toEqual([1, 99]);
  });
});

describe('History — 보관 한도 50 (0번 초기 기록 포함)', () => {
  it('한도 상수는 HISTORY_LIMIT = 50', () => {
    expect(HISTORY_LIMIT).toBe(50);
  });

  it('50개까지는 head가 그대로이고 개수가 50이다 (0번 + 49번 push)', () => {
    const h = filled(50);
    expect(h.size).toBe(50);
    expect(numberOf(h.head.entry)).toBe(0);
  });

  it('51번째 기록을 넣으면 head를 다음으로 옮기고 개수 50을 유지한다 (0번 초기도 한 개로 셈)', () => {
    const h = filled(50);
    h.push(entry(50));
    expect(h.size).toBe(50);
    expect(numberOf(h.head.entry)).toBe(1);
    expect(h.head.prev).toBeNull();
    expect(numberOf(h.current.entry)).toBe(50);
  });

  it('60번 push 뒤 뒤로를 끝까지 하면 49번 이동 후 멈춘다 (새 맨 앞이 새 바닥)', () => {
    const h = new History(initial());
    for (let i = 1; i <= 60; i++) h.push(entry(i));
    expect(h.size).toBe(50);
    expect(backToEnd(h)).toBe(49);
    expect(numberOf(h.current.entry)).toBe(11); // 11 ~ 60이 남음
    expect(h.back()).toBeNull();
    expect(h.current).toBe(h.head);
  });

  it('빠진 head는 연결 리스트에서 완전히 떨어져 나간다 (남은 쪽이 옛 head를 가리키지 않음)', () => {
    const h = filled(50);
    const oldHead = h.head;
    h.push(entry(50));
    expect(h.head).not.toBe(oldHead);
    expect(oldHead.next).toBeNull();
    expect(h.head.prev).toBeNull();
  });
});

describe('History — 저장한 기록은 바뀌지 않는다 (P1-26 · P1-27)', () => {
  it('깊게 얼린 기록을 넣어도 push · back · forward · 갈림길 · 한도 제거가 snapshot · patches · inverse를 고치지 않는다', () => {
    // 얼린 객체를 고치면 strict 모드(ES 모듈)에서 TypeError가 나므로, 예외 없이 끝나는 것 자체가 증거다
    const h = new History(deepFreeze(initial()));
    for (let i = 1; i <= 55; i++) {
      h.push(deepFreeze(entry(i)));
      if (i % 7 === 0) h.back();
      if (i % 11 === 0) h.forward();
    }
    for (let i = 0; i < 5; i++) h.back();
    expect(() => h.push(deepFreeze(entry(100)))).not.toThrow();
    for (let node: typeof h.head | null = h.head; node !== null; node = node.next) {
      expect(Object.isFrozen(node.entry)).toBe(true);
      expect(Object.isFrozen(node.entry.snapshot)).toBe(true);
      expect(Object.isFrozen(node.entry.patches)).toBe(true);
    }
  });

  it('push한 기록 객체를 그대로 보관한다 (복사 · 변형 없음)', () => {
    const h = new History(initial());
    const e1 = entry(1);
    h.push(e1);
    expect(h.current.entry).toBe(e1);
    expect(h.current.entry.snapshot).toBe(e1.snapshot);
    expect(h.current.entry.patches).toBe(e1.patches);
    expect(h.current.entry.inverse).toBe(e1.inverse);
  });
});

describe('History — 한도 근처 갈림길 (B17)', () => {
  it('50개 꽉 찬 상태에서 뒤로 10번 → push: 개수 41(잘린 10개를 뺌) · head 그대로 · 앞으로 불가', () => {
    const h = filled(50);
    const head = h.head;
    for (let i = 0; i < 10; i++) expect(h.back()).not.toBeNull();
    expect(afterCurrent(h)).toBe(10);
    h.push(entry(100));
    expect(h.size).toBe(41);
    expect(h.head).toBe(head);
    expect(h.forward()).toBeNull();
    expect(afterCurrent(h)).toBe(0);
  });

  it('이어서 9번 push → 50, 한 번 더 push → head가 다음으로 밀리고 개수 50 유지', () => {
    const h = filled(50);
    const head = h.head;
    for (let i = 0; i < 10; i++) h.back();
    h.push(entry(100));
    for (let i = 1; i <= 9; i++) h.push(entry(100 + i));
    expect(h.size).toBe(50);
    expect(h.head).toBe(head); // 잘린 만큼 개수를 안 줄였다면 여기서 이미 head가 밀려 있다
    h.push(entry(110));
    expect(h.size).toBe(50);
    expect(h.head).not.toBe(head);
    expect(numberOf(h.head.entry)).toBe(1);
  });

  it('그 뒤 뒤로를 끝까지 하면 49번 이동하고, 앞으로로 current까지 되돌아온다', () => {
    const h = filled(50);
    for (let i = 0; i < 10; i++) h.back();
    h.push(entry(100));
    for (let i = 1; i <= 10; i++) h.push(entry(100 + i));
    expect(backToEnd(h)).toBe(49);
    let forwards = 0;
    while (h.forward() !== null) forwards++;
    expect(forwards).toBe(49);
    expect(numberOf(h.current.entry)).toBe(110);
  });
});
