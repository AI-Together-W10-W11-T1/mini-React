import { h, useMemo, useState } from '@mini-react/react';
import type { VNode } from '@mini-react/shared';
import { CounterPanel } from './components/CounterPanel';
import { GreetingPanel } from './components/GreetingPanel';
import { TodoPanel } from './components/TodoPanel';
import { counts } from './counts';
import { addTodo, moveTodo, removeTodo, toggleTodo } from './todoOps';
import type { TodoList } from './todoOps';

const EMPTY_LIST: TodoList = { items: [], nextId: 1 };

// [AI Note]: 루트 컴포넌트. 모든 useState · useEffect · useMemo는 이 파일에서만 부른다 (P2-07 · P2-08).
// 자식은 props만 받는 순수 함수이고, 버튼을 누르면 루트가 내려 준 함수를 불러 루트가 setter로 상태를 바꾼다 (Lifting State Up).
export function App(): VNode {
  counts.renderRuns += 1;
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [todoList, setTodoList] = useState<TodoList>(EMPTY_LIST);

  // 요약("전체 n개 · 완료 m개")은 목록(items)이 바뀔 때만 다시 계산한다. 계산 횟수는 상태가 아닌 바깥 변수로 센다.
  const summary = useMemo(() => {
    counts.memoRuns += 1;
    return { total: todoList.items.length, done: todoList.items.filter((t) => t.done).length };
  }, [todoList.items]);

  const onAdd = () => {
    const text = draft.trim();
    if (text === '') return; // 빈 글 · 공백만: 상태 그대로 (렌더 0번)
    // 한 번의 [추가] = setter 두 번 (렌더 2번): 목록에 붙이고, 입력창을 비운다
    setTodoList((list) => addTodo(list, text));
    setDraft('');
  };

  return h(
    'main',
    { class: 'app' },
    h('h1', null, 'Phase 2 검증 페이지'),
    h(
      'div',
      { class: 'panels' },
      h(CounterPanel, {
        count,
        // [+1]: 함수형 setter 한 번
        onPlus1: () => setCount((c) => c + 1),
        // [+3]: 함수형 setter 세 번 연달아 → 3 증가, 렌더도 3번 (즉시 동기 정책)
        onPlus3: () => {
          setCount((c) => c + 1);
          setCount((c) => c + 1);
          setCount((c) => c + 1);
        },
        // [그대로]: 지금과 같은 값 → 다시 그리지 않음
        onSame: () => setCount(count),
      }),
      h(GreetingPanel, {
        name,
        onNameInput: (event: Event) => setName((event.target as HTMLInputElement).value),
      }),
      h(TodoPanel, {
        items: todoList.items,
        total: summary.total,
        done: summary.done,
        draft,
        onDraftInput: (event: Event) => setDraft((event.target as HTMLInputElement).value),
        onAdd,
        onToggle: (id: string) => setTodoList((list) => toggleTodo(list, id)),
        // [위로] · [아래로]: 순서만 바꾼 새 목록. 경계면 같은 목록이라 다시 그리지 않는다
        onMove: (id: string, delta: -1 | 1) => setTodoList((list) => moveTodo(list, id, delta)),
        onRemove: (id: string) => setTodoList((list) => removeTodo(list, id)),
      }),
    ),
  );
}
