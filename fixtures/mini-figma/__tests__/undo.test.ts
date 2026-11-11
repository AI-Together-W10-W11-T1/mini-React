import { describe, expect, it } from 'vitest';
import { INITIAL_DOC } from '../model';
import type { Doc } from '../model';
import { EMPTY_UNDO, UNDO_LIMIT, recordEdit, redo, undo } from '../undo';
import type { UndoGroup, UndoState } from '../undo';

/** 서로 다른 객체인 Doc 하나 (라벨로 구분) */
const docOf = (n: number): Doc => ({ main: { ...INITIAL_DOC.main, label: `v${n}` }, instances: INITIAL_DOC.instances });

const mainLabel: UndoGroup = { target: 'main', field: 'label' };
const mainColor: UndoGroup = { target: 'main', field: 'color' };
const b1Label: UndoGroup = { target: 'b1', field: 'label' };
const b2Label: UndoGroup = { target: 'b2', field: 'label' };

/** 묶음 없는(null) 수정을 n번 쌓는다: d0 → d1 → … → dn. 각각 서로 다른 단계 */
function stack(n: number): { state: UndoState; docs: Doc[] } {
  const docs = Array.from({ length: n + 1 }, (_, i) => docOf(i));
  let state = EMPTY_UNDO;
  for (let i = 1; i <= n; i += 1) state = recordEdit(state, docs[i - 1], docs[i], null);
  return { state, docs };
}

function undoAll(state: UndoState, current: Doc, times: number): { state: UndoState; doc: Doc } {
  let s = state;
  let doc = current;
  for (let i = 0; i < times; i += 1) ({ state: s, doc } = undo(s, doc));
  return { state: s, doc };
}

function redoAll(state: UndoState, current: Doc, times: number): { state: UndoState; doc: Doc } {
  let s = state;
  let doc = current;
  for (let i = 0; i < times; i += 1) ({ state: s, doc } = redo(s, doc));
  return { state: s, doc };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(deepFreeze);
  }
  return value;
}

describe('UNDO_LIMIT — 처음 상태 포함 기록 50개 = Undo 49번 (Q17-2)', () => {
  it('50이고, 시작은 아무 기록도 없다', () => {
    expect(UNDO_LIMIT).toBe(50);
    expect(EMPTY_UNDO).toEqual({ past: [], future: [], group: null });
  });
});

