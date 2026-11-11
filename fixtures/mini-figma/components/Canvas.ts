import { h } from '@mini-react/react';
import type { Component, Props, VNode } from '@mini-react/shared';
import { resolveColor } from '../color';
import { mergeProps } from '../model';
import type { IconKind, Instance, MainProps, Variable } from '../model';
import { Button } from './Button';
import { HeartIcon, StarIcon } from './Icons';

interface CanvasProps {
  main: MainProps;
  instances: readonly Instance[];
  variables: readonly Variable[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** state에는 아이콘 종류를 문자열('star' · 'heart')로만 두고, 컴포넌트로 바꾸는 것은 Canvas가 한다 (④-12) */
const ICONS: Readonly<Record<IconKind, Component>> = { star: StarIcon, heart: HeartIcon };

// [AI Note]: 캔버스 = 메인 버튼 1개(canvas-main 상자) + 인스턴스 버튼 줄(canvas-instances).
// 메인 버튼을 별도 상자에 둔 이유: 인스턴스 줄에는 `h(Button, { key: id })`만 두어 형제 전부에 key가 있게 하기 위해서다.
// 목록에 key 없는 자식이 섞이면 엔진 diff가 위치 비교로 돌아가 순서 바꾸기(MOVE)가 안 나온다 (dev_todo 공통 주의 1).
// 인스턴스는 `{ key: it.id, ...main, ...it }` 모양 = 메인 값 위에 인스턴스가 가진 키만 덮어씌운 것(mergeProps)을 Button에 넘긴다.
export function Canvas(props: Props): VNode {
  const { main, instances, variables, selectedId, onSelect } = props as unknown as CanvasProps;
  const draw = (id: string, merged: MainProps) => ({
    id,
    label: merged.label,
    size: merged.size,
    hasIcon: merged.hasIcon,
    // 아이콘 종류 문자열 → 컴포넌트 (Instance swap: 컴포넌트를 prop 값으로 넘긴다)
    icon: ICONS[merged.icon],
    // [AI Note]: 연결(`var:<id>`)은 여기서 hex로 푼다 — Button · buttonStyle은 hex만 안다 (글자색 대비도 푼 색 기준). doc에는 연결이 남고, 실제 영역은 DOM에서 읽으므로 푼 hex만 본다 (VR-07).
    // 없는 id는 메인 색으로 (메인 자신이 없는 id면 #0052ff). 메인에는 fallback이 없다.
    color: resolveColor(merged.color, variables, id === 'main' ? undefined : main.color),
    // 누르면 루트가 내려 준 콜백으로 알린다 (state는 루트만 바꿈)
    selected: selectedId === id,
    onSelect: () => onSelect(id),
  });
  return h(
    'section',
    { class: 'canvas', 'data-testid': 'canvas' },
    // [AI Note]: 테스트 영역 제목 — 캔버스 안 경로가 한 칸 밀린다. 실제 영역으로 복사할 때 정리 함수(previewVNode)가 이 제목을 뺀다.
    h('h2', { class: 'area-title', 'data-testid': 'test-area-title' }, '테스트 영역'),
    h('div', { class: 'canvas-main', 'data-testid': 'canvas-main' }, h(Button, draw('main', main))),
    h(
      'div',
      { class: 'canvas-instances', 'data-testid': 'canvas-instances' },
      instances.map((it) => h(Button, { key: it.id, ...draw(it.id, mergeProps(main, it)) })),
    ),
  );
}
