import { h } from '@mini-react/react';
import { renderVNode } from '@mini-react/react-dom-bindings';

// [AI Note]: 엔진 로직 없음. h()로 만든 샘플 트리를 renderVNode로 그려 #root에 붙이기만 한다.
// e2e/phase1-render.spec.ts의 기대값과 맞춰 둔 샘플이다.
const tree = h(
  'main',
  { id: 'app', class: 'demo' },
  h('h1', null, 'Mini React'),
  h('p', { 'data-testid': 'intro' }, '안녕, VDOM ', 2026),
  h(
    'ul',
    { 'data-testid': 'list' },
    h('li', null, '첫째 항목'),
    h('li', { class: 'done' }, '둘째 항목'),
    h('li', { hidden: false }, '셋째 항목'),
  ),
  h('input', { 'data-testid': 'field', disabled: true }),
  h('p', { 'data-testid': 'special' }, '<b>굵게 아님</b> & &amp; 😀'),
);

document.getElementById('root')!.appendChild(renderVNode(tree));