describe('recordEdit — 기록 남기기', () => {
  it('바뀐 것이 없으면(next === current) 같은 상태 객체를 돌려준다 (기록 · 묶음 모두 그대로)', () => {
    const d0 = docOf(0);
    expect(recordEdit(EMPTY_UNDO, d0, d0, null)).toBe(EMPTY_UNDO);
    expect(recordEdit(EMPTY_UNDO, d0, d0, mainLabel)).toBe(EMPTY_UNDO);

    const withGroup = recordEdit(EMPTY_UNDO, d0, docOf(1), mainLabel);
    expect(recordEdit(withGroup, withGroup.past[0], withGroup.past[0], b1Label)).toBe(withGroup);
    expect(withGroup.group).toEqual(mainLabel);
  });

  it('수정 하나 = past에 한 칸 (되돌릴 곳 = 수정 직전 Doc), future는 빔', () => {
    const d0 = docOf(0);
    const state = recordEdit(EMPTY_UNDO, d0, docOf(1), mainLabel);
    expect(state.past).toEqual([d0]);
    expect(state.past[0]).toBe(d0);
    expect(state.future).toEqual([]);
    expect(state.group).toEqual(mainLabel);
  });

  it('같은 group(같은 대상 + 같은 칸)이 연달아 오면 한 단계로 묶인다 — past 그대로, 되돌릴 곳 = 묶음 시작 직전', () => {
    const [d0, d1, d2, d3] = [docOf(0), docOf(1), docOf(2), docOf(3)];
    let state = recordEdit(EMPTY_UNDO, d0, d1, mainLabel);
    state = recordEdit(state, d1, d2, mainLabel);
    state = recordEdit(state, d2, d3, mainLabel);
    expect(state.past).toHaveLength(1);
    expect(state.past[0]).toBe(d0);
    expect(undo(state, d3).doc).toBe(d0);
  });

  it('시간 기준이 없다: 수정을 100번 이어도, 오래 지나도 같은 묶음이다', () => {
    const docs = Array.from({ length: 101 }, (_, i) => docOf(i));
    let state = EMPTY_UNDO;
    for (let i = 1; i <= 100; i += 1) state = recordEdit(state, docs[i - 1], docs[i], b1Label);
    expect(state.past).toHaveLength(1);
    expect(state.past[0]).toBe(docs[0]);
  });

  it('다른 칸이면 새 단계다 (같은 대상)', () => {
    const [d0, d1, d2] = [docOf(0), docOf(1), docOf(2)];
    let state = recordEdit(EMPTY_UNDO, d0, d1, mainLabel);
    state = recordEdit(state, d1, d2, mainColor);
    expect(state.past).toEqual([d0, d1]);
    expect(state.group).toEqual(mainColor);
  });

  it('다른 대상이면 새 단계다 (메인 ↔ 인스턴스, id ↔ 다른 id — 칸이 같아도)', () => {
    const docs = [docOf(0), docOf(1), docOf(2), docOf(3)];
    let state = recordEdit(EMPTY_UNDO, docs[0], docs[1], mainLabel);
    state = recordEdit(state, docs[1], docs[2], b1Label);
    state = recordEdit(state, docs[2], docs[3], b2Label);
    expect(state.past).toEqual([docs[0], docs[1], docs[2]]);
    expect(state.group).toEqual(b2Label);
  });

  it('group = null(추가 · 삭제 · 순서 · ↻)은 항상 새 단계이고, 묶음이 끝난다', () => {
    const [d0, d1, d2, d3, d4] = [docOf(0), docOf(1), docOf(2), docOf(3), docOf(4)];
    let state = recordEdit(EMPTY_UNDO, d0, d1, b1Label);
    state = recordEdit(state, d1, d2, null);
    expect(state.past).toEqual([d0, d1]);
    expect(state.group).toBeNull();
    // 묶음이 끝났으니 이어지는 같은 칸 수정도 새 단계
    state = recordEdit(state, d2, d3, b1Label);
    expect(state.past).toEqual([d0, d1, d2]);
    // null이 연달아도 각각 새 단계
    state = recordEdit(state, d3, d4, null);
    expect(state.past).toHaveLength(4);
  });
});

