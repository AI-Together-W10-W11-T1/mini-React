import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface GreetingPanelProps {
  name: string;
  onNameInput: (event: Event) => void;
}

// [AI Note]: ② 입력창 — props만 받는 순수 함수. `value`는 루트 상태에서 내려오고, 입력하면 루트가 준 onNameInput이 불린다.
// 입력창 요소는 엔진이 다시 만들지 않고 그 자리에서 고친다(포커스 · 커서 유지, §4.3).
export function GreetingPanel(props: Props): VNode {
  const { name, onNameInput } = props as unknown as GreetingPanelProps;
  return h(
    'section',
    { class: 'panel', 'data-testid': 'greeting-panel' },
    h('h2', null, '② 입력창'),
    h('input', { type: 'text', 'data-testid': 'name-input', 'aria-label': '이름', placeholder: '이름', value: name, onInput: onNameInput }),
    h('p', { 'data-testid': 'greeting-text' }, name === '' ? '이름을 입력해 주세요' : `안녕하세요, ${name}님`),
  );
}
