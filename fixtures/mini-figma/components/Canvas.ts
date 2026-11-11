import { h } from '@mini-react/react';
import type { Component, Props, VNode } from '@mini-react/shared';
import { mergeProps } from '../model';
import type { IconKind, Instance, MainProps } from '../model';
import { Button } from './Button';
import { HeartIcon, StarIcon } from './Icons';

interface CanvasProps {
  main: MainProps;
  instances: readonly Instance[];
}

/** state에는 아이콘 종류를 문자열('star' · 'heart')로만 두고, 컴포넌트로 바꾸는 것은 Canvas가 한다 (④-12) */
const ICONS: Readonly<Record<IconKind, Component>> = { star: StarIcon, heart: HeartIcon };

// [AI Note]: 캔버스 = 메인 버튼 1개(canvas-main 상자) + 인스턴스 버튼 줄(canvas-instances).
// 메인 버튼을 별도 상자에 둔 이유: 인스턴스 줄에는 `h(Button, { key: id })`만 두어 형제 전부에 key가 있게 하기 위해서다.
// 목록에 key 없는 자식이 섞이면 엔진 diff가 위치 비교로 돌아가 순서 바꾸기(MOVE)가 안 나온다 (dev_todo 공통 주의 1).
// 인스턴스는 `{ key: it.id, ...main, ...it }` 모양 = 메인 값 위에 인스턴스가 가진 키만 덮어씌운 것(mergeProps)을 Button에 넘긴다.
export function Canvas(props: Props): VNode {
  const { main, instances } = props as unknown as CanvasProps;
  const draw = (id: string, merged: MainProps) =>
    // 아이콘 종류 문자열 → 컴포넌트 (Instance swap: 컴포넌트를 prop 값으로 넘긴다)
    ({ id, label: merged.label, size: merged.size, hasIcon: merged.hasIcon, icon: ICONS[merged.icon], color: merged.color });
  return h(
    'section',
    { class: 'canvas', 'data-testid': 'canvas' },
    h('div', { class: 'canvas-main', 'data-testid': 'canvas-main' }, h(Button, draw('main', main))),
    h(
      'div',
      { class: 'canvas-instances', 'data-testid': 'canvas-instances' },
      instances.map((it) => h(Button, { key: it.id, ...draw(it.id, mergeProps(main, it)) })),
    ),
  );
}