describe('undo · redo', () => {
  it('undo: 직전 Doc으로, 현재 Doc은 future로, 묶음이 끝난다', () => {
    const { state, docs } = stack(2);
    const grouped = recordEdit(state, docs[2], docOf(3), mainLabel);
    const result = undo(grouped, docOf(3));
    expect(result.doc).toBe(docs[2]);
    expect(result.state.past).toEqual([docs[0], docs[1]]);
    expect(result.state.future).toHaveLength(1);
    expect(result.state.group).toBeNull();
  });

  it('past가 비면 무시한다: 같은 상태 · 같은 Doc 객체', () => {
    const d0 = docOf(0);
    const result = undo(EMPTY_UNDO, d0);
    expect(result.state).toBe(EMPTY_UNDO);
    expect(result.doc).toBe(d0);
  });

  it('future가 비면 redo를 무시한다: 같은 상태 · 같은 Doc 객체', () => {
    const d0 = docOf(0);
    const result = redo(EMPTY_UNDO, d0);
    expect(result.state).toBe(EMPTY_UNDO);
    expect(result.doc).toBe(d0);
    const { state, docs } = stack(2);
    const again = redo(state, docs[2]);
    expect(again.state).toBe(state);
    expect(again.doc).toBe(docs[2]);
  });

  it('Undo → Redo → 원래 Doc (같은 객체)', () => {
    const { state, docs } = stack(3);
    const back = undo(state, docs[3]);
    expect(back.doc).toBe(docs[2]);
    const forth = redo(back.state, back.doc);
    expect(forth.doc).toBe(docs[3]);
    expect(forth.state.past).toEqual(state.past);
    expect(forth.state.future).toEqual([]);
  });

  it('Undo를 여러 번 하면 한 단계씩 거슬러 가고, Redo가 같은 길로 돌아온다', () => {
    const { state, docs } = stack(5);
    const u = undoAll(state, docs[5], 5);
    expect(u.doc).toBe(docs[0]);
    expect(undo(u.state, u.doc).doc).toBe(docs[0]);
    const r = redoAll(u.state, u.doc, 5);
    expect(r.doc).toBe(docs[5]);
  });

  it('Undo 뒤 새 수정이면 future를 버린다 (Redo 불가)', () => {
    const { state, docs } = stack(3);
    const back = undo(state, docs[3]); // → d2, future [d3]
    const d99 = docOf(99);
    const edited = recordEdit(back.state, back.doc, d99, null);
    expect(edited.future).toEqual([]);
    expect(redo(edited, d99).doc).toBe(d99);
  });

  it('Undo 때문에 묶음이 끝난다: Undo 뒤 같은 칸 수정은 새 단계', () => {
    const [d0, d1, d2] = [docOf(0), docOf(1), docOf(2)];
    const state = recordEdit(EMPTY_UNDO, d0, d1, mainLabel); // past [d0]
    const back = undo(state, d1); // → d0, past [], group null
    const next = recordEdit(back.state, back.doc, d2, mainLabel);
    // 묶음이 안 끝났다면 past가 [] 그대로였을 것
    expect(next.past).toEqual([d0]);
  });

  it('Redo 때문에도 묶음이 끝난다', () => {
    const [d0, d1, d2, d3] = [docOf(0), docOf(1), docOf(2), docOf(3)];
    let state = recordEdit(EMPTY_UNDO, d0, d1, mainLabel);
    state = recordEdit(state, d1, d2, b1Label);
    const back = undo(state, d2); // → d1
    const forth = redo(back.state, back.doc); // → d2
    expect(forth.state.group).toBeNull();
    const next = recordEdit(forth.state, forth.doc, d3, b1Label);
    expect(next.past).toEqual([d0, d1, d2]);
  });
});

