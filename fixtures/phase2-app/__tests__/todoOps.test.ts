import { describe, expect, it } from 'vitest';
import { addTodo, moveTodo, removeTodo, toggleTodo } from '../todoOps';
import type { TodoList } from '../todoOps';

const empty: TodoList = { items: [], nextId: 1 };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(deepFreeze);
  }
  return value;
}

describe('addTodo — 추가 (D-03)', () => {
  it('새 항목을 맨 뒤에 붙이고 id는 todo-N, nextId는 1 늘어난다', () => {
    const one = addTodo(empty, '사과');
    expect(one.items).toEqual([{ id: 'todo-1', text: '사과', done: false }]);
    expect(one.nextId).toBe(2);
    const two = addTodo(one, '배');
    expect(two.items.map((t) => t.id)).toEqual(['todo-1', 'todo-2']);
    expect(two.items[1].text).toBe('배');
    expect(two.nextId).toBe(3);
  });

  it('입력을 고치지 않고 새 객체를 돌려준다', () => {
    const input = deepFreeze<TodoList>({ items: [{ id: 'todo-1', text: 'a', done: false }], nextId: 2 });
    const next = addTodo(input, 'b');
    expect(next).not.toBe(input);
    expect(next.items).not.toBe(input.items);
    expect(input.items).toHaveLength(1);
    // 안 바뀐 항목은 같은 객체 (참조 유지)
    expect(next.items[0]).toBe(input.items[0]);
  });
});

describe('toggleTodo — 체크 (D-02)', () => {
  const base = deepFreeze<TodoList>({
    items: [
      { id: 'todo-1', text: 'a', done: false },
      { id: 'todo-2', text: 'b', done: false },
    ],
    nextId: 3,
  });

  it('그 항목의 done만 뒤집는다 (둘째 호출은 되돌림)', () => {
    const once = toggleTodo(base, 'todo-1');
    expect(once.items.map((t) => t.done)).toEqual([true, false]);
    const twice = toggleTodo(once, 'todo-1');
    expect(twice.items.map((t) => t.done)).toEqual([false, false]);
  });

  it('입력을 고치지 않고, 다른 항목은 같은 객체이며, nextId는 그대로다', () => {
    const next = toggleTodo(base, 'todo-2');
    expect(base.items[1].done).toBe(false);
    expect(next.items[0]).toBe(base.items[0]);
    expect(next.items[1]).not.toBe(base.items[1]);
    expect(next.nextId).toBe(3);
  });

  it('없는 id는 같은 목록 객체를 그대로 돌려준다 (같은 값 → 다시 그리지 않음)', () => {
    expect(toggleTodo(base, 'todo-99')).toBe(base);
  });
});

describe('removeTodo — 삭제 (D-04) · 지운 번호를 다시 쓰지 않음', () => {
  const base = deepFreeze<TodoList>({
    items: [
      { id: 'todo-1', text: 'a', done: false },
      { id: 'todo-2', text: 'b', done: true },
      { id: 'todo-3', text: 'c', done: false },
    ],
    nextId: 4,
  });

  it('그 항목만 빼고 나머지는 같은 객체 · 같은 순서다', () => {
    const next = removeTodo(base, 'todo-2');
    expect(next.items.map((t) => t.id)).toEqual(['todo-1', 'todo-3']);
    expect(next.items[0]).toBe(base.items[0]);
    expect(next.items[1]).toBe(base.items[2]);
    expect(base.items).toHaveLength(3);
  });

  it('nextId는 줄지 않는다: 다 지우고 새로 추가하면 todo-4', () => {
    let list: TodoList = base;
    for (const id of ['todo-1', 'todo-2', 'todo-3']) list = removeTodo(list, id);
    expect(list.items).toEqual([]);
    expect(list.nextId).toBe(4);
    expect(addTodo(list, 'd').items[0].id).toBe('todo-4');
  });

  it('없는 id는 같은 목록 객체를 그대로 돌려준다', () => {
    expect(removeTodo(base, 'todo-99')).toBe(base);
  });
});

describe('moveTodo — [위로] · [아래로] (Key 이동 MOVE의 재료, §5)', () => {
  const base = deepFreeze<TodoList>({
    items: [
      { id: 'todo-1', text: 'a', done: false },
      { id: 'todo-2', text: 'b', done: true },
      { id: 'todo-3', text: 'c', done: false },
    ],
    nextId: 4,
  });
  const ids = (list: TodoList): string[] => list.items.map((t) => t.id);

  it('[위로](-1)는 한 칸 앞으로, [아래로](+1)는 한 칸 뒤로 옮긴다', () => {
    expect(ids(moveTodo(base, 'todo-3', -1))).toEqual(['todo-1', 'todo-3', 'todo-2']);
    expect(ids(moveTodo(base, 'todo-1', 1))).toEqual(['todo-2', 'todo-1', 'todo-3']);
    expect(ids(moveTodo(base, 'todo-2', -1))).toEqual(['todo-2', 'todo-1', 'todo-3']);
    expect(ids(moveTodo(base, 'todo-2', 1))).toEqual(['todo-1', 'todo-3', 'todo-2']);
  });

  it('항목 객체는 그대로(같은 참조)이고 입력 목록을 고치지 않으며 nextId도 그대로다', () => {
    const next = moveTodo(base, 'todo-3', -1);
    expect(next.items[1]).toBe(base.items[2]);
    expect(next.items[2]).toBe(base.items[1]);
    expect(next.items[0]).toBe(base.items[0]);
    expect(ids(base)).toEqual(['todo-1', 'todo-2', 'todo-3']);
    expect(next.nextId).toBe(4);
    expect(next.items).not.toBe(base.items);
  });

  it('경계(맨 위의 [위로] · 맨 아래의 [아래로])는 같은 목록 객체를 그대로 돌려준다 (같은 값 → 렌더 0번)', () => {
    expect(moveTodo(base, 'todo-1', -1)).toBe(base);
    expect(moveTodo(base, 'todo-3', 1)).toBe(base);
  });

  it('항목이 하나뿐이면 둘 다 같은 목록 객체다', () => {
    const one = deepFreeze<TodoList>({ items: [{ id: 'todo-1', text: 'a', done: false }], nextId: 2 });
    expect(moveTodo(one, 'todo-1', -1)).toBe(one);
    expect(moveTodo(one, 'todo-1', 1)).toBe(one);
  });

  it('없는 id는 같은 목록 객체를 그대로 돌려준다', () => {
    expect(moveTodo(base, 'todo-99', -1)).toBe(base);
  });
});
