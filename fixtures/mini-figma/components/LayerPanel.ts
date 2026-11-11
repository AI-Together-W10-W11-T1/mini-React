import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { instanceName } from '../model';
import type { Instance, MainProps } from '../model';

interface LayerPanelProps {
  main: MainProps;
  instances: readonly Instance[];
}

// [AI Note]: 레이어 창 — props만 받는 순수 함수. 메인 행 + 인스턴스 행들(이름 = 지금 글자, 빈 글자면 id, ④-3).
// 인스턴스 행의 <ul>에는 `key: it.id`가 있는 <li>만 둔다 (메인 행은 ul 밖 별도 상자 — 형제 전부 key, dev_todo 공통 주의 1).
// Dev-5에서는 행을 그리기만 한다. 고르기 · [↑] [↓] · [+ 인스턴스]는 Dev-6 · 9 · 10에서 더한다.
export function LayerPanel(props: Props): VNode {
  const { main, instances } = props as unknown as LayerPanelProps;
  return h(
    'section',
    { class: 'layer-panel', 'data-testid': 'layer-panel' },
    h('h2', { class: 'panel-title' }, '레이어'),
    h('div', { class: 'layer-row layer-main', 'data-testid': 'layer-main' }, h('span', { class: 'layer-name', 'data-testid': 'layer-name' }, '메인 Button')),
    h(
      'ul',
      { class: 'layer-list', 'data-testid': 'layer-list' },
      instances.map((it) =>
        h(
          'li',
          { key: it.id, class: 'layer-row', 'data-id': it.id, 'data-testid': 'layer-item' },
          h('span', { class: 'layer-name', 'data-testid': 'layer-name' }, instanceName(main, it)),
        ),
      ),
    ),
  );
}
