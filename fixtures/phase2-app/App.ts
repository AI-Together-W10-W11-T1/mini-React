import { h, useEffect, useMemo, useState } from '@mini-react/react';
import type { VNode } from '@mini-react/shared';
import { CounterPanel } from './components/CounterPanel';
import { GreetingPanel } from './components/GreetingPanel';
import { LogPanel } from './components/LogPanel';
import { TodoPanel } from './components/TodoPanel';
import { counts, engine } from './counts';
import { addTodo, moveTodo, removeTodo, toggleTodo } from './todoOps';
import type { TodoList } from './todoOps';

const EMPTY_LIST: TodoList = { items: [], nextId: 1 };

// 기록판의 빈 <span>(effect · patch 칸)에 글자를 직접 쓴다. 이 칸들은 VNode 자식이 없어서 diff와 충돌하지 않는다.
function writeLog(testId: string, value: number): void {
  const cell = document.querySelector(`[data-testid="${testId}"]`);
  if (cell !== null) cell.textContent = String(value);
}

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

  // 탭 제목: 카운터가 바뀔 때만(의존성 [count]) patch 직후에 실행된다. 이 effect가 도는 횟수가 기록판의 effect 횟수다.
  useEffect(() => {
    counts.effectRuns += 1;
    document.title = `카운터 ${count} - Phase 2`;
  }, [count]);

  // 의존성 생략 = 매 렌더 뒤(patch 직후) 실행: 렌더가 끝난 뒤에야 알 수 있는 값(effect 횟수 · 마지막 update의 patch 줄 수)을 기록판 칸에 쓴다.
  // 위 effect가 먼저 선언돼 있어서 이 effect가 읽는 effectRuns는 이미 이번 렌더 값이다.
  useEffect(() => {
    const patches = engine.lastPatches();
    writeLog('log-effect', counts.effectRuns);
    writeLog('log-patch', patches.length);
    writeLog('log-patch-events', patches.filter((p) => p.kind === 'SET_EVENT').length);
  });

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
      h(LogPanel, { renderRuns: counts.renderRuns, memoRuns: counts.memoRuns }),
    ),
  );
}
