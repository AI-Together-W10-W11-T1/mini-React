import { TEXT_NODE } from '@mini-react/shared';
import type { ElementVNode, VNode } from '@mini-react/shared';

// [AI Note]: VNode → 실제 DOM. 텍스트는 createTextNode만 쓰므로 `<`·`&`가 마크업으로 해석되지 않는다 (innerHTML 미사용).
// key는 DOM에 쓰지 않는다.
export function renderVNode(vnode: VNode): Node {
  if (vnode.type === TEXT_NODE) {
    return document.createTextNode((vnode.props as { nodeValue: string }).nodeValue);
  }
  if (typeof vnode.type === 'function') {
    // [AI Note]: 컴포넌트는 Phase 2에서 FunctionComponent가 호출해 요소 VNode로 풀어 준다. 여기서는 만들지 않는다.
    throw new Error('renderVNode는 컴포넌트 VNode를 직접 그릴 수 없습니다. 컴포넌트를 호출해 요소 VNode로 바꾼 뒤 넘겨 주세요.');
  }
  const element = document.createElement(vnode.type);
  applyProps(element, vnode);
  for (const child of vnode.children) {
    element.appendChild(renderVNode(child));
  }
  return element;
}

// [AI Note]: props 분기 — 문자열·숫자는 속성, true는 빈 속성, false·null·undefined는 생략,
// 함수·객체는 설정하지 않고 prop마다 warn 1회 (이벤트 처리는 ISSUE-16에서).
function applyProps(element: Element, vnode: ElementVNode): void {
  for (const [name, value] of Object.entries(vnode.props)) {
    if (typeof value === 'string' || typeof value === 'number') {
      element.setAttribute(name, String(value));
    } else if (value === true) {
      element.setAttribute(name, '');
    } else if (value === false || value === null || value === undefined) {
      continue;
    } else {
      console.warn(`<${vnode.type}>의 "${name}" prop은 ${typeof value} 값이라 속성으로 설정하지 않습니다.`);
    }
  }
}
