import { h } from '@mini-react/react';
import type { Props, VNode } from '@mini-react/shared';
import { instanceName } from '../model';
import type { Instance, MainProps } from '../model';

interface PropertyPanelProps {
  main: MainProps;
  instances: readonly Instance[];
  selectedId: string | null;
}

// [AI Note]: 속성 패널 — props만 받는 순수 함수. 아무것도 안 골랐으면 빈 상태 <p>, 골랐으면 머리 <h2> (「메인 Button」 / 「인스턴스 · 이름」).
// 같은 자리(패널의 0번 자식)에서 <p> ↔ <h2>로 태그가 달라서 고르기 · 삭제 때 엔진이 노드를 통째로 바꾼다(D-05 REPLACE)를 화면에서 보여 준다.
// 인스턴스 이름은 그 인스턴스의 지금 글자이고 빈 글자면 id (④-3). 5칸은 Dev-7 ~ 8에서 머리 아래에 더한다.
export function PropertyPanel(props: Props): VNode {
  const { main, instances, selectedId } = props as unknown as PropertyPanelProps;
  const target = selectedId === 'main' ? null : instances.find((it) => it.id === selectedId);
  const title = selectedId === 'main' ? '메인 Button' : target === undefined || target === null ? null : `인스턴스 · ${instanceName(main, target)}`;
  return h(
    'section',
    { class: 'property-panel', 'data-testid': 'property-panel' },
    title === null
      ? h('p', { class: 'property-empty', 'data-testid': 'property-empty' }, '캔버스나 레이어에서 하나를 골라 보세요')
      : h('h2', { class: 'property-title', 'data-testid': 'property-title' }, title),
  );
}
