import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { instanceName } from '../model';
import type { Instance, MainProps } from '../model';

interface LayerPanelProps {
  main: MainProps;
  instances: readonly Instance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** [+ 인스턴스]: 끝에 새 인스턴스를 붙인다 */
  onAdd: () => void;
}

// [AI Note]: 레이어 창 — props만 받는 순수 함수. 메인 행 + 인스턴스 행들(이름 = 지금 글자, 빈 글자면 id, ④-3).
// 인스턴스 행의 <ul>에는 `key: it.id`가 있는 <li>만 둔다 (메인 행은 ul 밖 별도 상자 — 형제 전부 key, dev_todo 공통 주의 1).
// 행을 누르면 고른다(고른 행은 클래스 selected). [+ 인스턴스]는 맨 끝에 둔다 (Dev-9). [↑] [↓]는 Dev-10에서 더한다.
export function LayerPanel(props: Props): VNode {
  const { main, instances, selectedId, onSelect, onAdd } = props as unknown as LayerPanelProps;
  return h(
    'section',
    { class: 'layer-panel', 'data-testid': 'layer-panel' },
    h('h2', { class: 'panel-title' }, '레이어'),
    h(
      'div',
      {
        class: `layer-row layer-main${selectedId === 'main' ? ' selected' : ''}`,
        'data-id': 'main',
        'data-testid': 'layer-main',
        onClick: () => onSelect('main'),
      },
      h('span', { class: 'layer-name', 'data-testid': 'layer-name' }, '메인 Button'),
    ),
    h(
      'ul',
      { class: 'layer-list', 'data-testid': 'layer-list' },
      instances.map((it) =>
        h(
          'li',
          {
            key: it.id,
            class: `layer-row${selectedId === it.id ? ' selected' : ''}`,
            'data-id': it.id,
            'data-testid': 'layer-item',
            onClick: () => onSelect(it.id),
          },
          h('span', { class: 'layer-name', 'data-testid': 'layer-name' }, instanceName(main, it)),
        ),
      ),
    ),
    // [AI Note]: 추가 버튼은 <ul> 밖(섹션 맨 끝)에 둔다 — 인스턴스 <ul>에는 key 있는 <li>만 두는 규칙(공통 주의 1)을 지키려고
    h('button', { type: 'button', class: 'layer-add', 'data-testid': 'add-instance', onClick: () => onAdd() }, '+ 인스턴스'),
  );
}
