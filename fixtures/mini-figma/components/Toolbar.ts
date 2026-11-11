import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

interface ToolbarProps {
  /** [+ 인스턴스]: 끝에 새 인스턴스를 붙인다 (동작은 MF-22 그대로, 레이어 창에 있던 버튼이 이쪽으로 옮겨 옴 — FD-11) */
  onAdd: () => void;
}

// [AI Note]: 도구 막대 — props + 콜백 props만 받는 순수 함수 (Hook 없음, P2-09). `div.app`의 첫 자식이라 경로 접두가 [0,0]이고
// 레이어 · 캔버스 · 속성 패널의 접두는 하나씩 밀린다 ([0,1] · [0,2] · [0,3], FD-10). 안 자식 순서 = 앱 이름 · [+ 인스턴스] (· Dev-6에서 [↶] [↷]).
// 앱 이름은 「mini-figma」 — 디자인 문서의 회사 이름 · 로고는 쓰지 않는다 (FD-07).
export function Toolbar(props: Props): VNode {
  const { onAdd } = props as unknown as ToolbarProps;
  return h(
    'header',
    { class: 'toolbar', 'data-testid': 'toolbar' },
    h('span', { class: 'app-name', 'data-testid': 'app-name' }, 'mini-figma'),
    h('button', { type: 'button', class: 'btn-primary', 'data-testid': 'add-instance', onClick: () => onAdd() }, '+ 인스턴스'),
  );
}
