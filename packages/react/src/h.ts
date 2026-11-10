import { TEXT_NODE } from '@mini-react/shared';
import type { Component, ComponentVNode, ElementVNode, Props, VNode, VNodeChild } from '@mini-react/shared';

// [AI Note]: 자식 정규화 — 문자열/숫자는 #text VNode, 배열은 평탄화, null·undefined·boolean은 버린다.
// 0은 falsy지만 '0' 텍스트로 남긴다. 입력 배열은 수정하지 않고 새 배열에 모은다.
function normalizeChildren(input: readonly VNodeChild[], out: VNode[]): VNode[] {
  for (const child of input) {
    if (child === null || child === undefined || typeof child === 'boolean') continue;
    if (Array.isArray(child)) {
      normalizeChildren(child, out);
    } else if (typeof child === 'string' || typeof child === 'number') {
      out.push({ type: TEXT_NODE, props: { nodeValue: String(child) }, children: [] });
    } else {
      out.push(child as VNode);
    }
  }
  return out;
}

export function h(type: string | Component, props?: Props | null, ...children: VNodeChild[]): ElementVNode | ComponentVNode {
  // [AI Note]: key는 props에서 꺼내 vnode.key로 옮기기만 한다 (비교 방식은 diff task). 없으면 key 속성 자체를 만들지 않는다.
  const { key, ...rest } = props ?? {};
  const vnode = { type, props: rest, children: normalizeChildren(children, []) } as ElementVNode | ComponentVNode;
  return typeof key === 'string' || typeof key === 'number' ? { ...vnode, key } : vnode;
}
