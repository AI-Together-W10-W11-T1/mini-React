import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface LogPanelProps {
  renderRuns: number;
  memoRuns: number;
}

// [AI Note]: ④ 기록판 — props만 받는 순수 함수. 렌더 횟수 · memo 계산 횟수는 이번 렌더 시점의 값이라 VNode 글로 그린다.
// effect 횟수 · patch 줄 수 칸은 "렌더가 끝난 뒤에야 알 수 있는 값"이라 VNode로는 한 박자 늦는다 → 자식 없는 빈 <span>으로 두고,
// 루트의 effect(patch 직후)가 글자를 직접 쓴다. 자식이 없는 칸이라 diff와 충돌하지 않는다.
export function LogPanel(props: Props): VNode {
  const { renderRuns, memoRuns } = props as unknown as LogPanelProps;
  return h(
    'section',
    { class: 'panel', 'data-testid': 'log-panel' },
    h('h2', null, '④ 기록판'),
    h(
      'ul',
      { class: 'log' },
      h('li', null, h('span', null, '렌더 횟수'), h('span', { 'data-testid': 'log-render' }, renderRuns)),
      h('li', null, h('span', null, 'effect 실행 횟수'), h('span', { 'data-testid': 'log-effect' })),
      h('li', null, h('span', null, 'memo 계산 횟수'), h('span', { 'data-testid': 'log-memo' }, memoRuns)),
      h('li', null, h('span', null, '마지막 update의 patch 줄 수'), h('span', { 'data-testid': 'log-patch' })),
      h('li', null, h('span', null, '그중 이벤트 교체 줄 수'), h('span', { 'data-testid': 'log-patch-events' })),
    ),
  );
}
