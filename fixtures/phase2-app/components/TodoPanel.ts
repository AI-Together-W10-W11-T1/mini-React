import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import type { Todo } from '../todoOps';
import { TodoRow } from './TodoRow';

interface TodoPanelProps {
  items: readonly Todo[];
  total: number;
  done: number;
  draft: string;
  onDraftInput: (event: Event) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

// [AI Note]: ③ 목록 — props만 받는 순수 함수. 항목이 없으면 안내 `<p>`, 있으면 `<ul>` (안내 ↔ 목록은 D-05 교체).
// 항목마다 `h(TodoRow, { key: id })`로 key를 준다 (id는 루트가 만든 `todo-N`, 지운 번호 재사용 안 함).
// 요약 글(전체 n개 · 완료 m개)은 루트의 useMemo 결과를 props로 받아 보여 주기만 한다.
export function TodoPanel(props: Props): VNode {
  const { items, total, done, draft, onDraftInput, onAdd, onToggle, onRemove } = props as unknown as TodoPanelProps;
  return h(
    'section',
    { class: 'panel', 'data-testid': 'todo-panel' },
    h('h2', null, '③ 목록'),
    h(
      'div',
      { class: 'row' },
      h('input', { type: 'text', 'data-testid': 'todo-input', 'aria-label': '할 일', placeholder: '할 일', value: draft, onInput: onDraftInput }),
      h('button', { type: 'button', 'data-testid': 'todo-add', onClick: onAdd }, '추가'),
    ),
    h('p', { 'data-testid': 'todo-summary' }, `전체 ${total}개 · 완료 ${done}개`),
    items.length === 0
      ? h('p', { 'data-testid': 'todo-empty' }, '할 일이 없어요')
      : h(
          'ul',
          { class: 'todo-list', 'data-testid': 'todo-list' },
          items.map((todo) =>
            h(TodoRow, {
              key: todo.id,
              id: todo.id,
              text: todo.text,
              done: todo.done,
              onToggle: () => onToggle(todo.id),
              onRemove: () => onRemove(todo.id),
            }),
          ),
        ),
  );
}
