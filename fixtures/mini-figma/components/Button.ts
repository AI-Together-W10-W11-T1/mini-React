import { h } from '@mini-react/react';
import type { Component, Props, VNode } from '@mini-react/shared';
import type { Color, Size } from '../model';

interface ButtonProps {
  id: string;
  label: string;
  size: Size;
  hasIcon: boolean;
  icon: Component;
  color: Color;
  selected: boolean;
  onSelect: () => void;
}

// [AI Note]: 메인 컴포넌트 = 이 함수. 메인 버튼도 인스턴스 버튼도 같은 Button을 `h(Button, props)`로 부른다.
// 부르는 쪽(Canvas)이 `{ ...main, ...instance }` 모양으로 합친 값을 넘기는데 그 안에는 `id`도 들어 있다.
// 그래서 props를 통째로 DOM 속성으로 펼치지 않고, 쓸 5개(label · size · hasIcon · icon · color)와 id를 하나씩 꺼내 속성을 만든다 (dev_todo 공통 주의 2).
// 크기 · 색은 인라인 style이 아니라 클래스(btn-S/M/L · btn-blue/red/green)로 그린다 (④-9).
//
// [AI Note]: 버튼 안 자식은 모두 key를 가진다 (Q17-1): 아이콘 = 'icon', 글자 = 'label'.
// 엔진 diff는 한 부모의 자식이 하나라도 key가 없으면 조용히 위치 비교로 돌아가서, 아이콘을 켜면 글자 <span>이 REPLACE되고 INSERT가 따로 생긴다.
// 둘 다 key가 있으면 key 표로 맞춰서 아이콘 켜기 = INSERT 1줄(글자 앞), 끄기 = REMOVE 1줄이고 글자 <span> 노드는 그대로 남는다.
// 아이콘의 key는 컴포넌트 key라 엔진이 풀 때 결과 <span>에 물려준다 (resolveComponents.inheritKey).
export function Button(props: Props): VNode {
  const { id, label, size, hasIcon, icon, color, selected, onSelect } = props as unknown as ButtonProps;
  return h(
    'button',
    {
      type: 'button',
      // 고른 버튼에는 클래스 selected가 더 붙는다 (바뀌면 class 속성만 고쳐지고 버튼 노드는 그대로)
      class: `figma-button btn-${size} btn-${color}${selected ? ' selected' : ''}`,
      'data-id': id,
      'data-testid': 'figma-button',
      onClick: onSelect,
    },
    hasIcon ? h(icon, { key: 'icon' }) : null,
    h('span', { key: 'label', class: 'btn-label', 'data-testid': 'btn-label' }, label),
  );
}
