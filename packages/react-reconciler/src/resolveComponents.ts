import { setHookDispatcher } from '@mini-react/react';
import type { HookDispatcher } from '@mini-react/react';
import type { ComponentVNode, ElementVNode, Key, VNode } from '@mini-react/shared';

// [AI Note]: 자식 컴포넌트 풀기 (정책 「자식 컴포넌트 풀기」). diff · patch는 요소 · 글자만 알고 컴포넌트를 모른다.
// 그래서 diff 전에 컴포넌트 VNode를 그 자리에서 실행해 결과로 바꾼다 (결과가 또 컴포넌트면 계속, 요소의 children도 안쪽까지).
// 입력 VNode는 고치지 않고 새 객체를 만든다 — 이전 VNode를 그대로 보관해 두고 다시 비교하기 때문이다.

const ROOT_ONLY_ERROR = 'Hook은 루트 컴포넌트에서만 부를 수 있습니다';

function rootOnly(): never {
  throw new Error(ROOT_ONLY_ERROR);
}

// [AI Note]: 자식(Stateless) 실행 동안 꽂아 두는 디스패처. 자식이 Hook을 부르면 어떤 Hook이든 오류 (P2-08 · T-16).
const childDispatcher: HookDispatcher = {
  useState: rootOnly,
  useEffect: rootOnly,
  useMemo: rootOnly,
};

function isComponentVNode(node: VNode): node is ComponentVNode {
  return typeof node.type === 'function';
}

export function resolveComponents(node: VNode): VNode {
  if (isComponentVNode(node)) return resolveComponent(node);
  if (node.children.length === 0) {
    // 글자 · 주석 · 자식 없는 요소: children 배열까지 새로 만든다
    return { ...node, children: [] } as VNode;
  }
  return { ...node, children: node.children.map(resolveComponents) } as VNode;
}

function resolveComponent(node: ComponentVNode): VNode {
  // [AI Note]: 컴포넌트 children은 props로 넘기지 않는다 (작은 정책) — props 그대로만 전달.
  // 실행 동안만 "자식은 Hook 금지" 디스패처로 바꾸고, 예외가 나도 원래 것으로 되돌린다.
  const previous = setHookDispatcher(childDispatcher);
  let result: VNode;
  try {
    result = node.type(node.props);
  } finally {
    setHookDispatcher(previous);
  }
  const resolved = resolveComponents(result);
  return inheritKey(resolved, node.key);
}

// [AI Note]: key 물려주기 (테스트 케이스 확인 1) — `h(Row, { key })`의 key가 결과 요소로 옮겨져야 diff가 목록을 key로 비교한다.
// 결과가 이미 key를 가지면 덮어쓰지 않는다. 글자 · 주석은 key를 가질 수 없어 그대로 둔다.
function inheritKey(resolved: VNode, key: Key | undefined): VNode {
  if (key === undefined) return resolved;
  const target = resolved as ElementVNode;
  if (target.key !== undefined || resolved.type === '#text' || resolved.type === '#comment') return resolved;
  return { ...target, key };
}
