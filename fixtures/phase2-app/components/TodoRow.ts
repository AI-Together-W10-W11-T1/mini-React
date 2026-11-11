import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface TodoRowProps {
  id: string;
  text: string;
  done: boolean;
  onToggle: () => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}

// [AI Note]: 항목 한 줄 — props만 받는 순수 함수 (P2-09). key는 부르는 쪽이 `h(TodoRow, { key: id })`로 주고,
// 엔진이 컴포넌트를 풀 때 결과 `<li>`에 물려준다. 그래서 순서가 바뀌어도 같은 key의 `<li>` 노드가 그대로 남는다.
export function TodoRow(props: Props): VNode {
  const { id, text, done, onToggle, onUp, onDown, onRemove } = props as unknown as TodoRowProps;
  return h(
    'li',
    { class: done ? 'todo done' : 'todo', 'data-id': id, 'data-testid': 'todo-item' },
    h('input', { type: 'checkbox', 'aria-label': '완료', checked: done, 'data-testid': 'todo-check', onClick: onToggle }),
    h('span', { class: 'todo-text', 'data-testid': 'todo-text' }, text),
    h('button', { type: 'button', 'data-testid': 'todo-up', onClick: onUp }, '위로'),
    h('button', { type: 'button', 'data-testid': 'todo-down', onClick: onDown }, '아래로'),
    h('button', { type: 'button', 'data-testid': 'todo-remove', onClick: onRemove }, '삭제'),
  );
}
