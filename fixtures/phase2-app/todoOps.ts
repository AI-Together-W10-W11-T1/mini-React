// [AI Note]: ③ 목록의 순수 함수들. 입력을 고치지 않고 새 객체를 돌려준다.
// 바뀌지 않는 경우(없는 id)에는 "같은 목록 객체"를 그대로 돌려줘서, 루트의 setter가 같은 값(Object.is)으로 보고 다시 그리지 않게 한다.

export interface Todo {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

/** 목록 상태: 항목들과 다음에 쓸 번호. 번호는 줄지 않는다 (지운 번호를 다시 쓰지 않음 — key가 겹치지 않게) */
export interface TodoList {
  readonly items: readonly Todo[];
  readonly nextId: number;
}

/** 맨 뒤에 새 항목을 붙인다. id는 `todo-N` (key로 쓰인다) */
export function addTodo(list: TodoList, text: string): TodoList {
  const todo: Todo = { id: `todo-${list.nextId}`, text, done: false };
  return { items: [...list.items, todo], nextId: list.nextId + 1 };
}

/** 그 항목의 완료 표시를 뒤집는다. 다른 항목은 같은 객체 */
export function toggleTodo(list: TodoList, id: string): TodoList {
  if (!list.items.some((t) => t.id === id)) return list;
  return { items: list.items.map((t) => (t.id === id ? { ...t, done: !t.done } : t)), nextId: list.nextId };
}

/** 그 항목을 뺀다. nextId는 그대로 (지운 번호 재사용 안 함) */
export function removeTodo(list: TodoList, id: string): TodoList {
  if (!list.items.some((t) => t.id === id)) return list;
  return { items: list.items.filter((t) => t.id !== id), nextId: list.nextId };
}
