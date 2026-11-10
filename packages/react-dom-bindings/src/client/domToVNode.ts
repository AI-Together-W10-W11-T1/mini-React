import { COMMENT_NODE, TEXT_NODE } from '@mini-react/shared';
import type { AreaChildren, ElementVNode, Props, StyleMap, VNode } from '@mini-react/shared';
import { parseStyleText } from './style';

// [AI Note]: 실제 DOM → VNode. 공백 텍스트 · 주석도 모두 남겨 VNode 자식 번호 = DOM childNodes 번호가 되게 한다 (알고리즘 결정 5 B).
// 값 없는 속성(boolean)은 DOM이 이미 값 ""로 주므로 그대로 담는다. style은 글을 직접 쪼갠 StyleMap으로 담는다.
export function domToVNode(node: Node): VNode {
  switch (node.nodeType) {
    case Node.TEXT_NODE:
      return { type: TEXT_NODE, props: { nodeValue: node.nodeValue ?? '' }, children: [] };
    case Node.COMMENT_NODE:
      return { type: COMMENT_NODE, props: { nodeValue: node.nodeValue ?? '' }, children: [] };
    case Node.ELEMENT_NODE: {
      const element = node as Element;
      return {
        type: element.localName,
        props: readProps(element),
        children: Array.from(element.childNodes, domToVNode),
      } satisfies ElementVNode;
    }
    default:
      throw new Error(`domToVNode는 이 종류의 노드(nodeType ${node.nodeType})를 지원하지 않습니다.`);
  }
}

// 영역 상자 자신은 읽지 않고 안의 자식 목록만 읽는다 (§5 영역 상자 = 보이지 않는 감싸개)
export function readAreaChildren(area: Element): AreaChildren {
  return Array.from(area.childNodes, domToVNode);
}

function readProps(element: Element): Props {
  // [AI Note]: `props[이름] = 값` 대입 대신 [이름, 값] 쌍을 모아 Object.fromEntries로 만든다.
  // 속성 이름이 `__proto__`이면 대입은 항목이 아니라 프로토타입 setter를 불러 속성이 사라진다 — fromEntries는 보통 항목으로 담는다 (검수 2회차 B-1).
  const entries: Array<[string, string | StyleMap]> = [];
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === 'style') {
      // 항목이 하나도 없으면 style props를 두지 않는다 (B21)
      const map = parseStyleText(attr.value);
      if (Object.keys(map).length > 0) entries.push(['style', map]);
    } else {
      entries.push([attr.name, attr.value]);
    }
  }
  return Object.fromEntries(entries);
}