describe('한도 — 처음 상태 포함 기록 50개 = Undo 49번 (Q17-2)', () => {
  it('단계 49개: past 길이 49이고 처음 Doc이 아직 있다 → Undo 49번 = 처음 Doc, 50번째는 무시', () => {
    const { state, docs } = stack(49);
    console.log('[한도] 49단계: past.length =', state.past.length, '/ past[0] === 처음 Doc:', state.past[0] === docs[0]);
    expect(state.past).toHaveLength(UNDO_LIMIT - 1);
    expect(state.past[0]).toBe(docs[0]);

    const u = undoAll(state, docs[49], 49);
    expect(u.doc).toBe(docs[0]);
    const extra = undo(u.state, u.doc);
    expect(extra.state).toBe(u.state);
    expect(extra.doc).toBe(docs[0]);
  });

  it('단계 50개: past 길이 49 그대로이고 처음 Doc이 빠진다 → Undo 49번 = 첫 수정 직후 모습, 50번째는 무시', () => {
    const { state, docs } = stack(50);
    console.log('[한도] 50단계: past.length =', state.past.length, '/ past[0] === 처음 Doc:', state.past[0] === docs[0], '/ past[0] === 첫 수정 직후 Doc:', state.past[0] === docs[1]);
    expect(state.past).toHaveLength(UNDO_LIMIT - 1);
    expect(state.past).not.toContain(docs[0]);
    expect(state.past[0]).toBe(docs[1]);

    const u = undoAll(state, docs[50], 49);
    expect(u.doc).toBe(docs[1]);
    expect(u.doc).not.toBe(docs[0]);
    const extra = undo(u.state, u.doc);
    expect(extra.state).toBe(u.state);
    expect(extra.doc).toBe(docs[1]);
  });

  it('단계 60개를 쌓아도 past 길이는 49다', () => {
    const { state, docs } = stack(60);
    expect(state.past).toHaveLength(49);
    expect(state.past[0]).toBe(docs[11]);
    expect(undoAll(state, docs[60], 100).doc).toBe(docs[11]);
  });

  it('묶음으로 합쳐진 수정은 개수를 늘리지 않는다', () => {
    // 30단계, 단계마다 같은 묶음 수정 3번 (대상이 번갈아 바뀌어 단계가 나뉨)
    let state = EMPTY_UNDO;
    let n = 0;
    let current = docOf(n);
    const first = current;
    for (let step = 0; step < 30; step += 1) {
      const group = step % 2 === 0 ? b1Label : b2Label;
      for (let k = 0; k < 3; k += 1) {
        n += 1;
        const next = docOf(n);
        state = recordEdit(state, current, next, group);
        current = next;
      }
    }
    expect(state.past).toHaveLength(30);
    expect(state.past[0]).toBe(first);
  });

  it('한도 뒤에도 redo가 undo 49번만큼 돌아와 마지막 Doc에 닿는다', () => {
    const { state, docs } = stack(60);
    const u = undoAll(state, docs[60], 49);
    expect(u.doc).toBe(docs[11]);
    expect(u.state.future).toHaveLength(49);
    const r = redoAll(u.state, u.doc, 49);
    expect(r.doc).toBe(docs[60]);
    const extra = redo(r.state, r.doc);
    expect(extra.state).toBe(r.state);
    expect(extra.doc).toBe(docs[60]);
    expect(r.state.past).toHaveLength(49);
  });

  it('한도 가까이에서 Undo → 새 수정을 해도 past는 49를 넘지 않는다', () => {
    const { state, docs } = stack(60);
    const u = undoAll(state, docs[60], 10);
    const edited = recordEdit(u.state, u.doc, docOf(1000), null);
    expect(edited.past).toHaveLength(40);
    const more = (() => {
      let s = edited;
      let cur = docOf(1000);
      for (let i = 0; i < 20; i += 1) {
        const next = docOf(2000 + i);
        s = recordEdit(s, cur, next, null);
        cur = next;
      }
      return s;
    })();
    expect(more.past).toHaveLength(49);
  });
});

describe('불변 — 저장된 Doc · 상태를 나중에 고치지 않는다', () => {
  it('freeze한 상태 · Doc으로 recordEdit · undo · redo를 불러도 오류가 없다', () => {
    const d0 = deepFreeze(docOf(0));
    const d1 = deepFreeze(docOf(1));
    const d2 = deepFreeze(docOf(2));
    const s0 = deepFreeze({ past: [] as Doc[], future: [] as Doc[], group: null } as UndoState);
    expect(() => {
      const s1 = deepFreeze(recordEdit(s0, d0, d1, mainLabel));
      const s2 = deepFreeze(recordEdit(s1, d1, d2, mainLabel));
      const back = undo(s2, d2);
      deepFreeze(back.state);
      redo(back.state, back.doc);
    }).not.toThrow();
  });

  it('돌려준 상태는 이전 상태와 배열을 공유하지 않는다 (옛 상태가 안 바뀜)', () => {
    const { state, docs } = stack(2);
    const pastBefore = [...state.past];
    recordEdit(state, docs[2], docOf(3), null);
    undo(state, docs[2]);
    expect(state.past).toEqual(pastBefore);
    expect(state.future).toEqual([]);
  });
});
