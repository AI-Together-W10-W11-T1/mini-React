import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';

// [AI Note]: 속성 패널 — props만 받는 순수 함수. Dev-5에서는 아무것도 안 골랐을 때의 빈 상태 <p> 하나뿐이다 (시작 화면은 selectedId = null, ④-2).
// 골랐을 때의 머리 <h2 data-testid="property-title">와 5칸은 Dev-6 ~ 8에서 더한다. 빈 상태를 <p>, 머리를 <h2>로 같은 자리 · 다른 태그로 두는 것은
// 고르기 · 삭제 때 D-05 교체(REPLACE)를 화면에서 보여 주려는 것이다.
export function PropertyPanel(_props: Props): VNode {
  return h(
    'section',
    { class: 'property-panel', 'data-testid': 'property-panel' },
    h('p', { class: 'property-empty', 'data-testid': 'property-empty' }, '캔버스나 레이어에서 하나를 골라 보세요'),
  );
}
