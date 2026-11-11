import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import type { Variable } from '../model';

interface VariablePanelProps {
  variables: readonly Variable[];
  /** 변수 하나의 값이 바뀌었다고 루트에 알린다 (루트가 setVariableValue → setDoc 한 번) */
  onChange: (id: string, value: string) => void;
}

// [AI Note]: 변수 구역 — props만 받는 순수 함수 (Hook 없음). 레이어 창 맨 끝 자식이라 레이어 목록을 접어도 함께 접히지 않는다.
// 줄 = `li key=변수 id` > 색 칩 · 이름 · 색 입력칸(<input type="color">) · hex 글자. 입력칸은 `onInput`만 쓴다 (엔진 이벤트는 click · input뿐,
// Chromium은 고르는 동안 input을 연달아 낸다). `value`는 DOM 프로퍼티라 입력칸을 다시 만들지 않고 그 자리에서 고쳐 포커스가 유지된다.
// 같은 값이면 루트의 setVariableValue가 같은 Doc을 돌려줘 렌더가 안 일어난다.
export function VariablePanel(props: Props): VNode {
  const { variables, onChange } = props as unknown as VariablePanelProps;
  return h(
    'div',
    { class: 'variable-panel', 'data-testid': 'variable-panel' },
    h('h3', { class: 'variable-title', 'data-testid': 'variable-title' }, '변수'),
    h(
      'ul',
      { class: 'variable-list', 'data-testid': 'variable-list' },
      variables.map((v) =>
        h(
          'li',
          { key: v.id, class: 'variable-row', 'data-id': v.id, 'data-testid': 'variable-row' },
          h('span', { class: 'variable-chip', 'data-testid': 'variable-chip', style: { 'background-color': v.value } }),
          h('span', { class: 'variable-name', 'data-testid': 'variable-name' }, v.name),
          h('input', {
            type: 'color',
            class: 'color-input variable-color',
            'aria-label': `${v.name} 값`,
            'data-testid': 'variable-color',
            value: v.value,
            onInput: (event: Event) => onChange(v.id, (event.target as HTMLInputElement).value),
          }),
          h('span', { class: 'variable-hex color-hex', 'data-testid': 'variable-hex' }, v.value),
        ),
      ),
    ),
  );
}
