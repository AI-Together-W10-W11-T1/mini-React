import { COMMENT_NODE, DOM_PROP_ELEMENTS, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, ElementVNode, EventHandler, StyleMap, VNode } from '@mini-react/shared';
import { applyDomProp } from './domProps';
import { setEventHandler } from './events';
import { styleMapToText } from './style';

// [AI Note]: VNode → 실제 DOM. 텍스트는 createTextNode만 쓰므로 `<`·`&`가 마크업으로 해석되지 않는다 (innerHTML 미사용).
// key는 DOM에 쓰지 않는다.
export function renderVNode(vnode: VNode): Node {
  if (vnode.type === TEXT_NODE) {
    return document.createTextNode((vnode.props as { nodeValue: string }).nodeValue);
  }
  if (vnode.type === COMMENT_NODE) {
    return document.createComment((vnode.props as { nodeValue: string }).nodeValue);
  }
  if (typeof vnode.type === 'function') {
    // [AI Note]: 컴포넌트는 Phase 2에서 FunctionComponent가 호출해 요소 VNode로 풀어 준다. 여기서는 만들지 않는다.
    throw new Error('renderVNode는 컴포넌트 VNode를 직접 그릴 수 없습니다. 컴포넌트를 호출해 요소 VNode로 바꾼 뒤 넘겨 주세요.');
  }
  const element = document.createElement(vnode.type);
  const domProps = applyProps(element, vnode);
  for (const child of vnode.children) {
    element.appendChild(renderVNode(child));
  }
  // [AI Note]: value · checked는 자식까지 붙인 "뒤"에 넣는다. `<select value="b">`는 `<option>`이 있어야 그 값을 고를 수 있다.
  if (domProps.value !== undefined) applyDomProp(element, 'value', domProps.value);
  if (domProps.checked !== undefined) applyDomProp(element, 'checked', domProps.checked);
  return element;
}

// [AI Note]: 영역 상자 안을 통째로 그린다. 영역 상자 자신(id · class 등)은 건드리지 않는다 (§5 보이지 않는 감싸개).
// 상태 갱신 흐름에서는 쓰지 않는다 — 처음 그릴 때 · 미리보기 · Patch 도중 오류 복구에서만 쓴다.
export function renderAreaChildren(area: Element, children: AreaChildren): void {
  area.replaceChildren(...children.map(renderVNode));
}

// [AI Note]: props 분기 — 문자열·숫자는 속성, true는 빈 속성, false·null·undefined는 생략,
// style이 객체면 StyleMap으로 보고 속성 글로 쓴다(빈 묶음이면 속성 없음),
// Phase 2: 이름이 `on` + 대문자이고 값이 함수면 이벤트(setEventHandler, `onClick` → `click`),
// `input` · `textarea` · `select`의 `value` · `checked`는 속성이 아니라 DOM 프로퍼티(applyDomProp)로 — `type`보다 먼저 적용하면 체크박스 값이 틀어질 수 있어 속성 · 자식을 다 쓴 뒤 마지막에 넣는다
// (이 함수는 값만 모아 돌려주고 renderVNode가 마지막에 적용한다). 그 밖의 요소(`div` · `li` · `option` …)의 `value` · `checked`는 보통 속성이다 (검수 NB-4, Phase 1과 같음).
// 그 밖의 함수·객체는 설정하지 않고 그리는 호출마다 prop당 console.warn 한 번.
function applyProps(element: Element, vnode: ElementVNode): { value?: string; checked?: boolean } {
  const asProperty = DOM_PROP_ELEMENTS.has(vnode.type.toLowerCase());
  let value: string | undefined;
  let checked: boolean | undefined;
  for (const [name, prop] of Object.entries(vnode.props)) {
    if (asProperty && name === 'value') {
      if (typeof prop === 'string' || typeof prop === 'number') value = String(prop);
    } else if (asProperty && name === 'checked') {
      if (prop === true || prop === '') checked = true;
      else if (prop === false) checked = false;
    } else if (name === 'style' && typeof prop === 'object' && prop !== null && !Array.isArray(prop)) {
      const text = styleMapToText(prop as StyleMap);
      if (text !== '') element.setAttribute('style', text);
    } else if (typeof prop === 'function' && /^on[A-Z]/.test(name)) {
      setEventHandler(element, name.slice(2).toLowerCase(), prop as EventHandler);
    } else if (typeof prop === 'string' || typeof prop === 'number') {
      element.setAttribute(name, String(prop));
    } else if (prop === true) {
      element.setAttribute(name, '');
    } else if (prop === false || prop === null || prop === undefined) {
      continue;
    } else {
      console.warn(`<${vnode.type}>의 "${name}" prop은 ${typeof prop} 값이라 속성으로 설정하지 않습니다.`);
    }
  }
  return { value, checked };
}
