import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface CounterPanelProps {
  count: number;
  onPlus1: () => void;
  onPlus3: () => void;
  onSame: () => void;
}

// [AI Note]: ① 카운터 — props만 받아 VNode를 돌려주는 순수 함수 (P2-09). 상태 · Hook 없음.
export function CounterPanel(props: Props): VNode {
  const { count, onPlus1, onPlus3, onSame } = props as unknown as CounterPanelProps;
  return h(
    'section',
    { class: 'panel', 'data-testid': 'counter-panel' },
    h('h2', null, '① 카운터'),
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'counter-value', 'data-testid': 'counter-value' }, count),
      h('button', { type: 'button', 'data-testid': 'counter-plus1', onClick: onPlus1 }, '+1'),
      h('button', { type: 'button', 'data-testid': 'counter-plus3', onClick: onPlus3 }, '+3'),
      h('button', { type: 'button', 'data-testid': 'counter-same', onClick: onSame }, '그대로'),
    ),
  );
}
