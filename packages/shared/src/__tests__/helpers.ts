// 테스트 보조 코드. 테스트가 아니므로 직접 테스트하지 않는다.
// [AI Note]: h()를 쓰지 않는다. shared가 react를 import하지 않고, h 테스트의 기대값을 독립적으로 만들기 위함.
import { COMMENT_NODE, TEXT_NODE } from '../types';
import type { CommentVNode, ElementVNode, Props, TextVNode, VNode } from '../types';

export function el(type: string, props: Props = {}, ...children: VNode[]): ElementVNode {
  return { type, props, children };
}

export function text(value: string): TextVNode {
  return { type: TEXT_NODE, props: { nodeValue: value }, children: [] };
}

export function comment(value: string): CommentVNode {
  return { type: COMMENT_NODE, props: { nodeValue: value }, children: [] };
}
